# Android Release Guide

## Package identity

- **Application ID**: `com.elsupremo.workoutlog`
- **App name**: El Supremo
- This ID is set in `capacitor.config.ts` (`appId`) and
  `android/app/build.gradle` (`namespace` and `defaultConfig.applicationId`).
  **Change it in both places together** if it's ever renamed — Capacitor
  reads `capacitor.config.ts` for its own bookkeeping, but the actual APK
  identity comes from `build.gradle`.
- Availability on Google Play could not be verified from the development
  environment this project was built in (no Play Console access). Confirm
  the ID is unclaimed before your first upload — Play Console will reject
  the upload otherwise, and application IDs cannot be changed after an
  app's first publish.

## Toolchain used to generate/validate this project

- Node.js 22 LTS, npm
- Java: OpenJDK 21 (`JAVA_HOME` must point at a JDK 17+ install — AGP/Gradle
  in this project were validated against JDK 21)
- Android SDK: `platform-tools`, `platforms;android-36`, `build-tools;36.0.0`,
  installed via `sdkmanager` (Android command-line tools)
- Gradle 8.14.3 (via the committed `android/gradlew` wrapper — always use
  the wrapper, not a system-installed Gradle, so the version stays pinned)

`android/local.properties` (containing `sdk.dir=...`) is machine-specific
and **not committed** — every developer/CI runner generates their own,
either by opening the project in Android Studio once, or manually:

```sh
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

## Building

The web app must be built and synced into the native project before any
Gradle build — the native project reads from `android/app/src/main/assets/public`,
a copy of `dist/`, not from `dist/` directly:

```sh
npm run build          # tsc --noEmit && vite build -> dist/
npx cap sync android    # copies dist/ into android/, updates native plugin registrations
```

### Debug build (unsigned, installable via adb for manual testing)

```sh
cd android
./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Release build (Android App Bundle, for Play Store upload)

Requires a signing keystore — see "Signing" below. **Do not** attempt this
without a real keystore already configured; an unsigned or debug-signed
release build will be rejected by Play Console on upload.

```sh
cd android
./gradlew bundleRelease
# -> android/app/build/outputs/bundle/release/app-release.aab
```

A release APK (for sideloading/testing outside Play, not for Play Store
upload) can be produced the same way with `assembleRelease` instead of
`bundleRelease`.

## Signing

**No signing keystore or credentials are included in this repository, and
none were generated during development.** Per the project rules, production
signing secrets are only ever supplied explicitly by whoever controls the
Play Console listing — never invented or stored in the repo.

To create a release keystore (one-time, do this **once** and back it up
somewhere durable — losing it means you can never update the app under
the same listing again):

```sh
keytool -genkeypair -v \
  -keystore el-supremo-release.keystore \
  -alias el-supremo \
  -keyalg RSA -keysize 2048 -validity 10000
```

Store the resulting `.keystore` file and its passwords **outside the git
repository** (a password manager, a secrets vault, or at minimum outside
any directory that gets committed — `.gitignore` in this repo already
excludes `*.keystore`, `*.jks`, and `android/key.properties`).

Create `android/key.properties` (not committed) with:

```properties
storeFile=/absolute/path/to/el-supremo-release.keystore
storePassword=...
keyAlias=el-supremo
keyPassword=...
```

Then wire it into `android/app/build.gradle`'s `signingConfigs` /
`buildTypes.release.signingConfig` (not pre-configured in this repo, since
that requires the actual keystore to exist first — do this as part of your
first real release).

**Play App Signing** (recommended): let Google manage the actual
app-signing key and use your own upload keystore (above) only to sign what
you upload to Play Console — this way, losing your upload key is
recoverable (Google can re-issue upload key rotation), whereas losing an
unmanaged app-signing key permanently breaks your ability to update the app.
Enroll in Play App Signing when you create the app's first release in Play
Console.

## Versioning

`android/app/build.gradle`'s `defaultConfig`:

```groovy
versionCode 1
versionName "1.0"
```

`versionCode` must increase by at least 1 on every Play Store upload (it's
what Play uses to determine "is this newer"); `versionName` is the
user-facing string (can follow any scheme, e.g. semver). Bump both before
every release build.

## Data safety / backup configuration

- `android:allowBackup="false"` in `AndroidManifest.xml` — disables both
  Auto Backup to the cloud and device-to-device transfer entirely.
- `android:dataExtractionRules` / `android:fullBackupContent` point at
  explicitly empty rulesets (`res/xml/data_extraction_rules.xml`,
  `res/xml/backup_rules.xml`) as defense-in-depth documentation of intent,
  in case `allowBackup` is ever changed.
- See `docs/PRIVACY.md` for the reasoning and the Play Console Data Safety
  form answers this implies.

## Icons and splash screen

Generated via `@capacitor/assets` from source images in `resources/`
(`icon.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`,
`splash-dark.png` — all derived from `public/icon-512.png`, the existing
brand mark, composited onto the navy `#081120` brand background). To
regenerate after changing the source mark:

```sh
npx capacitor-assets generate --android
```

This overwrites every density variant under `android/app/src/main/res/`
(`mipmap-*`, `drawable-*`) — safe to re-run any time the source images in
`resources/` change.

## Back button, status bar, keyboard, safe areas

- **Hardware back button**: `src/app/native.ts` registers a
  `@capacitor/app` `backButton` listener that calls `history.back()` when
  the WebView has navigation history, or exits the app at the root —
  reusing the exact same `popstate` handling (including the "leave
  workout?" confirmation) the browser back button already goes through.
- **Status bar**: set to a dark style (light icons) with the app's navy
  background color, not overlaying the WebView — see `initStatusBar()` in
  `src/app/native.ts`.
- **Keyboard**: `android:windowSoftInputMode="adjustResize"` (manifest) +
  the Keyboard plugin's `resize: "native"` config
  (`capacitor.config.ts`) — the WebView viewport shrinks when the keyboard
  opens, so `position:fixed` elements (`#nav`, `#sessionBar`) stay above it
  instead of being covered.
- **Safe areas**: the CSS already uses `env(safe-area-inset-*)` (inherited
  from the original PWA, for notches/gesture bars) — unchanged, and equally
  applicable inside the Capacitor WebView.
- **Splash screen**: `launchAutoHide: false` in `capacitor.config.ts`, with
  `hideSplashScreen()` called at the end of `boot()` in `src/app/main.ts` —
  keeps the splash visible through migration + the onboarding-gate check,
  avoiding a flash of the wrong initial screen.

## Offline behavior

The Android app packages `dist/` locally (`android/app/src/main/assets/public`)
and loads it directly — no `server.url` is configured in
`capacitor.config.ts`, so the app never depends on GitHub Pages or any
remote host to function. SQLite runs natively via `@capacitor-community/sqlite`'s
Android implementation (not the browser WASM fallback used on the web
build). No normal workout workflow (logging, plan editing, browsing
history/PRs/progress, backup export) requires network access; only
advertising (Phase 7) will.

## Known limitations of this development environment

This project was built and validated in a sandboxed CLI environment with
no Android emulator, no physical device, and no display. A **debug build
via Gradle CLI was produced and verified to build without a display or
emulator** — see the commit history for the exact build log — but the
following still require a real device/emulator or Android Studio and could
not be done here:

- Visual verification of the running app on-device (layout, touch targets,
  keyboard behavior, status bar, splash screen appearance).
- Android process-lifecycle testing (backgrounding, low-memory kill,
  process death/restore) against a real Android runtime.
- `bundleRelease` was not attempted (no signing keystore — see "Signing").
- Play Console upload, Data Safety form submission, and internal testing
  track rollout.

See `docs/PLAY_STORE_CHECKLIST.md` for the full pre-submission checklist.
