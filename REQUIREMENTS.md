version: 0.2
last_updated: 2025-08-24
status: Draft (authoritative for scope & rules)

# REQUIREMENTS

## 1. Scope
Browser-baseret 2D pakkespil (MVP) hvor identiske rektangler (120×80 mm default) placeres/editeres i en cirkulær arena med valgfri interne forhindringer. Fokus: deterministisk fysik (PBD), høj tæthed uden overlap, responsiv interaktion og målbar performance.

Ikke-mål (ekskluderet i MVP): fri rotation >90° steps, touch/mobil UI, netværk, persistens, auto-pack algoritmer, multiplayer.

## 2. Glossary (kort)
- Ghost piece: Visual preview af potentiel placering.
- Coverage: (antal * rectArea) / (arenaAvailableArea).
- ArenaAvailableArea: Outer circle area minus huller (indre cirkler + forb. polygons).
- Valid placement: Ingen overlap, fuldt inde i outer circle, ikke kryds med obstacles.
- Obstacle: inner circle, wall segment, forbidden polygon (poly senere, ikke i første gameplay iteration hvis ikke implementeret endnu).

## 3. Functional Requirements (FR)
FR1 Ghost følger cursor i Place-mode og farvekoder validitet (grøn/rød).
FR2 Placering med venstreklik hvis valid; afvisning hvis invalid (ingen state mutation).
FR3 Edit-mode: klik selekterer brik; visuel markering af selection.
FR4 Drag i Edit-mode anvender mouse-constraint og påvirker andre brikker via fysik.
FR5 Rotation (R) toggler mellem 0° og 90° for valgt brik (hvis rotation policy orthogonal).
FR6 Delete fjerner valgt brik (Undo-kompatibelt).
FR7 Mode-toggle (M) skifter mellem Place og Edit.
FR8 Undo/Redo dækker: place, move (drag end position), rotate, delete.
FR9 Coverage beregnes live og vises i HUD.
FR10 HUD viser: diameter, rect size, piece count, coverage %, FPS/debug counters.
FR11 Obstacles: system understøtter outer circle (obligatorisk), optional inner circles, optional walls (segments).
FR12 Collision-free guarantee: Ingen vedvarende overlap efter solver step.
FR13 Diameter-ændring (hvis UI implementeres) re-kontainer alle brikker eller flagger dem (ingen silent invalid state).
FR14 Sleeping: Brikker med lav kinetik går i sleep og vækkes ved kontakt eller drag.
FR15 Level loader parser JSON og validerer mod `LEVEL_SCHEMA.json`.
FR16 Medals (coverage thresholds) kan læses fra `levels/index.json` (display valgfrit i tidlig MVP).
FR17 Deterministisk stepping: Samme inputs → samme state progression.
FR18 Performance instrumentation (metrics module) eksponerer broadphase tid og step tid.
FR19 Mouse modifiers: Shift = axis lock (dominerende akse), Alt = fine drag (reduceret max pull speed).
FR20 Rotation hotkey ignoreres hvis level.rules.rect.rotation == locked_0.
FR21 Grid snapping (valgfrit flag) efter drop (kan udskydes; hvis ikke implementeret markeres som FUTURE).
FR22 Nudge_after_drop (hints) udfører lille positionel forbedring (FUTURE; placeholder no-op tilladt i MVP).

## 4. Non-Functional Requirements (NFR)
NFR1 Performance: ≥50 FPS med 300 brikker (desktop), broadphase < 2 ms/frame @200 brikker.
NFR2 Respons: Input-to-visual latency < 1 frame i typiske scenarier.
NFR3 Determinisme: Ingen brug af wall-clock i simulation core; RNG (hvis brugt) seedable.
NFR4 Modularity: Ingen cirkulære afhængigheder; hvert modul maks ét ansvar.
NFR5 Code Quality: Overholder coding standards; ingen magic numbers i hot loops uden konstantsamling.
NFR6 Stability: Drag af én brik ind i tæt række må ikke skabe jitter (penetration < 0.1 mm transient < 2 frames).
NFR7 Memory: Ingen ubegrænset vækst i allokationer per frame (reuse buffers i hot path).
NFR8 Observability: Metrics udstiller min/avg/max step, solver iterations, sleeping counts.

## 5. Acceptance Test Mapping
AT1 Placement validity & ghost → FR1, FR2, FR12, FR17
AT2 Push chain (10 brikker) → FR4, FR12, NFR6
AT3 Center wall glide → FR11, FR4, FR12
AT4 Inner hole containment → FR11, FR12
AT5 Performance (300) → NFR1, NFR2, NFR7
AT6 Undo/Redo sequence → FR8, FR2, FR4, FR6, FR5
Supplement Diameter change → FR13
Supplement Sleeping → FR14
Supplement Snapping → FR21 (FUTURE if not yet active)

## 6. Constraints & Policies
- Physics backend: Custom PBD (no external physics libs).
- Units: 1 px == 1 mm (consistency).
- Time: Fixed dt=1/60; adaptiv substeps (2–4) og iterations (12–18).
- Data immutability: High-level commands mutate via state module; physics muterer kun body position/velocity internt.

## 7. Derived Metrics (definitions)
- coverage = (pieces * rect_w * rect_h) / (π*r_outer^2 - Σ π*r_inner^2 - forbiddenPolyArea)
- fps_estimate = 1 / avg(actual_frame_time)
- broadphase_ms = timing(spatial hash build + pair gen)

## 8. Open / TODO
- FUTURE: Grid snapping FR21 (flag afhænger af hints.snap true)
- FUTURE: Nudge after drop FR22
- TODO: Precise forbidden polygon overlap test (initial levels empty list)
- TODO: Medal display logic

## 9. Change Control
Ændringer her kræver opdatering af version og relevant ADR hvis arkitektur påvirkes.

