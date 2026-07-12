// Native (Android/Capacitor) integration: hardware back button, status
// bar, and splash screen. Every call here is guarded by
// Capacitor.isNativePlatform() — in the browser/GitHub Pages build this
// module is a no-op, since the web build already has correct back
// navigation (history-based) and no native chrome to configure.
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

export function initHardwareBackButton(): void {
  if (!Capacitor.isNativePlatform()) return;
  // Delegates to the same history.back() the browser back button already
  // uses — router.ts's popstate handler is what actually decides whether
  // to confirm leaving an in-progress workout, navigate, or (having
  // nothing left to pop) let the app exit.
  App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      history.back();
    } else {
      void App.exitApp();
    }
  });
}

export async function initStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark }); // dark style = light (white) status bar icons, for our dark navy background
    await StatusBar.setBackgroundColor({ color: "#081120" });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    // StatusBar plugin can be unavailable on some OEM builds — status bar
    // just keeps its OS default appearance rather than crashing boot.
  }
}

/** Call once app/main.ts's boot() has finished and the first real screen
 *  has rendered — see capacitor.config.ts's SplashScreen.launchAutoHide. */
export async function hideSplashScreen(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SplashScreen.hide();
  } catch {
    /* best effort */
  }
}
