import type { Emotion } from '../../lib/emotion-mapping';

export const EMOTION_LABEL: Record<Emotion, string> = {
  neutral: '무표정',
  happy: '기쁨',
  angry: '화남',
  surprised: '놀람',
  sad: '슬픔',
};

/** Display order for emotion charts; colors below follow this order slot by slot. */
export const EMOTION_DISPLAY_ORDER: readonly Emotion[] = ['neutral', 'angry', 'happy', 'surprised', 'sad'];

/**
 * Categorical slots 1–5 of the dataviz reference palette (dark), assigned in EMOTION_DISPLAY_ORDER.
 * Validated on the app surface #0f172a: lightness, chroma, CVD ΔE ≥ 8, normal-vision ΔE ≥ 15.
 * Always shown with a text label, never color alone.
 */
export const EMOTION_HEX: Record<Emotion, string> = {
  neutral: '#3987e5',
  angry: '#d95926',
  happy: '#199e70',
  surprised: '#c98500',
  sad: '#d55181',
};
