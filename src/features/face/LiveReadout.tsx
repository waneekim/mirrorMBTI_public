import { EMOTIONS, topEmotion } from '../../lib/emotion-mapping';
import type { ClipSpec } from '../recording/protocol';
import { EMOTION_COLOR, EMOTION_LABEL } from './labels';
import type { LandmarkerStatus } from './landmarker';
import type { LiveRead } from './useFaceTracking';

interface Props {
  status: LandmarkerStatus;
  live: LiveRead;
  hasBaseline: boolean;
  framing: ClipSpec['framing'];
}

/** Bottom-of-preview overlay: how the current frame reads, never what the person "is". */
export function LiveReadout({ status, live, hasBaseline, framing }: Props) {
  const box = 'absolute inset-x-2 bottom-2 rounded-xl bg-slate-950/75 px-3 py-2 text-xs backdrop-blur';

  if (status === 'loading' || status === 'idle') return <div className={box}>표정 분석 모델을 불러오는 중…</div>;
  if (status === 'unavailable')
    return <div className={box}>이 기기에서는 표정 분석을 할 수 없습니다. 촬영은 계속할 수 있습니다 (분석 불가).</div>;
  if (!live.faceFound || !live.probs) return <div className={box}>얼굴을 안내선 안에 맞춰 주세요</div>;

  if (framing !== 'front') {
    const yaw = live.pose ? Math.round(live.pose.yaw) : null;
    const ok = yaw !== null && Math.abs(yaw) >= 50;
    return (
      <div className={box}>
        고개 회전 {yaw ?? '–'}° {ok ? '✓ 옆모습으로 인식됨' : '— 조금 더 돌려 주세요'}
      </div>
    );
  }

  const top = topEmotion(live.probs);
  return (
    <div className={box}>
      <p className="mb-1.5 font-medium">
        지금 <span className="text-white">{EMOTION_LABEL[top]}</span>으로 읽히는 중
        {!hasBaseline && <span className="ml-1 text-slate-400">(기준선 촬영 전 · 참고용)</span>}
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {EMOTIONS.map((e) => (
          <div key={e} className="flex flex-col items-center gap-0.5">
            <div className="flex h-8 w-full items-end overflow-hidden rounded bg-slate-800">
              <div className={`w-full ${EMOTION_COLOR[e]} transition-[height] duration-100`} style={{ height: `${live.probs![e] * 100}%` }} />
            </div>
            <span className={e === top ? 'text-white' : 'text-slate-400'}>{EMOTION_LABEL[e]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
