import { completeTask, createTask, isOpen, summarize } from '../domain/index.ts';
import type { Task, TaskStats } from '../domain/index.ts';
import type { TaskStore } from '../persistence/index.ts';

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

export interface TaskServiceDependencies {
  readonly store: TaskStore;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export class TaskNotFoundError extends Error {
  override readonly name = 'TaskNotFoundError';
}

/** Application use cases. The CLI talks to this class, never to storage. */
export class TaskService {
  readonly #store: TaskStore;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;

  constructor(dependencies: TaskServiceDependencies) {
    this.#store = dependencies.store;
    this.#clock = dependencies.clock;
    this.#ids = dependencies.ids;
  }

  async add(title: string): Promise<Task> {
    const task = createTask({ id: this.#ids.next(), title, now: this.#clock.now() });
    const tasks = await this.#store.load();
    await this.#store.save([...tasks, task]);
    return task;
  }

  async complete(id: string): Promise<Task> {
    const tasks = await this.#store.load();
    const existing = tasks.find((task) => task.id === id);
    if (existing === undefined) {
      throw new TaskNotFoundError(`No task with id "${id}".`);
    }
    const updated = completeTask(existing, this.#clock.now());
    await this.#store.save(tasks.map((task) => (task.id === id ? updated : task)));
    return updated;
  }

  async list(options: { includeDone?: boolean } = {}): Promise<readonly Task[]> {
    const tasks = await this.#store.load();
    return options.includeDone === true ? tasks : tasks.filter(isOpen);
  }

  async stats(): Promise<TaskStats> {
    return summarize(await this.#store.load());
  }
}
