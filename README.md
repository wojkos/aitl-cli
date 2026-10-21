# aitl-cli

Install exactly the agent skills needed for a given AITL course lesson, instead of
installing the whole `open-mercato/skills` catalog.

`aitl-cli` is a thin wrapper: it works out which skills a lesson needs and delegates the
installation to the [`skills`](https://www.npmjs.com/package/skills) CLI
(`npx skills add <source> --skill <name> ...`).

## Usage

```bash
npx aitl-cli list                 # all lessons
npx aitl-cli info l03             # details + the exact commands
npx aitl-cli get l03              # install skills for lesson 03
npx aitl-cli get 5 --optional     # include optional skills
npx aitl-cli get l07 --upto       # everything required from prework up to lesson 07
npx aitl-cli get l03 --dry-run    # print commands only
npx aitl-cli skills               # every skill used by the course
```

Lesson ids are forgiving and case-insensitive: `l03`, `l3`, `3`, `03`, `lesson-03`,
`pre-work`, `prework`, `brownfield`, `discovery`.

## Commands

| Command | Description |
| --- | --- |
| `list` | Table of lessons with required skills and optional count |
| `info <lesson>` | Title, required/optional skills, notes and the commands `get` would run |
| `get <lesson...>` | Install skills for one or more lessons |
| `skills` | All skills referenced by the course and the lessons using them |

### `get` options

| Option | Description |
| --- | --- |
| `--optional` | Include optional skills of the requested lesson(s) |
| `--upto`, `--cumulative` | Include required skills of all lessons from prework up to the given one (`brownfield` and `discovery` are extras, never part of a range) |
| `--dry-run` | Print the commands without running them |
| `-g, --global` | Passed to `skills add` (install to user directory) |
| `-a, --agent <agent>` | Passed to `skills add`; repeatable |
| `-y, --yes` | Passed to `skills add` (skip prompts) |

Skills are deduplicated and grouped by source: one `npx skills add <source> --skill ...`
invocation per source. The exit code of the `skills` process is propagated.

## Lessons

| ID | Title | Required | Optional |
| --- | --- | --- | --- |
| prework | Pre-work | - | - |
| l01 | Lesson 01 | - | - |
| l02 | Lesson 02 | - | - |
| l03 | Lesson 03 | om-setup-agent-pipeline, om-prepare-issue, om-auto-fix-issue, om-code-review | - |
| l04 | Lesson 04 | om-discover, om-backlog, om-synthetic-users | om-setup-discovery-pipeline |
| l05 | Lesson 05 | om-spec-writing, grill-me (mattpocock/skills) | - |
| l06 | Lesson 06 | - | - |
| l07 | Lesson 07 | om-mockup-prototype | om-synthetic-users, om-discover |
| l08 | Lesson 08 | - | - |
| l09 | Lesson 09 | - | - |
| l10 | Lesson 10 | - | om-framework-context |
| brownfield | Brownfield | om-setup-agent-pipeline | om-prepare-issue, om-auto-create-pr-loop |
| discovery | Discovery | - | - |

The authoritative data lives in `src/lessons.ts`; run `aitl-cli info <lesson>` for notes.

## Development

```bash
npm install
npm run build      # tsc -> dist/
npm run typecheck
npm test           # node:test
```

Requires Node.js >= 18.
