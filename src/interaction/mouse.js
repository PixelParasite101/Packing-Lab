let _idCounter = 1;

export class MouseController {
  constructor(canvas, state, world){
    this.canvas = canvas;
    this.state = state;
    this.world = world;
    this.rect = canvas.getBoundingClientRect();
    this.dragging = null;
  this.dragStart = null;
    canvas.addEventListener('mousemove', e=>this.onMove(e));
    canvas.addEventListener('mousedown', e=>this.onDown(e));
    canvas.addEventListener('mouseup', e=>this.onUp(e));
  }
  getMouse(e){
    const x = e.clientX - this.rect.left - this.canvas.width/2;
    const y = e.clientY - this.rect.top - this.canvas.height/2;
    return {x,y};
  }
  onMove(e){
    const m = this.getMouse(e);
    if (this.state.mode === 'place'){
      this.state.updateGhost(m.x, m.y);
    } else if (this.dragging){
      if (this.world.mouseSpring && this.world.mouseSpring.enabled){
        this.world.moveMouseSpring(m.x, m.y);
      } else {
        // legacy direct drag fallback
  let x=m.x, y=m.y;
  if (this.state.grid && this.state.grid.enabled){ ({x,y} = this.state.snapToGrid(x,y)); }
  this.dragging.pos.x = x;
  this.dragging.pos.y = y;
      }
    }
  }
  onDown(e){
    const m = this.getMouse(e);
    if (this.state.mode === 'place'){
      this.state.placeAt(m.x, m.y);
    } else {
      const hit = this.state.pick(m.x, m.y);
      if (hit){
        this.dragging = hit; this.dragStart = { x: hit.pos.x, y: hit.pos.y }; this.state.select(hit);
        if (this.world.mouseSpring && this.world.mouseSpring.enabled){
          this.world.attachMouseSpring(hit, m.x, m.y);
        }
      }
    }
  }
  onUp(){
    if (this.dragging){
      this.state.registerMove(this.dragging, this.dragStart, { x:this.dragging.pos.x, y:this.dragging.pos.y });
    }
    if (this.world.mouseSpring && this.world.mouseSpring.enabled){
      this.world.releaseMouseSpring();
    }
    this.dragging = null; this.dragStart=null;
  }
}

export function createBrick(x,y,w,h,mass=1){
  // mass <=0 treated as static (invMass=0)
  const m = (mass>0)? mass : 0;
  const invMass = m>0 ? 1/m : 0;
  return { id: _idCounter++, pos:{x,y}, w, h, hw:w/2, hh:h/2, rot:0, mass:m, invMass };
}

// Test-only helper to reset ID sequence for deterministic snapshots
export function _resetBrickIdsForTest(){
  _idCounter = 1;
}
