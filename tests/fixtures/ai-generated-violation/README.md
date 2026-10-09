# REJECTED EXAMPLE - intentionally wrong code

**Do not copy anything from this folder.**

`src/cli/cli.ts` here is a representative AI-style change, written for this
repository to demonstrate the architecture check. The request was "add a
`stats` command that shows how many tasks are open and done". The code reads
the task file directly from the CLI instead of going through the service
layer, which breaks the rule in
[ADR-0001](../../../docs/adr/0001-single-persistence-module.md).

CI rejected it. It was never merged into `src/`. The accepted implementation
is `src/cli/cli.ts` plus `TaskService.stats()`.

It is kept so the test suite can prove the check still catches it:

- Excluded from lint, typecheck and the build.
- Read only by `tests/architecture/ai-generated-violation.test.ts` and
  `npm run demo:ai-violation`.
- Walkthrough: [`docs/examples/ai-generated-violation.md`](../../../docs/examples/ai-generated-violation.md).
