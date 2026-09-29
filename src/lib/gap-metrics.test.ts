import { describe, expect, it } from 'vitest';
import type { EmotionProbs } from './emotion-mapping';
import { axisGap, expressionDelivery, meanAxes, misreadRisk, toneDelivery } from './gap-metrics';

const probs = (p: Partial<EmotionProbs>): EmotionProbs => ({ neutral: 0, happy: 0, angry: 0, surprised: 0, sad: 0, ...p });

describe('expressionDelivery', () => {
  it('reports read[intended] and the dominant reading, skipping profile clips', () => {
    const d = expressionDelivery([
      { id: 'smile', intended: 'happy', read: probs({ happy: 0.7, neutral: 0.3 }) },
      { id: 'angry', intended: 'angry', read: probs({ neutral: 0.6, angry: 0.4 }) },
      { id: 'profile_left', intended: 'n/a', read: null },
      { id: 'sad', intended: 'sad', read: null },
    ]);
    expect(d).toEqual([
      { id: 'smile', intended: 'happy', value: 0.7, readAs: 'happy' },
      { id: 'angry', intended: 'angry', value: 0.4, readAs: 'neutral' },
      { id: 'sad', intended: 'sad', value: null, readAs: null },
    ]);
  });
});

describe('misreadRisk', () => {
  it('picks the strongest non-neutral emotion on the neutral clip', () => {
    expect(misreadRisk(probs({ neutral: 0.4, angry: 0.41, sad: 0.12, happy: 0.05, surprised: 0.02 }))).toEqual({
      emotion: 'angry',
      probability: 0.41,
    });
  });

  it('is null without an analysed neutral clip', () => {
    expect(misreadRisk(null)).toBeNull();
  });
});

describe('toneDelivery', () => {
  it('counts matches only over judged clips', () => {
    const t = toneDelivery([
      { id: 'a', intended: 'happy', readTone: 'happy' },
      { id: 'b', intended: 'angry', readTone: 'neutral' },
      { id: 'c', intended: 'angry', readTone: null },
    ]);
    expect(t.matched).toBe(1);
    expect(t.judged).toBe(2);
    expect(t.results.map((r) => r.match)).toEqual([true, false, null]);
  });
});

describe('axisGap', () => {
  const self = { EI: 62, SN: 41, TF: 55, JP: 70 };

  it('is null while the impression is missing (panel results pending)', () => {
    expect(axisGap(self, null)).toBeNull();
    expect(axisGap(null, self)).toBeNull();
  });

  it('computes abs gaps and objectivity = 100 - mean(gap) with a mock impression', () => {
    const g = axisGap(self, { EI: 40, SN: 45, TF: 55, JP: 50 })!;
    expect(g.axes).toEqual({ EI: 22, SN: 4, TF: 0, JP: 20 });
    expect(g.objectivityIndex).toBeCloseTo(100 - 46 / 4);
  });

  it('is 100 when self and impression agree', () => {
    expect(axisGap(self, self)!.objectivityIndex).toBe(100);
  });
});

describe('meanAxes', () => {
  it('averages raters per axis', () => {
    expect(
      meanAxes([
        { EI: 20, SN: 40, TF: 60, JP: 80 },
        { EI: 40, SN: 60, TF: 80, JP: 100 },
      ]),
    ).toEqual({ EI: 30, SN: 50, TF: 70, JP: 90 });
    expect(meanAxes([])).toBeNull();
  });
});
