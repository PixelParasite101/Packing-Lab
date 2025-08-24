// 4.2d Mouse spring displacement appears only in DIAG segment when diagnostics enabled
import { buildPresetWorld } from './helpers/flagBuilder.js';
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
      parts.push('DIAG:' + diag.join(','));
    }
  }
  return fnv(parts);
}

function run(simSpring){
  _resetBrickIdsForTest();
  const { world: w } = buildPresetWorld({ circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 });
  w.enableDeterminismMetrics();
  w.enableDeterminismDiagnostics();
  if (simSpring){
  w.enableMouseSpringConstraint({ stiffness:180, damping:0.12, maxFrameMove:800 });
  const b=createBrick(-300,0,120,80); w.add(b);
  w.attachMouseSpring(b,0,0);
  // After some frames, shift target further to accumulate more displacement
  w._diagSpringBody = b;
  } else {
    // still add a body so broadphase pairs stable
    w.add(createBrick(-200,0,120,80));
  }
  for (let i=0;i<60;i++){ 
    if (simSpring && i===30){ w.attachMouseSpring(w._diagSpringBody, 150, 0); }
    w.step(w.lastTime + 1000/60); 
  }
  const h = snapshot(w);
  return { w, hash: h.hash, raw: h.raw };
}

const r1 = run(false); // no spring => no MSD entry
const r2 = run(false); // second run no spring
const r3 = run(true);  // spring active => MSD entry expected
const hs1 = r1.hash; const hs2 = r2.hash; const hs3 = r3.hash;
const diagHasMSD = /DIAG:.*MSD=/.test(r3.raw);
const diagNoMSD = !/DIAG:.*MSD=/.test(r1.raw) && !/DIAG:.*MSD=/.test(r2.raw);
const deterministicNoSpring = hs1 === hs2; // still rely on hashed output for determinism
const pass = diagHasMSD && diagNoMSD && deterministicNoSpring;
console.log(`[AT] Mouse Spring DIAG Hash PASS=${pass} diagHasMSD=${diagHasMSD} diagNoMSD=${diagNoMSD} deterministicNoSpring=${deterministicNoSpring}`);
if (!pass) process.exitCode = 1;
