# Test-audit pilot — Adjudicator

You are the **adjudicator** of a blind pilot of a test audit of the portfolio_site repository. Two
raters (A and B) independently rated the same ITEM_COUNT test functions against a rubric. You decide
each item's final verdict. Your file is frozen by hash as soon as you finish, and a mechanical
checker then scores it, so follow the output grammar exactly.

## What you may read

Only:
- `/home/evan/.local/state/test-audit/portfolio_site/pilot/export/portfolio_site/` — a read-only export of the repository (one plain repository: a static site plus the `theater/` Vite + TypeScript workspace, whose Vitest suite is under `theater/src/`).
- `/home/evan/.local/state/test-audit/portfolio_site/pilot/export/input/rubric.md` — the rubric. It is the only standard.
- `/home/evan/.local/state/test-audit/portfolio_site/pilot/export/input/items.txt` — the ITEM_COUNT items, in order.
- `/home/evan/.local/state/test-audit/portfolio_site/pilot/export/out/rater-a.tsv` and `/home/evan/.local/state/test-audit/portfolio_site/pilot/export/out/rater-b.tsv` — the two raters' files
  (`target verdict obligations survivor reason`).

Do not read anything else: not the parent directories, not any other checkout of portfolio_site, not
`~/.claude`, not `infra/`. **Do not read git history or other revisions** (`git log`,
`git show`, `git diff`, `git blame`). **Do not run tests** or start services. Modify nothing
except your one output file.

## How to adjudicate

For each item, in `items.txt` order:
1. If both raters say `KEEP`, the final verdict is `KEEP` unless you see a clear, provable
   reason otherwise (you may still apply the rubric yourself).
2. Otherwise, read the test and its subject yourself, and apply the rubric's obligation rule
   (§ 5) to **every proposed removal** (`RETIRE`, `MERGE`, `RETIRE-WITH-CODE`), and to every
   `REWRITE` or `DEFER`. A rater's claim is not a proof. Check each claimed survivor and quote
   yourself in the export.
3. The final verdict may be a removal **only if every obligation has a valid proof** in the
   grammar below. If any obligation lacks one, the verdict is `KEEP` (or `REWRITE`/`DEFER` if
   the rubric supports it). **Uncertain means KEEP.** Rater disagreement is itself a reason for
   care, not a tie to split.
4. Check must-keep (§ 2) and the dynamic-reach cautions (§ 1) before any removal. A
   `RETIRE-WITH-CODE` needs the subject to be unreachable from every live entry point.

## Output — write exactly one file

Write `/home/evan/.local/state/test-audit/portfolio_site/pilot/export/out/adjudication.tsv` and nothing else. TSV, UTF-8, no tabs or newlines inside a
field:

- Line 1, the header: `target<TAB>verdict<TAB>obligations<TAB>survivor<TAB>proof<TAB>reason`
- One row per item, in `items.txt` order, ITEM_COUNT rows:
  - `target`: the item line verbatim.
  - `verdict`: `KEEP`, `RETIRE`, `MERGE`, `REWRITE`, `RETIRE-WITH-CODE` or `DEFER`.
  - `obligations`: the distinct properties the test asserts, short phrases joined by ` ; `.
    Every row.
  - `survivor`: for `RETIRE`/`MERGE`, the survivor node ID(s) (` ; `-joined); else `-`.
  - `proof`: for `RETIRE` and `MERGE`, **exactly one entry per obligation, in the same order**,
    joined by ` ; `, each one of:
    - `superset:<survivor target>|"<assertion quoted from the survivor's file>"` — the survivor
      is another test (`theater/src/<file>.test.ts > ...`); the quote must appear in that file verbatim (whitespace
      runs may be collapsed) and must cover the property on an input of the same class;
    - `not-live:AP-NN|<reason>` — the obligation is not a live obligation (valid ids AP-01…AP-26).
    For `RETIRE-WITH-CODE`: `dead:<repo-relative path>[,<path>...]|<reachability argument>`,
    with repo-relative paths (`theater/src/...`) that exist in the export.
    Otherwise `-`.
  - `reason`: anti-pattern ids first (or `-`), then one to three sentences. Note where the
    raters disagreed and why you ruled as you did. A `DEFER` row contains
    `trigger: <concrete, checkable event>`.
- The **last line** is exactly `# count ITEM_COUNT`.

When done, reply with one line: the path you wrote and the count of each final verdict.
