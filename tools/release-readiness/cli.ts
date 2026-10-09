import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasFlag, readFlag } from '../shared/args.ts';
import { verifyBuild } from '../build-verification/verify.ts';
import { evaluateRelease } from './check.ts';

/*
 * Usage: npm run release:check [-- --allow-dirty --allow-branch]
 *
 * Writes release/release-manifest.json describing the artifact. Promotion to
 * any environment is a separate, human-approved step that this repository
 * deliberately does not automate.
 */
const argv = process.argv;
const git = (...args: string[]): string => execFileSync('git', args, { encoding: 'utf8' }).trim();

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { name: string; version: string };
const releaseBranch = readFlag(argv, 'release-branch') ?? 'main';
const currentBranch = process.env['GITHUB_REF_NAME'] ?? git('rev-parse', '--abbrev-ref', 'HEAD');

const checks = evaluateRelease({
  version: pkg.version,
  changelog: readFileSync('CHANGELOG.md', 'utf8'),
  gitStatusPorcelain: hasFlag(argv, 'allow-dirty') ? '' : git('status', '--porcelain'),
  existingTags: git('tag', '--list').split('\n').filter((t) => t !== ''),
  currentBranch: hasFlag(argv, 'allow-branch') ? releaseBranch : currentBranch,
  releaseBranch,
  buildProblems: verifyBuild('dist').map((p) => p.title),
});

console.log(`Release readiness for ${pkg.name}@${pkg.version}\n`);
for (const check of checks) {
  console.log(`  ${check.passed ? 'PASS' : 'FAIL'}  ${check.name}\n        ${check.detail}`);
}

const ready = checks.every((check) => check.passed);
if (!ready) {
  console.error('\nNOT READY: fix the failing checks above. Nothing was produced.');
  process.exitCode = 1;
} else {
  const files = readdirSync('dist', { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.js'))
    .sort();
  const manifest = {
    name: pkg.name,
    version: pkg.version,
    commit: git('rev-parse', 'HEAD'),
    builtAt: new Date().toISOString(),
    node: process.version,
    files: files.map((file) => ({
      path: `dist/${file.split('\\').join('/')}`,
      sha256: createHash('sha256').update(readFileSync(join('dist', file))).digest('hex'),
    })),
    checks,
    promotion: 'Not performed. Deploying this artifact requires a separate, human-approved step.',
  };
  mkdirSync('release', { recursive: true });
  writeFileSync('release/release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('\nREADY: release/release-manifest.json written. This is a deployment-ready artifact, not a deployment.');
}
