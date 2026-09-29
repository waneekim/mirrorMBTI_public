import type { Emotion } from '../../lib/emotion-mapping';

export const EMOTION_LABEL: Record<Emotion, string> = {
  neutral: '무표정',
  happy: '기쁨',
  angry: '화남',
  surprised: '놀람',
  sad: '슬픔',
};

export const EMOTION_COLOR: Record<Emotion, string> = {
  neutral: 'bg-slate-400',
  happy: 'bg-amber-400',
  angry: 'bg-rose-500',
  surprised: 'bg-sky-400',
  sad: 'bg-indigo-400',
};
