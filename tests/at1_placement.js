// AT1: Placement validity & ghost behavior
// Criteria: ghost valid only when placement inside arena & no overlap; invalid placements not added.
// Pass conditions:
//  - Valid placement increments piece count
//  - Invalid (outside circle) placement ignored
//  - Invalid (overlap) placement ignored
//  - No overlaps after valid placements

import { buildPresetWorld } from './helpers/flagBuilder.js';
import fs from 'fs';

const CONFIG = { circleDiameter:700, rectWidth:120, rectHeight:80, timeStep:1/60 };

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

function attemptPlace(state, x, y){
  state.updateGhost(x,y);
  const before = state.bricks.length;
  state.placeAt(x,y);
  return state.bricks.length - before;
}

function runAT1(){
  const { world, state } = buildPresetWorld(CONFIG);

  const results = { addedValid: false, blockedOutside:false, blockedOverlap:false, noOverlap:true };

  // 1. Valid placement (center)
  results.addedValid = attemptPlace(state, 0,0) === 1;

  // 2. Outside circle (just beyond radius)
  const outsideX = state.circleRadius + CONFIG.rectWidth; // clearly outside
  results.blockedOutside = attemptPlace(state, outsideX, 0) === 0;

  // 3. Overlap placement (same position as first)
  results.blockedOverlap = attemptPlace(state, 0,0) === 0;

  // 4. Add second valid non-overlapping piece
  attemptPlace(state, 200,0); // should be valid

  // 5. Check overlap invariant
  results.noOverlap = noOverlap(state.bricks);

  const pass = Object.values(results).every(v=>v);
  const line = `[AT1] PASS=${pass} results=${JSON.stringify(results)}`;
  console.log(line);
  try {
    fs.mkdirSync('tests/logs', { recursive: true });
    fs.writeFileSync('tests/logs/at1.log', line + '\n', 'utf8');
  } catch(e){ /* ignore logging errors */ }
  if (!pass) process.exitCode = 1;
}

runAT1();
