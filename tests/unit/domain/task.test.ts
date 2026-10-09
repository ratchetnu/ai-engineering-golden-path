import { describe, expect, it } from 'vitest';
import {
  MAX_TITLE_LENGTH,
  ValidationError,
  completeTask,
  createTask,
  isOpen,
  summarize,
} from '../../../src/domain/index.ts';
import { FIXED_TIME } from '../../helpers.ts';

describe('createTask', () => {
  it('trims the title and starts open', () => {
    const task = createTask({ id: 'a', title: '  Write docs  ', now: FIXED_TIME });
    expect(task).toEqual({ id: 'a', title: 'Write docs', createdAt: FIXED_TIME.toISOString(), completedAt: null });
    expect(isOpen(task)).toBe(true);
  });

  it.each(['', '   '])('rejects an empty title (%j)', (title) => {
    expect(() => createTask({ id: 'a', title, now: FIXED_TIME })).toThrow(ValidationError);
  });

  it('accepts a title at the maximum length and rejects one character more', () => {
    expect(() => createTask({ id: 'a', title: 'x'.repeat(MAX_TITLE_LENGTH), now: FIXED_TIME })).not.toThrow();
    expect(() => createTask({ id: 'a', title: 'x'.repeat(MAX_TITLE_LENGTH + 1), now: FIXED_TIME })).toThrow(
      ValidationError,
    );
  });
});

describe('completeTask', () => {
  it('sets the completion time without mutating the original', () => {
    const task = createTask({ id: 'a', title: 'x', now: FIXED_TIME });
    const later = new Date('2026-01-16T00:00:00.000Z');
    const done = completeTask(task, later);
    expect(done.completedAt).toBe(later.toISOString());
    expect(task.completedAt).toBeNull();
    expect(isOpen(done)).toBe(false);
  });
});

describe('summarize', () => {
  it('counts open and done tasks', () => {
    const a = createTask({ id: 'a', title: 'a', now: FIXED_TIME });
    const b = completeTask(createTask({ id: 'b', title: 'b', now: FIXED_TIME }), FIXED_TIME);
    expect(summarize([a, b, a])).toEqual({ open: 2, done: 1, total: 3 });
    expect(summarize([])).toEqual({ open: 0, done: 0, total: 0 });
  });
});
