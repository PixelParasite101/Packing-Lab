# IMPLEMENTATION STATUS

Matrix over planlagte funktioner ("Skal") vs. nuværende implementering ("Er"), relevante tests, samt noter / huller. Fokus er på nuværende prototype version.

Status-legende:
- ✅ Implementeret og test dækket
- ⚠️ Delvist / midlertidig
- ⏳ Ikke implementeret endnu / placeholder

## 1. Kerne / Geometri
| Feature | Skal | Er | Tests / Verifikation | Noter |
|---------|------|----|----------------------|-------|
| Rektangel-entities | Ja | ✅ | Bredt i alle tests | Kun aksisjusterede; ingen rotation udover 90° swap |
| Arena yder-cirkel containment | Ja | ✅ | at_containment_shrink* | Shrink reposition pass implementeret |
| Indre hul (inner circle) | Ja | ✅ | at_containment_shrink_hash | Multi-hole i schema, runtime understøtter dog kun enkel via flag |
| Center wall | Ja | ✅ | implicit i determinism tests | Simpel toggled constraint (y=0) |
| Forbidden polygons | Ja | ✅ | at_forbidden_polys | Kun AABB vs polygon overlap (konservativ) |

## 2. Fysik Pipeline
| Feature | Skal | Er | Tests | Noter |
|---------|------|----|------|-------|
| Broadphase naïv | Ja | ✅ | baseline i pruning tests | O(n^2) |
| Broadphase grid (spatial hash) | Ja | ✅ | at_broadphase_pruning, AT5, perf-snapshot | Directional neighbor strategy; ~70–77% pair reduction i tunge scenarier |
| Narrowphase simple AABB | Ja | ✅ | Indirekte gennem alle kontaktgenererende tests | Ingen roterede boxes endnu |
| Solver (position correction + iterations) | Ja | ✅ | determinism / penetration alarm tests | Basic iterative resolver |
| Penetration alarm | Ja | ✅ | HUD toggle, penetration metrics | Alarm helper + metrics |

## 3. Adaptiv / Performance
| Feature | Skal | Er | Tests | Noter |
|---------|------|----|------|-------|
| Adaptive iterations | Ja | ✅ | at_substeps_adaptive, determinism hash tests | Includes downscale freeze logic |
| Adaptive substeps | Skal | ✅ | at_substeps_adaptive | Escalates substeps op til max |
| Pair reduction metric HUD | Ja | ✅ | Visual + AT5 | Computed når grid aktiv |
| Perf snapshot baseline | Ja | ✅ | scripts/perf-snapshot.js | JSON baseline med tolerance |
| Perf trend rapport | Skal | ✅ | scripts/perf-trend.js | Rolling median (window 10) |
| Pair reduction CI gating | Skal | ✅ | ci-pair-gate.js | Trend + regression check |
| Sleeping system | Ja | ✅ | at_sleeping_basic / wake / hash | Efficiency baseline script (sleeping-eff-baseline) |

## 4. Input / Interaction
| Feature | Skal | Er | Tests | Noter |
|---------|------|----|------|-------|
| Mouse placement & validity ghost | Ja | ✅ | Many placement-dependent tests | Ghost validity uses overlap + containment + forbidden polys |
| Mouse spring constraint | Ja | ✅ | at_mouse_spring* | Adaptive stiffness, overshoot clamp, mass scaling |
| Move drag batching | Ja | ✅ | at_move_batching, undo/redo seq | Batches frame moves → single MoveCommand |

## 5. Undo/Redo & Commands
| Feature | Skal | Er | Tests | Noter |
|---------|------|----|------|-------|
| Place/Remove/Rotate/Move commands | Ja | ✅ | at_undo_redo_sequence | Rotate 90° orthogonal swap only |
| Command batching collapse | Ja | ✅ | at_move_batching | Collapses pure MoveCommand batch |
| Stats tracking (usage counts) | Nice | ✅ | goal evaluator uses | Basic counters |

## 6. Metrics / Observability / Hash
| Feature | Skal | Er | Tests | Noter |
|---------|------|----|------|-------|
| Determinism metrics (iterations, contacts) | Ja | ✅ | at24_metrics_diag_hash | Added to hash METRICS segment |
| Diagnostics hash segment (optional flag) | Ja | ✅ | at24_metrics_diag_hash, at_diag_mini_eval | DIAG includes broadphasePairs, optional MSD |
| Mouse spring displacement metric | Ja | ✅ | at_mouse_spring_diag_hash | Appears only when diagnostics enabled |
| Penetration alarm toggle | Ja | ✅ | Manual / HUD | Logs + metric fields |
| Goal / Medal evaluator | Ja | ✅ | goal logic (implicit) | Efficiency tier uses theoretical pairs |
| Sleeping efficiency baseline | Skal (baseline) | ✅ | sleeping-eff-baseline script | Diff tolerance 0.08 |

## 7. Levels / Data
| Feature | Skal | Er | Tests | Noter |
|---------|------|----|------|-------|
| Level JSON schema | Ja | ✅ | levels:validate | Draft-07 schema (LEVEL_SCHEMA.json) |
| Level index pack | Ja | ✅ | manual review | Basic metadata only |
| Runtime loader w/ validation | Skal | ⚠️ | Pending | Validation script exists; runtime integration TODO |
| Extended modes (time_trial, etc.) | Future | ⏳ | - | Schema prepared only in removed alt block (not active) |

## 8. Future / Deferred
| Feature | Skal | Status | Reason |
|---------|------|--------|--------|
| Advanced friction model | Roadmap | ⏳ | Not started |
| Grid snapping flag | Roadmap | ⏳ | UI + placement grid pending |
| Nudge_after_drop | Roadmap | ⏳ | Will integrate with command stack |
| Multi-forbidden polygon runtime enforcement (complex shapes) | Enhancement | ✅ (basic) | Current algorithm conservative (AABB/polygon edges) |

## 9. Gaps / Follow-ups
| Area | Gap | Suggested Next Step |
|------|-----|--------------------|
| Level runtime validation | Not auto-applied on load | Wrap loader: validate → warn/fail |
| Diagnostics spec doc | Needs PHYSICS_SPEC update (6.8) | Add DIAG segment description + oracle example |
| Forbidden polygon perf | Potential O(N*M*E) check | Precompute poly AABBs to early reject |
| Efficiency tiers vs grid activation | Efficiency meaningless w/o grid | Gray out UI when naive |
| Hash stability with future friction | Future change risk | Add friction config to metrics segment if needed |

## 10. Summary
Prototype leverer alle prioriterede observability- og performancefeatures (5.x) samt level schema (6.1) og forbidden polygons (6.2). Åbne centrale næste skridt: dokumentere DIAG segment (6.8), runtime schema-validation (promovere scripts/validate-levels til loader), samt udbygge future gameplay modes.
