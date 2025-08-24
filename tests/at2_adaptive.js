// AT2A: Adaptive push chain test
// Verifies: (a) functional criteria of AT2 pass (maxPen <= tolerance, no NaN)
//           (b) adaptive iterations escalates at least once (maxIterationsUsed > baseIter)
//           (c) no anomalous penetration (preMaxPen never > clamp)

import { World } from '../src/physics/world.js';
import { adaptiveConfig } from '../src/physics/adaptiveConfig.js';
import { createBrick } from '../src/interaction/mouse.js';
import fs from 'fs';
import { setPenetrationAlarm } from '../src/physics/alarm.js';

if (typeof performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}

const CONFIG = { circleDiameter: 3000, rectWidth:120, rectHeight:80, timeStep:1/60 };
const LINE_COUNT = 10;
const WARMUP_FRAMES = 10;
const PUSH_FRAMES = 30;
const RELAX_FRAMES = 30;
const PEN_TOL = 0.50;

let _logInit = false;
function writeLog(msg){
  try { fs.mkdirSync('tests/logs', { recursive:true });
    if(!_logInit){ fs.writeFileSync('tests/logs/at2_adaptive.log', msg+'\n','utf8'); _logInit=true; }
    else fs.appendFileSync('tests/logs/at2_adaptive.log', msg+'\n','utf8');
  } catch(e){}
}

function spawnLine(world){
  const bricks=[];
  const spacing = CONFIG.rectWidth + 2;
  for (let i=0;i<LINE_COUNT;i++){
    const x = - (LINE_COUNT/2)*spacing + i*spacing;
    const b = createBrick(x,0, CONFIG.rectWidth, CONFIG.rectHeight);
    world.add(b); bricks.push(b);
  }
  return bricks;
}

function maxOverlap(world){
  let maxPen = 0; const ents = world.entities;
  for (let i=0;i<ents.length;i++){
    for (let j=i+1;j<ents.length;j++){
      const a=ents[i], b=ents[j];
      const dxAbs = Math.abs(a.pos.x - b.pos.x);
      const dyAbs = Math.abs(a.pos.y - b.pos.y);
      if (dxAbs < a.hw + b.hw && dyAbs < a.hh + b.hh){
        const dx = (a.hw + b.hw) - dxAbs;
        const dy = (a.hh + b.hh) - dyAbs;
        const pen = Math.min(dx,dy);
        if (pen > maxPen) maxPen = pen;
      }
    }
  }
  return maxPen;
}

function run(){
  writeLog('[AT2A] START');
  try {
    setPenetrationAlarm(null); // warm-up without alarm first
    const world = new World(CONFIG);
    const chain = spawnLine(world);
    writeLog('[AT2A] SPAWN_DONE firstId=' + chain[0].id + ' lastId=' + chain[chain.length-1].id);

    // Warm-up frames (no push, no adaptive yet) to settle any minor containment
    for (let f=0; f<WARMUP_FRAMES; f++){
      world.step(world.lastTime + 1000/60);
    }

    // Enable adaptive
    world.enableAdaptiveIterations();
    writeLog('[AT2A] ADAPTIVE_ENABLED baseIter=' + adaptiveConfig.baseIter);

    const iterChanges = [];
    let lastIter = world.solver.iterations;

    // Push phase
    for (let f=0; f<PUSH_FRAMES; f++){
      chain[0].pos.x += 2.5;
      world.step(world.lastTime + 1000/60);
      if (world.solver.iterations !== lastIter){
        iterChanges.push({ frame:`push-${f}`, from:lastIter, to:world.solver.iterations });
        writeLog(`[AT2A] ITER_CHANGE frame=push-${f} ${lastIter}->${world.solver.iterations} prePen=${world.metrics.preMaxPenetration.toFixed(3)} cc=${world.metrics.contactCount}`);
        lastIter = world.solver.iterations;
      }
    }

    // Arm alarm after push to catch unexpected large penetrations during relax
    setPenetrationAlarm(PEN_TOL * 2);

    // Relax phase
    for (let f=0; f<RELAX_FRAMES; f++){
      world.step(world.lastTime + 1000/60);
      if (world.solver.iterations !== lastIter){
        iterChanges.push({ frame:`relax-${f}`, from:lastIter, to:world.solver.iterations });
        writeLog(`[AT2A] ITER_CHANGE frame=relax-${f} ${lastIter}->${world.solver.iterations} prePen=${world.metrics.preMaxPenetration.toFixed(3)} cc=${world.metrics.contactCount}`);
        lastIter = world.solver.iterations;
      }
    }

    const pen = maxOverlap(world);
    const anyNaN = world.entities.some(e=>Number.isNaN(e.pos.x)||Number.isNaN(e.pos.y));
    const escalated = iterChanges.some(c=> c.to > adaptiveConfig.baseIter);
    const pass = pen <= PEN_TOL && !anyNaN && escalated;
    const line = `[AT2A] PASS=${pass} maxPen=${pen.toFixed(3)} tol=${PEN_TOL} NaN=${anyNaN} escalated=${escalated} iterStart=${adaptiveConfig.baseIter} iterEnd=${world.solver.iterations} maxIterUsed=${Math.max(adaptiveConfig.baseIter, ...iterChanges.map(c=>c.to))}`;
    writeLog(line);
    console.log(line);
    if(!pass) process.exitCode = 1;
  } catch(err){
    writeLog('[AT2A] ERROR ' + (err && err.stack || err));
    process.exitCode = 1;
  }
  writeLog('[AT2A] EXIT code=' + (process.exitCode||0));
}

run();
