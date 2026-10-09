import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readFlag } from '../shared/args.ts';
import { reportFail, reportPass } from '../shared/report.ts';
import { validatePullRequest } from './validate.ts';

/*
 * In CI the title and body arrive through environment variables, never by
 * pasting ${{ github.event.pull_request.title }} into a shell command, which
 * would let a crafted PR title run commands on the runner.
 *
 * Locally:  npm run check:pr -- --title "feat: x" --body-file body.md --base main
 */
const GATE = 'PR validation';
const argv = process.argv;

const title = readFlag(argv, 'title') ?? process.env['PR_TITLE'] ?? '';
const bodyFile = readFlag(argv, 'body-file');
const body = bodyFile === undefined ? (process.env['PR_BODY'] ?? '') : readFileSync(bodyFile, 'utf8');
const base = readFlag(argv, 'base') ?? process.env['PR_BASE_SHA'];
const head = readFlag(argv, 'head') ?? process.env['PR_HEAD_SHA'] ?? 'HEAD';

const changedFiles =
  base === undefined
    ? []
    : execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { encoding: 'utf8' })
        .split('\n')
        .filter((line) => line !== '');

const problems = validatePullRequest({ title, body, changedFiles });

if (problems.length === 0) {
  reportPass(GATE, `title and description are complete (${changedFiles.length} changed files considered).`);
} else {
  reportFail(GATE, problems);
  process.exitCode = 1;
}
