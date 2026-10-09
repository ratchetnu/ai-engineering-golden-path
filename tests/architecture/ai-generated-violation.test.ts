/**
 * Example failure: a representative AI-style change, written for this
 * repository, that adds a "stats" command by reading the task file directly
 * from the CLI.
 *
 * The code works, its own tests would pass, and it looks reasonable in a
 * quick review. It still breaks a team decision, so the pipeline rejects it.
 *
 * The rejected code is frozen in tests/fixtures/ai-generated-violation.
 * The accepted version is src/cli/cli.ts + TaskService.stats().
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkArchitecture } from '../../tools/architecture/check.ts';

const FIXTURE = 'tests/fixtures/ai-generated-violation';

describe('AI-generated change: CLI reads storage directly', () => {
  const violations = checkArchitecture(FIXTURE);

  it('is rejected by the storage-access rule', () => {
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      rule: 'storage-access',
      file: 'src/cli/cli.ts',
      line: 12, // after the REJECTED banner; line 1 in the proposed change
      importPath: 'node:fs',
    });
  });

  it('tells the author how to fix it', () => {
    expect(violations[0]?.fix).toContain('src/services');
  });

  it('is clearly labelled as a rejected example for anyone browsing the repository', () => {
    const text = readFileSync(`${FIXTURE}/src/cli/cli.ts`, 'utf8');
    expect(text.startsWith('// ====')).toBe(true);
    expect(text).toContain('REJECTED EXAMPLE - DO NOT COPY');
  });
});
