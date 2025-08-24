import { GameState } from './game/state.js';
import { World } from './physics/world.js';
import { MouseController } from './interaction/mouse.js';
import { Metrics } from './game/metrics.js';
import { configurePenetrationAlarm, setPenetrationAlarm, getPenetrationAlarmState } from './physics/alarm.js';
import { GoalEvaluator } from './game/goals.js';

// Constants (Single Responsibility: config only)
export const CONFIG = {
  circleDiameter: 700,
  rectWidth: 120,
  rectHeight: 80,
  timeStep: 1/60,
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const world = new World(CONFIG);
const state = new GameState(world, CONFIG);
const metrics = new Metrics(state, world);
const mouse = new MouseController(canvas, state, world);

// HUD (heads-up display) bindings
const diameterInput = document.getElementById('diameterInput');
const diameterLabel = document.getElementById('diameterLabel');
const modeBtn = document.getElementById('modeBtn');
const pieceCountEl = document.getElementById('pieceCount');
const coverageEl = document.getElementById('coverage');
const fpsEl = document.getElementById('fps');
const bmsEl = document.getElementById('bms');
const nmsEl = document.getElementById('nms');
const smsEl = document.getElementById('sms');
const pairInfoEl = document.getElementById('pairInfo');
const devLogToggle = document.getElementById('devLogToggle');
const gridToggle = document.getElementById('gridToggle');
const gridSizeInput = document.getElementById('gridSize');
// Nudge controls (added in HUD if present dynamically)
let nudgeToggle = document.getElementById('nudgeToggle');
let nudgeDistInput = document.getElementById('nudgeDist');
// Auto-pack controls (7.4)
const autoPackToggle = document.getElementById('autoPackToggle');
const autoPackStep = document.getElementById('autoPackStep');
const autoPackIters = document.getElementById('autoPackIters');
const penAlarmEnable = document.getElementById('penAlarmEnable');
const penAlarmThresh = document.getElementById('penAlarmThresh');
const penAlarmConsec = document.getElementById('penAlarmConsec');
const penAlarmStatus = document.getElementById('penAlarmStatus');
const toggleWall = document.getElementById('toggleWall');
const toggleInner = document.getElementById('toggleInner');
// Spring controls
const springEnable = document.getElementById('springEnable');
const springStiff = document.getElementById('springStiff');
const springDamp = document.getElementById('springDamp');
const springAdaptive = document.getElementById('springAdaptive');
const springMinF = document.getElementById('springMinF');
const springCurve = document.getElementById('springCurve');
const springMassScale = document.getElementById('springMassScale');
const springRefMass = document.getElementById('springRefMass');
const springMassPower = document.getElementById('springMassPower');
const springMassInfo = document.getElementById('springMassInfo');
const goalStatus = document.getElementById('goalStatus');
// Advanced friction controls
const advFricToggle = document.getElementById('advFricToggle');
const advFricMuX = document.getElementById('advFricMuX');
const advFricMuY = document.getElementById('advFricMuY');
const advFricSlipRef = document.getElementById('advFricSlipRef');
const advFricDynamic = document.getElementById('advFricDynamic');

// Enable spring by default
world.enableMouseSpringConstraint({});

const goals = new GoalEvaluator(state, world);

function applySpringSettings(){
  if (!springEnable || !springStiff || !springDamp || !springAdaptive ||
      !springMinF || !springCurve || !springMassScale || !springRefMass ||
      !springMassPower || !springMassInfo){
    console.warn('Spring HUD controls missing; skipping spring setup');
    return;
  }
  if (!springEnable.checked){
    world.disableMouseSpringConstraint();
    springMassInfo.textContent = '';
    return;
  }
  world.enableMouseSpringConstraint({
    stiffness: Number(springStiff.value),
    damping: Number(springDamp.value),
    adaptive: springAdaptive.checked,
    stiffnessMinFactor: Number(springMinF.value),
    stiffnessCurve: springCurve.value,
    massScaling: springMassScale.checked,
    referenceMass: Number(springRefMass.value) || 1,
    massPower: Number(springMassPower.value) || 1
  });
  if (springMassScale.checked){
    springMassInfo.textContent = `MassScale ON ref=${springRefMass.value} pow=${springMassPower.value}`;
  } else {
    springMassInfo.textContent = '';
  }
}
if (springEnable && springStiff && springDamp && springAdaptive &&
    springMinF && springCurve && springMassScale && springRefMass &&
    springMassPower && springMassInfo){
  springEnable.addEventListener('change', applySpringSettings);
  springStiff.addEventListener('input', applySpringSettings);
  springDamp.addEventListener('input', applySpringSettings);
  springAdaptive.addEventListener('change', applySpringSettings);
  springMinF.addEventListener('input', applySpringSettings);
  springCurve.addEventListener('change', applySpringSettings);
  springMassScale.addEventListener('change', applySpringSettings);
  springRefMass.addEventListener('input', applySpringSettings);
  springMassPower.addEventListener('input', applySpringSettings);
  applySpringSettings();
} else {
  console.warn('Spring controls missing; mouse spring disabled');
}

devLogToggle.addEventListener('change', ()=>{
  if (devLogToggle.checked){
    world.enableDevLogging({ categories:{ adaptive:true, world:true, solver:true } });
  } else {
    world.disableDevLogging();
  }
});

function applyPenAlarm(){
  if (!penAlarmEnable || !penAlarmThresh || !penAlarmConsec || !penAlarmStatus){
    console.warn('Penetration alarm controls missing; skipping');
    return;
  }
  if (!penAlarmEnable.checked){
    setPenetrationAlarm(null);
    penAlarmStatus.textContent = '';
    return;
  }
  const thr = Number(penAlarmThresh.value);
  const consec = Math.max(1, Number(penAlarmConsec.value)|0);
  configurePenetrationAlarm({ threshold: thr, consecutive: consec });
}
if (penAlarmEnable && penAlarmThresh && penAlarmConsec){
  penAlarmEnable.addEventListener('change', applyPenAlarm);
  penAlarmThresh.addEventListener('input', applyPenAlarm);
  penAlarmConsec.addEventListener('input', applyPenAlarm);
  applyPenAlarm();
} else {
  console.warn('Penetration alarm HUD elements not found');
}
function applyAdvancedFriction(){
  if (!advFricToggle) return;
  if (!advFricToggle.checked){ world.disableAdvancedFriction(); return; }
  world.enableAdvancedFriction({
    anisotropic:true,
    muBase:0.5,
    muX:Number(advFricMuX.value)||0.6,
    muY:Number(advFricMuY.value)||0.4,
    dynamic:advFricDynamic.checked,
    slipRef:Number(advFricSlipRef.value)||60,
    dynamicReduction:0.5
  });
}
if (advFricToggle){
  advFricToggle.addEventListener('change', applyAdvancedFriction);
  advFricMuX.addEventListener('input', applyAdvancedFriction);
  advFricMuY.addEventListener('input', applyAdvancedFriction);
  advFricSlipRef.addEventListener('input', applyAdvancedFriction);
  advFricDynamic.addEventListener('change', applyAdvancedFriction);
}
applyAdvancedFriction();

// Grid snapping controls (7.1)
gridToggle.addEventListener('change', ()=>{ state.setGridEnabled(gridToggle.checked); });
gridSizeInput.addEventListener('input', ()=>{ state.setGridSize(Number(gridSizeInput.value)||40); });

// Lazy bind in case elements exist
if (nudgeToggle){
  nudgeToggle.addEventListener('change', ()=> state.setNudgeEnabled(nudgeToggle.checked));
}
if (nudgeDistInput){
  nudgeDistInput.addEventListener('input', ()=> state.setNudgeDistance(Number(nudgeDistInput.value)||0));
}
// Auto-pack bindings
if (autoPackToggle){
  autoPackToggle.addEventListener('change', ()=> state.setAutoPackEnabled(autoPackToggle.checked));
}
if (autoPackStep){
  autoPackStep.addEventListener('input', ()=> state.setAutoPackStep(Number(autoPackStep.value)||1));
}
if (autoPackIters){
  autoPackIters.addEventListener('input', ()=> state.setAutoPackMaxIters(Number(autoPackIters.value)||12));
}

modeBtn.addEventListener('click', () => {
  state.toggleMode();
  modeBtn.textContent = state.mode === 'place' ? 'Skift til Edit' : 'Skift til Place';
});

diameterInput.addEventListener('input', e => {
  const d = Number(e.target.value);
  diameterLabel.textContent = d;
  state.setCircleDiameter(d);
});

toggleWall.addEventListener('change', e => state.toggleWall(e.target.checked));
toggleInner.addEventListener('change', e => state.toggleInner(e.target.checked));

// Sync arena flags to world after any toggle
function syncArena(){ state.applyArenaFlags(); }
toggleWall.addEventListener('change', syncArena);
toggleInner.addEventListener('change', syncArena);
diameterInput.addEventListener('change', syncArena);

// Undo / Redo key handling
window.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key.toLowerCase() === 'z') { state.undo(); }
  if (e.ctrlKey && e.key.toLowerCase() === 'y') { state.redo(); }
  if (e.key === 'Delete' || e.key === 'Backspace') { state.deleteSelected(); }
  if (e.key.toLowerCase() === 'r') { state.rotateSelected(); }
  if (e.key.toLowerCase() === 'm') { state.toggleMode(); modeBtn.textContent = state.mode === 'place' ? 'Skift til Edit' : 'Skift til Place'; }
});

let lastFpsTime = performance.now();
let frames = 0;

function loop(time) {
  requestAnimationFrame(loop);

  // Fixed-step accumulator
  world.step(time);
  goals.update();

  draw();
  frames++;
  if (time - lastFpsTime >= 1000) {
    fpsEl.textContent = frames.toString();
    frames = 0;
    lastFpsTime = time;
    pieceCountEl.textContent = state.bricks.length.toString();
    coverageEl.textContent = metrics.coveragePercent().toFixed(1) + '%';
    // Performance metrics
    bmsEl.textContent = world.metrics.broadphaseMs.toFixed(2);
    nmsEl.textContent = world.metrics.narrowphaseMs.toFixed(2);
    smsEl.textContent = world.metrics.solverMs.toFixed(2);
    // Pair reduction: naive theoretical pairs vs actual
    const n = state.bricks.length;
    const theoretical = n*(n-1)/2;
    const actual = world.metrics.broadphasePairs || 0;
    let reduction = 0;
    if (theoretical>0 && actual>0 && actual <= theoretical){
      reduction = (1 - actual/theoretical)*100;
    }
    pairInfoEl.textContent = actual + (theoretical>0? ` (${reduction.toFixed(1)}%)`:'');
    // Penetration alarm status
    if (penAlarmEnable.checked){
      const st = getPenetrationAlarmState();
      penAlarmStatus.textContent = `pre=${world.metrics.preMaxPenetration.toFixed(3)} run=${st.currentRun}/${st.consecutiveRequired}`;
    }
    const snap = goals.snapshot();
    const tl = t=> t<0?'-':(t===2?'G': t===1?'S':'B');
    goalStatus.textContent = `C:${tl(snap.coverage.tier)} P:${tl(snap.stability.tier)} M:${tl(snap.moves.tier)} -> ${tl(snap.overall.tier)}`;
  }
}

function draw() {
  ctx.clearRect(0,0,canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width/2, canvas.height/2);

  // Outer circle
  ctx.strokeStyle = '#555';
  ctx.beginPath();
  ctx.arc(0,0, state.circleRadius, 0, Math.PI*2);
  ctx.stroke();

  if (state.innerHole) {
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.arc(0,0, state.innerHoleRadius, 0, Math.PI*2);
    ctx.stroke();
  }

  if (state.centerWall) {
    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(-state.circleRadius,0);
    ctx.lineTo(state.circleRadius,0);
    ctx.stroke();
  }

  // Bricks
  for (const b of state.bricks) {
    ctx.save();
    ctx.translate(b.pos.x, b.pos.y);
    if (b.rot % 180 !== 0) ctx.rotate(Math.PI/2);
    ctx.fillStyle = b === state.selected ? '#f1c40f' : '#3498db';
    ctx.fillRect(-b.hw, -b.hh, b.w, b.h);
    ctx.restore();
  }

  // Ghost
  if (state.mode === 'place' && state.ghost) {
    const g = state.ghost;
    ctx.save();
    ctx.translate(g.pos.x, g.pos.y);
    if (g.rot % 180 !== 0) ctx.rotate(Math.PI/2);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = g.valid ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(-g.hw, -g.hh, g.w, g.h);
    ctx.restore();
  }
  ctx.restore();
}

requestAnimationFrame(loop);
