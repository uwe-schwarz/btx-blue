import { MODEM_PROFILES, type ModemSpeed } from "./connection";

export interface FskChannel {
  baud: number;
  /** Binary 1, also the idle carrier. */
  mark: number;
  space: number;
}

export interface ModemLink {
  /** What the Btx-Zentrale sends towards the terminal. */
  down: FskChannel | QamChannel;
  /** What the coupler speaker sends into the handset mouthpiece. */
  up: FskChannel | QamChannel;
}

export interface QamChannel {
  baud: number;
  carrier: number;
  qam: true;
}

/** ITU-T V.23 mode 2: 1200 bit/s forward channel, 75 bit/s backward channel (the Btx 1200/75 service). */
export const V23 = { down: { baud: 1200, mark: 1300, space: 2100 }, up: { baud: 75, mark: 390, space: 450 } } satisfies ModemLink;
/** ITU-T V.21: the calling terminal uses channel 1, the answering centre channel 2. */
export const V21 = { down: { baud: 300, mark: 1650, space: 1850 }, up: { baud: 300, mark: 980, space: 1180 } } satisfies ModemLink;
/** V.22bis and V.32 are audible approximations, not real QAM modems with equalisation or scrambling. */
export const V22BIS = { down: { baud: 600, carrier: 2400, qam: true }, up: { baud: 600, carrier: 1200, qam: true } } satisfies ModemLink;
export const V32 = { down: { baud: 2400, carrier: 1800, qam: true }, up: { baud: 2400, carrier: 1800, qam: true } } satisfies ModemLink;

export function linkFor(speed: ModemSpeed): ModemLink | undefined {
  if (speed === 300) return V21;
  if (speed === 1200) return V23;
  if (speed === 2400) return V22BIS;
  if (speed === 9600) return V32;
  return undefined;
}

/** 8N1 framing: start bit (space), eight data bits LSB first, stop bit (mark). */
export function frameByte(byte: number): number[] {
  const bits = [0];
  for (let bit = 0; bit < 8; bit++) bits.push((byte >> bit) & 1);
  bits.push(1);
  return bits;
}

/**
 * Btx pages were CEPT-coded 7-bit text interleaved with control sequences.
 * This keeps the byte structure plausible: printable characters, colour
 * attributes and an active-position (APA) sequence at every row start.
 */
export function pageBytes(text: string, columns = 40): number[] {
  const bytes: number[] = [];
  const map: Record<string, number> = { "ä": 0x7b, "ö": 0x7c, "ü": 0x7d, "ß": 0x7e, "Ä": 0x5b, "Ö": 0x5c, "Ü": 0x5d };
  [...text].forEach((char, index) => {
    if (index % columns === 0) bytes.push(0x1f, 0x41 + Math.floor(index / columns) % 24, 0x41);
    const code = map[char] ?? char.charCodeAt(0);
    bytes.push(code >= 0x20 && code < 0x7f ? code : 0x20);
  });
  return bytes;
}

/** Continuous-phase FSK transmitter that idles on the mark tone between characters. */
export class FskTransmitter {
  private phase = 0;
  private queue: number[] = [];
  private bits: number[] = [];
  private bit = 1;
  private remaining = 0;

  constructor(private channel: FskChannel, private sampleRate: number) {}

  get pending() { return this.queue.length + (this.bits.length ? 1 : 0); }
  /** True while a character is being sent; false while only the idle mark (carrier) tone runs. */
  get busy() { return this.queue.length > 0 || this.bits.length > 0; }
  enqueue(bytes: Iterable<number>) { for (const byte of bytes) this.queue.push(byte & 0xff); }
  clear() { this.queue = []; this.bits = []; }

  render(output: Float32Array, level: number, start = 0, end = output.length) {
    const step = (2 * Math.PI) / this.sampleRate;
    const samplesPerBit = this.sampleRate / this.channel.baud;
    for (let i = start; i < end; i++) {
      if (this.remaining <= 0) {
        if (!this.bits.length && this.queue.length) this.bits = frameByte(this.queue.shift()!);
        this.bit = this.bits.length ? this.bits.shift()! : 1;
        this.remaining += samplesPerBit;
      }
      this.phase += step * (this.bit ? this.channel.mark : this.channel.space);
      if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
      output[i] += Math.sin(this.phase) * level;
      this.remaining -= 1;
    }
  }
}

/** A 16-point constellation on a single carrier; sounds like the familiar full-duplex hiss. */
export class QamTransmitter {
  private phase = 0;
  private remaining = 0;
  private inPhase = 0;
  private quadrature = 0;
  private random: number;

  constructor(private channel: QamChannel, private sampleRate: number, seed = 1985) { this.random = seed >>> 0 || 1; }
  get pending() { return 0; }
  /** Scrambled QAM has no audible idle state. */
  get busy() { return true; }
  enqueue(_bytes: Iterable<number>) { /* Scrambled data sounds the same as idle data. */ }
  clear() { /* Nothing queued. */ }

  private next() { this.random = (Math.imul(this.random, 1664525) + 1013904223) >>> 0; return this.random >>> 16; }

  render(output: Float32Array, level: number, start = 0, end = output.length) {
    const step = (2 * Math.PI * this.channel.carrier) / this.sampleRate;
    const samplesPerSymbol = this.sampleRate / this.channel.baud;
    for (let i = start; i < end; i++) {
      if (this.remaining <= 0) {
        const symbol = this.next();
        this.inPhase = ((symbol & 3) * 2 - 3) / 3;
        this.quadrature = (((symbol >> 2) & 3) * 2 - 3) / 3;
        this.remaining += samplesPerSymbol;
      }
      this.phase += step;
      if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
      output[i] += (this.inPhase * Math.cos(this.phase) + this.quadrature * Math.sin(this.phase)) * level * 0.7;
      this.remaining -= 1;
    }
  }
}

export type Transmitter = FskTransmitter | QamTransmitter;

export function createTransmitter(channel: FskChannel | QamChannel, sampleRate: number, seed?: number): Transmitter {
  return "qam" in channel ? new QamTransmitter(channel, sampleRate, seed) : new FskTransmitter(channel, sampleRate);
}

/** Offline rendering of the forward (downstream) channel carrying pseudo-random data. */
export function modemSamples(speed: ModemSpeed, duration: number, sampleRate: number, seed = 1985): Float32Array {
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  const link = linkFor(speed);
  if (!link || !MODEM_PROFILES[speed].rate) return samples;
  const transmitter = createTransmitter(link.down, sampleRate, seed);
  let random = seed;
  const bytes = Array.from({ length: Math.ceil(duration * link.down.baud / 10) + 2 }, () => {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    return random >>> 24;
  });
  transmitter.enqueue(bytes);
  transmitter.render(samples, 0.28);
  for (let i = 0; i < samples.length; i++) {
    samples[i] *= Math.min(1, i / (sampleRate * 0.012), (samples.length - 1 - i) / (sampleRate * 0.02));
  }
  return samples;
}
