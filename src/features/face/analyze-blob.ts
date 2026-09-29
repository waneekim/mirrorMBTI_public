import type { FaceSample } from '../../lib/emotion-mapping';
import { detectFrame, loadLandmarker } from './landmarker';
import { SAMPLE_INTERVAL_MS } from './useFaceTracking';

/**
 * Re-analyse a recorded clip by playing it back and sampling at 10 fps.
 * Used for clips recorded while the model was unavailable. Returns null if MediaPipe cannot load.
 */
export async function analyzeBlob(blob: Blob): Promise<FaceSample[] | null> {
  if (!(await loadLandmarker())) return null;

  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  // Some mobile browsers skip decoding for detached/hidden videos.
  Object.assign(video.style, { position: 'fixed', left: '0', top: '0', width: '2px', height: '2px', opacity: '0', pointerEvents: 'none' });
  document.body.appendChild(video);

  const samples: FaceSample[] = [];
  let next = 0;
  const sample = (mediaTimeMs: number) => {
    if (mediaTimeMs < next) return;
    next = mediaTimeMs + SAMPLE_INTERVAL_MS;
    const f = detectFrame(video);
    if (f) samples.push({ t: mediaTimeMs, bs: f.bs, pose: f.pose });
  };

  try {
    await new Promise<void>((resolve, reject) => {
      video.onended = () => resolve();
      video.onerror = () => reject(new Error('playback failed'));
      if (typeof video.requestVideoFrameCallback === 'function') {
        const onFrame: VideoFrameRequestCallback = (_now, meta) => {
          sample(meta.mediaTime * 1000);
          if (!video.ended) video.requestVideoFrameCallback(onFrame);
        };
        video.requestVideoFrameCallback(onFrame);
      } else {
        const iv = setInterval(() => sample(video.currentTime * 1000), SAMPLE_INTERVAL_MS / 2);
        video.addEventListener('ended', () => clearInterval(iv), { once: true });
      }
      video.play().catch(reject);
    });
    return samples;
  } finally {
    video.remove();
    URL.revokeObjectURL(url);
  }
}
