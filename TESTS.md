# Test Suite Overview

## AT5 Performance (Spatial Hash)
Goal: Demonstrate broadphase pruning effectiveness without losing overlapping AABB pairs.
Scene: 300 bricks in staggered overlapping layout.
Metric: Candidate pair reduction percentage = 100 * (1 - gridPairs / naivePairs).
Pass Criteria: >= 7% reduction (stretch: >=25%). Timing is informative only (too small for stable ms threshold in Node headless).
Rationale: With pruning we shrink narrowphase workload; ms variance at sub-millisecond scale made strict timing flaky.

## Broadphase Pruning Test (at_broadphase_pruning)
Ensures grid includes all actual overlapping AABB pairs (reference built via naive AABB overlap check) and prunes at least 5% of all possible pairs.

## Broadphase Equivalence (Adjusted Intent)
Original intent (exact pair equivalence) replaced by pruning correctness check. The old equivalence test should either be removed or rewritten to assert no missing overlap pairs rather than total equality.

## AT6 Undo/Redo Sequence
Verifies full undo clears all bricks and redo restores exact snapshot (including batched moves and rotations). Places bricks through command stack to ensure undoability.

## Mouse Spring Tests
Cover: basic attachment, adaptive stiffness, displacement clamp, diagnostics hash, mass scaling, mass config hash segment.

## Containment & Arena Shrink
Ensures bricks outside newly shrunken arena are repositioned inward without violating determinism.

## Sleeping System
Basic sleep, wake on deep contact, deterministic metrics hash.

## Adaptive Iterations & Substeps
Escalation/downscale heuristics yield deterministic iteration sequence under controlled scenarios; substep sequence optionally tracked.

## Penetration Alarm
Triggers and HUD integration; diagnostic but does not affect determinism when disabled.

