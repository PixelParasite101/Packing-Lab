// Performance snapshot: compare baseline vs adaptive substeps scenario timings.
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CONFIG = { circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 };
const FRAMES = 120;

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
  w.lastTime = 0; // stabilize timing
  populate(w);
  w.enableAdaptiveIterations({ disableAnomaly:true, downscaleBlockFrames:120, penetrationLow:-1, freezeAfterFirstEscalation:true });
  if (spatial) w.enableSpatialHash({ cellSize:128 });
  if (substeps){
    w.enableAdaptiveSubsteps({ freezeAfterFirstEscalation:true, contactDensityHigh:0.5, dragDisplacementHigh:50 });
  }
  if (sleeping){ w.enableSleeping({ framesRequired:20 }); }
  for (let f=0; f<FRAMES; f++){
    if (f < 40){ w.entities[0].pos.x += 0.8; }
    w.step(w.lastTime + 1000/60);
  }
  const wakeEvents = w.metrics._wakeEventsTotal || 0;
  return { broadphaseMs:w.metrics.broadphaseMs, narrowphaseMs:w.metrics.narrowphaseMs, solverMs:w.metrics.solverMs, iterations:w.solver.iterations, substeps: substeps ? w.adaptiveSubsteps.current : w.substeps, pairs:w.metrics.broadphasePairs, sleepingCount:w.metrics.sleepingCount||0, wakeEvents };
}

function averageScenario(opts, repeats=3){
  const acc = { broad:0, narrow:0, solver:0, it:0, subs:0, pairs:0, sleeping:0, wakeEvents:0 };
  for (let i=0;i<repeats;i++){
    const r = runScenario(opts);
    acc.broad += r.broadphaseMs; acc.narrow += r.narrowphaseMs; acc.solver += r.solverMs; acc.it += r.iterations; acc.subs += r.substeps; acc.pairs += r.pairs; acc.sleeping += r.sleepingCount; acc.wakeEvents += r.wakeEvents;
  }
  return {
    broadphaseMs: acc.broad / repeats,
    narrowphaseMs: acc.narrow / repeats,
    solverMs: acc.solver / repeats,
    iterations: Math.round(acc.it / repeats),
    substeps: Math.round(acc.subs / repeats),
    pairs: Math.round(acc.pairs / repeats),
    avgSleepingCount: +(acc.sleeping / repeats).toFixed(2),
    avgWakeEvents: Math.round(acc.wakeEvents / repeats)
  };
}

function loadBaseline(file){
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file,'utf8'));
}

function saveBaseline(file, data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}

function main(){
  const base = averageScenario({ substeps:false, spatial:false });
  const subs = averageScenario({ substeps:true, spatial:false });
  const spatial = averageScenario({ substeps:false, spatial:true });
  const sleeping = averageScenario({ substeps:false, spatial:false, sleeping:true });
  const result = { baseline: base, substeps: subs, spatial, sleeping };
  console.log('[Perf] baseline', base);
  console.log('[Perf] substeps', subs);
  console.log('[Perf] spatial ', spatial);
  console.log('[Perf] sleeping', sleeping);
  const diff = {
    solverDelta: +(subs.solverMs - base.solverMs).toFixed(6),
    broadphaseDelta: +(subs.broadphaseMs - base.broadphaseMs).toFixed(6),
    narrowphaseDelta: +(subs.narrowphaseMs - base.narrowphaseMs).toFixed(6)
  };
  console.log('[Perf] delta', diff);
  const spatialGain = {
    pairReduction: base.pairs > 0 ? +(1 - (spatial.pairs / base.pairs)).toFixed(4) : 0,
    broadphaseSpeedup: spatial.broadphaseMs > 0 ? +((base.broadphaseMs - spatial.broadphaseMs)/base.broadphaseMs).toFixed(4) : 0
  };
  console.log('[Perf] spatialGain', spatialGain);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const baselinePath = path.join(__dirname, 'metrics-baseline.json');
  const override = process.env.PERF_UPDATE === '1';
  let stored = loadBaseline(baselinePath);
  if (!stored || override){
    const snapshot = {
      version: stored ? (stored.version||0)+1 : 1,
      created: new Date().toISOString().slice(0,10),
      notes: 'Updated via perf-snapshot with PERF_UPDATE='+ (override?'1':'auto initial'),
      scenario: 'perf-snapshot default',
  baseline: base,
  substeps: subs,
  spatial,
  spatialGain,
  tolerance: stored?.tolerance || { solverMs:0.05, narrowphaseMs:0.02, broadphaseMs:0.01, spatialPairReductionMin:0.05 }
    };
    saveBaseline(baselinePath, snapshot);
    console.log('[Perf] baseline file written', baselinePath);
    return;
  }
  // Compare against stored
  const tol = stored.tolerance;
  function within(key, measuredDelta){
    return Math.abs(measuredDelta) <= tol[key];
  }
  const regressions = [];
  if (!within('solverMs', diff.solverDelta)) regressions.push('solverMs');
  if (!within('narrowphaseMs', diff.narrowphaseDelta)) regressions.push('narrowphaseMs');
  if (!within('broadphaseMs', diff.broadphaseDelta)) regressions.push('broadphaseMs');
  // Spatial gain minimum check (not a regression if improved more, only fail if below minimum)
  if (stored.spatialGain && stored.tolerance.spatialPairReductionMin != null){
    if (stored.spatialGain.pairReduction < stored.tolerance.spatialPairReductionMin){
      console.error('[Perf][FAIL] spatial pair reduction below minimum', stored.spatialGain.pairReduction, '<', stored.tolerance.spatialPairReductionMin);
      regressions.push('spatialPairReduction');
    }
  }
  if (regressions.length){
    console.error('[Perf][FAIL] Regression beyond tolerance in: '+regressions.join(', '));
    console.error('Tolerance:', tol, 'Diff:', diff);
    process.exitCode = 2;
  } else {
    console.log('[Perf][OK] Within tolerance.');
  }
}

main();

