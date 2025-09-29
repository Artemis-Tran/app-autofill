import { saveProfile, loadProfile } from "../storage";
import type { Profile } from "../types";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const area = $("profile") as HTMLTextAreaElement;
const status = $("status") as HTMLDivElement;
const allow = $("allowDemo") as HTMLInputElement;

(async () => {
  const { profile, allowDemographics } = await loadProfile();
  if (profile) area.value = JSON.stringify(profile, null, 2);
  allow.checked = !!allowDemographics;
})();

$("save")!.addEventListener("click", async () => {
  try {
    const profile = JSON.parse(area.value) as Profile;
    await saveProfile(profile, allow.checked);
    status.textContent = "Saved ✓";
  } catch {
    status.textContent = "Invalid JSON";
  }
});

$("fill")!.addEventListener("click", async () => {
  try {
    const profile = JSON.parse(area.value) as Profile;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: "FILL_EXECUTE", payload: { profile, allowDemographics: allow.checked } });
      status.textContent = "Fill sent. Review highlighted fields.";
    } else {
      status.textContent = "Cannot find active tab.";
    }
  } catch {
    status.textContent = "Invalid JSON";
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "FILL_DONE") {
    status.textContent = `Filled ${msg.count} fields.`;
  }
});
