---
title: Engineering standards — tech stack, coding standards, design patterns
status: approved-baseline   # the standards apply now; the "Target" items are adopted via specs
created: 2026-10-21
updated: 2026-10-21
---

# Engineering standards for `aitl-cli`

The reference for *how* this project is built. `AGENTS.md` says *how agents work*; this file says
*what good code here looks like*. When this file and the code disagree, the code is wrong unless
a lesson in `.ai/lessons.md` explains why.

Sections marked **Target** are recommended upgrades that are not yet in the code. Adopt them
through a spec in `.ai/specs/` (see [Adoption plan](#8-adoption-plan)); until then, follow the
**Current** values.

---

## 1. What we are building — constraints that drive every choice

- A **small, published npm CLI** (`npx aitl-cli …`). Users run it once per lesson. Install size and
  start-up time matter more than anything else in the stack.
- It **plans and delegates**: it works out which skills a lesson needs, then runs
  `npx skills add <source> --skill …`. It never installs anything itself.
- It must run on **Linux, macOS and Windows** (Windows `.cmd` shims and `cmd.exe` quoting are
  real failure modes — see the lessons file).
- It runs **untrusted user input** (lesson ids, `--agent` values) into a child process, so command
  construction is security-sensitive.
- One maintainer plus AI agents: tooling must be **few, fast, zero-config-ish** tools that agents
  can run and read the output of.

Choose the simplest option that satisfies these constraints. "Best possible" here means *smallest
correct*, not *most featureful*.

---

## 2. Tech stack

### 2.1 Decisions

| Concern | Current | Target | Why |
| --- | --- | --- | --- |
| Runtime | Node `>=18` | **Node `>=22.20`** (`engines`) | Node 18 reached end of life on 2025-04-30 and Node 20 on 2026-04-30. The `skills` CLI we delegate to (1.7.x) itself declares `node >=22.20.0`, so on Node 18/20 the install step fails anyway; the `engines` field should tell the truth. |
| Language | TypeScript 5.5, `strict` | **TypeScript 7.x** (native compiler, `tsc`) | 7.0.2 is `latest` on npm. Verified on this repo: type-check passes in ~0.5 s and all tests pass with no code changes. |
| Module system | ESM, `NodeNext` | same | Native ESM is the Node standard; `NodeNext` enforces correct `.js` import specifiers. |
| CLI framework | `commander` 12 | **`commander` 15** | Stays the only runtime dependency. v15 needs Node `>=22.12`, which the new floor covers. Verified: compiles and tests pass unchanged. |
| Build | `tsc` → `dist/` | same | No bundler: the output is a few small ES modules, and readable `dist/` is easier to debug for users. Revisit (e.g. `tsdown`) only if start-up time or install size becomes a measured problem. |
| Tests | `node:test` + `node:assert/strict`, compiled first | same; add `--experimental-test-coverage` reporting | Built into Node, zero dependencies, fast. Vitest or Jest add nothing this project needs. |
| Lint + format | none | **Biome 2.x** (one tool, one `biome.json`) | `typescript-eslint` 8.x only supports TypeScript `<6.1` (the TS 7 API is not ready yet), so ESLint cannot lint a TS 7 codebase with type information. Biome has no TypeScript dependency, needs no plugins, and runs in milliseconds. |
| Package checks | `npm pack --dry-run` | add **`publint`** in CI | Catches broken `bin`/`exports`/`files` before publishing. Verified: "All good!" today. |
| Package manager | npm, committed `package-lock.json` | same | Matches the `npx` distribution model; no reason to add pnpm/yarn. |
| CI | GitHub Actions; Node 18/20/22 matrix + Windows | **Node 22/24/26 matrix** + Windows | Test every supported LTS line. Node 24 is in maintenance LTS and 26 becomes Active LTS on 2026-10-28. |
| Publishing | `npm publish --provenance` with `NPM_TOKEN` | **npm trusted publishing (OIDC)** | No long-lived token to leak. Provenance is generated automatically. Requires npm CLI `>=11.5.1` and Node `>=22.14` in the publish job; keep `permissions: id-token: write`. |

### 2.2 Rules for dependencies

- **Runtime dependencies: `commander` only.** Adding another runtime dependency needs a spec that
  explains why the standard library is not enough. Use `node:` built-ins (`node:child_process`,
  `node:fs`, `node:util` `parseArgs`/`styleText`, `node:test`) first.
- Dev dependencies must earn their place by being used in a `package.json` script that CI runs.
- Pin with `^` ranges and the lockfile. Use `npm ci` in CI, never `npm install`.
- Before bumping a major version, read its changelog and check its `engines` field. Run the full
  verification list (§6) and record any surprises as a lesson.

### 2.3 Target `tsconfig.json`

All of these flags were verified to pass on the current code with TypeScript 7:

```jsonc
{
  "compilerOptions": {
    "target": "ES2023",              // Node 22+ supports it fully
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true, // code already uses `!` on index access as if this were on
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,     // forces `import type` for types (already the convention)
    "isolatedModules": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "test"]
}
```

`erasableSyntaxOnly` is deliberately **not** enabled yet. It would allow running `.ts` directly
with Node's type stripping, but it rejects the parameter property in `UnknownLessonError`, and
the build step is still needed for publishing anyway.

### 2.4 Target `biome.json`

This config matches the existing style (2 spaces, single quotes, trailing commas). Adopting it
reformats only about 95 lines, mostly in tests. Do that in one separate formatting-only commit.

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.2/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": {
    "formatter": { "quoteStyle": "single", "trailingCommas": "all", "arrowParentheses": "always" }
  },
  "linter": { "rules": { "preset": "recommended" } }
}
```

On today's code the recommended preset reports 7 errors and 9 warnings: non-null assertions,
`forEach` callbacks that return a value, an assignment inside an expression, and an implicit-any
`let`. Fix them in the adoption PR rather than disabling the rules.

---

## 3. Architecture and design patterns

### 3.1 Functional core, imperative shell (the main pattern)

```
src/lessons.ts   DATA      the course catalogue — plain typed objects, no logic
      │
src/core.ts      CORE      pure functions: resolve → collect → group → build commands
      │                    no I/O, no process.*, no console.*  (platform is a parameter)
src/cli.ts       SHELL     argv parsing, printing, spawning, exit codes
```

- **`core.ts` stays pure.** It may not import `node:child_process` or `node:fs`, and may not read
  `process.platform` or `process.env` except as a *default parameter value*. Everything it returns
  can be asserted on in a test without mocks.
- **`cli.ts` stays thin.** Each command action is: parse options → call core → print or execute.
  If an action grows logic worth testing, that logic belongs in `core.ts`.
- New I/O (config files, network, prompts) lives in the shell or in a new adapter module at the
  edge, never in the core.

### 3.2 Patterns in use — keep using them

| Pattern | Where | Rule |
| --- | --- | --- |
| **Single source of truth / table-driven data** | `LESSONS` in `src/lessons.ts` | Lesson and skill data exist only there. Code, tests and README derive from it, so new lessons are data changes, not code changes. |
| **Plan, then execute** | `buildCommands()` returns `Command` values; `cli.ts` runs them | Always build the full plan as data before running anything. This is what makes `--dry-run`, `info` and the tests trivial. Never spawn from inside the core. |
| **Parameter injection with production defaults** | `lessons = LESSONS`, `platform = process.platform` | Inject the environment as a parameter with a real default instead of mocking modules. Tests pass a fake catalogue or `'win32'`. |
| **Adapter at the OS boundary** | `spawnSpec()`, `cmdQuote()` | Platform differences are handled in one place. Callers never check `process.platform` themselves. |
| **Typed domain errors** | `UnknownLessonError` | User-facing failures are named `Error` subclasses with an actionable message. The shell's `fail()` turns them into `Error: …` on stderr and exit code 1. |
| **Stable ordering + dedup by composite key** | `collectSkills`, `groupBySource`, `skillUsage` | Output order is deterministic (first seen wins). Dedup keys are `source\0name`, because skill names are only unique within a source. |

### 3.3 Patterns we avoid

- Classes for stateless logic, DI containers, plugin systems, global mutable state and
  singletons other than the immutable `LESSONS` table.
- Abstraction for one implementation ("interface + single class"). Add the seam when the second
  case arrives.
- String-building shell commands. Arguments are always arrays (see §5).

---

## 4. Coding standards

### 4.1 TypeScript

- `strict` everywhere (plus the §2.3 flags once adopted). **No `any`.** Use `unknown` and narrow
  it. A cast (`as`) needs a one-line comment explaining why it is safe; the only accepted
  uncommented cast is `JSON.parse(...) as T` for our own `package.json`.
- Avoid non-null `!`. Prefer a guard, or a default with `??`.
- `import type` for type-only imports. Relative imports use the `.js` extension (NodeNext).
- Exported functions have explicit parameter types; return types are explicit when they are part
  of the public shape (`Lesson[]`, `Command[]`).
- Prefer `interface` for object shapes and `type` for unions and aliases. Optional fields are `?:`,
  never `| undefined` unless "present but undefined" means something.
- Keep data immutable in practice: do not mutate inputs; build new arrays and objects
  (`[...prev, value]`).
- Use `for…of` when the loop body has side effects. Use `map`/`filter` only for pure
  transformations, never a `forEach` whose callback returns a value.

### 4.2 Naming and layout

- Files: lowercase, one concern per file (`core.ts`, `lessons.ts`). Tests mirror sources:
  `test/<module>.test.ts`.
- Functions are verbs (`resolveLesson`, `buildCommands`); predicates read as questions (`isX`, `hasX`);
  constants are `UPPER_SNAKE` only for module-level fixed data (`LESSONS`, `DEFAULT_SOURCE`).
- Lesson ids are canonical `prework`, `lNN`, or a lowercase word. Aliases live in `aliases`, never
  in parsing code.
- Comments explain *why*, not what. Every exported function has a one-line `/** … */` doc comment
  if its name does not say it all. Keep the existing density; don't add tutorials.

### 4.3 CLI UX conventions

- **stdout is for results, stderr is for errors and diagnostics.** Data commands (`list`,
  `skills`, `get --dry-run`) print only data, so they can be piped.
- Exit codes: `0` success; `1` user error (unknown lesson, invalid option); `127` the child process
  could not start; otherwise **propagate the child's exit code** and stop at the first failing
  `skills add`.
- Error messages say what was wrong *and* what is accepted
  (`Unknown lesson "x". Valid lessons: …`).
- Displayed commands always use the portable form (`npx …`, POSIX-quoted) whatever the platform,
  so copy-paste from docs works.
- New flags are long-form first (`--optional`). Short aliases only for options passed through to
  `skills` (`-g`, `-a`, `-y`), and they keep that tool's meaning.
- Every user-visible behaviour change updates `README.md` (command table, options table, lesson
  table) in the same PR.

### 4.4 Data changes (`src/lessons.ts`)

- A skill is `{ name }` for `DEFAULT_SOURCE`, or `{ name, source }` for another repository. Reuse a
  named constant (like `grillMe`) for any external skill used more than once.
- `required` means "the lesson does not work without it"; everything else is `optional`.
- Extras (`brownfield`, `discovery`) set `extra: true` and are never part of `--upto` ranges.
- Data-only changes still need: the README lesson table updated and the tests green. Tests assert
  on the catalogue's *shape and invariants*, not on copies of the whole table.

---

## 5. Security and portability

- **Never run a user string through a shell on POSIX.** Spawn with an argv array and
  `shell: false`.
- **Windows goes through `spawnSpec()` only.** `npx` is the `npx.cmd` shim, which Node refuses to
  spawn without a shell. Every argument passes through `cmdQuote()`, which *rejects* `"%!^&|<>()`
  and newlines rather than trying to escape them. Do not loosen this: there is no safe quoting for
  those characters in `cmd.exe`.
- Validate user-supplied values at the boundary (as `collectAgent` does with Commander's
  `InvalidArgumentError`) before they reach command construction.
- No network access, telemetry or file writes from this CLI itself. Installation is the `skills`
  CLI's job.
- Paths use `node:path` / `URL` (`new URL('../package.json', import.meta.url)`), never string
  concatenation with `/`.
- Line endings and case: never assume a case-sensitive filesystem or `\n`-only input.
- Supply chain: lockfile committed, `npm ci` in CI, provenance or trusted publishing on release,
  `npm audit --omit=dev` must be clean before a release.

---

## 6. Testing and verification standards

### 6.1 What to test

- **Core functions are unit-tested directly**, with an injected catalogue where possible, so tests
  do not break when course data changes.
- **Both platform branches are tested** by passing `platform: 'win32'` and `'linux'` explicitly.
  The Windows CI job additionally smoke-tests a real `npx.cmd` spawn.
- **Every bug fix adds a test that fails without the fix** (see `AGENTS.md`).
- **Catalogue invariants** must be tested: unique ids and aliases, no skill both required and
  optional in a lesson, extras flagged, and every external `source` in `owner/repo` form.
  **Target:** no such test exists yet (`test/core.test.ts` covers behaviour only); add one with the
  next change to `src/lessons.ts`.
- Test names describe behaviour (`'required skills only by default'`), not function names.
- Use `node:assert/strict` (`deepEqual`, `throws` with a validator). No snapshot tests: outputs are
  short enough to assert explicitly.

### 6.2 Definition of done (every PR)

```bash
npm run typecheck            # no errors
npm test                     # all green
npm run build && node dist/cli.js get l03 --dry-run   # behaviour exercised for real
npx biome check .            # once Biome is adopted
npx publint                  # when package.json, bin or files change
```

CI must be green on every Node version in the matrix and on Windows. Coverage (once reported —
**Target**, see §2.1) is not gated: aim for full branch coverage of `core.ts`; `cli.ts` is
covered by smoke runs.

---

## 7. Process, versioning and release

- **SemVer** for the CLI surface: a new command or flag is *minor*. Removing or renaming a
  command or flag, changing exit codes, or raising the `engines` floor is *major*. Changes to
  lesson data alone are *patch* (or *minor* if a new lesson is added).
- The version bump goes in the same PR as the change, in both `package.json` and the lockfile
  (`npm version <level> --no-git-tag-version`).
- Releases happen only from the default branch via CI (the existing `publish` job, which skips
  versions that are already published). No manual `npm publish`. A PR without a version bump
  (docs, tests, refactors) therefore never ships a package.
- CI runs on pull requests and on pushes to `main` only. It skips changes that touch nothing but
  Markdown files or `.ai/` (`paths-ignore` in `ci.yml`). Test-only changes still run it. If branch
  protection ever requires the CI checks, add a no-op fallback for docs-only PRs first, or they
  will wait forever for a check that never reports.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) subject —
  `type(scope): imperative summary`, 72 characters or fewer (`fix(core): …`, `docs(runs): …`), the
  form the `om-*` pipeline skills already use — and a body that explains *why*. One logical change
  per commit; formatting-only changes go in their own commit.
- Non-trivial changes follow SDD (a spec in `.ai/specs/`). Lessons go in `.ai/lessons.md`. Both are
  described in `AGENTS.md`.

---

## 8. Adoption plan

These moves take the project from **Current** to **Target**. Each should be its own spec and PR,
in this order, because each one makes the next safer:

1. **Tooling (no behaviour change):** add Biome with the §2.4 config, then a formatting-only commit,
   then fix the lint findings. Add `publint` to CI. Add `"lint": "biome check ."` to the scripts.
2. **Strictness:** enable the §2.3 compiler flags and remove the now-redundant `!` assertions.
3. **Platform floor (major release, 1.0.0 or 0.2.0 while pre-1.0):** set `engines.node` to
   `>=22.20`, change the CI matrix to 22/24/26, upgrade `typescript` to 7.x, `commander` to 15.x and
   `@types/node` to the matching major, and set `target` to `ES2023`. Document the floor in the
   README.
4. **Release hardening:** switch the publish job to npm trusted publishing (Node 24 runner, npm
   `>=11.5.1`), remove the `NPM_TOKEN` secret, and add an `npm audit --omit=dev` gate.

When an item ships, move its **Target** value into **Current** in this file.

---

## Sources and verification (2026-10-21)

- Node release schedule: `github.com/nodejs/Release/schedule.json` (v18 end of life 2025-04-30,
  v20 end of life 2026-04-30, v22 maintenance until 2027-04-30, v24 maintenance LTS, v26 LTS from
  2026-10-28).
- npm registry metadata (`npm view`): `typescript` latest 7.0.2; `commander` 15.0.0
  (`node >=22.12.0`); `skills` 1.7.4 (`node >=22.20.0`); `typescript-eslint` 8.72.0 (peer
  `typescript >=4.8.4 <6.1.0`); `@biomejs/biome` 2.6.2.
- TypeScript 7 status: `microsoft/typescript-go` README (type-checking and emit done; API not
  ready, which is why typescript-eslint cannot support it yet).
- npm trusted publishing: `docs.npmjs.com/trusted-publishers` (npm CLI `>=11.5.1`, Node
  `>=22.14.0`, automatic provenance).
- Local experiments on a copy of this repo: TS 7.0.2 + commander 15 + `@types/node` 24 compiled,
  and 14/14 tests passed; the §2.3 flags all compiled; `erasableSyntaxOnly` gave 1 error; Biome
  2.6.2 recommended preset reported 7 errors and 9 warnings; `publint` 0.3.25 reported "All good!".
