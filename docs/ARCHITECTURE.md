# Architecture

## Overview

El Supremo is a local-first TypeScript/Vite single-page app, packaged for
both the browser (GitHub Pages) and Android (Capacitor). There is no
backend — every screen reads and writes a local SQLite database directly.

```
index.html (Vite entry)
  -> src/app/main.ts (boot sequence)
       -> src/app/store.ts + src/database/legacyStorage.ts (v15 compat, read-only after migration)
       -> src/migrations/runMigration.ts (one-time v15 -> SQLite migration)
       -> src/app/native.ts (Android: back button, status bar, splash)
       -> src/ads/consent.ts (Android: UMP consent)
       -> src/app/router.ts (history-backed SPA router, renders screens)
            -> src/screens/*.ts (one module per screen, `mount(container)`)
                 -> src/database/*Repo.ts (SQLite reads/writes)
                 -> src/ads/adMobAdapter.ts (banner sync, router-driven only)
```

## Directory layout

```
src/
  app/          bootstrap, router, format helpers, session (in-memory active workout), types
  components/   modal, exercise picker, icons — reusable UI, not screen-specific
  database/     SQLite connection (db.ts), schema, exercise library, per-domain repositories
  screens/      one module per screen; exports mount(container) (async where it queries the DB)
  workouts/     pure domain logic: exercise-name aliasing, autofill, PRs, progression, slug
  progress/     chart data prep + canvas rendering
  exports/      text/CSV builders, JSON backup format + import
  migrations/   v15 -> SQLite transform (pure) + orchestration (runMigration.ts)
  mentor/       deterministic rules engine, questionnaire types, in-memory result holder
  plans/        starter plan definitions, plan-from-spec materializer (shared by mentor + starter paths)
  ads/          the entire advertising boundary — see docs/PRIVACY.md
  privacy/      (privacy UI lives in screens/privacy.ts; this dir is reserved for privacy-specific
                 logic if it grows beyond one screen)
  styles/       global.css — the only stylesheet
  tests/        unit/ (Vitest), migration/ (Vitest), e2e/ (Playwright)

public/         static assets copied as-is (manifest.json, icon-512.png, sw.js); assets/sql-wasm.wasm
                is generated at `npm install` time, not committed — see scripts/copy-sqlite-wasm.mjs
android/        generated Capacitor Android project (committed; build outputs are gitignored)
resources/      source icon/splash images used by `npx capacitor-assets generate`
docs/           this file and its siblings
```

## Rendering model

No framework (React, etc.) — deliberately, per the project's "no
unnecessary dependency" rule; the original app's string-templated-HTML
approach was preserved and modularized rather than replaced. Each screen
module exports `mount(container: HTMLElement)`, which:

1. Builds an HTML string from current data (querying SQLite as needed —
   most `mount()` functions are `async`).
2. Assigns it to `container.innerHTML` once (not incrementally).
3. Wires event listeners via `querySelectorAll` + `data-*` attributes
   (not inline `onclick=`, which stopped working once the script became
   an ES module — see the Phase 3 commit for why).

`src/app/router.ts` owns navigation. Every screen transition goes through
`history.pushState`/`replaceState`, so hardware/browser back always works
correctly — including intercepting back navigation to confirm leaving an
in-progress workout.

## Data flow

**Screens never talk to SQLite directly with raw queries** — they call
functions in `src/database/*Repo.ts` (`exercisesRepo`, `plansRepo`,
`sessionsRepo`, `settingsRepo`), which own the actual SQL and row-shape
mapping. This keeps the schema (snake_case columns, join logic) out of
the UI layer.

`src/database/db.ts` is the single SQLite connection point — see
`docs/DATA_MODEL.md` for why `sql.js`/`jeep-sqlite` version pinning
matters here, and the schema-migration mechanism.

## Legacy (v15) compatibility layer

`src/database/legacyStorage.ts` is the v15 single-file app's storage code,
unmodified in behavior, kept permanently as the migration's read path and
the ultimate rollback (old data is never deleted — see
`docs/MIGRATION_V15.md`). `src/app/store.ts` is the thin app-level wrapper
around it, used only during the migration/recovery boot sequence — no
screen reads/writes through it after migration completes.

## Advertising boundary

Deliberately isolated — see `docs/PRIVACY.md` for the full design and the
diagram. The short version: `src/ads/adMobAdapter.ts` is the only file
allowed to import the AdMob plugin, and its API can't accept workout data
even if a caller tried, because the plugin's own types don't have a field
for it.

## Testing strategy

See `docs/TESTING.md`. In short: pure logic (aliasing, PRs, autofill,
progression, mentor rules, ad-placement rules, the v15 migration
transform) is unit-tested with Vitest and needs no browser or database.
Anything that needs a real SQLite connection (jeep-sqlite's WASM +
IndexedDB stack doesn't run under jsdom) or real DOM interaction is
covered by Playwright against the production build in real Chromium.

## Build targets

- **Browser / GitHub Pages**: `npm run build` -> `dist/`, relative asset
  paths (`vite.config.ts`'s `base: "./"`) so it works from a repo
  sub-path. SQLite runs via jeep-sqlite (WASM + IndexedDB).
- **Android**: `npx cap sync android` copies `dist/` into
  `android/app/src/main/assets/public`; SQLite runs via the plugin's
  native bridge instead. No `server.url` is configured — the Android app
  never depends on GitHub Pages or any remote host. See
  `docs/ANDROID_RELEASE.md`.

Both targets ship the exact same `dist/` build — there is no
platform-specific source fork; `Capacitor.isNativePlatform()` guards the
handful of native-only code paths (back button, status bar, splash,
AdMob, UMP consent) so they're safe no-ops in the browser build.
