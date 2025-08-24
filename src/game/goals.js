// Goal / Medal evaluation (5.4)
export class GoalEvaluator {
  constructor(state, world, opts={}){
    this.state = state; this.world = world;
    this.cfg = {
      coverageTiers:[50,65,75], // bronze,silver,gold thresholds (%) >=
      maxPenTiers:[0.60,0.40,0.25], // bronze<=, silver<=, gold<= (mm)
      efficiencyTiers:[15,25,35], // pairReduction% >=
      moveMultipliers:[2.0,1.7,1.4], // totalMoves <= multiplier * bricks
      ...opts
    };
    this.maxPrePen = 0;
  }
  update(){
    this.maxPrePen = Math.max(this.maxPrePen, this.world.metrics.preMaxPenetration||0);
  }
  _tierFromAscending(val, tiers){
    // tiers ascending for positive achievement (coverage, efficiency) => return 0/1/2 index or -1
    if (val >= tiers[2]) return 2; if (val >= tiers[1]) return 1; if (val >= tiers[0]) return 0; return -1;
  }
  _tierFromDescending(val, tiers){
    // lower is better (max penetration) thresholds are bronze,silver,gold maximums
    if (val <= tiers[2]) return 2; if (val <= tiers[1]) return 1; if (val <= tiers[0]) return 0; return -1;
  }
  snapshot(){
    const bricks = this.state.bricks.length;
    const coverage = this.state.metrics? this.state.metrics.coveragePercent?.() : null; // fallback if metrics inside state later
    // compute coverage using world/state if no state.metrics
    const totalRectArea = this.state.bricks.reduce((a,b)=>a + b.w*b.h, 0);
    const outer = Math.PI * this.state.circleRadius * this.state.circleRadius;
    const inner = this.state.innerHole ? Math.PI * this.state.innerHoleRadius * this.state.innerHoleRadius : 0;
    const avail = outer - inner;
    const covPct = avail>0 ? (totalRectArea/avail)*100 : 0;
    const coverageTier = this._tierFromAscending(covPct, this.cfg.coverageTiers);
    const maxPenTier = this._tierFromDescending(this.maxPrePen, this.cfg.maxPenTiers);
    // Efficiency (only meaningful if using grid broadphase)
    const n = bricks;
    const theoretical = n*(n-1)/2;
    const pairs = this.world.metrics.broadphasePairs || 0;
    let effTier = -1; let reductionPct = 0;
    if (theoretical>0 && pairs>0 && pairs<=theoretical){
      reductionPct = (1 - pairs/theoretical)*100;
      effTier = this._tierFromAscending(reductionPct, this.cfg.efficiencyTiers);
    }
    // Move economy
    const stats = this.state.commandStack?.stats || { place:0, move:0, rotate:0, remove:0 };
    const totalOps = stats.place + stats.move + stats.rotate; // exclude remove for economy
    let moveTier = -1;
    if (bricks>0){
      const mults = this.cfg.moveMultipliers;
      const goldCap = bricks * mults[2];
      const silverCap = bricks * mults[1];
      const bronzeCap = bricks * mults[0];
      if (totalOps <= goldCap) moveTier = 2; else if (totalOps <= silverCap) moveTier = 1; else if (totalOps <= bronzeCap) moveTier = 0;
    }
    // Overall tier = min of achieved non -1 tiers
    const tiers = [coverageTier, maxPenTier, moveTier].filter(t=>t>=0);
    const overall = tiers.length? Math.min(...tiers) : -1;
    return {
      coverage:{ pct:covPct, tier:coverageTier },
      stability:{ maxPrePen:this.maxPrePen, tier:maxPenTier },
      efficiency:{ reductionPct, tier:effTier },
      moves:{ totalOps, tier:moveTier },
      overall:{ tier:overall }
    };
  }
}
