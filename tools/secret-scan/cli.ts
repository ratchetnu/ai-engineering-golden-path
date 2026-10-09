import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { reportFail, reportPass } from '../shared/report.ts';
import { looksBinary, scanFiles } from './scan.ts';
import type { ScannedFile } from './scan.ts';

const GATE = 'Secret scan';
const MAX_BYTES = 1_000_000;

/** Tracked files plus new files that are not ignored: what could be committed next. */
function candidateFiles(): string[] {
  const output = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  });
  return [...new Set(output.split('\0').filter((path) => path !== ''))];
}

const files: ScannedFile[] = [];
for (const path of candidateFiles()) {
  let size: number;
  try {
    size = statSync(path).size;
  } catch {
    continue; // Deleted in the working tree.
  }
  const buffer = readFileSync(path);
  // Forbidden file names are still reported for large or binary files.
  const scannable = size <= MAX_BYTES && !looksBinary(buffer);
  files.push({ path, text: scannable ? buffer.toString('utf8') : '' });
}

const findings = scanFiles(files);

if (findings.length === 0) {
  reportPass(GATE, `${files.length} files checked, no credentials found.`);
} else {
  reportFail(
    GATE,
    findings.map((f) => ({
      file: f.file,
      line: f.line,
      title: `[${f.patternId}] ${f.description}`,
      message: `Found: ${f.preview}\nRemove it, rotate the credential if it was real, and load it from the environment instead. If this is a false positive, add "secret-scan: allow" to the line so a reviewer can see the exception.`,
    })),
  );
  process.exitCode = 1;
}
