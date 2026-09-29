/** Analysis sample rate: plenty for f0 ≤ 500 Hz and keeps pitch detection cheap on phones. */
export const ANALYSIS_SAMPLE_RATE = 16000;

/**
 * Decode the audio track of a recorded clip (webm/opus or mp4/aac) to mono PCM.
 * OfflineAudioContext avoids autoplay/user-gesture restrictions and resamples for us.
 */
export async function decodeAudio(blob: Blob): Promise<{ samples: Float32Array; sampleRate: number }> {
  const data = await blob.arrayBuffer();
  const Ctx = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const ctx = new Ctx(1, 1, ANALYSIS_SAMPLE_RATE);
  const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
    // Older Safari only supports the callback form.
    const p = ctx.decodeAudioData(data, resolve, reject);
    p?.then(resolve, reject);
  });
  const samples = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < ch.length; i++) samples[i] += ch[i] / buffer.numberOfChannels;
  }
  return { samples, sampleRate: buffer.sampleRate };
}
