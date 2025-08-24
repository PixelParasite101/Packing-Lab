// AT5.8 Diagnostics hash mini-eval (Case10)
// Verifies:
// 1. DIAG segment appears ONLY when enableDeterminismDiagnostics() used.
// 2. DIAG segment is deterministic across two identical runs with diagnostics enabled.
// 3. Base (non-diagnostics) snapshot hash consistent between two diag-on runs.
// (We do not strictly require base hash equality between diag-on and diag-off because DIAG segment is appended.)
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

function fnv(parts){ let h=2166136261>>>0; const str=parts.join('|'); for (let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619)>>>0;} return { hash:h.toString(16), raw:str }; }

const CONFIG = { circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 };

function buildWorld(enableDiag){
  _resetBrickIdsForTest();
  const w = new World(CONFIG);
  // Place a small cluster (Case10 style moderate interactions)
  const placements = [
    [-180,-60],[-40,-60],[100,-60],
    [-140, 70],[0, 70],[140,70]
  ];
  for (const [x,y] of placements){ w.add(createBrick(x,y, CONFIG.rectWidth, CONFIG.rectHeight)); }
  w.enableDeterminismMetrics();
  if (enableDiag) w.enableDeterminismDiagnostics();
  return w;
}

function run(w){
  // Apply a gentle horizontal push to first brick for first 25 frames to generate contacts evolution
  for (let f=0; f<70; f++){
    if (f<25){ w.entities[0].pos.x += 0.9; }
    w.step(w.lastTime + 1000/60);
  }
  return snapshot(w);
}

function snapshot(w){
  const sorted=[...w.entities].sort((a,b)=>a.id-b.id);
  const parts=sorted.map(e=>`${e.id}:${e.pos.x.toFixed(3)},${e.pos.y.toFixed(3)}`);
  if (w._detMetricsEnabled){
    parts.push('METRICS:' + [w._detMetrics.totalIterations, w._detMetrics.finalContactCount].join(','));
    if (w._detDiagEnabled && w._detMetrics.broadphasePairs != null){
      const diagParts=[w._detMetrics.broadphasePairs];
      if (w._detMetrics.mouseSpringDisp != null) diagParts.push('MSD='+w._detMetrics.mouseSpringDisp);
      parts.push('DIAG:' + diagParts.join(','));
    }
  }
  return fnv(parts);
}

// Runs
const rOn1 = run(buildWorld(true));
const rOn2 = run(buildWorld(true));
const rOff = run(buildWorld(false));

const hasDiag1 = /\bDIAG:/.test(rOn1.raw);
const hasDiag2 = /\bDIAG:/.test(rOn2.raw);
const hasDiagOff = /\bDIAG:/.test(rOff.raw);
const diagDeterministic = rOn1.raw === rOn2.raw; // full raw equality ensures DIAG + rest stable
const diagAbsentWhenOff = !hasDiagOff;

const pass = hasDiag1 && hasDiag2 && diagDeterministic && diagAbsentWhenOff;
console.log(`[AT5.8] PASS=${pass} diagDeterministic=${diagDeterministic} diagAbsentWhenOff=${diagAbsentWhenOff}`);
if (!pass) process.exitCode = 1;
