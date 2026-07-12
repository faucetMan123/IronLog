import { toast } from "../app/format";
import { modalConfirm, modalPrompt } from "../components/modal";
import { eraseAllData, getNonPersonalisedAds, setNonPersonalisedAds } from "../database/settingsRepo";
import { openPrivacyOptionsForm } from "../ads/consent";
import { Capacitor } from "@capacitor/core";
import { buildBackup } from "../exports/backup";
import { downloadFile } from "../exports/export";
import { CURRENT_SCHEMA_VERSION } from "../database/schema";
import { APP_VERSION } from "../exports/backup";
import { go } from "../app/router";

async function handleErase(): Promise<void> {
  const ok = await modalConfirm(
    "Erase all data?",
    "This permanently deletes every plan, workout day, session, set, and custom exercise on this device. This cannot be undone. Consider exporting a backup first.",
    "Continue",
    true
  );
  if (!ok) return;
  const typed = await modalPrompt('Type "DELETE" to confirm', "DELETE");
  if (typed !== "DELETE") {
    toast("Erase cancelled");
    return;
  }
  await eraseAllData();
  toast("All data erased");
  go("onboarding", undefined, true);
}

async function handleExport(): Promise<void> {
  const backup = await buildBackup();
  downloadFile(`elsupremo-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), "application/json");
  toast("Backup downloaded");
}

export async function mount(container: HTMLElement): Promise<void> {
  const nonPersonalised = await getNonPersonalisedAds();
  container.innerHTML = `<div style="margin-top:4px">
    <div class="card" style="margin-bottom:13px">
      <div class="settings-title">How your data works</div>
      <div class="dimtext" style="line-height:1.6">
        • No account required.<br>
        • Your workout records are stored locally on your device and are never uploaded to our servers.<br>
        • No behavioural analytics.<br>
        • Your workout data is never sold.<br>
        • If ads are shown, the ad SDK may process device and advertising information — never your workout content (exercises, weights, reps, notes, plans, or progress). See below.
      </div>
    </div>

    <div class="settings-card card">
      <div class="settings-title">Advertising</div>
      <div class="dimtext" style="line-height:1.6;margin-bottom:12px">Choose whether ads (if shown) may be personalised. This does not affect your workout data, which is never shared with the ad SDK either way.</div>
      <div class="togglerow">
        <button class="toggle ${nonPersonalised ? "active" : ""}" id="nonPersonalisedBtn">Non-personalised ads</button>
        <button class="toggle ${!nonPersonalised ? "active" : ""}" id="personalisedBtn">Personalised ads</button>
      </div>
      ${Capacitor.isNativePlatform() ? '<button class="btn btn-ghost" id="privacyChoicesBtn" style="margin-top:10px">Privacy choices (consent form)</button>' : ""}
    </div>

    <div class="settings-card card">
      <div class="settings-title">Your data</div>
      <button class="btn" id="exportBtn" style="margin-bottom:10px">Export all data</button>
      <button class="btn btn-danger" id="eraseBtn">Erase all data</button>
    </div>

    <div class="settings-card card">
      <div class="settings-title">About</div>
      <div class="dimtext mono" style="font-size:11.5px;line-height:1.8">
        App version: ${APP_VERSION}<br>
        Database schema version: ${CURRENT_SCHEMA_VERSION}
      </div>
    </div>
  </div>`;

  container.querySelector("#exportBtn")?.addEventListener("click", () => void handleExport());
  container.querySelector("#eraseBtn")?.addEventListener("click", () => void handleErase());
  container.querySelector("#nonPersonalisedBtn")?.addEventListener("click", () => void setNonPersonalisedAds(true).then(() => mount(container)));
  container.querySelector("#personalisedBtn")?.addEventListener("click", () => void setNonPersonalisedAds(false).then(() => mount(container)));
  container.querySelector("#privacyChoicesBtn")?.addEventListener("click", () => void openPrivacyOptionsForm());
}
