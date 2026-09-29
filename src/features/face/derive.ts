import {
  aggregateClipEmotion,
  aggregateHeadPose,
  computeBaseline,
  detectGenuineSmile,
  type EmotionProbs,
  type FaceSample,
} from '../../lib/emotion-mapping';
import type { HeadPose } from '../../lib/head-pose';

export type FaceAnalysisStatus = 'ok' | 'noface' | 'unavailable';

/** Raw per-clip face series as stored in IndexedDB. */
export interface FaceAnalysis {
  id: string;
  status: FaceAnalysisStatus;
  durationMs: number;
  samples: FaceSample[];
  analyzedAt: string;
}

export interface FaceResult {
  status: FaceAnalysisStatus | 'awaiting-baseline';
  read: EmotionProbs | null;
  genuineSmile: boolean | null;
  headPose: HeadPose | null;
}

export const BASELINE_CLIP_ID = 'neutral';
export const SMILE_CLIP_ID = 'smile';
/** Fewer detected frames than this → treat as "face not found". */
export const MIN_FACE_SAMPLES = 5;

export function statusForSamples(samples: FaceSample[]): FaceAnalysisStatus {
  return samples.length >= MIN_FACE_SAMPLES ? 'ok' : 'noface';
}

/**
 * Recompute clip-level results from raw series. Every `read` is relative to the neutral clip
 * (CLAUDE.md §1.4), so all clips are recomputed whenever the neutral clip changes.
 */
export function deriveFaceResults(analyses: FaceAnalysis[]): Record<string, FaceResult> {
  const neutral = analyses.find((a) => a.id === BASELINE_CLIP_ID && a.status === 'ok');
  const baseline = neutral ? computeBaseline(neutral.samples, neutral.durationMs) : null;

  const out: Record<string, FaceResult> = {};
  for (const a of analyses) {
    if (a.status !== 'ok') {
      out[a.id] = { status: a.status, read: null, genuineSmile: null, headPose: null };
      continue;
    }
    const headPose = aggregateHeadPose(a.samples, a.durationMs);
    if (!baseline) {
      out[a.id] = { status: 'awaiting-baseline', read: null, genuineSmile: null, headPose };
      continue;
    }
    out[a.id] = {
      status: 'ok',
      read: aggregateClipEmotion(a.samples, a.durationMs, baseline),
      genuineSmile: a.id === SMILE_CLIP_ID ? detectGenuineSmile(a.samples, a.durationMs, baseline) : null,
      headPose,
    };
  }
  return out;
}
