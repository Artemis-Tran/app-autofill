import { describe, expect, it } from "vitest";

import { findBestSelectOption } from "../src/selectMatcher";

describe("findBestSelectOption", () => {
  it("matches an option by exact text", () => {
    const option = findBestSelectOption(
      [
        { text: "Yes", value: "y" },
        { text: "No", value: "n" }
      ],
      "Yes"
    );

    expect(option).toBeDefined();
    expect(option?.text).toBe("Yes");
  });

  it("matches an option by exact value", () => {
    const option = findBestSelectOption(
      [
        { text: "United States", value: "us" },
        { text: "Canada", value: "ca" }
      ],
      "ca"
    );

    expect(option).toBeDefined();
    expect(option?.text).toBe("Canada");
  });

  it("matches veteran dropdown options with different phrasing", () => {
    const option = findBestSelectOption(
      [
        { text: "Select one", value: "", disabled: true },
        { text: "I am a protected veteran", value: "protected" },
        { text: "I am not a protected veteran", value: "not_protected" },
        { text: "I don't wish to answer", value: "decline" }
      ],
      "Not a protected veteran"
    );

    expect(option).toBeDefined();
    expect(option?.value).toBe("not_protected");
  });

  it("normalizes casing and extra whitespace for exact matches", () => {
    const option = findBestSelectOption(
      [
        { text: "Prefer not to say", value: "decline" },
        { text: "Yes", value: "yes" }
      ],
      "  prefer NOT to say  "
    );

    expect(option).toBeDefined();
    expect(option?.value).toBe("decline");
  });

  it("prefers exact matches when they exist", () => {
    const option = findBestSelectOption(
      [
        { text: "Yes", value: "yes" },
        { text: "No", value: "no" }
      ],
      "No"
    );

    expect(option).toBeDefined();
    expect(option?.value).toBe("no");
  });

  it("ignores disabled options even when they would otherwise match", () => {
    const option = findBestSelectOption(
      [
        { text: "No", value: "no", disabled: true },
        { text: "Yes", value: "yes" }
      ],
      "No"
    );

    expect(option).toBeUndefined();
  });

  it("matches short values against longer option text when the wording clearly overlaps", () => {
    const option = findBestSelectOption(
      [
        { text: "Bachelor's degree", value: "bachelors" },
        { text: "Master's degree", value: "masters" }
      ],
      "Bachelor"
    );

    expect(option).toBeDefined();
    expect(option?.value).toBe("bachelors");
  });

  it("matches options that share the important words after tokenization", () => {
    const option = findBestSelectOption(
      [
        { text: "Asian (Not Hispanic or Latino)", value: "asian" },
        { text: "White (Not Hispanic or Latino)", value: "white" }
      ],
      "Asian"
    );

    expect(option).toBeDefined();
    expect(option?.value).toBe("asian");
  });

  it("does not force a weak dropdown match", () => {
    const option = findBestSelectOption(
      [
        { text: "Morning", value: "morning" },
        { text: "Evening", value: "evening" }
      ],
      "Not a protected veteran"
    );

    expect(option).toBeUndefined();
  });

  it("returns undefined when every option is disabled", () => {
    const option = findBestSelectOption(
      [
        { text: "Yes", value: "yes", disabled: true },
        { text: "No", value: "no", disabled: true }
      ],
      "Yes"
    );

    expect(option).toBeUndefined();
  });
});
