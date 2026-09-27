import { describe, expect, it } from "vitest";
import { FskTransmitter, frameByte, linkFor, modemSamples, pageBytes, V23 } from "../../src/lib/terminal/modem";
import { MODEM_PROFILES, parseModemSpeed } from "../../src/lib/terminal/connection";

/** Dominant frequency by zero-crossing count over a window. */
function frequency(samples: Float32Array, sampleRate: number) {
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) if (samples[i - 1] <= 0 && samples[i] > 0) crossings++;
  return crossings / (samples.length / sampleRate);
}

describe("terminal audio", () => {
  it("uses the V.23 downstream FSK frequencies and 75-bit reverse profile", () => {
    expect(MODEM_PROFILES[1200]).toMatchObject({ mark: 1300, space: 2100, symbolRate: 1200 });
    expect(MODEM_PROFILES[1200].name).toContain("1200/75");
    expect(V23.up).toMatchObject({ baud: 75, mark: 390, space: 450 });
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
    expect(linkFor("LINE")).toBeUndefined();
    expect(parseModemSpeed("broken")).toBe(1200);
    expect(parseModemSpeed(null)).toBe(1200);
  });
});

describe("FSK transmitter", () => {
  it("frames bytes as 8N1 with the LSB first", () => {
    expect(frameByte(0x41)).toEqual([0, 1, 0, 0, 0, 0, 0, 1, 0, 1]);
  });
  it("idles on the mark tone and sends a space for the start bit", () => {
    const rate = 48000;
    const idle = new Float32Array(rate / 10);
    const transmitter = new FskTransmitter(V23.down, rate);
    transmitter.render(idle, 0.3);
    expect(frequency(idle, rate)).toBeCloseTo(1300, -2);
    transmitter.enqueue([0x00]);
    // Byte 0x00 is a start bit and eight data bits of space: nine bits at 1200 bit/s.
    const busy = new Float32Array(Math.round((rate * 9) / 1200));
    transmitter.render(busy, 0.3);
    // Nine bits last only 7.5 ms, so the zero-crossing estimate is coarse; it must be far from the 1300 Hz mark.
    expect(frequency(busy, rate)).toBeGreaterThan(1900);
    expect(frequency(busy, rate)).toBeLessThan(2300);
    expect(transmitter.pending).toBe(1);
  });
  it("tells data apart from the idle carrier so the Trägerton can be muted", () => {
    const transmitter = new FskTransmitter(V23.down, 48000);
    expect(transmitter.busy).toBe(false);
    transmitter.enqueue([0x41]);
    expect(transmitter.busy).toBe(true);
    // One 8N1 character lasts ten bits at 1200 bit/s.
    transmitter.render(new Float32Array(Math.ceil((48000 * 10) / 1200) + 1), 0.3);
    expect(transmitter.busy).toBe(false);
  });
  it("transmits each page cell as one character plus row addressing", () => {
    const bytes = pageBytes("Grüße".padEnd(40) + "x".padEnd(40));
    expect(bytes).toHaveLength(80 + 6);
    expect(bytes.slice(0, 3)).toEqual([0x1f, 0x41, 0x41]);
    expect(bytes[5]).toBe(0x7d);
    expect(bytes.every((byte) => byte < 0x80)).toBe(true);
  });
});
