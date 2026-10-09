import { describe, expect, it } from 'vitest';
import { evaluateRelease } from '../../tools/release-readiness/check.ts';
import type { ReleaseFacts } from '../../tools/release-readiness/check.ts';

const ready: ReleaseFacts = {
  version: '1.2.0',
  changelog: '# Changelog\n\n## [1.2.0] - 2026-02-01\n- Added stats\n',
  gitStatusPorcelain: '',
  existingTags: ['v1.1.0'],
  currentBranch: 'main',
  releaseBranch: 'main',
  buildProblems: [],
};

const failing = (facts: ReleaseFacts): string[] =>
  evaluateRelease(facts)
    .filter((check) => !check.passed)
    .map((check) => check.name);

describe('release readiness', () => {
  it('passes when everything is in order', () => {
    expect(failing(ready)).toEqual([]);
  });

  it.each<[string, Partial<ReleaseFacts>]>([
    ['Version is valid semantic versioning', { version: '1.2', changelog: '## [1.2]' }],
    ['Version has not been released before', { existingTags: ['v1.2.0'] }],
    ['CHANGELOG.md describes this version', { changelog: '## [1.1.0]' }],
    ['Working tree is clean', { gitStatusPorcelain: ' M src/main.ts' }],
    ['Built from the main branch', { currentBranch: 'feature/x' }],
    ['Build output verified', { buildProblems: ['dist/main.js not found'] }],
  ])('fails "%s"', (name, change) => {
    expect(failing({ ...ready, ...change })).toEqual([name]);
  });
});
