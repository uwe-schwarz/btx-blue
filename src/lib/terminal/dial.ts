/**
 * Rotary dial model of the FeTAp 611 Nummernschalter.
 *
 * The finger wheel is wound clockwise until the finger stop, then a fly governor
 * returns it at a constant 10 pulses per second. Each pulse opens the line loop
 * for 60 ms and closes it for 40 ms (the German 1.6:1 break/make ratio).
 */
export const BTX_NUMBER = "01910";
export const PULSE_RATE = 10;
export const PULSE_BREAK = 0.06;
export const HOLE_STEP = Math.PI / 6;
/** Finger stop position, clockwise from 12 o'clock (just past 4 o'clock). */
export const FINGER_STOP = (125 / 180) * Math.PI;

const WINDUP_SPEED = 4.6 * Math.PI;
const RETURN_SPEED = HOLE_STEP * PULSE_RATE;

export interface DialStep {
  digit: string;
  pulses: number;
  /** Clockwise rotation from rest until the hole meets the finger stop. */
  travel: number;
  windupStart: number;
  windupEnd: number;
  returnStart: number;
  returnEnd: number;
  /** Start of each line break, relative to the plan start. */
  pulseTimes: number[];
}

export interface DialPlan {
  number: string;
  steps: DialStep[];
  duration: number;
}

export function pulsesFor(digit: string) {
  const value = Number(digit);
  if (!Number.isInteger(value) || value < 0 || value > 9) throw new RangeError(`Not a dial digit: ${digit}`);
  return value === 0 ? 10 : value;
}

/** Rest position of a finger hole, clockwise from 12 o'clock. */
export function holeAngle(digit: string) {
  return FINGER_STOP - (pulsesFor(digit) + 1) * HOLE_STEP;
}

export function travelFor(digit: string) {
  return (pulsesFor(digit) + 1) * HOLE_STEP;
}

/** A small, repeatable human timing variation so every digit does not sound machine-made. */
function hesitation(index: number) {
  return [0.08, 0.16, 0.05, 0.12, 0.1, 0.14, 0.07][index % 7];
}

export function planDial(number = BTX_NUMBER, { reach = 0.34, hold = 0.07, pause = 0.3 } = {}): DialPlan {
  const steps: DialStep[] = [];
  let cursor = 0;
  [...number].forEach((digit, index) => {
    const pulses = pulsesFor(digit);
    const travel = travelFor(digit);
    const windupStart = cursor + reach + hesitation(index);
    const windupEnd = windupStart + travel / WINDUP_SPEED + 0.09;
    const returnStart = windupEnd + hold;
    const returnEnd = returnStart + travel / RETURN_SPEED;
    const pulseTimes = Array.from({ length: pulses }, (_, pulse) => returnStart + 0.025 + pulse / PULSE_RATE);
    steps.push({ digit, pulses, travel, windupStart, windupEnd, returnStart, returnEnd, pulseTimes });
    cursor = returnEnd + pause;
  });
  const last = steps.at(-1);
  return { number, steps, duration: last ? last.returnEnd + 0.05 : 0 };
}

const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

/** Clockwise wheel rotation in radians at `time` seconds after the plan starts. */
export function dialRotation(plan: DialPlan, time: number) {
  for (const step of plan.steps) {
    if (time < step.windupStart) return 0;
    if (time < step.windupEnd) return step.travel * easeInOut((time - step.windupStart) / (step.windupEnd - step.windupStart));
    if (time < step.returnStart) return step.travel;
    if (time < step.returnEnd) return step.travel * (1 - (time - step.returnStart) / (step.returnEnd - step.returnStart));
  }
  return 0;
}

/** Digits whose pulse train has been completely sent at `time`. */
export function digitsDialed(plan: DialPlan, time: number) {
  return plan.steps.filter((step) => time >= step.returnEnd).map((step) => step.digit).join("");
}
