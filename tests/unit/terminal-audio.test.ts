import { describe, expect, it } from "vitest";
import { modemSamples } from "../../src/lib/terminal/audio";
import { MODEM_PROFILES, parseModemSpeed } from "../../src/lib/terminal/connection";

describe("terminal audio", () => {
  it("uses the V.23 downstream FSK frequencies and 75-bit reverse profile", () => {
    expect(MODEM_PROFILES[1200]).toMatchObject({ mark: 1300, space: 2100, symbolRate: 1200 });
    expect(MODEM_PROFILES[1200].name).toContain("1200/75");
  });
  it.each([300, 1200, 2400, 9600] as const)("produces finite, bounded, audible samples for %s bit/s", (speed) => {
    const samples = modemSamples(speed, 0.2, 48000);
    expect(samples).toHaveLength(9600);
    const rms = Math.sqrt(samples.reduce((sum, n) => sum + n * n, 0) / samples.length);
    expect(rms).toBeGreaterThan(0.04);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThan(0.5);
    expect(samples.every(Number.isFinite)).toBe(true);
    expect(samples[0]).toBe(0);
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.001);
  });
  it("produces distinct waveforms for different standards", () => {
    expect(modemSamples(300, 0.1, 48000)).not.toEqual(modemSamples(1200, 0.1, 48000));
    expect(modemSamples(2400, 0.1, 48000)).not.toEqual(modemSamples(9600, 0.1, 48000));
  });
  it("keeps the direct connection silent and handles invalid stored rates", () => {
    expect(modemSamples("LINE", 0.1, 48000).every((n) => n === 0)).toBe(true);
    expect(parseModemSpeed("broken")).toBe(1200);
    expect(parseModemSpeed(null)).toBe(1200);
  });
});
