# CLAUDE.md

All project instructions live in `AGENTS.md` so every agent shares one source of truth:

@AGENTS.md

## Claude Code specifics

- The `.ai/` rules in `AGENTS.md` are mandatory: read `.ai/lessons.md` at the start of a task,
  follow the spec in `.ai/specs/`, write a run log in `.ai/runs/` for autonomous runs, and record
  lessons learned before finishing.
- Store project knowledge in `.ai/lessons.md` / `.ai/lessons/`, not only in Claude's private
  auto-memory — other agents and humans cannot see that.
- Sub-agents you spawn inherit these rules; pass them the relevant spec path.
