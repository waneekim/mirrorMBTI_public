// Blendshape → "how this face reads" probabilities (CLAUDE.md §5). Pure functions only.
// This measures impression, not the person's actual feeling or personality.

import type { HeadPose } from './head-pose';

export const EMOTIONS = ['neutral', 'happy', 'angry', 'surprised', 'sad'] as const;
export type Emotion = (typeof EMOTIONS)[number];
export type EmotionProbs = Record<Emotion, number>;

/** MediaPipe blendshape category name → score (0..1). */
export type Blendshapes = Record<string, number>;

/** Blendshapes the rules read; only these are stored per frame. */
export const USED_BLENDSHAPES = [
  'mouthSmileLeft',
  'mouthSmileRight',
  'cheekSquintLeft',
  'cheekSquintRight',
  'browDownLeft',
  'browDownRight',
  'jawForward',
  'mouthPressLeft',
  'mouthPressRight',
  'noseSneerLeft',
  'noseSneerRight',
  'eyeWideLeft',
  'eyeWideRight',
  'browInnerUp',
  'jawOpen',
  'mouthFrownLeft',
  'mouthFrownRight',
  'eyeSquintLeft',
  'eyeSquintRight',
] as const;

// ---- Tunable constants (update test fixtures together) ----

/**
 * Per-emotion gain applied to the §5 weighted sums before clamping to 1.
 * The raw sums of a clearly posed expression rarely exceed ~0.4–0.6 (angry/sad especially),
 * which would always lose to neutral = 1 - max(others). Gains map a typical posed expression to ~0.8+.
 */
export const EMOTION_GAIN: Record<Exclude<Emotion, 'neutral'>, number> = {
  happy: 1.2,
  angry: 2.2,
  surprised: 1.6,
  sad: 2.2,
};
/** Softmax sharpness. Higher = more decisive. */
export const SOFTMAX_SCALE = 8;
/** Sad is suppressed as eyeWide (baseline-subtracted) approaches this value. */
export const SAD_EYE_WIDE_GATE = 0.3;
/** Frames within this many ms of either clip edge are ignored. */
export const EDGE_TRIM_MS = 300;
/** genuineSmile: cheekSquint must reach this fraction of mouthSmile (§5). */
export const GENUINE_SMILE_RATIO = 0.4;
/** genuineSmile is undefined when there is barely a smile. */
export const MIN_SMILE_FOR_GENUINE = 0.1;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const v = (bs: Blendshapes, k: string) => bs[k] ?? 0;
const pair = (bs: Blendshapes, base: string) => (v(bs, `${base}Left`) + v(bs, `${base}Right`)) / 2;

/** Baseline-relative activation: max(0, value - baseline). No baseline → raw values. */
export function subtractBaseline(bs: Blendshapes, baseline?: Blendshapes | null): Blendshapes {
  const out: Blendshapes = {};
  for (const k of USED_BLENDSHAPES) out[k] = Math.max(0, v(bs, k) - (baseline ? v(baseline, k) : 0));
  return out;
}

/** §5 weighted sums (with gain), each in 0..1. Input should already be baseline-subtracted. */
export function emotionScores(d: Blendshapes): EmotionProbs {
  const happy = 0.4 * v(d, 'mouthSmileLeft') + 0.4 * v(d, 'mouthSmileRight') + 0.2 * pair(d, 'cheekSquint');
  const angry =
    0.35 * pair(d, 'browDown') + 0.25 * v(d, 'jawForward') + 0.2 * pair(d, 'mouthPress') + 0.2 * pair(d, 'noseSneer');
  const surprised = 0.35 * pair(d, 'eyeWide') + 0.35 * v(d, 'browInnerUp') + 0.3 * v(d, 'jawOpen');
  const sadGate = clamp01(1 - pair(d, 'eyeWide') / SAD_EYE_WIDE_GATE);
  const sad = (0.4 * pair(d, 'mouthFrown') + 0.3 * v(d, 'browInnerUp') + 0.3 * pair(d, 'eyeSquint')) * sadGate;

  const scores = {
    happy: clamp01(happy * EMOTION_GAIN.happy),
    angry: clamp01(angry * EMOTION_GAIN.angry),
    surprised: clamp01(surprised * EMOTION_GAIN.surprised),
    sad: clamp01(sad * EMOTION_GAIN.sad),
  };
  const neutral = Math.max(0, 1 - Math.max(scores.happy, scores.angry, scores.surprised, scores.sad));
  return { neutral, ...scores };
}

export function softmax(scores: EmotionProbs, scale = SOFTMAX_SCALE): EmotionProbs {
  const max = Math.max(...EMOTIONS.map((e) => scores[e]));
  const exps = EMOTIONS.map((e) => Math.exp((scores[e] - max) * scale));
  const sum = exps.reduce((a, b) => a + b, 0);
  return Object.fromEntries(EMOTIONS.map((e, i) => [e, exps[i] / sum])) as EmotionProbs;
}

/** Probabilities for one frame. */
export function frameEmotionProbs(bs: Blendshapes, baseline?: Blendshapes | null): EmotionProbs {
  return softmax(emotionScores(subtractBaseline(bs, baseline)));
}

export function topEmotion(p: EmotionProbs): Emotion {
  return EMOTIONS.reduce((best, e) => (p[e] > p[best] ? e : best), 'neutral' as Emotion);
}

// ---- Clip-level aggregation ----

export interface FaceSample {
  /** ms since clip start */
  t: number;
  bs: Blendshapes;
  pose: HeadPose | null;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Drop the first/last EDGE_TRIM_MS; falls back to all samples if trimming would leave none. */
export function trimEdges(samples: FaceSample[], durationMs: number): FaceSample[] {
  const kept = samples.filter((s) => s.t >= EDGE_TRIM_MS && s.t <= durationMs - EDGE_TRIM_MS);
  return kept.length > 0 ? kept : samples;
}

/** Per-blendshape mean over the (trimmed) neutral clip — the personal baseline. */
export function computeBaseline(samples: FaceSample[], durationMs: number): Blendshapes | null {
  const s = trimEdges(samples, durationMs);
  if (s.length === 0) return null;
  const out: Blendshapes = {};
  for (const k of USED_BLENDSHAPES) out[k] = s.reduce((a, x) => a + v(x.bs, k), 0) / s.length;
  return out;
}

/** Per-emotion median of frame probabilities, renormalised to sum to 1. */
export function aggregateClipEmotion(
  samples: FaceSample[],
  durationMs: number,
  baseline: Blendshapes | null,
): EmotionProbs | null {
  const s = trimEdges(samples, durationMs);
  if (s.length === 0) return null;
  const frames = s.map((x) => frameEmotionProbs(x.bs, baseline));
  const med = Object.fromEntries(EMOTIONS.map((e) => [e, median(frames.map((f) => f[e]))])) as EmotionProbs;
  const sum = EMOTIONS.reduce((a, e) => a + med[e], 0);
  return Object.fromEntries(EMOTIONS.map((e) => [e, sum > 0 ? med[e] / sum : e === 'neutral' ? 1 : 0])) as EmotionProbs;
}

/** §5 "진짜 웃음" hint: cheekSquint ≥ 40% of mouthSmile (baseline-relative medians). */
export function detectGenuineSmile(samples: FaceSample[], durationMs: number, baseline: Blendshapes | null): boolean | null {
  const s = trimEdges(samples, durationMs);
  if (s.length === 0) return null;
  const d = s.map((x) => subtractBaseline(x.bs, baseline));
  const smile = median(d.map((x) => pair(x, 'mouthSmile')));
  const cheek = median(d.map((x) => pair(x, 'cheekSquint')));
  if (smile < MIN_SMILE_FOR_GENUINE) return false;
  return cheek >= GENUINE_SMILE_RATIO * smile;
}

/** Median head pose over the trimmed clip. */
export function aggregateHeadPose(samples: FaceSample[], durationMs: number): HeadPose | null {
  const poses = trimEdges(samples, durationMs)
    .map((x) => x.pose)
    .filter((p): p is HeadPose => p !== null);
  if (poses.length === 0) return null;
  return {
    yaw: median(poses.map((p) => p.yaw)),
    pitch: median(poses.map((p) => p.pitch)),
    roll: median(poses.map((p) => p.roll)),
  };
}
