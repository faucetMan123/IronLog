import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.elsupremo.workoutlog",
  appName: "El Supremo",
  webDir: "dist",
  // No server.url — the app must run fully offline from the bundled web
  // assets, not fetch from a remote host or GitHub Pages.
  android: {
    allowMixedContent: false,
  },
  // android:allowBackup="false" plus data-extraction/backup rules (so
  // workout data never enters Android's automatic cloud backup) are
  // configured directly in the generated android/ project — see
  // docs/ANDROID_RELEASE.md and docs/PRIVACY.md.
  plugins: {
    // Kept visible until app/main.ts's boot() finishes (migration +
    // onboarding-gate check), then explicitly hidden — avoids a flash of
    // the home screen before we know whether onboarding should show.
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#081120",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    // Resizes the WebView (rather than overlaying/panning it) when the
    // keyboard opens, so fixed-position elements like #nav and
    // #sessionBar stay above the keyboard instead of being hidden under it.
    Keyboard: {
      resize: "native",
    },
  },
};

export default config;
