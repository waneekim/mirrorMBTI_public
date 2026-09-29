import { create } from 'zustand';
import { computeBaseline, type Blendshapes } from '../../lib/emotion-mapping';
import { scoreSurvey, type Axes } from '../../lib/mbti-scoring';
import { SURVEY_ITEMS } from '../survey/items.ko';
import { BASELINE_CLIP_ID, deriveFaceResults, type FaceAnalysis, type FaceResult } from '../face/derive';
import { analyzeVoiceBlob } from '../voice/analyze';
import { deriveVoiceResults, type VoiceResult } from '../voice/derive';
import { clipRepo, type ClipMeta, type StoredClip } from './db';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

interface SessionState {
  loadState: LoadState;
  clips: Record<string, ClipMeta>;
  /** Derived face results per clip id. */
  face: Record<string, FaceResult>;
  /** Personal baseline from the neutral clip, used by the live overlay. */
  baseline: Blendshapes | null;
  /** Derived voice results per speech clip id. */
  voice: Record<string, VoiceResult>;
  /** Likert answers by item id. */
  answers: Record<string, number>;
  /** Self-assessed axes; null until all 32 items are answered. */
  self: Axes | null;
  setAnswer: (itemId: string, value: number) => Promise<void>;
  hydrate: () => Promise<void>;
  saveClip: (clip: StoredClip) => Promise<void>;
  saveFaceAnalysis: (analysis: FaceAnalysis) => Promise<void>;
  /** Decode a speech clip's audio, extract prosody, and re-judge every tone. */
  analyzeVoice: (clipId: string) => Promise<void>;
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

/** Re-judge every tone (the neutral readings may have changed) and persist it. */
async function refreshVoice(): Promise<Pick<SessionState, 'voice'>> {
  const voice = deriveVoiceResults(await clipRepo.listVoiceAnalyses());
  await clipRepo.saveVoiceResults(voice);
  return { voice };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  loadState: 'idle',
  clips: {},
  face: {},
  baseline: null,
  voice: {},
  answers: {},
  self: null,

  async hydrate() {
    set({ loadState: 'loading' });
    try {
      const metas = await clipRepo.listMeta();
      const answers = await clipRepo.getSurveyAnswers();
      set({
        clips: Object.fromEntries(metas.map((m) => [m.id, m])),
        ...(await refreshFace()),
        ...(await refreshVoice()),
        answers,
        self: scoreSurvey(SURVEY_ITEMS, answers),
        loadState: 'ready',
      });
      // Backfill speech clips recorded before voice analysis existed (or interrupted mid-analysis).
      const pending = metas.filter((m) => m.kind === 'speech' && !get().voice[m.id]).map((m) => m.id);
      void (async () => {
        for (const id of pending) await get().analyzeVoice(id);
      })().catch((err) => console.warn('Voice backfill failed', err));
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

  async analyzeVoice(clipId) {
    const clip = await clipRepo.get(clipId);
    if (!clip || clip.kind !== 'speech') return;
    await clipRepo.saveVoiceAnalysis(await analyzeVoiceBlob(clipId, clip.blob));
    set(await refreshVoice());
  },

  async setAnswer(itemId, value) {
    const answers = { ...get().answers, [itemId]: value };
    set({ answers, self: scoreSurvey(SURVEY_ITEMS, answers) });
    await clipRepo.saveSurveyAnswers(answers);
  },

  async deleteSession() {
    await clipRepo.clearAll();
    set({ clips: {}, face: {}, baseline: null, voice: {}, answers: {}, self: null });
  },
}));
