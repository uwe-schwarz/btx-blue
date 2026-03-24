const BEDSTEAD_CODEPOINT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0020, 0x007e],
  [0x00a0, 0x00ac],
  [0x00ae, 0x0101],
  [0x0104, 0x0113],
  [0x0116, 0x011d],
  [0x0120, 0x0121],
  [0x0126, 0x012b],
  [0x012e, 0x0135],
  [0x0138, 0x0138],
  [0x013d, 0x0144],
  [0x0147, 0x014d],
  [0x0152, 0x0155],
  [0x0158, 0x0159],
  [0x015b, 0x015b],
  [0x015e, 0x015f],
  [0x0161, 0x0165],
  [0x016a, 0x016b],
  [0x016e, 0x016f],
  [0x0172, 0x017f],
  [0x0188, 0x0188],
  [0x018e, 0x018f],
  [0x0192, 0x0192],
  [0x0199, 0x0199],
  [0x019b, 0x019b],
  [0x019e, 0x019e],
  [0x01a5, 0x01a5],
  [0x01a7, 0x01a8],
  [0x01ab, 0x01ab],
  [0x01ad, 0x01ad],
  [0x01bb, 0x01bb],
  [0x01c0, 0x01c3],
  [0x01dd, 0x01dd],
  [0x01e2, 0x01e3],
  [0x01f0, 0x01f0],
  [0x0232, 0x0233],
  [0x0237, 0x0237],
  [0x023f, 0x0240],
  [0x0245, 0x0245],
  [0x0250, 0x027e],
  [0x0280, 0x0284],
  [0x0286, 0x02ad],
  [0x02b0, 0x02b0],
  [0x02b2, 0x02b2],
  [0x02b9, 0x02ba],
  [0x02bc, 0x02bc],
  [0x02c6, 0x02c8],
  [0x02cc, 0x02cc],
  [0x02d0, 0x02d1],
  [0x02d8, 0x02dd],
  [0x02e0, 0x02e9],
  [0x037f, 0x037f],
  [0x0384, 0x0386],
  [0x0388, 0x038a],
  [0x038c, 0x038c],
  [0x038e, 0x03a1],
  [0x03a3, 0x03ce],
  [0x03d5, 0x03d5],
  [0x03f3, 0x03f3],
  [0x0400, 0x0402],
  [0x0404, 0x040b],
  [0x040e, 0x0452],
  [0x0454, 0x045b],
  [0x045e, 0x045f],
  [0x0490, 0x0493],
  [0x05d0, 0x05ea],
] as const;

const BIT_FLIP_MASKS = [0x001, 0x002, 0x004, 0x008, 0x010, 0x020, 0x040, 0x080, 0x100, 0x200, 0x400] as const;
const BEDSTEAD_VISIBLE_CHARACTER = /[\p{Letter}\p{Number}\p{Punctuation}\p{Symbol}\p{Separator}]/u;

export type RandomSource = () => number;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isBedsteadCodepoint(codepoint: number): boolean {
  return BEDSTEAD_CODEPOINT_RANGES.some(([start, end]) => codepoint >= start && codepoint <= end);
}

function isVisibleBedsteadCodepoint(codepoint: number): boolean {
  if (codepoint === 0x00ad || !isBedsteadCodepoint(codepoint)) {
    return false;
  }

  return BEDSTEAD_VISIBLE_CHARACTER.test(String.fromCodePoint(codepoint));
}

export function getBitFlipCandidates(char: string): string[] {
  const codepoint = char.codePointAt(0);

  if (codepoint === undefined) {
    return [];
  }

  const candidates = new Set<string>();

  for (const mask of BIT_FLIP_MASKS) {
    const flipped = codepoint ^ mask;

    if (!isVisibleBedsteadCodepoint(flipped)) {
      continue;
    }

    candidates.add(String.fromCodePoint(flipped));
  }

  candidates.delete(char);
  return [...candidates];
}

export function flipCharacter(char: string, random: RandomSource = Math.random): string {
  const candidates = getBitFlipCandidates(char);

  if (candidates.length === 0) {
    return char;
  }

  const index = Math.min(candidates.length - 1, Math.floor(clamp(random(), 0, 0.999999) * candidates.length));
  return candidates[index] ?? char;
}

export function applyBitFlipNoise(text: string, amount: number, random: RandomSource = Math.random): string {
  const probability = clamp(amount, 0, 1);

  if (probability === 0) {
    return text;
  }

  return Array.from(text)
    .map((char) => (random() <= probability ? flipCharacter(char, random) : char))
    .join("");
}
