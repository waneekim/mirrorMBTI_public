// Report metrics (CLAUDE.md §8). Pure functions only.
import { EMOTIONS, type Emotion, type EmotionProbs } from './emotion-mapping';
import { AXES, type Axes } from './mbti-scoring';

export type Tone = 'neutral' | 'happy' | 'angry';

export interface ExpressionClipInput {
  id: string;
  intended: Emotion | 'n/a';
  read: EmotionProbs | null;
}

export interface Delivery {
  id: string;
  intended: Emotion;
  /** read[intended], or null when the clip could not be analysed. */
  value: number | null;
  /** Emotion the clip reads as most strongly. */
  readAs: Emotion | null;
}

/** 표현 전달도: per expression clip, how strongly the intended emotion comes across. */
export function expressionDelivery(clips: ExpressionClipInput[]): Delivery[] {
  return clips
    .filter((c): c is ExpressionClipInput & { intended: Emotion } => c.intended !== 'n/a')
    .map((c) => ({
      id: c.id,
      intended: c.intended,
      value: c.read ? c.read[c.intended] : null,
      readAs: c.read ? EMOTIONS.reduce((b, e) => (c.read![e] > c.read![b] ? e : b), 'neutral' as Emotion) : null,
    }));
}

export interface MisreadRisk {
  emotion: Exclude<Emotion, 'neutral'>;
  probability: number;
}

/** 오해 위험: on the neutral clip, the strongest non-neutral emotion and its probability. */
export function misreadRisk(neutralRead: EmotionProbs | null): MisreadRisk | null {
  if (!neutralRead) return null;
  const others = EMOTIONS.filter((e): e is Exclude<Emotion, 'neutral'> => e !== 'neutral');
  const emotion = others.reduce((b, e) => (neutralRead[e] > neutralRead[b] ? e : b));
  return { emotion, probability: neutralRead[emotion] };
}

export interface SpeechClipInput {
  id: string;
  intended: Tone;
  readTone: Tone | null;
}

export interface ToneResult {
  id: string;
  intended: Tone;
  readTone: Tone | null;
  match: boolean | null;
}

/** 톤 전달도: per speech clip, whether the read tone matches the intended one. */
export function toneDelivery(clips: SpeechClipInput[]): { results: ToneResult[]; matched: number; judged: number } {
  const results = clips.map((c) => ({ ...c, match: c.readTone === null ? null : c.readTone === c.intended }));
  const judged = results.filter((r) => r.match !== null);
  return { results, matched: judged.filter((r) => r.match).length, judged: judged.length };
}

/** Mean of rater axes (impression.axes). */
export function meanAxes(list: Axes[]): Axes | null {
  if (list.length === 0) return null;
  return Object.fromEntries(AXES.map((a) => [a, list.reduce((s, x) => s + x[a], 0) / list.length])) as Axes;
}

export interface Gap {
  axes: Axes;
  objectivityIndex: number;
}

/** 괴리 지표 abs(self - impression) and 객관화 지수 100 - mean(gap). Null until impression exists. */
export function axisGap(self: Axes | null, impression: Axes | null): Gap | null {
  if (!self || !impression) return null;
  const axes = Object.fromEntries(AXES.map((a) => [a, Math.abs(self[a] - impression[a])])) as Axes;
  const mean = AXES.reduce((s, a) => s + axes[a], 0) / AXES.length;
  return { axes, objectivityIndex: Math.max(0, Math.min(100, 100 - mean)) };
}
