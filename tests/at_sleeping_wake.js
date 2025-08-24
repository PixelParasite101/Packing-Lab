// Wake heuristics test (2.8)
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

function setupTwo(){
  _resetBrickIdsForTest();
  const w = new World({ timeStep:1/60 });
  w.enableSleeping({ framesRequired:5, minLinearVel:0.05, minCorrection:0.02, wakeContactPen:0.05 });
  // Place two overlapping slightly so solver corrects creating wake potential
  const a = createBrick(-60,0,120,80);
  const b = createBrick( 60,0,120,80);
  // Move them closer to create penetration
  b.pos.x = 20; // overlap along x
  w.add(a); w.add(b);
  return w;
}

function runUntilSleep(w, frames){
  for (let i=0;i<frames;i++){ w.step(w.lastTime + 1000/60); }
}

const w = setupTwo();
runUntilSleep(w, 50); // allow potential sleeping (if still due to solver convergence)
// Force one body to move (simulate drag) to wake the other via new penetration
w.entities[0].pos.x -= 5; // create new displacement
w.step(w.lastTime + 1000/60);
const anyAwakeAfter = w.entities.some(e=>!e.asleep);
console.log(`[AT] Sleeping Wake Heuristic PASS=${anyAwakeAfter}`);
if (!anyAwakeAfter) process.exitCode = 1;