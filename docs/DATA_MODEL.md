# Data Model

## Storage engine

Local SQLite via `@capacitor-community/sqlite`. Same schema and migration
code path on both platforms:

- **Android**: the plugin's native bridge, backed by a real on-device
  SQLite file.
- **Browser / GitHub Pages**: the `jeep-sqlite` web component, which runs
  `sql.js` (SQLite compiled to WebAssembly) in-memory and persists to
  IndexedDB. See `src/database/db.ts`.

No server, no remote database, no sync. `android:allowBackup="false"` is
configured in Phase 6 so Android's automatic cloud backup never captures
this file either — see `docs/PRIVACY.md`.

### jeep-sqlite / sql.js version pinning (read before touching this dependency)

`package.json` pins `sql.js` to the **exact** version (`1.11.0`, no `^`)
that `jeep-sqlite@2.8.0`'s compiled Stencil bundle was built against. This
is load-bearing, not cosmetic: `jeep-sqlite` freezes its Emscripten glue
code into its own dist bundle at publish time, and that glue must match the
`.wasm` binary byte-for-byte in ABI terms. Letting npm resolve a newer
`sql.js` (e.g. the 1.14.1 that gets hoisted with a `^1.11.0` range) produces
`WebAssembly.instantiate(): LinkError: Import #34 "a" "I": function import
requires a callable` — a working-looking build that hangs forever on first
launch with no thrown error. If `jeep-sqlite` is ever upgraded, re-check
what `sql.js` version it was built against and re-pin.

`scripts/copy-sqlite-wasm.mjs` runs on `npm install` (`postinstall`) and
copies `node_modules/sql.js/dist/sql-wasm.wasm` into `public/assets/` — that
binary is not committed to git (see `.gitignore`); it's always regenerated
from whatever `sql.js` is actually installed, so it can never silently drift
out of sync with the pinned version above.

Also note `jeep-sqlite/loader`'s `defineCustomElements()` is required —
importing the raw component module (`jeep-sqlite/dist/components/jeep-sqlite`)
does not self-register the custom element once bundled by Vite for
production; only the Stencil-generated loader does.

## Schema

Defined in `src/database/schema.ts` as an ordered, append-only array of
`SchemaMigration` entries (`version`, `description`, `statements[]`),
applied and recorded in `schema_migrations` on every `getDb()` call. A
schema change is always a **new** migration appended to the array — past
entries are never edited in place.

```
exercises            — curated + custom exercise identity (stable id, never the display name)
plans                — a named collection of workout_days
workout_days          — one training day within a plan (e.g. "Push Heavy")
day_exercises         — exercises assigned to a workout_day, with targets (sets/reps/rest/increment)
workout_sessions      — one completed (or in-progress) training session — immutable once completed
performed_exercises   — one exercise as it was actually performed in a session
performed_sets        — one row per completed set (weight, reps, optional RIR)
workout_drafts        — autosaved in-progress session state, for resume-after-interruption
app_settings          — key/value app preferences
backup_metadata        — backup timestamps + the migration-completion marker
schema_migrations     — DDL version ledger
```

Full column list: `src/database/schema.ts`.

## Exercise identity

`exercises.id` is permanent and immutable. `display_name` can be renamed
freely without touching any other table, because every other table
references exercises by `exercise_id`, never by name string.

```json
{ "id": "bench_press_barbell", "display_name": "Bench Press" }
```

- Curated library: `src/database/exerciseLibrary.ts` — ~110 exercises,
  each with `id`, `displayName`, `aliases[]`, `primaryMuscle`,
  `secondaryMuscles[]`, `equipment`, `movementCategory`, `unilateral`,
  `defaultWeightIncrement`. IDs are hand-authored slugs
  (`romanian_deadlift`, `lat_pulldown`, ...) and never reused for a
  different exercise if renamed.
- Custom (user-created) exercises: `is_custom = 1`, id = `custom_` + a
  deterministic slug of the name. Deterministic so the same name always
  resolves to the same id — this is what makes exercise resolution
  idempotent across repeated migration/seed runs without a persisted
  lookup table (see `src/migrations/v15ToSqlite.ts`).
- Alias search (`resolveLibraryId` in `exerciseLibrary.ts`) is
  case-insensitive over both `displayName` and `aliases[]`, matching the
  case-insensitive identity v15 already used for autofill/PR matching
  (`RDL` → `romanian_deadlift`, `Bench` → `bench_press_barbell`, etc).

## Immutability of history

`workout_sessions.template_name` and `performed_exercises.exercise_name`
are point-in-time **snapshots**, captured at logging time — not derived via
a live join to `workout_days`/`exercises`. Renaming a plan, a workout day,
or an exercise's `displayName` afterwards never rewrites what a historical
session displays it was called at the time. This mirrors the
`templateName`/`exerciseName` duplication v15 already relied on (see
`docs/MIGRATION_V15.md` §2) — the new schema formalizes the same guarantee
with an explicit FK (`exercise_id`) *plus* the snapshot string, so PRs/charts
can still group by stable identity while history text never changes
retroactively.

Deleting or archiving a `plan` only touches the `plans`/`workout_days`/
`day_exercises` rows — `workout_sessions` and everything under it are
untouched, by construction (no cascading FK deletes are defined from plans
onto sessions).

## Migration from v15

See `docs/MIGRATION_V15.md` for the full procedure. Summary: the transform
in `src/migrations/v15ToSqlite.ts` is a pure function
(`AppData -> MigratedRows`) with no database dependency, so it's covered by
extensive Vitest unit tests (`src/tests/migration/`) independent of the
actual SQLite plumbing. `src/migrations/runMigration.ts` is the thin
orchestration layer that actually calls it and writes the rows via
`src/database/db.ts`, guarded by an idempotency marker in `backup_metadata`.
The live SQLite path (real browser IndexedDB + WASM, or later, real Android
SQLite) is covered separately by
`src/tests/e2e/sqlite-migration.spec.ts` (Playwright, real Chromium).

## Boundary with the legacy (v15) storage layer

`src/database/legacyStorage.ts` is unmodified v15 behavior, kept
permanently — it is the migration's read path and the ultimate rollback:
old `localStorage`/IndexedDB data is never deleted by the app. As of this
phase, the SQLite migration runs automatically and silently on startup
(background, non-blocking), but the UI still reads/writes exclusively
through `legacyStorage`/`app/store.ts` — no screen depends on SQLite data
yet. Cutting the UI over to SQLite as the primary read/write path is Phase 5
work.
