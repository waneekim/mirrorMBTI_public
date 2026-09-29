import { describe, expect, it } from 'vitest';
import { getClipSpec, nextPendingAfter, nextPendingClip, PROTOCOL, SENTENCES } from './protocol';

describe('capture protocol', () => {
  it('has 7 expression clips then 6 speech clips in fixed order', () => {
    expect(PROTOCOL).toHaveLength(13);
    expect(PROTOCOL.map((c) => c.id)).toEqual([
      'neutral',
      'smile',
      'angry',
      'surprised',
      'sad',
      'profile_left',
      'profile_right',
      'speech_a_neutral',
      'speech_b_neutral',
      'speech_a_happy',
      'speech_b_happy',
      'speech_a_angry',
      'speech_b_angry',
    ]);
  });

  it('uses unique ids', () => {
    expect(new Set(PROTOCOL.map((c) => c.id)).size).toBe(PROTOCOL.length);
  });

  it('labels intended emotion per CLAUDE.md §4', () => {
    expect(getClipSpec('smile')?.intended).toBe('happy');
    expect(getClipSpec('profile_left')?.intended).toBe('n/a');
    expect(getClipSpec('profile_right')?.framing).toBe('profile_right');
  });

  it('attaches a sentence to every speech clip and none to expression clips', () => {
    for (const c of PROTOCOL) {
      if (c.kind === 'speech') {
        expect(Object.values(SENTENCES)).toContain(c.sentence);
        expect(['neutral', 'happy', 'angry']).toContain(c.intended);
      } else {
        expect(c.sentence).toBeUndefined();
      }
    }
  });

  it('records the neutral baselines before other tones', () => {
    const ids = PROTOCOL.map((c) => c.id);
    expect(ids.indexOf('neutral')).toBe(0);
    expect(ids.indexOf('speech_b_neutral')).toBeLessThan(ids.indexOf('speech_a_happy'));
  });
});

describe('nextPendingClip', () => {
  it('starts at the first clip', () => {
    expect(nextPendingClip([])?.id).toBe('neutral');
  });

  it('skips recorded clips and fills gaps in order', () => {
    expect(nextPendingClip(['neutral', 'angry'])?.id).toBe('smile');
  });

  it('returns null when every clip is recorded', () => {
    expect(nextPendingClip(PROTOCOL.map((c) => c.id))).toBeNull();
  });
});

describe('nextPendingAfter', () => {
  it('continues forward from the given clip', () => {
    expect(nextPendingAfter('smile', ['neutral', 'smile'])?.id).toBe('angry');
  });

  it('wraps around to earlier gaps', () => {
    const all = PROTOCOL.map((c) => c.id).filter((id) => id !== 'smile');
    expect(nextPendingAfter('speech_b_angry', all)?.id).toBe('smile');
  });

  it('returns null when complete', () => {
    expect(nextPendingAfter('neutral', PROTOCOL.map((c) => c.id))).toBeNull();
  });
});
