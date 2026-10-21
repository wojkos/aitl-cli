---
title: Set up PR CI checks — build, lint, unit tests
date: 2026-10-21
agent: Claude Code / claude-opus-5-5 (cezar task 43251ab7)
trigger: user request — "for every pull request: build check, lint check, unit test framework for TypeScript"; later /om-setup-agent-pipeline re-run
branch: cez/43251ab7
spec: .ai/specs/implemented/2026-10-21-ci-lint-and-test-checks.md
status: done
---

# Set up PR CI checks — build, lint, unit tests

## Objective
Separate build, lint and unit-test checks on every PR. Done = checks defined in CI, all passing
locally, docs and the om-* validation gate updated.

## Log
- Found CI already ran typecheck/test/build on PRs; no linter. Standards §2.1 fix the tool choices
  (Biome; keep `node:test` + coverage), so followed adoption-plan step 1. Kept in one session
  (one coupled change across package.json, lockfile, ci.yml, src) instead of dispatching subtasks.
- Added `@biomejs/biome` ^2.6.2 and `publint` ^0.3.25. Unscoped Biome reformatted all Markdown and
  `.ai/` files → reverted, scoped with `files.includes` (lesson recorded).
- Formatting-only commit (~95 lines, as the standards predicted); fixed 16 lint findings without
  disabling rules; 14/14 tests still pass.
- Added `lint`, `lint:fix`, `test:coverage` scripts; split CI into `lint`/`build`/`test` jobs.
- Pushed, opened PR #6 (base #4's branch), labels via REST; CI green on first run.
- /om-setup-agent-pipeline re-run: config already existed, so only `validation.commands` changed
  (added `npm run lint`); tracker/browser descriptors, labels and docs left as they were.

## Outcome
Commits on `cez/43251ab7` (see `git log main..`). Verified locally on Node 22.23.3:
`npm run typecheck` ok, `npm run lint` / `npx biome ci .` "No fixes applied" with 0 diagnostics,
`npm test` 14/14, `npm run test:coverage` 100% lines / 98.31% branches, `npm run build` +
`node dist/cli.js get l03 --dry-run` unchanged, `npx publint` "All good!", workflow YAML parses.
Rebased onto the updated `feat/ai-workspace-setup` (lessons.md conflict resolved, both kept),
pushed as `feat/ci-lint-and-test-checks`, opened PR #6 stacked on #4. GitHub Actions run
39602708214: lint, build (18/20/22), test (18/20/22), windows all success; publish skipped as
designed; coverage report present in the test (22) log. Open: make the checks required on `main`
(repo setting, left to the maintainer).

## Lessons
- Biome 2.6 formats Markdown — scope it with `files.includes` (`.ai/lessons.md`).
