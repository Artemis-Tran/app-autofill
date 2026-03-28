import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadProfile, saveProfile } from "../src/storage";
import type { Profile } from "../src/types";

describe("storage", () => {
  const set = vi.fn();
  const get = vi.fn();
  const originalWindow = globalThis.window;

  const profile: Profile = {
    basics: {
      firstName: "Taylor",
      lastName: "Nguyen",
      email: "taylor@example.com"
    }
  };

  beforeEach(() => {
    set.mockReset();
    get.mockReset();

    Object.defineProperty(globalThis, "window", {
      value: {
        chrome: {
          storage: {
            local: {
              set,
              get
            }
          }
        }
      },
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true
    });
  });

  it("saves the profile to chrome local storage", async () => {
    await saveProfile(profile);

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({ profile });
  });

  it("loads the profile and returns allowDemographics as true when enabled", async () => {
    get.mockResolvedValue({
      profile,
      settings: { allowDemographics: true }
    });

    const result = await loadProfile();

    expect(get).toHaveBeenCalledWith(["profile", "settings"]);
    expect(result).toEqual({
      profile,
      allowDemographics: true
    });
  });

  it("defaults allowDemographics to false when settings are missing", async () => {
    get.mockResolvedValue({
      profile
    });

    const result = await loadProfile();

    expect(result).toEqual({
      profile,
      allowDemographics: false
    });
  });
});
