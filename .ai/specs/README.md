# Specs (spec-driven development)

Specifications for features and behaviour changes. Rules are in `AGENTS.md`.

- `YYYY-MM-DD-slug.md` here — active specs (`draft`, `approved`, `in-progress`).
- `implemented/` — fully shipped specs (`git mv` here when done).
- `archive/` — abandoned, rejected or superseded specs (`git mv` here with a reason).

The date is the creation date and never changes when a spec moves.

## Template

```markdown
---
title: Short human title
status: draft            # draft | approved | in-progress | implemented | archived
created: YYYY-MM-DD
updated: YYYY-MM-DD
owner: name or agent
related: []              # issues, PRs, other specs
---

# Title

## Problem
What is wrong or missing, and for whom.

## Goals / Non-goals

## Proposal
Behaviour, CLI surface, data changes. Concrete examples of input → output.

## Acceptance criteria
- [ ] Testable statements; each maps to a test or a manual check.

## Open questions

## Changelog
- YYYY-MM-DD — created.
```
