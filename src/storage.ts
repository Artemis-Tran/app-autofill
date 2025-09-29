import type { Profile } from "./types";

export async function saveProfile(profile: Profile, allowDemo: boolean) {
  await (window as any).chrome.storage.local.set({ profile, settings: { allowDemographics: allowDemo } });
}
export async function loadProfile(): Promise<{profile?: Profile; allowDemographics: boolean}> {
  const { profile, settings } = await (window as any).chrome.storage.local.get(["profile","settings"]);
  return { profile, allowDemographics: Boolean(settings?.allowDemographics) };
}
