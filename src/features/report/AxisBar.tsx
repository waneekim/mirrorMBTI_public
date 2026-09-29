import { AXIS_POLES, leanStrength, type Axis } from '../../lib/mbti-scoring';

const POLE_NAME: Record<string, string> = {
  E: '외향', I: '내향', S: '감각', N: '직관', T: '사고', F: '감정', J: '판단', P: '인식',
};

interface Props {
  axis: Axis;
  self: number;
  /** Panel impression on the same axis, when available. */
  other?: number | null;
}

/** Bipolar 0–100 track with a marker for self (and optionally the panel impression). */
export function AxisBar({ axis, self, other }: Props) {
  const [lo, hi] = AXIS_POLES[axis];
  const toward = self < 50 ? lo : self > 50 ? hi : null;
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className={self < 50 ? 'font-semibold text-white' : 'text-slate-400'}>
          {lo} {POLE_NAME[lo]}
        </span>
        <span className="text-slate-400">{toward ? `${toward} 쪽 ${Math.round(leanStrength(self))}%` : '균형'}</span>
        <span className={self > 50 ? 'font-semibold text-white' : 'text-slate-400'}>
          {POLE_NAME[hi]} {hi}
        </span>
      </div>
      <div className="relative mt-1.5 h-3 rounded-full bg-slate-800" role="img" aria-label={`${axis} 자기평가 ${Math.round(self)}${other != null ? `, 패널 인상 ${Math.round(other)}` : ''}`}>
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-600" />
        {other != null && (
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900 bg-[#d95926]"
            style={{ left: `${other}%` }}
            title={`패널 인상 ${Math.round(other)}`}
          />
        )}
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900 bg-[#3987e5]"
          style={{ left: `${self}%` }}
          title={`자기평가 ${Math.round(self)}`}
        />
      </div>
    </div>
  );
}
