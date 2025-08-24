// 4.1c Containment shrink implementation test
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

function insideAll(body, R){
  const corners = [
    {x: body.pos.x - body.hw, y: body.pos.y - body.hh},
    {x: body.pos.x + body.hw, y: body.pos.y - body.hh},
    {x: body.pos.x + body.hw, y: body.pos.y + body.hh},
    {x: body.pos.x - body.hw, y: body.pos.y + body.hh}
  ];
  return corners.every(c=> Math.hypot(c.x,c.y) <= R + 0.001); // tolerance for numeric residual
}

function runNoChange(){
  _resetBrickIdsForTest();
  const w = new World({ circleDiameter:1000, rectWidth:120, rectHeight:80, timeStep:1/60 });
  w.add(createBrick(0,0,120,80));
  const before = w.metrics.containmentRepositions||0;
  w.setArena(500,null); // initial implicitly ~500; shrink to same size -> maybe no pass if initial undefined; then shrink slight but still inside
  w.setArena(480,null); // body fully inside still
  const after = w.metrics.containmentRepositions||0;
  return (after - before) === 0;
}

function runShrink(){
  _resetBrickIdsForTest();
  const w = new World({ circleDiameter:1000, rectWidth:120, rectHeight:80, timeStep:1/60 });
  w.add(createBrick(300,0,120,80));
  const targetR = 250; // will require reposition (corner beyond radius)
  w.setArena(500,null); // baseline
  w.setArena(targetR,null); // shrink
  const rep = w.metrics.containmentRepositions||0;
  const ok = rep > 0 && insideAll(w.entities[0], targetR);
  return ok;
}

const a = runNoChange();
const b = runShrink();
const pass = a && b;
console.log(`[AT] Containment Shrink PASS=${pass} noChange=${a} shrink=${b}`);
if (!pass) process.exitCode = 1;