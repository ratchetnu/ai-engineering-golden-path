# ADR-0001: Only the persistence layer accesses storage

- **Status:** Accepted
- **Date:** 2026-10-09
- **Note:** Example decision record for this reference project.

## Context

Tasks are stored in a JSON file today. Several parts of the code need task
data: the CLI, the use cases, and future features such as reports.

If each part reads the file itself, the file format and location get copied
around the codebase. Validation of the stored data happens in some places and
not others. Moving to a database later would mean finding and changing every
copy. Tests for business logic would need real files on disk.

## Decision

1. All storage access lives in `src/persistence/`.
2. The rest of the code depends on the `TaskStore` interface, not on the
   file system.
3. The rule is enforced automatically by the architecture check
   (`storage-access` rule in `tools/architecture/rules.ts`), which runs in CI
   on every pull request.

## Consequences

**Good**

- Storage can change (file → SQLite → remote database) by changing one folder.
- Services and the CLI are tested with `InMemoryTaskStore`: fast, no disk.
- Stored data is validated in exactly one place (`FileTaskStore.load`).
- The rule does not depend on every contributor, human or AI, remembering it.

**Costs**

- Small features (like a `stats` command) need a service method instead of a
  three-line file read. This is a little more code.
- The checker only recognises the modules listed as storage; new storage
  libraries must be added to the list.

## How we know it holds

`tests/architecture/architecture.test.ts` checks the real codebase on every
CI run. `tests/architecture/ai-generated-violation.test.ts` keeps a real
example of a violating change and proves it is still rejected.
