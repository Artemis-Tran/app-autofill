import { describe, expect, it } from "vitest";

import { isScriptedChangeInProgress, runWithScriptedChange } from "../src/editTracking";

describe("editTracking", () => {
  it("marks scripted changes only while the callback is running", () => {
    expect(isScriptedChangeInProgress()).toBe(false);

    runWithScriptedChange(() => {
      expect(isScriptedChangeInProgress()).toBe(true);
    });

    expect(isScriptedChangeInProgress()).toBe(false);
  });

  it("restores state after nested scripted changes", () => {
    runWithScriptedChange(() => {
      expect(isScriptedChangeInProgress()).toBe(true);

      runWithScriptedChange(() => {
        expect(isScriptedChangeInProgress()).toBe(true);
      });

      expect(isScriptedChangeInProgress()).toBe(true);
    });

    expect(isScriptedChangeInProgress()).toBe(false);
  });

  it("restores state if the callback throws", () => {
    expect(() =>
      runWithScriptedChange(() => {
        throw new Error("boom");
      })
    ).toThrow("boom");

    expect(isScriptedChangeInProgress()).toBe(false);
  });
});
