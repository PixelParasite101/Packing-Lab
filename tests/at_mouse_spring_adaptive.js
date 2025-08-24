// 4.2b Adaptive stiffness soft-landing test
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';
_resetBrickIdsForTest();
const w = new World({ circleDiameter:1200, rectWidth:120, rectHeight:80, timeStep:1/60 });
w.enableMouseSpringConstraint({ stiffness:250, damping:0.15, adaptive:true, adaptiveRadius:200, stiffnessMinFactor:0.15, stiffnessCurve:'quad', maxFrameMove:800 });
const b = createBrick(-300,0,120,80); w.add(b);
w.attachMouseSpring(b, 0, 0);
const disps = [];
let prevX = b.pos.x, prevY = b.pos.y;
for (let i=0;i<180;i++){ // 3s
  w.tick(1/60);
  const dx = b.pos.x - prevX; const dy = b.pos.y - prevY;
  disps.push(Math.hypot(dx,dy));
  prevX = b.pos.x; prevY = b.pos.y;
}
const distResidual = Math.hypot(b.pos.x, b.pos.y);
// Analyze last 20 displacement magnitudes for monotonic decrease (allow tiny epsilon increases)
const tail = disps.slice(-20);
let monotonic = true;
for (let i=1;i<tail.length;i++){ if (tail[i] > tail[i-1] + 0.02) { monotonic = false; break; } }
// Ensure residual distance small (soft landing) and last step tiny
const lastStep = tail[tail.length-1];
const pass = distResidual < 10 && lastStep < 0.9 && monotonic;
console.log(`[AT] Mouse Spring Adaptive PASS=${pass} residual=${distResidual.toFixed(3)} lastStep=${lastStep.toFixed(3)} monotonic=${monotonic}`);
if (!pass) process.exitCode = 1;
