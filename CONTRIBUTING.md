# Contributing

Thanks for helping. This repository is about *how* changes get in, so the
process is the point.

## The path for every change

1. Open or pick an issue describing what is needed and why.
2. Create a branch from `main`.
3. Make the change. Using an AI assistant is fine; read
   [docs/ai-assisted-development.md](docs/ai-assisted-development.md) first.
4. Run everything CI will run:

   ```bash
   npm ci
   npm run verify
   ```

5. Open a pull request using the template. Fill in every section and tick one
   AI-assistance box.
6. Wait for all CI gates to go green, then for a code owner's approval.
7. A maintainer merges. There is no auto-merge.

## Commit and PR titles

Use [Conventional Commits](https://www.conventionalcommits.org/):
`type(optional-scope): summary`, for example `feat(cli): add stats command`
or `fix(persistence): handle empty file`.

## Fixing a bug

Write a test that reproduces the bug first and watch it fail. Then fix it. Put
it in `tests/regression/` with an ID (`reg-002-…`) and a short comment saying
what went wrong.

## Adding a dependency

Add it with `npm install --save-exact`, add the name to
`policy/dependency-policy.json`, and explain in the PR why it is needed and
why existing code or the standard library isn't enough.

## Changing a guardrail

Anything in `tools/`, `policy/`, `.github/`, `eslint.config.js`,
`tsconfig*.json` or `vitest.config.ts` changes the rules for everyone. Add a
`## Guardrail change justification` section to the PR. A code owner must
approve. Never change a guardrail just to get your own feature through CI.
