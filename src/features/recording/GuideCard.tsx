import { TONE_LABEL, type ClipSpec, type Tone } from './protocol';

export type RecordPhase = 'ready' | 'countdown' | 'recording' | 'saving';

interface Props {
  spec: ClipSpec;
  index: number;
  total: number;
  phase: RecordPhase;
  countdown: number;
}

export function GuideCard({ spec, index, total, phase, countdown }: Props) {
  const tone = spec.kind === 'speech' ? TONE_LABEL[spec.intended as Tone] : null;
  return (
    <div className="rounded-2xl bg-slate-800/80 p-4 shadow-lg ring-1 ring-white/10">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{spec.kind === 'expression' ? '표정 세트' : '낭독 세트'}</span>
        <span>
          {index + 1} / {total}
        </span>
      </div>

      {tone && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-700 px-3 py-1 text-sm">
          <span aria-hidden>{tone.icon}</span>
          <span>{tone.label}</span>
        </div>
      )}

      <p className="mt-2 text-lg font-medium">{spec.guide}</p>

      {spec.sentence && (
        <p className="mt-3 rounded-xl bg-slate-900 px-4 py-3 text-center text-xl font-semibold leading-snug">
          “{spec.sentence}”
        </p>
      )}

      <p className="mt-3 h-5 text-sm text-slate-300" aria-live="polite">
        {phase === 'countdown' && `${countdown}초 후 녹화가 시작됩니다`}
        {phase === 'recording' && '● 녹화 중 (3초)'}
        {phase === 'saving' && '저장 중…'}
      </p>
    </div>
  );
}
