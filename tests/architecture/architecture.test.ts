/**
 * Architectural fitness functions.
 *
 * We don't just tell developers to follow these rules. The repository checks
 * them automatically on every pull request, and CI fails if one is broken.
 */
import { describe, expect, it } from 'vitest';
import { checkArchitecture, checkFiles, findImports } from '../../tools/architecture/check.ts';
import type { SourceFile } from '../../tools/architecture/check.ts';

const file = (path: string, ...imports: string[]): SourceFile => ({
  path,
  text: imports.map((specifier) => `import { x } from '${specifier}';`).join('\n'),
});

describe('the real codebase', () => {
  it('follows every architecture rule', () => {
    const violations = checkArchitecture('.');
    // On failure, print the readable explanation rather than a raw diff.
    expect(violations.map((v) => `${v.file}:${v.line} [${v.rule}] ${v.message}`)).toEqual([]);
  });
});

describe('rule: only persistence may access storage', () => {
  it.each(['src/cli/cli.ts', 'src/services/taskService.ts', 'src/domain/task.ts'])(
    'fails when %s imports node:fs',
    (path) => {
      const violations = checkFiles([file(path, 'node:fs')]);
      expect(violations).toMatchObject([{ rule: 'storage-access', file: path, importPath: 'node:fs' }]);
    },
  );

  it.each(['fs', 'fs/promises', 'node:fs/promises', 'node:sqlite'])('treats %s as storage', (specifier) => {
    expect(checkFiles([file('src/services/x.ts', specifier)])).toMatchObject([{ rule: 'storage-access' }]);
  });

  it('allows persistence to use node:fs', () => {
    expect(checkFiles([file('src/persistence/fileTaskStore.ts', 'node:fs/promises')])).toEqual([]);
  });

  it('catches require() and dynamic import(), not only import statements', () => {
    const sneaky: SourceFile = {
      path: 'src/cli/cli.ts',
      text: "const fs = require('fs');\nconst later = await import('node:fs/promises');",
    };
    expect(checkFiles([sneaky]).map((v) => v.line)).toEqual([1, 2]);
  });
});

describe('rule: layers only depend in the allowed direction', () => {
  it('fails when the CLI imports persistence directly', () => {
    expect(checkFiles([file('src/cli/cli.ts', '../persistence/index.ts')])).toMatchObject([
      { rule: 'layer-dependency', importPath: '../persistence/index.ts' },
    ]);
  });

  it('fails when the domain imports anything from another layer', () => {
    expect(checkFiles([file('src/domain/task.ts', '../services/index.ts')])).toMatchObject([
      { rule: 'layer-dependency' },
    ]);
  });

  it('allows services to use persistence and domain through their public entries', () => {
    expect(
      checkFiles([file('src/services/taskService.ts', '../persistence/index.ts', '../domain/index.ts', '../domain')]),
    ).toEqual([]);
  });

  it('allows the composition root to wire everything together', () => {
    expect(
      checkFiles([file('src/main.ts', './cli/index.ts', './persistence/index.ts', './services/index.ts')]),
    ).toEqual([]);
  });
});

describe('rule: import other layers through their index.ts', () => {
  it('fails on a deep import into another layer', () => {
    expect(checkFiles([file('src/services/taskService.ts', '../persistence/fileTaskStore.ts')])).toMatchObject([
      { rule: 'public-entry' },
    ]);
  });

  it('allows deep imports inside the same layer', () => {
    expect(checkFiles([file('src/persistence/index.ts', './fileTaskStore.ts')])).toEqual([]);
  });
});

describe('rule: every file belongs to a layer', () => {
  it('fails for a file outside any known layer', () => {
    expect(checkFiles([file('src/utils/helpers.ts')])).toMatchObject([{ rule: 'unassigned-file' }]);
  });
});

describe('findImports', () => {
  it('reports the line number of each import', () => {
    expect(findImports("// comment\nimport a from 'a';\n\nexport * from './b.ts';")).toEqual([
      { specifier: 'a', line: 2 },
      { specifier: './b.ts', line: 4 },
    ]);
  });
});
