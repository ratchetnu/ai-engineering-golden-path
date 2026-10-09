# Example: AI-style code that breaks an architecture rule

This is a worked example of the pipeline doing its job.

> **This change was rejected and never merged.** It is a representative
> AI-style change, written for this repository to show what the checks catch.
> It is not a record of a real incident. The gate results below come from
> running this repository's real checks against it.

## 1. The request

> Add a `stats` command that shows how many tasks are open and done.

## 2. The proposed change (rejected)

```diff
--- a/src/cli/cli.ts
+++ b/src/cli/cli.ts
@@ -1,3 +1,5 @@
+import { readFileSync } from 'node:fs';
+import { join } from 'node:path';
 import { ValidationError } from '../domain/index.ts';
 import type { Task } from '../domain/index.ts';
 import { TaskNotFoundError } from '../services/index.ts';
@@ -54,8 +56,11 @@ export async function runCli(
         return 0;
       }
       case 'stats': {
-        const stats = await service.stats();
-        out.log(`open: ${stats.open}  done: ${stats.done}  total: ${stats.total}`);
+        // Read the file directly: simpler than going through the service.
+        const file = process.env['TASKS_FILE'] ?? join(process.cwd(), '.tasks.json');
+        const tasks = JSON.parse(readFileSync(file, 'utf8')) as Task[];
+        const done = tasks.filter((t) => t.completedAt !== null).length;
+        out.log(`open: ${tasks.length - done}  done: ${done}  total: ${tasks.length}`);
         return 0;
       }
```

(The diff is shown against today's `src/cli/cli.ts`, which contains the
accepted version, so you can compare the two directly. The file is also in
[`ai-generated-violation.diff`](ai-generated-violation.diff), and the whole
rejected file is frozen in
[`tests/fixtures/ai-generated-violation/src/cli/cli.ts`](../../tests/fixtures/ai-generated-violation/src/cli/cli.ts).)

At a glance this looks fine. It is short, the comment explains the choice, the
types line up, and it does produce the right numbers.

## 3. What each gate said

| Gate | Result | Notes |
| --- | --- | --- |
| Lint | ✅ pass | Nothing stylistically wrong |
| Strict typecheck | ✅ pass | The `as Task[]` cast satisfies the compiler |
| Dependency policy | ✅ pass | `node:fs` is built in, not a new package |
| Build + smoke test | ✅ pass | `help → add → list → stats` worked against the real compiled program |
| **Architecture rules** | ❌ **fail** | See below |
| Unit tests | ❌ fail | The existing CLI test uses an in-memory store, so the direct file read crashed with `ENOENT` |

The architecture check's output:

```
$ npm run check:architecture

FAIL  Architecture rules: 1 problem(s) found

  1. src/cli/cli.ts:1  [storage-access] import "node:fs"
     Only persistence may access storage directly. The cli layer imports "node:fs".
     How to fix: Add or reuse a method on a service (src/services) that goes through
     the TaskStore interface in src/persistence, and call that instead.
```

In CI this also appears as an inline annotation on line 1 of the changed file.
(`npm run demo:ai-violation` reports line 12 instead, because the frozen copy
starts with an 11-line "REJECTED EXAMPLE" banner.)

### Why the architecture check is the one that matters

The unit test also failed here, but only by luck: the existing CLI test
happened to exercise `stats`. If the author had written the `stats` command
*and* a test that sets up a real temporary file (a very natural thing to do),
every test would have passed. The architecture rule does not depend on what
tests exist. It checks the decision itself, every time.

Also note the build smoke test **passed**. The feature works. This is the
important lesson: *working code is not the same as acceptable code.*

## 4. Why the rule is right here

The proposed code:

- **duplicates the storage format and location** in the CLI (`.tasks.json`,
  the `TASKS_FILE` variable, the JSON layout);
- **skips validation** — `FileTaskStore.load()` checks the file's shape and
  reports corruption clearly; the CLI version trusts whatever is there;
- **breaks when storage changes** — moving to SQLite would silently break
  `stats` while everything else kept working;
- **is hard to test** — it needs a real file on disk instead of the in-memory
  store every other test uses.

None of this was in the request, and the assistant had no way to know the
team's decision ([ADR-0001](../adr/0001-single-persistence-module.md)). The
check did.

## 5. The accepted fix

The fix goes through the layers:

```ts
// src/domain/task.ts — a pure business rule
export function summarize(tasks: readonly Task[]): TaskStats {
  const open = tasks.filter(isOpen).length;
  return { open, done: tasks.length - open, total: tasks.length };
}

// src/services/taskService.ts — a use case, storage through the interface
async stats(): Promise<TaskStats> {
  return summarize(await this.#store.load());
}

// src/cli/cli.ts — the CLI only talks to the service
case 'stats': {
  const stats = await service.stats();
  out.log(`open: ${stats.open}  done: ${stats.done}  total: ${stats.total}`);
  return 0;
}
```

Each piece has a unit test (`tests/unit/domain/task.test.ts`,
`tests/unit/services/taskService.test.ts`, `tests/unit/cli/cli.test.ts`).

A good follow-up for the AI assistant: paste the architecture check's output
back into it. The message names the rule, the file, the line and the fix, so
it usually produces the correct version on the next attempt. The checks give
the assistant concrete, reliable feedback; the human reviewer still decides.

## 6. Keeping it caught

`tests/architecture/ai-generated-violation.test.ts` runs the checker against
the frozen fixture on every CI run and asserts it is still rejected with the
`storage-access` rule. If someone weakens the rule, that test fails.

Try it yourself:

```bash
npm run demo:ai-violation   # exits with code 1: that is the point
```
