# CHANGELOG

Format: Keep a concise, developer-focused log of notable changes. Use semantic-like sections but lightweight (Added / Changed / Fixed / Performance / Tests / Docs).

## [Unreleased]
### Planned
- 6.5 PHYSICS_SPEC opdatering efter friktion + adaptiv konsolidering.
- 6.6 Konsolider legacy constants vs adaptive set.
- 6.8 DIAGNOSTICS afsnit i PHYSICS_SPEC.

### Docs
- Opdaterede versionfelter til 0.2.0 i package.json og README.

## [0.2.0] - 2025-08-24
### Added
- AT5 performance test og stabil pair reduction (~77%).
- CI pair reduction gate (trend + regression) og perf trend rapport script.
- Diagnostics mini-eval (AT5.8) og DIAG hash segment determinism test.
- Sleeping efficiency baseline script.
- Level JSON schema (LEVEL_SCHEMA.json) + validator script.
- Forbidden polygons (AABB vs polygon overlap) + acceptance test.
- IMPLEMENTATION_STATUS matrix dokument.
- CHANGELOG initialiseret.

### Changed
- Broadphase grid fra duplikations-strategi til reel pruning med directional naboer.
- AT5 logning forenklet til deterministisk, synkron output.

### Fixed
- Intermitterende manglende PASS-linje i AT5 ved at reintroducere synkron kørsel og senere simplificeret.
- Undo/redo sekvens stabiliseret (AT6) med korrekt batching flush før rotations/slet.

### Performance
- Spatial hash pruning reducerer par med 65–77% afhængigt af layout.
- Adaptive substeps & iterations scripts rapporterer stabile solver tider.

### Tests
- Udvidet suite: AT5, AT6, AT5.8, forbidden polys, sleeping metrics baseline.

### Docs
- TESTS.md opdateret (tidligere sessioner) og ny IMPLEMENTATION_STATUS.md.

## [0.1.0] - 2025-08-??
### Added
- Initial prototype: world, naive broadphase, solver, adaptive iterations, mouse spring, command stack, HUD metrics.

### Notes
- Version dates approximated; earlier commits før changelog retro-annoteret.

---
Guidelines: For future entries, keep entries short; link to SPEC sections når de oprettes.
