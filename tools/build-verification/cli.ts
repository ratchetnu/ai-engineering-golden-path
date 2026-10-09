import { reportFail, reportPass } from '../shared/report.ts';
import { verifyBuild } from './verify.ts';

const GATE = 'Build verification';
const problems = verifyBuild('dist');

if (problems.length === 0) {
  reportPass(GATE, 'dist/ contains only shippable files and the smoke test (help, add, list, stats) passed.');
} else {
  reportFail(GATE, problems);
  process.exitCode = 1;
}
