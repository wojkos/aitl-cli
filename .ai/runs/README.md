# Runs (autonomous AI run logs)

One file per autonomous AI run, named `YYYY-MM-DD-slug.md` (run start date, UTC). Rules are in
`AGENTS.md`. Create the log when the run starts, update it at milestones, close it with the
outcome. Logs are append-only history: never rewrite another run's log.

## Template

```markdown
---
title: What the run set out to do
date: YYYY-MM-DD
agent: tool + model (e.g. Claude Code / claude-opus-5-5)
trigger: who or what started it (user request, automation, CI, parent task)
branch: branch name
spec: .ai/specs/YYYY-MM-DD-slug.md   # or "none"
status: in-progress                  # in-progress | done | partial | failed | blocked
---

# Title

## Objective
The task as given, plus how "done" was defined.

## Log
- HH:MM — step taken, decision made, command run and result.

## Outcome
What changed (files, commits, PR), verification (tests/commands run and their results),
what is left or blocked.

## Lessons
Anything recorded in `.ai/lessons.md` / `.ai/lessons/` during this run (or "none").
```
