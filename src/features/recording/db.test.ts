import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { createClipRepository, MirrorDB, type StoredClip } from './db';
import { PROTOCOL } from './protocol';

const DB_NAME = 'mirror-mbti-test';

function makeClip(id: string, payload = id): StoredClip {
  const spec = PROTOCOL.find((c) => c.id === id)!;
  return {
    id,
    kind: spec.kind,
    intended: spec.intended,
    ...(spec.sentence ? { sentence: spec.sentence } : {}),
    recordedAt: new Date().toISOString(),
    mimeType: 'video/webm',
    durationMs: 3000,
    blob: new Blob([payload], { type: 'video/webm' }),
  };
}

afterEach(async () => {
  await new MirrorDB(DB_NAME).delete();
});

describe('clip repository', () => {
  it('restores all 13 clips after the database is reopened (page reload)', async () => {
    const first = new MirrorDB(DB_NAME);
    const repo = createClipRepository(first);
    for (const c of PROTOCOL) await repo.save(makeClip(c.id));
    first.close();

    const reopened = new MirrorDB(DB_NAME);
    const restored = await createClipRepository(reopened).listMeta();
    expect(restored.map((m) => m.id).sort()).toEqual(PROTOCOL.map((c) => c.id).sort());
    expect(restored.every((m) => !('blob' in m))).toBe(true);

    const blob = (await createClipRepository(reopened).get('speech_a_happy'))!.blob;
    expect(await blob.text()).toBe('speech_a_happy');
    reopened.close();
  });

  it('replaces a clip on retake', async () => {
    const repo = createClipRepository(new MirrorDB(DB_NAME));
    await repo.save(makeClip('smile', 'take-1'));
    await repo.save(makeClip('smile', 'take-2'));
    expect(await repo.listMeta()).toHaveLength(1);
    expect(await (await repo.get('smile'))!.blob.text()).toBe('take-2');
  });

  it('clears the whole session', async () => {
    const repo = createClipRepository(new MirrorDB(DB_NAME));
    await repo.save(makeClip('neutral'));
    await repo.save(makeClip('sad'));
    await repo.clearAll();
    expect(await repo.listMeta()).toEqual([]);
  });
});
