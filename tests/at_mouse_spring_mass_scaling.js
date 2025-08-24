// 4.2e Mass scaling effect on mouse spring movement
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

function run(massScaling){
  _resetBrickIdsForTest();
  const w=new World({ circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 });
  w.enableDeterminismMetrics(); w.enableDeterminismDiagnostics();
  w.enableMouseSpringConstraint({ stiffness:180, damping:0.12, maxFrameMove:800, massScaling, referenceMass:1, massPower:1 });
  // Create two bricks with different masses
  const light = createBrick(-300,0,120,80,1); w.add(light);
  const heavy = createBrick(-300,0,120,80,4); w.add(heavy);
  // Attach to each sequentially to measure displacement over fixed frames
  w.attachMouseSpring(light, 200, 0);
  for (let i=0;i<40;i++){ w.step(w.lastTime + 1000/60); }
  const lightPos = light.pos.x;
  w.releaseMouseSpring();
  w.attachMouseSpring(heavy, 200, 0);
  for (let i=0;i<40;i++){ w.step(w.lastTime + 1000/60); }
  const heavyPos = heavy.pos.x;
  return { lightPos, heavyPos };
}

const noScale = run(false);
const scaled = run(true);
// Without scaling both should be similar (within small tolerance)
const diffNoScale = Math.abs(noScale.lightPos - noScale.heavyPos);
// With scaling heavy should lag (smaller x progress)
const heavyLag = scaled.lightPos - scaled.heavyPos; // expect positive
const pass = diffNoScale < 1 && heavyLag > 5; // heuristic thresholds
console.log(`[AT] Mouse Spring Mass Scaling PASS=${pass} diffNoScale=${diffNoScale.toFixed(2)} heavyLag=${heavyLag.toFixed(2)} (light=${scaled.lightPos.toFixed(2)} heavy=${scaled.heavyPos.toFixed(2)})`);
if(!pass) process.exitCode=1;
