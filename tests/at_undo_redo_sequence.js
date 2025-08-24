// AT6 Undo/Redo sequence integrity
import { World } from '../src/physics/world.js';
import { GameState } from '../src/game/state.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

_resetBrickIdsForTest();
const world = new World({ circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 });
const state = new GameState(world, { circleDiameter:800, rectWidth:120, rectHeight:80 });

// Place 5 bricks via command stack so they are undoable
const bricks=[];
for (let i=0;i<5;i++){
  const b=createBrick(i*130-260,0,120,80); bricks.push(b); state.commandStack.execute(new (class extends (class{ constructor(br){ this.brick=br;} execute(st){ st.addBrick(this.brick);} undo(st){ st.removeBrick(this.brick);} }) {})(b), state);
}
state.select(bricks[1]); state.rotateSelected();
state.select(bricks[3]); state.rotateSelected();
// Simulate move batching on brick 2 (index 2)
state.select(bricks[2]);
let from={ x:bricks[2].pos.x, y:bricks[2].pos.y };
for (let i=1;i<=30;i++){
  const to={ x: from.x + 3, y: from.y };
  state.registerMove(bricks[2], {x:from.x,y:from.y}, to);
  bricks[2].pos.x = to.x; bricks[2].pos.y = to.y; // immediate drag effect
  from = to;
}
state.flushMoveBatch();
// Delete brick 5
state.select(bricks[4]); state.deleteSelected();

function snap(){
  return state.bricks.map(b=>`${b.id}:${b.pos.x.toFixed(1)},${b.pos.y.toFixed(1)},${b.rot}`).join('|');
}
const snapshotA = snap();

// Undo all
let undoOps=0;
while(state.commandStack.undoStack.length){ state.undo(); undoOps++; }
const empty = state.bricks.length===0;
// Redo all
let redoOps=0;
while(state.commandStack.redoStack.length){ state.redo(); redoOps++; }
const snapshotB = snap();

const pass = empty && snapshotA === snapshotB;
console.log(`[AT6] PASS=${pass} undoOps=${undoOps} redoOps=${redoOps} snapshotMatch=${snapshotA===snapshotB}`);
if(!pass) process.exitCode=1;
