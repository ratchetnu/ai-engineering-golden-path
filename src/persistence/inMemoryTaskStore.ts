import type { Task } from '../domain/index.ts';
import type { TaskStore } from './taskStore.ts';

export class InMemoryTaskStore implements TaskStore {
  #tasks: readonly Task[];

  constructor(initial: readonly Task[] = []) {
    this.#tasks = [...initial];
  }

  load(): Promise<readonly Task[]> {
    return Promise.resolve([...this.#tasks]);
  }

  save(tasks: readonly Task[]): Promise<void> {
    this.#tasks = [...tasks];
    return Promise.resolve();
  }
}
