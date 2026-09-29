import { extractFeatures } from '../../lib/prosody';
import { decodeAudio } from './decode';
import { statusForFeatures, type VoiceAnalysis } from './derive';

/** Decode + extract. Never throws: undecodable audio becomes status 'unavailable'. */
export async function analyzeVoiceBlob(id: string, blob: Blob): Promise<VoiceAnalysis> {
  const analyzedAt = new Date().toISOString();
  try {
    const { samples, sampleRate } = await decodeAudio(blob);
    const features = extractFeatures(samples, sampleRate);
    return { id, status: statusForFeatures(features), features, analyzedAt };
  } catch (err) {
    console.warn(`Voice analysis failed for ${id}`, err);
    return { id, status: 'unavailable', features: null, analyzedAt };
  }
}
