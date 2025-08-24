// 4.1d Containment shrink sequence hash determinism & outOfBounds fallback
import { buildPresetWorld } from './helpers/flagBuilder.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

function buildWorld(){
  _resetBrickIdsForTest();
  const { world: w } = buildPresetWorld({ circleDiameter:1200, rectWidth:120, rectHeight:80, timeStep:1/60 });
  w.lastTime = 0;
  // Place several bricks at different radii
  const placements = [
    [300,0],[0,300],[-280,0],[0,-260],[180,180],[-160,190]
  ];
  for (const [x,y] of placements){ w.add(createBrick(x,y,120,80)); }
  return w;
}

function fnv(parts){
  let h = 2166136261>>>0; const str = parts.join('|');
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619)>>>0; }
  return h.toString(16);
}

function hashWorld(w){
  const sorted = [...w.entities].sort((a,b)=>a.id-b.id);
  const parts = sorted.map(e=>`${e.id}:${e.pos.x.toFixed(3)},${e.pos.y.toFixed(3)}${e.outOfBounds?'!O':''}`);
  return fnv(parts);
}

function runSequence(){
  const w = buildWorld();
  // Baseline radius ~ circleDiameter/2 = 600
  w.setArena(600,null);
  // Shrink sequence
  w.setArena(500,null);
  w.setArena(400,null);
  w.setArena(300,null);
  // Final aggressive shrink creating outOfBounds for impossible geometry (if any) -> use radius 50
  w.setArena(50,null);
  return { hash: hashWorld(w), w };
}

const r1 = runSequence();
const r2 = runSequence();
const same = r1.hash === r2.hash;
// Validate at least one outOfBounds when final radius tiny (expected due to halfDiag 72 > 50)
const anyOOB = r1.w.entities.some(e=>e.outOfBounds);
const oobMetric = r1.w.metrics.outOfBoundsCount || 0;
const oobMetricOk = anyOOB ? oobMetric > 0 : oobMetric === 0;
// Metrics: we expect at least one reposition across shrinks
const repositionMetric = r1.w.metrics.containmentRepositions;
const metricOk = typeof repositionMetric === 'number' && repositionMetric > 0;
const pass = same && anyOOB && metricOk && oobMetricOk;
console.log(`[AT] Containment Shrink Hash PASS=${pass} hashEqual=${same} anyOutOfBounds=${anyOOB} oobMetricOk=${oobMetricOk} metricOk=${metricOk} repositions=${repositionMetric} oobMetric=${oobMetric} hash=${r1.hash}`);
if (!pass) process.exitCode = 1;
