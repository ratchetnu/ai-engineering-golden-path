import type { Task } from '../domain/index.ts';

/**
 * The only way the rest of the application reads or writes tasks.
 *
 * Architecture rule: this folder (src/persistence) is the single place that
 * may touch the storage mechanism. Everything else depends on this interface.
 */
export interface TaskStore {
  load(): Promise<readonly Task[]>;
  save(tasks: readonly Task[]): Promise<void>;
}
