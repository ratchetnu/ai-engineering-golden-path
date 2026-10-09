/**
 * PR validation: checks that a pull request carries the information a
 * reviewer needs. It does not judge the code - the other gates and the
 * human reviewer do that.
 */

export interface PullRequestInput {
  readonly title: string;
  readonly body: string;
  readonly changedFiles: readonly string[];
}

export interface PrProblem {
  readonly title: string;
  readonly message: string;
}

export const TITLE_PATTERN =
  /^(feat|fix|docs|test|refactor|perf|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: \S.{3,70}$/;

export const REQUIRED_SECTIONS = [
  '## What changed',
  '## Why',
  '## How it was verified',
  '## AI assistance',
] as const;

/**
 * Files that define the guardrails themselves. Changing them changes the rules
 * for everyone, so the PR must explain why (and CODEOWNERS requires a
 * maintainer to approve).
 */
export const GUARDRAIL_PATHS: readonly RegExp[] = [
  /^tools\//,
  /^policy\//,
  /^\.github\//,
  /^eslint\.config\.js$/,
  /^tsconfig(\.[a-z]+)?\.json$/,
  /^vitest\.config\.ts$/,
];

export const GUARDRAIL_SECTION = '## Guardrail change justification';

const PLACEHOLDER = /^\s*$/;

export function validatePullRequest(pr: PullRequestInput): PrProblem[] {
  const problems: PrProblem[] = [];
  // Template hints live in HTML comments; they never count as content.
  const body = pr.body.replace(/<!--[\s\S]*?-->/g, '');

  if (!TITLE_PATTERN.test(pr.title)) {
    problems.push({
      title: `Title "${pr.title}" does not follow the convention`,
      message: 'Use "type(optional-scope): summary", for example "feat(cli): add stats command". Types: feat, fix, docs, test, refactor, perf, build, ci, chore, revert.',
    });
  }

  for (const heading of REQUIRED_SECTIONS) {
    const content = sectionContent(body, heading);
    if (content === undefined) {
      problems.push({
        title: `Missing section "${heading}"`,
        message: 'Use the pull request template (.github/pull_request_template.md).',
      });
    } else if (PLACEHOLDER.test(content)) {
      problems.push({
        title: `Section "${heading}" is empty`,
        message: 'Fill it in. Reviewers rely on it to understand the change.',
      });
    }
  }

  const ai = sectionContent(body, '## AI assistance');
  if (ai !== undefined) {
    const checked = (ai.match(/^\s*- \[[xX]\]/gm) ?? []).length;
    if (checked !== 1) {
      problems.push({
        title: 'AI assistance: tick exactly one box',
        message: `Found ${checked} ticked. Saying how a change was produced is not a judgement; it tells the reviewer where to look harder.`,
      });
    }
  }

  const guardrailFiles = pr.changedFiles.filter((file) => GUARDRAIL_PATHS.some((re) => re.test(file)));
  if (guardrailFiles.length > 0) {
    const justification = sectionContent(body, GUARDRAIL_SECTION);
    if (justification === undefined || PLACEHOLDER.test(justification)) {
      problems.push({
        title: 'This PR changes the guardrails but does not explain why',
        message: `Changed: ${guardrailFiles.join(', ')}.\nAdd a "${GUARDRAIL_SECTION}" section. A maintainer listed in CODEOWNERS must approve.`,
      });
    }
  }

  return problems;
}

/** Returns the text under a "## Heading" up to the next "## ", or undefined. */
export function sectionContent(body: string, heading: string): string | undefined {
  const lines = body.replaceAll('\r\n', '\n').split('\n');
  const start = lines.findIndex((line) => line.trim().toLowerCase() === heading.toLowerCase());
  if (start === -1) {
    return undefined;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}
