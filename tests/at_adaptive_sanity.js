// Adaptive iterations sanity check (not a formal AT number yet)
// Spawns two overlapping bricks to trigger escalation, then separates them to allow downscale.
import { World } from '../src/physics/world.js';
import { createBrick } from '../src/interaction/mouse.js';
import fs from 'fs';

const CONFIG = { circleDiameter: 1200, rectWidth:120, rectHeight:80, timeStep:1/60 };

function log(msg){ console.log('[ADAPT]', msg); try { fs.appendFileSync('tests/logs/adaptive.log', msg+'\n'); } catch(_){} }

const world = new World(CONFIG);
world.enableAdaptiveIterations();
world.solver.iterations = world.adaptive.cfg.baseIter; // ensure base

// Mild overlapping spawn (controlled penetration)
const mildOffset = (CONFIG.rectWidth/2) - 10; // e.g. 60-10=50 -> ~20 overlap along x-width
const a = createBrick(-mildOffset,0, CONFIG.rectWidth, CONFIG.rectHeight);
const b = createBrick(mildOffset,0, CONFIG.rectWidth, CONFIG.rectHeight);
world.add(a); world.add(b);

// Phase 1: escalate
for (let f=0; f<40; f++){
  world.step(world.lastTime + 1000/60);
  if (f % 5 ===0) log(`f=${f} prePen=${world.metrics.preMaxPenetration.toFixed(3)} it=${world.solver.iterations} contacts=${world.metrics.contactCount}`);
}

// Separate to allow downscale
b.pos.x += 400; a.pos.x -= 400;

for (let f=0; f<120; f++){
  world.step(world.lastTime + 1000/60);
  if (f % 20 ===0) log(`relax f=${f} prePen=${world.metrics.preMaxPenetration.toFixed(3)} it=${world.solver.iterations} contacts=${world.metrics.contactCount}`);
}

log('DONE iterations=' + world.solver.iterations);
