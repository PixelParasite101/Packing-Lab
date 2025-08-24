// AT24: Snapshot-determinisme test
// Mål: To identiske kørsler (samme sekvens af operationer) skal give identisk hash af objekt-positioner.
// Hvis hash afviger -> ikke deterministisk.
// Udvidelse senere: inkludér metrics og rotations.

import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';
import fs from 'fs';

const CONFIG = { circleDiameter: 800, rectWidth:120, rectHeight:80, timeStep:1/60 };
const FRAMES = 90; // 1.5 sek
const INCLUDE_ADAPTIVE_IN_HASH = false; // feature flag (set true in AT24A variant)

function scenario(world){
  // Place 6 bricks i et lettere asymmetrisk mønster
  const placements = [
    [-150, -40], [ -10, -40], [130, -40],
    [-120,  70], [  20,  70], [160,  70]
  ];
  for (const [x,y] of placements){
    world.add(createBrick(x,y, CONFIG.rectWidth, CONFIG.rectHeight));
  }
  // Simuler let "push" på første brick i nogle frames
  for (let f=0; f<FRAMES; f++){
    if (f < 25){
      world.entities[0].pos.x += 1.8; // konstant skub
    }
    const before = world.solver.iterations;
    world.step(world.lastTime + 1000/60);
    if (INCLUDE_ADAPTIVE_IN_HASH){
      if (!world._adaptiveIterLog) world._adaptiveIterLog = [];
      if (world.solver.iterations !== before){
        world._adaptiveIterLog.push(`${f}:${world.solver.iterations}`);
      }
    }
  }
}

function hashWorld(world){
  // Sorter efter id for stabil orden
  const sorted = [...world.entities].sort((a,b)=>a.id-b.id);
  const parts = sorted.map(e => `${e.id}:${e.pos.x.toFixed(3)},${e.pos.y.toFixed(3)}`);
  if (INCLUDE_ADAPTIVE_IN_HASH && world._adaptiveIterLog){
    parts.push('ITSEQ:' + world._adaptiveIterLog.join(','));
  }
  // Simple FNV-1a variant (no external libs)
  
  let hash = 2166136261 >>> 0;
  const str = parts.join('|');
  for (let i=0;i<str.length;i++){
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return { hash: hash.toString(16), snapshot: parts };
}

function runOne(){
  _resetBrickIdsForTest();
  const world = new World(CONFIG);
  scenario(world);
  return hashWorld(world);
}

function main(){
  const a = runOne();
  const b = runOne();
  const pass = a.hash === b.hash;
  const line = `[AT24] PASS=${pass} hashA=${a.hash} hashB=${b.hash}`;
  console.log(line);
  try {
    fs.mkdirSync('tests/logs', { recursive: true });
    fs.writeFileSync('tests/logs/at24.log', line + '\n', 'utf8');
  } catch(e){ /* ignore */ }
  if(!pass){
    // Extra debug dump
    console.log('[AT24] SNAPSHOT_A', a.snapshot);
    console.log('[AT24] SNAPSHOT_B', b.snapshot);
    process.exitCode = 1;
  }
}

main();
