import { useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeBlob } from '../face/analyze-blob';
import { ClipFaceSummary } from '../face/ClipFaceSummary';
import { statusForSamples } from '../face/derive';
import { ClipPreview } from './ClipPreview';
import { clipRepo } from './db';
import { PROTOCOL, TONE_LABEL, type Tone } from './protocol';
import { useSessionStore } from './store';

export function ClipListPage() {
  const clips = useSessionStore((s) => s.clips);
  const face = useSessionStore((s) => s.face);
  const selfDone = useSessionStore((s) => s.self !== null);
  const saveFaceAnalysis = useSessionStore((s) => s.saveFaceAnalysis);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  async function reanalyze(id: string) {
    setAnalyzing(id);
    try {
      const clip = await clipRepo.get(id);
      if (!clip) return;
      const samples = await analyzeBlob(clip.blob).catch(() => null);
      await saveFaceAnalysis({
        id,
        status: samples ? statusForSamples(samples) : 'unavailable',
        durationMs: clip.durationMs,
        samples: samples ?? [],
        analyzedAt: new Date().toISOString(),
      });
    } finally {
      setAnalyzing(null);
    }
  }
  const done = PROTOCOL.filter((c) => clips[c.id]).length;

  const sections = [
    { title: '표정 세트', items: PROTOCOL.filter((c) => c.kind === 'expression') },
    { title: '낭독 세트', items: PROTOCOL.filter((c) => c.kind === 'speech') },
  ];

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">촬영 목록</h2>
        <span className="text-sm text-slate-400">
          {done} / {PROTOCOL.length}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-sky-500 transition-all" style={{ width: `${(done / PROTOCOL.length) * 100}%` }} />
      </div>

      {sections.map((sec) => (
        <section key={sec.title} className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-slate-400">{sec.title}</h3>
          <ul className="flex flex-col gap-2">
            {sec.items.map((c) => {
              const meta = clips[c.id];
              const tone = c.kind === 'speech' ? TONE_LABEL[c.intended as Tone] : null;
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-xl bg-slate-800/70 px-3 py-3">
                  <span className={`text-lg ${meta ? '' : 'opacity-30'}`} aria-label={meta ? '촬영됨' : '미촬영'}>
                    {meta ? '✅' : '⬜'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {tone && <span className="mr-1">{tone.icon}</span>}
                      {c.sentence ?? c.guide}
                    </p>
                    <p className="text-xs leading-snug text-slate-500">
                      {meta ? <ClipFaceSummary spec={c} result={face[c.id]} /> : '아직 촬영하지 않음'}
                    </p>
                  </div>
                  {meta && c.kind === 'expression' && (!face[c.id] || face[c.id].status === 'unavailable' || face[c.id].status === 'noface') && (
                    <button
                      type="button"
                      onClick={() => reanalyze(c.id)}
                      disabled={analyzing !== null}
                      className="rounded-full bg-slate-700 px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      {analyzing === c.id ? '분석 중' : '다시 분석'}
                    </button>
                  )}
                  {meta && (
                    <button type="button" onClick={() => setPreviewId(c.id)} className="rounded-full bg-slate-700 px-3 py-1.5 text-xs">
                      보기
                    </button>
                  )}
                  <Link to={`/studio?clip=${c.id}`} className="rounded-full bg-slate-700 px-3 py-1.5 text-xs">
                    {meta ? '재촬영' : '촬영'}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {done < PROTOCOL.length ? (
        <Link to="/studio" className="mt-6 block rounded-full bg-sky-500 py-3 text-center font-medium text-white">
          이어서 촬영하기
        </Link>
      ) : (
        <Link to={selfDone ? '/report' : '/survey'} className="mt-6 block rounded-full bg-sky-500 py-3 text-center font-medium text-white">
          {selfDone ? '리포트 보기' : '다음: 자기평가 설문'}
        </Link>
      )}

      {previewId && <ClipPreview id={previewId} onClose={() => setPreviewId(null)} />}
    </div>
  );
}
