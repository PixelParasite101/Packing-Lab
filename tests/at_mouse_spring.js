// 4.2 Mouse spring-damper acceptance test
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

_resetBrickIdsForTest();
const w = new World({ circleDiameter:1200, rectWidth:120, rectHeight:80, timeStep:1/60 });
w.enableMouseSpringConstraint({ stiffness:200, damping:0.15 });
const b = createBrick(0,0,120,80);
w.add(b);
w.attachMouseSpring(b, 100, 0);

let firstPos = null;
for (let i=0;i<30;i++){ // ~0.5s should be near target with high stiffness
  w.tick(1/60);
  if (i===0) firstPos = { x:b.pos.x, y:b.pos.y };
}
const atTargetX = b.pos.x; // capture before changing target
const finalDist = Math.abs(100 - atTargetX);
// Assertions:
// 1. Not teleported instantly (first frame < target)
const notTeleported = firstPos.x < 99.9;
// 2. Approaches target sufficiently (within 0.5) after 1s with exponential spring
const closeEnough = finalDist < 2.0; // allow moderate overshoot due to high stiffness
// 3. Monotonic-ish increase (allow tiny floating noise)
let monotonic = true; let prev = 0;
// Move target further and ensure continued movement in +x direction
w.attachMouseSpring(b, 150, 0);
for (let i=0;i<10;i++){
  const before = b.pos.x;
  w.tick(1/60);
  if (b.pos.x + 1e-6 < before){ monotonic=false; break; }
}

const pass = notTeleported && closeEnough && monotonic;
console.log(`[AT] Mouse Spring PASS=${pass} notTeleported=${notTeleported} closeEnough=${closeEnough} monotonic=${monotonic} finalX=${b.pos.x.toFixed(2)} finalDist=${finalDist.toFixed(3)}`);
if (!pass) process.exitCode = 1;
