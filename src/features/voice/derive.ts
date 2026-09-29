import {
  computeVoiceBaseline,
  isFlat,
  judgeTone,
  zScores,
  type Tone,
  type VoiceFeatures,
} from '../../lib/prosody';

export type VoiceAnalysisStatus = 'ok' | 'silent' | 'unavailable';

/** Raw per-clip features as stored in IndexedDB. */
export interface VoiceAnalysis {
  id: string;
  status: VoiceAnalysisStatus;
  features: VoiceFeatures | null;
  analyzedAt: string;
}

export interface VoiceResult {
  status: VoiceAnalysisStatus | 'awaiting-baseline';
  features: VoiceFeatures | null;
  readTone: Tone | null;
  /** All z-scores within ±0.5 of the neutral readings. */
  flat: boolean | null;
}

export const NEUTRAL_SPEECH_IDS = ['speech_a_neutral', 'speech_b_neutral'];

export function statusForFeatures(f: VoiceFeatures): VoiceAnalysisStatus {
  return f.rmsMean > 0 ? 'ok' : 'silent';
}

/** Tone for every speech clip relative to the neutral readings (CLAUDE.md §1.4, §6). */
export function deriveVoiceResults(analyses: VoiceAnalysis[]): Record<string, VoiceResult> {
  const neutral = analyses.filter((a) => NEUTRAL_SPEECH_IDS.includes(a.id) && a.status === 'ok').map((a) => a.features!);
  const baseline = computeVoiceBaseline(neutral);
  const out: Record<string, VoiceResult> = {};
  for (const a of analyses) {
    if (a.status !== 'ok' || !a.features) {
      out[a.id] = { status: a.status, features: a.features, readTone: null, flat: null };
    } else if (!baseline) {
      out[a.id] = { status: 'awaiting-baseline', features: a.features, readTone: null, flat: null };
    } else {
      const z = zScores(a.features, baseline);
      out[a.id] = { status: 'ok', features: a.features, readTone: judgeTone(z), flat: isFlat(z) };
    }
  }
  return out;
}
