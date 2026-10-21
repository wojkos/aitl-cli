---
title: Skip CI for docs-only changes and stop duplicate PR runs
date: 2026-10-21
agent: Claude Code / claude-opus-5-5
trigger: user request (cezar task 5f0524ff), continued autonomously
branch: cez/5f0524ff
spec: none (CI chore)
status: done
---

# Skip CI for docs-only changes and stop duplicate PR runs

## Objective
The user mostly works on docs and tests and asked whether some PRs can skip building the
package. Done means: PRs without a version bump never publish, docs-only changes don't run CI,
test changes still do, and the standards doc describes the rule.

## Log
- 12:50 — Read `ci.yml`. `publish` already runs only on push to `main` and skips versions that
  are already on npm, so a PR without a version bump never ships a package. Gap 1: every
  docs-only PR ran the full matrix plus Windows. Gap 2: `on: push` had no branch filter, so every
  commit on a PR branch ran CI twice (`push` and `pull_request`).
- 12:52 — `gh api repos/wojkos/aitl-cli/branches/main/protection` returns 404 "Branch not
  protected", and the rulesets list is `[]`. No required checks exist, so a skipped workflow
  can't block a merge.
- 12:55 — `ci.yml`: `push` restricted to `main`. Added `paths-ignore: ['**/*.md', '.ai/**']` to
  both triggers. Wrote the list out twice instead of using a YAML anchor, to avoid depending on
  the newer anchor support in Actions. Test files aren't ignored.
- 12:56 — Documented this in `.ai/docs/engineering-standards.md` §7.
- 12:57 — Parsed the YAML with PyYAML (triggers as intended). `npm run typecheck` clean,
  `npm test` 14 pass / 0 fail.

## Outcome
Changed `.github/workflows/ci.yml` and `.ai/docs/engineering-standards.md`. The workflow edit
itself isn't ignored, so the PR for this change runs CI and validates it on GitHub.

## Lessons
Added: `paths-ignore` plus required status checks causes stuck PRs (`.ai/lessons.md`).
