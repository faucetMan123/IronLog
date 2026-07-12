# Privacy Model

## Core statement

**Your workout records are stored locally on your device and are never
uploaded to our servers.** There is no account, no sign-up, and no
server-side database for workout content anywhere in this project — the
web build talks to no backend at all, and the Android build has no
`server.url` configured (see `capacitor.config.ts`), so it never depends
on a remote host to function.

This is accurate specifically because "our servers" don't exist: there is
no first-party backend. It would be inaccurate to additionally claim "the
app collects no data whatsoever" once advertising is enabled, because the
ad SDK does process some data on Google's side — see § Advertising below.
That's why the privacy centre and this document are precise about *whose*
data goes *where*, rather than making a blanket "we collect nothing" claim.

## What is stored, and where

All workout content lives in a local SQLite database (native on Android,
WASM/IndexedDB-backed in the browser build) — see `docs/DATA_MODEL.md` for
the schema. This includes: plans, workout days, exercises (including
custom ones you create), performed sessions, sets, weights, reps, and any
notes you write. None of it is transmitted anywhere by this app's own code.

## What this app does NOT do

- No account or sign-up of any kind.
- No behavioural analytics (no event tracking, no usage analytics SDK, no
  crash reporting SDK — see rule against adding one without explicit
  approval).
- No sale of workout data — there is no mechanism by which it could be
  sold, since it never leaves the device via this app's own code.
- No cloud backup of the local database: `android:allowBackup="false"`
  plus explicit empty data-extraction/backup rules (see
  `docs/ANDROID_RELEASE.md`) mean Android's Auto Backup and device-transfer
  features never capture it either.
- No remote AI services.
- No Firebase, no cloud analytics.

## Advertising

**Provider**: Google AdMob, via `@capacitor-community/admob`.

### The boundary

```
local workout database
        |
application logic (screens/, database/)
        | (screens pass ONLY an ad placement name — see src/ads/placements.ts)
        v  no workout values cross this line
advertising adapter (src/ads/adMobAdapter.ts)
        |
        v
@capacitor-community/admob -> Google AdMob SDK
```

`src/ads/adMobAdapter.ts` is the **only** module in the codebase allowed to
import the AdMob plugin. Its public functions take nothing but an
`AdPlacement` value (an opaque enum with four possible values — see below)
and consent/config booleans it reads internally. This isn't just a
convention: the AdMob plugin's own request options
(`adId`/`isTesting`/`npa`/`margin`/`immersiveMode`) have no free-form field
that could carry exercise names, weights, reps, notes, plan content, or
progress data even if a caller tried to pass them. `src/tests/e2e/ads-boundary.spec.ts`
seeds distinctive ("canary") workout content, then captures every network
request made while navigating through all four ad-permitted screens plus
the active-workout/history/PR/export screens, and asserts the canary never
appears in any of them.

### What AdMob processes (once enabled with a real ad unit)

Per Google's own AdMob documentation, the SDK itself may process: device
and advertising identifiers, general device/OS information, IP address
(for geolocation-level ad targeting and fraud prevention), and ad
interaction events (impressions/clicks). **None of this originates from,
or includes, your workout data** — the app never passes it in. This is the
list to declare under "Data collected/shared" in Play Console's Data
Safety form once ads are enabled — see `docs/PLAY_STORE_CHECKLIST.md`.

### Where ads are (and are never) shown

Permitted placements — home dashboard, history landing screen, progress
landing screen, plan library (`src/ads/placements.ts`, enforced centrally
in `src/app/router.ts`, not scattered per-screen):

- Never during an active workout, never between sets.
- Never in onboarding or the Mentor flow.
- Never on the backup/export or privacy centre screens.
- Never on the plan editor (only the plan *library* list).
- No forced interstitial after completing a set — this app doesn't show
  interstitials at all in this phase (banner ads only).
- No rewarded ads gating any core functionality — there is no rewarded ad
  integration in this phase.

`src/tests/unit/adPlacements.test.ts` exhaustively checks every tab against
this list, including the defensive rule that no placement is ever active
while a workout session is in progress, regardless of tab.

### Consent (EEA / UK / Switzerland)

Handled via Google's own User Messaging Platform (UMP), wrapped in
`src/ads/consent.ts`: `initConsent()` requests region-appropriate consent
info at startup and shows Google's consent form only where required; ads
are never requested (`canRequestAds` stays false) until that resolves. A
"Privacy choices" entry in the Privacy Centre
(`openPrivacyOptionsForm()`) lets the user reopen the form later to change
their choice.

### Non-personalised ads

The Privacy Centre's ad-personalisation toggle (default: non-personalised
— the more private option) is threaded into every banner request's `npa`
flag. This is independent of workout data, which is never shared with the
ad SDK regardless of this setting.

### Test vs. production ad IDs

`src/ads/adConfig.ts` (JS side) and `android/app/build.gradle`'s
`admobAppId` manifest placeholder (native side) both default to Google's
publicly documented test IDs and only use a real ID if one is supplied via
environment configuration (`VITE_ADMOB_BANNER_AD_UNIT_ID`,
`VITE_ADMOB_APP_ID`, `ADMOB_APP_ID`) — never hardcoded, and development
builds always use test ads regardless of what's configured, as an extra
safety net (`isUsingTestAds()`).

## Erasing your data

The Privacy Centre's "Erase all data" flow (double confirmation: a
destructive-action modal, then typing "DELETE") permanently removes every
plan, workout day, session, set, and custom exercise from the local
database. Uninstalling the app has the same effect and is irreversible
unless you've exported a backup first — the export/backup flow warns about
this (see the Data tab).

## Database schema version / app version

Shown in the Privacy Centre for support/debugging purposes — see
`docs/DATA_MODEL.md` for what the schema version tracks.
