/**
 * Small helpers so every gate prints results the same way:
 * a plain-English headline, one line per problem, and (in GitHub Actions)
 * an inline annotation on the offending file.
 */

export interface Finding {
  readonly file?: string;
  readonly line?: number;
  readonly title: string;
  readonly message: string;
}

const inGitHubActions = process.env['GITHUB_ACTIONS'] === 'true';

export function reportPass(gate: string, detail: string): void {
  console.log(`PASS  ${gate}: ${detail}`);
}

export function reportFail(gate: string, findings: readonly Finding[]): void {
  console.error(`FAIL  ${gate}: ${findings.length} problem(s) found\n`);
  findings.forEach((finding, index) => {
    const location =
      finding.file === undefined ? '' : `${finding.file}${finding.line === undefined ? '' : `:${finding.line}`}  `;
    console.error(`  ${index + 1}. ${location}${finding.title}`);
    console.error(`     ${finding.message.replaceAll('\n', '\n     ')}\n`);
    if (inGitHubActions) {
      console.log(annotation(finding));
    }
  });
}

function annotation(finding: Finding): string {
  const props = [
    finding.file === undefined ? undefined : `file=${finding.file}`,
    finding.line === undefined ? undefined : `line=${finding.line}`,
    `title=${escapeProperty(finding.title)}`,
  ].filter((part): part is string => part !== undefined);
  return `::error ${props.join(',')}::${escapeData(finding.message)}`;
}

function escapeData(value: string): string {
  return value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

function escapeProperty(value: string): string {
  return escapeData(value).replaceAll(':', '%3A').replaceAll(',', '%2C');
}
