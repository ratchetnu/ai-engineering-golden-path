# AI-assisted development

This page describes how AI coding assistants fit into this repository's
delivery process. It applies whichever assistant you use.

## The short version

- Use AI as much as it helps.
- Treat everything it produces as a **proposal**, not a decision.
- The pipeline does not know or care who wrote a line of code. Every change
  passes the same checks and the same human review.

## What AI is good for here

| Task | Example |
| --- | --- |
| Proposing changes | "Here's how I'd add a `stats` command." |
| Writing code | A first draft of a function, a refactor, boilerplate |
| Generating tests | Edge cases you hadn't listed; a regression test for a bug report |
| Analysing failures | Reading a CI log and explaining which rule failed and why |
| Explaining code | Summarising an unfamiliar module before you change it |
| Reviewing | A second pass that flags possible bugs for a human to judge |

## What AI is not

**Not authoritative.** An assistant can be fluent and wrong at the same time.
It may:

- invent an API, option or package that does not exist;
- solve the literal request while ignoring a team decision it was never told
  about (see the [example failure](examples/ai-generated-violation.md));
- write tests that check what the code *does* rather than what it *should*
  do, so a bug and its test agree with each other;
- "fix" a failing check by weakening the check.

None of these are unusual for a human contributor either. The difference is
speed and volume: AI produces plausible code faster than people can review it
carefully, so the automatic checks matter more, not less.

## What every change must pass

Regardless of author:

1. **Deterministic validation** — lint, strict type checking, dependency
   policy, secret scan. Same input, same answer, every time.
2. **Tests** — existing tests must still pass; new behaviour needs new tests;
   bug fixes need a regression test.
3. **Architecture rules** — the fitness functions in `tests/architecture/` and
   `tools/architecture/`.
4. **Human review** — a code owner approves. The reviewer is responsible for
   the change being *right*, not just *passing*.

## Rules for working with an assistant in this repository

1. **You own what you submit.** If you open a PR, you must understand every
   line, whether you typed it or not. "The AI wrote it" is not an explanation
   in review.
2. **Disclose the level of assistance** using the tick-box in the PR template.
   This is not a penalty; it tells the reviewer where to look harder (for
   example, at generated tests).
3. **Never let an assistant edit the guardrails to make CI pass.** Changes to
   `tools/`, `policy/`, `.github/`, `eslint.config.js`, `tsconfig*.json` or
   `vitest.config.ts` need a written justification and code-owner approval.
   PR validation enforces the justification; `CODEOWNERS` enforces the
   approval.
4. **Read generated tests critically.** Ask: would this test fail if the code
   were wrong? A quick way to check is to break the code on purpose and run
   the test.
5. **Do not paste secrets, customer data or private code into an assistant**
   that is not approved for that data.
6. **Run `npm run verify` before pushing.** It runs the same gates as CI and
   gives the assistant concrete, deterministic feedback to iterate on.

## Why deterministic checks pair well with AI

An AI assistant is good at producing candidates and bad at knowing whether a
candidate is acceptable. Deterministic checks are the opposite: they cannot
write anything, but they give a reliable yes or no.

Putting them together gives a useful loop:

```
assistant proposes → checks say exactly what is wrong → assistant (or person) fixes → checks pass → human reviews
```

The error messages in this repository are written for that loop: each one says
which rule failed, where, and how to fix it. That helps a person and an AI
assistant equally.

## What this repository deliberately does not do

- It does not let any automated actor, AI or otherwise, approve or merge.
- It does not auto-deploy.
- It does not try to detect whether code "looks AI-generated". That is
  unreliable and beside the point: the checks apply to everything.
