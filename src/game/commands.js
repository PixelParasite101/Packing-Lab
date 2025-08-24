// Command pattern skeleton for undo/redo
// Each command implements execute(state) and undo(state)

export class CommandStack {
  constructor(){
    this.undoStack = [];
    this.redoStack = [];
    this._batch = null; // { commands:[] }
  this.stats = { place:0, remove:0, rotate:0, move:0 };
  }
  execute(cmd, state){
    cmd.execute(state);
    if (this._batch){
      this._batch.commands.push(cmd);
    } else {
      this.undoStack.push(cmd);
      this.redoStack.length = 0;
    }
  // update stats
  if (cmd instanceof PlaceCommand) this.stats.place++;
  else if (cmd instanceof RemoveCommand) this.stats.remove++;
  else if (cmd instanceof RotateCommand) this.stats.rotate++;
  else if (cmd instanceof MoveCommand) this.stats.move++;
  }
  undo(state){
    const c = this.undoStack.pop();
    if(!c) return;
    c.undo(state);
    this.redoStack.push(c);
  }
  redo(state){
    const c = this.redoStack.pop();
    if(!c) return;
    c.execute(state);
    this.undoStack.push(c);
  }
  beginBatch(){
    if (this._batch) return; // simple: ignore nested
    this._batch = { commands:[] };
  }
  endBatch(){
    if (!this._batch) return;
    const cmds = this._batch.commands;
    this._batch = null;
    if (!cmds.length) return;
    // Optimization: if all MoveCommand on same brick, collapse
    const allMove = cmds.every(c=>c instanceof MoveCommand);
    if (allMove){
      const first = cmds[0];
      const last = cmds[cmds.length-1];
      const collapsed = new MoveCommand(first.brick, first.from, last.to);
      // Replace state of brick already at last.to, so just push collapsed
      this.undoStack.push(collapsed);
      this.redoStack.length=0;
      return;
    }
    const composite = new CompositeCommand(cmds);
    this.undoStack.push(composite);
    this.redoStack.length=0;
  }
}

export class PlaceCommand {
  constructor(brick){ this.brick = brick; }
  execute(state){ state.addBrick(this.brick); }
  undo(state){ state.removeBrick(this.brick); }
}
export class RemoveCommand {
  constructor(brick){ this.brick = brick; }
  execute(state){ state.removeBrick(this.brick); }
  undo(state){ state.addBrick(this.brick); }
}
export class RotateCommand {
  constructor(brick){
    this.brick = brick;
    this.before = { w: brick.w, h: brick.h, rot: brick.rot };
    // after state computed lazily in execute
    this.after = null;
  }
  execute(state){
    if(!this.after){
      // apply rotation 90°
      const b=this.brick;
      const newW = b.h, newH = b.w;
      this.after = { w:newW, h:newH, rot:(b.rot+90)%360 };
    }
    this.apply(this.after);
  }
  undo(){ this.apply(this.before); }
  apply(s){
    const b=this.brick;
    b.w = s.w; b.h = s.h; b.hw = b.w/2; b.hh = b.h/2; b.rot = s.rot;
  }
}
export class MoveCommand {
  constructor(brick, from, to){ this.brick=brick; this.from=from; this.to=to; }
  execute(){ this.brick.pos.x = this.to.x; this.brick.pos.y = this.to.y; }
  undo(){ this.brick.pos.x = this.from.x; this.brick.pos.y = this.from.y; }
}

// Composite command for batched heterogeneous operations
export class CompositeCommand {
  constructor(commands){ this.commands = commands.slice(); }
  execute(state){ for (const c of this.commands){ c.execute(state); } }
  undo(state){ for (let i=this.commands.length-1;i>=0;i--){ this.commands[i].undo(state); } }
}
