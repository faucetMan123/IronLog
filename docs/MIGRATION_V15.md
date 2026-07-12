# v15 → New Schema Migration

This document records the **exact** storage format of the legacy single-file
PWA (tagged [`v15-baseline`](../../../tags/v15-baseline) in git) as of the
start of the Android MVP rebuild, and the plan for migrating it losslessly
into the new local SQLite database.

Source of truth for everything below: `index.html` in the `v15-baseline` tag
(the app has no build step — this file *is* the shipped app).

## 1. Storage locations in v15

### 1.1 `localStorage`

| Key | Written by | Contents |
|---|---|---|
| `ironlog-v1` | `save()` | The entire app state, JSON-encoded. See §2. Legacy key name predates the "El Supremo" rebrand — not renamed in v15, and the migration must still recognize it. |
| `el-supremo-snapshot-latest` | `createSnapshot()` | JSON-encoded `{id, createdAt, reason, data}` — most recent snapshot. |
| `el-supremo-snapshot-previous` | `createSnapshot()` | The previous value of the key above, kept as one extra rollback step. |

### 1.2 IndexedDB — database `el-supremo-safe-store` (version 1)

| Object store | Key | Contents |
|---|---|---|
| `state` | out-of-line key `"latest"` | `{createdAt, reason, data}` — mirrored on **every** `save()` call (`persistMirror`), i.e. the freshest possible copy. |
| `snapshots` | in-line `id` (`ISOtimestamp-uid()`) | `{id, createdAt, reason, data}`, written on workout completion, manual backup, and restore. Pruned to the 12 most recent (`idbAllSnapshots` sort + delete beyond index 12). |

**Important:** IndexedDB is not merely a backup mirror — `initDataProtection()`
actively recovers from it on boot if `localStorage["ironlog-v1"]` is absent
(e.g. browser storage was partially cleared, or a PWA reinstall). Any
migration must read all of §1.1 and §1.2, not just the primary key, or some
users' recovery path silently breaks.

### 1.3 Nothing else

No cookies, no server, no other localStorage/IndexedDB keys. No schema
version field exists anywhere in v15 — this migration is what introduces
`schema_migrations`.

## 2. Shape of `data` (the `ironlog-v1` payload)

```ts
{
  templates: [
    {
      id: string,        // "t1".."t6" for the 6 built-ins; uid() for user-added
      name: string,
      exercises: [
        { id: string, name: string, sets: number, reps: string /* e.g. "5–8" */ }
      ]
    }
  ],
  workouts: [
    {
      id: string,           // uid()
      templateId: string,   // FK into templates, but...
      templateName: string, // ...duplicated here so renames/deletes of the
                             // template never alter historical display —
                             // this immutability property must be preserved,
                             // not weakened, in the new schema.
      date: string,          // ISO 8601, set at completion time
      entries: [
        {
          exerciseName: string,   // *** identity is a raw string, case-insensitively
                                   // compared everywhere (autofill, PRs, charts) ***
          sets: [ { weight: string, reps: string } ]  // stored as strings, not numbers
        }
      ]
    }
  ],
  settings: { pullupBodyweight: string },  // defined, never read/written elsewhere — dead field
  meta: {
    lastManualBackupAt: string,
    lastSnapshotAt: string,
    lastMirrorAt: string,
    persistentGranted: boolean | null,
    persistentCheckedAt: string,
    protectionStartedAt: string
  }
}
```

The 6 default templates (`DEFAULT_TEMPLATES` in `index.html`) are: Push
Heavy, Pull Heavy, Legs Heavy, Push Volume, Pull Volume, Legs Volume, with
IDs `t1`..`t6` and exercise IDs `e1`..`e31`.

## 3. The existing exercise-name migration (precedent)

`EXERCISE_NAME_ALIASES` (a flat lowercase-key → canonical-name map) is
applied by `standardizeExerciseName()` on **every load**, rewriting both
`templates[].exercises[].name` and `workouts[].entries[].exerciseName` in
place via `standardizeExerciseNames()`. It is idempotent (re-running it on
already-canonical names is a no-op) and non-destructive (it only rewrites
display strings, never drops data). Aliases cover things like `"bench"` →
`"Bench Press"`, `"rdl"` → `"Romanian Deadlift"`, `"pulldown"` → `"Lat
Pulldown"`.

This is the precedent the new migration follows: **run alias/ID resolution
on every load in a way that's safe to run twice**, never silently merge two
genuinely-different exercises, and never delete unresolved data — fall back
to a generated custom-exercise record instead of dropping it.

## 4. Target schema mapping

| v15 | New table(s) |
|---|---|
| `templates[]` (the 6 built-ins, seeded once) | one `plans` row ("My Programme") + `workout_days` rows (Push Heavy, …) |
| `templates[].exercises[]` | `day_exercises` rows, FK to `exercises` (resolved by name, see §5) |
| `workouts[]` | `workout_sessions` (one row per completed session; keeps its own `template_name` snapshot text so history rendering never depends on a live join) |
| `workouts[].entries[]` | `performed_exercises` (FK `exercise_id`, keeps `exercise_name` snapshot text too) |
| `workouts[].entries[].sets[]` | `performed_sets` — **one row per completed set**, `weight`/`reps` stored as numbers (parsed with the same tolerant parser as the old PR calculator: comma-decimal aware, non-finite → 0) |
| `settings` | `app_settings` (key/value) |
| `meta` | `backup_metadata` |
| (none — new) | `schema_migrations`, `workout_drafts` |

Historical `workout_sessions` rows are immutable snapshots: they carry their
own `template_name` and each `performed_exercise` carries its own
`exercise_name` at the time of logging, exactly mirroring the
`templateName`/`exerciseName` duplication pattern already used in v15. Later
edits to a plan, a workout day, or an exercise's `displayName` never rewrite
these snapshot columns.

## 5. Exercise identity resolution algorithm

For every distinct `exerciseName` found across `templates` and `workouts`
(after running the existing alias standardization):

1. Look up the canonical name against the curated exercise library's
   `displayName`/`aliases` (case-insensitive). Match → use that library
   `id`.
2. No match → treat as a user custom exercise: generate a stable id
   (`slugify(name)`, de-duplicated against collisions), create an `exercises`
   row with `is_custom = 1`.
3. Record the resolution decision in a lookup table so re-running the
   migration reuses the same id (idempotency) instead of re-deriving it.

No exerciseName is ever dropped; two names only ever collapse to the same id
if they already collapse under v15's existing case-insensitive comparison
(preserving current PR/autofill behavior exactly).

## 6. Migration procedure

1. Read `localStorage["ironlog-v1"]`, `el-supremo-snapshot-latest/-previous`,
   and IndexedDB `state`/`snapshots`; pick the candidate with the most
   workouts (same "latest protected copy" heuristic as `latestProtectedCopy()`
   in v15) as the source, in case the primary key is stale relative to a
   mirror.
2. Write a full pre-migration backup (JSON, same shape as the existing
   "download backup file" format) to a `backup_metadata`-tracked location
   before touching anything.
3. Run schema creation (`schema_migrations` versioned, forward-only).
4. Insert seed `exercises` library rows.
5. Resolve and insert plan/day/exercise/session/set rows per §4–5.
6. Validate record counts: `workout_sessions.count === v15.workouts.length`,
   and total `performed_sets` rows equal the total count of v15 sets whose
   weight or reps was non-empty (mirrors the existing `finishSession()`
   filter that drops fully-blank sets).
7. Mark migration complete in `schema_migrations`. **Old `localStorage`/IndexedDB
   data is left in place, untouched, indefinitely** — it is never deleted by
   the app. This is the rollback path.
8. Idempotency: re-running steps 3–6 against the same source must detect the
   completed migration marker and no-op (no duplicate rows).

## 7. Test fixtures

Representative v15 fixtures live in `src/tests/fixtures/v15/` (added in
Phase 3/4) and cover: empty install, single workout, multi-template history,
aliased exercise names needing resolution, a custom (non-library) exercise
name, and a snapshot-only recovery case (no primary key, IndexedDB mirror
only).
