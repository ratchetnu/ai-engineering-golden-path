/**
 * REG-001: Completing a task twice overwrote its completion time.
 *
 * (Illustrative bug for this reference project.) A task completed on Monday
 * would show as completed on Wednesday if someone ran "done" on it again,
 * making any report based on completion dates wrong.
 *
 * A regression test is written *before* the fix, fails, and then stays
 * forever so the same bug cannot quietly return - including through a
 * well-meaning AI-generated refactor.
 */
import { describe, expect, it } from 'vitest';
import { createTestService } from '../helpers.ts';

describe('REG-001: completing a task twice', () => {
  it('keeps the original completion time', async () => {
    const { service, clock } = createTestService();
    const task = await service.add('report');

    clock.time = new Date('2026-01-19T10:00:00.000Z'); // Monday
    const first = await service.complete(task.id);

    clock.time = new Date('2026-01-21T10:00:00.000Z'); // Wednesday
    const second = await service.complete(task.id);

    expect(second.completedAt).toBe('2026-01-19T10:00:00.000Z');
    expect(second).toEqual(first);
  });
});
