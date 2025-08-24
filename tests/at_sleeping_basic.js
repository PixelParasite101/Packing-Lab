// Basic sleeping system test (2.7 implementation)
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

function setup(){
  _resetBrickIdsForTest();
  const w = new World({ timeStep:1/60, rectWidth:120, rectHeight:80 });
  // Create a single dynamic brick with tiny jiggle decaying to zero
  const e = createBrick(0,0,120,80);
  w.add(e);
  w.enableSleeping({ framesRequired:15, minLinearVel:0.05, minCorrection:0.02 });
  return w;
}

function run(w, frames){
  for (let i=0;i<frames;i++){
    // minor subpixel drift to test threshold (below minLinearVel)
    if (i<5){ w.entities[0].pos.x += 0.5; } // will produce some correction initially
    w.step(w.lastTime + 1000/60);
  }
}

const w = setup();
run(w, 40);
const asleep = w.entities[0].asleep === true;
console.log(`[AT] Sleeping Basic PASS=${asleep} sleepFrames=${w.entities[0].sleepFrames}`);
if (!asleep) process.exitCode = 1;