import { Link } from 'react-router-dom';
import { PROTOCOL } from '../features/recording/protocol';
import { useSessionStore } from '../features/recording/store';
import { SURVEY_ITEMS } from '../features/survey/items.ko';

export function HomePage() {
  const clipCount = useSessionStore((s) => Object.keys(s.clips).length);
  const answered = useSessionStore((s) => Object.keys(s.answers).length);
  const steps = [
    { to: '/studio', title: '표정·말투 촬영', detail: `클립 ${clipCount}/${PROTOCOL.length}`, done: clipCount === PROTOCOL.length },
    { to: '/survey', title: '자기평가 설문', detail: `${answered}/${SURVEY_ITEMS.length}문항`, done: answered === SURVEY_ITEMS.length },
    { to: '/report', title: '리포트 보기', detail: '읽히는 나 vs 생각하는 나', done: false },
  ];
  const next = steps.find((s) => !s.done) ?? steps[2];

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-bold leading-snug">
        내가 생각하는 나와
        <br />
        타인에게 읽히는 나
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        표정 7개와 짧은 문장 낭독 6개를 촬영하고 32문항 설문에 답하면, 스스로 생각하는 성향과 표정이 다른 사람에게 어떻게 읽힐 수
        있는지를 나란히 보여 줍니다. 이 앱은 성격을 판정하지 않습니다.
      </p>

      <ol className="mt-6 flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={s.to}>
            <Link to={s.to} className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 ring-1 ring-white/5">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${s.done ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                {s.done ? '✓' : i + 1}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium">{s.title}</span>
                <span className="block text-xs text-slate-400">{s.detail}</span>
              </span>
              <span className="text-slate-500" aria-hidden>
                ›
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <Link to={next.to} className="mt-6 block rounded-full bg-sky-500 py-3 text-center font-medium text-white">
        {next.title} {clipCount + answered === 0 ? '시작하기' : '이어서 하기'}
      </Link>

      <ul className="mt-6 space-y-1.5 text-xs text-slate-400">
        <li>🔒 영상·음성·답변은 이 기기 안에만 저장되며 서버로 전송되지 않습니다.</li>
        <li>🗑️ 상단 "삭제" 버튼으로 언제든 모두 지울 수 있습니다.</li>
      </ul>
    </div>
  );
}
