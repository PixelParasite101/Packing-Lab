import { World } from '../src/physics/world.js';
import { GameState } from '../src/game/state.js';
import { _resetBrickIdsForTest } from '../src/interaction/mouse.js';
import { buildDeterminismHash } from '../src/physics/hashTemplate.js';
import fs from 'fs';

const CONFIG = { circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 };
const DROP_POS = { x:300, y:0 };

function noOverlap(bricks){
  for (let i=0;i<bricks.length;i++){
    for (let j=i+1;j<bricks.length;j++){
      const a=bricks[i], b=bricks[j];
      if (Math.abs(a.pos.x - b.pos.x) < a.hw + b.hw && Math.abs(a.pos.y - b.pos.y) < a.hh + b.hh){
        return false;
      }
    }
  }
  return true;
}

function runOne(){
  _resetBrickIdsForTest();
  const world = new World(CONFIG);
  const state = new GameState(world, CONFIG);
  state.applyArenaFlags && state.applyArenaFlags();

  // baseline brick at center without auto-pack
  state.updateGhost(0,0);
  state.placeAt(0,0);

  state.setAutoPackEnabled(true);
  const before = Math.hypot(DROP_POS.x, DROP_POS.y);
  state.updateGhost(DROP_POS.x, DROP_POS.y);
  state.placeAt(DROP_POS.x, DROP_POS.y);
  const b = state.bricks[state.bricks.length-1];
  const after = Math.hypot(b.pos.x, b.pos.y);
  const overlapFree = noOverlap(state.bricks);

  const { hash } = buildDeterminismHash(world);
  return { before, after, overlapFree, hash };
}

function main(){
  const a = runOne();
  const b = runOne();
  const pass = (a.after < a.before) && a.overlapFree && (a.hash === b.hash);
  const line = `[AT_AUTO_PACK] PASS=${pass} before=${a.before.toFixed(3)} after=${a.after.toFixed(3)} overlap=${a.overlapFree} hashA=${a.hash} hashB=${b.hash}`;
  console.log(line);
  try {
    fs.mkdirSync('tests/logs', { recursive:true });
    fs.writeFileSync('tests/logs/at_auto_pack.log', line+'\n', 'utf8');
  } catch(e){}
  if (!pass) process.exitCode = 1;
}

main();
