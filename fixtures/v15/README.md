# v15 test fixtures

Representative snapshots of the legacy `localStorage["ironlog-v1"]` /
IndexedDB payload shape, as documented in `docs/MIGRATION_V15.md`. Used by
the Phase 4 migration tests (`src/tests/migration/*.test.ts`) so the
migration is verified against real-shaped data rather than only synthetic
minimal cases.

- `empty.json` — fresh install, never logged a workout (`defaultData()` shape).
- `single-workout.json` — one completed session, canonical exercise names already.
- `multi-template-history.json` — several sessions across multiple templates,
  used to verify PR calculation (heaviest set wins, ties broken by reps) and
  per-template autofill survive migration unchanged.
- `unaliased-names.json` — workout entries and a template using **pre-alias**
  raw names (`"RDL"`, `"Bench"`, `"DB Shoulder Press"`, `"Pull ups"`) exactly
  as `standardizeExerciseName()` would encounter them before its lowercase-key
  lookup runs — exercises `normalizeData()` on load in v15, and the ID
  resolution in the new migration.
- `custom-exercise.json` — includes an exercise name (`"Farmer Carry"`) that
  is not in the curated 80-120 exercise library and not in
  `EXERCISE_NAME_ALIASES`, so it must resolve to a generated custom exercise
  id rather than being dropped or mis-merged.
- `idb-mirror-only.json` — represents the IndexedDB `state` store's `latest`
  record contents (`{createdAt, reason, data}`) for the scenario where
  `localStorage["ironlog-v1"]` is empty/missing but the IndexedDB mirror has
  real data (the `initDataProtection()` recovery path in v15).
- `corrupted.json` — deliberately malformed (missing `workouts` array) to
  exercise rejection/validation paths.
