import { createTransmitter, linkFor, type Transmitter } from "./modem";
import type { ModemSpeed } from "./connection";

declare const sampleRate: number;
declare function registerProcessor(name: string, processor: new () => AudioWorkletProcessor): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
}

export type ModemMessage =
  | { type: "profile"; speed: ModemSpeed }
  | { type: "carrier"; down?: boolean; up?: boolean }
  | { type: "send"; channel: "down" | "up"; bytes: number[] }
  | { type: "clear"; channel?: "down" | "up" }
  | { type: "noise"; level: number }
  /** Silence the idle carrier (Trägerton) so only actual data is heard. */
  | { type: "quiet"; value: boolean };

/**
 * Real-time modem: output channel 0 is the forward channel arriving from the
 * Btx-Zentrale over the line, channel 1 is what the coupler's own speaker sends
 * into the handset mouthpiece. Carriers ramp to avoid clicks.
 */
class ModemProcessor extends AudioWorkletProcessor {
  private down?: Transmitter;
  private up?: Transmitter;
  private downTarget = 0;
  private upTarget = 0;
  private downLevel = 0;
  private upLevel = 0;
  private noise = 0;
  private random = 1985;
  private crackle = 0;
  private scratch = new Float32Array(128);
  private idleReported = true;
  private quiet = false;
  private downHold = 0;
  private upHold = 0;

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent<ModemMessage>) => this.handle(event.data);
  }

  private handle(message: ModemMessage) {
    if (message.type === "profile") {
      const link = linkFor(message.speed);
      this.down = link && createTransmitter(link.down, sampleRate, 1985);
      this.up = link && createTransmitter(link.up, sampleRate, 75);
    } else if (message.type === "carrier") {
      if (message.down !== undefined) this.downTarget = message.down ? 1 : 0;
      if (message.up !== undefined) this.upTarget = message.up ? 1 : 0;
    } else if (message.type === "send") {
      (message.channel === "down" ? this.down : this.up)?.enqueue(message.bytes);
      if (message.channel === "down") this.idleReported = false;
    } else if (message.type === "clear") {
      if (message.channel !== "up") this.down?.clear();
      if (message.channel !== "down") this.up?.clear();
    } else if (message.type === "noise") {
      this.noise = Math.max(0, Math.min(1, message.level));
    } else if (message.type === "quiet") {
      this.quiet = message.value;
    }
  }

  private next() {
    this.random = (Math.imul(this.random, 1664525) + 1013904223) >>> 0;
    return this.random / 4294967296;
  }

  private channel(transmitter: Transmitter | undefined, output: Float32Array, level: number, target: number, amplitude: number) {
    const scratch = this.scratch.length >= output.length ? this.scratch : (this.scratch = new Float32Array(output.length));
    scratch.fill(0, 0, output.length);
    if (transmitter && (level > 0.0001 || target > 0)) transmitter.render(scratch, amplitude, 0, output.length);
    const smoothing = 1 / (sampleRate * 0.008);
    for (let i = 0; i < output.length; i++) {
      level += (target - level) * smoothing;
      output[i] += scratch[i] * level;
    }
    return level;
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
    const [output] = outputs;
    if (!output?.length) return true;
    const down = output[0];
    const up = output[1] ?? output[0];
    // With the carrier tone suppressed, a channel only sounds while bytes are on the wire (plus a short hang time).
    const hold = sampleRate * 0.06;
    this.downHold = this.down?.busy ? hold : Math.max(0, this.downHold - down.length);
    this.upHold = this.up?.busy ? hold : Math.max(0, this.upHold - up.length);
    const downGoal = this.quiet && this.downHold <= 0 ? 0 : this.downTarget;
    const upGoal = this.quiet && this.upHold <= 0 ? 0 : this.upTarget;
    this.downLevel = this.channel(this.down, down, this.downLevel, downGoal, 0.3);
    this.upLevel = this.channel(this.up, up, this.upLevel, upGoal, 0.26);
    if (this.noise > 0 && this.downLevel > 0.01) {
      // Line noise: hiss plus the occasional crackle that flips received bits.
      for (let i = 0; i < down.length; i++) {
        if (this.crackle <= 0 && this.next() < this.noise * 0.0006) this.crackle = 40 + this.next() * 400;
        const burst = this.crackle > 0 ? (this.next() * 2 - 1) * 0.35 * this.downLevel : 0;
        if (this.crackle > 0) this.crackle--;
        down[i] += (this.next() * 2 - 1) * 0.03 * this.noise * this.downLevel + burst;
      }
    }
    if (!this.idleReported && this.down && this.down.pending === 0) {
      this.idleReported = true;
      this.port.postMessage({ type: "idle" });
    }
    return true;
  }
}

registerProcessor("btx-modem", ModemProcessor);
