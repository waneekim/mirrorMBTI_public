// Capture protocol (CLAUDE.md §4). Order is fixed.

export type ClipKind = 'expression' | 'speech';
export type Emotion = 'neutral' | 'happy' | 'angry' | 'surprised' | 'sad';
export type Tone = 'neutral' | 'happy' | 'angry';
export type Intended = Emotion | 'n/a';

export interface ClipSpec {
  id: string;
  kind: ClipKind;
  intended: Intended;
  /** Instruction shown on the guide card. */
  guide: string;
  /** Sentence to read aloud (speech clips only). */
  sentence?: string;
  /** Face framing hint for the overlay. */
  framing: 'front' | 'profile_left' | 'profile_right';
}

export const CLIP_DURATION_MS = 3000;
export const COUNTDOWN_SECONDS = 3;

export const SENTENCES = {
  A: '오늘 회의는 세 시에 시작합니다.',
  B: '그 일은 제가 처리해 두었습니다.',
} as const;

export const TONE_LABEL: Record<Tone, { icon: string; label: string; hint: string }> = {
  neutral: { icon: '😐', label: '담담하게', hint: '평소 말하듯 감정 없이 읽어 주세요 (기준선)' },
  happy: { icon: '😊', label: '기쁘게', hint: '좋은 소식을 전하듯 밝게 읽어 주세요' },
  angry: { icon: '😠', label: '화난 듯이', hint: '짜증 나거나 화난 듯이 읽어 주세요' },
};

const EXPRESSION_CLIPS: ClipSpec[] = [
  { id: 'neutral', kind: 'expression', intended: 'neutral', guide: '아무 표정 없이 카메라를 보세요 (기준선)', framing: 'front' },
  { id: 'smile', kind: 'expression', intended: 'happy', guide: '자연스럽게 웃어 보세요', framing: 'front' },
  { id: 'angry', kind: 'expression', intended: 'angry', guide: '화난 표정을 지어 보세요', framing: 'front' },
  { id: 'surprised', kind: 'expression', intended: 'surprised', guide: '놀란 표정을 지어 보세요', framing: 'front' },
  { id: 'sad', kind: 'expression', intended: 'sad', guide: '슬픈 표정을 지어 보세요', framing: 'front' },
  { id: 'profile_left', kind: 'expression', intended: 'n/a', guide: '고개를 돌려 왼쪽 옆모습을 보여 주세요', framing: 'profile_left' },
  { id: 'profile_right', kind: 'expression', intended: 'n/a', guide: '고개를 돌려 오른쪽 옆모습을 보여 주세요', framing: 'profile_right' },
];

const TONES: Tone[] = ['neutral', 'happy', 'angry'];

const SPEECH_CLIPS: ClipSpec[] = TONES.flatMap((tone) =>
  (Object.keys(SENTENCES) as (keyof typeof SENTENCES)[]).map(
    (key): ClipSpec => ({
      id: `speech_${key.toLowerCase()}_${tone}`,
      kind: 'speech',
      intended: tone,
      guide: TONE_LABEL[tone].hint,
      sentence: SENTENCES[key],
      framing: 'front',
    }),
  ),
);

export const PROTOCOL: readonly ClipSpec[] = [...EXPRESSION_CLIPS, ...SPEECH_CLIPS];

export function getClipSpec(id: string): ClipSpec | undefined {
  return PROTOCOL.find((c) => c.id === id);
}

/** First clip in protocol order that has not been recorded yet, or null when complete. */
export function nextPendingClip(recordedIds: Iterable<string>): ClipSpec | null {
  const done = new Set(recordedIds);
  return PROTOCOL.find((c) => !done.has(c.id)) ?? null;
}

/** Clip that follows `id` in protocol order and is still pending; wraps to the first pending clip. */
export function nextPendingAfter(id: string, recordedIds: Iterable<string>): ClipSpec | null {
  const done = new Set(recordedIds);
  const start = PROTOCOL.findIndex((c) => c.id === id);
  const ordered = [...PROTOCOL.slice(start + 1), ...PROTOCOL.slice(0, start + 1)];
  return ordered.find((c) => !done.has(c.id)) ?? null;
}
