# Repo Agent
Version: v1.7 • build: 2025-08-24
Role: AI-udviklingsleder / repository-agent der bevarer invarians og styrer evolution.
Stil: Kort, præcis, TDD/TDT (test/mini-evals før ændring), små patchlets, minimal fil-støj.

---
## Continuity (Invarianter – må ikke brydes uden ECO + mini-ADR)

### Formål
- Sikre at fysikmotorens determinisme, stabilitet og accepttests kan videreføres uden gæt.
- Fastholde klare regler for adaptive iterationer og hash-determinisme.
- Minimere kognitiv overhead for ny agent (hurtig boot). 

### Succeskriterier (Done)
- To identiske runs (samme seed/opsætning) giver identisk determinisme-hash (AT24, AT24A m. flag).
- Max penetration holder sig ≤ defineret tolerance i godkendte tests (AT2 tolerance 0.50, alarm > 2*tolerance).
- Adaptive iterationer eskalerer / nedskalerer kun via dokumenterede heuristikker.
- Ingen uventede filer eller skjulte konfigurationer uden rationale.

### Anti-mål
- Skjulte sideeffekter / implicit heuristik.
- Uforklaret nondeterminisme (iteration-sekvens drift).
- Overdokumentering / duplikat af specs (PHYSICS_SPEC vs agent.md overlap skal være minimal og lenke i stedet for kopier).
- Store refactors uden mini-evals verifikation.

### Ordlistens nøgletermer (≤10)
1. Adaptive Iterations – dynamisk justering af solver.iterations.
2. Iteration Sequence Hash – positions-hash + (valgfrit) iterations-sekvens.
3. Penetration Alarm – fail-fast mekanisme ved > 2× tolerance.
4. FreezeAfterFirstEscalation – flag der låser iterationer efter første eskalering (test-determinisme).
5. trackIterationSequence – flag der logger iteration-sekvens til hash.
6. contactCount – antal constraints (broad+narrow) pr frame.
7. Anomaly Suspension – (kan disables) midlertidig afkobling ved ekstreme penetrationer.
8. Downscale Block Frames – vindue hvor nedskalering forbydes.
9. Warm-up – initiale frames før alarm/heuristik beslutter.
10. Orakel – invarians-check som altid skal være sand.

Tilføjede domæne-termer (v1.6 – referér fuld forklaring i GLOSSARY.md):
- Sleeping System – passivisering af stille bodies (hash-neutral når disabled vs enabled uden bevægelses-effekt).
- Containment Shrink Pass – deterministisk reposition ved arena-radius reduktion.
- Mouse Spring Constraint – inputdrevet (flag-styret) fjeder/ dæmper mellem cursor og valgt body.

### Regler / Constraints
- Kontakt-sortering skal være deterministisk: sortér via (a.id, b.id).
- Iterations-ændring sker i trin på ±8 inden for [minIter, maxIter].
- Ingen nedskalering før `downscaleBlockFrames` udløber.
- Ingen eskalering før `initialEscalationBlockFrames` (medmindre ECO godkender ændring).
- Anomaly suspension må ikke være aktiv i deterministisk test-mode (`disableAnomaly=true`).
- Hash skal bruge stabil ordnet entity-liste (sorteret id) med fixed decimals (3).
- Relativ iterationssekvens (0-based counter) bruges i hash når flag aktiveret.
- Ingen nye top-level filer uden Change Rationale i Statuslog.

### Edge Cases (kritiske)
- Zero contacts → ingen iteration eskalering.
- Langvarig lav penetration < penetrationLow → nedskalering kun efter consecutiveLowNeeded & cooldown=0 & block-vindue forbi.
- Penetration > MAX_CONTACT_DEPTH clamp (må ikke explodere numerisk).
- Warm-up: alarm ikke armeret første X frames i test-scenarier.
- FreezeAfterFirstEscalation aktiv → senere heuristik må ikke ændre iterations.

### API / IO-kontrakter (MÅ IKKE BRYDES)
- `World.enableAdaptiveIterations(overrides)` accepterer flags: `disableAnomaly`, `downscaleBlockFrames`, `initialEscalationBlockFrames`, `penetrationLow`, `trackIterationSequence`, `freezeAfterFirstEscalation`, `preserveExistingIterations`.
- Determinisme tests (AT24, AT24A) forventer at to på hinanden følgende `runOne()` kaldes ikke deler state (reset af ids via `_resetBrickIdsForTest`).
- Hash-format: `id:x.xxx,y.yyy` sekvenser adskilt af `|`; hvis iteration-sekvens: suffix `ITSEQ:` + komma-adskilt liste `n:iter`.
- Solver iterations ændres aldrig i spring > 8 per frame.

### Orakler (skal altid være sande)
1. O1: Samme seed + samme adaptive flags ⇒ identisk hash (AT24 / AT24A PASS).
2. O2: Ingen iterations-nedskalering før block-vindue udløber.
3. O3: Penetration alarm trigges hvis preMaxPenetration > 2 * AT2 tolerance.
4. O4: Kontakt-sortering er total og stabil (ingen permutation-run drift).
5. O5: Iteration-sekvens-log er monoton i relative tæller (0..k) uden huller.
6. O6: FreezeAfterFirstEscalation låser iterations (ingen ændring efter første eskalering).
7. O7: Hash med trackIterationSequence kun afviger fra baseline hvis iterationer faktisk ændres.
8. O8: Spatial hash broadphase producerer identisk uordnet par-mængde som naive broadphase (ingen miss / ekstra).
9. O9: Metrics hash extension (iteration-sum + final contactCount) er deterministisk og ændrer ikke positions-hash.
10. O10: Diagnostics hash extension (broadphasePairs) er deterministisk og fraværende når flag er off (ingen ændring af eksisterende hash-segmenter).
11. O11: Sleeping on/off (uden positionsændrende interaktion mellem run A/B) ⇒ identisk positions-hash (bekræftet af at_sleeping_hash test).
12. O12: Identisk sekvens af arena shrink calls (samme radius-trin) ⇒ identisk slut-hash (at_containment_shrink_hash).
13. O13: Mouse spring disabled ⇒ baseline hash; enabled med samme input-target tidsserie ⇒ deterministisk slut-hash.

### Ændringspolitik
- Enhver ændring der kan påvirke Orakler, API-kontrakter eller Regler kræver ECO + mini-ADR afsnit før patch.
- Heuristik-tærskler må justeres i Evolution-zonen (kræver kort begrundelse + re-validering af Orakler O1–O4 som minimum).
- Versionsnummer bump ved hver ændring i agent.md; build-dato opdateres.

---
## Evolution (Det der må ændres uden ECO)
- Heuristik-tærskler: `penetrationHigh`, `penetrationLow`, `contactHigh`, `consecutiveLowNeeded`, `coolDownFrames`.
- Performance optimeringer (broadphase, hashing) der ikke ændrer output-semantik.
- Logging granularitet (kan reduceres for støj) hvis determinisme stadig holdes.
- Tilføjelse af nye feature flags (skal dokumenteres her + ordliste + mini-eval).

Krav ved ændring:
1. Skriv 2–3 linjer "Hvorfor bedre".
2. Kør relevante Mini-Evals mentalt/automatisk.
3. Verificér Orakler (mindst O1–O4). 
4. Opdater Version + build-dato + Statuslog.

---
## Mini-Evals (hurtige kontrakter)
Case 1: Determinisme Baseline → Kør AT24 to gange → hashA == hashB.
Case 2: Adaptive Sekvens Flag → Aktiver trackIterationSequence i deterministisk mode → To runs: identisk hash inkl. ITSEQ.
Case 3: Freeze Efter Første Eskalering → Start med baseIter < max; generér én eskalering → Ingen yderligere ændringer (log længde 1).
Case 4: Nedskalering Blokeret → downscaleBlockFrames = 60; lav penetration < penetrationLow før frame 60 → iterations uændret.
Case 5: Anomaly Disabled i Test → disableAnomaly=true selv ved høj penetration → ingen suspension (adaptive.enabled forbliver true).
Case 6: Alarm Threshold → Syntetisk kontakt depth = (2*tolerance)+ε → alarm path aktiveres (fail-fast i test kontekst).
Seed/parametre: Brug faste placements + deterministisk push (som AT24/AT24A). Relative counter sikrer stabil ITSEQ.

---
## ECO (skabelon – udfyld før brud)
id:
reason:
scope:
risks:
acceptance (verifikation):

## Mini-ADR (skabelon)
title:
date:
context:
decision:
consequences (+/-):
rollback:

---
## Statuslog (seneste øverst)
2025-08-24 • v1.7 • Tilføjet MIT LICENSE-fil for klar licensiering.
2025-08-24 • v1.6 • Tilføjet Sleeping, Containment Shrink Pass, Mouse Spring Constraint invarians + nye Orakler O11–O13; metrics (containmentRepositions, outOfBoundsCount, mouseSpringDisplacement) ekskluderet fra hash.
2025-08-24 • v1.5 • Diagnostics hash flag (broadphasePairs) bag separat enable; ny Orakel O10.
2025-08-24 • v1.4 • Spatial hash (gitter-broadphase) bag flag + metrics hash extension (totalIterations, finalContactCount) + nye Orakler O8/O9.
2025-08-24 • v1.3 • Tilføjet `GLOSSARY.md` + politik: første gang teknisk term bruges skal kort plain forklaring i parentes medtages.
2025-08-24 • v1.2 • Adaptiv substeps (freeze efter første eskalering) + Mini-Eval Case7.
2025-08-24 • v1.1 • Tilføjet mini-evals runner + pre-commit praksis.
2025-08-24 • v1.0 • Oprettet agent.md med invarians, evolution-zoner, mini-evals, orakler og skabeloner.

---
## Boot Prompt (kopiér til ny model)
"Læs agent.md + GLOSSARY.md. Første gang du introducerer et term: Term (kort plain forklaring). Kør npm run mini-evals (skal PASS). Følg Continuity. Respekter Orakler & API. Ændr kun Evolution med kort rationale, bump version + statuslog, ECO+mini-ADR ved invarians-brud. Opdater GLOSSARY.md ved nye termer."

---
## Glossary Politik
Formål: Reducere kognitiv barriere for ikke-programmør ved læsning af tekniske ændringer.

Regler:
1. Første forekomst af et teknisk term i en ændringsbeskrivelse / commit / PR-kommentar: `Term (kort plain forklaring)`.
2. Efterfølgende forekomster i samme kontekst: kun term (ingen gentagelse af forklaring for at undgå støj).
3. Nye termer kræver: opdatering af `GLOSSARY.md` + statuslog-bidrag (én linje). Ingen ECO påkrævet hvis ikke et invarians-begreb.
4. Fjernelse / omdøbning af term der refereres af Orakler eller API kræver ECO.

Eksempel:
"Vi tilføjer adaptive substeps (ekstra underopdeling af en frame) for at reducere peak-penetration. Substeps øges ved høj kontakt-tæthed." 

Se `GLOSSARY.md` for fuld liste.

---
## Fremtidig Udvidelse (ingen mappe endnu)
Change Rationale (placeholder): Hvis Mini-Evals bliver for omfattende eller orakellister for store, kan `.gpt/` introduceres. Krav: Klar gevinst i læsbarhed + pointer herfra. Indtil da: Ingen ekstra filer.
