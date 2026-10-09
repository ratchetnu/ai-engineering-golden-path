import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../src/domain/index.ts';
import { TaskNotFoundError } from '../../../src/services/index.ts';
import { createTestService } from '../../helpers.ts';

describe('TaskService', () => {
  it('adds tasks and persists them through the store', async () => {
    const { service, store } = createTestService();
    await service.add('first');
    await service.add('second');
    expect((await store.load()).map((t) => t.title)).toEqual(['first', 'second']);
  });

  it('does not save anything when validation fails', async () => {
    const { service, store } = createTestService();
    await expect(service.add('  ')).rejects.toThrow(ValidationError);
    expect(await store.load()).toEqual([]);
  });

  it('completes a task and hides it from the open list', async () => {
    const { service } = createTestService();
    const task = await service.add('first');
    await service.add('second');
    await service.complete(task.id);
    expect((await service.list()).map((t) => t.title)).toEqual(['second']);
    expect(await service.list({ includeDone: true })).toHaveLength(2);
  });

  it('reports a missing task clearly', async () => {
    const { service } = createTestService();
    await expect(service.complete('nope')).rejects.toThrow(TaskNotFoundError);
  });

  it('summarizes open and done counts', async () => {
    const { service } = createTestService();
    const task = await service.add('first');
    await service.add('second');
    await service.complete(task.id);
    expect(await service.stats()).toEqual({ open: 1, done: 1, total: 2 });
  });
});
