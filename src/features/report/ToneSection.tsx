import { toneDelivery } from '../../lib/gap-metrics';
import type { Tone } from '../../lib/prosody';
import { PROTOCOL, TONE_LABEL } from '../recording/protocol';
import { useSessionStore } from '../recording/store';
import { HEARD_AS } from '../voice/labels';
import { Section } from './Section';

const EXPRESSIVE: Tone[] = ['happy', 'angry'];

/** 톤 전달도: does each reading sound the way it was meant (vs. the neutral readings)? */
export function ToneSection() {
  const clips = useSessionStore((s) => s.clips);
  const voice = useSessionStore((s) => s.voice);
  const specs = PROTOCOL.filter((c) => c.kind === 'speech' && clips[c.id]);
  const hasBaseline = specs.some((c) => c.intended === 'neutral' && voice[c.id]?.status === 'ok');

  const { results } = toneDelivery(specs.map((c) => ({ id: c.id, intended: c.intended as Tone, readTone: voice[c.id]?.readTone ?? null })));
  const expressive = toneDelivery(
    specs.filter((c) => EXPRESSIVE.includes(c.intended as Tone)).map((c) => ({ id: c.id, intended: c.intended as Tone, readTone: voice[c.id]?.readTone ?? null })),
  );

  return (
    <Section title="톤 전달도" subtitle="낭독에서 의도한 말투로 들릴 수 있는지 (내 담담한 낭독 기준)" muted={specs.length === 0}>
      {specs.length === 0 ? (
        <p className="text-sm text-slate-400">낭독 클립을 촬영하면 분석됩니다.</p>
      ) : !hasBaseline ? (
        <p className="text-sm text-slate-400">담담한 낭독(기준선)이 분석되면 말투를 비교합니다.</p>
      ) : (
        <>
          {expressive.judged > 0 && (
            <p className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">
                {expressive.matched}/{expressive.judged}
              </span>
              <span className="text-sm text-slate-300">기쁨·화남 낭독이 의도대로 들릴 수 있습니다</span>
            </p>
          )}
          <ul className="mt-3 flex flex-col divide-y divide-white/5">
            {results.map((r) => {
              const spec = specs.find((c) => c.id === r.id)!;
              return (
                <li key={r.id} className="flex items-start gap-3 py-2">
                  <span className="text-lg" aria-label={TONE_LABEL[r.intended].label}>
                    {TONE_LABEL[r.intended].icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{spec.sentence}</p>
                    <p className="text-xs text-slate-400">
                      의도: {HEARD_AS[r.intended]} ·{' '}
                      {r.readTone ? `${HEARD_AS[r.readTone]} 들릴 수 있습니다` : voice[r.id] ? '분석할 수 없음' : '분석 중…'}
                    </p>
                  </div>
                  <span className="pt-0.5 text-sm" aria-label={r.match === null ? '판정 없음' : r.match ? '일치' : '불일치'}>
                    {r.match === null ? '–' : r.match ? '✓' : '✗'}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Section>
  );
}
