import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTask } from '../../../src/domain/index.ts';
import { CorruptStoreError, FileTaskStore } from '../../../src/persistence/index.ts';
import { FIXED_TIME } from '../../helpers.ts';

describe('FileTaskStore', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'golden-path-store-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns an empty list when the file does not exist yet', async () => {
    expect(await new FileTaskStore(join(dir, 'missing.json')).load()).toEqual([]);
  });

  it('round-trips tasks and creates missing folders', async () => {
    const store = new FileTaskStore(join(dir, 'nested', 'tasks.json'));
    const tasks = [createTask({ id: 'a', title: 'a', now: FIXED_TIME })];
    await store.save(tasks);
    expect(await store.load()).toEqual(tasks);
  });

  it('refuses invalid JSON instead of silently losing data', async () => {
    const file = join(dir, 'tasks.json');
    writeFileSync(file, '{not json');
    await expect(new FileTaskStore(file).load()).rejects.toThrow(CorruptStoreError);
  });

  it('refuses JSON with the wrong shape', async () => {
    const file = join(dir, 'tasks.json');
    writeFileSync(file, JSON.stringify([{ id: 1 }]));
    await expect(new FileTaskStore(file).load()).rejects.toThrow(CorruptStoreError);
  });
});
