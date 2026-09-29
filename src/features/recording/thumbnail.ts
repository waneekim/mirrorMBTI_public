/** Grab the current video frame as a small JPEG (stays in IndexedDB like the clip itself). */
export function captureThumb(video: HTMLVideoElement | null, width = 160): Promise<Blob | null> {
  if (!video || video.videoWidth === 0) return Promise.resolve(null);
  const height = Math.round((video.videoHeight / video.videoWidth) * width);
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.7));
}
