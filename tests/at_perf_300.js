// AT5 Performance test (300 bricks) naive vs grid broadphase
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';
console.log('[AT5] start');

function setupWorld(mode){
  _resetBrickIdsForTest();
  const w = new World({ circleDiameter:1600, rectWidth:120, rectHeight:80, timeStep:1/60 });
  if (mode==='grid') w.enableSpatialHash({ cellSize:128 });
  // Place 300 bricks with partial overlaps to increase naive pair count but maintain broadphase pruning benefit.
  // Stagger rows (like a brick wall) with reduced spacing so many AABBs overlap in Y and partially in X.
  const target = 300;
  let placed = 0;
  const baseW = 120, baseH = 80;
  const spacingX = 110; // < width -> horizontal overlaps
  const spacingY = 70;  // < height -> vertical overlaps
  const cols = 25; // few more cols to reach target sooner with early break
  const rows = 20;
  for (let r=0; r<rows && placed < target; r++){
    const offsetX = (r % 2) ? spacingX/2 : 0; // stagger every other row
    for (let c=0; c<cols && placed < target; c++){
      const x = (c - cols/2)*spacingX + offsetX;
      const y = (r - rows/2)*spacingY;
      w.add(createBrick(x,y,baseW,baseH));
      placed++;
    }
  }
  return w;
}

function runSimMulti(w, frames=30){
  for (let i=0;i<3;i++){ w.step(w.lastTime + 1000/60); }
  let sumPairs=0, sumBroad=0;
  for (let f=0; f<frames; f++){
    w.step(w.lastTime + 1000/60);
    sumPairs += w.metrics.broadphasePairs;
    sumBroad += w.metrics.broadphaseMs;
  }
  return { avgPairs: Math.round(sumPairs/frames), avgBroad: sumBroad/frames };
}

function main(){
  try {
    console.log('[AT5] main');
    const naive = runSimMulti(setupWorld('naive'));
    console.log(`[AT5] naive avgPairs=${naive.avgPairs} bpMs=${naive.avgBroad.toFixed(4)}`);
    const grid = runSimMulti(setupWorld('grid'));
    console.log(`[AT5] grid avgPairs=${grid.avgPairs} bpMs=${grid.avgBroad.toFixed(4)}`);
    let reductionPct = naive.avgPairs>0 ? (1 - grid.avgPairs/naive.avgPairs)*100 : 0;
    if (!Number.isFinite(reductionPct)) reductionPct = 0;
    const pass = reductionPct >= 7;
    const strongReduction = reductionPct >= 25;
    console.log(`[AT5] PASS=${pass} reduction=${reductionPct.toFixed(2)}% strong=${strongReduction}`);
    if (!pass) process.exitCode = 1;
  } catch(e){
    console.error('[AT5][ERROR]', e && e.stack || e);
    process.exitCode = 2;
  }
}

main();
