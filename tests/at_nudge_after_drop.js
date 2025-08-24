import { World } from '../src/physics/world.js';
import { GameState } from '../src/game/state.js';
import { buildDeterminismHash } from '../src/physics/hashTemplate.js';
import { _resetBrickIdsForTest } from '../src/interaction/mouse.js';
import fs from 'fs';

const CONFIG = { circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 };

function hasOverlap(world){
  for (const [a,b] of world.broadphase.queryPairs()){
    if (Math.abs(a.pos.x - b.pos.x) < a.hw + b.hw && Math.abs(a.pos.y - b.pos.y) < a.hh + b.hh){
      return true;
    }
  }
  return false;
}

function scenario(){
  _resetBrickIdsForTest();
  const world = new World(CONFIG);
  const state = new GameState(world, CONFIG);
  state.applyArenaFlags && state.applyArenaFlags();
  state.setNudgeEnabled(true);
  state.updateGhost(0,0);
  state.placeAt(0,0);
  const targetX = 121, targetY = 0;
  state.updateGhost(targetX, targetY);
  state.placeAt(targetX, targetY);
  const placed = state.bricks[state.bricks.length-1];
  const disp = Math.hypot(placed.pos.x - targetX, placed.pos.y - targetY);
  world.broadphase.build(world.entities);
  const overlap = hasOverlap(world);
  const { hash } = buildDeterminismHash(world);
  return { disp, overlap, hash, distance: state.nudge.distance };
}

function run(){
  const a = scenario();
  const b = scenario();
  const within = a.disp <= a.distance + 1e-6;
  const pass = within && !a.overlap && a.hash === b.hash;
  const line = `[AT] Nudge After Drop PASS=${pass} disp=${a.disp.toFixed(3)} hashA=${a.hash} hashB=${b.hash}`;
  console.log(line);
  try {
    fs.mkdirSync('tests/logs', { recursive: true });
    fs.writeFileSync('tests/logs/at_nudge_after_drop.log', line + '\n', 'utf8');
  } catch(e){ /* ignore */ }
  if (!pass){
    if (!within) console.log('Displacement exceeded nudge distance');
    if (a.overlap) console.log('Overlap detected');
    if (a.hash !== b.hash) console.log('Hash mismatch');
    process.exitCode = 1;
  }
}

run();
