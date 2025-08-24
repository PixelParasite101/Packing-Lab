// AT Advanced Friction hash neutrality under diagnostics
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';
import { buildDeterminismHash } from '../src/physics/hashTemplate.js';

const CONFIG = { circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 };

function setupWorld(enableDiag){
  _resetBrickIdsForTest();
  const w = new World(CONFIG);
  w.lastTime = 0;
  const placements = [
    [-150,-40],[-10,-40],[130,-40],
    [-120,70],[20,70],[160,70]
  ];
  for (const [x,y] of placements){ w.add(createBrick(x,y, CONFIG.rectWidth, CONFIG.rectHeight)); }
  w.solver.enableAdvancedFriction({ anisotropic:true, muX:0.7, muY:0.3, dynamic:true, dynamicReduction:0.4, slipRef:40 });
  if (enableDiag) w.enableDeterminismDiagnostics();
  return w;
}

function runFrames(w, frames, pushX){
  const pushFrames = 25;
  for (let f=0; f<frames; f++){
    if (pushX && f < pushFrames){ w.entities[0].pos.x += pushX; }
    w.step(w.lastTime + 1000/60);
  }
}

const w1 = setupWorld(false); runFrames(w1,70,0.9); const h1 = buildDeterminismHash(w1).hash;
const w2 = setupWorld(true);  runFrames(w2,70,0.9); const h2 = buildDeterminismHash(w2).hash;
const pass = h1 === h2;
console.log(`[AT] Advanced Friction DIAG-neutral Hash PASS=${pass} ${h1} vs ${h2}`);
if (!pass) process.exitCode = 1;

