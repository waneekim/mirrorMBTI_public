import { topEmotion, type Emotion } from '../../lib/emotion-mapping';
import type { ClipSpec } from '../recording/protocol';
import type { FaceResult } from './derive';
import { EMOTION_LABEL } from './labels';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** One-line analysis result for a clip in the list. */
export function ClipFaceSummary({ spec, result }: { spec: ClipSpec; result: FaceResult | undefined }) {
  if (!result) return null;
  if (result.status === 'unavailable') return <span className="text-slate-500">분석 불가</span>;
  if (result.status === 'noface') return <span className="text-amber-400">얼굴이 잘 보이지 않았습니다</span>;

  if (spec.framing !== 'front') {
    const yaw = result.headPose?.yaw;
    if (yaw === undefined) return <span className="text-amber-400">옆모습을 인식하지 못했습니다</span>;
    return <span className={Math.abs(yaw) >= 50 ? 'text-emerald-400' : 'text-amber-400'}>고개 회전 {Math.round(yaw)}°</span>;
  }
  if (result.status === 'awaiting-baseline') return <span className="text-slate-500">무표정 기준선 촬영 후 분석됩니다</span>;
  if (!result.read) return null;

  const top = topEmotion(result.read);
  const intended = spec.kind === 'expression' && spec.intended !== 'n/a' ? (spec.intended as Emotion) : null;
  return (
    <span className="text-slate-300">
      {EMOTION_LABEL[top]}으로 읽힘 {pct(result.read[top])}
      {intended && intended !== top && ` · 의도(${EMOTION_LABEL[intended]}) ${pct(result.read[intended])}`}
      {result.genuineSmile !== null && ` · 눈가 웃음 ${result.genuineSmile ? '있음' : '약함'}`}
    </span>
  );
}
