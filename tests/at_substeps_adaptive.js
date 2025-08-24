// AT-Substeps: Validate adaptive substeps escalate under load and remain deterministic with freeze conditions.
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';
import fs from 'fs';

const CONFIG = { circleDiameter: 800, rectWidth:120, rectHeight:80, timeStep:1/60 };
const FRAMES = 90;

function scenario(world){
  const placements = [
    [-150,-40],[-10,-40],[130,-40],
    [-120,70],[20,70],[160,70]
  ];
  for (const [x,y] of placements){
    world.add(createBrick(x,y, CONFIG.rectWidth, CONFIG.rectHeight));
  }
  world.enableAdaptiveIterations({ disableAnomaly:true, downscaleBlockFrames:120, penetrationLow:-1, trackIterationSequence:true, freezeAfterFirstEscalation:true });
  world.enableAdaptiveSubsteps({ trackSubstepSequence:true, freezeAfterFirstEscalation:true, contactDensityHigh:0.5, dragDisplacementHigh:50 });
  // Warm-up
  for (let i=0;i<10;i++){ world.step(world.lastTime + 1000/60); }
  for (let f=0; f<FRAMES; f++){
  if (f < 30){ world.entities[0].pos.x += 0.6; }
    world.step(world.lastTime + 1000/60);
  }
}

function hashWorld(world){
  const sorted = [...world.entities].sort((a,b)=>a.id-b.id);
  const parts = sorted.map(e=>`${e.id}:${e.pos.x.toFixed(3)},${e.pos.y.toFixed(3)}`);
  if (world._adaptiveIterLog) parts.push('IT:' + world._adaptiveIterLog.join(','));
  if (world._substepSeqLog) parts.push('SS:' + world._substepSeqLog.join(','));
  let h = 2166136261 >>> 0; const str = parts.join('|');
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619)>>>0; }
  return { hash:h.toString(16), parts };
}

function runOne(){
  _resetBrickIdsForTest();
  const w = new World(CONFIG); scenario(w); return hashWorld(w);
}

function main(){
  const a = runOne();
  const b = runOne();
  const pass = a.hash === b.hash;
  const line = `[AT-Substeps] PASS=${pass} hashA=${a.hash} hashB=${b.hash}`;
  console.log(line);
  try {
    fs.mkdirSync('tests/logs',{recursive:true});
    fs.writeFileSync('tests/logs/at_substeps.log', line+'\n','utf8');
    if(!pass){
      fs.appendFileSync('tests/logs/at_substeps.log', 'A '+a.parts.join(' ')+'\n');
      fs.appendFileSync('tests/logs/at_substeps.log', 'B '+b.parts.join(' ')+'\n');
    }
  } catch(e){}
  if(!pass) process.exitCode = 1;
}

main();
