# Test-audit pilot — Rater B

You are **Rater B** in a blind pilot of a test audit of the portfolio_site repository. Another rater
rates the same items independently; you never see each other's work. Your ratings are compared
and adjudicated later. Work alone and rate every item.

## What you may read

Only these two directories:
- `/home/evan/.local/state/test-audit/portfolio_site/pilot/export/portfolio_site/` — a read-only export of the repository (one plain repository: a static site plus the `theater/` Vite + TypeScript workspace, whose Vitest suite is under `theater/src/`).
  Some planning directories were deliberately removed from it.
- `/home/evan/.local/state/test-audit/portfolio_site/pilot/export/input/` — `rubric.md` (the audit rubric) and `items.txt` (the items to rate).

**Do not read anything outside those two directories**: not the parent directories, not any
other checkout of portfolio_site, not `~/.claude`, not `infra/`. **Do not read git history or other
revisions** (`git log`, `git show`, `git diff`, `git blame`, reflogs, object files). Plain
file reads, `ls`, `grep`/`rg` and `find` inside the export are fine. **Do not run any
tests** and do not start any services: this pilot is read-only.
Do not modify anything in the export.

## The task

1. Read `/home/evan/.local/state/test-audit/portfolio_site/pilot/export/input/rubric.md` whole. It is the only standard you apply.
2. For each of the ITEM_COUNT items in `/home/evan/.local/state/test-audit/portfolio_site/pilot/export/input/items.txt`, in file order:
   - Find the test function. Every item is a Vitest test, written
     `theater/src/<file>.test.ts > <name>` (the vitest full name: describe blocks and the test
     name joined by ` > `). A table-driven test (`it.each`/`test.each`) is rated as one unit.
   - Read the test, the fixtures it uses, and the production code it exercises. Decide whether
     that subject is live (rubric § 1), whether the test is a must-keep (§ 2), and which
     anti-patterns it shows (§ 3).
   - Choose exactly one verdict (§ 4). For any verdict that removes or replaces a test whose
     subject is live, apply the obligation rule (§ 5). You cannot run mutants here, so the only
     proof available to you is an assertion superset quoted verbatim from the survivor's file.
     **Uncertain means KEEP.**

## Output — write exactly one file

Write `/home/evan/.local/state/test-audit/portfolio_site/pilot/export/out/rater-b.tsv` and nothing else. It is a TSV (tab-separated, UTF-8):

- Line 1 is the header: `target<TAB>verdict<TAB>obligations<TAB>survivor<TAB>reason`
- Then exactly one row per item, in `items.txt` order, ITEM_COUNT rows:
  - `target`: the item line copied verbatim.
  - `verdict`: one of `KEEP`, `RETIRE`, `MERGE`, `REWRITE`, `RETIRE-WITH-CODE`, `DEFER`.
  - `obligations`: the distinct properties the test asserts, as short phrases joined by ` ; `.
    Required for every row, including KEEP.
  - `survivor`: for `RETIRE`/`MERGE` of a live-subject test, one entry per obligation in the
    same order, joined by ` ; `: either the survivor test's node ID, or `not-live:AP-NN` when
    that obligation is not a live obligation. Otherwise `-`.
  - `reason`: the anti-pattern IDs first (or `-`), then one to three sentences. For each
    survivor, quote the survivor's covering assertion verbatim in double quotes. A `DEFER` row
    must contain `trigger: <concrete, checkable event>`. A `RETIRE-WITH-CODE` row names the
    dead module(s) and why nothing live reaches them.
  - No tab or newline characters inside a field.
- The **last line** is exactly `# count ITEM_COUNT` (the number of data rows you wrote).

Write the file incrementally if that helps, but the final file must satisfy all of the above.
When done, reply with one line: the path you wrote and the count of each verdict.
