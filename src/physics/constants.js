// Centralized physics constants (Task 6.6 consolidation)
// Legacy iteration values kept for reference/testing but not used by adaptive runtime.
export const LEGACY_ITER_BASE = 12; // historical fixed-mode base
export const LEGACY_ITER_MAX = 18;  // historical fixed-mode max

// Active adaptive iteration configuration (mirrors adaptiveConfig defaults)
export const ADAPTIVE_MIN_ITER = 16;
export const ADAPTIVE_BASE_ITER = 32;
export const ADAPTIVE_MAX_ITER = 64;

// Substeps bounds
export const BASE_SUBSTEPS = 2;
export const MAX_SUBSTEPS = 4;

// Friction
export const FRICTION_COEFF = 0.5;

// Velocity damping
export const VEL_DAMPING = 0.98;

// Penetration tolerance & clamps
export const PENETRATION_TOL = 0.05; // target post-solve max
export const MAX_CONTACT_DEPTH = 50; // must align with world.js clamp
export const MAX_NORMAL_CORRECTION = 20; // solver position correction clamp

// Sleeping defaults (must stay in sync with world.sleeping.params defaults)
export const SLEEP_MIN_LINEAR_VEL = 0.05;
export const SLEEP_MIN_CORRECTION = 0.02;
export const SLEEP_FRAMES_REQUIRED = 30;
export const WAKE_LINEAR_VEL = 0.08;
export const WAKE_CORRECTION = 0.04;
export const WAKE_CONTACT_PEN = 0.20;
export const MAX_SLEEPING_RATIO = 0.85;

// Utility bundle for UI/debug export if needed
export const PhysicsConstants = {
  LEGACY_ITER_BASE,
  LEGACY_ITER_MAX,
  ADAPTIVE_MIN_ITER,
  ADAPTIVE_BASE_ITER,
  ADAPTIVE_MAX_ITER,
  BASE_SUBSTEPS,
  MAX_SUBSTEPS,
  FRICTION_COEFF,
  VEL_DAMPING,
  PENETRATION_TOL,
  MAX_CONTACT_DEPTH,
  MAX_NORMAL_CORRECTION,
  SLEEP_MIN_LINEAR_VEL,
  SLEEP_MIN_CORRECTION,
  SLEEP_FRAMES_REQUIRED,
  WAKE_LINEAR_VEL,
  WAKE_CORRECTION,
  WAKE_CONTACT_PEN,
  MAX_SLEEPING_RATIO
};
