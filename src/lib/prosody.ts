// Prosody features and tone judgement (CLAUDE.md §6). Pure functions only.
// This describes how a reading *sounds*, not how the speaker feels.

import { PitchDetector } from 'pitchy';

export type Tone = 'neutral' | 'happy' | 'angry';

export interface VoiceFeatures {
  /** Hz, over voiced frames (0 when none). */
  f0Mean: number;
  f0Std: number;
  /** p90 − p10 of voiced f0, Hz. */
  f0Range: number;
  /** Mean RMS over speech frames (0..1 full scale). */
  rmsMean: number;
  /** Energy peaks per second of speaking span (≈ syllable rate). */
  speechRate: number;
  /** Share of silent frames between the first and last speech frame, 0..1. */
  pauseRatio: number;
}

// ---- Tunable constants (update test fixtures together) ----

export const WINDOW_MS = 50;
export const HOP_MS = 10;
/** Absolute floor below which a frame is silence regardless of level. */
export const SILENCE_RMS = 0.005;
/** A frame is speech if its RMS exceeds this fraction of the clip's p95 RMS. */
export const SPEECH_RMS_FRACTION = 0.15;
export const MIN_F0_HZ = 70;
export const MAX_F0_HZ = 500;
export const MIN_PITCH_CLARITY = 0.85;
/** Energy peaks closer than this are one syllable. */
export const MIN_PEAK_GAP_MS = 120;
/** Two peaks count separately only if the envelope dips below this fraction of the smaller one. */
export const PEAK_DIP_RATIO = 0.8;

// §6 thresholds (z-scores vs. the neutral readings)
export const HAPPY_F0STD_Z = 0.8;
export const ANGRY_RMS_Z = 1.2;
export const NEUTRAL_Z = 0.5;
/**
 * With only two neutral clips their spread is unreliable (often ≈ 0), so z uses
 * max(observed std, REL × |mean|, ABS) as the scale.
 */
export const SPREAD_FLOOR: Record<keyof VoiceFeatures, { rel: number; abs: number }> = {
  f0Mean: { rel: 0.05, abs: 5 },
  f0Std: { rel: 0.2, abs: 3 },
  f0Range: { rel: 0.2, abs: 8 },
  rmsMean: { rel: 0.2, abs: 0.005 },
  speechRate: { rel: 0.15, abs: 0.3 },
  pauseRatio: { rel: 0.2, abs: 0.05 },
};

export const FEATURE_KEYS = Object.keys(SPREAD_FLOOR) as (keyof VoiceFeatures)[];

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const std = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
};

export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

export function rms(x: ArrayLike<number>, start = 0, end = x.length): number {
  let sum = 0;
  for (let i = start; i < end; i++) sum += x[i] * x[i];
  return end > start ? Math.sqrt(sum / (end - start)) : 0;
}

export interface Frame {
  rms: number;
  /** Hz, or null when unvoiced/unclear. */
  f0: number | null;
}

/** 50 ms windows every 10 ms: RMS and (for loud-enough frames) f0. */
export function analyzeFrames(samples: Float32Array, sampleRate: number): Frame[] {
  const win = Math.round((WINDOW_MS / 1000) * sampleRate);
  const hop = Math.round((HOP_MS / 1000) * sampleRate);
  if (samples.length < win) return [];
  const detector = PitchDetector.forFloat32Array(win);
  const frames: Frame[] = [];
  for (let start = 0; start + win <= samples.length; start += hop) {
    const r = rms(samples, start, start + win);
    let f0: number | null = null;
    if (r > SILENCE_RMS) {
      const [pitch, clarity] = detector.findPitch(samples.subarray(start, start + win), sampleRate);
      if (clarity >= MIN_PITCH_CLARITY && pitch >= MIN_F0_HZ && pitch <= MAX_F0_HZ) f0 = pitch;
    }
    frames.push({ rms: r, f0 });
  }
  return frames;
}

export function speechThreshold(frameRms: number[]): number {
  return Math.max(SILENCE_RMS, SPEECH_RMS_FRACTION * percentile(frameRms, 0.95));
}

/** Count syllable-like energy peaks in an RMS envelope sampled every HOP_MS. */
export function countEnergyPeaks(envelope: number[], threshold: number): number {
  // 5-frame moving average (50 ms) to suppress pitch-period ripple.
  const env = envelope.map((_, i) => {
    const a = Math.max(0, i - 2);
    const b = Math.min(envelope.length, i + 3);
    return mean(envelope.slice(a, b));
  });
  const minGap = Math.round(MIN_PEAK_GAP_MS / HOP_MS);
  const peaks: number[] = [];
  for (let i = 1; i < env.length - 1; i++) {
    if (env[i] < threshold || env[i] < env[i - 1] || env[i] < env[i + 1]) continue;
    const last = peaks.at(-1);
    if (last === undefined) {
      peaks.push(i);
      continue;
    }
    const valley = Math.min(...env.slice(last, i + 1));
    const separate = i - last >= minGap && valley < PEAK_DIP_RATIO * Math.min(env[last], env[i]);
    if (separate) peaks.push(i);
    else if (env[i] > env[last]) peaks[peaks.length - 1] = i;
  }
  return peaks.length;
}

/** Clip-level features. Silent or too-short input returns finite zeros (pauseRatio 1). */
export function extractFeatures(samples: Float32Array, sampleRate: number): VoiceFeatures {
  const frames = analyzeFrames(samples, sampleRate);
  const env = frames.map((f) => f.rms);
  const thr = speechThreshold(env);
  const speechIdx = frames.flatMap((f, i) => (f.rms > thr ? [i] : []));
  if (speechIdx.length === 0) {
    return { f0Mean: 0, f0Std: 0, f0Range: 0, rmsMean: 0, speechRate: 0, pauseRatio: 1 };
  }
  const first = speechIdx[0];
  const last = speechIdx.at(-1)!;
  const span = frames.slice(first, last + 1);
  const spanSec = ((last - first) * HOP_MS + WINDOW_MS) / 1000;
  const f0s = span.filter((f) => f.rms > thr && f.f0 !== null).map((f) => f.f0!);

  return {
    f0Mean: mean(f0s),
    f0Std: std(f0s),
    f0Range: percentile(f0s, 0.9) - percentile(f0s, 0.1),
    rmsMean: mean(speechIdx.map((i) => frames[i].rms)),
    speechRate: countEnergyPeaks(env.slice(first, last + 1), thr) / spanSec,
    pauseRatio: span.filter((f) => f.rms <= thr).length / span.length,
  };
}

export interface VoiceBaseline {
  mean: VoiceFeatures;
  scale: VoiceFeatures;
}

/** Baseline from the neutral readings (CLAUDE.md §1.4). */
export function computeVoiceBaseline(neutral: VoiceFeatures[]): VoiceBaseline | null {
  if (neutral.length === 0) return null;
  const m = {} as VoiceFeatures;
  const s = {} as VoiceFeatures;
  for (const k of FEATURE_KEYS) {
    const xs = neutral.map((f) => f[k]);
    m[k] = mean(xs);
    s[k] = Math.max(std(xs), SPREAD_FLOOR[k].rel * Math.abs(m[k]), SPREAD_FLOOR[k].abs);
  }
  return { mean: m, scale: s };
}

export function zScores(f: VoiceFeatures, b: VoiceBaseline): VoiceFeatures {
  const z = {} as VoiceFeatures;
  for (const k of FEATURE_KEYS) z[k] = (f[k] - b.mean[k]) / b.scale[k];
  return z;
}

/**
 * §6 rules:
 * - happy: z(f0Std) > +0.8 and rmsMean above baseline
 * - angry: z(rmsMean) > +1.2 and speechRate above baseline (f0Range may be narrow)
 * - neutral: every |z| ≤ 0.5, and the fallback when neither rule fires
 * If both fire, the one with the larger margin over its threshold wins.
 */
export function judgeTone(z: VoiceFeatures): Tone {
  const happy = z.f0Std > HAPPY_F0STD_Z && z.rmsMean > 0;
  const angry = z.rmsMean > ANGRY_RMS_Z && z.speechRate > 0;
  if (happy && angry) return z.rmsMean - ANGRY_RMS_Z >= z.f0Std - HAPPY_F0STD_Z ? 'angry' : 'happy';
  if (angry) return 'angry';
  if (happy) return 'happy';
  return 'neutral';
}

export function isFlat(z: VoiceFeatures): boolean {
  return FEATURE_KEYS.every((k) => Math.abs(z[k]) <= NEUTRAL_Z);
}
