import { describe, expect, it } from 'vitest';
import { checkDependencyPolicy, isLicenseAllowed } from '../../tools/dependency-policy/check.ts';
import type { DependencyPolicy, Lockfile } from '../../tools/dependency-policy/check.ts';

const policy: DependencyPolicy = {
  dependencies: { allowed: [] },
  devDependencies: { allowed: ['vitest'] },
  requireExactVersions: true,
  allowedLicenses: ['MIT', 'Apache-2.0'],
  devOnlyLicenses: { licenses: ['MPL-2.0'] },
  deniedPackages: ['event-stream'],
};

const lockfileFor = (devDependencies: Record<string, string>, extra: Lockfile['packages'] = {}): Lockfile => ({
  lockfileVersion: 3,
  packages: {
    '': { devDependencies },
    'node_modules/vitest': { version: '5.0.3', license: 'MIT', dev: true },
    ...extra,
  },
});

describe('dependency policy', () => {
  it('passes for an approved, pinned dependency', () => {
    const deps = { vitest: '5.0.3' };
    expect(checkDependencyPolicy({ devDependencies: deps }, lockfileFor(deps), policy)).toEqual([]);
  });

  it('rejects a package that is not on the allow list', () => {
    const deps = { vitest: '5.0.3', 'left-pad': '1.3.0' };
    const titles = checkDependencyPolicy({ devDependencies: deps }, lockfileFor(deps), policy).map((p) => p.title);
    expect(titles).toContain('Unapproved package "left-pad" in devDependencies');
  });

  it('rejects version ranges', () => {
    const deps = { vitest: '^5.0.3' };
    const titles = checkDependencyPolicy({ devDependencies: deps }, lockfileFor(deps), policy).map((p) => p.title);
    expect(titles).toContain('"vitest" uses a version range ("^5.0.3")');
  });

  it('rejects a missing or stale lockfile', () => {
    const deps = { vitest: '5.0.3' };
    expect(checkDependencyPolicy({ devDependencies: deps }, undefined, policy)).toMatchObject([
      { title: 'package-lock.json is missing' },
    ]);
    expect(checkDependencyPolicy({ devDependencies: deps }, lockfileFor({ vitest: '5.0.2' }), policy)).toMatchObject([
      { title: 'package-lock.json is out of date for "vitest"' },
    ]);
  });

  it('rejects denied packages anywhere in the tree', () => {
    const deps = { vitest: '5.0.3' };
    const lock = lockfileFor(deps, { 'node_modules/a/node_modules/event-stream': { license: 'MIT', dev: true } });
    expect(checkDependencyPolicy({ devDependencies: deps }, lock, policy)).toMatchObject([
      { title: 'Denied package "event-stream" is in the dependency tree' },
    ]);
  });

  it('allows dev-only licenses for dev tools but not for shipped code', () => {
    const deps = { vitest: '5.0.3' };
    const devTool = lockfileFor(deps, { 'node_modules/x': { version: '1.0.0', license: 'MPL-2.0', dev: true } });
    const shipped = lockfileFor(deps, { 'node_modules/x': { version: '1.0.0', license: 'MPL-2.0' } });
    expect(checkDependencyPolicy({ devDependencies: deps }, devTool, policy)).toEqual([]);
    expect(checkDependencyPolicy({ devDependencies: deps }, shipped, policy)).toHaveLength(1);
  });

  it('understands simple SPDX expressions', () => {
    expect(isLicenseAllowed('(MIT OR GPL-3.0)', ['MIT'])).toBe(true);
    expect(isLicenseAllowed('MIT AND GPL-3.0', ['MIT'])).toBe(false);
    expect(isLicenseAllowed(undefined, ['MIT'])).toBe(false);
  });
});
