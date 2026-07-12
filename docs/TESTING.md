# Testing

## Commands

```sh
npm run typecheck   # tsc --noEmit
npm run lint         # eslint src
npm test             # vitest run (unit + migration tests)
npm run test:watch   # vitest, watch mode
npx playwright test  # e2e (builds via webServer config, runs against `vite preview`)
npm run build        # tsc --noEmit && vite build — production build
```

`npx playwright test` runs against the **production build**, not the dev
server (`playwright.config.ts`'s `webServer` runs `vite preview`) — this
matters because jeep-sqlite's WASM loading behaves differently in dev vs.
build, and the whole point of the e2e suite is to catch exactly that kind
of build-only issue (see the sql.js version-pinning story in
`docs/DATA_MODEL.md`, which a unit test could never have caught).

## Test layout

```
src/tests/unit/        Vitest — pure logic, no DOM, no database
src/tests/migration/   Vitest — the v15->SQLite transform, against fixtures in fixtures/v15/
src/tests/e2e/          Playwright — real Chromium, real SQLite (WASM+IndexedDB), real DOM
```

### Why the split

jeep-sqlite (the browser SQLite backend) needs real IndexedDB and a real
WASM runtime — jsdom (what Vitest uses) doesn't provide either. So:

- Anything that's pure computation (exercise-name aliasing, PR
  calculation, autofill, progression suggestions, the mentor rules
  engine, ad-placement rules, the v15 migration *transform* specifically
  — as opposed to the orchestration that writes it to a real DB) is a
  **Vitest unit test**. Fast, no browser needed.
- Anything that needs a live SQLite connection or real DOM/event
  interaction is a **Playwright e2e test**, run against the built app.

## What's covered

Mapping the product rules' required-test list to where each one actually
lives:

| Requirement | Test |
|---|---|
| v15 data migrates correctly | `src/tests/migration/v15ToSqlite.test.ts` (fixture-by-fixture counts/values) + `src/tests/e2e/sqlite-migration.spec.ts` (real DB) |
| Migration is idempotent | Both of the above — unit test on the pure transform, e2e test across a real page reload |
| First launch opens onboarding | `core-flows.spec.ts` "fresh install shows onboarding" |
| Mentor produces a valid plan | `src/tests/unit/mentor.test.ts` (14 tests: determinism, library-only selection, equipment/avoidance filtering, rep ranges) + `core-flows.spec.ts` "mentor questionnaire generates a plan" |
| Manual plan creation works | `core-flows.spec.ts` "manual plan building" |
| Starter-plan selection works | `core-flows.spec.ts` "starter plan onboarding..." + `src/tests/unit/starterPlans.test.ts` (library-id/displayName integrity) |
| Plan persists after restart | Implicit in every e2e test after the first (SQLite is real, not mocked) — a dedicated "reload and re-check" assertion exists in the migration idempotency test |
| Workout draft survives forced closure | `sessionsRepo.saveDraft/loadDraft` + Home's "Resume Workout" path; covered by the RIR/rest-timer test's resume flow |
| Interrupted workout resumes | Same as above |
| Completed workout appears in history | `core-flows.spec.ts` "can log and finish a workout..." |
| Template-specific (workout-day-specific) autofill works | `core-flows.spec.ts` "workout-day-specific autofill..." (same exercise, different day, proven not to bleed) + `src/tests/unit/autofill.test.ts` |
| Exercise rename does not break history | Structural: `performed_exercises.exercise_name` is a snapshot column, never rewritten by a rename — see `docs/DATA_MODEL.md` § Immutability |
| Plan edit does not mutate old sessions | `src/tests/migration/v15ToSqlite.test.ts` "preserves per-workout template_name/exercise_name snapshots..." (same structural guarantee, exercised via the migration path) |
| Progress charts use completed sessions only | Structural: `sessionsRepo.exerciseProgressRows`/`dayVolumeRows` only ever query `workout_sessions` (populated exclusively by `finishSession()`), never `workout_drafts` |
| Personal records calculate correctly | `src/tests/unit/prs.test.ts` + `src/tests/migration/v15ToSqlite.test.ts` "parity with pre-migration PR/autofill logic" |
| Backup export/restore produce equivalent data | `src/tests/e2e/backup.spec.ts` "backup export and restore (replace)..." — real downloaded file, real re-upload, real SQLite counts compared before/after |
| Corrupted backup is rejected | `src/tests/e2e/backup.spec.ts` "a corrupted backup file is rejected..." — both a checksum-tampered file and invalid JSON |
| Duplicate import does not silently duplicate | Structural: `applyCurrentFormatRows()` uses `INSERT OR IGNORE` keyed by the same deterministic ids the migration produces |
| Deleting a plan retains workout history | Structural: `deletePlan()` only touches `plans`/`workout_days`/`day_exercises` — no FK `ON DELETE CASCADE` exists onto `workout_sessions` (see `docs/DATA_MODEL.md`) |
| Erase-all-data removes all local records | `core-flows.spec.ts` "privacy centre erase-all-data returns to onboarding" |
| App functions without internet | Structural: no `server.url`, all assets bundled locally, SQLite runs fully offline on both platforms — see `docs/ARCHITECTURE.md` |
| Android process termination does not corrupt data | **Not verified in this environment** — no device/emulator available. SQLite's own durability (WAL/journal) is what protects against this; worth a manual device test — see Known limitations |
| No workout content sent in network requests | `src/tests/e2e/ads-boundary.spec.ts` — canary-content network audit across all ad-permitted + core screens |
| Ads do not appear during workouts | `src/tests/unit/adPlacements.test.ts` (exhaustive tab coverage, including "never while a session is active") |
| Ads use test configuration in development | `src/ads/adConfig.ts`'s `isUsingTestAds()` always true in dev; verified structurally (`import.meta.env.DEV` check), not yet under a dedicated unit test |

## Known limitations

- **No Android device/emulator was available** in the environment this
  project was developed in. The Android debug build was produced and
  verified via `aapt dump badging`/`xmltree` (package id, permissions,
  AdMob meta-data all correct — see the Phase 6/7 commit messages), but
  on-device behavior (process lifecycle, real keyboard/status-bar
  rendering, real AdMob ad serving) needs manual verification on a real
  device or emulator before release.
- The Playwright suite runs single-browser (Chromium) only — no
  cross-browser coverage, which is a reasonable tradeoff given the
  Android/GitHub-Pages-Chromium-WebView target audience, but worth noting.
