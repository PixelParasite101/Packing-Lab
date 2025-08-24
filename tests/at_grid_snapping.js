import { World } from '../src/physics/world.js';
import { GameState } from '../src/game/state.js';
import { _resetBrickIdsForTest } from '../src/interaction/mouse.js';
import { buildDeterminismHash } from '../src/physics/hashTemplate.js';
import fs from 'fs';

const CONFIG = { circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 };
const BASELINE_HASH = '316241e6';

function run(){
  _resetBrickIdsForTest();
  const world = new World(CONFIG);
  const state = new GameState(world, CONFIG);
  state.applyArenaFlags && state.applyArenaFlags();
  state.setGridEnabled(true);

  const off = { x:45, y:55 };
  const expected = state.snapToGrid(off.x, off.y);
  state.updateGhost(off.x, off.y);
  const ghostPos = { ...state.ghost.pos };
  state.placeAt(off.x, off.y);
  const brickPos = { ...state.bricks[0].pos };

  const hash = buildDeterminismHash(world).hash;

  const results = {
    ghostFinalEqual: ghostPos.x === brickPos.x && ghostPos.y === brickPos.y,
    snapMatch: ghostPos.x === expected.x && ghostPos.y === expected.y,
    hashMatch: hash === BASELINE_HASH
  };
  const pass = Object.values(results).every(v=>v);
  const line = `[AT_GRID] PASS=${pass} results=${JSON.stringify(results)} hash=${hash}`;
  console.log(line);
  try {
    fs.mkdirSync('tests/logs', { recursive: true });
    fs.writeFileSync('tests/logs/at_grid_snapping.log', line + '\n');
  } catch(e) { /* ignore logging errors */ }
  if (!pass) process.exitCode = 1;
}

run();
