version: 0.2.0
build_date: 2025-08-24

# PackingLab

Kort: 2D pakkespil i browseren. Placer identiske rektangler i en cirkulær arena uden overlap. Drag bruger stabil PBD-baseret fysik. Fokus på determinisme, ydeevne og modulær arkitektur.

## Hurtig start
1. Installer afhængigheder (se `package.json`).
2. Start dev server (valgfrit eksempel): `npm run dev` eller `python -m http.server` i roden.
3. Åbn `index.html` i browser (eller via local server) og brug M for mode-toggle.

## Nøglefunktioner (MVP mål)
- Stabil 60 FPS op til ~200–300 brikker (≥50 FPS ved 300 test-case).
- Place/Edit modes med ghost (grøn/rød validitet) og undo/redo.
- Forhindringer: ydre cirkel + indre cirkler + segmentvægge.
- Coverage (%) HUD + profileringsmålinger.

Ikke-mål i tidlig MVP: fri rotation, touch/mobil, netværk, auto-pack algoritmer.

## Dokumentationsoverblik
- Krav & regler: `REQUIREMENTS.md`
- Arkitektur & modulansvar: `ARCHITECTURE.md`
- Fysik & solver detaljer: `PHYSICS_SPEC.md`
- Test/acceptance: `TESTS.md`
- Implementationsstatus: `IMPLEMENTATION_STATUS.md`
- Level schema: `LEVEL_SCHEMA.json`
- Eksempel levels: `levels/` (se `levels/index.json`)

## Standardparametre (summary)
- diameter_mm: 700
- rect: 120×80 mm (rotation 0°/90°)
- grid_mm: 10
- fysik: μ≈0.5, restitution=0.0, velDamping=0.98
- mouse constraint: k≈90, d≈12, clamp på maxPullSpeed

Detaljer og rationale findes i de dedikerede filer — README gentager dem ikke for at undgå drift.

## Build & run noter
- Fixed timestep loop (1/60s) med adaptiv substeps/iterations implementeres i core.
- Ingen tredjeparts fysikbibliotek; alt er modulært for potentiel backend-udskiftning.

## Bidrag & kvalitet
Før PR: kør headless-tests (kommer) og sikre ingen overlap / performance regressioner. Koordiner større arkitekturændringer via issues.

## License
Tilføj evt. licensfil (ikke inkluderet endnu).
