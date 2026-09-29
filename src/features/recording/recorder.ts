import { pickMimeType } from './media';

export interface RecordedMedia {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

/** Record `durationMs` of the given stream. Rejects with AbortError if `signal` fires. */
export function recordClip(stream: MediaStream, durationMs: number, signal?: AbortSignal): Promise<RecordedMedia> {
  return new Promise((resolve, reject) => {
    const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    let aborted = false;
    let startedAt = 0;

    const onAbort = () => {
      aborted = true;
      if (recorder.state !== 'inactive') recorder.stop();
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => reject(new Error('MediaRecorder error'));
    recorder.onstop = () => {
      signal?.removeEventListener('abort', onAbort);
      if (aborted) {
        reject(new DOMException('Recording aborted', 'AbortError'));
        return;
      }
      const type = recorder.mimeType || mimeType || 'video/webm';
      resolve({ blob: new Blob(chunks, { type }), mimeType: type, durationMs: performance.now() - startedAt });
    };

    recorder.start();
    startedAt = performance.now();
    setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, durationMs);
  });
}
