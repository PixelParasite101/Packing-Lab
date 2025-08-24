// AT24A: Determinism including adaptive iteration sequence
// Clones AT24 but enables adaptive iterations and includes iteration change sequence in hash.
// Pass criteria: two identical runs produce identical hash (positions + iteration sequence).

import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';
import fs from 'fs';

const CONFIG = { circleDiameter: 800, rectWidth:120, rectHeight:80, timeStep:1/60 };
const FRAMES = 90;

function scenario(world){
  // Place 6 bricks
  const placements = [
    [-150, -40], [ -10, -40], [130, -40],
    [-120,  70], [  20,  70], [160,  70]
  ];
  for (const [x,y] of placements){
    world.add(createBrick(x,y, CONFIG.rectWidth, CONFIG.rectHeight));
  }
  // Enable adaptive iterations (deterministic) and (optionally) substeps
  world.enableAdaptiveIterations({ disableAnomaly:true, downscaleBlockFrames:120, initialEscalationBlockFrames:5, penetrationLow:-1, trackIterationSequence:true, freezeAfterFirstEscalation:true });
  // Optionally: world.enableAdaptiveSubsteps(); // keep off to reduce variance

  // Warm-up frames (no push) for deterministisk stabilisering
  const WARMUP = 10;
  for (let wf=0; wf<WARMUP; wf++){
    world.step(world.lastTime + 1000/60);
  }
  for (let f=0; f<FRAMES; f++){
    if (f < 25){
      world.entities[0].pos.x += 0.9; // gentler push to avoid large penetration spikes
    }
  world.step(world.lastTime + 1000/60);
  }
}

function hashWorld(world){
  const sorted = [...world.entities].sort((a,b)=>a.id-b.id);
  const parts = sorted.map(e => `${e.id}:${e.pos.x.toFixed(3)},${e.pos.y.toFixed(3)}`);
  if (world._adaptiveIterLog){
    parts.push('ITSEQ:' + world._adaptiveIterLog.join(','));
  }
  // FNV-1a
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
  const line = `[AT24A] PASS=${pass} hashA=${a.hash} hashB=${b.hash}`;
  console.log(line);
  try {
    fs.mkdirSync('tests/logs', { recursive: true });
    fs.writeFileSync('tests/logs/at24a.log', line + '\n', 'utf8');
    if(!pass){
      fs.appendFileSync('tests/logs/at24a.log', '[AT24A] SNAPSHOT_A ' + a.snapshot.join(' ') + '\n');
      fs.appendFileSync('tests/logs/at24a.log', '[AT24A] SNAPSHOT_B ' + b.snapshot.join(' ') + '\n');
    }
  } catch(e){}
  if(!pass) process.exitCode = 1;
}

main();
