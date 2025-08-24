// Mini-Evals Runner: executes quick invariance checks defined in agent.md
// Output: one line per case + summary exit code (0=all pass, 1=fail)
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';
import { configurePenetrationAlarm, setPenetrationAlarm } from '../src/physics/alarm.js';

const CONFIG = { circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 };

function fnv(parts){
  let h = 2166136261 >>> 0; const str = parts.join('|');
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619)>>>0; }
  return h.toString(16);
}

function setupWorld(adaptiveOpts){
  _resetBrickIdsForTest();
  const w = new World(CONFIG);
  // Stabilize initial timing so (time - lastTime) is constant across runs
  w.lastTime = 0;
  // placements reused across tests
  const placements = [
    [-150,-40],[-10,-40],[130,-40],
    [-120,70],[20,70],[160,70]
  ];
  for (const [x,y] of placements){ w.add(createBrick(x,y, CONFIG.rectWidth, CONFIG.rectHeight)); }
  if (adaptiveOpts){ w.enableAdaptiveIterations(adaptiveOpts); }
  return w;
}

function snapshot(w){
  const sorted = [...w.entities].sort((a,b)=>a.id-b.id);
  const parts = sorted.map(e=>`${e.id}:${e.pos.x.toFixed(3)},${e.pos.y.toFixed(3)}`);
  if (w._adaptiveIterLog) parts.push('ITSEQ:' + w._adaptiveIterLog.join(','));
  if (w._detMetricsEnabled) parts.push('METRICS:' + [w._detMetrics.totalIterations, w._detMetrics.finalContactCount].join(','));
  if (w._detMetricsEnabled && w._detDiagEnabled && w._detMetrics.broadphasePairs != null){
    let diagParts = [w._detMetrics.broadphasePairs];
    if (w._detMetrics.mouseSpringDisp != null) diagParts.push('MSD='+w._detMetrics.mouseSpringDisp);
    parts.push('DIAG:' + diagParts.join(','));
  }
  return fnv(parts);
}

function runFrames(w, frames, pushX){
  const pushFrames = 25;
  for (let f=0; f<frames; f++){
    if (pushX && f < pushFrames){ w.entities[0].pos.x += pushX; }
    w.step(w.lastTime + 1000/60);
  }
}

const results = [];

// Case 1: Determinism baseline (no adaptive)
(() => {
  const w1 = setupWorld(); // adaptive not enabled
  runFrames(w1, 60, 1.2);
  const h1 = snapshot(w1);
  const w2 = setupWorld();
  runFrames(w2, 60, 1.2);
  const h2 = snapshot(w2);
  results.push({ case:'Case1-baseline-determinism', pass: h1===h2, detail:`${h1} vs ${h2}`});
})();

// Case 2: trackIterationSequence deterministic
(() => {
  const opts = { disableAnomaly:true, downscaleBlockFrames:120, initialEscalationBlockFrames:5, penetrationLow:-1, trackIterationSequence:true, freezeAfterFirstEscalation:true };
  const w1 = setupWorld(opts); runFrames(w1, 70, 0.9); const h1 = snapshot(w1);
  const w2 = setupWorld(opts); runFrames(w2, 70, 0.9); const h2 = snapshot(w2);
  results.push({ case:'Case2-iter-seq-flag', pass: h1===h2, detail:`${h1} vs ${h2}`});
})();

// Case 3: FreezeAfterFirstEscalation: ensure only one escalation
(() => {
  const opts = { disableAnomaly:true, downscaleBlockFrames:200, initialEscalationBlockFrames:5, penetrationLow:-1, trackIterationSequence:true, freezeAfterFirstEscalation:true };
  const w = setupWorld(opts); runFrames(w, 90, 0.9);
  const log = w._adaptiveIterLog || [];
  const pass = log.length <= 1; // zero or one iteration change
  results.push({ case:'Case3-freeze-after-first', pass, detail:`changes=${log.length}` });
})();

// Case 4: Downscale blocked (force baseIter=32; disable downscale trigger via penetrationLow:-1)
(() => {
  const opts = { disableAnomaly:true, downscaleBlockFrames:120, initialEscalationBlockFrames:0, penetrationLow:-1, baseIter:32, minIter:16 };
  const w = setupWorld(opts); runFrames(w, 60, 0.0); // no push -> low penetration
  const iter = w.solver.iterations;
  const pass = iter >= 32; // must not have downscaled below base (32)
  results.push({ case:'Case4-downscale-block-window', pass, detail:`iter=${iter}` });
})();

// Case 5: Anomaly disabled (simulate big penetration by manual contact depth injection not needed; just ensure adaptive still enabled)
(() => {
  const opts = { disableAnomaly:true };
  const w = setupWorld(opts); runFrames(w, 10, 2.5); // strong push
  const pass = w.adaptive.enabled === true;
  results.push({ case:'Case5-anomaly-disabled', pass, detail:`adaptiveEnabled=${w.adaptive.enabled}` });
})();

// Case 6: Alarm threshold (deterministisk) – konstruér garanti-overlap og lav lav threshold
(() => {
  let triggered = false;
  try {
    _resetBrickIdsForTest();
    const w = new World(CONFIG);
    // To overlappende klodser (samme center) sikrer penetration > 0
    w.add(createBrick(0,0, CONFIG.rectWidth, CONFIG.rectHeight));
    w.add(createBrick(0,0, CONFIG.rectWidth, CONFIG.rectHeight));
    configurePenetrationAlarm({ threshold: 0.5, consecutive:1 });
    // Ét step udløser alarm – tilføj lille epsilon for at undgå float == dt kanttilfælde
    w.step(w.lastTime + (1000/60) + 0.01);
  } catch(e){
    if (String(e.message).includes('[PenetrationAlarm]')) triggered = true; else throw e;
  } finally {
    setPenetrationAlarm(null); // reset
  }
  results.push({ case:'Case6-penetration-alarm', pass: triggered, detail:`triggered=${triggered}` });
})();

// Case 8: Substeps equivalence (substeps disabled vs inert-enabled)
(() => {
  // Scenario med ingen triggers (høje thresholds) -> hash bør være identisk off vs on
  const baseFrames = 60;
  const push = 0.4;
  function run(substeps){
    _resetBrickIdsForTest();
    const w = setupWorld({ disableAnomaly:true, downscaleBlockFrames:120, penetrationLow:-1, freezeAfterFirstEscalation:true });
    if (substeps){
      w.enableAdaptiveSubsteps({ contactDensityHigh: 9e9, dragDisplacementHigh: 9e9, penetrationBoostThreshold: 9e9, trackSubstepSequence:true });
    }
    runFrames(w, baseFrames, push);
    return snapshot(w);
  }
  const hOff = run(false);
  const hOn = run(true);
  results.push({ case:'Case8-substeps-equivalence-inert', pass: hOff === hOn, detail:`${hOff} vs ${hOn}` });
})();

// Case 7: Substeps deterministic (single escalation then freeze)
(() => {
  _resetBrickIdsForTest();
  const w1 = setupWorld({ disableAnomaly:true, downscaleBlockFrames:120, penetrationLow:-1, trackIterationSequence:true, freezeAfterFirstEscalation:true });
  w1.enableAdaptiveSubsteps({ trackSubstepSequence:true, freezeAfterFirstEscalation:true, contactDensityHigh:0.5, dragDisplacementHigh:50 });
  runFrames(w1, 70, 0.6);
  const h1 = snapshot(w1);
  _resetBrickIdsForTest();
  const w2 = setupWorld({ disableAnomaly:true, downscaleBlockFrames:120, penetrationLow:-1, trackIterationSequence:true, freezeAfterFirstEscalation:true });
  w2.enableAdaptiveSubsteps({ trackSubstepSequence:true, freezeAfterFirstEscalation:true, contactDensityHigh:0.5, dragDisplacementHigh:50 });
  runFrames(w2, 70, 0.6);
  const h2 = snapshot(w2);
  const pass = h1 === h2;
  results.push({ case:'Case7-substeps-determinism', pass, detail:`${h1} vs ${h2}` });
})();

// Case 9: Determinism metrics extension (positions + iteration seq + metrics) stable across runs
(() => {
  const opts = { disableAnomaly:true, downscaleBlockFrames:120, initialEscalationBlockFrames:5, penetrationLow:-1, trackIterationSequence:true, freezeAfterFirstEscalation:true };
  const w1 = setupWorld(opts); w1.enableDeterminismMetrics(); runFrames(w1, 70, 0.9); const h1 = snapshot(w1);
  const w2 = setupWorld(opts); w2.enableDeterminismMetrics(); runFrames(w2, 70, 0.9); const h2 = snapshot(w2);
  results.push({ case:'Case9-metrics-hash-determinism', pass: h1===h2, detail:`${h1} vs ${h2}`});
})();

// Report
let allPass = true;
for (const r of results){
  if (!r.pass) allPass = false;
  console.log(`[MiniEval] ${r.case} PASS=${r.pass} ${r.detail}`);
}
console.log(`[MiniEval] SUMMARY allPass=${allPass}`);
if (!allPass) process.exitCode = 1;
