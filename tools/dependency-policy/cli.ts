import { existsSync, readFileSync } from 'node:fs';
import { reportFail, reportPass } from '../shared/report.ts';
import { checkDependencyPolicy } from './check.ts';
import type { DependencyPolicy, Lockfile, PackageManifest } from './check.ts';

const GATE = 'Dependency policy';

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

const manifest = readJson('package.json') as PackageManifest;
const policy = readJson('policy/dependency-policy.json') as DependencyPolicy;
const lockfile = existsSync('package-lock.json') ? (readJson('package-lock.json') as Lockfile) : undefined;

const problems = checkDependencyPolicy(manifest, lockfile, policy);

if (problems.length === 0) {
  const count = Object.keys(lockfile?.packages ?? {}).length - 1;
  reportPass(GATE, `direct dependencies approved, versions pinned, ${count} installed packages have allowed licenses.`);
} else {
  reportFail(GATE, problems.map((p) => ({ file: 'package.json', ...p })));
  process.exitCode = 1;
}
