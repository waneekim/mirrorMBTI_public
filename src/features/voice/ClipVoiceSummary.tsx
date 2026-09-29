import type { Tone } from '../../lib/prosody';
import type { ClipSpec } from '../recording/protocol';
import type { VoiceResult } from './derive';
import { HEARD_AS } from './labels';

/** One-line tone result for a speech clip in the list. */
export function ClipVoiceSummary({ spec, result }: { spec: ClipSpec; result: VoiceResult | undefined }) {
  if (!result) return <span className="text-slate-500">음성 분석 중…</span>;
  if (result.status === 'unavailable') return <span className="text-slate-500">음성 분석 불가</span>;
  if (result.status === 'silent') return <span className="text-amber-400">목소리가 녹음되지 않았습니다</span>;
  if (result.status === 'awaiting-baseline' || !result.readTone) return <span className="text-slate-500">담담한 낭독 촬영 후 분석됩니다</span>;
  const match = result.readTone === (spec.intended as Tone);
  return (
    <span className={match ? 'text-slate-300' : 'text-amber-300'}>
      {HEARD_AS[result.readTone]} 들릴 수 있음 {match ? '✓' : `· 의도: ${HEARD_AS[spec.intended as Tone]}`}
    </span>
  );
}
