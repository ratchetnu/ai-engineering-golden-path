import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface BuildProblem {
  readonly title: string;
  readonly message: string;
}

const FORBIDDEN_IN_DIST = [/\.test\.js$/, /fixtures/, /\.ts$/, /\.map$/];

/**
 * Proves the compiled output is a working program, not just that tsc exited 0:
 * the entry point exists, nothing that should not ship is inside, and a real
 * add -> list -> stats round trip works against a throwaway data file.
 */
export function verifyBuild(distDir: string): BuildProblem[] {
  const entry = join(distDir, 'main.js');
  if (!existsSync(entry)) {
    return [{ title: `${entry} not found`, message: 'Run "npm run build" first.' }];
  }

  const problems: BuildProblem[] = [];
  const files = readdirSync(distDir, { recursive: true, encoding: 'utf8' });
  for (const file of files) {
    if (FORBIDDEN_IN_DIST.some((re) => re.test(file))) {
      problems.push({
        title: `Unexpected file in build output: ${file}`,
        message: 'Tests, fixtures, sources and source maps must not ship. Check tsconfig.build.json.',
      });
    }
  }

  const workDir = mkdtempSync(join(tmpdir(), 'golden-path-smoke-'));
  try {
    const run = (...args: string[]): { code: number | null; out: string } => {
      const result = spawnSync(process.execPath, [entry, ...args], {
        encoding: 'utf8',
        env: { ...process.env, TASKS_FILE: join(workDir, 'tasks.json') },
      });
      return { code: result.status, out: `${result.stdout}${result.stderr}` };
    };

    const steps: [string[], (out: string) => boolean][] = [
      [['help'], (out) => out.includes('Usage: tasks')],
      [['add', 'smoke test task'], (out) => out.includes('Added')],
      [['list'], (out) => out.includes('smoke test task')],
      [['stats'], (out) => out.includes('open: 1')],
    ];
    for (const [args, ok] of steps) {
      const { code, out } = run(...args);
      if (code !== 0 || !ok(out)) {
        problems.push({
          title: `Smoke test failed: tasks ${args.join(' ')}`,
          message: `Exit code ${String(code)}. Output:\n${out.trim()}`,
        });
        break;
      }
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }

  return problems;
}
