// AT24 Diagnostics Hash: ensure diagnostics flag adds DIAG segment and is deterministic across runs.
import { buildPresetWorld } from './helpers/flagBuilder.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

const CONFIG = { circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 };

function fnv(parts){
  let h = 2166136261 >>> 0; const str = parts.join('|');
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619)>>>0; }
  return h.toString(16);
}

function setupWorld(enableDiag){
  _resetBrickIdsForTest();
  const { world: w } = buildPresetWorld(CONFIG);
  w.lastTime = 0;
  const placements = [
    [-150,-40],[-10,-40],[130,-40],
    [-120,70],[20,70],[160,70]
  ];
  for (const [x,y] of placements){ w.add(createBrick(x,y, CONFIG.rectWidth, CONFIG.rectHeight)); }
  w.enableAdaptiveIterations({ disableAnomaly:true, downscaleBlockFrames:120, penetrationLow:-1, freezeAfterFirstEscalation:true, trackIterationSequence:true });
  w.enableDeterminismMetrics();
  if (enableDiag) w.enableDeterminismDiagnostics();
  return w;
}

function snapshot(w){
  const sorted = [...w.entities].sort((a,b)=>a.id-b.id);
  const parts = sorted.map(e=>`${e.id}:${e.pos.x.toFixed(3)},${e.pos.y.toFixed(3)}`);
  if (w._adaptiveIterLog) parts.push('ITSEQ:' + w._adaptiveIterLog.join(','));
  if (w._detMetricsEnabled){
    parts.push('METRICS:' + [w._detMetrics.totalIterations, w._detMetrics.finalContactCount].join(','));
    if (w._detDiagEnabled && w._detMetrics.broadphasePairs != null){
      let diagParts = [w._detMetrics.broadphasePairs];
      if (w._detMetrics.mouseSpringDisp != null) diagParts.push('MSD='+w._detMetrics.mouseSpringDisp);
      parts.push('DIAG:' + diagParts.join(','));
    }
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

const w1 = setupWorld(true); runFrames(w1, 70, 0.9); const h1 = snapshot(w1);
const w2 = setupWorld(true); runFrames(w2, 70, 0.9); const h2 = snapshot(w2);
const pass = h1 === h2;
console.log(`[AT24] Diagnostics Hash Determinism PASS=${pass} ${h1} vs ${h2}`);
if (!pass) process.exitCode = 1;