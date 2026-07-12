# Google Play Submission Checklist

Items marked **[MANUAL]** require a human with Play Console access, real
credentials, or a physical/emulated device — none of these could be done
from the development environment this project was built in.

## Before your first upload

- [ ] **[MANUAL]** Confirm `com.elsupremo.workoutlog` is available in Play
      Console (application IDs cannot be changed after first publish).
- [ ] **[MANUAL]** Create the app listing in Play Console.
- [ ] **[MANUAL]** Enroll in Play App Signing (recommended — see
      `docs/ANDROID_RELEASE.md` § Signing).
- [ ] **[MANUAL]** Generate a real release keystore and store it securely
      outside the repository.
- [ ] Bump `versionCode`/`versionName` in `android/app/build.gradle`.
- [ ] Build the release bundle: `cd android && ./gradlew bundleRelease`.
- [ ] **[MANUAL]** Upload `app-release.aab` to a Play Console testing
      track (internal testing first).

## Store listing content

- [ ] App name: "El Supremo" (or the store-facing working title, "El
      Supremo: Private Workout Log", if a distinct listing title is
      wanted).
- [ ] Short description emphasizing: private workout tracking, no account,
      no cloud workout storage.
- [ ] Full description should include the accurate privacy sentence:
      "Your workout records are stored locally on your device and are
      never uploaded to our servers."
- [ ] **[MANUAL]** Screenshots (phone, at minimum) — capture from a real
      device/emulator; none were captured in this environment (no
      display/emulator available).
- [ ] **[MANUAL]** Feature graphic, app icon for the store listing (the
      in-app launcher icon is generated — see `docs/ANDROID_RELEASE.md` §
      Icons; the *store listing* graphic is a separate asset Play Console
      requires at 1024x500, not generated here).
- [ ] Category: Health & Fitness.
- [ ] Content rating questionnaire: **[MANUAL]**, answer accurately — this
      app has no user-generated content shared with others, no chat, no
      location, and (in this phase) ads only if/when AdMob is enabled.

## Data Safety form

This form must accurately reflect what the app actually does. Based on the
implementation:

- **Data collected**: none by the app itself. Workout data (plans,
  exercises, sets, weights, reps, notes) is stored **only** locally in
  SQLite on-device and is never transmitted.
- **Data shared**: none by the app itself.
- **If AdMob (Phase 7) is enabled before submission**: declare what AdMob
  processes (device/advertising identifiers, general device information)
  under "Data collected/shared" per AdMob's own disclosures — see
  `docs/PRIVACY.md` § Advertising for the exact boundary. Workout content
  must never appear in this section because it is never given to the ad
  SDK — verified by `src/tests/ads/` (see `docs/TESTING.md`).
- **Security practices**: data is not encrypted in transit (nothing is
  transmitted); "Data can be deleted" — yes, via the in-app Privacy Centre
  erase-all-data flow.
- [ ] **[MANUAL]** Actually fill in and submit the form in Play Console —
      this document only states what the true answers should be based on
      the code; the form itself must be completed by whoever manages the
      Play Console listing.

## Privacy policy

- [ ] **[MANUAL]** Publish a privacy policy at a stable, publicly
      reachable URL (Play Console requires this even for privacy-first,
      no-collection apps) and link it in Play Console's app content
      section. `docs/PRIVACY.md` in this repo is the source content —
      adapt it into a hosted page; do not link the raw GitHub file as the
      privacy policy URL for a production listing.
- [ ] If Phase 7's AdMob is enabled, the privacy policy must disclose
      AdMob's data processing (see `docs/PRIVACY.md`).

## Permissions

- [ ] Review the permissions actually declared in the built APK:
      `aapt dump badging app-release.aab` (or the debug APK) and confirm
      only `INTERNET` (plus Android-generated ones like
      `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`) are present — see
      `docs/ANDROID_RELEASE.md` for why `USE_BIOMETRIC`/`USE_FINGERPRINT`
      were explicitly stripped (an unused permission the SQLite plugin's
      manifest pulls in by default).
- [ ] If Phase 7 adds AdMob, confirm no additional unexpected permissions
      are merged in beyond what AdMob's SDK itself requires.

## Target API level / technical requirements

- [ ] Confirm `targetSdkVersion` in `android/variables.gradle` still meets
      Google Play's current minimum target API requirement at submission
      time (it tracks a rolling deadline — re-check even if this was
      correct when the project was generated).
- [ ] **[MANUAL]** Test the release build on a real device or emulator —
      not done in this environment.
- [ ] **[MANUAL]** Test Android App Bundle installation via `bundletool`
      or Play Console's internal testing track.

## Consent / advertising (only relevant once Phase 7 ships)

- [ ] EEA/UK/Switzerland consent flow verified to actually gate ad
      requests until consent is obtained.
- [ ] Test ad unit IDs replaced with production IDs **only** at actual
      release time, sourced from environment configuration — never
      committed to the repo (see `docs/PRIVACY.md` § Advertising).
- [ ] Non-personalised ads path tested.
- [ ] Confirm no ads appear during an active workout, between sets, in
      onboarding, or in backup/privacy screens (automated: see the ads
      placement tests referenced in `docs/TESTING.md`).

## Post-submission

- [ ] **[MANUAL]** Monitor the first review outcome; Play Console review
      can request changes even after a checklist like this is followed.
- [ ] **[MANUAL]** Set up a rollout plan (staged rollout percentage)
      rather than 100% on day one, if this is a public release.
