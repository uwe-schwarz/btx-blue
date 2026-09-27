import workletUrl from "./modem-worklet.ts?worker&url";
import type { ModemSpeed } from "./connection";
import { PULSE_BREAK, type DialPlan } from "./dial";
import { createTransmitter, linkFor } from "./modem";
import type { ModemMessage } from "./modem-worklet";

export type HandsetPlace = "cradle" | "ear" | "coupler";
type Place = "monitor" | "keyboard" | "phone" | "coupler" | "lamp";

const PAN: Record<Place, number> = { monitor: -0.22, keyboard: -0.12, phone: 0.5, coupler: 0.42, lamp: -0.75 };
/** Post-1979 Deutsche Bundespost Wählton/Freiton: 425 Hz from a slightly distorted exchange generator. */
const LINE_TONE = 425;
const DTMF: Record<string, [number, number]> = { "0": [941, 1336], "1": [697, 1209], "9": [852, 1477] };

let seed = 1985;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => random() * 2 - 1;
/** Damped sine: a resonance excited at t = 0. */
const ping = (t: number, frequency: number, decay: number) => (t < 0 ? 0 : Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t / decay));
/** Damped noise burst: a mechanical contact. */
const tick = (t: number, decay: number) => (t < 0 ? 0 : noise() * Math.exp(-t / decay));

function render(context: BaseAudioContext, seconds: number, synth: (t: number) => number, gain = 1) {
  const length = Math.max(1, Math.ceil(seconds * context.sampleRate));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0, filtered = 0, peak = 0;
  for (let i = 0; i < length; i++) {
    const value = synth(i / context.sampleRate);
    // DC blocker keeps low thumps from drifting.
    filtered = value - previous + 0.995 * filtered;
    previous = value;
    data[i] = filtered;
    peak = Math.max(peak, Math.abs(filtered));
  }
  const scale = peak > 0 ? gain / peak : 0;
  for (let i = 0; i < length; i++) data[i] *= scale;
  return buffer;
}

function keySound(context: BaseAudioContext, kind: "down" | "up" | "space" | "spaceUp" | "enter", variant: number) {
  seed = 1000 + variant * 97 + kind.length * 13;
  const r = () => random();
  const f1 = (kind === "space" ? 950 : kind === "enter" ? 1350 : 1750) + r() * 450;
  const f2 = 3500 + r() * 900;
  const f3 = (kind === "space" ? 210 : kind === "enter" ? 300 : 360) + r() * 90;
  const bottom = 0.004 + r() * 0.0025;
  if (kind === "up" || kind === "spaceUp") {
    const low = kind === "spaceUp" ? 0.6 : 1;
    return render(context, 0.07, (t) => tick(t, 0.0006) * 0.5 + ping(t, f1 * 1.3 * low, 0.005) * 0.3 + ping(t, f3 * 1.25, 0.012) * 0.2 + (kind === "spaceUp" ? ping(t - 0.009, 820, 0.01) * 0.25 : 0), 0.35);
  }
  const heavy = kind !== "down";
  return render(context, heavy ? 0.16 : 0.12, (t) =>
    tick(t, 0.0009) * 0.8 + ping(t, f2, 0.004) * 0.3
    + tick(t - bottom, 0.0015) * 0.7 + ping(t - bottom, f1, 0.012) * 0.45 + ping(t - bottom, f3, heavy ? 0.04 : 0.028) * 0.55
    + (kind === "space" ? tick(t - 0.013, 0.001) * 0.3 + ping(t - 0.013, 700, 0.012) * 0.25 : 0), heavy ? 0.85 : 0.7);
}

function ratchet(context: BaseAudioContext, seconds: number, clicks: number) {
  seed = 4242 + clicks;
  const times = Array.from({ length: clicks }, (_, i) => (0.5 - Math.cos(Math.PI * (i + 0.5) / clicks) / 2) * seconds);
  let friction = 0;
  return render(context, seconds + 0.05, (t) => {
    friction = friction * 0.96 + noise() * 0.04;
    let value = t < seconds ? friction * 0.35 : 0;
    for (const at of times) if (t >= at && t < at + 0.012) value += tick(t - at, 0.0005) * 0.55 + ping(t - at, 3300, 0.0018) * 0.3;
    return value;
  }, 0.32);
}

function governor(context: BaseAudioContext, seconds: number, pulses: number[]) {
  seed = 777 + pulses.length;
  const f0 = 44;
  return render(context, seconds + 0.12, (t) => {
    if (t > seconds + 0.1) return 0;
    const envelope = Math.min(1, t / 0.02) * (t < seconds ? 1 : Math.max(0, 1 - (t - seconds) / 0.03));
    let buzz = 0;
    for (let k = 1; k <= 9; k++) buzz += Math.sin(2 * Math.PI * k * f0 * t + k * 0.7) / (k * 0.8);
    buzz *= 0.55 + 0.45 * Math.sin(2 * Math.PI * 7.5 * t);
    let value = envelope * (buzz * 0.16 + noise() * 0.05 * (0.5 + 0.5 * Math.sin(2 * Math.PI * f0 * t)));
    for (const at of pulses) {
      if (t >= at && t < at + 0.03) value += tick(t - at, 0.0008) * 0.5 + ping(t - at, 2350, 0.003) * 0.3;
      if (t >= at + PULSE_BREAK && t < at + PULSE_BREAK + 0.02) value += tick(t - at - PULSE_BREAK, 0.0006) * 0.25;
    }
    return value + ping(t - seconds, 260, 0.03) * 0.5 + tick(t - seconds, 0.002) * 0.45;
  }, 0.4);
}

export class TerminalAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private places = {} as Record<Place, GainNode>;
  private lineSum?: GainNode;
  private lineGate?: GainNode;
  private lineClicks?: GainNode;
  private ear?: GainNode;
  private cup?: GainNode;
  private upToCup?: GainNode;
  private speaker?: GainNode;
  private upIn?: GainNode;
  private hiss?: GainNode;
  private modem?: AudioWorkletNode;
  private fallback?: AudioBufferSourceNode;
  private speed: ModemSpeed = 1200;
  private lineNoise = 0;
  private whine?: GainNode;
  private buffers = new Map<string, AudioBuffer[]>();
  private voices = new Set<AudioScheduledSourceNode>();
  private timers = new Set<number>();
  private volume = 0.35;
  private enabled = true;
  private handset: HandsetPlace = "cradle";
  private unlocking?: Promise<void>;
  onModemIdle?: () => void;

  get ready() { return Boolean(this.context && this.master); }
  get now() { return this.context?.currentTime ?? 0; }

  async unlock() {
    this.unlocking ??= this.build();
    await this.unlocking;
    if (this.context?.state === "suspended") await this.context.resume();
  }

  private async build() {
    const context = new AudioContext({ latencyHint: "interactive" });
    this.context = context;
    const master = context.createGain();
    master.gain.value = this.enabled ? this.volume : 0;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -12; limiter.knee.value = 6; limiter.ratio.value = 10; limiter.attack.value = 0.003; limiter.release.value = 0.15;
    master.connect(limiter).connect(context.destination);
    this.master = master;

    // A small, soft room: plaster walls, a carpet and a wooden desk.
    const room = context.createConvolver();
    room.buffer = this.roomResponse(context);
    const roomSend = context.createGain();
    roomSend.gain.value = 0.2;
    roomSend.connect(room).connect(master);
    for (const place of Object.keys(PAN) as Place[]) {
      const input = context.createGain();
      const panner = context.createStereoPanner();
      panner.pan.value = PAN[place];
      input.connect(panner);
      panner.connect(master);
      panner.connect(roomSend);
      this.places[place] = input;
    }

    // Telephone line: band-limited to 300–3400 Hz with a carbon-capsule presence peak.
    this.lineSum = context.createGain();
    this.lineGate = context.createGain();
    this.lineGate.gain.value = 0;
    this.lineClicks = context.createGain();
    const highpass = context.createBiquadFilter(); highpass.type = "highpass"; highpass.frequency.value = 300; highpass.Q.value = 0.8;
    const lowpass = context.createBiquadFilter(); lowpass.type = "lowpass"; lowpass.frequency.value = 3400; lowpass.Q.value = 0.9;
    const presence = context.createBiquadFilter(); presence.type = "peaking"; presence.frequency.value = 1450; presence.gain.value = 4; presence.Q.value = 1.1;
    const shaper = context.createWaveShaper();
    shaper.curve = Float32Array.from({ length: 1025 }, (_, i) => Math.tanh((i / 512 - 1) * 1.6) / Math.tanh(1.6));
    this.lineSum.connect(this.lineGate).connect(highpass);
    this.lineClicks.connect(highpass);
    highpass.connect(lowpass).connect(presence).connect(shaper);

    // Earpiece at the listener's ear: close and dry. In the coupler cups: sealed and muffled.
    this.ear = context.createGain(); this.ear.gain.value = 0;
    const earPan = context.createStereoPanner(); earPan.pan.value = 0.35;
    shaper.connect(this.ear).connect(earPan).connect(master);
    this.cup = context.createGain(); this.cup.gain.value = 0;
    const cupFilter = context.createBiquadFilter(); cupFilter.type = "lowpass"; cupFilter.frequency.value = 1700; cupFilter.Q.value = 1.4;
    shaper.connect(this.cup).connect(cupFilter).connect(this.places.coupler);
    this.speaker = context.createGain(); this.speaker.gain.value = 0;
    const speakerTone = context.createBiquadFilter(); speakerTone.type = "bandpass"; speakerTone.frequency.value = 1600; speakerTone.Q.value = 0.5;
    shaper.connect(this.speaker).connect(speakerTone).connect(this.places.coupler);

    // The coupler's own transmitter pressed into the mouthpiece (75 bit/s back channel).
    this.upIn = context.createGain();
    const upFilter = context.createBiquadFilter(); upFilter.type = "lowpass"; upFilter.frequency.value = 1300;
    this.upToCup = context.createGain(); this.upToCup.gain.value = 0;
    this.upIn.connect(upFilter).connect(this.upToCup).connect(this.places.coupler);
    upFilter.connect(this.speaker);

    const hissSource = context.createBufferSource();
    hissSource.buffer = this.pinkNoise(context, 3);
    hissSource.loop = true;
    this.hiss = context.createGain(); this.hiss.gain.value = 0.018;
    hissSource.connect(this.hiss).connect(this.lineSum);
    hissSource.start();

    this.synthesize(context);
    try {
      await context.audioWorklet.addModule(workletUrl);
      this.modem = new AudioWorkletNode(context, "btx-modem", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
      const split = context.createChannelSplitter(2);
      this.modem.connect(split);
      split.connect(this.lineSum, 0);
      split.connect(this.upIn, 1);
      this.modem.port.onmessage = (event) => { if (event.data?.type === "idle") this.onModemIdle?.(); };
      this.post({ type: "profile", speed: this.speed });
      this.post({ type: "quiet", value: !this.carrierTone });
      this.post({ type: "noise", level: this.lineNoise });
    } catch (error) {
      console.warn("Modem worklet unavailable; using a looped carrier", error);
    }
  }

  private roomResponse(context: BaseAudioContext) {
    const length = Math.floor(context.sampleRate * 0.55);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let smooth = 0;
      for (let i = 0; i < length; i++) {
        const t = i / context.sampleRate;
        smooth = smooth * 0.55 + noise() * 0.45;
        const early = [0.007, 0.013, 0.021, 0.029].some((at) => Math.abs(t - at - channel * 0.002) < 0.0004) ? 0.6 : 0;
        data[i] = (smooth + early * noise()) * Math.exp(-t / 0.085) * 0.5;
      }
    }
    return buffer;
  }

  private pinkNoise(context: BaseAudioContext, seconds: number) {
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = noise();
      b0 = 0.997 * b0 + white * 0.029591; b1 = 0.985 * b1 + white * 0.032534; b2 = 0.95 * b2 + white * 0.048056;
      data[i] = (b0 + b1 + b2 + white * 0.05) * 0.9;
    }
    return buffer;
  }

  private synthesize(context: BaseAudioContext) {
    const variants = (name: string, count: number, make: (variant: number) => AudioBuffer) => this.buffers.set(name, Array.from({ length: count }, (_, i) => make(i)));
    variants("key", 6, (v) => keySound(context, "down", v));
    variants("keyUp", 4, (v) => keySound(context, "up", v));
    variants("space", 2, (v) => keySound(context, "space", v));
    variants("spaceUp", 1, (v) => keySound(context, "spaceUp", v));
    variants("enter", 2, (v) => keySound(context, "enter", v));
    variants("lineClick", 3, (v) => { seed = 50 + v; return render(context, 0.03, (t) => tick(t, 0.0005) + ping(t, 900 + v * 150, 0.004) * 0.45, 0.9); });
    variants("hookUp", 1, () => render(context, 0.26, (t) => tick(t, 0.001) * 0.6 + ping(t, 2900, 0.004) * 0.4 + tick(t - 0.019, 0.001) * 0.5 + ping(t - 0.019, 3300, 0.003) * 0.35 + ping(t - 0.05, 620, 0.03) * 0.4 + ping(t - 0.05, 1400, 0.015) * 0.22, 0.75));
    variants("cradle", 1, () => render(context, 1.1, (t) => tick(t, 0.002) * 0.8 + ping(t, 480, 0.04) * 0.7 + ping(t, 1250, 0.02) * 0.4 + tick(t - 0.012, 0.001) * 0.4 + ping(t - 0.026, 3000, 0.003) * 0.3 + ping(t - 0.02, 1180, 0.5) * 0.045 + ping(t - 0.02, 2710, 0.35) * 0.03, 0.9));
    variants("coupler", 1, () => {
      let low = 0;
      return render(context, 0.4, (t) => {
        low = low * 0.9 + tick(t, 0.004) * 0.1;
        const thud = (at: number, level: number) => (t < at ? 0 : Math.sin(2 * Math.PI * (88 + 60 * Math.exp(-(t - at) / 0.015)) * (t - at)) * Math.exp(-(t - at) / 0.07) * level);
        return thud(0, 0.9) + thud(0.058, 0.55) + low * 2 + ping(t, 640, 0.018) * 0.15;
      }, 0.85);
    });
    variants("lamp", 1, () => render(context, 0.22, (t) => tick(t, 0.0008) * 0.7 + ping(t, 3100, 0.003) * 0.5 + ping(t, 900, 0.012) * 0.3 + tick(t - 0.075, 0.0007) * 0.35 + ping(t - 0.075, 3400, 0.002) * 0.25, 0.6));
    variants("power", 1, () => render(context, 0.32, (t) => tick(t, 0.0012) * 0.9 + ping(t, 1800, 0.006) * 0.5 + ping(t, 210, 0.05) * 0.6 + tick(t - 0.009, 0.001) * 0.6 + ping(t - 0.009, 2600, 0.004) * 0.4, 0.8));
    variants("degauss", 1, () => render(context, 1.9, (t) => {
      const envelope = (1 - Math.exp(-t / 0.012)) * Math.exp(-t / 0.38);
      const hum = 0.55 * Math.sin(2 * Math.PI * 50 * t) + 0.35 * Math.sin(2 * Math.PI * 100 * t + 0.3) + 0.22 * Math.sin(2 * Math.PI * 150 * t) + 0.15 * Math.sin(2 * Math.PI * 200 * t) + 0.1 * Math.sin(2 * Math.PI * 250 * t) + 0.06 * Math.sin(2 * Math.PI * 300 * t);
      const rattle = envelope ** 1.5 * noise() * 0.2 * Math.max(0, Math.sin(2 * Math.PI * 100 * t)) ** 6;
      return envelope * hum + rattle + ping(t, 55, 0.09) * 0.5;
    }, 0.9));
    variants("crackle", 1, () => {
      let left = 0, amplitude = 0, length = 1, previous = 0;
      seed = 31337;
      return render(context, 2.4, (t) => {
        if (left <= 0 && random() < 0.0009 * Math.exp(-t / 0.7) + 0.00004) { length = left = 20 + random() * 110; amplitude = 0.1 + random() * 0.5; }
        const value = left > 0 ? noise() * amplitude * (left-- / length) : 0;
        const crisp = value - previous;
        previous = value;
        return crisp;
      }, 0.5);
    });
    variants("exchange", 1, () => {
      seed = 1979;
      const clicks = [0.04, 0.11, 0.36, 0.375, 0.63, 0.81, 0.87];
      const steps = Array.from({ length: 9 }, (_, i) => 0.42 + i * 0.022);
      return render(context, 1.0, (t) => {
        let value = Math.sin(2 * Math.PI * 50 * t) * 0.02;
        for (const at of [...clicks, ...steps]) if (t >= at && t < at + 0.02) value += tick(t - at, 0.0007) * 0.6 + ping(t - at, 1300, 0.003) * 0.3;
        return value;
      }, 0.5);
    });
  }

  private post(message: ModemMessage) { this.modem?.port.postMessage(message); }

  private play(name: string, destination: AudioNode | undefined, at = 0, { gain = 1, rate = 1, variant }: { gain?: number; rate?: number; variant?: number } = {}) {
    const list = this.buffers.get(name);
    if (!this.context || !destination || !list?.length) return;
    const source = this.context.createBufferSource();
    source.buffer = list[variant ?? Math.floor(Math.random() * list.length)];
    source.playbackRate.value = rate;
    const level = this.context.createGain();
    level.gain.value = gain;
    source.connect(level).connect(destination);
    this.voice(source);
    source.onended = () => level.disconnect();
    source.start(Math.max(this.context.currentTime, at || this.context.currentTime));
    return source;
  }

  private playBuffer(buffer: AudioBuffer, destination: AudioNode, at: number, gain = 1) {
    if (!this.context) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const level = this.context.createGain();
    level.gain.value = gain;
    source.connect(level).connect(destination);
    this.voice(source);
    source.onended = () => level.disconnect();
    source.start(Math.max(this.context.currentTime, at));
  }

  private voice(node: AudioScheduledSourceNode) {
    this.voices.add(node);
    node.addEventListener("ended", () => { this.voices.delete(node); node.disconnect(); }, { once: true });
  }

  private later(seconds: number, callback: () => void) {
    const timer = window.setTimeout(() => { this.timers.delete(timer); callback(); }, Math.max(0, seconds * 1000));
    this.timers.add(timer);
  }

  /** A line tone from the exchange generator (425 Hz with a trace of harmonics). */
  private lineTone(frequency: number, at: number, duration: number, level = 0.24, destination: AudioNode | undefined = this.lineSum) {
    if (!this.context || !destination) return;
    const oscillator = this.context.createOscillator();
    if (frequency === LINE_TONE) oscillator.setPeriodicWave(this.context.createPeriodicWave(new Float32Array([0, 0, 0, 0]), new Float32Array([0, 1, 0.07, 0.035])));
    oscillator.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.012);
    gain.gain.setValueAtTime(level, at + Math.max(0.013, duration - 0.012));
    gain.gain.linearRampToValueAtTime(0, at + duration);
    oscillator.connect(gain).connect(destination);
    this.voice(oscillator);
    oscillator.onended = () => gain.disconnect();
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
    return oscillator;
  }

  setVolume(value: number) { this.volume = value; this.updateGain(); }
  setEnabled(value: boolean) { this.enabled = value; this.updateGain(); }
  private updateGain() {
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.context.currentTime, 0.04);
  }
  async suspend() { if (this.context?.state === "running") await this.context.suspend(); }
  async resume() { if (this.context?.state === "suspended") await this.context.resume(); }

  setSpeed(speed: ModemSpeed) {
    this.speed = speed;
    this.post({ type: "profile", speed });
  }

  /** Where the handset is decides how the line is heard: nothing, at the ear, or muffled by rubber cups. */
  setHandset(place: HandsetPlace, delay = 0) {
    this.handset = place;
    if (!this.context || !this.ear || !this.cup || !this.upToCup || !this.lineGate) return;
    const at = this.context.currentTime + delay;
    this.ear.gain.setTargetAtTime(place === "ear" ? 0.6 : 0, at, 0.05);
    // Rubber cups seal the capsules: the carrier leaks into the room far quieter than at the ear.
    // Measured target: carrier and data leak out about 8–10 dB below the dial tone heard at the ear.
    this.cup.gain.setTargetAtTime(place === "coupler" ? 0.14 : 0, at, 0.06);
    this.upToCup.gain.setTargetAtTime(place === "coupler" ? 0.12 : 0, at, 0.06);
  }

  /** Opening or closing the subscriber loop. */
  setLine(open: boolean, delay = 0) {
    if (!this.context || !this.lineGate) return;
    const at = this.context.currentTime + delay;
    this.lineGate.gain.cancelScheduledValues(at);
    this.lineGate.gain.setTargetAtTime(open ? 1 : 0, at, 0.004);
  }

  liftHandset() {
    if (!this.context) return 0;
    const now = this.context.currentTime;
    this.play("hookUp", this.places.phone, now, { gain: 0.8 });
    this.setLine(true, 0.03);
    this.play("lineClick", this.lineClicks, now + 0.03, { gain: 0.8 });
    // The dial tone arrives a moment after the exchange detects the closed loop.
    this.dialTone = this.lineTone(LINE_TONE, now + 0.32, 30, 0.22);
    return 0.32;
  }
  private dialTone?: OscillatorNode;

  hangUp() {
    if (!this.context) return;
    this.stopScheduled();
    this.play("cradle", this.places.phone, 0, { gain: 0.85 });
    this.setLine(false, 0.02);
    this.play("lineClick", this.lineClicks, this.context.currentTime + 0.02, { gain: 0.3 });
    this.setHandset("cradle", 0.02);
    this.carrier(false);
  }

  /** Mechanical ratchet and governor of the dial plus the loop interruptions heard on the line. */
  dial(plan: DialPlan, delay = 0) {
    if (!this.context) return;
    const start = this.context.currentTime + delay;
    this.stopDialTone(start + plan.steps[0].pulseTimes[0]);
    for (const step of plan.steps) {
      const windup = step.windupEnd - step.windupStart;
      this.playBuffer(ratchet(this.context, windup, Math.max(3, Math.round(step.travel / (Math.PI / 15)))), this.places.phone, start + step.windupStart, 0.45);
      const returning = step.returnEnd - step.returnStart;
      this.playBuffer(governor(this.context, returning, step.pulseTimes.map((time) => time - step.returnStart)), this.places.phone, start + step.returnStart, 0.5);
      for (const pulse of step.pulseTimes) {
        const at = start + pulse;
        this.lineGate?.gain.setValueAtTime(0, at);
        this.lineGate?.gain.setValueAtTime(1, at + PULSE_BREAK);
        this.play("lineClick", this.lineClicks, at, { gain: 0.9 });
        this.play("lineClick", this.lineClicks, at + PULSE_BREAK, { gain: 0.45 });
      }
    }
  }

  /** Touch-tone dialling by a direct-connect modem, heard through its small monitor speaker. */
  modemDial(number: string, delay = 0) {
    if (!this.context || !this.speaker) return 0;
    const start = this.context.currentTime + delay;
    this.speaker.gain.setTargetAtTime(0.55, start, 0.02);
    this.setLine(true, delay);
    this.lineTone(LINE_TONE, start + 0.1, 0.8, 0.22);
    [...number].forEach((digit, index) => {
      const at = start + 1.0 + index * 0.14;
      for (const frequency of DTMF[digit] ?? DTMF["0"]) this.lineTone(frequency, at, 0.07, 0.14);
    });
    return 1.0 + number.length * 0.14;
  }

  /** The exchange removes the dial tone as soon as the first impulse arrives. */
  stopDialTone(at = this.context?.currentTime ?? 0) {
    if (!this.context || !this.dialTone) return;
    try { this.dialTone.stop(Math.max(at, this.context.currentTime)); } catch { /* Already stopped. */ }
    this.dialTone = undefined;
  }

  /** Electromechanical switching after the last digit, then the Freiton (1 s on, 4 s off). */
  exchange(delay = 0) {
    if (!this.context) return;
    const at = this.context.currentTime + delay;
    this.play("exchange", this.lineClicks, at, { gain: 0.55 });
  }

  ring(delay = 0) {
    if (!this.context) return;
    this.lineTone(LINE_TONE, this.context.currentTime + delay, 1.0, 0.2);
  }

  /** The Btx-Zentrale lifts: a loop click, then the 2100 Hz answer tone (V.25). */
  answer(duration: number, delay = 0) {
    if (!this.context) return;
    const at = this.context.currentTime + delay;
    this.play("lineClick", this.lineClicks, at, { gain: 0.7 });
    this.lineTone(2100, at + 0.3, duration, 0.2);
  }

  /** The forward carrier (1300 Hz mark for V.23) and, once coupled, the terminal's back channel. */
  carrier(on: boolean, delay = 0, upDelay = 0.45) {
    this.later(delay, () => {
      if (this.modem) this.post({ type: "carrier", down: on, ...(on ? {} : { up: false }) });
      else this.fallbackCarrier(on);
    });
    // An acoustic coupler only transmits once the handset sits in its cups; a direct modem always does.
    const acoustic = this.speed === 300 || this.speed === 1200;
    if (on) this.later(delay + upDelay, () => this.post({ type: "carrier", up: !acoustic || this.handset === "coupler" }));
    if (!on) this.post({ type: "clear" });
  }

  /** Direct-connect modems mute their speaker once the handshake completes (ATM1). */
  muteSpeaker(delay = 0) {
    if (!this.context || !this.speaker) return;
    this.speaker.gain.setTargetAtTime(0, this.context.currentTime + delay, 0.08);
  }

  private fallbackCarrier(on: boolean) {
    this.fallback?.stop();
    this.fallback = undefined;
    const link = linkFor(this.speed);
    if (!on || !this.context || !this.lineSum || !link) return;
    const buffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
    createTransmitter(link.down, this.context.sampleRate).render(buffer.getChannelData(0), 0.28);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.lineSum);
    source.start();
    this.voice(source);
    this.fallback = source;
  }

  /** Page bytes on the forward channel; one byte per screen cell keeps sound and reveal in step. */
  transmit(bytes: number[]) { this.post({ type: "send", channel: "down", bytes }); }
  idle() { this.post({ type: "clear", channel: "down" }); }
  /** A keystroke on the 75 bit/s back channel, echoed by the centre on the forward channel. */
  sendKey(char: string) {
    const code = char.length === 1 ? char.charCodeAt(0) & 0x7f : 0x0d;
    this.post({ type: "send", channel: "up", bytes: [code] });
    this.later(10 / 75 + 0.03, () => this.post({ type: "send", channel: "down", bytes: [code] }));
  }
  setLineNoise(level: number) { this.lineNoise = level; this.post({ type: "noise", level }); }
  /** The steady carrier between characters can be switched off; data bursts and keystrokes stay audible. */
  setCarrierTone(audible: boolean) {
    this.carrierTone = audible;
    this.post({ type: "quiet", value: !audible });
  }
  private carrierTone = true;

  key(name: string, down: boolean, pan = 0) {
    if (!this.context) return;
    const wide = name === " " ? "space" : name === "Enter" ? "enter" : "";
    const buffer = down ? (wide || "key") : wide === "space" ? "spaceUp" : "keyUp";
    this.play(buffer, this.places.keyboard, 0, { gain: down ? 0.7 : 0.45, rate: 0.97 + Math.random() * 0.06 + pan * 0.02 });
  }

  couplerSeated() { this.play("coupler", this.places.coupler, 0, { gain: 0.95 }); }
  lamp() { this.play("lamp", this.places.lamp, 0, { gain: 0.7 }); }
  click(place: Place = "monitor", gain = 0.5) { this.play("lineClick", this.places[place], 0, { gain }); }

  /** Power rocker, degaussing coil, EHT static and the 15.625 kHz line-output whine of a PAL tube. */
  crtOn() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.play("power", this.places.monitor, now, { gain: 0.8 });
    this.play("degauss", this.places.monitor, now + 0.06, { gain: 0.75 });
    this.play("crackle", this.places.monitor, now + 0.4, { gain: 0.35 });
    this.startWhine(now + 0.5);
  }

  crtOff() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.play("power", this.places.monitor, now, { gain: 0.7, rate: 0.94 });
    this.play("crackle", this.places.monitor, now + 0.15, { gain: 0.18, rate: 1.3 });
    this.whine?.gain.setTargetAtTime(0, now, 0.05);
  }

  /** Called once audio is unlocked with the terminal already on. */
  ambience(on: boolean) {
    if (!this.context) return;
    if (on) this.startWhine(this.context.currentTime);
    else this.whine?.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
  }

  private startWhine(at: number) {
    if (!this.context) return;
    if (!this.whine) {
      const whine = this.context.createOscillator();
      whine.frequency.value = 15625;
      const wobble = this.context.createOscillator();
      wobble.frequency.value = 0.31;
      const depth = this.context.createGain();
      depth.gain.value = 3;
      wobble.connect(depth).connect(whine.frequency);
      const hum = this.context.createOscillator();
      hum.type = "sawtooth";
      hum.frequency.value = 50;
      const humFilter = this.context.createBiquadFilter();
      humFilter.type = "lowpass"; humFilter.frequency.value = 160;
      const humLevel = this.context.createGain();
      humLevel.gain.value = 0.35;
      this.whine = this.context.createGain();
      this.whine.gain.value = 0;
      const whineLevel = this.context.createGain();
      whineLevel.gain.value = 0.012;
      whine.connect(whineLevel).connect(this.whine);
      hum.connect(humFilter).connect(humLevel).connect(this.whine);
      this.whine.connect(this.places.monitor);
      whine.start(); wobble.start(); hum.start();
    }
    this.whine.gain.cancelScheduledValues(at);
    this.whine.gain.setTargetAtTime(0.05, at, 0.8);
  }

  private stopScheduled() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    if (!this.context) return;
    const now = this.context.currentTime;
    this.lineGate?.gain.cancelScheduledValues(now);
    for (const voice of this.voices) try { voice.stop(now); } catch { /* Already stopped. */ }
    this.voices.clear();
    this.dialTone = undefined;
  }

  /** Cancels an in-progress call sequence and silences the line; the CRT keeps humming. */
  stop() {
    this.stopScheduled();
    this.carrier(false);
    this.setLine(false);
    this.speaker?.gain.setTargetAtTime(0, this.now, 0.02);
    this.setHandset(this.handset);
  }
}
