import { describe, expect, it } from 'vitest';
import { sectionContent, validatePullRequest } from '../../tools/pr-validation/validate.ts';

const goodBody = `## What changed
Added a stats command.

## Why
Users asked for a quick overview.

## How it was verified
npm run verify, plus manual run of "tasks stats".

## AI assistance
- [ ] None
- [x] AI-assisted: suggestions or partial code, reviewed and edited by me
- [ ] AI-generated: most of the diff was generated
`;

describe('PR validation', () => {
  it('accepts a complete pull request', () => {
    expect(validatePullRequest({ title: 'feat(cli): add stats command', body: goodBody, changedFiles: ['src/cli/cli.ts'] })).toEqual([]);
  });

  it.each(['Add stats', 'feat: x', 'feature: add stats command', 'feat(CLI): add stats command'])(
    'rejects the title %j',
    (title) => {
      expect(validatePullRequest({ title, body: goodBody, changedFiles: [] })[0]?.title).toContain('does not follow');
    },
  );

  it('rejects missing and empty sections', () => {
    const body = goodBody.replace(/## Why\n.*\n/, '').replace('npm run verify, plus manual run of "tasks stats".', '<!-- how? -->');
    const titles = validatePullRequest({ title: 'feat: add stats command', body, changedFiles: [] }).map((p) => p.title);
    expect(titles).toEqual(['Missing section "## Why"', 'Section "## How it was verified" is empty']);
  });

  it('requires exactly one AI-assistance box to be ticked', () => {
    const body = goodBody.replace('- [ ] None', '- [x] None');
    expect(validatePullRequest({ title: 'feat: add stats command', body, changedFiles: [] })).toMatchObject([
      { title: 'AI assistance: tick exactly one box' },
    ]);
  });

  it('requires a justification when the guardrails themselves change', () => {
    const input = { title: 'chore: relax rule', body: goodBody, changedFiles: ['tools/architecture/rules.ts'] };
    expect(validatePullRequest(input)).toMatchObject([
      { title: 'This PR changes the guardrails but does not explain why' },
    ]);
    const justified = `${goodBody}\n## Guardrail change justification\nNew layer for HTTP adapter, approved in ADR-0002.\n`;
    expect(validatePullRequest({ ...input, body: justified })).toEqual([]);
  });

  it('ignores template hints inside HTML comments', () => {
    const commentedOut = `${goodBody}\n<!--\n## Guardrail change justification\nExplain why.\n-->\n`;
    expect(
      validatePullRequest({ title: 'ci: tweak', body: commentedOut, changedFiles: ['.github/workflows/ci.yml'] }),
    ).toMatchObject([{ title: 'This PR changes the guardrails but does not explain why' }]);
  });

  it('reads the content under a heading', () => {
    expect(sectionContent('## A\none\n## B\ntwo', '## A')).toBe('one');
    expect(sectionContent('## A\none', '## C')).toBeUndefined();
  });
});
