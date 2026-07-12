// The advertising boundary. This is the ONLY module in the codebase
// allowed to import @capacitor-community/admob. Every exported function
// here takes nothing but an AdPlacement (an opaque enum) and consent/
// config booleans it reads itself — there is no parameter, anywhere in
// this file's public API, through which workout data (exercise names,
// weights, reps, notes, plans, or progress) could flow in. That is a
// structural guarantee, not just a convention: the AdMob plugin's own
// AdOptions type (adId/isTesting/npa/margin/immersiveMode) has no
// free-form field to carry it even if a caller tried.
//
//   local workout database
//           |
//   application logic (screens/, database/)
//           | (screens pass ONLY an AdPlacement — see app/router.ts)
//           v no workout values cross this line
//   advertising adapter (this file)
//           |
//           v
//   @capacitor-community/admob -> Google AdMob SDK
import { Capacitor } from "@capacitor/core";
import { AdMob, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } from "@capacitor-community/admob";
import { getAdMobAppId, getBannerAdUnitId } from "./adConfig";
import { getConsent } from "./consent";
import type { AdPlacement } from "./placements";

let initialized = false;
let currentPlacement: AdPlacement | null = null;

/** The banner renders as a native overlay OUTSIDE the WebView's DOM, not
 *  as an HTML element — so it can't be positioned with CSS. It's placed at
 *  the very bottom of the screen, and this listener pushes #nav (which is
 *  also fixed at the bottom) up by the banner's actual height, so the ad
 *  never overlaps navigation controls ("no misleading ad placement beside
 *  controls"). Reset to 0 whenever no placement is active. */
function setReservedBottomSpace(px: number): void {
  document.documentElement.style.setProperty("--ad-banner-height", `${px}px`);
}

async function ensureInitialized(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (initialized) return true;
  const app = getAdMobAppId();
  try {
    await AdMob.initialize({ initializeForTesting: app.isTesting });
    await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info) => setReservedBottomSpace(info.height));
    await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => setReservedBottomSpace(0));
    initialized = true;
    return true;
  } catch {
    // No network, plugin unavailable, etc. — ads are additive, never
    // block core functionality, so failures here are silent.
    return false;
  }
}

/** Shows (or switches) the banner ad for one of the four permitted
 *  placements. Safe to call on every render — no-ops if already showing
 *  the same placement, and no-ops entirely on the web build or when
 *  consent hasn't been obtained where required. */
export async function syncBannerForPlacement(placement: AdPlacement | null): Promise<void> {
  if (placement === currentPlacement) return;
  currentPlacement = placement;

  if (!placement) {
    setReservedBottomSpace(0);
    if (Capacitor.isNativePlatform() && initialized) {
      await AdMob.hideBanner().catch(() => {});
    }
    return;
  }

  const consent = await getConsent();
  if (!consent.canRequestAds) return;

  const ready = await ensureInitialized();
  if (!ready) return;

  const banner = getBannerAdUnitId();
  await AdMob.showBanner({
    adId: banner.id,
    isTesting: banner.isTesting,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    npa: consent.nonPersonalised,
  }).catch(() => {
    // Ad failed to load (offline, no fill, etc.) — the app must keep
    // working exactly as if no placement had been requested at all.
  });
}
