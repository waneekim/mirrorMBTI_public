import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { USED_BLENDSHAPES, type Blendshapes } from '../../lib/emotion-mapping';
import { headPoseFromMatrix, type HeadPose } from '../../lib/head-pose';

export type LandmarkerStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

const BASE = import.meta.env.BASE_URL;
const USED = new Set<string>(USED_BLENDSHAPES);

let instance: FaceLandmarker | null = null;
let loading: Promise<FaceLandmarker | null> | null = null;
let status: LandmarkerStatus = 'idle';
let lastTs = 0;
const listeners = new Set<(s: LandmarkerStatus) => void>();

function setStatus(s: LandmarkerStatus) {
  status = s;
  listeners.forEach((l) => l(s));
}

export function getLandmarkerStatus() {
  return status;
}

export function subscribeLandmarkerStatus(fn: (s: LandmarkerStatus) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Lazily load FaceLandmarker from same-origin assets (public/mediapipe/).
 * Never throws: on any failure resolves to null and status becomes 'unavailable'.
 */
export function loadLandmarker(): Promise<FaceLandmarker | null> {
  if (instance) return Promise.resolve(instance);
  if (loading) return loading;
  setStatus('loading');
  loading = (async () => {
    try {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(`${BASE}mediapipe/wasm`);
      const create = (delegate: 'GPU' | 'CPU') =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: `${BASE}mediapipe/face_landmarker.task`, delegate },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
      instance = await create('GPU').catch(() => create('CPU'));
      setStatus('ready');
      return instance;
    } catch (err) {
      console.warn('FaceLandmarker unavailable', err);
      setStatus('unavailable');
      loading = null; // allow a later retry
      return null;
    }
  })();
  return loading;
}

export interface FaceFrame {
  bs: Blendshapes;
  pose: HeadPose | null;
}

/** Convert a raw result to the compact per-frame record the rules use. */
export function toFaceFrame(result: FaceLandmarkerResult): FaceFrame | null {
  const cats = result.faceBlendshapes?.[0]?.categories;
  if (!cats || cats.length === 0) return null;
  const bs: Blendshapes = {};
  for (const c of cats) if (USED.has(c.categoryName)) bs[c.categoryName] = c.score;
  const m = result.facialTransformationMatrixes?.[0]?.data;
  return { bs, pose: m && m.length >= 16 ? headPoseFromMatrix(m) : null };
}

/**
 * Run detection on the current video frame. Timestamps are kept strictly increasing across
 * callers (live preview and offline re-analysis share one instance).
 */
export function detectFrame(video: HTMLVideoElement): FaceFrame | null {
  if (!instance || video.readyState < 2 || video.videoWidth === 0) return null;
  lastTs = Math.max(performance.now(), lastTs + 1);
  try {
    return toFaceFrame(instance.detectForVideo(video, lastTs));
  } catch (err) {
    console.warn('detectForVideo failed', err);
    return null;
  }
}
