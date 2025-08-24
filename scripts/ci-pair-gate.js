// 5.9 CI gating of pairReduction% trend
// Maintains a rolling history file (pair-history.json) with recent spatial pairReduction values.
// Fails build if last N (default 3) runs are below minimum threshold (configurable) OR
// if a sudden drop > allowed regression margin vs median of previous M runs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HISTORY_FILE = path.join(__dirname, 'pair-history.json');
const FRAMES = 40;
const BRICKS = 160; // moderate density
const CELL_SIZE = 128;

const CFG = {
  minReduction: 0.05,          // absolute minimum acceptable reduction (%) across all recent runs
  consecutiveFailWindow: 3,    // N consecutive runs below min triggers fail
  regressionWindow: 5,         // M prior runs to compute median baseline
  maxRegressionDrop: 0.15      // allow at most 15 percentage points drop vs median
};

function buildWorld(mode){
  _resetBrickIdsForTest();
  const w = new World({ circleDiameter:1400, rectWidth:120, rectHeight:80, timeStep:1/60 });
  if (mode==='grid') w.enableSpatialHash({ cellSize: CELL_SIZE });
  // Place bricks in overlapping staggered grid
  const spacingX = 115, spacingY = 75;
  const cols = 20, rows = 20;
  let placed=0;
  for (let r=0; r<rows && placed<BRICKS; r++){
    const off = (r%2)? spacingX/2:0;
    for (let c=0; c<cols && placed<BRICKS; c++){
      const x=(c-cols/2)*spacingX + off;
      const y=(r-rows/2)*spacingY;
      w.add(createBrick(x,y,120,80));
      placed++;
    }
  }
  return w;
}

function runOnce(){
  const naive = buildWorld('naive');
  const grid = buildWorld('grid');
  for (let i=0;i<FRAMES;i++){ naive.step(naive.lastTime + 1000/60); grid.step(grid.lastTime + 1000/60); }
  const naivePairs = naive.metrics.broadphasePairs;
  const gridPairs = grid.metrics.broadphasePairs;
  let reduction = 0;
  if (naivePairs>0 && gridPairs>0 && gridPairs<=naivePairs){ reduction = 1 - (gridPairs/naivePairs); }
  return { naivePairs, gridPairs, reduction }; // reduction in [0,1]
}

function loadHistory(){
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(HISTORY_FILE,'utf8')); } catch { return []; }
}
function saveHistory(hist){ fs.writeFileSync(HISTORY_FILE, JSON.stringify(hist,null,2)); }

function median(arr){ if(!arr.length) return 0; const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2? s[m] : (s[m-1]+s[m])/2; }

function main(){
  const run = runOnce();
  const pct = +(run.reduction*100).toFixed(2);
  console.log(`[PairGate] reduction=${pct}% naivePairs=${run.naivePairs} gridPairs=${run.gridPairs}`);
  let history = loadHistory();
  history.push({ ts: Date.now(), reduction: run.reduction });
  if (history.length > 50) history = history.slice(-50);
  saveHistory(history);

  // Check consecutive fails
  const recent = history.slice(-CFG.consecutiveFailWindow);
  const allBelowMin = recent.length === CFG.consecutiveFailWindow && recent.every(r => r.reduction < CFG.minReduction);
  if (allBelowMin){
    console.error('[PairGate][FAIL] Consecutive runs below minimum reduction', CFG.minReduction, 'recent=', recent.map(r=>+(r.reduction*100).toFixed(1))+'%');
    process.exitCode = 2; return;
  }
  // Regression vs median of previous M (excluding current)
  const prev = history.slice(-(CFG.regressionWindow+1), -1); // previous M
  if (prev.length >= CFG.regressionWindow){
    const med = median(prev.map(r=>r.reduction));
    const drop = (med - run.reduction);
    if (drop > CFG.maxRegressionDrop){
      console.error('[PairGate][FAIL] Reduction drop', (drop*100).toFixed(2)+'pp', 'exceeds', (CFG.maxRegressionDrop*100)+'pp', 'medianPrev=', (med*100).toFixed(2)+'%');
      process.exitCode = 3; return;
    }
  }
  console.log('[PairGate][OK] Reduction healthy.');
}

main();
