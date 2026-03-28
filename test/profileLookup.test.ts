import { describe, expect, it } from "vitest";

import { getProfileValue } from "../src/profileLookup";
import type { Profile } from "../src/types";

describe("getProfileValue", () => {
  const profile: Profile = {
    basics: {
      firstName: "Jordan",
      lastName: "Lee",
      email: "jordan@example.com"
    },
    address: {
      city: "Seattle"
    },
    links: [
      { label: "LinkedIn", url: "https://linkedin.com/in/jordan" },
      { label: "GitHub", url: "https://github.com/jordan" },
      { label: "Portfolio", url: "https://jordan.dev" }
    ],
    education: [
      {
        school: "State University",
        degree: "BSc",
        field: "Computer Science",
        start: "2018-09",
        end: "2022-06"
      },
      {
        school: "Tech Institute",
        degree: "MS",
        field: "Software Engineering",
        start: "2023-09",
        end: "Present"
      }
    ],
    demographics: {
      workAuthorization: "Authorized",
      needsSponsorship: false,
      raceEthnicity: ["Asian"],
      veteranStatus: "I am not a protected veteran"
    }
  };

  it("returns direct nested values for normal dot paths", () => {
    expect(getProfileValue(profile, "basics.email")).toBe("jordan@example.com");
    expect(getProfileValue(profile, "address.city")).toBe("Seattle");
  });

  it("builds a full name from first and last name", () => {
    expect(getProfileValue(profile, "basics._fullName")).toBe("Jordan Lee");
  });

  it("finds known links by label", () => {
    expect(getProfileValue(profile, "links.linkedin")).toBe("https://linkedin.com/in/jordan");
    expect(getProfileValue(profile, "links.github")).toBe("https://github.com/jordan");
    expect(getProfileValue(profile, "links.website")).toBe("https://jordan.dev");
  });

  it("maps demographics fields used by the autofill aliases", () => {
    expect(getProfileValue(profile, "workAuth.usWorkAuthorization")).toBe("Authorized");
    expect(getProfileValue(profile, "workAuth.needsSponsorship")).toBe(false);
    expect(getProfileValue(profile, "demographics.race")).toEqual(["Asian"]);
    expect(getProfileValue(profile, "demographics.veteran")).toBe("I am not a protected veteran");
  });

  it("returns the most recent education entry and normalizes dates", () => {
    expect(getProfileValue(profile, "education.mostRecent.school")).toBe("Tech Institute");
    expect(getProfileValue(profile, "education.mostRecent.degree")).toBe("MS");
    expect(getProfileValue(profile, "education.mostRecent.field")).toBe("Software Engineering");
    expect(getProfileValue(profile, "education.mostRecent.start")).toBe("2023-09");
    expect(getProfileValue(profile, "education.mostRecent.end")).toBe("");
  });

  it("returns undefined for missing values", () => {
    expect(getProfileValue(profile, "work.company")).toBeUndefined();
    expect(getProfileValue({}, "links.linkedin")).toBeUndefined();
  });
});
