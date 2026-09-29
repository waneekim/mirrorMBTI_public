import { useEffect, useState } from 'react';
import { clipRepo } from './db';

/** Loads a clip blob from IndexedDB on demand and plays it (unmirrored, as recorded). */
export function ClipPreview({ id, onClose }: { id: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    clipRepo.get(id).then((clip) => {
      if (cancelled) return;
      if (!clip) return setMissing(true);
      objectUrl = URL.createObjectURL(clip.blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {missing ? (
          <p className="text-center text-slate-300">클립을 찾을 수 없습니다.</p>
        ) : url ? (
          <video src={url} controls autoPlay playsInline className="w-full rounded-xl bg-black" />
        ) : (
          <p className="text-center text-slate-300">불러오는 중…</p>
        )}
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-full bg-slate-700 py-3 font-medium">
          닫기
        </button>
      </div>
    </div>
  );
}
