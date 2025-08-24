// AT3: Center wall glide test
// Goal: Brick pushed down onto center wall (y=0) then slides sideways without penetrating below line.
// Pass criteria:
//  - No frame where top < -PEN_TOL (penetration beyond tolerance)
//  - overshootCount == 0 (no penetration at all ideally)
//  - No NaN positions
//  - maxPenWall <= PEN_TOL

import { World } from '../src/physics/world.js';
import { createBrick } from '../src/interaction/mouse.js';
import fs from 'fs';
import { setPenetrationAlarm, configurePenetrationAlarm, getPenetrationAlarmState } from '../src/physics/alarm.js';

if (typeof performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}

const CONFIG = { circleDiameter: 900, rectWidth:120, rectHeight:80, timeStep:1/60 };
const WARMUP_FRAMES = 15;
const PUSH_FRAMES = 30;
const RELAX_FRAMES = 50;
const PEN_TOL = 0.5; // mm tolerance vs wall

function writeLog(msg){
  try { fs.mkdirSync('tests/logs', { recursive: true }); fs.appendFileSync('tests/logs/at3.log', msg+'\n','utf8'); } catch(e){}
}

function run(){
  writeLog('[AT3] START');
  try {
    const world = new World(CONFIG);
  world.setCenterWall(true);
  setPenetrationAlarm(null); // warm-up disabled alarm
  world.solver.iterations = 40; // more iterations for wall stabilitet

  // Spawn brick above wall (negative y). For above: bottom <=0 => pos.y <= -hh
    const startY = - (CONFIG.rectHeight/2) - 10; // 10 units above wall
    const brick = createBrick(-200, startY, CONFIG.rectWidth, CONFIG.rectHeight);
    world.add(brick);

    // Warm-up (no push yet) to let any initial containment settle
    for (let f=0; f<WARMUP_FRAMES; f++){
      world.step(world.lastTime + 1000/60);
      if (f===WARMUP_FRAMES-1) writeLog('[AT3] WARMUP_DONE');
    }
    // Arm alarm with hysteresis after warm-up
    configurePenetrationAlarm({ threshold: PEN_TOL * 2, consecutive: 2 });
    writeLog('[AT3] ALARM_ARMED thr=' + (PEN_TOL*2));

    let maxPenWall = 0; // penetration depth below y=0
    let overshootCount = 0;

    // Push phase: move down (increase y) and sideways
    for (let f=0; f<PUSH_FRAMES; f++){
      brick.pos.y += 1.2; // mild downward
      brick.pos.x += 2.5; // sideways glide
      world.step(world.lastTime + 1000/60);
        const top = brick.pos.y - brick.hh; // if top < 0 part of brick above line; penetration region thickness = min(-top, bottom)
      const bottom = brick.pos.y + brick.hh;
        if (top < 0 && bottom > 0){
          const pen = Math.min(-top, bottom); // actual overlap thickness
        if (pen > maxPenWall) maxPenWall = pen;
          if (pen > PEN_TOL) overshootCount++;
      }
    }
    // Relax phase
    for (let f=0; f<RELAX_FRAMES; f++){
      world.step(world.lastTime + 1000/60);
      const top = brick.pos.y - brick.hh;
      const bottom = brick.pos.y + brick.hh;
        if (top < 0 && bottom > 0){
          const pen = Math.min(-top, bottom);
        if (pen > maxPenWall) maxPenWall = pen;
          if (pen > PEN_TOL) overshootCount++;
      }
    }

    const anyNaN = Number.isNaN(brick.pos.x) || Number.isNaN(brick.pos.y);
    const pass = !anyNaN && maxPenWall <= PEN_TOL && overshootCount === 0;
  const alarmState = getPenetrationAlarmState();
  const line = `[AT3] PASS=${pass} maxPenWall=${maxPenWall.toFixed(3)} tol=${PEN_TOL} overshootCount=${overshootCount} NaN=${anyNaN} alarmThr=${alarmState.threshold} alarmConsReq=${alarmState.consecutiveRequired}`;
    console.log(line);
    writeLog(line);
    if(!pass) process.exitCode = 1;
  } catch(err){
    writeLog('[AT3] ERROR ' + (err && err.stack || err));
    process.exitCode = 1;
  }
  writeLog('[AT3] EXIT code=' + (process.exitCode||0));
}

run();
