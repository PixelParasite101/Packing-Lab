// 5.10 Performance trend report: rolling median over last N snapshots
// Captures same scenarios as perf-snapshot (baseline, substeps, spatial, sleeping)
// Outputs current metrics vs median of prior history and optional JSON persistence.
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CONFIG = { circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 };
const FRAMES = 120;
const HISTORY_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'perf-history.json');
const KEEP = 40; // retain last 40 snapshots
const MEDIAN_WINDOW = 10; // compare against median of previous up to 10

function populate(world){
  const placements = [
    [-150,-40],[-10,-40],[130,-40],
    [-120,70],[20,70],[160,70]
  ];
  for (const [x,y] of placements){ world.add(createBrick(x,y, CONFIG.rectWidth, CONFIG.rectHeight)); }
}

function runScenario({ substeps=false, spatial=false, sleeping=false }){
  _resetBrickIdsForTest();
  const w = new World(CONFIG);
  w.lastTime = 0;
  populate(w);
  w.enableAdaptiveIterations({ disableAnomaly:true, downscaleBlockFrames:120, penetrationLow:-1, freezeAfterFirstEscalation:true });
  if (spatial) w.enableSpatialHash({ cellSize:128 });
  if (substeps){ w.enableAdaptiveSubsteps({ freezeAfterFirstEscalation:true, contactDensityHigh:0.5, dragDisplacementHigh:50 }); }
  if (sleeping){ w.enableSleeping({ framesRequired:20 }); }
  for (let f=0; f<FRAMES; f++){
    if (f < 40){ w.entities[0].pos.x += 0.8; }
    w.step(w.lastTime + 1000/60);
  }
  return { b:w.metrics.broadphaseMs, n:w.metrics.narrowphaseMs, s:w.metrics.solverMs, it:w.solver.iterations, pairs:w.metrics.broadphasePairs };
}

function averageScenario(opts, repeats=3){
  const acc = { b:0,n:0,s:0,it:0,pairs:0 };
  for (let i=0;i<repeats;i++){
    const r = runScenario(opts); acc.b+=r.b; acc.n+=r.n; acc.s+=r.s; acc.it+=r.it; acc.pairs+=r.pairs;
  }
  return { b:acc.b/repeats, n:acc.n/repeats, s:acc.s/repeats, it:Math.round(acc.it/repeats), pairs:Math.round(acc.pairs/repeats) };
}

function median(arr){ if (!arr.length) return 0; const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2? s[m] : (s[m-1]+s[m])/2; }

function loadHistory(){ if (!fs.existsSync(HISTORY_FILE)) return []; try { return JSON.parse(fs.readFileSync(HISTORY_FILE,'utf8')); } catch { return []; } }
function saveHistory(h){ fs.writeFileSync(HISTORY_FILE, JSON.stringify(h,null,2)); }

function summarize(current, history){
  const prev = history.slice(-MEDIAN_WINDOW);
  const med = {
    baseline:{ b:median(prev.map(x=>x.baseline.b)), n:median(prev.map(x=>x.baseline.n)), s:median(prev.map(x=>x.baseline.s)), pairs:median(prev.map(x=>x.baseline.pairs)) },
    spatial:{ pairs: median(prev.map(x=>x.spatial.pairs)) }
  };
  const pairReductionCurrent = current.baseline.pairs>0 ? 1 - (current.spatial.pairs/current.baseline.pairs) : 0;
  const pairReductionMedian = (med.baseline.pairs>0 && med.spatial.pairs>0) ? 1 - (med.spatial.pairs/med.baseline.pairs) : 0;
  return { med, pairReductionCurrent, pairReductionMedian };
}

function pctDelta(curr, med){ if (med===0) return 0; return ((curr-med)/med)*100; }

function main(){
  const baseline = averageScenario({});
  const substeps = averageScenario({ substeps:true });
  const spatial = averageScenario({ spatial:true });
  const sleeping = averageScenario({ sleeping:true });
  const current = { ts: Date.now(), baseline, substeps, spatial, sleeping };
  let history = loadHistory();
  const summary = summarize(current, history);
  console.log('[PerfTrend] baseline', baseline);
  console.log('[PerfTrend] spatial', spatial, 'pairReduction=' + (current.baseline.pairs>0? ((1 - spatial.pairs/baseline.pairs)*100).toFixed(2)+'%':'n/a'));
  console.log('[PerfTrend] substeps', substeps);
  console.log('[PerfTrend] sleeping', sleeping);
  console.log('[PerfTrend] medianWindow=' + MEDIAN_WINDOW, 'historyCount=' + history.length);
  console.log('[PerfTrend] median baseline solverMs=' + summary.med.baseline.s.toFixed(6) + ' broadphaseMs=' + summary.med.baseline.b.toFixed(6));
  console.log('[PerfTrend] deltas solverMs=' + pctDelta(baseline.s, summary.med.baseline.s).toFixed(2)+'% broadphaseMs=' + pctDelta(baseline.b, summary.med.baseline.b).toFixed(2)+'%');
  console.log('[PerfTrend] pairReduction current=' + (summary.pairReductionCurrent*100).toFixed(2)+'% median=' + (summary.pairReductionMedian*100).toFixed(2)+'%');

  history.push(current);
  if (history.length > KEEP) history = history.slice(-KEEP);
  if (process.env.PERF_TREND_SAVE === '1'){ saveHistory(history); console.log('[PerfTrend] history saved:', HISTORY_FILE); }
  // Optional fail criteria (not strict requirement of 5.10, but helpful):
  if (summary.pairReductionCurrent < 0.05){ console.error('[PerfTrend][WARN] low pair reduction'); }
}

main();
