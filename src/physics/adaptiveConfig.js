// Adaptive solver configuration (initial thresholds). Will be tuned after observation.
// Step 2: define heuristic bounds for upcoming adaptive iteration logic.
// Units: penetration in mm (consistent with existing tolerance usage).

export const adaptiveConfig = {
  // Iteration bounds
  minIter: 16,
  baseIter: 32,
  maxIter: 64,

  // Penetration thresholds
  penetrationHigh: 0.80,   // escalate immediately if exceeded (was 0.90)
  penetrationLow: 0.15,    // consider downscaling if kept below for many frames (was 0.20)

  // Contact count threshold (constraints after broad/narrow + containment)
  contactHigh: 60,         // was 80 – react earlier under crowding

  // Hysteresis / stability
  consecutiveLowNeeded: 12, // increased for smoother downscale
  coolDownFrames: 6,        // slightly faster readiness for downscale after escalation
  anomalySuspendFactor: 0.5 // if prePen > factor * MAX_CONTACT_DEPTH several frames -> suspend adaptive
};

// NOTE: Not yet used. Adaptive logic will read these values when implemented.
