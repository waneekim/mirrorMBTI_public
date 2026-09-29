import { describe, expect, it } from 'vitest';
import type { Blendshapes, FaceSample } from '../../lib/emotion-mapping';
import { deriveFaceResults, statusForSamples, type FaceAnalysis } from './derive';

const REST: Blendshapes = { browDownLeft: 0.4, browDownRight: 0.4, mouthPressLeft: 0.3, mouthPressRight: 0.3 };
const SMILE: Blendshapes = { ...REST, mouthSmileLeft: 0.7, mouthSmileRight: 0.7, cheekSquintLeft: 0.4, cheekSquintRight: 0.4 };

const series = (bs: Blendshapes, yaw = 0): FaceSample[] =>
  Array.from({ length: 30 }, (_, i) => ({ t: i * 100, bs, pose: { yaw, pitch: 0, roll: 0 } }));

const analysis = (id: string, samples: FaceSample[], status: FaceAnalysis['status'] = 'ok'): FaceAnalysis => ({
  id,
  status,
  durationMs: 3000,
  samples,
  analyzedAt: '2026-01-01T00:00:00Z',
});

describe('deriveFaceResults', () => {
  it('waits for the neutral baseline before producing `read`', () => {
    const r = deriveFaceResults([analysis('smile', series(SMILE))]);
    expect(r.smile.status).toBe('awaiting-baseline');
    expect(r.smile.read).toBeNull();
  });

  it('reads the smile clip relative to the neutral clip and sets genuineSmile only there', () => {
    const r = deriveFaceResults([analysis('neutral', series(REST)), analysis('smile', series(SMILE))]);
    expect(r.neutral.read!.neutral).toBeGreaterThan(0.9);
    expect(r.smile.read!.happy).toBeGreaterThanOrEqual(0.5);
    expect(r.smile.genuineSmile).toBe(true);
    expect(r.neutral.genuineSmile).toBeNull();
  });

  it('a stern resting face does not make every clip read as angry', () => {
    const r = deriveFaceResults([analysis('neutral', series(REST)), analysis('sad', series(REST))]);
    expect(r.sad.read!.angry).toBeLessThan(0.1);
  });

  it('reports head pose for profile clips', () => {
    const r = deriveFaceResults([analysis('neutral', series(REST)), analysis('profile_left', series(REST, -66))]);
    expect(Math.abs(r.profile_left.headPose!.yaw)).toBeGreaterThanOrEqual(50);
  });

  it('passes through unavailable/noface without crashing', () => {
    const r = deriveFaceResults([analysis('neutral', [], 'unavailable'), analysis('smile', [], 'noface')]);
    expect(r.neutral).toEqual({ status: 'unavailable', read: null, genuineSmile: null, headPose: null });
    expect(r.smile.status).toBe('noface');
  });

  it('classifies too few detected frames as noface', () => {
    expect(statusForSamples(series(REST).slice(0, 2))).toBe('noface');
    expect(statusForSamples(series(REST))).toBe('ok');
  });
});
