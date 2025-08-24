// 4.2a Mouse spring overshoot clamp & critical damping test
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';
_resetBrickIdsForTest();
const w = new World({ circleDiameter:1200, rectWidth:120, rectHeight:80, timeStep:1/60 });
w.enableMouseSpringConstraint({ stiffness:400, damping:0.12, maxFrameMove:220, criticalRadius:40 });
const b = createBrick(0,0,120,80); w.add(b);
// Stage 1: approach initial far target
w.attachMouseSpring(b, 150, 0);
for (let i=0;i<60;i++){ w.tick(1/60); }
const nearTarget = Math.abs(150 - b.pos.x) < 6;
// Stage 2: reverse target (smaller) to test clamp against overshoot
w.attachMouseSpring(b, 120, 0);
let overshoot=false; let minX=Infinity;
for (let i=0;i<12;i++){ w.tick(1/60); minX = Math.min(minX, b.pos.x); }
overshoot = minX < 118; // allow <=2px undershoot max
const before = b.pos.x;
// Stage 3: slight forward nudge
w.attachMouseSpring(b, 130, 0);
w.tick(1/60);
const forwardOk = b.pos.x >= before - 0.01 && b.pos.x <= 131;
const pass = nearTarget && !overshoot && forwardOk;
console.log(`[AT] Mouse Spring Refine PASS=${pass} nearTarget=${nearTarget} overshoot=${overshoot} forwardOk=${forwardOk} finalX=${b.pos.x.toFixed(2)}`);
if (!pass) process.exitCode = 1;
