import { create } from 'zustand';
import { computeBaseline, type Blendshapes } from '../../lib/emotion-mapping';
import { BASELINE_CLIP_ID, deriveFaceResults, type FaceAnalysis, type FaceResult } from '../face/derive';
import { clipRepo, type ClipMeta, type StoredClip } from './db';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

interface SessionState {
  loadState: LoadState;
  clips: Record<string, ClipMeta>;
  /** Derived face results per clip id. */
  face: Record<string, FaceResult>;
  /** Personal baseline from the neutral clip, used by the live overlay. */
  baseline: Blendshapes | null;
  hydrate: () => Promise<void>;
  saveClip: (clip: StoredClip) => Promise<void>;
  saveFaceAnalysis: (analysis: FaceAnalysis) => Promise<void>;
  deleteSession: () => Promise<void>;
}

/** Recompute every clip's result (the baseline may have changed) and persist it. */
async function refreshFace(): Promise<Pick<SessionState, 'face' | 'baseline'>> {
  const analyses = await clipRepo.listFaceAnalyses();
  const face = deriveFaceResults(analyses);
  await clipRepo.saveFaceResults(face);
  const neutral = analyses.find((a) => a.id === BASELINE_CLIP_ID && a.status === 'ok');
  return { face, baseline: neutral ? computeBaseline(neutral.samples, neutral.durationMs) : null };
}

export const useSessionStore = create<SessionState>((set) => ({
  loadState: 'idle',
  clips: {},
  face: {},
  baseline: null,

  async hydrate() {
    set({ loadState: 'loading' });
    try {
      const metas = await clipRepo.listMeta();
      set({ clips: Object.fromEntries(metas.map((m) => [m.id, m])), ...(await refreshFace()), loadState: 'ready' });
    } catch (err) {
      console.error('Failed to restore clips from IndexedDB', err);
      set({ loadState: 'error' });
    }
  },

  async saveClip(clip) {
    await clipRepo.save(clip);
    const { blob: _blob, ...meta } = clip;
    set((s) => ({ clips: { ...s.clips, [meta.id]: meta } }));
  },

  async saveFaceAnalysis(analysis) {
    await clipRepo.saveFaceAnalysis(analysis);
    set(await refreshFace());
  },

  async deleteSession() {
    await clipRepo.clearAll();
    set({ clips: {}, face: {}, baseline: null });
  },
}));
