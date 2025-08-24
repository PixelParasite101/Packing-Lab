import { Broadphase } from './broadphase.js';
import { GridBroadphase } from './broadphase_grid.js';
import { Narrowphase } from './narrowphase.js';
import { Solver } from './solver.js';
import { checkPenetrationAlarm } from './alarm.js';
import { adaptiveConfig } from './adaptiveConfig.js';

// Ensure performance.now exists in Node environments lacking it
const __now = (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => Date.now();

export class World {
  constructor(config) {
    this.config = config;
    this.entities = []; // rectangles only for now
    this.contacts = [];
    this.accumulator = 0;
  this.lastTime = __now();
  this.broadphase = new Broadphase();
  this._broadphaseMode = 'naive'; // or 'grid'
    this.narrowphase = new Narrowphase();
    this.solver = new Solver();
  this.substeps = 2; // base substeps
  this.metrics = { broadphaseMs:0, narrowphaseMs:0, solverMs:0, preMaxPenetration:0, postMaxPenetration:0, contactCount:0 };
  this.arena = { outerRadius: this.config.circleDiameter? this.config.circleDiameter/2 : 350, innerHoleRadius: null };
  this.forbiddenPolys = [];
  this.centerWall = false; // horizontal line y=0 when true
  this._envStatic = { id:0, invMass:0, pos:{x:0,y:0} }; // static environment placeholder
  // Adaptive iterations state (disabled by default)
  this.adaptive = { enabled:false, cfg:adaptiveConfig, lowCounter:0, coolDown:0 };
    this.adaptiveSubsteps = {
      enabled:false,
      base:2,
      max:4,
      current:2,
      contactDensityHigh:1.5,   // contacts per entity to escalate
      contactDensityLow:0.6,    // density below which we consider downscale
      consecutiveLowNeeded:10,
      coolDownFrames:8,
      penetrationBoostThreshold:20, // if preMaxPenetration > this, attempt escalation
      dragDisplacementHigh:2.0, // px per frame (max body delta) to escalate
      trackSubstepSequence:false,
      lowCounter:0,
      coolDown:0
    };
  this.frame = 0; // counts ticks (not rendered frames) for adaptive overrides
  // Mouse spring-damper constraint (4.2 + 4.2a overshoot clamp)
  this.mouseSpring = { enabled:false, active:false, body:null, target:{x:0,y:0}, stiffness:200, damping:0.15, maxFrameMove:120, criticalRadius:20,
    adaptive:true, adaptiveRadius:120, stiffnessMinFactor:0.25, stiffnessCurve:'quad', massScaling:false, referenceMass:1, massPower:1 };
    // Determinism metrics extension
    this._detMetricsEnabled = false;
    this._detMetrics = { totalIterations:0 };
  this._detDiagEnabled = false; // diagnostics hash flag
  // Dev logging instrumentation (5.2)
  this._devLog = { enabled:false, categories:{ adaptive:true, solver:true, world:true }, buffer:[], max:200 };
  // Sleeping system state
  this.sleeping = { enabled:false, params:{
    minLinearVel:0.05, minCorrection:0.02, framesRequired:30,
    wakeLinearVel:0.08, wakeCorrection:0.04, wakeContactPen:0.20,
    maxSleepingRatio:0.85
  }};
  }

  enableSpatialHash(opts={}){
    if (this._broadphaseMode !== 'grid'){
      this.broadphase = new GridBroadphase(opts);
      this._broadphaseMode = 'grid';
    }
  }
  disableSpatialHash(){
    if (this._broadphaseMode !== 'naive'){
      this.broadphase = new Broadphase();
      this._broadphaseMode = 'naive';
    }
  }

  enableDeterminismMetrics(){
    this._detMetricsEnabled = true;
    this._detMetrics = { totalIterations:0 };
  }
  disableDeterminismMetrics(){ this._detMetricsEnabled = false; }
  enableDeterminismDiagnostics(){ this._detDiagEnabled = true; }
  disableDeterminismDiagnostics(){ this._detDiagEnabled = false; }
  enableAdvancedFriction(opts={}){ if (this.solver && this.solver.enableAdvancedFriction) this.solver.enableAdvancedFriction(opts); }
  disableAdvancedFriction(){ if (this.solver && this.solver.disableAdvancedFriction) this.solver.disableAdvancedFriction(); }
  enableDevLogging(opts={}){ this._devLog.enabled=true; if(opts.categories){ this._devLog.categories = { ...this._devLog.categories, ...opts.categories }; } }
  disableDevLogging(){ this._devLog.enabled=false; }
  devLog(cat, msg){
    if (!this._devLog.enabled) return;
    if (cat && this._devLog.categories && this._devLog.categories[cat] === false) return;
    const line = `[${cat||'log'}] ${msg}`;
    this._devLog.buffer.push(line);
    if (this._devLog.buffer.length > this._devLog.max){ this._devLog.buffer.shift(); }
    // still mirror to console for now
    if (console && console.info) console.info(line);
  }

  enableSleeping(overrides={}){ this.sleeping.enabled = true; this.sleeping.params = { ...this.sleeping.params, ...overrides }; }
  disableSleeping(){ this.sleeping.enabled = false; }
  wakeBody(body){ if (!this.sleeping.enabled) return; body.asleep=false; body.sleepFrames=0; }

  enableMouseSpringConstraint(opts={}){
    this.mouseSpring.enabled = true;
    this.mouseSpring = { ...this.mouseSpring, ...opts, enabled:true };
    if (!('maxFrameMove' in this.mouseSpring)) this.mouseSpring.maxFrameMove = 120;
  if (!('criticalRadius' in this.mouseSpring)) this.mouseSpring.criticalRadius = 20;
  if (!('adaptive' in this.mouseSpring)) this.mouseSpring.adaptive = true;
  if (!('adaptiveRadius' in this.mouseSpring)) this.mouseSpring.adaptiveRadius = 120;
  if (!('stiffnessMinFactor' in this.mouseSpring)) this.mouseSpring.stiffnessMinFactor = 0.25;
  if (!('stiffnessCurve' in this.mouseSpring)) this.mouseSpring.stiffnessCurve = 'quad';
  if (!this.metrics) this.metrics = {};
  this.metrics.mouseSpringDisplacement = this.metrics.mouseSpringDisplacement || 0;
  if (!('massScaling' in this.mouseSpring)) this.mouseSpring.massScaling = false;
  if (!('referenceMass' in this.mouseSpring)) this.mouseSpring.referenceMass = 1;
  if (!('massPower' in this.mouseSpring)) this.mouseSpring.massPower = 1;
  }
  disableMouseSpringConstraint(){ this.mouseSpring.enabled = false; this.mouseSpring.active=false; this.mouseSpring.body=null; }
  attachMouseSpring(body, targetX, targetY){
    if (!this.mouseSpring.enabled) return;
    this.mouseSpring.active = true; this.mouseSpring.body = body; this.mouseSpring.target.x = targetX; this.mouseSpring.target.y = targetY;
  }
  moveMouseSpring(targetX, targetY){ if (this.mouseSpring.active){ this.mouseSpring.target.x = targetX; this.mouseSpring.target.y = targetY; } }
  releaseMouseSpring(){ if (this.mouseSpring.active){ this.mouseSpring.active=false; this.mouseSpring.body=null; } }

  add(e) { this.entities.push(e); }
  remove(e) { const i = this.entities.indexOf(e); if (i>=0) this.entities.splice(i,1); }

  setArena(outerRadius, innerHoleRadius=null){
    const prev = this.arena.outerRadius;
    this.arena.outerRadius = outerRadius;
    this.arena.innerHoleRadius = innerHoleRadius;
    if (outerRadius != null && prev != null && outerRadius < prev){
      this._runContainmentShrinkPass(prev, outerRadius);
    }
  }

  setCenterWall(active){ this.centerWall = !!active; }

  enableAdaptiveIterations(overrides={}){
    // Merge shallow overrides into a fresh config object
  this.adaptive.cfg = { ...adaptiveConfig, ...overrides };
    this.adaptive.enabled = true;
    this.adaptive.lowCounter = 0;
    this.adaptive.coolDown = 0;
  // Determinism tracking of iteration changes (for hash tests)
  this._trackIterSeq = !!overrides.trackIterationSequence;
  if (this._trackIterSeq) this._adaptiveIterLog = [];
    // Initialize solver iterations to base if not already custom set
    if (!overrides.preserveExistingIterations){
      this.solver.iterations = this.adaptive.cfg.baseIter;
    }
  this.adaptive._frozenIterationValue = undefined;
  this._iterSeqCounter = 0;
  }

  _runContainmentShrinkPass(prevR, newR){
    if (!this.metrics) this.metrics = {};
  let repositionCount = 0;
  let oobCount = 0;
    // Sort entities by id deterministically without mutating original order used elsewhere
    const ordered = [...this.entities].sort((a,b)=>a.id-b.id);
  for (const body of ordered){
      if (!body || body.invMass===0) continue; // skip statics/environment
      // Check geometry impossible case (diagonal/2 > newR)
      const halfDiag = Math.hypot(body.hw, body.hh);
      if (halfDiag > newR){
        body.outOfBounds = true;
        oobCount++;
        continue;
      }
      // Iteratively compute overflow and move inward until within radius (safety max 5 iterations)
      let iter=0; let adjusted=false;
      while (iter < 5){
        const corners = [
          {x: body.pos.x - body.hw, y: body.pos.y - body.hh},
          {x: body.pos.x + body.hw, y: body.pos.y - body.hh},
          {x: body.pos.x + body.hw, y: body.pos.y + body.hh},
          {x: body.pos.x - body.hw, y: body.pos.y + body.hh}
        ];
        let maxOverflow = 0;
        for (const c of corners){
          const dist = Math.hypot(c.x, c.y);
            const overflow = dist - newR;
            if (overflow > maxOverflow) maxOverflow = overflow;
        }
        if (maxOverflow <= 0.0005) break; // within tolerance
        const len = Math.hypot(body.pos.x, body.pos.y);
        let nx, ny; if (len < 1e-6){ nx=1; ny=0; } else { nx = body.pos.x/len; ny = body.pos.y/len; }
        body.pos.x -= nx * maxOverflow;
        body.pos.y -= ny * maxOverflow;
        adjusted = true;
        iter++;
      }
      if (adjusted){ repositionCount++; body.outOfBounds = false; }
    }
    this.metrics.containmentRepositions = (this.metrics.containmentRepositions||0) + repositionCount;
    if (oobCount){ this.metrics.outOfBoundsCount = (this.metrics.outOfBoundsCount||0) + oobCount; }
  }

  disableAdaptiveIterations(){ this.adaptive.enabled = false; }

  enableAdaptiveSubsteps(overrides={}){
    this.adaptiveSubsteps = { ...this.adaptiveSubsteps, ...overrides, enabled:true };
    if (!this.adaptiveSubsteps.current) this.adaptiveSubsteps.current = this.adaptiveSubsteps.base;
    if (overrides.trackSubstepSequence){ this._substepSeqLog = []; }
    // keep previous positions for drag displacement metric
    this._prevPositions = new Map();
  }
  disableAdaptiveSubsteps(){ this.adaptiveSubsteps.enabled = false; }

  step(time) {
    const dt = this.config.timeStep;
    const frameDt = (time - this.lastTime)/1000;
    this.lastTime = time;
    this.accumulator += frameDt;

    // Cap accumulation to avoid spiral of death
    if (this.accumulator > 0.25) this.accumulator = 0.25;

    while (this.accumulator >= dt) {
      // Adaptive Substeps decision (pre-tick) using metrics from prior frame
      if (this.adaptiveSubsteps.enabled){
        const cfg = this.adaptiveSubsteps;
        const entCount = this.entities.length || 1;
        const density = this.metrics.contactCount / entCount;
        const pen = this.metrics.preMaxPenetration; // from last tick
        // drag: compute max displacement since last frame
        let maxDisp = 0;
        if (this._prevPositions){
          for (const e of this.entities){
            const prev = this._prevPositions.get(e.id);
            if (prev){
              const dx = e.pos.x - prev.x; const dy = e.pos.y - prev.y;
              const d = Math.hypot(dx,dy);
              if (d > maxDisp) maxDisp = d;
            }
            this._prevPositions.set(e.id, { x: e.pos.x, y: e.pos.y });
          }
        }
        const before = cfg.current;
        // Escalation conditions
        const escalate = !cfg._frozen && ((density > cfg.contactDensityHigh) || (pen > cfg.penetrationBoostThreshold) || (maxDisp > cfg.dragDisplacementHigh));
        if (escalate) {
          if (cfg.current < cfg.max){
            cfg.current++;
            cfg.lowCounter = 0;
            cfg.coolDown = cfg.coolDownFrames;
            if (cfg.trackSubstepSequence) { if(!this._substepSeqLog) this._substepSeqLog=[]; this._substepSeqLog.push(`${this.frame}:up:${cfg.current}`); }
            if (cfg.freezeAfterFirstEscalation && !cfg._frozen){
              cfg._frozen = true; // lock current value
            }
          }
        } else {
          // Downscale logic when density & pen low
            if (!cfg._frozen){
              if (cfg.coolDown > 0) cfg.coolDown--; // decay cooldown
              if (density < cfg.contactDensityLow && pen < cfg.penetrationBoostThreshold/2){
                cfg.lowCounter++;
                if (cfg.lowCounter >= cfg.consecutiveLowNeeded && cfg.coolDown===0){
                  if (cfg.current > cfg.base){
                    cfg.current--;
                    if (cfg.trackSubstepSequence) { if(!this._substepSeqLog) this._substepSeqLog=[]; this._substepSeqLog.push(`${this.frame}:down:${cfg.current}`); }
                  }
                  cfg.lowCounter = 0;
                }
              } else {
                cfg.lowCounter = 0;
              }
            }
        }
        if (cfg.current !== before){
          this.devLog('adaptive', `Substeps ${before} -> ${cfg.current} density=${density.toFixed(2)} pen=${pen.toFixed(2)} maxDisp=${maxDisp.toFixed(2)}`);
        }
      }
      const steps = this.adaptiveSubsteps.enabled ? this.adaptiveSubsteps.current : this.substeps;
      const subDt = dt / steps;
      for (let s=0; s<steps; s++){
        this.tick(subDt);
      }
      this.accumulator -= dt;
    }
  }

  tick(dt) {
  const t0 = __now();
  this.frame++;
    // Apply mouse spring-damper before broadphase so contacts reflect post-damped position
    if (this.mouseSpring.enabled && this.mouseSpring.active && this.mouseSpring.body){
      const ms = this.mouseSpring; const b = ms.body; if (b.invMass>0){
        let dx = ms.target.x - b.pos.x; let dy = ms.target.y - b.pos.y;
        const dist = Math.hypot(dx,dy) || 0;
        let effStiff = ms.stiffness;
        if (ms.adaptive){
          // Easing based on distance ratio inside adaptiveRadius
          const r = ms.adaptiveRadius || ms.criticalRadius || 1;
          const norm = Math.min(1, dist / Math.max(1e-6, r)); // 0..1
          // Apply curve
          let eased;
          switch(ms.stiffnessCurve){
            case 'cubic': eased = norm*norm*norm; break;
            case 'sqrt': eased = Math.sqrt(norm); break;
            case 'linear': eased = norm; break;
            case 'quad':
            default: eased = norm*norm; break;
          }
          const minF = ms.stiffnessMinFactor != null ? ms.stiffnessMinFactor : 0.25;
          const factor = minF + (1 - minF) * eased; // factor in [minF,1]
          effStiff = ms.stiffness * factor;
        } else if (dist < ms.criticalRadius){
          // Legacy linear critical zone fallback
          const t = dist / Math.max(1e-6, ms.criticalRadius);
          effStiff = ms.stiffness * (0.35 + 0.65 * t);
        }
        // Effective stiffness scaling by mass if enabled (heavier => slower unless inverse)
        let effStiffMass = effStiff;
        if (ms.massScaling && b.mass != null){
          const ref = ms.referenceMass || 1;
          const ratio = ref > 0 ? (b.mass || ref) / ref : 1;
          // Apply power curve: power>0 => heavier slows (divide), power<0 => heavier speeds (multiply)
          // Interpret massPower as positive exponent applied to ratio, then divide stiffness by that factor.
          const power = ms.massPower == null ? 1 : ms.massPower;
          const scale = Math.pow(ratio, power);
          effStiffMass = effStiff / Math.max(1e-6, scale);
        }
        const k = 1 - Math.exp(-effStiffMass * dt);
        if (!b.prevPos){ b.prevPos = { x:b.pos.x, y:b.pos.y }; }
        const vx = b.pos.x - b.prevPos.x; const vy = b.pos.y - b.prevPos.y;
        let moveX = dx * k - vx * Math.min(1, Math.max(0, ms.damping)) * 0.1;
        let moveY = dy * k - vy * Math.min(1, Math.max(0, ms.damping)) * 0.1;
        const moveLen = Math.hypot(moveX, moveY);
        const maxMove = (ms.maxFrameMove||120) * dt;
        if (moveLen > maxMove){ const s = maxMove / moveLen; moveX *= s; moveY *= s; }
        const beforeDx = dx; const beforeDy = dy; const beforeDistSq = beforeDx*beforeDx + beforeDy*beforeDy;
        b.pos.x += moveX; b.pos.y += moveY;
        dx = ms.target.x - b.pos.x; dy = ms.target.y - b.pos.y;
        const afterDistSq = dx*dx + dy*dy;
        if (afterDistSq > beforeDistSq || (beforeDx*dx + beforeDy*dy) < 0){ b.pos.x = ms.target.x; b.pos.y = ms.target.y; }
        this.metrics.mouseSpringDisplacement = (this.metrics.mouseSpringDisplacement||0) + moveLen;
      }
    }
    this.broadphase.build(this.entities);
  const t1 = __now();
  const pairs = this.broadphase.queryPairs();
  this.metrics.broadphasePairs = pairs.length;
    this.contacts.length = 0;
    const MAX_CONTACT_DEPTH = 50; // mm clamp to avoid numeric explosion
    let _depthClampWarned = false;
    for (const [a,b] of pairs) {
      const c = this.narrowphase.rectRect(a,b);
      if (c) {
        if (!Number.isFinite(c.depth) || c.depth < 0) { c.depth = 0; }
  if (c.depth > MAX_CONTACT_DEPTH){ c.depth = MAX_CONTACT_DEPTH; if(!_depthClampWarned){ this.devLog('world','depth clamp applied'); _depthClampWarned=true; } }
        this.contacts.push(c);
      }
    }
    // Containment constraints (outer circle / inner hole) – per corner
    const outerR = this.arena.outerRadius;
    const innerR = this.arena.innerHoleRadius;
    if (outerR){
      for (const body of this.entities){
        // corners in local axis-aligned since only 0/90 rot; use width/height accordingly
        const corners = [
          {x: body.pos.x - body.hw, y: body.pos.y - body.hh},
          {x: body.pos.x + body.hw, y: body.pos.y - body.hh},
          {x: body.pos.x + body.hw, y: body.pos.y + body.hh},
          {x: body.pos.x - body.hw, y: body.pos.y + body.hh}
        ];
        let deepestInner = null; // track deepest corner inside inner hole
        for (const corner of corners){
          const dx = corner.x; const dy = corner.y; // center at 0,0
          const dist = Math.hypot(dx,dy) || 0.0001;
          if (dist > outerR){
            const depth = dist - outerR;
            const nx = dx / dist; const ny = dy / dist; // outward normal (solver moves inward)
            let depthClamped = depth;
            if (!Number.isFinite(depthClamped) || depthClamped < 0) depthClamped = 0;
            if (depthClamped > MAX_CONTACT_DEPTH){ depthClamped = MAX_CONTACT_DEPTH; }
            this.contacts.push({ a: body, b: this._envStatic, nx, ny, depth: depthClamped });
          } else if (innerR && dist < innerR){
            const depth = innerR - dist;
            if (!deepestInner || depth > deepestInner.depth){
              deepestInner = { depth, dx, dy, dist };
            }
          }
        }
        if (deepestInner){
          // Single strongest constraint to push outward efficiently
            const { depth, dx, dy, dist } = deepestInner;
            const nx = -dx / dist; const ny = -dy / dist; // points inward so solver moves outward
            let depthClamped = depth;
            if (!Number.isFinite(depthClamped) || depthClamped < 0) depthClamped = 0;
            if (depthClamped > MAX_CONTACT_DEPTH){ depthClamped = MAX_CONTACT_DEPTH; }
            this.contacts.push({ a: body, b: this._envStatic, nx, ny, depth: depthClamped });
        }
      }
    }
    // Center wall constraint (horizontal y=0) – pushes body outside if overlapping line
    if (this.centerWall){
      for (const body of this.entities){
        const top = body.pos.y - body.hh;
        const bottom = body.pos.y + body.hh;
        if (top < 0 && bottom > 0){
          // Choose nearest resolution: either move down by (-top) so top==0, or move up by bottom so bottom==0.
          const moveDown = -top;   // positive distance to shift +y
          const moveUp = bottom;   // positive distance to shift -y
          if (moveDown <= moveUp){
            // Need to move down: use normal (0,-1) so solver adds +depth to y
            let d = moveDown; if (!Number.isFinite(d) || d<0) d=0; if (d>MAX_CONTACT_DEPTH) d=MAX_CONTACT_DEPTH;
            this.contacts.push({ a: body, b: this._envStatic, nx:0, ny:-1, depth: d });
          } else {
            // Need to move up: use normal (0,1) so solver subtracts depth from y
            let d = moveUp; if (!Number.isFinite(d) || d<0) d=0; if (d>MAX_CONTACT_DEPTH) d=MAX_CONTACT_DEPTH;
            this.contacts.push({ a: body, b: this._envStatic, nx:0, ny:1, depth: d });
          }
        }
      }
    }
  const t2 = __now();
  // Deterministic order: sort by a.id then b.id (env static id=0 comes first)
    this.contacts.sort((c1,c2)=>{
      const a1 = c1.a.id, a2 = c2.a.id;
      if (a1 !== a2) return a1 - a2;
      const b1 = c1.b ? c1.b.id : 0; const b2 = c2.b ? c2.b.id : 0;
      if (b1 !== b2) return b1 - b2;
      return 0;
    });
  // Metrics: number of constraints (used for upcoming adaptive iteration heuristic)
  this.metrics.contactCount = this.contacts.length;
    // Pre-solve penetration (max of depths)
  this.metrics.preMaxPenetration = this.contacts.reduce((m,c)=> Math.max(m, c.depth),0);
    // Reset per-frame correction accumulator for sleeping heuristics
    if (this.sleeping.enabled){
      for (const e of this.entities){ e._lastFrameCorrection = 0; if (e.sleepFrames===undefined) e.sleepFrames=0; if (e.asleep===undefined) e.asleep=false; }
    }
  // Fail-fast alarm (tests/dev)
  checkPenetrationAlarm(this.metrics.preMaxPenetration);

    // Adaptive iterations heuristic (pre-solve) – adjusts iterations for current solve pass.
    if (this.adaptive.enabled){
      const cfg = this.adaptive.cfg;
      const pen = this.metrics.preMaxPenetration;
      const cc = this.metrics.contactCount;
      // Anomaly detection: if penetration extremely large relative to clamp, suspend adaptiv (fallback stability)
      const MAX_CONTACT_DEPTH = 50; // must match clamp above
      if (!cfg.disableAnomaly){
        if (pen > cfg.anomalySuspendFactor * MAX_CONTACT_DEPTH){
          this.adaptive._anomalyFrames = (this.adaptive._anomalyFrames||0) + 1;
          if (this.adaptive._anomalyFrames >= 3){
            if (this.adaptive.enabled){ this.devLog('adaptive','Suspended due to anomalous penetration'); }
            this.disableAdaptiveIterations();
          }
        } else {
          this.adaptive._anomalyFrames = 0;
        }
        if (!this.adaptive.enabled) return; // early exit if suspended
      }
      const beforeIter = this.solver.iterations;
      // Escalation condition
      const canEscalate = (this.frame >= (cfg.initialEscalationBlockFrames||0));
      if (canEscalate && ((pen > cfg.penetrationHigh) || (cc > cfg.contactHigh))){
        if (this.solver.iterations < cfg.maxIter){
          const newIter = Math.min(cfg.maxIter, this.solver.iterations + 8);
          this.solver.iterations = newIter;
        }
        this.adaptive.lowCounter = 0;
        this.adaptive.coolDown = cfg.coolDownFrames;
      } else if (pen < cfg.penetrationLow){
        // Potential downscale path
        if (this.adaptive.coolDown > 0) this.adaptive.coolDown--;
        this.adaptive.lowCounter++;
        const downscaleBlocked = this.frame < (cfg.downscaleBlockFrames||0);
        if (!downscaleBlocked && this.adaptive.lowCounter >= cfg.consecutiveLowNeeded && this.adaptive.coolDown === 0){
          if (this.solver.iterations > cfg.minIter){
            const newIter = Math.max(cfg.minIter, this.solver.iterations - 8);
            this.solver.iterations = newIter;
          }
          this.adaptive.lowCounter = 0;
          // no cooldown reset on downscale; it is inherently rate-limited by streak requirement
        }
      } else {
        // Middle zone – reset low streak, decay cooldown
        this.adaptive.lowCounter = 0;
        if (this.adaptive.coolDown > 0) this.adaptive.coolDown--;
      }
      if (this.solver.iterations !== beforeIter){
        // Lightweight log (silent if console not available)
  this.devLog('adaptive', `Iter ${beforeIter} -> ${this.solver.iterations} pen=${pen.toFixed(3)} cc=${cc} lowCounter=${this.adaptive.lowCounter}`);
        if (this._trackIterSeq){
          if (!this._adaptiveIterLog) this._adaptiveIterLog = []; // safety
          this._adaptiveIterLog.push(`${this._iterSeqCounter++}:${this.solver.iterations}`);
        }
        // Freeze logic for deterministic test mode
        if (cfg.freezeAfterFirstEscalation && this.adaptive._frozenIterationValue === undefined){
          this.adaptive._frozenIterationValue = this.solver.iterations;
        }
      }
      // Enforce freeze if set
      if (this.adaptive._frozenIterationValue !== undefined && this.solver.iterations !== this.adaptive._frozenIterationValue){
        this.solver.iterations = this.adaptive._frozenIterationValue;
      }
    }
    if (this._detMetricsEnabled){
      // Accumulate iterations used this frame (post any freeze enforcement)
      this._detMetrics.totalIterations += this.solver.iterations;
    }
    // Solve with sleeping shortcut
    if (this.sleeping.enabled){
      // Wrap contacts to skip double-sleep pairs and accumulate corrections
      const filtered = [];
      for (const c of this.contacts){
        const a=c.a, b=c.b;
        if (a.asleep && b.asleep) continue; // skip entirely
        filtered.push(c);
      }
      this.solver.solve(filtered, (c, normalCorrApplied)=>{
        // accumulate magnitude applied per body
        if (c.a && c.a.invMass>0){ c.a._lastFrameCorrection += normalCorrApplied; }
        if (c.b && c.b.invMass>0){ c.b._lastFrameCorrection += normalCorrApplied; }
      });
    } else {
      this.solver.solve(this.contacts);
    }
    // Post-solve recompute approximate max penetration for dynamic-dynamic contacts
    let postMax = 0;
    for (const c of this.contacts){
      if (c.b === this._envStatic) continue; // skip environment after solve
      const a=c.a, b=c.b;
      const dx = (a.hw + b.hw) - Math.abs(a.pos.x - b.pos.x);
      const dy = (a.hh + b.hh) - Math.abs(a.pos.y - b.pos.y);
      if (dx>0 && dy>0){ postMax = Math.max(postMax, Math.min(dx,dy)); }
    }
    this.metrics.postMaxPenetration = postMax;
  const t3 = __now();
    this.metrics.broadphaseMs = t1 - t0;
    this.metrics.narrowphaseMs = t2 - t1;
    this.metrics.solverMs = t3 - t2;
    if (this._detMetricsEnabled){
      // Stable per-frame metrics we may include (only final contact count at frame end)
      this._detMetrics.finalContactCount = this.metrics.contactCount;
      if (this._detDiagEnabled){
        this._detMetrics.broadphasePairs = this.metrics.broadphasePairs;
        if (this.metrics.mouseSpringDisplacement != null){
          this._detMetrics.mouseSpringDisp = Math.round(this.metrics.mouseSpringDisplacement*1000)/1000;
        }
        if (this.mouseSpring && this.mouseSpring.enabled && this.mouseSpring.massScaling){
          const ref = this.mouseSpring.referenceMass || 1;
          const pow = (this.mouseSpring.massPower==null)?1:this.mouseSpring.massPower;
          this._detMetrics.mouseSpringMassCfg = `${Math.round(ref*1000)/1000}:${Math.round(pow*1000)/1000}`;
        }
      }
    }
    // Sleeping evaluation (post solve, before velocities)
    if (this.sleeping.enabled){
      const p = this.sleeping.params;
      const dyn = this.entities.filter(e=>e.invMass>0);
      let wakesThisFrame = 0;
      for (const e of dyn){
        // compute linear velocity magnitude using Verlet-like previous position
        if (!e.prevPos){ e.prevPos = { x:e.pos.x, y:e.pos.y }; }
        const vx = (e.pos.x - e.prevPos.x)/dt; const vy = (e.pos.y - e.prevPos.y)/dt;
        const linVel = Math.hypot(vx,vy);
        const corr = e._lastFrameCorrection || 0;
        if (!e.asleep){
          if (linVel < p.minLinearVel && corr < p.minCorrection){
            e.sleepFrames++; if (e.sleepFrames >= p.framesRequired){ e.asleep = true; }
          } else { e.sleepFrames = 0; }
        }
        e.prevPos.x = e.pos.x; e.prevPos.y = e.pos.y; // update prevPos
      }
      // Wake logic via penetration / correction thresholds
      for (const e of this.entities){ if (e.asleep){ e._wakeFlag=false; } }
      for (const c of this.contacts){
        const a=c.a, b=c.b; if (!a || !b) continue;
        const deep = c.depth > this.sleeping.params.wakeContactPen;
        if (a.asleep && !b.asleep && deep){ a._wakeFlag=true; }
        if (b.asleep && !a.asleep && deep){ b._wakeFlag=true; }
      }
      for (const e of this.entities){ if (e._wakeFlag){ e.asleep=false; e.sleepFrames=0; wakesThisFrame++; } }
      // Anti-deadlock: if too many sleeping and penetration high, wake half
      const sleepingCount = this.entities.filter(e=>e.asleep && e.invMass>0).length;
      const dynCount = this.entities.filter(e=>e.invMass>0).length || 1;
      if (sleepingCount/dynCount > p.maxSleepingRatio && this.metrics.preMaxPenetration > (0.05*1.5)){
        let woke=0; for (const e of this.entities){ if (e.asleep){ e.asleep=false; e.sleepFrames=0; woke++; wakesThisFrame++; if (woke >= Math.ceil(sleepingCount/2)) break; } }
      }
      this.metrics.sleepingCount = sleepingCount;
      this.metrics.wakesThisFrame = wakesThisFrame;
      this.metrics._wakeEventsTotal = (this.metrics._wakeEventsTotal||0) + wakesThisFrame;
    }
  }
}
