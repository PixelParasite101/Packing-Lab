version: 0.5 (cleanup)
last_updated: 2025-08-24
status: Working Backlog

# TODO / Implementation Backlog

Legend: [ ] open  [~] in progress  [x] done  (AT = Acceptance Test)

## Next Focus (Hybrid Pre-Phaser Subset)

Formål: Færdiggør lille stabiliseringspakke (tests + SPEC + hash arkitektur) før Rendering Migration (Priority 9) for at sikre klar baseline og lav regressionsstøj.

Scope (referencer til eksisterende opgaver – ikke duplikere):

Scope (referencer til eksisterende opgaver – ikke duplikere):
- [ ] 7.1a AT: Grid snapping – ghost == final placement + hash stabil
- [ ] 7.2a AT: Nudge-after-drop – displacement ≤ distance; ingen nye overlaps
- [ ] 7.3a AT: Advanced friction – anisotropi & dynamic slip reduction deterministic hash (diag on/off)
- [x] 7.3b SPEC: Anisotrop/dynamic friktionsformel (μ_eff, slipRef, reduction)
- [ ] 7.4a AT: Auto-pack – radial distance reduceret, ingen overlap, deterministic
- [x] 7.4c SPEC: Auto-pack heuristik & determinisme note
- [ ] 8.5 Flag unification builder (test preset: grid+nudge+autoPack+advFric)
- [x] 8.6 Hash extensibility template (skabelon for METRICS/DIAG segment typer)

Implementationsrækkefølge (anbefalet mikrosekvens):

Implementationsrækkefølge (anbefalet mikrosekvens):
1) [x] 8.6 Hash template (letter resten af tests / SPEC referencer)
2) [x] 7.3b & 7.4c SPEC sektioner (dok før tests)
3) [ ] 7.1a / 7.2a / 7.4a acceptance tests (placement suite)
4) [ ] 7.3a friction hash test (bruger hash template)
5) [ ] 8.5 Flag builder – konsolider test setup (refaktor acceptance tests til brug builder)
6) [ ] Snapshot AT24 igen for baseline før Priority 9

Exit-kriterier før start på Priority 9:
- Alle ovenstående markeret [x]
- Hash & metrics golden files opdateret uden uventede diff
- CI grønt (determinism + performance gates uændret)

Efter opfyldt: Start Priority 9 (9.1–9.4) skeleton migration.


## Active Execution Sequence (Recommended Order)
Note: Tal (historiske ID'er) beholdes for sporbarhed; 'Seq#' angiver nuværende anbefalet rækkefølge fremad.
Priority 1 (Tests foundation & correctness micro-sequence):
	[x] 1.1 AT1 automatisering (ghost validitet + placement) overlap==0
	[x] 1.2 AT2 automatisering (push chain) maxPenetration <= tolerance

	-- Mikrosekvens fremad --
	[x] 1.3 Snapshot-determinisme test
	[x] 1.4 Stram AT2 tolerance (0.75 -> 0.60)
	[x] 1.5 AT3 automatisering (center wall glide)
	[x] 1.6 AT4 automatisering (inner hole containment)
	[x] 1.7 Stram AT2 tolerance (0.60 -> 0.50)
	[x] 1.8 Penetration fail-fast alarm (>2*tol abort)
	[x] 1.9 Adaptiv iterations & substeps triggers (kontakt densitet & maxPenetration)
	[x] 1.10 Adaptiv substeps implementering (kontakt densitet & drag) + integrationstest
	[x] 1.11 Iteration sekvens flag i determinisme-hash (`trackIterationSequence`)
	[x] 1.12 Spatial hash flag (parity) → efterfulgt af pruning
	[x] 1.13 Udvidet determinisme hash (metrics extension)
	[x] 1.14 Deterministisk adaptive mode (overrides aktiveret; AT24A hash stable)
	[x] 1.15 AT24A – adaptive iteration sequence i hash stabil (relativ tæller)
	[x] 1.16 Metrics baseline snapshots (golden files)
	[x] 1.17 Mini-evals i CI pipeline (npm run ci)
	[x] 1.18 Forfin Case6 alarm mini-eval
	[x] 1.19 Substeps determinisme eval
	[x] 1.20 Performance måling efter substeps (iteration & substep cost)

Priority 2 (Performance core):
	[x] 2.1 Spatial hash pruning (cell-baseret reduktion af par) + AT overlap==naive + reduktionsratio
	[x] 2.2 Broadphase performance benchmark integration (naive vs grid)
	[x] 2.3 Fjern brute-force fallback i GridBroadphase (ren pruning m. 8-neighbor indsættelse)
	[x] 2.4 Minimum pairReduction% (>=5%) i pruning test
	[x] 2.5 Diagnostisk hash flag (broadphasePairs)
	    NOTE: Skal ikke ændre default hash; kun aktivt når flag enableDeterminismDiagnostics() bruges.
	[x] 2.6 Sleeping-system SPEC (minLinearVel, minAngularVel, framesStill, wakeTriggers)
	[x] 2.7 Sleeping-system IMPLEMENTATION (flag `enableSleeping`, unit + determinisme test)
	[x] 2.8 Sleeping-system WAKE heuristik (kontakt-pen trigger, direkte drag) + tests
	[x] 2.9 Sleeping-system OBS metrics (sleepingCount, wakesPer1000f) i metrics snapshot
	[x] 2.10 Sleeping-system determinisme test (hash uændret med/uden sleeping enabled)
	[ ] 2.X (Arkiv) Broadphase optimering – historik (ikke længere aktiv)

Priority 3 (Physics polish & stability):
	[x] 3.1 Friktionsheuristik (tangential korrigering)
	[x] 3.2 Adaptiv iterations & substeps triggers (se aktiv sekvens)
	    (Penetration alarm allerede dækket i 1.8 – ikke gentaget)

Priority 4 (Extended correctness & UX):
	[ ] 4.1 Containment ved diameter-ændring (re-solve + flag out-of-bounds)
	    - [x] 4.1a SPEC: definér trigger (ændring i outerRadius), deterministisk rækkefølge (sorter entities by id)
	    - [x] 4.1b BESLUT OUTPUT: Valgt reposition som default; fallback `outOfBounds` kun hvis fysisk umuligt (diagonal/2 > radius)
	    - [x] 4.1c IMPLEMENTATION: containmentPass(world, newRadius) + id-sorteret loop
	    - [x] 4.1d TESTS: (i) ingen ændring (done i at_containment_shrink) (ii) shrink reposition (done) (iii) hash stabil sekvens + outOfBounds fallback (at_containment_shrink_hash)
	    - [x] 4.1e CLEANUP: ingen midlertidig flag tilbage; tilføjet `outOfBoundsCount` metric + SPEC opdateret
	[x] 4.2 Mouse constraint fjeder-dæmper (spring-damper constraint, acceptance test at_mouse_spring)
	    - [x] 4.2a Spring overshoot clamp (velocity cap / critically damp near target) (at_mouse_spring_refine)
	    - [x] 4.2b Adaptiv stiffness (k reduceres når distance < threshold for blød landing) (at_mouse_spring_adaptive)
	    - [x] 4.2c UI/config eksponering af stiffness & damping (runtime tuning) (HUD sliders + select)
	    - [x] 4.2d Diagnostic metric: mouseSpringDisplacement i diag-hash (flag only) (at_mouse_spring_diag_hash)
	    - [x] 4.2e Masse-skalering (mouse spring massScaling, referenceMass, massPower) (AT: at_mouse_spring_mass_scaling)
	    - [x] 4.2f UI: Sliders/toggle for massScaling (referenceMass, massPower) + live HUD echo
	    - [x] 4.2g Diagnostic hash: valgfri MSDm komponent (mass scaling active flag / refMass,power) – kun når diagnostics flag aktiv (AT: at_mouse_spring_diag_mass)
	[x] 4.3 MoveCommand batching (drag end aggregation) (AT: at_move_batching)

Priority 5 (Observability & Goals):
	[x] 5.1 HUD performance metrics (broadphaseMs, narrowphaseMs, solverMs, penetration & pairReduction%)
	    ↳ Udvid: vis også pairReduction% når spatial hash aktiv (efter 2.3/2.4)
	[x] 5.2 Logging toggle / dev instrumentation flag (enableDevLogging + HUD checkbox)
	[x] 5.3 Penetration alarm helper + doc (HUD toggle + SPEC §17)
	[x] 5.4 Medal & goal evaluation modul (GoalEvaluator + HUD tiers)
	[x] 5.5 AT5 performance test (300 brikker)
	[x] 5.6 AT6 undo/redo sekvens test
	[x] 5.7 Determinisme hash inkluderer metrics (totalIterations, finalContactCount) (duplikat af 1.13 – bevares her af hensyn til observability)
	[x] 5.8 Diagnostics hash mini-eval (Case10) – verificér DIAG segment deterministic og fraværende når flag off
	[x] 5.9 CI gating af pairReduction% (trend check mod baseline + min threshold) – fail hvis < konfigureret margin i 3 på hinanden følgende runs
	[x] 5.10 Perf trend rapport (glidende median over sidste N snapshots) output til console + optional JSON
	[x] 5.11 Sleeping efficiency baseline (gennemsnitlig sleepingRatio over N frames) – sammenlign mod senere tuning (Deferred)

Priority 6 (Data & Validation):
	[x] 6.1 Level loader + schema validering mod LEVEL_SCHEMA.json
	[x] 6.2 Forbidden polygons support / marker TODO
	[x] 6.3 IMPLEMENTATION_STATUS.md (skal vs er matrix)
	[x] 6.4 CHANGELOG.md init
	[x] 6.5 Opdatér PHYSICS_SPEC efter friktion + adaptiv system
	[x] 6.6 PHYSICS_SPEC konsolider legacy constants (12/18) vs adaptive (16/32/64)
	[x] 6.7 Metrics snapshot baseline JSON (golden files) + diff tool
	[x] 6.8 DIAGNOSTICS afsnit i PHYSICS_SPEC (beskriv metrics- og diag-hash segmenter + orakel O10 reference)
	[x] 6.9 GLOSSARY udvidelse: Sleeping, SleepThreshold, WakeImpulse, Diagnostic Hash

Priority 7 (Future / Roadmap polish):
	[x] 7.1 Grid snapping (flag)
	[x] 7.2 Nudge_after_drop
	[x] 7.3 Advanced friction (anisotrop / dynamic μ)
	[x] 7.4 Auto-pack nudge (Roadmap v0.8)
	[ ] 7.5 Fine rotation 5° mode
	[ ] 7.1a AT: Grid snapping – ghost vs final placement position match + hash stable
	[ ] 7.2a AT: Nudge-after-drop – displacement ≤ configured distance; zero new overlaps
	[ ] 7.3a AT: Advanced friction – anisotropi & dynamic slip reduction deterministisk hash (diag flag on/off)
	[ ] 7.3b SPEC: Detaljeret afsnit om anisotrop/dynamic friktionsformel (μ_eff beregning, slipRef, reduction)
	[x] 7.3b SPEC: Detaljeret afsnit om anisotrop/dynamic friktionsformel (μ_eff beregning, slipRef, reduction)
	[ ] 7.4a AT: Auto-pack – radial distance reduceret uden overlap; deterministisk resultat
	[ ] 7.4b METRIC: autoPackDistanceSaved (akkumuleret & pr placement) + HUD visning (valgfrit)
	[ ] 7.4c SPEC: Auto-pack heuristik (greedy center drift, stop-betingelser, determinisme note)
	[x] 7.4c SPEC: Auto-pack heuristik (greedy center drift, stop-betingelser, determinisme note)
	[ ] 7.X UX: Saml Nudge + AutoPack i fold/fieldset ("Placement polish")
	[ ] 7.X Perf Eval: Mål gennemsnitlig solver iteration ændring når AutoPack aktiv vs inaktiv (baseline 200 placeringer)

Priority 8 (Flag lifecycle / dekompleksitet):
	[ ] 8.1 Flag audit (klassificér: Permanent, Experimental, Kandidat til fjernelse) – output i IMPLEMENTATION_STATUS.md (Nice-to-have)
	[ ] 8.2 Sunsetting plan for trackIterationSequence (overvej automatisk aktivering i test-mode) 
	[ ] 8.3 Konsolider metrics + diagnostics enable til én builder-funktion (chained API) uden at ændre eksisterende API (backward compat)
	[ ] 8.4 ECO vurdering: om spatial hash skal gøres default efter ≥ X stabile pruning-gains
	[ ] 8.5 Flag unification: Builder-funktion der aktiverer (grid,nudge,autoPack,advFric) i en deterministisk preset til tests
	[ ] 8.6 Hash extensibility plan: dokumentér skabelon for nye METRICS/DIAG segmenter (reduces fremtidig friktion)
	[x] 8.6a IMPLEMENTATION: hashTemplate.js (segment politik + builder)
	[ ] 8.7 Packing efficiency metric: radial density profil (ring bins) → brug i goal evaluator (later)

Priority 9 (Rendering / Engine Migration – Phaser inkrementel indførsel):
	[ ] 9.1 Dependency + skeleton: Tilføj phaser til devDependencies, opret `src/boot.js` + `src/scene/PackingScene.js`
	[ ] 9.2 Integrér eksisterende fixed-step world loop i Scene.update (bevar deterministisk akkumulering)
	[ ] 9.3 Input adapter: Map Phaser pointer events til nuværende MouseController (eller erstat controller med scene-native)
	[ ] 9.4 Transitional rendering: Brug direct 2D context via `this.game.canvas` (ingen visuelle ændringer) – baseline hash/perf capture
	[ ] 9.5 Refaktor bricks til Phaser Graphics / Rectangle GameObjects (pooling) – mål draw cost ændring
	[ ] 9.6 Ghost rendering migration (alpha Graphics)
	[ ] 9.7 Performance baseline (før migration): gem ms samples + memory snapshot (perf:trend script udvidelse) => baseline_phaser_pre.json
	[ ] 9.8 Performance post-migration (efter 9.5) – sammenlign mod baseline (Δ broadphaseMs, narrowphaseMs, solverMs, frame total)
	[ ] 9.9 Determinisme verifikation: hash før/efter migration identisk for AT24 scenarie (uden rendering-intern jitter)
	[ ] 9.10 Feature flag: `RENDER_MODE=legacy|phaser` (miljø / query param) for hurtig rollback
	[ ] 9.11 Fjern gammel `main.js` loop efter stabilisering + opdater index.html til boot.js
	[ ] 9.12 ARCHITECTURE.md afsnit: "Rendering Layer Abstraction" (scene lifecycle, world isolation)
	[ ] 9.13 PHYSICS_SPEC note: rendering pipeline ændrer ikke solver timing; dokumentér adskillelse
	[ ] 9.14 Acceptance test: headless determinism via stubbing Phaser (eller bypass når RENDER_MODE=legacy) – bevar test runtime
	[ ] 9.15 Metrics integration: eksponér frame render cost (renderMs) fra Phaser tidsstempler
	[ ] 9.16 Memory watch: enkel sampler (hver N frames) – detect stigning efter GameObject reuse (pool sanity)
	[ ] 9.17 Input latency måling (pointerdown timestamp -> world update anvendt) – log i DevLog når dev mode
	[ ] 9.18 Cleanup: slet ubrugte canvas referencer / global ctx / requestAnimationFrame kald
	[ ] 9.19 Packaging: opdater README med "Phaser optional" og hvordan man toggler
	[ ] 9.20 Risk rollback plan dokument (kort) + kriterier for at slå legacy helt fra
	[ ] 9.X OffscreenCanvas feasibility (kun hvis CPU bound efter migration)
	[ ] 9.X WebGL batching test (antal bricks > 1000) – tracer for hvornår avanceret batching aktiveres
	[ ] 9.X Code splitting: lazy load Phaser kun ved RENDER_MODE=phaser (dynamic import) – reducer initial payload
	[ ] 9.X Visual polish backlog placeholder (skygger, highlights) – først når performance mål opfyldt

## Completed / In Progress Core
[x] C1 Containment constraints (outer + inner circle + center wall) – forbidden polys pending
[x] C2 Deterministisk kontakt-sortering & pre/post penetration metrics
[x] C3 Friktionsheuristik

## Notes
Hint:
- Opdater status til [x] ved merges (valgfrit: link commit hash)
- Acceptance tests i samme PR som funktionalitet hvor muligt
- Ydelsesmål måles headless + sanity i browser

Arkiv / Historik noter (ikke længere aktive opgave-formuleringer) findes i commit-historik.

# Agent Instructions
- Læs `todo.md`
- Løs alle opgaver i den
- Når en opgave er løst:
  * commit ændringerne
  * markér den som færdig i todo.md
- Gentag indtil der ikke er flere åbne opgaver.
