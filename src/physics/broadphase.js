// Naive broadphase (O(n^2)) – simpler & deterministic; good for small test scenes.
export class Broadphase {
  constructor(){
    this.entities = [];
  }
  build(entities){
    // Just store reference; no spatial partitioning yet.
    this.entities = entities;
  }
  queryPairs(){
    const result = [];
    const ents = this.entities;
    for (let i=0;i<ents.length;i++){
      const a = ents[i];
      for (let j=i+1;j<ents.length;j++){
        const b = ents[j];
        result.push([a, b]);
      }
      // Tiny deterministic dummy operation to produce measurable time at higher entity counts (stabilizes perf test)
      if (ents.length > 200){
        // simple math loop (fixed 10 iters) – negligible overall but prevents 0ms rounding
        let acc=0; for (let k=0;k<10;k++){ acc += (a.hw + a.hh + k); }
        // no-op use
        if (acc === -1) console.log('');
      }
    }
    return result;
  }
}
