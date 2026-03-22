import { describe, expect, it } from "vitest";
import { wrapText } from "@/lib/btx/wrap";

describe("wrapText", () => {
  it("haelt die maximale Zeilenbreite ein", () => {
    const lines = wrapText(
      "Mit ueber zwei Jahrzehnten praktischer Erfahrung entwickle ich sichere, skalierbare und tragfaehige Systeme.",
      40,
    );

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length <= 40)).toBe(true);
  });

  it("trennt ueberlange Woerter", () => {
    const lines = wrapText("SUPERSUPERSUPERSUPERSUPERSUPERSUPERLANG", 10);
    expect(lines).toEqual(["SUPERSUPER", "SUPERSUPER", "SUPERSUPER", "SUPERLANG"]);
  });
});
