// AT Broadphase Overlap Integrity: grid must include all overlapping AABB pairs (subset of naive all-pairs) and may prune non-overlaps.
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

const CONFIG = { circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 };

function setupWorld(){
  _resetBrickIdsForTest();
  const w = new World(CONFIG);
  w.lastTime = 0;
  const placements = [
    [-220,-40],[-100,-40],[20,-40],[140,-40],[260,-40],
    [-160,60],[-40,60],[80,60],[200,60]
  ];
  for (const [x,y] of placements){ w.add(createBrick(x,y, CONFIG.rectWidth, CONFIG.rectHeight)); }
  return w;
}

function overlapSet(world){
  const s=new Set(); const e=world.entities;
  for (let i=0;i<e.length;i++) for (let j=i+1;j<e.length;j++){
    const a=e[i], b=e[j];
    if (Math.abs(a.pos.x-b.pos.x) <= a.hw + b.hw && Math.abs(a.pos.y-b.pos.y) <= a.hh + b.hh){
      s.add(`${a.id}-${b.id}`);
    }
  }
  return s;
}

function gridPairs(world){
  world.broadphase.build(world.entities);
  const pairs=world.broadphase.queryPairs();
  const s=new Set();
  for (const [a,b] of pairs){ const k=a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`; s.add(k); }
  return s;
}

const naive = setupWorld();
const grid = setupWorld(); grid.enableSpatialHash({ cellSize:128 });
// Single step to populate internal state
naive.step(naive.lastTime + 1000/60);
grid.step(grid.lastTime + 1000/60);

const overlaps = overlapSet(naive);
const gridSet = gridPairs(grid);
let missing=[]; for (const k of overlaps){ if(!gridSet.has(k)) missing.push(k); }
const totalAll = (naive.entities.length*(naive.entities.length-1))/2;
const pruned = totalAll - gridSet.size;
const reduction = pruned/totalAll;
const pass = missing.length===0 && pruned>0;
console.log(`[AT] Broadphase Overlap Integrity PASS=${pass} overlapPairs=${overlaps.size} gridPairs=${gridSet.size} pruned=${pruned} reduction=${reduction.toFixed(3)}`);
if(!pass){ if (missing.length) console.log('Missing:', missing.slice(0,20)); process.exitCode=1; }
