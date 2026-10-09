import { InMemoryTaskStore } from '../src/persistence/index.ts';
import { TaskService } from '../src/services/index.ts';

export const FIXED_TIME = new Date('2026-01-15T09:00:00.000Z');

/** A service with a fake clock and predictable ids, so tests are repeatable. */
export function createTestService(): { service: TaskService; store: InMemoryTaskStore; clock: { time: Date } } {
  const store = new InMemoryTaskStore();
  const clock = { time: FIXED_TIME };
  let counter = 0;
  const service = new TaskService({
    store,
    clock: { now: () => clock.time },
    ids: {
      next: () => {
        counter += 1;
        return `t${counter}`;
      },
    },
  });
  return { service, store, clock };
}
