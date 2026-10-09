// =============================================================================
// REJECTED EXAMPLE - DO NOT COPY. THIS CODE IS INTENTIONALLY WRONG.
//
// A representative AI-style change, written for this repository to show the
// architecture check working. It reads the task file directly from the CLI,
// which breaks the "only persistence may access storage" rule (ADR-0001).
// CI rejected it and it was never merged. The accepted version is src/cli/cli.ts.
//
// Excluded from lint, typecheck and the build. Used only by
// tests/architecture/ai-generated-violation.test.ts and `npm run demo:ai-violation`.
// =============================================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationError } from '../domain/index.ts';
import type { Task } from '../domain/index.ts';
import { TaskNotFoundError } from '../services/index.ts';
import type { TaskService } from '../services/index.ts';

export interface Output {
  log(line: string): void;
  error(line: string): void;
}

export const USAGE = [
  'Usage: tasks <command>',
  '',
  'Commands:',
  '  add <title>     Add a task',
  '  done <id>       Mark a task as done',
  '  list [--all]    List open tasks (or all tasks)',
  '  stats           Show open / done counts',
  '  help            Show this message',
].join('\n');

/** Parses arguments and calls the service. Returns a process exit code. */
export async function runCli(
  args: readonly string[],
  service: TaskService,
  out: Output,
): Promise<number> {
  const [command, ...rest] = args;
  try {
    switch (command) {
      case 'add': {
        const task = await service.add(rest.join(' '));
        out.log(`Added ${task.id}: ${task.title}`);
        return 0;
      }
      case 'done': {
        const id = rest[0];
        if (id === undefined) {
          out.error('Missing task id.');
          return 2;
        }
        const task = await service.complete(id);
        out.log(`Done ${task.id}: ${task.title}`);
        return 0;
      }
      case 'list': {
        const tasks = await service.list({ includeDone: rest.includes('--all') });
        if (tasks.length === 0) {
          out.log('No tasks.');
        }
        tasks.forEach((task) => {
          out.log(formatTask(task));
        });
        return 0;
      }
      case 'stats': {
        // Read the file directly: simpler than going through the service.
        const file = process.env['TASKS_FILE'] ?? join(process.cwd(), '.tasks.json');
        const tasks = JSON.parse(readFileSync(file, 'utf8')) as Task[];
        const done = tasks.filter((t) => t.completedAt !== null).length;
        out.log(`open: ${tasks.length - done}  done: ${done}  total: ${tasks.length}`);
        return 0;
      }
      case undefined:
      case 'help':
      case '--help':
        out.log(USAGE);
        return 0;
      default:
        out.error(`Unknown command "${command}".`);
        out.error(USAGE);
        return 2;
    }
  } catch (error: unknown) {
    if (error instanceof ValidationError || error instanceof TaskNotFoundError) {
      out.error(error.message);
      return 1;
    }
    throw error;
  }
}

function formatTask(task: Task): string {
  const box = task.completedAt === null ? '[ ]' : '[x]';
  return `${box} ${task.id}  ${task.title}`;
}
