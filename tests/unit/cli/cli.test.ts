import { describe, expect, it } from 'vitest';
import { USAGE, runCli } from '../../../src/cli/index.ts';
import type { Output } from '../../../src/cli/index.ts';
import { createTestService } from '../../helpers.ts';

function captureOutput(): Output & { lines: string[]; errors: string[] } {
  const lines: string[] = [];
  const errors: string[] = [];
  return {
    lines,
    errors,
    log: (line) => lines.push(line),
    error: (line) => errors.push(line),
  };
}

describe('runCli', () => {
  it('adds, completes, lists and summarizes tasks', async () => {
    const { service } = createTestService();
    const out = captureOutput();

    expect(await runCli(['add', 'write', 'tests'], service, out)).toBe(0);
    expect(await runCli(['add', 'ship'], service, out)).toBe(0);
    expect(await runCli(['done', 't1'], service, out)).toBe(0);
    expect(await runCli(['list', '--all'], service, out)).toBe(0);
    expect(await runCli(['stats'], service, out)).toBe(0);

    expect(out.lines).toEqual([
      'Added t1: write tests',
      'Added t2: ship',
      'Done t1: write tests',
      '[x] t1  write tests',
      '[ ] t2  ship',
      'open: 1  done: 1  total: 2',
    ]);
    expect(out.errors).toEqual([]);
  });

  it('prints usage for help and no arguments', async () => {
    const { service } = createTestService();
    const out = captureOutput();
    expect(await runCli([], service, out)).toBe(0);
    expect(out.lines).toEqual([USAGE]);
  });

  it('returns 1 with a readable message for expected errors', async () => {
    const { service } = createTestService();
    const out = captureOutput();
    expect(await runCli(['done', 'missing'], service, out)).toBe(1);
    expect(await runCli(['add', ' '], service, out)).toBe(1);
    expect(out.errors).toEqual(['No task with id "missing".', 'Task title must not be empty.']);
  });

  it('returns 2 for usage errors', async () => {
    const { service } = createTestService();
    const out = captureOutput();
    expect(await runCli(['done'], service, out)).toBe(2);
    expect(await runCli(['explode'], service, out)).toBe(2);
  });
});
