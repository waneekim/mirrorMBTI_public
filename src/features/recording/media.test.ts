import { describe, expect, it } from 'vitest';
import { classifyMediaError, fileExtension, pickMimeType } from './media';

const domErr = (name: string) => Object.assign(new Error(name), { name });

describe('classifyMediaError', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'notfound'],
    ['OverconstrainedError', 'notfound'],
    ['NotReadableError', 'inuse'],
    ['TypeError', 'error'],
  ])('%s → %s', (name, expected) => {
    expect(classifyMediaError(domErr(name))).toBe(expected);
  });

  it('handles non-error values', () => {
    expect(classifyMediaError(undefined)).toBe('error');
    expect(classifyMediaError('boom')).toBe('error');
  });
});

describe('pickMimeType', () => {
  it('prefers webm vp9', () => {
    expect(pickMimeType(() => true)).toBe('video/webm;codecs=vp9,opus');
  });

  it('falls back to mp4 on Safari', () => {
    expect(pickMimeType((t) => t === 'video/mp4')).toBe('video/mp4');
  });

  it('returns empty string when nothing matches', () => {
    expect(pickMimeType(() => false)).toBe('');
  });

  it('maps mime type to extension', () => {
    expect(fileExtension('video/webm;codecs=vp8,opus')).toBe('webm');
    expect(fileExtension('video/mp4')).toBe('mp4');
  });
});
