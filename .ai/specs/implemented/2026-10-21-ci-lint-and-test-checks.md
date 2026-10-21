---
title: CI checks on every PR — build, lint, unit tests with coverage
status: implemented
created: 2026-10-21
updated: 2026-10-21
owner: Claude Code (claude-opus-5-5), cezar task 43251ab7
related: [".ai/docs/engineering-standards.md §8 step 1", "PR #6 (branch feat/ci-lint-and-test-checks)"]
---

# CI checks on every PR — build, lint, unit tests with coverage

## Problem
Every PR should prove that the app builds, that the code is linted, and that the TypeScript unit
tests pass. CI already built and tested, but there was no linter at all, the build and test steps
were bundled into one job (one red check, no way to tell which part failed), and test coverage was
not visible.

## Goals / Non-goals
- Goals: separate `lint`, `build` and `test` checks on every PR; Biome as linter/formatter
  (engineering standards §2.1/§2.4); keep `node:test` as the TS unit-test framework and add coverage
  reporting; `publint` in CI; the om-* validation gate includes lint.
- Non-goals: switching to Vitest/Jest (standards §2.1 rejects them); gating on coverage; changing
  the Node matrix (adoption step 3); making the checks *required* on `main` (a repo-settings
  decision for the maintainer).

## Proposal
- `biome.json` per §2.4, scoped by `files.includes` to `src/**`, `test/**`, `*.json`.
- Scripts: `lint` (`biome check .`), `lint:fix`, `test:coverage` (Node's built-in coverage limited to
  compiled `src/`).
- `.github/workflows/ci.yml` jobs: `lint` (`biome ci .`, Node 22); `build` on 18/20/22 (typecheck,
  build, `get l03 --dry-run` smoke, `npm pack --dry-run`, `publint`); `test` on 18/20/22 (Node 22
  runs coverage and writes it to the job summary); `windows` unchanged; `publish` needs all four.
- Commits: deps → formatting-only → lint fixes → CI/scripts/docs.

## Acceptance criteria
- [x] `npm run lint` passes with zero diagnostics and no rules disabled.
- [x] `npm run typecheck`, `npm test` (14/14) and `npm run build` pass; `get l03 --dry-run` and
      `skills` output unchanged.
- [x] `npm run test:coverage` prints a report for `src/` (100% lines, 98.3% branches).
- [x] `npx publint` reports "All good!".
- [x] Workflow defines `lint`, `build`, `test`, `windows`; `publish` needs all of them.

## Open questions
- Should `lint`, `build` and `test` be required status checks on `main`? (`main` has no branch
  protection today.) Since #5, `ci.yml` skips docs-only changes (`paths-ignore`), so requiring
  them first needs a fallback for docs-only PRs (see `.ai/lessons.md`).

## Changelog
- 2026-10-21 — created and implemented on `cez/43251ab7`.
- 2026-10-21 — shipped as PR #6 (`feat/ci-lint-and-test-checks`); reference added after review.
- 2026-10-21 — merged `feat/ai-workspace-setup` (#5 `paths-ignore` CI); open question updated.
