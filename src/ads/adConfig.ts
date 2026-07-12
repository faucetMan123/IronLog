// Ad unit ID resolution. Test IDs are Google's own published, public
// AdMob test ad unit IDs (safe to hardcode — Google documents and expects
// this: https://developers.google.com/admob/android/test-ads) and are
// used whenever a production ID hasn't been supplied via environment
// configuration. Production IDs are NEVER hardcoded here or anywhere else
// in the repo — see docs/PRIVACY.md § Advertising.
const isDev = import.meta.env.DEV;

// Google's public Android test ad unit IDs (adaptive banner).
const TEST_BANNER_AD_UNIT_ID = "ca-app-pub-3940256099942544/9214589741";
const TEST_APP_ID = "ca-app-pub-3940256099942544~3347511713";

function envOrTestId(envVar: string | undefined, testId: string): { id: string; isTesting: boolean } {
  if (envVar && envVar.trim()) return { id: envVar.trim(), isTesting: false };
  return { id: testId, isTesting: true };
}

export function getAdMobAppId(): { id: string; isTesting: boolean } {
  return envOrTestId(import.meta.env.VITE_ADMOB_APP_ID as string | undefined, TEST_APP_ID);
}

export function getBannerAdUnitId(): { id: string; isTesting: boolean } {
  return envOrTestId(import.meta.env.VITE_ADMOB_BANNER_AD_UNIT_ID as string | undefined, TEST_BANNER_AD_UNIT_ID);
}

/** True whenever a real production ad unit ID hasn't been configured via
 *  environment variables — i.e. every build except a deliberately
 *  configured release build. Development always uses test ads regardless
 *  of what's configured, as an extra safety net. */
export function isUsingTestAds(): boolean {
  return isDev || getBannerAdUnitId().isTesting;
}
