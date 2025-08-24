# Glossary (Teknisk + Almindeligt Sprog)
Version: v1.2 • 2025-08-24

Format: Term – kort teknisk forklaring | almindeligt sprog ("hverdagsbillede").
Første gang et ord bruges i en ændring / forklaring skal formen: Term (kort plain forklaring) anvendes.

## Fysik / Simulation
- Deterministisk – Samme input giver samme output | "Tryk play to gange → præcis samme resultat".
- Iterationer – Gentagne solver-kørsler pr. frame | "Ælte dejen flere små gange".
- Adaptive Iterationer – Dynamisk justering af iterationer efter behov | "Skrue op/ned for æltning hvis dejen er ujævn".
- Substeps – Ekstra underopdeling af en frame | "Slowmotion billeder for at fange hurtige bevægelser".
- Adaptive Substeps – Øg/fald antal substeps efter aktivitet | "Flere slowmotion-billeder når der sker meget".
- Broadphase – Grov filtrering af potentielle kollisioner | "Sortér alle der tydeligt ikke kan ramme".
	- Spatial Hash – Broadphase baseret på gitter-celler | "Opdel gulvet i felter og kig kun i de felter med folk".
- Narrowphase – Præcis kontaktberegning | "Måle præcis hvor ting rører".
- Solver – Retter overlap og opdaterer positioner | "Skubber klodser tilbage på plads".
- Penetration (overlap) – Hvor dybt objekter skærer ind i hinanden | "Klodser der smelter ind i hinanden".
- Penetration Alarm – Signal ved for stor penetration | "Rød lampe tændes".
- Sleeping System – Deaktiverer stille objekter midlertidigt | "Sovende klodser springes over".
- Containment Shrink Pass – Flytter objekter indad ved mindre arena-radius | "Skub alle tættere sammen når ringen krymper".
- Mouse Spring Constraint – Virtuel fjeder mellem mus og valgt objekt | "Elastik der trækker klodsen mod cursoren".
 - Forbidden Polygon – Område hvor placering er forbudt | "Rødt no-go felt".
 - Wake Impulse (WakeCorrection / WakeContactPen) – Tærskler der vækker sovende body | "Ryk der vækker en sovende".
 - Sleeping Thresholds – Grænser for hvornår et objekt bliver betragtet stille | "Hvor lidt det må bevæge sig for at falde i søvn".
 - Broadphase Pair Reduction – % reduktion fra naive par til faktiske kandidater | "Hvor mange unødige sammenstød vi slap for".

## Adaptive Heuristikker
- Eskalere (upscale) – Øge iterationer/substeps | "Skrue op for drejeknappen".
- Nedskalere (downscale) – Mindske iterationer/substeps | "Skrue ned for drejeknappen".
- FreezeAfterFirstEscalation – Lås efter første opjustering | "Sætter ovnen fast på temperatur".
- Downscale Block Frames – Periode hvor nedskalering er låst | "Må ikke skrue ned endnu".
- Cooldown – Ventetid før næste nedskalering | "Lad motoren køle af".
- contactCount – Antal aktive kontakt-constraints | "Hvor mange steder ting rammer".
- Drag Displacement – Største forskydning mellem substeps | "Største ryk et objekt tog".

## Determinisme & Kontrol
- Hash (Determinism Hash) – Fingeraftryk af alle slutpositioner | "Unikt slutbillede-tal".
	- Metrics Hash Extension – Ekstra felter (iteration-sum, final kontaktantal) i hash | "Fingeraftryk med puls".
 - Diagnostic Hash (DIAG segment) – Ekstra målinger (broadphasePairs, MSD, massCfg) når diagnostics er aktiv | "Fingeraftryk med røntgen data".
- Iteration Sequence Log – Liste over iterationer pr. frame | "Tidslinje: 32, 40, 48 ...".
- trackIterationSequence – Flag der tilføjer sekvens til hash | "Medtager tidslinjen i fingeraftryk".
- Anomaly Suspension – Midlertidig stop af adaptiv logik ved ekstreme værdier | "Sikkerhedsafbryder".
- Orakel – Invarians-regel der altid skal være sand | "Grundlovsparagraf".
 - containmentRepositions – Tæller hvor mange klodser blev flyttet pga shrink | "Hvor mange skulle rykkes ind".
 - outOfBoundsCount – Tæller klodser der ikke kan være i den nye radius | "For store til ringen".
 - mouseSpringDisplacement – Akkumuleret fjeder-forskydning | "Samlet elastik-træk".

## Test & Automatisering
- Mini-Evals – Små automatiske scenarier der sikrer invarianter | "Hurtige sundhedstjek".
- Baseline – Gemte reference-målinger | "Før-foto".
- Performance Regression – Ydelse blevet dårligere end baseline + tolerance | "Programmet taber fart".
- Tolerance – Tilladt afvigelsesmargen | "Lidt slør er ok".
- Script – Lille kommandolinje-program | "En knap der kører en rutine".
- CI (Continuous Integration) – Automatisk kørsel af tests ved ændringer | "Robot der tjekker alt hver gang".

## Politik / Proces
- ECO – Formelt forslag før brud på invarianter | "Skema før du bryder en regel".
- Mini-ADR – Kort arkitektur beslutningsnotat | "Lille beslutningskort".
- Evolution Zone – Område hvor ændringer er friere | "Det sikre legeområde".

## Brug
1. Første gang et term forekommer i en PR / forklaring: Term (plain forklaring).
2. Senere brug: Bare term (undgå støj).
3. Tilføj nyt term: opdater denne fil + kort begrundelse i `agent.md` statuslog.

End of file.
