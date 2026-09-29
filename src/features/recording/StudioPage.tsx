import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { statusForSamples } from '../face/derive';
import { LiveReadout } from '../face/LiveReadout';
import { useFaceTracking } from '../face/useFaceTracking';
import { FaceFrame } from './FaceFrame';
import { GuideCard, type RecordPhase } from './GuideCard';
import { PermissionGate } from './PermissionGate';
import { CLIP_DURATION_MS, COUNTDOWN_SECONDS, getClipSpec, nextPendingAfter, nextPendingClip, PROTOCOL } from './protocol';
import { recordClip } from './recorder';
import { useSessionStore } from './store';
import { useMediaStream } from './useMediaStream';
import { useWakeLock } from './useWakeLock';

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('aborted', 'AbortError'));
    });
  });

export function StudioPage() {
  const clips = useSessionStore((s) => s.clips);
  const saveClip = useSessionStore((s) => s.saveClip);
  const saveFaceAnalysis = useSessionStore((s) => s.saveFaceAnalysis);
  const baseline = useSessionStore((s) => s.baseline);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { status, stream, request } = useMediaStream();

  const [phase, setPhase] = useState<RecordPhase>('ready');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const face = useFaceTracking(videoRef, status === 'granted', baseline);
  useWakeLock(true);

  const retakeId = params.get('clip');
  const spec = (retakeId && getClipSpec(retakeId)) || nextPendingClip(Object.keys(clips));

  useEffect(() => {
    void request();
    return () => abortRef.current?.abort();
  }, [request]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream, status]);

  if (!spec) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-5xl" aria-hidden>
          ✅
        </p>
        <h2 className="mt-4 text-xl font-semibold">13개 클립을 모두 촬영했습니다</h2>
        <p className="mt-2 text-sm text-slate-300">촬영 목록에서 미리 보거나 다시 찍을 수 있습니다.</p>
        <Link to="/clips" className="mt-6 inline-block rounded-full bg-sky-500 px-6 py-3 font-medium text-white">
          촬영 목록 보기
        </Link>
      </div>
    );
  }

  const index = PROTOCOL.findIndex((c) => c.id === spec.id);
  const busy = phase !== 'ready';

  async function start() {
    if (!stream || !spec || busy) return;
    const ctrl = new AbortController();
    let samples: ReturnType<typeof face.stopCollect> = null;
    abortRef.current = ctrl;
    setError(null);
    try {
      setPhase('countdown');
      for (let n = COUNTDOWN_SECONDS; n > 0; n--) {
        setCountdown(n);
        await sleep(1000, ctrl.signal);
      }
      setPhase('recording');
      face.startCollect();
      const media = await recordClip(stream, CLIP_DURATION_MS, ctrl.signal).finally(() => (samples = face.stopCollect()));
      setPhase('saving');
      await saveClip({
        id: spec.id,
        kind: spec.kind,
        intended: spec.intended,
        ...(spec.sentence ? { sentence: spec.sentence } : {}),
        recordedAt: new Date().toISOString(),
        ...media,
      });
      // Face series sampled at 10 fps during recording; results are derived against the neutral baseline.
      await saveFaceAnalysis({
        id: spec.id,
        status: samples ? statusForSamples(samples) : 'unavailable',
        durationMs: media.durationMs,
        samples: samples ?? [],
        analyzedAt: new Date().toISOString(),
      });
      setPhase('ready');
      if (retakeId) {
        navigate('/clips');
        return;
      }
      // Store update advances `spec` to the next pending clip; leave once everything is recorded.
      if (!nextPendingAfter(spec.id, [...Object.keys(clips), spec.id])) navigate('/clips');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error(err);
      setError('녹화에 실패했습니다. 다시 시도해 주세요.');
      setPhase('ready');
    }
  }

  return (
    <PermissionGate status={status} onRequest={request}>
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-4">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black sm:aspect-video">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
          <FaceFrame framing={spec.framing} />
          <LiveReadout status={face.status} live={face.live} hasBaseline={baseline !== null} framing={spec.framing} />
          {phase === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center text-8xl font-bold text-white drop-shadow-lg">
              {countdown}
            </div>
          )}
          {phase === 'recording' && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-sm font-medium">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC
            </div>
          )}
        </div>

        <GuideCard spec={spec} index={index} total={PROTOCOL.length} phase={phase} countdown={countdown} />

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={start}
            disabled={busy || !stream}
            className="flex-1 rounded-full bg-sky-500 py-3 font-medium text-white disabled:opacity-40"
          >
            {clips[spec.id] ? '다시 촬영' : '촬영 시작'}
          </button>
          <Link to="/clips" className="rounded-full bg-slate-700 px-5 py-3 text-sm font-medium">
            목록
          </Link>
        </div>
      </div>
    </PermissionGate>
  );
}
