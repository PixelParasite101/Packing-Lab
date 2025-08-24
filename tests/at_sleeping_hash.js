// 2.10 Sleeping-system determinism: enabling sleeping must not change hash.
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

const CONFIG = { timeStep:1/60, rectWidth:120, rectHeight:80 };

function setupWorld(enableSleeping){
  _resetBrickIdsForTest();
  const w = new World(CONFIG);
  w.lastTime = 0;
  const placements = [
    [-200,-40],[-40,-40],[120,-40],
    [-160,80],[-0,80],[160,80]
  ]; // spaced so no overlaps (no contacts → stable)
  for (const [x,y] of placements){ w.add(createBrick(x,y, CONFIG.rectWidth, CONFIG.rectHeight)); }
  // Enable metrics for hash extended part
  w.enableDeterminismMetrics();
  if (enableSleeping){ w.enableSleeping({ framesRequired:12 }); }
  return w;
}

function hashWorld(w){
  const sorted = [...w.entities].sort((a,b)=>a.id-b.id);
  const parts = sorted.map(e=>`${e.id}:${e.pos.x.toFixed(3)},${e.pos.y.toFixed(3)}`);
  if (w._detMetricsEnabled){
    parts.push('METRICS:' + [w._detMetrics.totalIterations, w._detMetrics.finalContactCount].join(','));
  }
  // FNV-1a
  let h = 2166136261 >>> 0;
  const str = parts.join('|');
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619)>>>0; }
  return h.toString(16);
}

function runFrames(w, frames){
  for (let f=0; f<frames; f++){
    w.step(w.lastTime + 1000/60);
  }
}

const frames = 70; // > framesRequired for sleeping world
const wA = setupWorld(false);
runFrames(wA, frames);
const hashA = hashWorld(wA);

const wB = setupWorld(true);
runFrames(wB, frames);
const hashB = hashWorld(wB);

const pass = hashA === hashB;
console.log(`[AT] Sleeping Determinism (2.10) PASS=${pass} ${hashA} vs ${hashB}`);
if (!pass) process.exitCode = 1;