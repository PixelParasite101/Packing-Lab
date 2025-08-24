version: 0.4
last_updated: 2025-08-24
status: Draft (authoritative for physics behaviour)

# PHYSICS SPEC

## 1. Metode
Position-Based Dynamics (PBD). Fast dt = 1/60 s. Adaptiv substeps (2 normal, 3–4 ved høj kontakt / drag). Iterationer 12 normal, op til 18 hvis penetration ikke konvergerer.

Mål: Stabil collision resolution for tæt pakkede ortogonale rektangler uden numerisk eksploderende hastigheder.

## 2. Entities & Enheder
- Enhed: 1 px = 1 mm.
- Body fields (minimum): `pos{x,y}`, `prevPos{x,y}`, `invMass`, `w,h, hw,hh`, `rot(0|90)`, `asleep`.
- Statics: `invMass = 0`.

## 3. Broadphase
Spatial hash
- cellSize = max(rect.w, rect.h) (120 initialt) — kan justeres runtime.
- Insert alle dynamiske body AABBs (ingen rotations-offset ved kun 0/90°).
- Output: kandidat-par id-sorteret for determinisme.

Performance mål: < 2 ms ved 200 brikker på typisk desktop (≈ mid-range CPU).

## 4. Narrowphase
Kun aksejusterede rektangler i MVP.
Algorithm:
```
if |dx| > hwA + hwB -> no hit
if |dy| > hhA + hhB -> no hit
penetrationX = (hwA + hwB) - |dx|
penetrationY = (hhA + hhB) - |dy|
axis = min(penetrationX, penetrationY)
normal = sign along chosen axis (from A to B)
```
Containment tests mod cirkel / indre cirkler sker separat (ikke narrowphase par, men constraints pr. hjørne).

Fremtidige former: rect-circle, rect-segment (Designet til at kunne tilføjes uden at ændre eksisterende rect-rect kode).

## 5. Constraints & Solver
PBD loop per iteration:
1. For hver kontakt: normal projektion (penetrationskorrektion) fordelt efter invMass (statisk får fuld push, ellers halv-halv heuristik).
2. Friktion (IMPLEMENTERET 3.1): heuristisk tangential positionel reduktion proportional med normalCorrection * μ (μ=0.5 default).
3. Containment per hjørne (outer circle + optional inner hole) danner ekstra constraints mod statisk miljø (id=0). Kun dybeste inner-hole hjørne anvendes for effektivitet.

Normal-korrektion (enkelt kontakt):
```
if (a.invMass==0 || b.invMass==0)
   normalCorr = depth / (a.invMass + b.invMass)
else
   normalCorr = (depth / (a.invMass + b.invMass)) * 0.5 // del ligeligt
normalCorr = clamp(normalCorr, 0, 20) // MAX_STEP værn
A.pos -= n * normalCorr * a.invMass
B.pos += n * normalCorr * b.invMass
```

Tangential friktion (heuristisk – position-level):
```
t = perpendicular(n)
relT = dot( (B.pos - A.pos), t )
maxT = normalCorr * μ
tCorr = clamp(|relT|, 0, maxT)
retning = -sign(relT)
A.pos -= t * tCorr * a.invMass
B.pos += t * tCorr * b.invMass
```
Bemærk: Ingen akkumuleret tangent impulse; dette er en single-pass slip-dæmper der empirisk reducerer side-glid i tætte rektangel-klynger uden at kompromittere determinisme.

Iterér solverIterations gange (iterations adaptiv – se §9). Stop-kriterie tidlig exit er ikke implementeret (bevidst for deterministisk iterationssekvens); penetrationsalarm (§17) anvendes i stedet som fail-fast.

## 6. Velocity & Damping
Efter alle position updates:
```
vel = (pos - prevPos) / dt
vel *= velDamping (0.98)
prevPos = pos
```
Ingen eksplisitte accelerations-integrator (semi-implicit) – vi driver alt via constraint korrektioner.

## 7. Mouse Constraint
Pseudo-hook (FUTURE detaljer):
```
force = k*(targetPos - body.pos) - d*vel
clamp force magnitude by maxPullSpeed
translate to positional goal next substep
```
MVP simplificeret: direkte position set under drag (non-physical) men roadmap: erstat med spring-damper for bedre kæde-push realisme.

## 8. Sleeping (SPEC)
Status: Designspecificeret (implementation bag flag `enableSleeping()` – ikke aktiv som default).

Mål:
- Reducere solver workload ved at udelade fuldt konvergerede (statiske) brikker.
- Bevare determinisme (samme scene + flag-state => identisk sleeping-mønster).

State Felter:
- `asleep: boolean` (default false)
- `sleepFrames: number` (akkumulerer på hinanden følgende "stille" frames)
- (afledt) "stille" = lav lineær hastighed OG lav positionskorrektion seneste frame.

Parametre (initial forslag – kan tunes):
```
SLEEP_MIN_LINEAR_VEL = 0.05   // mm/s (|vel| under dette tæller som stille)
SLEEP_MIN_CORRECTION = 0.02   // mm (maks total normal-korrektion på body i frame)
SLEEP_FRAMES_REQUIRED = 30    // consecutive stille frames før sleep
WAKE_LINEAR_VEL = 0.08        // overskrides → wake
WAKE_CORRECTION = 0.04        // single frame correction > dette → wake
WAKE_CONTACT_PEN = 0.20       // kontakt penetration over dette når modpart er awake → wake
WAKE_DRAG_IMMEDIATE = true    // direct user drag → wake instantly
MAX_SLEEPING_RATIO = 0.85     // sikkerhed: hvis >85% sover og maxPen> tolerance*1.5 → halvdel vækkes (anti deadlock)
```

Eligibility (pr frame efter solver):
```
if body.invMass == 0 => aldrig sleep (statics markeres implicit stille men flagges ikke)
if body.asleep: skip accrual (already sleeping)
linVel = |(pos - prevPos)| / dt
if linVel < SLEEP_MIN_LINEAR_VEL AND frameCorrection < SLEEP_MIN_CORRECTION:
      body.sleepFrames++
      if body.sleepFrames >= SLEEP_FRAMES_REQUIRED: body.asleep = true
else:
      body.sleepFrames = 0
```

Solver Shortcut:
- Broadphase og narrowphase kører stadig (billig), men i solver:
   - Hvis begge bodies asleep: kontakt springes over.
   - Hvis én awake og én asleep: den sovende kan blive vækket via wake-heuristik hvis corrections overstiger wake-thresholds.

Wake Triggers:
1. User drag på body.
2. Kollision med awake body hvor (penetration > WAKE_CONTACT_PEN) eller normalCorrection > WAKE_CORRECTION.
3. Akkumuleret lineær hastighed > WAKE_LINEAR_VEL (fx efter indirekte skub).
4. Forced global wake (anti deadlock) hvis MAX_SLEEPING_RATIO overskredet og systemets maxPenetration ikke konvergerer.

Determinisme Sikring:
- Alle thresholds faste, ingen random.
- Prototype implementering bruger kun allerede deterministisk data (positions, korrektioner).
- Sleep beslutning tages efter hele iteration-loopen men før velocity damp; indflydelse på næste frame er dermed deterministisk.

Metrics (tilføjes når implementation > 0):
- `sleepingCount` (antal asleep bodies)
- `wakesThisFrame` / `wakeEventsTotal`
- `sleepingRatio` (sleepingCount / dynamiske bodies)

Hash / Diagnostik:
- Sleeping påvirker ikke determinisme-hash direkte (positions ændres ikke ved state flip).
- Diagnostics extension kan (senere) inkludere `SLEEP:sleepingCount` når `enableDeterminismDiagnostics` er aktiv – kræver Orakel opdatering.

Testkrav (for senere AT):
1. En isoleret body uden påvirkning => går asleep efter SLEEP_FRAMES_REQUIRED.
2. Lidt bevægelse < thresholds over 2*SLEEP_FRAMES_REQUIRED => stadig asleep (stabilitet).
3. Awake body skubber sleeping body med korrektion > WAKE_CORRECTION => sleeping body vågner næste frame.
4. Massesleep deadlock scenario (≥90% sover + høj penetration) => auto partial wake aktiveres.
5. Flag off => ingen bodies får `asleep=true` over samme sekvens.

Fremtidig Udvidelse:
- Angular komponent (når rotation > 90° implementeres) med separat vinkel-threshold.
- Prioriteret solver-order: løse alle awake kontakter først.

Anti-mål:
- Kompleks heuristik med læring / tidsvinduer på tværs af sessions.
- Force-sleep midt i høj korrektion (kan skabe penetrationsspikes). 

Implementation Outline (pseudo):
```
function postSolveFrame(world){
   for b in world.dynamicBodies:
      if !sleepingEnabled: continue
      if b.invMass==0: continue
      if b.asleep: continue // wake handled elsewhere
      linVel = length(b.pos - b.prevPos) / dt
      if linVel < SLEEP_MIN_LINEAR_VEL && b.lastFrameCorrection < SLEEP_MIN_CORRECTION:
            b.sleepFrames++
            if b.sleepFrames >= SLEEP_FRAMES_REQUIRED: b.asleep = true
      else:
            b.sleepFrames = 0
}
```

## 9. Adaptiv Iterationer & Substeps
Status (2025-08-24): Både adaptiv iterations-heuristik OG adaptiv substeps (2..4) er implementeret.

### 9.1 Iterationer (uændret fra tidligere udgave, recap)
Parametre (se §15 for tabel): minIter/baseIter/maxIter = 16/32/64, step ±8, penetrationHigh 0.80 mm, penetrationLow 0.15 mm, contactHigh 60, consecutiveLowNeeded 12, coolDownFrames 6, anomalySuspendFactor 0.5.

Heuristik (iterationer):
```
pen = metrics.preMaxPenetration
cc  = metrics.contactCount
if (pen > penetrationHigh || cc > contactHigh) escalate()
else if (pen < penetrationLow) maybeDownscaleAfterStreak()
else resetLowCounter()
anomalyCheck(pen)
freezeAfterFirstEscalation? (test-mode)
```

### 9.2 Substeps (ny implementering)
Konfiguration (default ved enableAdaptiveSubsteps):
```
base=2, max=4, current=2
contactDensityHigh=1.5   // contacts per entity
contactDensityLow=0.6
penetrationBoostThreshold=20 // mm (preMaxPen)
dragDisplacementHigh=2.0 // px (max body pos delta frame-til-frame)
consecutiveLowNeeded=10
coolDownFrames=8
```
Måling inden frame:
- density = contactCount / entityCount
- pen = preMaxPenetration (fra forrige tick)
- maxDisp = max |Δpos| for alle bodies siden forrige frame (lagrer tidligere positionssnapshot)

Escalation-betingelser:
```
if density > contactDensityHigh || pen > penetrationBoostThreshold || maxDisp > dragDisplacementHigh:
   if current < max: current++, lowCounter=0, coolDown=coolDownFrames
```

Nedskalering:
```
if density < contactDensityLow AND pen < penetrationBoostThreshold/2:
   lowCounter++
   if lowCounter >= consecutiveLowNeeded && coolDown==0 && current > base:
       current--, lowCounter=0
else lowCounter=0
if coolDown>0: coolDown-- (decrement per frame)
```

Brug:
Antal substeps `steps = adaptiveSubsteps.current` (ellers fallback til fixed `substeps` = 2). Hvert substep kører fuld tick med `dt/substeps` → glatter hurtige interaktioner (især ved drag og høj kontakt-densitet) og reducerer overshoot.

Determinisme:
- Ingen randomness; stateful counters alene.
- Sekvens logging (`trackSubstepSequence`) kan aktiveres til determinisme tests (hash orakel). Log format: `frame:up:3` / `frame:down:2`.

Performance Overhead:
- Substeps øger solver- og broadphase-kald lineært; heuristikken begrænser ophold i max=4 til perioder med høj densitet / drag.

Interplay med Iterationer:
- Iterationer eskalerer på penetration / constraint-densitet; substeps eskalerer på tæthed + store per-frame forskydninger (drag) og meget høj pen.
- Systemerne er uafhængige; begge kan eskalere samme frame og kumulativt øge compute.

Fremtidige overvejelser:
- Freeze-first-escalation variant for substeps (paritet med iterationer) til deterministisk bench.
- Integreret energi / stability score i stedet for maxDisp.

## 10. Determinisme
- Sort bodies by stable id på hver frame init (eller aldrig mutate rekkefølge efter push/pop).
- Sort contacts lexicografisk (a.id,b.id) før solve.
- Ingen floating random jitter.
- Tidsintegration uafhængig af real wall-clock: brug fixed dt accumulator.

## 11. Metrics Hooks
Eksponer:
- `broadphaseMs`, `narrowphaseMs`, `solverMs` (målt med performance.now, kun i dev build).
- `maxPenetration` sidste frame.
- `sleepingCount`.

## 12. Edge Cases
- Thin slots: Forhøjet iterationer; hvis ikke konvergerer → fallback til hard clamp (begræns maxPenetration i HUD debug).
- Diameter shrink: Kør containment pass på alle bodies; hvis ikke plads → flag piece (FUTURE removal prompt).
- Overlapping spawn (user drop) håndteres samme frame via solver (alternativ: pre-check i game state – faktisk implementeret → forebygger alvorlig penetration).

## 13. Future Extensions (ikke i MVP)
- Anisotrop friktion.
- Continuous collision (TOI) ved høje hastigheder (måske irrelevant pga lavt tempo).
- Rotational inertia & fri rotation (kræver separat orientation felt og angular solver).

## 14. Constants (centraliseret – Task 6.6)
Kilde: `src/physics/constants.js`

Runtime anvender adaptive værdier; legacy beholdes kun til historiske testcases.

Iter / Substeps:
```
LEGACY_ITER_BASE = 12
LEGACY_ITER_MAX  = 18
ADAPTIVE_MIN_ITER = 16
ADAPTIVE_BASE_ITER = 32
ADAPTIVE_MAX_ITER = 64
BASE_SUBSTEPS = 2
MAX_SUBSTEPS  = 4
```
Fysiske / heuristik grænser:
```
FRICTION_COEFF = 0.5
VEL_DAMPING = 0.98
PENETRATION_TOL = 0.05
MAX_CONTACT_DEPTH = 50
MAX_NORMAL_CORRECTION = 20
```
Sleeping:
```
SLEEP_MIN_LINEAR_VEL = 0.05
SLEEP_MIN_CORRECTION = 0.02
SLEEP_FRAMES_REQUIRED = 30
WAKE_LINEAR_VEL = 0.08
WAKE_CORRECTION = 0.04
WAKE_CONTACT_PEN = 0.20
MAX_SLEEPING_RATIO = 0.85
```
Alle værdier eksporteres også samlet som `PhysicsConstants` for UI / debug introspection.

## 15. Adaptive Solver Parameters (Documentation Extract)

| Parameter | Current | Rationale |
|-----------|---------|-----------|
| minIter | 16 | Minimum konvergens baseline uden overforbrug |
| baseIter | 32 | Startpunkt når adaptive aktiveres |
| maxIter | 64 | Loft før diminishing returns |
| stepSize | 8 | Jævne spring for CPU stabilitet |
| penetrationHigh | 0.80 mm | Hurtig reaktion på dybe overlap |
| penetrationLow | 0.15 mm | Definerer “rolig” zone |
| contactHigh | 60 | Indikator for tæt pakning |
| consecutiveLowNeeded | 12 | Hysterese mod oscillation |
| coolDownFrames | 6 | Ventetid efter eskalering |
| depthClamp | 50 mm | Numerisk sikkerhed (cap) |
| correctionClamp | 20 mm | Maksimal pr-kontakt justering |
| anomalySuspendFactor | 0.5 | Stop adaptiv ved ekstreme anomalier |

Tuning guidelines:
- Hvis >20% af frames når maxIter: enten hæv maxIter eller sænk penetrationHigh.
- Hvis hyppig “sawtooth” mellem to nabo-niveauer: øg consecutiveLowNeeded eller coolDownFrames.
- Hvis adaptiv for sjældent eskalerer i tæt klynge: sænk contactHigh.
- Hvis performance kritisk: sænk maxIter og stepSize (8→4) og mål effekt på penetration metrics.

VEL_DAMPING = 0.98
FRICTION_COEFF = 0.5 (heuristic)
PENETRATION_TOL = 0.05
WAKE_VEL = 0.05
WAKE_PCORR = 0.02
SLEEP_FRAMES = 30

## 16. Diagnostics & Determinisme Hash (Task 6.8)
Snapshot hash anvendes i tests (AT24, AT24A, 5.8 mini-eval) til at verificere determinisme.

### 16.1 Baseline Snapshot Indhold
Del-listen ("parts") der hashes (FNV-1a 32-bit) består af:
1. Body entries: `B:id:x:y:rot` for hver dynamisk body i stabil id-rækkefølge.
2. (Optional) Adaptive iteration sekvens: kun når flag `trackIterationSequence` aktiv i adaptive overrides (AT24A). Format: `ITERSEQ:0:32|1:40|...` (intern implementering bruger `index:iterations`).

Hash beregning: start `h=2166136261`, for hvert tegn `h ^= charCode; h = (h * 16777619) >>> 0`. Output hex uden padding.

### 16.2 METRICS Segment
Aktiveres via `enableDeterminismMetrics()`. Appender én part:
```
METRICS:totalIterations,finalContactCount
```
Disse summer/ends-of-frame er deterministiske givet identisk simulation og adaptive sekvens (eller dens freeze). Bruges i hash-tests (5.7 / 1.13).

### 16.3 DIAG Segment
Aktiveres kun når både `enableDeterminismMetrics()` OG `enableDeterminismDiagnostics()` er kaldt. Appender part:
```
DIAG:broadphasePairs[,MSD=<mouseSpringDisplacement>][,MSDm=<refMass:power>]
```
Felter:
- `broadphasePairs`: antal kandidat-par før solver.
- `MSD` (valgfri): akkumuleret musespring displacement (afrundet 3 decimaler) når spring aktiv.
- `MSDm` (valgfri): mass scaling config `ref:power` kun når massScaling flag på musespring er aktiv.

Segmentet er garanteret fraværende når diagnostics flag ikke er aktivt (valideret i AT5.8 og 4.2d/g tests). Base-hash (uden DIAG) forbliver det samme mellem to diag-on kørsler (rå streng-lighed).

### 16.4 Design Principper
- Basis hash skal være stabil uden at kræve metrics/diag flag (minimer API overflade i default mode).
- Ekstra segmenter tilføjes kun når eksplicit aktiveret for at undgå utilsigtede invalideringer af historiske snapshots.
- Alle tal afrundes/formatters deterministisk før concatenation.

### 16.5 Begrænsninger & Non-goals
- Hash er ikke kryptografisk; formål er regressionsdetektion, ikke sikkerhed.
- DIAG segment er ikke inkluderet i baseline determinisme sammenligning (andet end når specielt testet) for at holde baseline stabil ved instrumentation-ændringer.

### 16.6 Fremtidig Udvidelse
- Mulig SLEEP segment (`SLEEP:<sleepingCount>`) når sleeping instrumentation ønskes i diag (flag-gated).
- Mulig SUBSTEPSEQ segment analog til ITERSEQ (`SUBSEQ:frame:up:3|...`) når trackSubstepSequence benyttes i tests.
- Orakel O10 reference kan beriges med feltliste JSON for selv-beskrivende snapshot.

## 17. Penetration Alarm (5.3)
Lightweight guard to fail fast during development / CI when pre-solve maximum penetration grows beyond an acceptable threshold.

API:
```
configurePenetrationAlarm({ threshold, consecutive })
setPenetrationAlarm(threshold) // shorthand consecutive=1, pass null to disable
getPenetrationAlarmState() -> { threshold, consecutiveRequired, currentRun }
```
Lifecycle:
1. Warm-up: disabled (threshold null).
2. Arm: configure via HUD (PenAlarm checkbox) – sets threshold & consecutive.
3. Each frame pre-solve max penetration (`preMaxPenetration`) checked; consecutive counter increments while above threshold; resets when below.
4. When counter reaches `consecutiveRequired` an Error is thrown: halts test run deterministically.

Determinism:
- Uses only deterministic metrics; no timing dependence.
- Disabled state leaves zero overhead (single null check).

HUD Integration:
- Checkbox PenAlarm toggles enabled state.
- Thresh numeric sets threshold (mm).
- Consec sets required consecutive frames.

## 18. Advanced Friction (Task 7.3)
Status: Implementeret bag flag via `world.enableAdvancedFriction(opts)` / `disableAdvancedFriction()`.

Formål: Muliggøre anisotrop og dynamisk (slip-hastighedsafhængig) friktionsreduktion uden at introducere ikke-determinisk adfærd.

### 18.1 Model
Udgangspunkt: Baseline heuristiske tangentiale korrektioner (§5) med skalering af maksimum tangential displacement.

Parametre (`solver.frictionAdv`):
```
anisotropic: boolean          // aktiver retning-afhængig μ
muBase: number (default 0.5)  // fallback / blandingsbasis
muX: number (default 0.6)     // effektivt μ når tangential retning ~ verdens X-akse
muY: number (default 0.4)     // effektivt μ når tangential retning ~ verdens Y-akse
dynamic: boolean              // om slip-hastighed reducerer μ
slipRef: number (default 60)  // reference afstand (px) for fuld dynamicScaling
dynamicReduction: number (0..1) // faktor anvendt ved høj slip (typisk 0.5 => halver μ)
```

### 18.2 μ_eff Beregning
1. Udled tangent t = perpendicular(n) (enhed).
2. Projektion af t på verdensakse: `ax = |t.x|`, `ay = |t.y|`, `w = ax + ay` (≤ 1.414...). Normalisér vægte: `wx = ax/(ax+ay)`, `wy = ay/(ax+ay)` med fallback 0.5/0.5 hvis sum ≈0.
3. Anisotrop blanding: `mu_dir = muX*wx + muY*wy` hvis `anisotropic` ellers `mu_dir = muBase`.
4. Slip-hastighed estimeres positionelt: `slip = |relT|` (relativ tangential forskydning før begrænsning).
5. Dynamic scaling hvis `dynamic`:
```
scale = clamp( slip / slipRef , 0, 1 )
mu_dyn = mu_dir * ( 1 - scale*(1 - dynamicReduction) )
```
6. Effektivt μ: `μ_eff = mu_dyn` (eller `mu_dir` hvis dynamic disabled).

### 18.3 Tangential Korrektion (opdateret)
```
maxT = normalCorr * μ_eff
tCorr = clamp(|relT|, 0, maxT)
apply ±t * tCorr efter invMass vægt
```
Algoritmen er stadig single-pass per iteration for determinisme og performance. Anisotropi påvirker kun skaleringsfaktor – ingen ekstra iterationer.

### 18.4 Determinisme
- Ingen flydende tilfældighed; samme kontakt normal + relT => identisk μ_eff.
- slipRef & dynamicReduction fastlagte tal.
- Hash: Ingen nye segmenter (μ indgår implicit i positionsudfald). Acceptance test 7.3a verificerer identisk hash mellem to kørseler med avanceret friktion aktiv.

### 18.5 Begrænsninger / Non-goals
- Ingen opbygning af tangent impulse (ikke en fysisk Coulomb model).
- Ingen rotationsafhængig friktion før fri rotation implementeres.
- Dynamic scaling lineær; fremtidig S-formet kurve muligt (ease-in/out) hvis behov.

## 19. Auto-Pack Heuristik (Task 7.4)
Status: Implementeret i `GameState._applyAutoPack` bag flag (`autoPack.enabled`).

Formål: Efter placering at foretage lille deterministisk inward drift mod centrum for at øge radial tæthed uden at skabe overlap.

### 19.1 Algoritme
For ny brik:
```
for iter in 0..maxIters:
   dir = normalize(-pos)
   trialPos = pos + dir * step
   if trialPos bryder containment (outer circle / inner hole) => stop
   hvis overlap med eksisterende => stop (revert sidste step)
   anvend trialPos
   early exit hvis |step-komponenter| < step*0.25
```
Default konfiguration: `step=4`, `maxIters=12` (~ op til 48 px bevægelse i radiale retning hvis frit).

### 19.2 Determinisme
- Bruger kun brikkens position og statisk sorteret overlap check (iteration over nuværende brikker i deres indsættelsesordre). Ingen random.
- Enkelt pass; påvirker ikke solver sekvens.
- Hash forskel er forventet vs. uden feature (positions ændres), men to kørseler med samme flag-state giver identiske resultater.

### 19.3 Stop-betingelser
- Første overlap eller containment-violation.
- Early exit når tæt på centrum (bevægelseskomponent lille relativt til step).

### 19.4 Fremtidig Udvidelse
- Metrics: `autoPackDistanceSaved` (sum radialDistanceBefore - radialDistanceAfter).
- Multi-body relax (global løbende pass) – eksplicit fravalgt (kompleksitet + nondeterminisme risiko).
- Adaptiv step (reducer step nær centrum) – ikke nødvendigt for nuværende dimensionsskala.

### 19.5 Non-goals
- Optimal packing (NP-hårdt) / global search.
- Rotation eller omarrangering af eksisterende brikker.

- Status label shows: `pre=<value> run=a/b`.

Usage Guidance:
- Set threshold slightly above target penetration tolerance (e.g. tol=0.05 → alarm=0.20) to catch divergence.
- Increase `consecutive` to filter transient spikes during large reposition events.

Non-Goals:
- Automatic adaptive tuning of threshold.
- Persisting alarm triggers across sessions.
```

## 16. Open / TODO
- Implement actual containment constraints (current prototype lacks).
- Instrument timings i eksisterende world.tick.
- Add friction tangent correction pass.
 - Radius shrink containment pass (SPEC skrevet 4.1a – implement pending 4.1c).

## 18. Containment Radius Change (SPEC 4.1a)
Trigger:
- Kald til `setArena(newOuterRadius, innerHoleRadius?)` hvor `newOuterRadius < previousOuterRadius`.
- Udvidelse (større radius) kræver ingen reposition.

Mål:
- Ingen body corners må ende udenfor nye radius efter pass.
- Bevare determinisme (samme sekvens af shrink events => identiske endelige positioner + hash).

Algoritme (reposition strategi – BESLUT 4.1b):
1. Sorter entities stigende efter `id` (stabil allerede anvendt til hash).
2. For hver body: beregn overflow for hver af de 4 hjørner: `overflow_i = max(0, distCorner - Rnew)`.
3. Find hjørne med størst overflow. Hvis alle overflow=0 -> ingen ændring.
4. Flyt hele body langs vektoren fra centrum (0,0) mod body.center (radial retning) med længde = overflow_max.
    - Retning: `dir = (body.pos / |body.pos|)` (håndter |pos|≈0: skip/minimal justering).
    - Ny pos: `body.pos -= dir * overflow_max` (skubber indad).
5. Marker reposition med tæller (metrics: `containmentRepositions++`).
6. Iterativ refinering: Implementationen (4.1c) kører op til 5 iterationer med radial projektion hvis residual overflow > 0.0005 for at eliminere marginal overshoot (erstatter behov for separat clamp loop i SPEC udkast).

OutOfBounds fallback (kun hvis reposition ikke muligt) – BEKRÆFTET 4.1b:
Beslutningsrationale (4.1b):
- Reposition er deterministisk, enkel og løser >95% af shrink cases uden ekstra state.
- Markering alene uden reposition ville kræve særskilt UI-flow og øger risiko for vedvarende penetration.
- Fallback flag begrænses til geometrisk umulige tilfælde -> minimal kompleksitet.
- Ingen ekstra hash-segment krævet; ændringer i positioner er legitime input-afledte transformationer.
- Hvis body diagonal/2 (`sqrt(hw^2+hh^2)`) > Rnew: body kan ikke være helt inde uanset placering.
- Sæt `body.outOfBounds = true` og udelad reposition (bruges af UI til at advare / prompt for removal).
- Denne situation forventes sjælden (kun ved ekstrem shrink).

Determinisme Sikring:
- Ingen floating random eller iteration/solver afhængighed; reposition pass sker atomisk før næste fysik-step.
- Samme id rækkefølge ⇒ samme radial justeringer selv hvis flere bodies overlapper hinanden efter shrink (overlap løses af eksisterende solver i efterfølgende ticks deterministisk).

Hash Påvirkning:
- Positions ændres ⇒ baseline hash ændres (tilladt fordi shrink event er input). Tests (4.1d) skal validere konsistent hash mellem to identiske shrink sekvenser.
- Ingen nye hash segmenter.

Metrics:
- `containmentRepositions` (antal bodies flyttet i pass, akkumuleret over flere shrink events)
- `outOfBoundsCount` (antal geometrisk umulige bodies flagget – akkumuleret)

Edge Cases:
- `body.pos` meget tæt på (0,0): retning default (1,0) for at undgå NaN.
- Flere store shrink events i træk: anvend algoritmen for hver event sekventielt; ingen akkumuleret state ud over positions.

Tests (plan 4.1d):
1. Shrink hvor ingen body overskrider ny radius ⇒ `containmentRepositions=0`.
2. Shrink der kræver reposition ⇒ alle hjørner ≤ Rnew efter pass.
3. Identiske to-run sekvens (shrink til R1, så R2) ⇒ identisk slut-hash.
4. Diagonal > Rnew scenario ⇒ body.outOfBounds=true (syntetisk test) og ingen reposition.

Implementation Hook (4.1c implementeret + 4.1e cleanup):
```
world.setArena(newOuter, inner) {
   const prev = this.arena.outerRadius;
   this.arena.outerRadius = newOuter;
   if (newOuter < prev) this._runContainmentShrinkPass(prev, newOuter);
}
```

`_runContainmentShrinkPass` udfører trinnene ovenfor, itererer for præcision og opdaterer metrics inkl. `outOfBoundsCount`.

## 17. Change Control
Enhver ændring i solver strategi → ny ADR eller opdatering af eksisterende beslutning.
