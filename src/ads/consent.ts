// Wraps Google's User Messaging Platform (UMP) consent flow — the
// standard, Google-provided mechanism for EEA/UK/Switzerland consent
// requirements — via @capacitor-community/admob's consent APIs. On the
// web build (no native platform), consent is never obtainable, so ads
// are correctly never requested there either.
import { Capacitor } from "@capacitor/core";
import { AdMob, AdmobConsentStatus } from "@capacitor-community/admob";
import { getNonPersonalisedAds } from "../database/settingsRepo";

export interface ConsentResult {
  canRequestAds: boolean;
  nonPersonalised: boolean;
}

let consentInfo: Awaited<ReturnType<typeof AdMob.requestConsentInfo>> | null = null;

/** Call once, early in boot — requests the user's region-appropriate
 *  consent info and shows Google's consent form if (and only if) it's
 *  required for this user's location. Safe to call repeatedly; a no-op
 *  after the first successful call within a session. */
export async function initConsent(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    consentInfo = await AdMob.requestConsentInfo();
    if (consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
      consentInfo = await AdMob.showConsentForm();
    }
  } catch {
    // No network / consent service unavailable — treat as "can't request
    // ads yet" rather than crashing; getConsent() below reflects that.
    consentInfo = null;
  }
}

/** Re-opens Google's privacy options form so the user can change their
 *  choice later — this is the "privacy-choices entry in settings" the
 *  product rules require. */
export async function openPrivacyOptionsForm(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.showPrivacyOptionsForm();
  } catch {
    /* best effort */
  }
}

export async function getConsent(): Promise<ConsentResult> {
  const nonPersonalised = await getNonPersonalisedAds();
  if (!Capacitor.isNativePlatform() || !consentInfo) {
    return { canRequestAds: false, nonPersonalised };
  }
  return { canRequestAds: consentInfo.canRequestAds, nonPersonalised };
}
