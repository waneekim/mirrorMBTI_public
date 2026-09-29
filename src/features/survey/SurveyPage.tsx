import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../recording/store';
import { LIKERT, SURVEY_ITEMS } from './items.ko';

const PAGE_SIZE = 8;
const PAGES = Math.ceil(SURVEY_ITEMS.length / PAGE_SIZE);

export function SurveyPage() {
  const answers = useSessionStore((s) => s.answers);
  const setAnswer = useSessionStore((s) => s.setAnswer);
  const navigate = useNavigate();
  const answered = SURVEY_ITEMS.filter((it) => answers[it.id] !== undefined).length;

  // Resume on the first page that still has an unanswered item.
  const [page, setPage] = useState(() => {
    const first = SURVEY_ITEMS.findIndex((it) => answers[it.id] === undefined);
    return first < 0 ? PAGES - 1 : Math.floor(first / PAGE_SIZE);
  });
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const items = SURVEY_ITEMS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageDone = items.every((it) => answers[it.id] !== undefined);
  const isLast = page === PAGES - 1;

  useEffect(() => window.scrollTo({ top: 0 }), [page]);

  function answer(id: string, value: number) {
    void setAnswer(id, value);
    const idx = items.findIndex((it) => it.id === id);
    const next = items.slice(idx + 1).find((it) => answers[it.id] === undefined);
    if (next) itemRefs.current[next.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">나를 스스로 평가하기</h2>
        <span className="text-sm text-slate-400">
          {answered} / {SURVEY_ITEMS.length}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-sky-500 transition-all" style={{ width: `${(answered / SURVEY_ITEMS.length) * 100}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-400">
        정답은 없습니다. 평소의 나에게 가까운 쪽을 고르세요. 이 설문은 공식 MBTI 검사가 아니며, 스스로 생각하는 나의 성향을 4가지 축으로
        표시합니다.
      </p>

      <ol className="mt-4 flex flex-col gap-3">
        {items.map((it, i) => (
          <li
            key={it.id}
            ref={(el) => {
              itemRefs.current[it.id] = el;
            }}
            className="rounded-2xl bg-slate-800/70 p-4"
          >
            <p className="text-sm text-slate-500">{page * PAGE_SIZE + i + 1}.</p>
            <p className="mt-1 font-medium leading-snug">{it.text}</p>
            <div className="mt-3 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={it.text}>
              {LIKERT.map((l) => {
                const selected = answers[it.id] === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={l.label}
                    onClick={() => answer(it.id, l.value)}
                    className={`h-11 rounded-xl text-sm font-medium transition-colors ${
                      selected ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300 active:bg-slate-600'
                    }`}
                  >
                    {l.value}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>{LIKERT[0].label}</span>
              <span>{LIKERT[4].label}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex gap-3">
        {page > 0 && (
          <button type="button" onClick={() => setPage(page - 1)} className="rounded-full bg-slate-700 px-5 py-3 text-sm font-medium">
            이전
          </button>
        )}
        <button
          type="button"
          disabled={!pageDone}
          onClick={() => (isLast ? navigate('/report') : setPage(page + 1))}
          className="flex-1 rounded-full bg-sky-500 py-3 font-medium text-white disabled:opacity-40"
        >
          {isLast ? '리포트 보기' : `다음 (${page + 1}/${PAGES})`}
        </button>
      </div>
    </div>
  );
}
