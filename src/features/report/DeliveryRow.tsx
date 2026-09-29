import type { EmotionProbs } from '../../lib/emotion-mapping';
import type { Delivery } from '../../lib/gap-metrics';
import { EMOTION_DISPLAY_ORDER, EMOTION_HEX, EMOTION_LABEL } from '../face/labels';
import { useBlobUrl } from './useBlobUrl';

const pct = (x: number) => Math.round(x * 100);

/** One expression clip: thumbnail, intended vs read, full distribution as a 100% bar. */
export function DeliveryRow({ d, read, thumb }: { d: Delivery; read: EmotionProbs | null; thumb?: Blob }) {
  const url = useBlobUrl(thumb);
  return (
    <li className="flex gap-3">
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-800">
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">의도: {EMOTION_LABEL[d.intended]}</p>
          <p className="text-sm tabular-nums text-slate-200">{d.value === null ? '–' : `${pct(d.value)}%`}</p>
        </div>
        {d.value === null || !read ? (
          <p className="mt-1 text-xs text-slate-500">분석 결과가 없습니다</p>
        ) : (
          <>
            <div className="mt-1.5 flex h-2.5 gap-[2px] overflow-hidden rounded" role="img" aria-label={EMOTION_DISPLAY_ORDER.map((e) => `${EMOTION_LABEL[e]} ${pct(read[e])}%`).join(', ')}>
              {EMOTION_DISPLAY_ORDER.filter((e) => read[e] >= 0.005).map((e) => (
                <div key={e} style={{ flexGrow: read[e], background: EMOTION_HEX[e] }} title={`${EMOTION_LABEL[e]} ${pct(read[e])}%`} />
              ))}
            </div>
            <p className="mt-1 text-xs leading-snug text-slate-400">
              {d.readAs === d.intended
                ? `${EMOTION_LABEL[d.intended]}으로 읽힐 수 있습니다`
                : `${EMOTION_LABEL[d.readAs!]}으로 더 읽힐 수 있습니다 (${pct(read[d.readAs!])}%)`}
            </p>
          </>
        )}
      </div>
    </li>
  );
}
