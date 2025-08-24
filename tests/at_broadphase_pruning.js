// AT Broadphase Pruning: grid broadphase must include all overlapping AABB pairs and prune some non-overlapping pairs.
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

const CONFIG = { circleDiameter:1200, rectWidth:60, rectHeight:40, timeStep:1/60 };

// Use spacing smaller end-to-end than width/height to force overlaps (rect width=60, height=40 => hw=30, hh=20; choose < 60 and < 40)
function createLayout(countX=10, countY=6, spacingX=55, spacingY=35){
  const placements = [];
  let id=0;
  for (let y=0;y<countY;y++){
    for (let x=0;x<countX;x++){
      placements.push([(x - countX/2)*spacingX, (y - countY/2)*spacingY]);
      id++;
    }
  }
  return placements;
}

function buildWorld(grid=false){
  _resetBrickIdsForTest();
  const w = new World(CONFIG);
  w.lastTime = 0;
  for (const [x,y] of createLayout()){
    w.add(createBrick(x,y, CONFIG.rectWidth, CONFIG.rectHeight));
  }
  if (grid) w.enableSpatialHash({ cellSize:128 });
  // single tick to populate metrics
  w.step(w.lastTime + 1000/60);
  return w;
}

// Naive reference
const naiveW = buildWorld(false);
const gridW = buildWorld(true);

// Build naive overlapping AABB pair set (filter out clearly separated pairs by AABB check)
function overlappingPairs(world){
  const ents = world.entities;
  const res = new Set();
  for (let i=0;i<ents.length;i++){
    for (let j=i+1;j<ents.length;j++){
      const a=ents[i], b=ents[j];
      if (Math.abs(a.pos.x - b.pos.x) <= a.hw + b.hw && Math.abs(a.pos.y - b.pos.y) <= a.hh + b.hh){
        res.add(`${a.id}-${b.id}`);
      }
    }
  }
  return res;
}

const overlapSet = overlappingPairs(naiveW);

// Collect grid pairs (these should be exactly overlapSet)
const gridPairs = new Set();
for (const [a,b] of gridW.broadphase.queryPairs()){
  const k = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
  gridPairs.add(k);
}

// Assertions
let missing = [];
for (const k of overlapSet){ if (!gridPairs.has(k)) missing.push(k); }
const totalAllPairs = (naiveW.entities.length*(naiveW.entities.length-1))/2;
const pruned = totalAllPairs - gridPairs.size; // naive all-pairs minus kept
const reduction = pruned / totalAllPairs;
const MIN_REDUCTION = 0.05; // task 2.4 threshold (>=5% pruning required)
const pass = missing.length===0 && pruned > 0 && reduction >= MIN_REDUCTION;
console.log(`[AT] Broadphase Pruning PASS=${pass} overlapPairs=${overlapSet.size} gridPairs=${gridPairs.size} pruned=${pruned} reduction=${reduction.toFixed(3)} (min=${MIN_REDUCTION})`);
if (!pass){
  if (missing.length) console.log('Missing overlap pairs:', missing.slice(0,20));
  if (reduction < MIN_REDUCTION) console.log(`Reduction below minimum: ${reduction.toFixed(4)} < ${MIN_REDUCTION}`);
  process.exitCode = 1;
}
