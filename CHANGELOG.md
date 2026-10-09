# Changelog

All notable changes are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-09

### Added
- Task-list CLI (`add`, `done`, `list`, `stats`) as a deliberately simple example application.
- CI gates: lint, strict typecheck, architecture rules, dependency policy, secret scan, tests, build verification.
- Architectural fitness function: only `src/persistence` may access storage.
- PR validation, release-readiness check, CODEOWNERS, PR template, Dependabot config.
- Worked example of an AI-generated change rejected by the architecture check.
