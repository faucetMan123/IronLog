# El Supremo

**Store-facing working title**: El Supremo: Private Workout Log

Private workout tracking with no account and no cloud workout storage.

> Your workout records are stored locally on your device and are never
> uploaded to our servers.

Six built-in templates (Push/Pull/Legs × Heavy/Volume), template-specific
autofill, a deterministic local "Mentor" that suggests a programme from a
short questionnaire, a full manual plan builder, personal-record tracking,
progression charts, and JSON/text/CSV export+backup — all running against a
local SQLite database, in the browser (GitHub Pages) or as a native Android
app (Capacitor), with no backend server anywhere in the stack.

## Privacy model

There is no first-party backend. All workout content — plans, workout
days, exercises, sessions, sets, weights, reps, notes — lives in a local
SQLite database and never leaves the device via this app's own code. No
account, no analytics, no crash reporting, no sale of data.

If advertising (Google AdMob) is enabled, the ad SDK may process device
and advertising information on Google's side — **never workout content**,
enforced by an isolated adapter whose API can't structurally accept it
(see `docs/PRIVACY.md`). Do not claim "no data is collected" once ads are
enabled — say precisely what's true: workout data is never sent, ads may
process device/advertising info.

Full detail: **`docs/PRIVACY.md`**.

## Architecture

TypeScript + Vite, no UI framework, Capacitor for the Android shell. Full
breakdown: **`docs/ARCHITECTURE.md`**.

```
src/
  app/        bootstrap, router, shared types
  components/ modal, exercise picker, icons
  database/   SQLite connection, schema, exercise library, repositories
  screens/    one module per screen
  workouts/   pure domain logic (aliasing, autofill, PRs, progression)
  progress/   chart data + canvas rendering
  exports/    text/CSV builders, JSON backup format
  migrations/ v15 -> SQLite transform + orchestration
  mentor/     deterministic rules engine
  plans/      starter plans, plan-from-spec materializer
  ads/        the entire advertising boundary
  styles/     global.css
  tests/      unit/, migration/ (Vitest); e2e/ (Playwright)
android/      generated Capacitor Android project
resources/    source icon/splash images
docs/         architecture, data model, migration, privacy, release docs
```

## Local database schema

11 tables: `plans`, `workout_days`, `exercises`, `day_exercises`,
`workout_sessions`, `performed_exercises`, `performed_sets`,
`workout_drafts`, `app_settings`, `backup_metadata`, `schema_migrations`.
Every completed set is its own row; exercise identity is a stable id
(`bench_press_barbell`, ...), never the display name, so renaming an
exercise never breaks history, PRs, autofill, or exports. Full schema and
the immutability guarantees: **`docs/DATA_MODEL.md`**.

## Migration from the v15 single-file app

This project's history began as a single `index.html` PWA (tagged
`v15-baseline` in git). That version's `localStorage`/IndexedDB data is
migrated automatically and idempotently into the new SQLite database on
first launch, and the old storage is never deleted — it's the permanent
rollback path. Full procedure: **`docs/MIGRATION_V15.md`**.

## Development

```sh
npm install          # also runs scripts/copy-sqlite-wasm.mjs (postinstall)
npm run dev           # Vite dev server
npm run typecheck     # tsc --noEmit
npm run lint          # eslint src
npm test              # vitest run
npx playwright test   # e2e, against a production build (see docs/TESTING.md)
npm run build         # tsc --noEmit && vite build -> dist/
```

## Browser build (GitHub Pages)

`npm run build` produces `dist/` with relative asset paths — deployable
to any static host or GitHub Pages sub-path. SQLite runs via
`jeep-sqlite` (WASM + IndexedDB) in this build.

**If you ever touch `jeep-sqlite`/`sql.js`**, read
`docs/DATA_MODEL.md`'s version-pinning note first — a version mismatch
between them causes a silent-hang WASM `LinkError` with no visible error,
which took real debugging effort to track down the first time.

## Android build

```sh
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug   # debug APK
./gradlew bundleRelease                  # release AAB — needs a real keystore, see below
```

Package id: `com.elsupremo.workoutlog`. Full build/toolchain/signing
instructions: **`docs/ANDROID_RELEASE.md`**. Play Store submission
checklist (including everything that requires manual Play Console
access): **`docs/PLAY_STORE_CHECKLIST.md`**.

**No signing keystore is included in this repository.** Generate your own
(`keytool -genkeypair ...`, see `docs/ANDROID_RELEASE.md`) and enroll in
Play App Signing — never commit a keystore or its passwords.

## Tests

78 automated tests (61 Vitest + 17 Playwright, all currently passing) —
what's covered and why the suite is split the way it is:
**`docs/TESTING.md`**.

## Backup format

Schema-versioned, checksummed JSON (`src/exports/backup.ts`):
`{ schemaVersion, appVersion, exportedAt, checksum, counts, data }`.
Restoring offers an explicit Merge/Replace choice, takes an automatic
pre-restore backup, and rejects checksum-mismatched or malformed files.
Legacy v15-format backup files are also accepted transparently (reusing
the same migration transform used for the one-time on-device migration).

## AdMob configuration

Advertising is isolated behind `src/ads/adMobAdapter.ts` — the only file
allowed to import the AdMob plugin, and its API can't accept workout data
even if a caller tried (see `docs/PRIVACY.md` for the full boundary
argument and a diagram). Ads only ever appear on four "landing" screens
(home, history, progress, plan library) — never during a workout, in
onboarding, or on backup/privacy screens; enforced centrally in the
router, not per-screen.

Test ad unit/app IDs (Google's own published public test IDs) are the
default everywhere. Production IDs are supplied only via environment
configuration and are never committed:

- JS side: `VITE_ADMOB_APP_ID`, `VITE_ADMOB_BANNER_AD_UNIT_ID`
- Native side: `ADMOB_APP_ID` (read by `android/app/build.gradle`'s
  manifest placeholder)

Development builds always force test ads regardless of what's configured
(`src/ads/adConfig.ts`'s `isUsingTestAds()`), as an extra safety net.

## Consent configuration

EEA/UK/Switzerland consent is handled via Google's own User Messaging
Platform (UMP), wrapped in `src/ads/consent.ts`. A "Privacy choices" entry
in the Privacy Centre lets the user reopen the consent form later.
Non-personalised ads is the default toggle state.

## Release signing

See `docs/ANDROID_RELEASE.md` § Signing — generating a keystore, Play App
Signing enrollment, and wiring `android/key.properties` (gitignored,
never committed).

## Google Play submission checklist

**`docs/PLAY_STORE_CHECKLIST.md`** — every item marked `[MANUAL]` requires
Play Console access, a real device/emulator, or real credentials that
weren't available in the environment this project was developed in.

## Known limitations

- No Android device or emulator was available during development — the
  debug APK was built and its manifest/permissions verified via `aapt`,
  but on-device visual/behavioral testing is still a manual follow-up.
- No release keystore exists; `bundleRelease` was never attempted.
- Play Console listing, Data Safety form submission, and store screenshots
  are all `[MANUAL]` follow-ups — see `docs/PLAY_STORE_CHECKLIST.md`.
- The Playwright suite runs Chromium only (no cross-browser coverage).

Full detail on all of the above: `docs/ANDROID_RELEASE.md`,
`docs/PLAY_STORE_CHECKLIST.md`, and `docs/TESTING.md`.
