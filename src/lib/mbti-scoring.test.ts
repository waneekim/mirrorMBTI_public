import { describe, expect, it } from 'vitest';
import { LIKERT, SURVEY_ITEMS } from '../features/survey/items.ko';
import { AXES, itemScore, leanStrength, scoreSurvey, typeString } from './mbti-scoring';

const answerAll = (fn: (it: (typeof SURVEY_ITEMS)[number]) => number) =>
  Object.fromEntries(SURVEY_ITEMS.map((it) => [it.id, fn(it)]));

describe('survey items', () => {
  it('has 32 items, 8 per axis, 4 reverse-scored per axis', () => {
    expect(SURVEY_ITEMS).toHaveLength(32);
    for (const a of AXES) {
      const its = SURVEY_ITEMS.filter((i) => i.axis === a);
      expect(its).toHaveLength(8);
      expect(its.filter((i) => i.keyed === 'low')).toHaveLength(4);
    }
    expect(new Set(SURVEY_ITEMS.map((i) => i.id)).size).toBe(32);
    expect(new Set(SURVEY_ITEMS.map((i) => i.text)).size).toBe(32);
  });

  it('never puts the same axis or keying twice in a row', () => {
    for (let i = 1; i < SURVEY_ITEMS.length; i++) {
      expect(SURVEY_ITEMS[i].axis).not.toBe(SURVEY_ITEMS[i - 1].axis);
    }
  });

  it('uses a 5-point Likert scale', () => {
    expect(LIKERT.map((l) => l.value)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('itemScore', () => {
  it('scores high-keyed items directly and reverses low-keyed ones', () => {
    expect(itemScore(5, 'high')).toBe(4);
    expect(itemScore(1, 'high')).toBe(0);
    expect(itemScore(5, 'low')).toBe(0);
    expect(itemScore(1, 'low')).toBe(4);
    expect(itemScore(3, 'low')).toBe(2);
  });

  it('rejects out-of-range values', () => {
    expect(() => itemScore(0, 'high')).toThrow(RangeError);
    expect(() => itemScore(6, 'low')).toThrow(RangeError);
    expect(() => itemScore(2.5, 'low')).toThrow(RangeError);
  });
});

describe('scoreSurvey', () => {
  it('returns null until every item is answered', () => {
    const partial = answerAll(() => 3);
    delete partial[SURVEY_ITEMS[5].id];
    expect(scoreSurvey(SURVEY_ITEMS, partial)).toBeNull();
  });

  it('all "보통" → 50 on every axis', () => {
    expect(scoreSurvey(SURVEY_ITEMS, answerAll(() => 3))).toEqual({ EI: 50, SN: 50, TF: 50, JP: 50 });
  });

  it('agreeing with every item cancels out thanks to reverse scoring', () => {
    expect(scoreSurvey(SURVEY_ITEMS, answerAll(() => 5))).toEqual({ EI: 50, SN: 50, TF: 50, JP: 50 });
  });

  it('fully I/N/F/P answers → 100, fully E/S/T/J → 0', () => {
    const inf = scoreSurvey(SURVEY_ITEMS, answerAll((it) => (it.keyed === 'high' ? 5 : 1)))!;
    expect(inf).toEqual({ EI: 100, SN: 100, TF: 100, JP: 100 });
    expect(typeString(inf)).toBe('INFP');
    const estj = scoreSurvey(SURVEY_ITEMS, answerAll((it) => (it.keyed === 'high' ? 1 : 5)))!;
    expect(estj).toEqual({ EI: 0, SN: 0, TF: 0, JP: 0 });
    expect(typeString(estj)).toBe('ESTJ');
  });

  it('scores each axis independently', () => {
    const answers = answerAll((it) => (it.axis === 'EI' ? (it.keyed === 'high' ? 4 : 2) : 3));
    expect(scoreSurvey(SURVEY_ITEMS, answers)).toEqual({ EI: 75, SN: 50, TF: 50, JP: 50 });
  });
});

describe('display helpers', () => {
  it('marks a perfectly balanced axis with X', () => {
    expect(typeString({ EI: 50, SN: 49.9, TF: 50.1, JP: 0 })).toBe('XSFJ');
  });

  it('leanStrength is distance from the midpoint', () => {
    expect(leanStrength(50)).toBe(0);
    expect(leanStrength(0)).toBe(100);
    expect(leanStrength(75)).toBe(50);
  });
});
