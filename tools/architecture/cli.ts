import { resolve } from 'node:path';
import { readFlag } from '../shared/args.ts';
import { reportFail, reportPass } from '../shared/report.ts';
import { checkArchitecture, readSourceFiles } from './check.ts';

const GATE = 'Architecture rules';
const rootDir = resolve(readFlag(process.argv, 'root') ?? '.');

const violations = checkArchitecture(rootDir);

if (violations.length === 0) {
  reportPass(GATE, `${readSourceFiles(rootDir).length} source files checked, no violations.`);
} else {
  reportFail(
    GATE,
    violations.map((v) => ({
      file: v.file,
      line: v.line,
      title: `[${v.rule}] ${v.importPath === '' ? v.file : `import "${v.importPath}"`}`,
      message: `${v.message}\nHow to fix: ${v.fix}`,
    })),
  );
  process.exitCode = 1;
}
