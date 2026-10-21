# Lessons learned

Long-term memory for agents and humans working on this repo. Read it before starting a task; add
to it after fixing a bug or learning something non-obvious. Newest first, one bullet each:

`- YYYY-MM-DD — **Rule in one line.** Why / context. ([details](lessons/YYYY-MM-DD-slug.md))`

Long write-ups go in `lessons/`. Update or remove entries that become wrong; don't duplicate.

## Lessons

<!-- Add new lessons at the top of this list. -->

- 2026-10-21 — **Keep Biome scoped with `files.includes`; never run it unscoped with `--write`.**
  Biome 2.6 also formats Markdown, so an unscoped `biome check --write .` rewrites every doc and
  `.ai/` file (tables, wrapped lines). `biome.json` limits it to `src/`, `test/` and root JSON.
- 2026-10-21 — **Automated review of an automation-authored PR cannot formally approve it; record a
  COMMENT review and ask a different reviewer to approve.** The om-* pipeline runs as `wojkos`, the
  same account that opens PRs, and GitHub rejects self-approval. Local `gh` is 2.45 (< 2.82.1), so
  PR and label edits must use the REST forms in `.ai/trackers/github.md`, not `gh pr edit`.

- 2026-10-21 — **Never spawn `npx` directly on Windows; go through `spawnSpec()` in `src/core.ts`.**
  Since the CVE-2024-27980 fix Node refuses to spawn `.cmd` shims like `npx.cmd` without a shell
  (`EINVAL`), so on Windows the command goes to `cmd.exe` as one string quoted by `cmdQuote()`,
  which rejects cmd metacharacters. Fixed in 9647f45; the CI `windows` job guards it.
