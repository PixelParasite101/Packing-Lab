import { createBrick } from '../interaction/mouse.js';
import { CommandStack, PlaceCommand, RemoveCommand, RotateCommand, MoveCommand } from './commands.js';

export class GameState {
  constructor(world, config){
    this.world = world;
    this.config = config;
    this.mode = 'place';
    this.bricks = [];
    this.ghost = null;
    this.selected = null;
    this.circleRadius = config.circleDiameter/2;
    this.centerWall = false;
    this.innerHole = false;
    this.innerHoleRadius = 120;
  // Grid snapping (7.1)
  this.grid = { enabled:false, size:40 }; // size in px (mm). 40 chosen: divides default brick width (120) evenly
  // Nudge-after-drop (7.2) – gently separates new brick from immediate neighbors to reduce tiny initial overlaps or visual touching
  this.nudge = { enabled:false, distance:4, maxNeighbors:6 }; // distance in px, limited neighbors for O(k) behavior
  // Auto-pack nudge (7.4) – incremental inward slide of newly placed brick toward center (deterministic greedy)
  this.autoPack = { enabled:false, step:4, maxIters:12, stopOnContact:true };
  // Forbidden polygons (array of { points:[{x,y},...] })
  this.forbiddenPolys = [];
  this.commandStack = new CommandStack();
  // Move batching state (4.3)
  this._moveBatch = { active:false, brick:null, start:null, last:null, frameCounter:0 };
  }

  toggleMode(){ this.mode = this.mode === 'place' ? 'edit' : 'place'; }
  toggleWall(v){ this.centerWall = v; }
  toggleInner(v){ this.innerHole = v; this.world.setArena(this.circleRadius, this.innerHole? this.innerHoleRadius : null); }
  setCircleDiameter(d){ this.circleRadius = d/2; this.world.setArena(this.circleRadius, this.innerHole? this.innerHoleRadius : null); }

  setForbiddenPolys(polys){
    // Shallow copy to avoid external mutation
    this.forbiddenPolys = (polys||[]).map(p=>({ points: p.points.map(q=>({x:q.x,y:q.y})) }));
    if (this.world) this.world.forbiddenPolys = this.forbiddenPolys;
  }

  applyArenaFlags(){
    this.world.setArena(this.circleRadius, this.innerHole? this.innerHoleRadius : null);
    this.world.setCenterWall(this.centerWall);
  }

  updateGhost(x,y){
  if (this.grid.enabled){ ({x,y} = this.snapToGrid(x,y)); }
    const w = this.config.rectWidth;
    const h = this.config.rectHeight;
    const brick = { pos:{x,y}, w, h, hw:w/2, hh:h/2, rot:0 };
    const valid = this.isPlacementValid(brick);
    this.ghost = { ...brick, valid };
  }

  addBrick(b){
    this.bricks.push(b);
    this.world.add(b);
  }
  removeBrick(b){
    const i=this.bricks.indexOf(b);
    if(i>=0){
      this.bricks.splice(i,1);
      this.world.remove(b);
    }
  }
  placeAt(x,y){
  if (this.grid.enabled){ ({x,y} = this.snapToGrid(x,y)); }
    if (!this.ghost || !this.ghost.valid) return;
    const b = createBrick(x,y,this.config.rectWidth,this.config.rectHeight);
    this.commandStack.execute(new PlaceCommand(b), this);
  if (this.nudge.enabled){ this._applyNudge(b); }
  if (this.autoPack.enabled){ this._applyAutoPack(b); }
  }

  pick(x,y){
    return this.bricks.find(b => Math.abs(b.pos.x - x) <= b.hw && Math.abs(b.pos.y - y) <= b.hh) || null;
  }

  select(b){ this.selected = b; }
  deleteSelected(){
    if(!this.selected) return;
  this.flushMoveBatch();
    const b=this.selected;
    this.commandStack.execute(new RemoveCommand(b), this);
    this.selected=null;
  }
  rotateSelected(){
    if(!this.selected) return;
  this.flushMoveBatch();
    this.commandStack.execute(new RotateCommand(this.selected), this);
  }

  isPlacementValid(brick){
    // Containment in outer circle
    const corners=[[-brick.hw,-brick.hh],[brick.hw,-brick.hh],[brick.hw,brick.hh],[-brick.hw,brick.hh]];
    for (const [cx,cy] of corners){
      const px = brick.pos.x + cx;
      const py = brick.pos.y + cy;
      if (Math.hypot(px,py) > this.circleRadius) return false;
      if (this.innerHole && Math.hypot(px,py) < this.innerHoleRadius) return false;
    }
    // Overlap with existing
    for (const b of this.bricks){
      if (Math.abs(b.pos.x - brick.pos.x) <= b.hw + brick.hw && Math.abs(b.pos.y - brick.pos.y) <= b.hh + brick.hh) return false;
    }
    // Forbidden polygons rejection (AABB vs polygon overlap)
    if (this.forbiddenPolys && this.forbiddenPolys.length){
      const bxMin = brick.pos.x - brick.hw, bxMax = brick.pos.x + brick.hw;
      const byMin = brick.pos.y - brick.hh, byMax = brick.pos.y + brick.hh;
      // Helpers
      const pointInRect = (x,y)=> x>=bxMin && x<=bxMax && y>=byMin && y<=byMax;
      const pointInPoly = (x,y,poly)=>{
        let inside=false; const pts=poly.points; for (let i=0,j=pts.length-1;i<pts.length;j=i++){
          const xi=pts[i].x, yi=pts[i].y, xj=pts[j].x, yj=pts[j].y;
          const intersect = ((yi>y)!=(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi+1e-12)+xi);
          if (intersect) inside=!inside;
        } return inside;
      };
      const edgesIntersect = (p1,p2,q1,q2)=>{
        const o=(a,b,c)=>Math.sign((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x));
        const oa=o(p1,p2,q1), ob=o(p1,p2,q2), oc=o(q1,q2,p1), od=o(q1,q2,p2);
        if (oa===0 && pointOnSeg(p1,p2,q1)) return true;
        if (ob===0 && pointOnSeg(p1,p2,q2)) return true;
        if (oc===0 && pointOnSeg(q1,q2,p1)) return true;
        if (od===0 && pointOnSeg(q1,q2,p2)) return true;
        return (oa*ob<0 && oc*od<0);
      };
      const pointOnSeg = (a,b,p)=>{
        const minX=Math.min(a.x,b.x)-1e-9, maxX=Math.max(a.x,b.x)+1e-9;
        const minY=Math.min(a.y,b.y)-1e-9, maxY=Math.max(a.y,b.y)+1e-9;
        const cross=Math.abs((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x));
        if (cross>1e-6) return false; return p.x>=minX && p.x<=maxX && p.y>=minY && p.y<=maxY;
      };
      const rectCorners=[
        {x:bxMin,y:byMin},{x:bxMax,y:byMin},{x:bxMax,y:byMax},{x:bxMin,y:byMax}
      ];
      for (const poly of this.forbiddenPolys){
        if (!poly.points || poly.points.length<3) continue;
        // Corner inside poly
        if (rectCorners.some(c=>pointInPoly(c.x,c.y,poly))) return false;
        // Poly vertex inside rect
        if (poly.points.some(pt=>pointInRect(pt.x,pt.y))) return false;
        // Edge intersection
        for (let i=0;i<poly.points.length;i++){
          const a=poly.points[i], b=poly.points[(i+1)%poly.points.length];
          for (let e=0;e<4;e++){
            const c=rectCorners[e], d=rectCorners[(e+1)%4];
            if (edgesIntersect(a,b,c,d)) return false;
          }
        }
      }
    }
    // Center wall simple test: if wall active, disallow crossing? (Simplified)
    if (this.centerWall){
      // If any corner crosses y=0 line maybe allowed; we simplify: allow all.
    }
    return true;
  }

  undo(){ this.commandStack.undo(this); }
  redo(){ this.commandStack.redo(this); }

  registerMove(brick, from, to){
  if (this.grid.enabled){ to = this.snapToGrid(to.x, to.y); }
    if (from.x === to.x && from.y === to.y) return; // no move
    // If batching inactive or different brick, flush any existing then start new
    if (!this._moveBatch.active || this._moveBatch.brick !== brick){
      this.flushMoveBatch();
      this._moveBatch.active = true;
      this._moveBatch.brick = brick;
      this._moveBatch.start = { x: from.x, y: from.y };
      this._moveBatch.last = { x: to.x, y: to.y };
      this._moveBatch.frameCounter = 0;
    } else {
      // same brick, update last
      this._moveBatch.last.x = to.x; this._moveBatch.last.y = to.y;
    }
    this._moveBatch.frameCounter++;
    // Heuristic: auto-flush if batch grows long (avoid huge undo latency)
    if (this._moveBatch.frameCounter > 180){ // ~3s at 60fps
      this.flushMoveBatch();
    }
  }

  flushMoveBatch(){
    if (!this._moveBatch.active) return;
    const b = this._moveBatch;
    if (b.start.x !== b.last.x || b.start.y !== b.last.y){
      this.commandStack.execute(new MoveCommand(b.brick, {x:b.start.x,y:b.start.y}, {x:b.last.x,y:b.last.y}), this);
    }
    b.active=false; b.brick=null; b.start=null; b.last=null; b.frameCounter=0;
  }

  // --- Grid Helpers ---
  setGridEnabled(v){ this.grid.enabled = !!v; if (!v && this.ghost){ this.updateGhost(this.ghost.pos.x, this.ghost.pos.y); } }
  setGridSize(sz){ if (sz>2){ this.grid.size = sz; if (this.ghost){ this.updateGhost(this.ghost.pos.x, this.ghost.pos.y); } } }
  snapToGrid(x,y){ const s=this.grid.size; return { x: Math.round(x/s)*s, y: Math.round(y/s)*s }; }

  // --- Nudge Helpers ---
  setNudgeEnabled(v){ this.nudge.enabled = !!v; }
  setNudgeDistance(d){ if (d>=0) this.nudge.distance = d; }
  _applyNudge(brick){
    const d = this.nudge.distance;
    if (d <= 0) return;
    // Collect immediate neighbors overlapping expanded AABB (touching zone)
    const candidates = [];
    for (let i=this.bricks.length-1; i>=0; i--){
      const other = this.bricks[i];
      if (other === brick) continue;
      // Quick AABB proximity check (within nudge distance shell)
      const dx = other.pos.x - brick.pos.x;
      const px = Math.abs(dx) - (other.hw + brick.hw);
      if (px > d) continue;
      const dy = other.pos.y - brick.pos.y;
      const py = Math.abs(dy) - (other.hh + brick.hh);
      if (py > d) continue;
      candidates.push(other);
      if (candidates.length >= this.nudge.maxNeighbors) break;
    }
    if (!candidates.length) return;
    // Compute small separating displacement away from average neighbor center
    let ax=0, ay=0; for (const o of candidates){ ax += o.pos.x; ay += o.pos.y; }
    ax /= candidates.length; ay /= candidates.length;
    let vx = brick.pos.x - ax; let vy = brick.pos.y - ay; const len = Math.hypot(vx,vy) || 1;
    vx /= len; vy /= len;
    brick.pos.x += vx * d; brick.pos.y += vy * d;
  }

  // --- Auto-Pack Helpers (7.4) ---
  setAutoPackEnabled(v){ this.autoPack.enabled = !!v; }
  setAutoPackStep(s){ if (s>0) this.autoPack.step = s; }
  setAutoPackMaxIters(n){ if (n>0 && n<1000) this.autoPack.maxIters = n|0; }
  _applyAutoPack(brick){
    const cfg = this.autoPack;
    const step = cfg.step;
    const maxIters = cfg.maxIters;
    if (step <= 0 || maxIters <= 0) return;
    // Direction: toward center (0,0) to densify packing concentrically
    for (let iter=0; iter<maxIters; iter++){
      const cx = brick.pos.x;
      const cy = brick.pos.y;
      let vx = -cx; let vy = -cy; // vector toward origin
      const len = Math.hypot(vx,vy) || 1;
      vx /= len; vy /= len;
      const dx = vx * step;
      const dy = vy * step;
      const prevX = brick.pos.x; const prevY = brick.pos.y;
      brick.pos.x += dx; brick.pos.y += dy;
      // Containment check (outer circle & inner hole)
      const corners=[[-brick.hw,-brick.hh],[brick.hw,-brick.hh],[brick.hw,brick.hh],[-brick.hw,brick.hh]];
      let containmentOk = true;
      for (const [ox,oy] of corners){
        const px = brick.pos.x + ox; const py = brick.pos.y + oy;
        if (Math.hypot(px,py) > this.circleRadius + 1e-6){ containmentOk=false; break; }
        if (this.innerHole && Math.hypot(px,py) < this.innerHoleRadius - 1e-6){ containmentOk=false; break; }
      }
      if (!containmentOk){ brick.pos.x = prevX; brick.pos.y = prevY; break; }
      // Overlap check with other bricks (AABB since only axis-aligned orientations used except 90 deg)
      let overlap=false;
      for (const other of this.bricks){
        if (other === brick) continue;
        if (Math.abs(other.pos.x - brick.pos.x) <= other.hw + brick.hw && Math.abs(other.pos.y - brick.pos.y) <= other.hh + brick.hh){ overlap=true; break; }
      }
      if (overlap){
        // Revert and stop – cannot advance further without overlap
        brick.pos.x = prevX; brick.pos.y = prevY;
        break;
      }
      // If moved less than half step (very close to center), stop early
      if (Math.abs(dx) < step*0.25 && Math.abs(dy) < step*0.25) break;
    }
  }
}
