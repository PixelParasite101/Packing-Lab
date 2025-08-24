// Simple headless harness for early acceptance tests
import { World } from '../src/physics/world.js';
import { createBrick } from '../src/interaction/mouse.js';

const CONFIG = { timeStep: 1/60, rectWidth:120, rectHeight:80, circleDiameter:700 };

function spawnLine(world, n){
  const bricks=[];
  for (let i=0;i<n;i++){
    const b = createBrick(-300 + i*125, 0, 120,80); // spaced to collide when pushed
    bricks.push(b);
    world.add(b);
  }
  return bricks;
}

function stepWorld(world, frames){
  const start = performance.now();
  for (let i=0;i<frames;i++){
    // simulate fixed-time calling pattern
    world.step(world.lastTime + 1000/60);
  }
  const totalMs = performance.now() - start;
  return { totalMs, avgMs: totalMs/frames };
}

function maxOverlap(world){
  let maxPen = 0;
  for (let i=0;i<world.entities.length;i++){
    for (let j=i+1;j<world.entities.length;j++){
      const a=world.entities[i], b=world.entities[j];
      if (Math.abs(a.pos.x - b.pos.x) < a.hw + b.hw && Math.abs(a.pos.y - b.pos.y) < a.hh + b.hh){
        const dx = (a.hw + b.hw) - Math.abs(a.pos.x - b.pos.x);
        const dy = (a.hh + b.hh) - Math.abs(a.pos.y - b.pos.y);
        maxPen = Math.max(maxPen, Math.min(dx,dy));
      }
    }
  }
  return maxPen;
}

// Test: push chain
function testPushChain(){
  const world = new World(CONFIG);
  const line = spawnLine(world, 10);
  // Apply a crude push: shift first brick forward per frame
  for (let f=0; f<30; f++){
    line[0].pos.x += 5; // move into others
    world.step(world.lastTime + 1000/60);
  }
  const penetration = maxOverlap(world);
  return { penetration, metrics: world.metrics };
}

function main(){
  const { penetration, metrics } = testPushChain();
  console.log('[AT2 PushChain] max penetration =', penetration.toFixed(3),'mm');
  console.log('Timings ms:', { broadphase: metrics.broadphaseMs.toFixed(3), narrow: metrics.narrowphaseMs.toFixed(3), solver: metrics.solverMs.toFixed(3) });
}

main();
