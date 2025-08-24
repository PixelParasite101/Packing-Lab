// Hash Extensibility Template (8.6)
// Purpose: Centralize pattern for building deterministic state + metrics + diagnostics hash segments.
// Usage: Import buildDeterminismHash(parts) and append standardized segment tags.
// Policy:
//   BASE  : mandatory core entity positional data (ordered by id)
//   ITSEQ : optional adaptive iteration sequence (when trackIterationSequence enabled)
//   SUBSEQ: optional adaptive substep sequence (when trackSubstepSequence enabled)
//   METRICS: stable metrics (totalIterations, finalContactCount, etc.) (when enableDeterminismMetrics)
//   DIAG  : diagnostics-only volatile metrics (broadphasePairs, mouseSpringDisp, mouseSpringMassCfg, future) (when enableDeterminismDiagnostics)
// New segment addition steps:
//   1) Choose TAG (uppercase letters, no colon) ≤ 8 chars.
//   2) Define serialization: comma-separated values; each numeric fixed to 3 decimals unless integer.
//   3) Append as TAG:payload string to parts array BEFORE hashing.
//   4) Update PHYSICS_SPEC §16 and hashTemplate.js comments.
//   5) Add acceptance test verifying deterministic invariance with feature ON across two fresh runs.
// Collisions: FNV-1a 32-bit; sufficiently robust for regression detection; avoid relying on uniqueness guarantee.

export function fnv1aHash(str){
  let h = 2166136261 >>> 0;
  for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619)>>>0; }
  return h >>> 0; // unsigned 32-bit
}

export function buildDeterminismHash(world){
  const parts = [];
  // BASE
  const sorted = [...world.entities].sort((a,b)=>a.id-b.id);
  for (const e of sorted){ parts.push(`${e.id}:${e.pos.x.toFixed(3)},${e.pos.y.toFixed(3)}`); }
  // ITSEQ
  if (world._adaptiveIterLog && world._adaptiveIterLog.length){ parts.push('ITSEQ:' + world._adaptiveIterLog.join(',')); }
  // SUBSEQ
  if (world._substepSeqLog && world._substepSeqLog.length){ parts.push('SUBSEQ:' + world._substepSeqLog.join(',')); }
  // METRICS
  if (world._detMetricsEnabled && world._detMetrics){
    const m = world._detMetrics;
    const base = [m.totalIterations, m.finalContactCount];
    parts.push('METRICS:' + base.join(','));
  }
  // DIAG
  if (world._detDiagEnabled && world._detMetrics){
    const dm = [];
    const m = world._detMetrics;
    if (m.broadphasePairs != null) dm.push('bp=' + m.broadphasePairs);
    if (m.mouseSpringDisp != null) dm.push('msd=' + m.mouseSpringDisp);
    if (m.mouseSpringMassCfg) dm.push('msm=' + m.mouseSpringMassCfg);
    if (dm.length) parts.push('DIAG:' + dm.join(';'));
  }
  const hashHex = fnv1aHash(parts.join('|')).toString(16);
  return { hash: hashHex, parts };
}

// Example (test usage):
//   const { hash, parts } = buildDeterminismHash(world);
//   console.log('HASH', hash, parts);
