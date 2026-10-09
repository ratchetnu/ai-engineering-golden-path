/**
 * Release readiness answers one question: "Is this exact commit fit to be
 * handed to whoever approves a deployment?" It does not deploy anything.
 */

export interface ReleaseFacts {
  readonly version: string;
  readonly changelog: string;
  readonly gitStatusPorcelain: string;
  readonly existingTags: readonly string[];
  readonly currentBranch: string;
  readonly releaseBranch: string;
  readonly buildProblems: readonly string[];
}

export interface ReleaseCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

export function evaluateRelease(facts: ReleaseFacts): ReleaseCheck[] {
  const tag = `v${facts.version}`;
  const changelogHeading = new RegExp(`^## \\[${escapeRegExp(facts.version)}\\]`, 'm');

  return [
    {
      name: 'Version is valid semantic versioning',
      passed: SEMVER.test(facts.version),
      detail: `package.json version is "${facts.version}"`,
    },
    {
      name: 'Version has not been released before',
      passed: !facts.existingTags.includes(tag),
      detail: facts.existingTags.includes(tag) ? `tag ${tag} already exists - bump the version` : `tag ${tag} is free`,
    },
    {
      name: 'CHANGELOG.md describes this version',
      passed: changelogHeading.test(facts.changelog),
      detail: changelogHeading.test(facts.changelog)
        ? `found "## [${facts.version}]"`
        : `add a "## [${facts.version}] - YYYY-MM-DD" section to CHANGELOG.md`,
    },
    {
      name: 'Working tree is clean',
      passed: facts.gitStatusPorcelain.trim() === '',
      detail:
        facts.gitStatusPorcelain.trim() === ''
          ? 'the artifact will match the commit exactly'
          : 'uncommitted changes would make the artifact differ from the reviewed commit',
    },
    {
      name: `Built from the ${facts.releaseBranch} branch`,
      passed: facts.currentBranch === facts.releaseBranch,
      detail: `current branch is "${facts.currentBranch}" - releases come only from reviewed, merged code`,
    },
    {
      name: 'Build output verified',
      passed: facts.buildProblems.length === 0,
      detail: facts.buildProblems.length === 0 ? 'dist/ passed build verification' : facts.buildProblems.join('; '),
    },
  ];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
