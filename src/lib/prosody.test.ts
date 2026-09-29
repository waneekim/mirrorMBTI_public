import { describe, expect, it } from 'vitest';
import {
  analyzeFrames,
  computeVoiceBaseline,
  countEnergyPeaks,
  extractFeatures,
  FEATURE_KEYS,
  HOP_MS,
  isFlat,
  judgeTone,
  percentile,
  rms,
  speechThreshold,
  zScores,
  type VoiceFeatures,
} from './prosody';

const SR = 16000;

function sine(freq: number, seconds: number, amp = 0.5): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  for (let i = 0; i < out.length; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR);
  return out;
}

/** `n` tone bursts of `onMs` separated by `offMs` of silence, with lead/trail silence. */
function bursts(n: number, onMs: number, offMs: number, freq = 200, amp = 0.4): Float32Array {
  const parts: Float32Array[] = [new Float32Array(SR * 0.3)];
  for (let i = 0; i < n; i++) {
    parts.push(sine(freq, onMs / 1000, amp));
    if (i < n - 1) parts.push(new Float32Array(Math.round((offMs / 1000) * SR)));
  }
  parts.push(new Float32Array(SR * 0.3));
  const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Frequency-modulated tone: f0 swings ±depth Hz at `rate` Hz. */
function vibrato(center: number, depth: number, rate: number, seconds: number, amp = 0.4): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const f = center + depth * Math.sin((2 * Math.PI * rate * i) / SR);
    phase += (2 * Math.PI * f) / SR;
    out[i] = amp * Math.sin(phase);
  }
  return out;
}

const allFinite = (f: VoiceFeatures) => FEATURE_KEYS.every((k) => Number.isFinite(f[k]));

describe('frame primitives', () => {
  it('RMS of a sine is amplitude/√2', () => {
    expect(rms(sine(220, 1, 0.5))).toBeCloseTo(0.5 / Math.SQRT2, 3);
    expect(rms(new Float32Array(0))).toBe(0);
  });

  it('percentile interpolates and handles empty input', () => {
    expect(percentile([0, 10], 0.5)).toBe(5);
    expect(percentile([], 0.9)).toBe(0);
  });

  it('detects f0 of a pure tone within 1 Hz', () => {
    for (const hz of [110, 220, 330]) {
      const voiced = analyzeFrames(sine(hz, 0.5), SR).filter((f) => f.f0 !== null);
      expect(voiced.length).toBeGreaterThan(30);
      for (const f of voiced) expect(f.f0!).toBeCloseTo(hz, 0);
    }
  });

  it('ignores pitch outside the voice range', () => {
    expect(analyzeFrames(sine(40, 0.5), SR).every((f) => f.f0 === null)).toBe(true);
  });
});

describe('countEnergyPeaks', () => {
  it('counts separate bursts', () => {
    const frames = analyzeFrames(bursts(4, 150, 150), SR).map((f) => f.rms);
    expect(countEnergyPeaks(frames, speechThreshold(frames))).toBe(4);
  });

  it('merges ripples closer than the minimum gap', () => {
    const env = Array.from({ length: 60 }, (_, i) => 0.3 + 0.02 * Math.sin(i)); // flat, tiny ripple
    expect(countEnergyPeaks(env, 0.1)).toBe(1);
  });

  it('returns 0 below threshold', () => {
    expect(countEnergyPeaks(Array(50).fill(0.001), 0.01)).toBe(0);
  });
});

describe('extractFeatures', () => {
  it('steady tone: f0 mean ≈ pitch, no spread, no pauses', () => {
    const f = extractFeatures(sine(200, 1.5, 0.5), SR);
    expect(f.f0Mean).toBeCloseTo(200, 0);
    expect(f.f0Std).toBeLessThan(1);
    expect(f.f0Range).toBeLessThan(2);
    expect(f.rmsMean).toBeCloseTo(0.5 / Math.SQRT2, 2);
    expect(f.pauseRatio).toBe(0);
  });

  it('bursts: speech rate from peaks over the speaking span, pauses between them', () => {
    const f = extractFeatures(bursts(5, 150, 150), SR);
    const spanSec = (5 * 150 + 4 * 150) / 1000;
    expect(f.speechRate).toBeGreaterThan(5 / (spanSec + 0.1));
    expect(f.speechRate).toBeLessThan(5 / (spanSec - 0.1));
    expect(f.pauseRatio).toBeGreaterThan(0.3);
    expect(f.pauseRatio).toBeLessThan(0.5);
  });

  it('vibrato widens f0 spread and range', () => {
    const flat = extractFeatures(sine(200, 1.5), SR);
    const lively = extractFeatures(vibrato(200, 40, 3, 1.5), SR);
    expect(lively.f0Std).toBeGreaterThan(flat.f0Std + 15);
    expect(lively.f0Range).toBeGreaterThan(50);
  });

  it('silence yields finite zeros, never NaN', () => {
    const f = extractFeatures(new Float32Array(SR * 3), SR);
    expect(allFinite(f)).toBe(true);
    expect(f).toEqual({ f0Mean: 0, f0Std: 0, f0Range: 0, rmsMean: 0, speechRate: 0, pauseRatio: 1 });
  });

  it('very low noise is treated as silence', () => {
    const noise = new Float32Array(SR * 2).map(() => (Math.random() - 0.5) * 0.004);
    expect(extractFeatures(noise, SR).rmsMean).toBe(0);
  });

  it('too-short input is safe', () => {
    expect(allFinite(extractFeatures(new Float32Array(10), SR))).toBe(true);
  });

  it('uses HOP_MS framing', () => {
    expect(analyzeFrames(sine(200, 1), SR).length).toBe(Math.floor((1000 - 50) / HOP_MS) + 1);
  });
});

describe('tone judgement', () => {
  const neutralA: VoiceFeatures = { f0Mean: 180, f0Std: 15, f0Range: 40, rmsMean: 0.05, speechRate: 4.5, pauseRatio: 0.2 };
  const neutralB: VoiceFeatures = { f0Mean: 175, f0Std: 14, f0Range: 38, rmsMean: 0.052, speechRate: 4.4, pauseRatio: 0.22 };
  const baseline = computeVoiceBaseline([neutralA, neutralB])!;

  it('neutral readings judge as neutral and flat against their own baseline', () => {
    for (const n of [neutralA, neutralB]) {
      const z = zScores(n, baseline);
      expect(judgeTone(z)).toBe('neutral');
      expect(isFlat(z)).toBe(true);
    }
  });

  it('floors the spread so two near-identical baselines do not explode z', () => {
    expect(baseline.scale.rmsMean).toBeGreaterThanOrEqual(0.2 * 0.051 - 1e-9);
    expect(Number.isFinite(zScores(neutralA, computeVoiceBaseline([neutralA, neutralA])!).f0Std)).toBe(true);
  });

  it('happy: livelier pitch and a bit louder', () => {
    const happy = { ...neutralA, f0Mean: 210, f0Std: 30, f0Range: 90, rmsMean: 0.06 };
    expect(judgeTone(zScores(happy, baseline))).toBe('happy');
  });

  it('angry: much louder and faster, pitch range may be narrow', () => {
    const angry = { ...neutralA, f0Std: 12, f0Range: 30, rmsMean: 0.09, speechRate: 5.5 };
    expect(judgeTone(zScores(angry, baseline))).toBe('angry');
  });

  it('louder but slower is not angry', () => {
    expect(judgeTone(zScores({ ...neutralA, rmsMean: 0.09, speechRate: 3.5 }, baseline))).toBe('neutral');
  });

  it('when both rules fire, the larger margin wins', () => {
    const z = { f0Mean: 0, f0Std: 3, f0Range: 0, rmsMean: 1.5, speechRate: 1, pauseRatio: 0 };
    expect(judgeTone(z)).toBe('happy');
    expect(judgeTone({ ...z, f0Std: 1, rmsMean: 4 })).toBe('angry');
  });

  it('no baseline without neutral readings', () => {
    expect(computeVoiceBaseline([])).toBeNull();
  });
});
