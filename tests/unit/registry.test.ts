import { describe, expect, it } from "vitest";
import { getMainPageDefinitions, getRenderedPages } from "@/lib/btx/page-registry";

describe("Seitennummern und Registry", () => {
  it("vergibt stabile Projektseiten von 210 bis 216", () => {
    const ids = getMainPageDefinitions()
      .filter((page) => page.id >= "210" && page.id <= "216")
      .map((page) => page.id);

    expect(ids).toEqual(["210", "211", "212", "213", "214", "215", "216"]);
  });

  it("vergibt stabile Erfahrungsseiten von 510 bis 520", () => {
    const ids = getMainPageDefinitions()
      .filter((page) => page.id >= "510" && page.id <= "520")
      .map((page) => page.id);

    expect(ids).toEqual(["510", "511", "512", "513", "514", "515", "516", "517", "518", "519", "520"]);
  });

  it("erstellt Fortsetzungsseiten fuer lange Inhalte", () => {
    const hasPrivacyContinuation = getRenderedPages().some((page) => page.id === "998" && page.subpage === 2);
    const hasExperienceContinuation = getRenderedPages().some((page) => page.id === "510" && page.subpage === 2);

    expect(hasPrivacyContinuation).toBe(true);
    expect(hasExperienceContinuation).toBe(true);
  });
});
