import { describe, expect, it } from 'vitest';
import type { VoiceFeatures } from '../../lib/prosody';
import { deriveVoiceResults, statusForFeatures, type VoiceAnalysis } from './derive';

const N: VoiceFeatures = { f0Mean: 180, f0Std: 15, f0Range: 40, rmsMean: 0.05, speechRate: 4.5, pauseRatio: 0.2 };
const a = (id: string, features: VoiceFeatures | null, status: VoiceAnalysis['status'] = 'ok'): VoiceAnalysis => ({
  id,
  status,
  features,
  analyzedAt: '2026-01-01T00:00:00Z',
});

describe('deriveVoiceResults', () => {
  it('waits for a neutral reading before judging tone', () => {
    const r = deriveVoiceResults([a('speech_a_happy', { ...N, f0Std: 40 })]);
    expect(r.speech_a_happy.status).toBe('awaiting-baseline');
    expect(r.speech_a_happy.readTone).toBeNull();
  });

  it('judges happy/angry readings against the neutral pair', () => {
    const r = deriveVoiceResults([
      a('speech_a_neutral', N),
      a('speech_b_neutral', { ...N, f0Mean: 176, rmsMean: 0.052 }),
      a('speech_a_happy', { ...N, f0Std: 32, f0Range: 95, rmsMean: 0.06 }),
      a('speech_a_angry', { ...N, rmsMean: 0.1, speechRate: 5.6 }),
    ]);
    expect(r.speech_a_neutral.readTone).toBe('neutral');
    expect(r.speech_a_neutral.flat).toBe(true);
    expect(r.speech_a_happy.readTone).toBe('happy');
    expect(r.speech_a_angry.readTone).toBe('angry');
  });

  it('works with a single neutral reading', () => {
    const r = deriveVoiceResults([a('speech_b_neutral', N), a('speech_b_angry', { ...N, rmsMean: 0.1, speechRate: 5.6 })]);
    expect(r.speech_b_angry.readTone).toBe('angry');
  });

  it('silent or undecodable clips get no tone and do not become the baseline', () => {
    const silent = { f0Mean: 0, f0Std: 0, f0Range: 0, rmsMean: 0, speechRate: 0, pauseRatio: 1 };
    expect(statusForFeatures(silent)).toBe('silent');
    const r = deriveVoiceResults([a('speech_a_neutral', silent, 'silent'), a('speech_a_happy', null, 'unavailable')]);
    expect(r.speech_a_neutral).toEqual({ status: 'silent', features: silent, readTone: null, flat: null });
    expect(r.speech_a_happy.status).toBe('unavailable');
  });
});
