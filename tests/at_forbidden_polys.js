// AT 6.2 Forbidden polygons placement rejection test
import { World } from '../src/physics/world.js';
import { GameState } from '../src/game/state.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';

_resetBrickIdsForTest();
const world = new World({ circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 });
const state = new GameState(world, { circleDiameter:800, rectWidth:120, rectHeight:80 });

// Define a triangle centered near origin
state.setForbiddenPolys([
  { points:[ {x:-50,y:-50},{x:80,y:-40},{x:10,y:70} ] }
]);

function tryPlace(x,y){
  state.updateGhost(x,y);
  const valid = state.ghost.valid;
  if (valid){
    state.placeAt(x,y);
  }
  return valid;
}

// One position outside polygon
const ok1 = tryPlace(-200,0);
// One overlapping / inside polygon
state.updateGhost(0,0); const insideValid = state.ghost.valid; // should be false
// One just outside boundary
const ok2 = tryPlace(200,0);

const pass = ok1 && ok2 && insideValid === false;
console.log(`[AT6.2] PASS=${pass} outside1=${ok1} outside2=${ok2} insideValid=${insideValid}`);
if(!pass) process.exitCode=1;
