import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { frameEmotionProbs, type Blendshapes, type EmotionProbs, type FaceSample } from '../../lib/emotion-mapping';
import type { HeadPose } from '../../lib/head-pose';
import { detectFrame, getLandmarkerStatus, loadLandmarker, subscribeLandmarkerStatus, type LandmarkerStatus } from './landmarker';

/** 10 fps: the clip sampling rate (ISSUES #2) and light enough for phones. */
export const SAMPLE_INTERVAL_MS = 100;

export interface LiveRead {
  faceFound: boolean;
  probs: EmotionProbs | null;
  pose: HeadPose | null;
}

/**
 * Runs FaceLandmarker on a live <video> for the overlay, and can collect a timestamped
 * series while a clip is being recorded.
 */
export function useFaceTracking(videoRef: RefObject<HTMLVideoElement | null>, active: boolean, baseline: Blendshapes | null) {
  const [status, setStatus] = useState<LandmarkerStatus>(getLandmarkerStatus);
  const [live, setLive] = useState<LiveRead>({ faceFound: false, probs: null, pose: null });
  const collectRef = useRef<{ start: number; samples: FaceSample[] } | null>(null);
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;

  useEffect(() => {
    const unsub = subscribeLandmarkerStatus(setStatus);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (active) void loadLandmarker();
  }, [active]);

  useEffect(() => {
    if (!active || status !== 'ready') return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < SAMPLE_INTERVAL_MS) return;
      last = now;
      const video = videoRef.current;
      if (!video) return;
      const frame = detectFrame(video);
      if (collectRef.current && frame) {
        collectRef.current.samples.push({ t: now - collectRef.current.start, bs: frame.bs, pose: frame.pose });
      }
      setLive(
        frame
          ? { faceFound: true, probs: frameEmotionProbs(frame.bs, baselineRef.current), pose: frame.pose }
          : { faceFound: false, probs: null, pose: null },
      );
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, status, videoRef]);

  const startCollect = useCallback(() => {
    collectRef.current = { start: performance.now(), samples: [] };
  }, []);

  /** Stop collecting; returns null if the landmarker never became usable. */
  const stopCollect = useCallback((): FaceSample[] | null => {
    const c = collectRef.current;
    collectRef.current = null;
    return getLandmarkerStatus() === 'ready' && c ? c.samples : null;
  }, []);

  return { status, live, startCollect, stopCollect };
}
