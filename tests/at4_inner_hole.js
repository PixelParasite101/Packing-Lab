// AT4: Inner hole containment test
// Goal: Bricks must not enter the inner circular hole region.
// Pass criteria:
//  - No corner distance < innerHoleRadius - PEN_TOL at any frame
//  - overshootCount == 0 (no penetration events beyond tolerance)
//  - No NaN positions
//  - maxHolePen <= PEN_TOL (where penetration depth = innerR - dist when dist < innerR)

import { World } from '../src/physics/world.js';
import { createBrick } from '../src/interaction/mouse.js';
import fs from 'fs';
import { setPenetrationAlarm, configurePenetrationAlarm } from '../src/physics/alarm.js';

if (typeof performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}

const CONFIG = { circleDiameter: 900, rectWidth:120, rectHeight:80, timeStep:1/60 };
const INNER_HOLE_RADIUS = 150;
const PUSH_FRAMES = 50;
const RELAX_FRAMES = 50; // a bit longer relax
const PEN_TOL = 0.5; // mm tolerance vs hole boundary

let _logInit4 = false;
function writeLog(msg){
  try {
    fs.mkdirSync('tests/logs', { recursive: true });
    if(!_logInit4){
      fs.writeFileSync('tests/logs/at4.log', msg+'\n','utf8');
      _logInit4 = true;
    } else {
      fs.appendFileSync('tests/logs/at4.log', msg+'\n','utf8');
    }
  } catch(e){}
}

function minCornerDistance(brick){
  const corners = [
    {x: brick.pos.x - brick.hw, y: brick.pos.y - brick.hh},
    {x: brick.pos.x + brick.hw, y: brick.pos.y - brick.hh},
    {x: brick.pos.x + brick.hw, y: brick.pos.y + brick.hh},
    {x: brick.pos.x - brick.hw, y: brick.pos.y + brick.hh}
  ];
  let min = Infinity;
  for (const c of corners){
    const d = Math.hypot(c.x, c.y);
    if (d < min) min = d;
  }
  return min;
}

function run(){
  writeLog('[AT4] START');
  try {
  // Reset any previous global alarm threshold from earlier tests (warm-up phase disabled)
  setPenetrationAlarm(null);
    const world = new World(CONFIG);
  world.setArena(CONFIG.circleDiameter/2, INNER_HOLE_RADIUS);
  world.solver.iterations = 64; // stronger convergence

    // Spawn a brick just outside inner hole radius on +X axis
  // Ensure entire brick outside hole: inner radius + half width + margin
  const startR = INNER_HOLE_RADIUS + (CONFIG.rectWidth/2) + 10;
  const brick = createBrick(startR, 0, CONFIG.rectWidth, CONFIG.rectHeight);
    world.add(brick);
  // Warm-up phase (no alarm) to let spawn settle
  const WARMUP_FRAMES = 20;
  for (let i=0;i<WARMUP_FRAMES;i++){
    world.step(world.lastTime + 1000/60);
  }
  // Arm alarm AFTER warm-up with mild hysteresis (need 2 consecutive bad frames)
  configurePenetrationAlarm({ threshold: PEN_TOL * 2, consecutive: 2 });

    let maxHolePen = 0;
    let overshootCount = 0;

    for (let f=0; f<PUSH_FRAMES; f++){
      // Push gently toward center (reduced speed to limit peak penetration)
      brick.pos.x -= 1.2; // drive toward hole
      world.step(world.lastTime + 1000/60);
      const minDist = minCornerDistance(brick);
      if (minDist < INNER_HOLE_RADIUS){
        const pen = INNER_HOLE_RADIUS - minDist;
        if (pen > maxHolePen) maxHolePen = pen;
        if (pen > PEN_TOL) overshootCount++;
      }
    }
  // Relax frames keep alarm active from start of this phase; no mid-phase enabling needed now
  for (let f=0; f<RELAX_FRAMES; f++){
      world.step(world.lastTime + 1000/60);
      const minDist = minCornerDistance(brick);
      if (minDist < INNER_HOLE_RADIUS){
        const pen = INNER_HOLE_RADIUS - minDist;
        if (pen > maxHolePen) maxHolePen = pen;
        if (pen > PEN_TOL) overshootCount++;
      }
    }

    const anyNaN = Number.isNaN(brick.pos.x) || Number.isNaN(brick.pos.y);
    const pass = !anyNaN && maxHolePen <= PEN_TOL && overshootCount === 0;
    const line = `[AT4] PASS=${pass} maxHolePen=${maxHolePen.toFixed(3)} tol=${PEN_TOL} overshootCount=${overshootCount} NaN=${anyNaN}`;
  writeLog(line);
  console.log(line);
    if(!pass) process.exitCode = 1;
  } catch(err){
    writeLog('[AT4] ERROR ' + (err && err.stack || err));
    process.exitCode = 1;
  }
  writeLog('[AT4] EXIT code=' + (process.exitCode||0));
}

run();
