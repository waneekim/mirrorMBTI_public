export type MediaFailure = 'denied' | 'notfound' | 'inuse' | 'unsupported' | 'insecure' | 'error';

/** Map a getUserMedia rejection to a UI state. */
export function classifyMediaError(err: unknown): MediaFailure {
  const name = err instanceof Error || (typeof err === 'object' && err !== null && 'name' in err)
    ? String((err as { name: unknown }).name)
    : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'notfound';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'inuse';
    default:
      return 'error';
  }
}

export const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  // 640x480 keeps MediaPipe real-time on phones; phones in portrait return it rotated (480x640).
  video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
  // Raw signal for prosody analysis (#3): browser DSP would distort RMS and pitch.
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
};

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4', // Safari fallback
];

/** First supported recording mime type, or '' to let the browser choose. */
export function pickMimeType(isTypeSupported: (type: string) => boolean): string {
  return MIME_CANDIDATES.find((t) => isTypeSupported(t)) ?? '';
}

export function fileExtension(mimeType: string): string {
  return mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
}
