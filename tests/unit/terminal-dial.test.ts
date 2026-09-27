import { describe, expect, it } from "vitest";
import { dialRotation, digitsDialed, FINGER_STOP, holeAngle, HOLE_STEP, planDial, PULSE_RATE, pulsesFor, travelFor } from "../../src/lib/terminal/dial";
import { callUnits, formatDm, formatDuration, tariffInterval } from "../../src/lib/terminal/connection";

describe("rotary dial", () => {
  it("sends ten pulses for zero and places zero next to the finger stop", () => {
    expect(pulsesFor("0")).toBe(10);
    expect(pulsesFor("1")).toBe(1);
    expect(() => pulsesFor("#")).toThrow(RangeError);
    // Holes are 30° apart; 1 sits at about 2 o'clock, 0 just before the stop going clockwise.
    expect(holeAngle("1")).toBeCloseTo(FINGER_STOP - 2 * HOLE_STEP);
    expect(travelFor("0")).toBeCloseTo((330 / 180) * Math.PI);
  });
  it("returns at the governed 10 pulses per second with one break per pulse", () => {
    const plan = planDial("01910");
    expect(plan.steps.map((step) => step.pulses)).toEqual([10, 1, 9, 1, 10]);
    for (const step of plan.steps) {
      expect(step.pulseTimes).toHaveLength(step.pulses);
      expect(step.returnEnd - step.returnStart).toBeCloseTo((step.pulses + 1) / PULSE_RATE);
      step.pulseTimes.forEach((time, index) => { if (index) expect(time - step.pulseTimes[index - 1]).toBeCloseTo(0.1); });
      expect(step.pulseTimes.at(-1)!).toBeLessThan(step.returnEnd);
    }
    expect(plan.duration).toBeGreaterThan(5);
    expect(plan.duration).toBeLessThan(10);
  });
  it("animates the wheel to the stop and back and reports completed digits", () => {
    const plan = planDial("09");
    const [zero, nine] = plan.steps;
    expect(dialRotation(plan, 0)).toBe(0);
    expect(dialRotation(plan, zero.windupEnd + 0.01)).toBeCloseTo(zero.travel);
    expect(dialRotation(plan, (zero.returnStart + zero.returnEnd) / 2)).toBeCloseTo(zero.travel / 2);
    expect(digitsDialed(plan, zero.returnEnd + 0.01)).toBe("0");
    expect(digitsDialed(plan, nine.returnEnd)).toBe("09");
    expect(dialRotation(plan, plan.duration)).toBe(0);
  });
});

describe("1985 call charges", () => {
  it("uses the eight-minute daytime and twelve-minute evening local tariff", () => {
    expect(tariffInterval(new Date(1985, 8, 25, 10))).toBe(480);
    expect(tariffInterval(new Date(1985, 8, 25, 21))).toBe(720);
    expect(tariffInterval(new Date(1985, 8, 28, 10))).toBe(720);
    expect(callUnits(30, new Date(1985, 8, 25, 21))).toBe(1);
    expect(callUnits(13 * 60, new Date(1985, 8, 25, 21))).toBe(2);
    expect(formatDm(2 * 0.23)).toBe("0,46 DM");
    expect(formatDuration(3723)).toBe("01:02:03");
  });
});
