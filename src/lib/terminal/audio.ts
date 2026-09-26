import { MODEM_PROFILES, type ModemSpeed } from "./connection";

/** Continuous-phase FSK; higher-rate QAM is an audible approximation, not a modem emulator. */
export function modemSamples(speed: ModemSpeed, duration: number, sampleRate: number, seed = 1985): Float32Array {
  const profile = MODEM_PROFILES[speed];
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  if (!profile.rate) return samples;
  let phase = 0;
  let symbol = -1;
  let bits = 0;
  let random = seed;
  const next = () => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random; };
  for (let i = 0; i < samples.length; i++) {
    const current = Math.floor(i * profile.symbolRate / sampleRate);
    if (current !== symbol) { symbol = current; bits = next() >>> 16; }
    let value: number;
    if (profile.acoustic) {
      phase += 2 * Math.PI * ((bits & 1) ? profile.mark : profile.space) / sampleRate;
      value = Math.sin(phase);
    } else {
      phase += 2 * Math.PI * (speed === 2400 ? 2400 : 1800) / sampleRate;
      const inPhase = ((bits & 3) * 2 - 3) / 4;
      const quadrature = (((bits >> 2) & 3) * 2 - 3) / 4;
      value = inPhase * Math.cos(phase) + quadrature * Math.sin(phase);
    }
    const envelope = Math.min(1, i / (sampleRate * 0.012), (samples.length - i) / (sampleRate * 0.02));
    samples[i] = value * envelope * 0.28;
  }
  return samples;
}

export class TerminalAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private modem?: AudioBufferSourceNode;
  private nodes = new Set<AudioScheduledSourceNode>();
  private volume = 0.35;
  private enabled = true;

  async unlock() {
    this.context ??= new AudioContext();
    if (!this.master) {
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? this.volume * 0.45 : 0;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  setVolume(value: number) { this.volume = value; this.updateGain(); }
  setEnabled(value: boolean) { this.enabled = value; this.updateGain(); }
  private updateGain() {
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.enabled ? this.volume * 0.45 : 0, this.context.currentTime, 0.04);
  }
  private track(node: AudioScheduledSourceNode) {
    this.nodes.add(node);
    node.addEventListener("ended", () => { this.nodes.delete(node); node.disconnect(); }, { once: true });
  }
  tone(frequency: number, duration: number, delay = 0, level = 0.3) {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const start = this.context.currentTime + delay;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.008);
    gain.gain.setValueAtTime(level, start + Math.max(0.009, duration - 0.02));
    gain.gain.linearRampToValueAtTime(0, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.onended = () => gain.disconnect();
    this.track(oscillator);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }
  click(level = 0.2, delay = 0) {
    if (!this.context || !this.master) return;
    const length = Math.floor(this.context.sampleRate * 0.035);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.12)) * level;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.master);
    this.track(source);
    source.start(this.context.currentTime + delay);
  }
  dial() {
    // German rotary impulse dialing: a brief local click train, not DTMF.
    this.tone(425, 0.32);
    let cursor = 0.38;
    for (const digit of [0, 1, 9, 1, 0]) {
      const pulses = digit || 10;
      for (let i = 0; i < pulses; i++) { this.click(0.6, cursor); cursor += 0.1; }
      cursor += 0.2;
    }
  }
  answer(speed: ModemSpeed) {
    if (speed === "LINE") return;
    this.tone(2100, 1.15, 0, 0.22);
    this.tone(MODEM_PROFILES[speed].mark, 0.3, 1.3, 0.18);
  }
  carrier(speed: ModemSpeed, noisy = false) {
    this.stopCarrier();
    if (!this.context || !this.master || speed === "LINE") return;
    const pcm = modemSamples(speed, 2, this.context.sampleRate);
    if (noisy) for (let i = 0; i < pcm.length; i++) pcm[i] += (Math.random() * 2 - 1) * 0.15;
    const buffer = this.context.createBuffer(1, pcm.length, this.context.sampleRate);
    buffer.copyToChannel(pcm as Float32Array<ArrayBuffer>, 0);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = this.context.createGain();
    gain.gain.value = 0.3;
    source.connect(gain).connect(this.master);
    source.onended = () => gain.disconnect();
    this.track(source);
    source.start();
    this.modem = source;
  }
  stopCarrier() { if (this.modem) { this.modem.stop(); this.modem = undefined; } }
  stop() {
    this.modem = undefined;
    for (const node of this.nodes) { try { node.stop(); } catch { /* Already stopped. */ } }
    this.nodes.clear();
  }
}
