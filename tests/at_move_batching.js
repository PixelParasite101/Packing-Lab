// 4.3 MoveCommand batching acceptance test
import { World } from '../src/physics/world.js';
import { GameState } from '../src/game/state.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

_resetBrickIdsForTest();
const world = new World({ circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 });
const state = new GameState(world, { circleDiameter:800, rectWidth:120, rectHeight:80 });
const b = createBrick(0,0,120,80); state.addBrick(b); state.select(b);
// Simulate a drag with multiple incremental moves
let from = { x: b.pos.x, y: b.pos.y };
for (let i=1;i<=50;i++){
  const to = { x:i*2, y:0 };
  state.registerMove(b, {x:from.x,y:from.y}, to);
  b.pos.x = to.x; b.pos.y = to.y; // mimic interactive drag immediate position update
  from = to;
}
// Flush batch explicitly
state.flushMoveBatch();
// Undo stack should have exactly 1 MoveCommand representing entire drag
const undoCount = state.commandStack.undoStack.length;
const cmd = state.commandStack.undoStack[0];
const isMove = cmd && cmd.constructor && cmd.constructor.name === 'MoveCommand';
const coversSpan = isMove && cmd.from.x === 0 && cmd.to.x === 100; // 50 steps *2
const pass = undoCount === 1 && isMove && coversSpan;
console.log(`[AT] Move Batching PASS=${pass} undoCount=${undoCount} isMove=${isMove} coversSpan=${coversSpan}`);
if(!pass) process.exitCode=1;
