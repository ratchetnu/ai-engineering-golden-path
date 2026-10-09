import { ALLOW_MARKER, ALLOWED_FILE_NAMES, FORBIDDEN_FILE_NAMES, SECRET_PATTERNS } from './patterns.ts';

export interface ScannedFile {
  readonly path: string;
  readonly text: string;
}

export interface SecretFinding {
  readonly file: string;
  readonly line: number;
  readonly patternId: string;
  readonly description: string;
  /** Never print the full value: the log itself would leak it. */
  readonly preview: string;
}

export function scanFiles(files: readonly ScannedFile[]): SecretFinding[] {
  return files.flatMap(scanFile);
}

export function scanFile(file: ScannedFile): SecretFinding[] {
  const findings: SecretFinding[] = [];

  if (
    FORBIDDEN_FILE_NAMES.some((re) => re.test(file.path)) &&
    !ALLOWED_FILE_NAMES.some((re) => re.test(file.path))
  ) {
    findings.push({
      file: file.path,
      line: 1,
      patternId: 'forbidden-file',
      description: 'This kind of file usually holds credentials and must not be committed',
      preview: file.path,
    });
  }

  file.text.split('\n').forEach((lineText, index) => {
    if (lineText.includes(ALLOW_MARKER)) {
      return;
    }
    for (const pattern of SECRET_PATTERNS) {
      const match = pattern.regex.exec(lineText);
      if (match !== null) {
        findings.push({
          file: file.path,
          line: index + 1,
          patternId: pattern.id,
          description: pattern.description,
          preview: redact(match[0]),
        });
      }
    }
  });

  return findings;
}

export function redact(value: string): string {
  if (value.length <= 8) {
    return '****';
  }
  return `${value.slice(0, 4)}…(${value.length - 4} chars redacted)`;
}

/** Skip binary files: they cannot be scanned line by line. */
export function looksBinary(buffer: Uint8Array): boolean {
  return buffer.subarray(0, 8000).includes(0);
}
