// Narrowphase collision detection for axis-aligned rectangles
export class Narrowphase {
  rectRect(a,b){
    if (Math.abs(a.pos.x - b.pos.x) > a.hw + b.hw) return null;
    if (Math.abs(a.pos.y - b.pos.y) > a.hh + b.hh) return null;
    const dx = (a.hw + b.hw) - Math.abs(a.pos.x - b.pos.x);
    const dy = (a.hh + b.hh) - Math.abs(a.pos.y - b.pos.y);
    if (dx < 0 || dy < 0) return null;
    // choose axis of minimum penetration
    if (dx < dy){
      const normalX = a.pos.x < b.pos.x ? -1 : 1;
      return { a,b, nx: normalX, ny:0, depth: dx };
    } else {
      const normalY = a.pos.y < b.pos.y ? -1 : 1;
      return { a,b, nx:0, ny: normalY, depth: dy };
    }
  }
}
