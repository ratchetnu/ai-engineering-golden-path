# Branch protection settings

The workflows in `.github/workflows/` only *report* results. What actually
blocks a merge is branch protection on `main`, configured in GitHub under
**Settings → Rules → Rulesets** (or **Settings → Branches** for classic
branch protection).

These settings are not stored in the repository, so they are listed here for
whoever sets the repository up.

## Recommended rules for `main`

| Setting | Value | Why |
| --- | --- | --- |
| Require a pull request before merging | On | No direct pushes to `main` |
| Required approvals | 1 or more | Someone other than the author must approve |
| Require review from Code Owners | On | Guardrail files need a maintainer (see `.github/CODEOWNERS`) |
| Dismiss stale approvals when new commits are pushed | On | An approval covers the code that was reviewed, not later changes |
| Require approval of the most recent reviewable push | On | The last person to push cannot be the only approver |
| Require status checks to pass | On | |
| Required checks | `CI result`, `PR description & title` | `CI result` fails if any gate fails |
| Require branches to be up to date before merging | On | Checks run against what will actually be merged |
| Require conversation resolution | On | Review comments cannot be ignored |
| Block force pushes | On | History on `main` is not rewritten |
| Restrict deletions | On | |
| Allow bypass | Nobody (including admins) | The rules apply to everyone |
| Allow auto-merge | **Off** (Settings → General) | A person decides when to merge |

## If the repository has a single maintainer

GitHub never lets a pull request's author approve it. With only one
maintainer, "Required approvals: 1" would block every change, so for a solo
repository use this variant and say so openly rather than pretend a second
reviewer exists:

| Setting | Solo value |
| --- | --- |
| Require a pull request before merging | On (no direct pushes, even for the owner) |
| Required approvals | 0 |
| Require review from Code Owners | Off (the owner cannot approve their own PR) |
| Required checks | `CI result`, `PR description & title` |
| Require branches to be up to date | On |
| Require conversation resolution | On |
| Block force pushes / restrict deletions | On |
| Allow bypass | Nobody |
| Allow auto-merge | Off |

What still holds: every change, including every AI-assisted change, goes
through a pull request, must pass every automated gate, and is merged by a
person who has read it. What does not hold: independent review by a second
person. Switch to the team settings above as soon as there is a second
maintainer.

## Workflow permissions

Under **Settings → Actions → General**:

- **Workflow permissions:** "Read repository contents" (the workflows also
  declare `permissions: contents: read` themselves).
- **Allow GitHub Actions to create and approve pull requests:** off.

## Deployment (if you add it)

This repository stops at a deployment-ready artifact. If you add deployment:

- Use a GitHub **Environment** (e.g. `production`) with **required reviewers**
  and a restriction to the `main` branch.
- Store deployment credentials only on that environment, or better, use OIDC
  so there are no long-lived credentials at all.
- Keep the deploy job separate from the build job, so the artifact that was
  verified is the artifact that is deployed.
