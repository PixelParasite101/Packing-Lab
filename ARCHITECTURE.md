version: 0.2
last_updated: 2025-08-24
status: Draft (authoritative for module boundaries)

# ARCHITECTURE

## 1. Principper
- SOLID: Ét ansvar pr. modul, åbent for udvidelse via interfaces.
- Determinisme: Ingen wall-clock i core; fast dt; seedable RNG (hvis anvendt).
- Separation: Game state (intentions & commands) adskilt fra Physics (numerisk løsning) og Interaction (input oversættelse).
- Testbarhed: Headless step uden rendering for acceptance-tests.
- Extensibility: Nye obstacle-typer eller alternative solver kan introduceres bag interfaces.

## 2. Lag / Pakker
| Layer | Beskrivelse | Afhænger af |
|-------|-------------|-------------|
| interaction | Input events -> Commands / mouse constraint ops | game, physics (kun via interfaces) |
| game | Entities, modes, undo/redo, metrics orchestrering | physics (abstract), levels |
| physics | World stepping, broadphase, narrowphase, solver, sleeping | (ingen højere) |
| render | Canvas tegning af state + HUD | game (read-only), metrics |
| levels | JSON parsing & validation | schema, (ingen afhængighed af game internals) |
| core | Loop, scheduler, event bus | game, physics, render |
| utils | Små helpers (math, timing) | ingen |

Afhængighedsregel: Ingen nedadgående import tilbage op (acyclic). Render må ikke mutere game/physics.

## 3. Modulansvar (kort)
- core/loop.ts: Fixed timestep, accumulator, adaptiv substeps/iterations triggers.
- core/events.ts: Light pub/sub (typed topics) for UI ↔ game.
- game/state.ts: Source-of-truth for pieces, mode, selection, command stack.
- game/commands/*: Place, Move, Rotate, Delete command objekter (execute/undo/redo).
- game/metrics.ts: Samler tidsmålinger, coverage, counts.
- interaction/mouse.ts: Cursor tracking, selection hit test, axis lock, fine drag, create/update mouse constraint target.
- physics/world.ts: Bodies, constraints interface, step(worldSettings).
- physics/broadphase.ts: Spatial hash build + candidate par generering.
- physics/narrowphase.ts: Contact generation (rect-rect, rect-circle, rect-segment) -> contact array.
- physics/solver.ts: PBD position projection + friktionsheuristik + containment.
- physics/sleep.ts: Sleep heuristik (velocity & contact stability) toggle.
- render/canvas.ts: Tegning af arena, obstacles, pieces, ghost, HUD.
- levels/loader.ts: Load + validate level JSON -> LevelConfig.

## 4. Datatyper (skitse)
Type navne i pseudo/TS form:
```
interface Piece { id:string; x:number; y:number; w:number; h:number; rot:0|90; vx:number; vy:number; asleep:boolean; }
interface WorldBody { id:string; invMass:number; pos:{x:number,y:number}; prevPos:{x,y}; size:{w,h}; rot:0|90; flags:number; }
interface Contact { a:string; b:string|null; normal:{x,y}; depth:number; point:{x,y}; }
interface LevelConfig { arena: { outer_circle:{cx,cy,r}; inner_circles:Circle[]; walls:Segment[] }; rules: {...}; goal:{...}; }
interface Metrics { frame:number; dt:number; broadphaseMs:number; solverIters:number; sleepingCount:number; coverage:number; }
```
Mapping: Piece ↔ WorldBody (1:1) via id.

## 5. Flow (frame)
1. Input opsamles (interaction) -> commands queued.
2. core/loop dt accumulator når ≥ fixedDt.
3. For hvert substep:
   a. game apply pending commands (muterer state + spawner/fjerner world bodies).
   b. physics broadphase -> candidatePairs.
   c. narrowphase -> contacts.
   d. solver iterations -> position corrections.
   e. velocities afledes (pos - prevPos)/dt; damping; sleeping check.
4. Efter step: metrics opdateres (coverage, timings).
5. Render læser state + metrics og tegner.

## 6. Adaptiv logik
- Substeps bump (2→3/4) når (contacts/ bodies) > threshold eller aktiv mouse drag.
- Solver iterations bump (12→18) når maks penetration > tolerance efter iteration 10.
- Sleep disable på dragged piece og naboer (kontaktkæde dybde 1).

## 7. Undo/Redo strategi
Command pattern: `{execute(state), undo(state)}`. Move registreres ved drag-end (ikke hver frame) for at minimere stack støj. Rotate/Delete/Place simple objekter. Redo stack ryddes ved ny execute.

## 8. Event Bus (let)
Topics: `pieceSelected`, `modeChanged`, `metricsUpdated`, `levelLoaded`. Minimal; game ikke afhængig af render (render abonnerer).

## 9. Extensibility Points
- Collider interface: `computeAABB()`, `supportPoints()`, `testOverlap(other)`.
- New obstacle types implement collider og registreres i world static list.
- Alternative solver kan implementere `ISolver.step(world, contacts, settings)`.

## 10. Determinisme
- Sort ordering: bodies array stable; contacts sorteres (a.id,b.id) før solve.
- Floating tolerance samlet i constants; ingen brug af Math.random uden seed wrapper.

## 11. Performance Notes
- Reuse arrays: contacts.length=0 reuse buffer.
- Spatial hash buckets reuse vector pools.
- No allocations i per-contact inner loops.

## 12. Testing Hooks
- world.step returnerer metrics snapshot.
- Headless harness kan skabe N pieces i packed line og step for AT2.

## 13. Open / TODO
- Decide forbidden polygon collision method (SAT vs point-in-poly per edge) – OUT OF MVP.
- Implement command batching for multi-place macros (FUTURE).

## 14. Change Control
Arkitekturændringer dokumenteres via ADR. Opdater version & last_updated ved strukturændring.
