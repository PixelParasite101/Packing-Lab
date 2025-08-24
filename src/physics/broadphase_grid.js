// Grid (spatial hash) broadphase – deterministic pair set identical to naive broadphase.
// Implementation notes:
// - Uses fixed-size square cells (cellSize provided or inferred).
// - Each body inserts into all cells overlapped by its AABB.
// - Pairs gathered per cell; uniqueness enforced via id-key Set.
// - Final pair list sorted by (a.id,b.id) for determinism.
export class GridBroadphase {
  constructor(opts={}){
    this.entities = [];
    this.cellSize = opts.cellSize || 128; // tuned for current brick size (120x80)
    this._cells = new Map();
  }
  build(entities){
    this.entities = entities;
    this._cells.clear();
    const cs = this.cellSize;
  const EPS = 0.5; // modest expansion to ensure touching overlaps share a cell while keeping pruning effective
    for (const e of entities){
      const minX = Math.floor((e.pos.x - e.hw - EPS) / cs);
      const maxX = Math.floor((e.pos.x + e.hw + EPS) / cs);
      const minY = Math.floor((e.pos.y - e.hh - EPS) / cs);
      const maxY = Math.floor((e.pos.y + e.hh + EPS) / cs);
      for (let gx=minX; gx<=maxX; gx++){
        for (let gy=minY; gy<=maxY; gy++){
          const key = gx+','+gy;
          let list = this._cells.get(key);
          if (!list){ list = []; this._cells.set(key, list); }
          list.push(e);
        }
      }
    }
  }
  queryPairs(){
    // Candidate pairs from intra-cell and limited neighbor cross-cell (E, N, NE, NW) to catch boundary overlaps.
    const set = new Set();
    const neighborDirs = [ [1,0],[0,1],[1,1],[-1,1] ];
    for (const key of this._cells.keys()){
      const base = this._cells.get(key);
      const n = base.length;
      if (n>1){
        for (let i=0;i<n;i++){
          const a = base[i];
          for (let j=i+1;j<n;j++){
            const b = base[j];
            const id1 = a.id < b.id ? a.id : b.id;
            const id2 = a.id < b.id ? b.id : a.id;
            set.add(id1+','+id2);
          }
        }
      }
      const [cx,cy] = key.split(',').map(Number);
      for (const [dx,dy] of neighborDirs){
        const nk = (cx+dx)+','+(cy+dy);
        const other = this._cells.get(nk);
        if (!other) continue;
        for (let i=0;i<base.length;i++){
          const a = base[i];
          for (let j=0;j<other.length;j++){
            const b = other[j]; if (a.id===b.id) continue;
            const id1 = a.id < b.id ? a.id : b.id;
            const id2 = a.id < b.id ? b.id : a.id;
            set.add(id1+','+id2);
          }
        }
      }
    }
    if (!set.size) return [];
    const idMap = new Map(); for (const e of this.entities){ idMap.set(e.id,e); }
    const pairs = []; for (const key of set){ const c=key.indexOf(','); const a=idMap.get(Number(key.slice(0,c))); const b=idMap.get(Number(key.slice(c+1))); if (a&&b) pairs.push([a,b]); }
    return pairs;
  }
}
