/**
 * Domain layer: plain data and business rules.
 *
 * This layer must not know how tasks are stored or displayed.
 * It imports nothing from the rest of the application.
 */

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

export const MAX_TITLE_LENGTH = 200;

export class ValidationError extends Error {
  override readonly name = 'ValidationError';
}

export interface NewTaskInput {
  readonly id: string;
  readonly title: string;
  readonly now: Date;
}

export function createTask(input: NewTaskInput): Task {
  const title = input.title.trim();
  if (title.length === 0) {
    throw new ValidationError('Task title must not be empty.');
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`Task title must be at most ${MAX_TITLE_LENGTH} characters.`);
  }
  return { id: input.id, title, createdAt: input.now.toISOString(), completedAt: null };
}

export function completeTask(task: Task, now: Date): Task {
  // REG-001: completing an already-completed task must keep the original
  // completion time. See tests/regression/reg-001-complete-twice.test.ts.
  if (task.completedAt !== null) {
    return task;
  }
  return { ...task, completedAt: now.toISOString() };
}

export function isOpen(task: Task): boolean {
  return task.completedAt === null;
}

export interface TaskStats {
  readonly open: number;
  readonly done: number;
  readonly total: number;
}

export function summarize(tasks: readonly Task[]): TaskStats {
  const open = tasks.filter(isOpen).length;
  return { open, done: tasks.length - open, total: tasks.length };
}
