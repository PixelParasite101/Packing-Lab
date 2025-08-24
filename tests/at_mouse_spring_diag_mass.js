// 4.2g Diagnostic hash includes mass scaling config only when enabled
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

function fnv(parts){ let h=2166136261>>>0; const str=parts.join('|'); for (let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619)>>>0;} return { hash:h.toString(16), raw:str }; }

function snapshot(w){
  const sorted=[...w.entities].sort((a,b)=>a.id-b.id);
  const parts=sorted.map(e=>`${e.id}:${e.pos.x.toFixed(3)},${e.pos.y.toFixed(3)}`);
  if (w._detMetricsEnabled){
    parts.push('METRICS:' + [w._detMetrics.totalIterations, w._detMetrics.finalContactCount].join(','));
    if (w._detDiagEnabled){
      let diag=[w._detMetrics.broadphasePairs];
      if (w._detMetrics.mouseSpringDisp != null) diag.push('MSD='+w._detMetrics.mouseSpringDisp);
      if (w._detMetrics.mouseSpringMassCfg) diag.push('MSDm='+w._detMetrics.mouseSpringMassCfg);
      parts.push('DIAG:' + diag.join(','));
    }
  }
  return fnv(parts);
}

function run(massScaling){
  _resetBrickIdsForTest();
  const w=new World({ circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 });
  w.enableDeterminismMetrics(); w.enableDeterminismDiagnostics();
  w.enableMouseSpringConstraint({ stiffness:180, damping:0.12, maxFrameMove:800, massScaling, referenceMass:2, massPower:1.5 });
  const b=createBrick(-300,0,120,80, massScaling?2:1); w.add(b);
  w.attachMouseSpring(b, 200, 0);
  for (let i=0;i<40;i++){ w.step(w.lastTime + 1000/60); }
  return snapshot(w);
}

const off = run(false);
const on = run(true);
const diagOff = /MSDm=/.test(off.raw);
const diagOn = /MSDm=/.test(on.raw);
const pass = !diagOff && diagOn;
console.log(`[AT] Mouse Spring Mass DIAG PASS=${pass} diagOn=${diagOn} diagOff=${diagOff}`);
if(!pass) process.exitCode=1;
