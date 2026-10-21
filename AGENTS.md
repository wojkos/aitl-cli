# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, Copilot, …) working in this
repository. `CLAUDE.md` imports this file; keep the rules here, in one place.

## Project

`aitl-cli` is a small TypeScript CLI (Node.js >= 18, ESM) that installs exactly the agent
skills an AITL course lesson needs by delegating to `npx skills add <source> --skill …`.

| Path | What lives there |
| --- | --- |
| `src/cli.ts` | Commander entry point (`list`, `info`, `get`, `skills`) |
| `src/core.ts` | Lesson-id parsing, skill resolution, command building, `spawnSpec` |
| `src/lessons.ts` | The authoritative lesson → skills data |
| `test/*.test.ts` | `node:test` suites, compiled to `.test-dist/` |
| `.ai/` | AI working metadata: specs, run logs, lessons learned (see below) |

Commands:

```bash
npm run typecheck   # tsc --noEmit
npm test            # compile tests + node --test
npm run build       # tsc -> dist/
```

CI runs typecheck, tests and build on Node 18/20/22 and on Windows — keep code cross-platform
(see `spawnSpec` in `src/core.ts`). If you change lessons or CLI behaviour, update `README.md` to
match.

**Engineering standards:** the tech stack, coding standards, design patterns, and testing and
release rules are in [`.ai/docs/engineering-standards.md`](.ai/docs/engineering-standards.md).
Read it before writing code; its **Target** items are adopted only through a spec.

## How to work

- **Plan before complex work.** For anything touching several files or changing behaviour, plan
  first (plan mode in Claude Code) and get the plan agreed — the plan is the spec in `.ai/specs/`.
  If implementation goes sideways, stop and re-plan instead of pushing through.
- **Verify, don't assume.** A change is done only when you have proof: `npm run typecheck` and
  `npm test` pass, and behaviour changes are exercised for real (e.g.
  `node dist/cli.js get l03 --dry-run` after `npm run build`). Every bug fix gets a test that fails
  without it. Report what you ran and what it printed; never claim success you have not seen.
- **Prefer the elegant fix.** If a fix ends up hacky, step back and, knowing what you know now,
  replace it with the clean solution rather than layering patches.
- **Own bugs end to end.** Given a bug report or failing CI, find the root cause and fix it without
  waiting to be told how; ask only when a decision is genuinely the user's.
- **Use parallelism for independent work.** Separate git worktrees or sub-agents suit unrelated
  tasks and wide read-only investigations; keep one tightly coupled change in one session.
- **Turn repetition into tooling.** A workflow you repeat often belongs in a committed skill or
  slash command (`.claude/skills/`, `.claude/commands/`), not in ad-hoc prompts.

## The `.ai/` folder — mandatory

```
.ai/
├── docs/                   # long-lived reference docs (engineering-standards.md)
├── specs/                  # SDD specifications
│   ├── YYYY-MM-DD-slug.md  #   active: approved or in progress
│   ├── implemented/        #   specs that are fully shipped
│   └── archive/            #   abandoned, superseded or rejected specs
├── runs/                   # one log per autonomous AI run
│   └── YYYY-MM-DD-slug.md
├── lessons.md              # index + short lessons learned (read this first)
└── lessons/                # long-form lessons, one topic per file
    └── YYYY-MM-DD-slug.md
```

`.ai/cezar/` is local tooling state (worktrees, scratch) — it is git-ignored; never put
project metadata there.

### Naming

Every file in `specs/`, `runs/` and `lessons/` (including `implemented/` and `archive/`) is named
`YYYY-MM-DD-slug.md`:

- `YYYY-MM-DD` — the date the file was created, in UTC. It never changes, even when the file
  moves between folders.
- `slug` — lowercase kebab-case, ASCII `a-z0-9-` only, short and descriptive
  (`2026-10-21-cumulative-optional-skills.md`).
- If the name is already taken, add a suffix: `…-slug-2.md`.

Only the `README.md` files that document each folder break this rule. `.ai/docs/` holds living
reference documents, so they get stable undated names (`engineering-standards.md`) and are
updated in place.

### Workflow — what every agent must do

1. **Before starting work:** read `.ai/lessons.md` and any `.ai/lessons/` file relevant to the
   area you are touching. Check `.ai/specs/` for an active spec covering the task.
2. **Spec-driven development:** non-trivial features or behaviour changes start from a spec in
   `.ai/specs/`. If the task has a spec, implement against it and do not silently deviate — update
   the spec (with a dated note in its *Changelog*) when the plan changes. If there is no spec and
   the change is non-trivial, write one first (template in `.ai/specs/README.md`). Bug fixes and
   small chores do not need a spec.
3. **When a spec is fully shipped:** set its status to `implemented`, add the PR/commit reference
   and `git mv` it to `.ai/specs/implemented/`. When a spec is dropped or superseded: set status
   `archived`, note why (and the successor spec), and `git mv` it to `.ai/specs/archive/`.
4. **Autonomous runs:** every autonomous / unattended run (an agent working without a human in the
   loop for the task — CI agents, dispatched tasks, scheduled automations, overnight runs) writes
   a log to `.ai/runs/YYYY-MM-DD-slug.md` (template in `.ai/runs/README.md`). Create it when the
   run starts, keep it updated, and finish it with the outcome. Interactive pair-programming
   sessions do not need a run log unless asked. Run logs are append-only history — never rewrite
   another run's log.
5. **Lessons learned:** after fixing a bug, being corrected by the user, discovering a non-obvious
   constraint, or hitting a mistake worth not repeating, record it (see below) before finishing —
   phrased as a rule that prevents the repeat. If the correction is a general way-of-working rule,
   update this file instead. This is the project's long-term memory — prefer it over any
   tool-private memory so every agent benefits.

### Lessons: `lessons.md` vs `lessons/`

- **`.ai/lessons.md`** — the index everyone reads first. One bullet per lesson, newest first, at
  most ~3 lines each: what happened, the rule to follow, and a link to a long-form file if one
  exists. Format:
  `- YYYY-MM-DD — **Rule in one line.** Why / context. ([details](lessons/YYYY-MM-DD-slug.md))`
- **`.ai/lessons/YYYY-MM-DD-slug.md`** — when a lesson needs more than a few lines (root-cause
  analysis, reproduction, code samples, alternatives tried). Always add a bullet to `lessons.md`
  pointing to it.

Keep lessons actionable and true: before adding one, check for an existing entry and update it
instead of duplicating; if a lesson turns out wrong or obsolete, fix or remove it. Do not record
things already obvious from the code, git history or this file.

### Commits

Commit `.ai/` changes together with the work they describe (spec updates, run log, lessons), so a
branch carries its own history.
