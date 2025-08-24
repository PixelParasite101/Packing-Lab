// PBD solver: resolves penetrations
export class Solver {
  constructor(iterations=8){
    this.iterations = iterations;
    this.friction = 0.5; // heuristic coefficient μ
    // Advanced friction configuration (7.3)
    this.frictionAdv = { enabled:false, muBase:0.5, anisotropic:false, muX:0.6, muY:0.4, dynamic:false, dynamicReduction:0.5, slipRef:60 };
  }

  enableAdvancedFriction(opts={}){
    this.frictionAdv = { ...this.frictionAdv, ...opts, enabled:true };
    if (this.frictionAdv.muBase == null) this.frictionAdv.muBase = this.friction;
  }
  disableAdvancedFriction(){ this.frictionAdv.enabled=false; }

  solve(contacts, onNormalCorrection){
    for (let it=0; it<this.iterations; it++){
      for (const c of contacts){
        const a = c.a, b = c.b;
        const totalInvMass = a.invMass + b.invMass;
        if (totalInvMass === 0) continue;
        const nx = c.nx, ny = c.ny;
        // Normal positional correction
        // If one body is static (invMass=0) move dynamic fully by depth; else split ~half-half
        let normalCorr;
        if (a.invMass === 0 || b.invMass === 0){
          normalCorr = c.depth / (a.invMass + b.invMass);
        } else {
          normalCorr = c.depth / totalInvMass * 0.5; // distribute equally
        }
  // Clamp correction to avoid pathological jumps
  const MAX_STEP = 20; // mm
  if (normalCorr > MAX_STEP) normalCorr = MAX_STEP;
        const axn = nx * normalCorr * a.invMass;
        const ayn = ny * normalCorr * a.invMass;
        const bxn = nx * normalCorr * b.invMass;
        const byn = ny * normalCorr * b.invMass;
        a.pos.x -= axn; a.pos.y -= ayn;
        b.pos.x += bxn; b.pos.y += byn;
        if (onNormalCorrection){ onNormalCorrection(c, normalCorr); }

        // Tangential friction heuristic (position-level) only if both dynamic or one dynamic vs static
        // Tangent perpendicular (rotate normal 90 deg)
        const tx = -ny; const ty = nx;
        // Relative displacement along tangent (approx using positions difference)
        const relTx = (b.pos.x - a.pos.x) * tx + (b.pos.y - a.pos.y) * ty;
        if (relTx !== 0){
          // Determine effective friction coefficient μ_eff
            let muEff = this.friction;
            const adv = this.frictionAdv;
            if (adv && adv.enabled){
              // Base
              muEff = adv.muBase != null ? adv.muBase : muEff;
              // Anisotropic weighting (alignment of tangent with axes)
              if (adv.anisotropic){
                const ax = Math.abs(tx); // tangent x component magnitude
                const ay = Math.abs(ty);
                const denom = (ax+ay) || 1;
                // Weighted blend of directional coefficients
                const wMu = (ax * (adv.muX!=null?adv.muX:1) + ay * (adv.muY!=null?adv.muY:1)) / denom;
                muEff *= wMu; // scale base by anisotropic blend
              }
              if (adv.dynamic){
                const slip = Math.abs(relTx); // positional slip proxy
                const ref = Math.max(1e-6, adv.slipRef || 60);
                const ratio = Math.min(1, slip / ref);
                const red = adv.dynamicReduction != null ? adv.dynamicReduction : 0.5; // fraction to remove at max slip
                const scale = 1 - red * ratio; // high slip -> lower μ
                muEff *= Math.max(0, scale);
              }
            }
            const maxT = normalCorr * muEff;
            // Desired correction to reduce slip (aim to move relTx toward 0)
            let tCorr = Math.min(Math.abs(relTx), maxT);
            if (relTx > 0) tCorr = -tCorr; // apply opposite direction to slip
            // Distribute by invMass
            const tax = tx * tCorr * a.invMass;
            const tay = ty * tCorr * a.invMass;
            const tbx = tx * tCorr * b.invMass;
            const tby = ty * tCorr * b.invMass;
            a.pos.x -= tax; a.pos.y -= tay;
            b.pos.x += tbx; b.pos.y += tby;
        }
      }
    }
  }
}
