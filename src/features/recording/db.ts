import Dexie, { type Table } from 'dexie';
import type { FaceAnalysis, FaceResult } from '../face/derive';
import type { VoiceAnalysis, VoiceResult } from '../voice/derive';
import type { ClipKind, Intended } from './protocol';

export interface StoredClip {
  id: string;
  kind: ClipKind;
  intended: Intended;
  sentence?: string;
  recordedAt: string;
  mimeType: string;
  durationMs: number;
  blob: Blob;
  /** Small JPEG frame from mid-clip for the report. */
  thumb?: Blob;
}

export type ClipMeta = Omit<StoredClip, 'blob'>;

/** Raw prosody features plus the derived tone (`voice.readTone`). */
export interface StoredVoiceAnalysis extends VoiceAnalysis {
  result?: VoiceResult;
}

export interface StoredSurvey {
  id: 'self';
  answers: Record<string, number>;
  updatedAt: string;
}

/** Raw face series plus the derived clip results (`read`, `genuineSmile`, `headPose`). */
export interface StoredFaceAnalysis extends FaceAnalysis {
  result?: FaceResult;
}

export class MirrorDB extends Dexie {
  clips!: Table<StoredClip, string>;
  faceAnalyses!: Table<StoredFaceAnalysis, string>;
  survey!: Table<StoredSurvey, string>;
  voiceAnalyses!: Table<StoredVoiceAnalysis, string>;

  constructor(name = 'mirror-mbti') {
    super(name);
    this.version(1).stores({ clips: 'id, kind, recordedAt' });
    this.version(2).stores({ faceAnalyses: 'id' });
    this.version(3).stores({ survey: 'id' });
    this.version(4).stores({ voiceAnalyses: 'id' });
  }
}

export function createClipRepository(db: MirrorDB) {
  return {
    /** Insert or replace (retake) a clip. */
    save(clip: StoredClip): Promise<string> {
      return db.clips.put(clip);
    },
    get(id: string): Promise<StoredClip | undefined> {
      return db.clips.get(id);
    },
    /** Metadata only — blobs stay in IndexedDB until a preview asks for one. */
    async listMeta(): Promise<ClipMeta[]> {
      const all = await db.clips.toArray();
      return all.map(({ blob: _blob, ...meta }) => meta);
    },
    remove(id: string): Promise<void> {
      return db.clips.delete(id);
    },
    clearAll(): Promise<void> {
      return db.transaction('rw', [db.clips, db.faceAnalyses, db.voiceAnalyses, db.survey], async () => {
        await db.clips.clear();
        await db.faceAnalyses.clear();
        await db.voiceAnalyses.clear();
        await db.survey.clear();
      });
    },
    saveVoiceAnalysis(a: StoredVoiceAnalysis): Promise<string> {
      return db.voiceAnalyses.put(a);
    },
    listVoiceAnalyses(): Promise<StoredVoiceAnalysis[]> {
      return db.voiceAnalyses.toArray();
    },
    async saveVoiceResults(results: Record<string, VoiceResult>): Promise<void> {
      await db.transaction('rw', db.voiceAnalyses, async () => {
        for (const [id, result] of Object.entries(results)) await db.voiceAnalyses.update(id, { result });
      });
    },
    async getSurveyAnswers(): Promise<Record<string, number>> {
      return (await db.survey.get('self'))?.answers ?? {};
    },
    saveSurveyAnswers(answers: Record<string, number>): Promise<string> {
      return db.survey.put({ id: 'self', answers, updatedAt: new Date().toISOString() });
    },
    saveFaceAnalysis(a: StoredFaceAnalysis): Promise<string> {
      return db.faceAnalyses.put(a);
    },
    listFaceAnalyses(): Promise<StoredFaceAnalysis[]> {
      return db.faceAnalyses.toArray();
    },
    /** Persist derived results next to the raw series. */
    async saveFaceResults(results: Record<string, FaceResult>): Promise<void> {
      await db.transaction('rw', db.faceAnalyses, async () => {
        for (const [id, result] of Object.entries(results)) await db.faceAnalyses.update(id, { result });
      });
    },
  };
}

export type ClipRepository = ReturnType<typeof createClipRepository>;

export const db = new MirrorDB();
export const clipRepo = createClipRepository(db);
