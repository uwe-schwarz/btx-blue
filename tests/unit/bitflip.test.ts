import { describe, expect, it } from "vitest";

import { applyBitFlipNoise, getBitFlipCandidates } from "@/lib/btx/bitflip";

describe("getBitFlipCandidates", () => {
  it("uses Bedstead's distributed Unicode repertoire for flips", () => {
    const candidates = getBitFlipCandidates("A");

    expect(candidates).toContain("@");
    expect(candidates).toContain("a");
    expect(candidates).toContain("Á");
    expect(candidates).toContain("Ł");
    expect(candidates).toContain("с");
  });

  it("finds matching flips for Latin-1 glyphs", () => {
    const candidates = getBitFlipCandidates("ü");

    expect(candidates).toContain("Ü");
    expect(candidates).toContain("ì");
  });
});

describe("applyBitFlipNoise", () => {
  it("returns the original string when noise is disabled", () => {
    expect(applyBitFlipNoise("BTX", 0, () => 0)).toBe("BTX");
  });

  it("flips at most one bit per character", () => {
    const randomValues = [0, 0, 0, 0];
    const random = () => randomValues.shift() ?? 0;
    const expected = `${getBitFlipCandidates("A")[0]}${getBitFlipCandidates("B")[0]}`;

    expect(applyBitFlipNoise("AB", 1, random)).toBe(expected);
  });
});
