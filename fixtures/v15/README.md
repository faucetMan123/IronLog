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
- `custom-exercise.json` — includes an exercise name (`"Farmer Carry"`) added
  mid-session via `addSessionExercise()` rather than coming from a template.
  Farmer Carry is present in the curated library (see
  `src/database/exerciseLibrary.ts`), so this fixture verifies the "session
  exercise not on any template" path resolves correctly rather than being
  dropped; a separate migration test covers a name with no library/alias
  match at all, which must fall back to a generated custom exercise id.
- `idb-mirror-only.json` — represents the IndexedDB `state` store's `latest`
  record contents (`{createdAt, reason, data}`) for the scenario where
  `localStorage["ironlog-v1"]` is empty/missing but the IndexedDB mirror has
  real data (the `initDataProtection()` recovery path in v15).
- `corrupted.json` — deliberately malformed (missing `workouts` array) to
  exercise rejection/validation paths.
