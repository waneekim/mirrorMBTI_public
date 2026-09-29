import { Link, useSearchParams } from 'react-router-dom';
import { axisGap, expressionDelivery, misreadRisk, type MisreadRisk } from '../../lib/gap-metrics';
import { AXES, typeString, type Axes } from '../../lib/mbti-scoring';
import { EMOTION_DISPLAY_ORDER, EMOTION_HEX, EMOTION_LABEL } from '../face/labels';
import { PROTOCOL } from '../recording/protocol';
import { useSessionStore } from '../recording/store';
import { SURVEY_ITEMS } from '../survey/items.ko';
import { AxisBar } from './AxisBar';
import { DeliveryRow } from './DeliveryRow';
import { Section } from './Section';

/** `?impression=40,45,55,50` injects example panel values to preview the gap section. */
function parseMockImpression(raw: string | null): Axes | null {
  if (!raw) return null;
  const n = raw.split(',').map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x) || x < 0 || x > 100)) return null;
  return { EI: n[0], SN: n[1], TF: n[2], JP: n[3] };
}

/** Below this, the neutral face is not described as reading as any emotion. */
const MISREAD_MENTION = 0.1;

function riskLevel(p: number): { label: string; icon: string } {
  if (p >= 0.4) return { label: '높음', icon: '⚠️' };
  if (p >= 0.2) return { label: '보통', icon: '•' };
  return { label: '낮음', icon: '✓' };
}

function MisreadCard({ risk }: { risk: MisreadRisk | null }) {
  if (!risk) return <p className="text-sm text-slate-500">무표정 클립을 촬영하면 계산됩니다.</p>;
  const level = riskLevel(risk.probability);
  return (
    <div>
      <p className="text-sm leading-relaxed">
        {risk.probability >= MISREAD_MENTION ? (
          <>
            아무 표정을 짓지 않았을 때, <strong>{EMOTION_LABEL[risk.emotion]}</strong>으로 읽힐 수 있습니다.
          </>
        ) : (
          '아무 표정을 짓지 않았을 때, 다른 감정으로 읽힐 가능성은 낮습니다.'
        )}
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">{Math.round(risk.probability * 100)}%</span>
        <span className="text-sm text-slate-300">
          {level.icon} 오해 가능성 {level.label}
        </span>
      </p>
    </div>
  );
}

export function ReportPage() {
  const clips = useSessionStore((s) => s.clips);
  const face = useSessionStore((s) => s.face);
  const self = useSessionStore((s) => s.self);
  const answered = useSessionStore((s) => Object.keys(s.answers).length);
  const [params] = useSearchParams();
  const impression = parseMockImpression(params.get('impression'));

  const expressionSpecs = PROTOCOL.filter((c) => c.kind === 'expression' && clips[c.id]);
  const deliveries = expressionDelivery(expressionSpecs.map((c) => ({ id: c.id, intended: c.intended, read: face[c.id]?.read ?? null })));
  const risk = misreadRisk(face.neutral?.read ?? null);
  const smile = face.smile?.genuineSmile ?? null;
  const speechCount = PROTOCOL.filter((c) => c.kind === 'speech' && clips[c.id]).length;
  const gap = axisGap(self, impression);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-4">
      <div>
        <h2 className="text-lg font-semibold">나의 리포트</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          이 리포트는 성격을 판정하지 않습니다. 표정이 다른 사람에게 <em>어떻게 읽힐 수 있는지</em>와, 스스로 생각하는 나의 성향을 나란히
          보여 줍니다. 모든 분석은 이 기기 안에서 이루어졌습니다.
        </p>
      </div>

      <Section title="표현 전달도" subtitle="의도한 표정이 그 감정으로 읽힐 확률 (내 무표정 기준)">
        {deliveries.length === 0 ? (
          <p className="text-sm text-slate-500">
            아직 촬영한 표정이 없습니다.{' '}
            <Link to="/studio" className="text-sky-400 underline">
              촬영하러 가기
            </Link>
          </p>
        ) : (
          <>
            <ul className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400" aria-label="범례">
              {EMOTION_DISPLAY_ORDER.map((e) => (
                <li key={e} className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: EMOTION_HEX[e] }} />
                  {EMOTION_LABEL[e]}
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-4">
              {deliveries.map((d) => (
                <DeliveryRow key={d.id} d={d} read={face[d.id]?.read ?? null} thumb={clips[d.id]?.thumb} />
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title="오해 위험" subtitle="무표정일 때 가장 강하게 읽히는 다른 감정">
        <MisreadCard risk={risk} />
        {smile !== null && (
          <p className="mt-3 border-t border-white/5 pt-3 text-sm leading-relaxed text-slate-300">
            {smile
              ? '웃을 때 눈가도 함께 움직여, 자연스러운 웃음으로 읽힐 수 있습니다.'
              : '웃을 때 입꼬리 위주로 움직여, 의례적인 웃음으로 읽힐 수 있습니다.'}
          </p>
        )}
      </Section>

      <Section title="톤 전달도" subtitle="낭독에서 의도한 말투가 그대로 전달되는지" muted>
        <p className="text-sm text-slate-400">음성 분석은 준비 중입니다. 촬영한 낭독 클립 {speechCount}/6개는 분석이 준비되면 자동으로 반영됩니다.</p>
      </Section>

      <Section title="스스로 생각하는 나" subtitle="자기평가 설문 결과 (공식 MBTI 검사가 아닙니다)">
        {self ? (
          <>
            <p className="text-3xl font-bold tracking-widest">{typeString(self)}</p>
            <div className="mt-4 flex flex-col gap-4">
              {AXES.map((a) => (
                <AxisBar key={a} axis={a} self={self[a]} other={impression?.[a]} />
              ))}
            </div>
            {impression && (
              <ul className="mt-3 flex gap-4 text-[11px] text-slate-400">
                <li className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#3987e5]" />
                  자기평가
                </li>
                <li className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#d95926]" />
                  패널 인상
                </li>
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">
            설문 {answered}/{SURVEY_ITEMS.length} 완료.{' '}
            <Link to="/survey" className="text-sky-400 underline">
              {answered === 0 ? '설문 시작하기' : '이어서 답하기'}
            </Link>
          </p>
        )}
      </Section>

      <Section
        title="타인에게 읽히는 나"
        subtitle={impression ? '패널 인상 점수와의 차이 (예시 값)' : '킬 패널 결과 대기 중'}
        muted={!gap}
      >
        {gap ? (
          <>
            <p className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">{Math.round(gap.objectivityIndex)}</span>
              <span className="text-sm text-slate-300">객관화 지수 (100 = 자기평가와 인상이 일치)</span>
            </p>
            <table className="mt-3 w-full text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="py-1 text-left font-normal">축</th>
                  <th className="py-1 text-right font-normal">자기평가</th>
                  <th className="py-1 text-right font-normal">패널 인상</th>
                  <th className="py-1 text-right font-normal">차이</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {AXES.map((a) => (
                  <tr key={a} className="border-t border-white/5">
                    <td className="py-1.5">{a}</td>
                    <td className="py-1.5 text-right">{Math.round(self![a])}</td>
                    <td className="py-1.5 text-right">{Math.round(impression![a])}</td>
                    <td className="py-1.5 text-right">{Math.round(gap.axes[a])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div aria-disabled className="space-y-2">
            <p className="text-sm text-slate-400">
              다른 사람(페르소나 패널)이 평가한 인상 점수가 도착하면 축별 괴리와 객관화 지수가 여기에 표시됩니다.
            </p>
            <div className="grid grid-cols-4 gap-2 text-center text-xs text-slate-500">
              {AXES.map((a) => (
                <div key={a} className="rounded-lg bg-slate-800 py-2">
                  {a}
                  <br />–
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="인상 서술" subtitle="AI 관찰자가 서술한 첫인상" muted>
        <p className="text-sm text-slate-400">서술 없음 — 준비 중입니다. 준비되면 위의 수치와 나란히 표시됩니다.</p>
      </Section>
    </div>
  );
}
