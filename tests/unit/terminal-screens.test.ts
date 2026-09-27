import { describe, expect, it } from "vitest";
import { localScreen, mosaic, SCREEN_COLUMNS, SCREEN_ROWS, sextant, type LocalScreenInfo } from "../../src/lib/terminal/local-screens";
import type { ConnectionState } from "../../src/lib/terminal/connection";

const base: LocalScreenInfo = { state: "idle", profile: "V.23 · 1200/75", acoustic: true, speed: 1200 };
const states: ConnectionState[] = ["idle", "lifting", "dialing", "answering", "coupling", "online", "paused", "off"];

describe("teletext mosaics", () => {
  it("maps sextant bit patterns onto the Unicode legacy computing block", () => {
    expect(sextant(0)).toBe(" ");
    expect(sextant(1)).toBe("\u{1fb00}");
    expect(sextant(21)).toBe("▌");
    expect(sextant(22)).toBe("\u{1fb14}");
    expect(sextant(62)).toBe("\u{1fb3b}");
    expect(sextant(63)).toBe("█");
  });
  it("packs a pixel bitmap into 2×3 cells", () => {
    expect(mosaic(["##", "##", "##"])).toEqual(["█"]);
    expect(mosaic(["#.", "#.", "#.", "..", "..", ".#"])).toEqual(["▌", "\u{1fb1e}"]);
  });
});

describe("local terminal screens", () => {
  it.each(states)("fills the 40×24 grid for %s", (state) => {
    const rows = localScreen({ ...base, state, dialed: "019" });
    expect(rows).toHaveLength(SCREEN_ROWS);
    for (const row of rows) {
      const width = row.segments.reduce((sum, segment) => sum + [...segment.text].length, 0);
      expect(width).toBeLessThanOrEqual(SCREEN_COLUMNS);
    }
    rows.forEach((row, index) => { if (row.double) expect(rows[index + 1].segments).toHaveLength(0); });
  });
  it("shows dialled digits, the call charge and a connect action", () => {
    const dialing = localScreen({ ...base, state: "dialing", dialed: "019" }).map((row) => row.segments.map((s) => s.text).join(""));
    expect(dialing.join("\n")).toContain("0 1 9 _ _");
    const idle = localScreen({ ...base, summary: { duration: "00:03:12", units: 1, charge: "0,23 DM" } });
    expect(idle.some((row) => row.action === "connect")).toBe(true);
    expect(idle.map((row) => row.segments.map((s) => s.text).join("")).join("\n")).toContain("0,23 DM");
  });
});
