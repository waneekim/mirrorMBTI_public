import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from './store';

/** Always reachable from the header (CLAUDE.md §1.2: session delete within one tap). */
export function DeleteSessionButton() {
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await deleteSession();
      setOpen(false);
      navigate('/');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-red-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500">
        세션 삭제
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" role="alertdialog" aria-modal>
          <div className="w-full max-w-sm rounded-2xl bg-slate-800 p-5">
            <h2 className="text-lg font-semibold">세션을 삭제할까요?</h2>
            <p className="mt-2 text-sm text-slate-300">이 기기에 저장된 모든 영상·음성 클립과 분석 결과가 즉시 삭제되며 되돌릴 수 없습니다.</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-full bg-slate-700 py-3 text-sm font-medium">
                취소
              </button>
              <button type="button" onClick={confirm} disabled={busy} className="flex-1 rounded-full bg-red-600 py-3 text-sm font-medium text-white disabled:opacity-50">
                모두 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
