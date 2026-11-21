/**
 * Cozy Web Audio engine — no audio files, everything is synthesized.
 *
 *  1. Background music: a warm lofi / gentle chiptune loop (Fmaj7 – Em7 – Dm7 – Cmaj7)
 *     with soft pads, a round bass, a dusty drum groove, a little melody and vinyl crackle.
 *  2. Retro 8-bit sound effects (click, step, dialog open/close, lamp, copy) and a
 *     soft noise-based cat purr.
 *
 * Music and effects have independent on/off switches, remembered in localStorage.
 * Browsers only allow audio after a user gesture, so call `unlock()` from the first
 * pointer/keyboard event; music starts then if the visitor left it switched on.
 */
import { useEffect, useState } from 'react';

type Wave = OscillatorType;

interface ToneOpts {
  freq: number;
  to?: number;
  dur: number;
  type?: Wave;
  vol?: number;
  delay?: number;
}

export interface AudioPrefs {
  sfxOn: boolean;
  bgmOn: boolean;
  /** True once music is actually sounding (after the first user gesture). */
  bgmPlaying: boolean;
}

const SFX_KEY = 'nasywa-cabin:sfx';
const BGM_KEY = 'nasywa-cabin:bgm';

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/* ------------------------------------------------------------------ */
/* Song data                                                           */
/* ------------------------------------------------------------------ */

const BPM = 74;
const EIGHTH = 60 / BPM / 2;
const SWING = 0.055; // late off-beats = lazy lofi feel

/** One chord per bar. */
const CHORDS: { root: number; notes: number[] }[] = [
  { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
  { root: 40, notes: [52, 55, 59, 62] }, // Em7
  { root: 38, notes: [50, 53, 57, 60] }, // Dm7
  { root: 36, notes: [48, 52, 55, 59] }, // Cmaj7
];

/** Melodies, 8 eighth-notes per bar, 0 = rest. Played over a 16-bar form. */
const MELODY_A = [
  [72, 0, 76, 0, 79, 77, 76, 0],
  [74, 0, 0, 71, 74, 0, 76, 0],
  [77, 0, 76, 74, 0, 72, 0, 69],
  [71, 0, 72, 0, 0, 0, 0, 0],
];
const MELODY_B = [
  [0, 0, 81, 79, 76, 0, 79, 0],
  [0, 76, 0, 74, 71, 0, 74, 0],
  [72, 0, 74, 0, 77, 76, 74, 0],
  [76, 0, 0, 74, 72, 0, 0, 0],
];
const REST = [[], [], [], []].map(() => new Array(8).fill(0) as number[]);
const FORM = [REST, MELODY_A, MELODY_B, MELODY_A]; // 4 phrases x 4 bars
/** Soft arpeggio "music box" sparkle during the last phrase. */
const ARP = [0, 2, 1, 3, 2, 1, 3, 2];

class CozyAudio {
  private ctx: AudioContext | null = null;
  private out: DynamicsCompressorNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private crackle: AudioBufferSourceNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  private prefs: AudioPrefs = { sfxOn: true, bgmOn: true, bgmPlaying: false };
  private listeners = new Set<(p: AudioPrefs) => void>();
  private unlocked = false;

  private timer: number | null = null;
  private nextTime = 0;
  private seqStep = 0;
  private lastStep = 0;

  constructor() {
    try {
      const sfx = window.localStorage.getItem(SFX_KEY);
      const bgm = window.localStorage.getItem(BGM_KEY);
      this.prefs.sfxOn = sfx !== '0';
      this.prefs.bgmOn = bgm !== '0';
    } catch {
      /* private mode — defaults are fine */
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else if (this.unlocked) void this.ctx.resume();
      });
    }
  }

  /* ---------------- plumbing ---------------- */

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.out = ctx.createDynamicsCompressor();
      this.out.threshold.value = -18;
      this.out.ratio.value = 3;
      this.out.connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.22;
      this.sfxBus.connect(this.out);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.out);
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume();
    return this.ctx;
  }

  private emit() {
    const snapshot = { ...this.prefs };
    this.listeners.forEach((fn) => fn(snapshot));
  }

  private save() {
    try {
      window.localStorage.setItem(SFX_KEY, this.prefs.sfxOn ? '1' : '0');
      window.localStorage.setItem(BGM_KEY, this.prefs.bgmOn ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }

  getPrefs(): AudioPrefs {
    return { ...this.prefs };
  }

  subscribe(fn: (p: AudioPrefs) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Call from the first user gesture. Safe to call many times. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.ensure();
    if (this.prefs.bgmOn) this.startMusic();
  }

  toggleSfx(): void {
    this.prefs.sfxOn = !this.prefs.sfxOn;
    this.save();
    this.emit();
    if (this.prefs.sfxOn) this.click();
  }

  toggleBgm(): void {
    const wasWaiting = this.prefs.bgmOn && !this.prefs.bgmPlaying;
    this.unlocked = true;
    // Switched on but not yet sounding (no gesture yet): a press means "play".
    this.prefs.bgmOn = wasWaiting ? true : !this.prefs.bgmOn;
    this.save();
    if (this.prefs.bgmOn) this.startMusic();
    else this.stopMusic();
    this.emit();
  }

  /* ---------------- music ---------------- */

  private startMusic(): void {
    const ctx = this.ensure();
    if (!ctx || !this.musicBus || this.timer !== null) return;
    this.seqStep = 0;
    this.nextTime = ctx.currentTime + 0.12;
    const g = this.musicBus.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(0.42, ctx.currentTime + 2.5);
    this.startCrackle();
    this.timer = window.setInterval(() => this.schedule(), 80);
    this.schedule();
    this.prefs.bgmPlaying = true;
    this.emit();
  }

  private stopMusic(): void {
    const ctx = this.ctx;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (ctx && this.musicBus) {
      const g = this.musicBus.gain;
      g.cancelScheduledValues(ctx.currentTime);
      g.setValueAtTime(g.value, ctx.currentTime);
      g.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    }
    if (this.crackle) {
      this.crackle.stop((ctx?.currentTime ?? 0) + 0.7);
      this.crackle = null;
    }
    this.prefs.bgmPlaying = false;
  }

  /** Look-ahead scheduler: queue every eighth-note that starts in the next 0.35 s. */
  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05; // tab was asleep
    while (this.nextTime < ctx.currentTime + 0.35) {
      this.playStep(this.seqStep, this.nextTime);
      this.seqStep = (this.seqStep + 1) % (16 * 8);
      this.nextTime += EIGHTH;
    }
  }

  private playStep(step: number, t: number): void {
    const bar = Math.floor(step / 8);
    const beat = step % 8;
    const chord = CHORDS[bar % 4];
    const phrase = FORM[Math.floor(bar / 4)];
    const swung = beat % 2 ? t + SWING : t;
    const barLen = EIGHTH * 8;

    if (beat === 0) {
      chord.notes.forEach((n, i) => this.pad(midi(n), t + i * 0.012, barLen * 0.98));
      this.kick(t);
    }
    if (beat === 0 || beat === 5) this.bass(midi(chord.root), swung, beat === 0 ? EIGHTH * 3 : EIGHTH * 2);
    if (beat === 3 && bar % 2) this.bass(midi(chord.root + 7), swung, EIGHTH);
    if (beat === 4) this.snare(t);
    if (beat === 6 && bar % 4 === 3) this.kick(swung, 0.5);
    this.hat(swung, beat % 2 ? 0.018 : 0.03);

    const note = phrase[bar % 4][beat];
    if (note) this.lead(midi(note), swung, EIGHTH * 1.7);
    if (Math.floor(bar / 4) === 3 && beat % 2 === 0) {
      this.bell(midi(chord.notes[ARP[beat]] + 12), swung);
    }
  }

  private voice(type: Wave, freq: number, t: number, dur: number, vol: number, attack: number, cutoff: number, detune = 0) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.detune.value = detune;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    osc.connect(filter).connect(g).connect(this.musicBus!);
    osc.start(t);
    osc.stop(t + dur + 0.3);
    return osc;
  }

  private pad(freq: number, t: number, dur: number) {
    this.voice('triangle', freq, t, dur, 0.045, 0.35, 900, -7);
    this.voice('sine', freq, t, dur, 0.04, 0.4, 1200, 7);
  }

  private bass(freq: number, t: number, dur: number) {
    this.voice('sine', freq, t, dur * 0.9, 0.16, 0.02, 400);
    this.voice('triangle', freq * 2, t, dur * 0.6, 0.025, 0.02, 600);
  }

  private lead(freq: number, t: number, dur: number) {
    const osc = this.voice('square', freq, t, dur, 0.022, 0.03, 1700);
    // gentle vibrato
    const ctx = this.ctx!;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const depth = ctx.createGain();
    depth.gain.value = 9;
    lfo.connect(depth).connect(osc.detune);
    lfo.start(t);
    lfo.stop(t + dur + 0.3);
    this.voice('sine', freq, t, dur, 0.03, 0.02, 3000);
  }

  private bell(freq: number, t: number) {
    this.voice('sine', freq, t, 0.25, 0.022, 0.005, 5000);
    this.voice('triangle', freq * 2, t, 0.12, 0.008, 0.005, 6000);
  }

  private kick(t: number, vol = 0.9) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32 * vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(g).connect(this.musicBus!);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  private noiseHit(t: number, dur: number, vol: number, type: BiquadFilterType, freq: number, q = 0.8) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.musicBus!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private snare(t: number) {
    this.noiseHit(t, 0.16, 0.07, 'bandpass', 1800, 0.7);
    this.voice('triangle', 190, t, 0.05, 0.03, 0.002, 800);
  }

  private hat(t: number, vol: number) {
    this.noiseHit(t, 0.04, vol, 'highpass', 7500);
  }

  private startCrackle() {
    const ctx = this.ctx!;
    if (this.crackle) return;
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.012;
      if (Math.random() < 0.0004) d[i] += (Math.random() * 2 - 1) * 0.5; // dust pops
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2500;
    f.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(f).connect(g).connect(this.musicBus!);
    src.start();
    this.crackle = src;
  }

  /* ---------------- sound effects ---------------- */

  private tone({ freq, to, dur, type = 'square', vol = 0.5, delay = 0 }: ToneOpts): void {
    if (!this.prefs.sfxOn) return;
    const ctx = this.ensure();
    if (!ctx || !this.sfxBus) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol: number, cutoff: number): void {
    if (!this.prefs.sfxOn) return;
    const ctx = this.ensure();
    if (!ctx || !this.sfxBus || !this.noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(filter).connect(gain).connect(this.sfxBus);
    src.start(ctx.currentTime, Math.random() * 0.5);
    src.stop(ctx.currentTime + dur + 0.02);
  }

  click(): void {
    this.tone({ freq: 880, to: 660, dur: 0.06, vol: 0.25 });
  }

  /** Very soft footstep tick, rate-limited so walking never gets noisy. */
  step(): void {
    const now = performance.now();
    if (now - this.lastStep < 230) return;
    this.lastStep = now;
    this.noise(0.035, 0.16, 900);
  }

  open(): void {
    this.tone({ freq: 523, dur: 0.08, vol: 0.3 });
    this.tone({ freq: 659, dur: 0.08, vol: 0.3, delay: 0.07 });
    this.tone({ freq: 784, dur: 0.14, vol: 0.3, delay: 0.14 });
  }

  close(): void {
    this.tone({ freq: 784, dur: 0.07, vol: 0.25 });
    this.tone({ freq: 523, dur: 0.12, vol: 0.25, delay: 0.06 });
  }

  lamp(on: boolean): void {
    if (on) this.tone({ freq: 330, to: 990, dur: 0.12, type: 'triangle', vol: 0.4 });
    else this.tone({ freq: 660, to: 220, dur: 0.12, type: 'triangle', vol: 0.35 });
  }

  copy(): void {
    this.tone({ freq: 988, dur: 0.06, vol: 0.25 });
    this.tone({ freq: 1319, dur: 0.12, vol: 0.25, delay: 0.06 });
  }

  /** Teletype blip for RPG dialog text. */
  blip(): void {
    this.tone({ freq: 620 + Math.random() * 80, dur: 0.025, vol: 0.08 });
  }

  /**
   * Cat easter egg: a soft, realistic purr.
   *
   * A real purr is breathy noise pulsed by the larynx ~25 times a second, in two
   * "breaths" (a fuller exhale and a softer, slightly brighter inhale). So:
   *   noise → band-pass (~150 Hz) → low-pass → amplitude pulsed by a 24 Hz LFO
   *   → breath envelope → effects bus,
   * followed by a delicate sine chime. No square / sawtooth oscillators anywhere.
   */
  purr(): void {
    if (!this.prefs.sfxOn) return;
    const ctx = this.ensure();
    if (!ctx || !this.sfxBus || !this.noiseBuf) return;
    const t0 = ctx.currentTime + 0.02;
    const dur = 1.55;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 0.9;
    band.frequency.setValueAtTime(140, t0);
    band.frequency.setValueAtTime(140, t0 + 0.78);
    band.frequency.linearRampToValueAtTime(185, t0 + 0.95); // inhale is a touch brighter

    const soft = ctx.createBiquadFilter();
    soft.type = 'lowpass';
    soft.frequency.value = 650;
    soft.Q.value = 0.5;

    // Rhythmic ~24 Hz flutter: gain swings between ~0.1 and 1.
    const pulse = ctx.createGain();
    pulse.gain.value = 0.55;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(24, t0);
    lfo.frequency.setValueAtTime(24, t0 + 0.8);
    lfo.frequency.linearRampToValueAtTime(26, t0 + 1.0);
    const depth = ctx.createGain();
    depth.gain.value = 0.45;
    lfo.connect(depth).connect(pulse.gain);

    // Breath envelope: exhale, tiny pause, softer inhale. Smooth attack/release.
    const env = ctx.createGain();
    const g = env.gain;
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(3.0, t0 + 0.18);
    g.linearRampToValueAtTime(2.6, t0 + 0.6);
    g.linearRampToValueAtTime(0.15, t0 + 0.82);
    g.linearRampToValueAtTime(1.8, t0 + 1.0);
    g.linearRampToValueAtTime(1.5, t0 + 1.3);
    g.linearRampToValueAtTime(0.0001, t0 + dur);

    src.connect(band).connect(soft).connect(pulse).connect(env).connect(this.sfxBus);
    src.start(t0, Math.random() * 0.5);
    lfo.start(t0);
    src.stop(t0 + dur + 0.05);
    lfo.stop(t0 + dur + 0.05);

    // Delicate chime accent as the purr settles.
    this.chime(1318.5, t0 + 1.05, 0.05);
    this.chime(1975.5, t0 + 1.17, 0.032);
  }

  /** Soft sine bell with a faint octave shimmer and a long, gentle release. */
  private chime(freq: number, t: number, vol: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(vol, t + 0.015);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 5000;
    out.connect(tone).connect(this.sfxBus);
    const base = ctx.createOscillator();
    base.type = 'sine';
    base.frequency.value = freq;
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = freq * 2.01;
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.25;
    base.connect(out);
    shimmer.connect(shimmerGain).connect(out);
    base.start(t);
    shimmer.start(t);
    base.stop(t + 1);
    shimmer.stop(t + 1);
  }

  /** Small "bump" when a route is blocked. */
  bump(): void {
    this.tone({ freq: 140, to: 90, dur: 0.07, vol: 0.2 });
  }
}

export const synth = new CozyAudio();

/** React binding for the music / effects switches. */
export function useAudioPrefs(): AudioPrefs & { toggleSfx: () => void; toggleBgm: () => void } {
  const [prefs, setPrefs] = useState<AudioPrefs>(synth.getPrefs());
  useEffect(() => synth.subscribe(setPrefs), []);
  return { ...prefs, toggleSfx: () => synth.toggleSfx(), toggleBgm: () => synth.toggleBgm() };
}
