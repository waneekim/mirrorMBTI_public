import { describe, expect, it } from 'vitest';
import {
  aggregateClipEmotion,
  aggregateHeadPose,
  computeBaseline,
  detectGenuineSmile,
  EMOTIONS,
  frameEmotionProbs,
  median,
  subtractBaseline,
  topEmotion,
  trimEdges,
  type Blendshapes,
  type FaceSample,
} from './emotion-mapping';

// A slightly "resting" face: nothing at zero, as real blendshapes never are.
const REST: Blendshapes = {
  mouthSmileLeft: 0.05,
  mouthSmileRight: 0.05,
  cheekSquintLeft: 0.03,
  cheekSquintRight: 0.03,
  browDownLeft: 0.08,
  browDownRight: 0.08,
  jawForward: 0.02,
  mouthPressLeft: 0.06,
  mouthPressRight: 0.06,
  noseSneerLeft: 0.01,
  noseSneerRight: 0.01,
  eyeWideLeft: 0.05,
  eyeWideRight: 0.05,
  browInnerUp: 0.05,
  jawOpen: 0.02,
  mouthFrownLeft: 0.02,
  mouthFrownRight: 0.02,
  eyeSquintLeft: 0.1,
  eyeSquintRight: 0.1,
};

const face = (over: Blendshapes): Blendshapes => ({ ...REST, ...over });

// Moderate posed expressions (not maxed out) — the rules must still pick them.
const POSED: Record<'happy' | 'angry' | 'surprised' | 'sad', Blendshapes> = {
  happy: face({ mouthSmileLeft: 0.7, mouthSmileRight: 0.65, cheekSquintLeft: 0.35, cheekSquintRight: 0.3 }),
  angry: face({ browDownLeft: 0.6, browDownRight: 0.55, mouthPressLeft: 0.35, mouthPressRight: 0.35, noseSneerLeft: 0.3, noseSneerRight: 0.25, jawForward: 0.1 }),
  surprised: face({ eyeWideLeft: 0.55, eyeWideRight: 0.5, browInnerUp: 0.6, jawOpen: 0.45 }),
  sad: face({ mouthFrownLeft: 0.45, mouthFrownRight: 0.4, browInnerUp: 0.4, eyeSquintLeft: 0.35, eyeSquintRight: 0.35 }),
};

describe('frameEmotionProbs', () => {
  it('probabilities sum to 1', () => {
    const p = frameEmotionProbs(POSED.happy, REST);
    expect(EMOTIONS.reduce((a, e) => a + p[e], 0)).toBeCloseTo(1, 10);
  });

  it('reads the resting face as neutral against its own baseline', () => {
    const p = frameEmotionProbs(REST, REST);
    expect(topEmotion(p)).toBe('neutral');
    expect(p.neutral).toBeGreaterThan(0.9);
  });

  it.each(Object.keys(POSED) as (keyof typeof POSED)[])('reads posed %s as the intended emotion with p ≥ 0.5', (emotion) => {
    const p = frameEmotionProbs(POSED[emotion], REST);
    expect(topEmotion(p)).toBe(emotion);
    expect(p[emotion]).toBeGreaterThanOrEqual(0.5);
  });

  it('suppresses sad when the eyes are wide open', () => {
    const wideSad = face({ ...POSED.sad, eyeWideLeft: 0.5, eyeWideRight: 0.5 });
    expect(frameEmotionProbs(wideSad, REST).sad).toBeLessThan(frameEmotionProbs(POSED.sad, REST).sad);
  });
});

describe('baseline subtraction', () => {
  // Someone whose resting brows sit low looks "angry" without a baseline.
  const lowBrowRest = face({ browDownLeft: 0.55, browDownRight: 0.55, mouthPressLeft: 0.3, mouthPressRight: 0.3, noseSneerLeft: 0.25, noseSneerRight: 0.25 });

  it('clamps negative deltas to zero', () => {
    const d = subtractBaseline(face({ jawOpen: 0 }), face({ jawOpen: 0.3 }));
    expect(d.jawOpen).toBe(0);
  });

  it('without a baseline, a low-brow resting face reads as angry', () => {
    expect(topEmotion(frameEmotionProbs(lowBrowRest, null))).toBe('angry');
  });

  it('with the personal baseline, the same face reads as neutral', () => {
    expect(topEmotion(frameEmotionProbs(lowBrowRest, lowBrowRest))).toBe('neutral');
  });

  it('computes the baseline as the trimmed per-blendshape mean', () => {
    const samples: FaceSample[] = [
      { t: 0, bs: face({ jawOpen: 0.9 }), pose: null }, // trimmed
      { t: 1000, bs: face({ jawOpen: 0.1 }), pose: null },
      { t: 2000, bs: face({ jawOpen: 0.3 }), pose: null },
      { t: 2900, bs: face({ jawOpen: 0.9 }), pose: null }, // trimmed
    ];
    expect(computeBaseline(samples, 3000)!.jawOpen).toBeCloseTo(0.2);
  });
});

describe('clip aggregation', () => {
  const series = (bs: Blendshapes, edge: Blendshapes): FaceSample[] =>
    Array.from({ length: 31 }, (_, i) => ({ t: i * 100, bs: i < 3 || i > 27 ? edge : bs, pose: null }));

  it('trims 0.3 s at both ends', () => {
    const kept = trimEdges(series(REST, REST), 3000);
    expect(kept[0].t).toBe(300);
    expect(kept.at(-1)!.t).toBe(2700);
  });

  it('uses the median so blinks/edge frames do not flip the result', () => {
    const s = series(POSED.happy, POSED.angry);
    s[10] = { ...s[10], bs: POSED.angry }; // a single outlier frame inside the window
    const read = aggregateClipEmotion(s, 3000, REST)!;
    expect(topEmotion(read)).toBe('happy');
    expect(read.happy).toBeGreaterThanOrEqual(0.5);
    expect(EMOTIONS.reduce((a, e) => a + read[e], 0)).toBeCloseTo(1, 10);
  });

  it('returns null for a clip with no detected face', () => {
    expect(aggregateClipEmotion([], 3000, REST)).toBeNull();
    expect(aggregateHeadPose([], 3000)).toBeNull();
  });

  it('takes the median head pose, ignoring frames without a pose', () => {
    const s: FaceSample[] = [500, 1000, 1500, 2000].map((t, i) => ({
      t,
      bs: REST,
      pose: i === 3 ? null : { yaw: [-60, -70, -80][i], pitch: 0, roll: 0 },
    }));
    expect(aggregateHeadPose(s, 3000)!.yaw).toBe(-70);
  });

  it('median handles even and empty input', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNaN();
  });
});

describe('detectGenuineSmile', () => {
  const clip = (bs: Blendshapes): FaceSample[] => [500, 1000, 1500, 2000, 2500].map((t) => ({ t, bs, pose: null }));

  it('true when cheeks engage (≥ 40% of the smile)', () => {
    expect(detectGenuineSmile(clip(POSED.happy), 3000, REST)).toBe(true);
  });

  it('false for a mouth-only smile', () => {
    const polite = face({ mouthSmileLeft: 0.7, mouthSmileRight: 0.7, cheekSquintLeft: 0.05, cheekSquintRight: 0.05 });
    expect(detectGenuineSmile(clip(polite), 3000, REST)).toBe(false);
  });

  it('undetermined (null) when there is barely a smile or no frames', () => {
    expect(detectGenuineSmile(clip(REST), 3000, REST)).toBeNull();
    expect(detectGenuineSmile([], 3000, REST)).toBeNull();
  });
});
