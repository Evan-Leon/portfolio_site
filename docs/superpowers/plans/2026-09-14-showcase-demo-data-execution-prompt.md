# Execution prompt — Showcase Demo Data Cleanup

Paste everything below the line into a **fresh Claude Code session started in `/home/evan/EVOsystem/portfolio_site`**.

---

Execute the plan `docs/superpowers/plans/2026-09-14-showcase-demo-data.md` with **superpowers:subagent-driven-development**. The plan argues from the spec `docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md` (Rev 3). Read both; the spec is the binding authority, and its decisions D1–D6 and "Rev 3 amendments" section override any older line.

## What this is

A one-time cleanup.
- **What's being removed.** The 2026-09-05/06 portfolio-showcase sweep left demo data in six apps' local stores, plus one artifact that co-host's failed demo job wrote into CHUD. For several apps that store is Evan's real, live data.
- **How.** You remove it through committed, pre-validated fail-closed tooling, update the showcase meta-prompt on an infra worktree branch, and record the outcome.
- **What's never touched.** No app repo is written, and chud is touched only for that one artifact.

## Authority (Evan, 2026-09-14): read this twice

- **D3.** Evan's approval of this plan authorizes exactly:
  - the deletes performed by the committed tooling's `execute` phases for co-host, co-host-chud, co-author, chudios, mind-palace, LeonsBudget and the-classic (plan Tasks 2–7);
  - the chudios `purge` of the three quarantined files once the chudios database `execute` is classified `COMMITTED`.

  `execute` may run only after that target's `rehearse` and `negative` phases have passed against its current freeze (mind-palace also needs `dry`). That is the complete list. No other DELETE, UPDATE, `DETACH DELETE`, `rm` or `mv` may be run against any app store, by you or by any sub-agent.
- **The skill says to stop before irreversible operations.** For the operations listed in D3, Evan's approval of this plan *is* the answer to that stop, so do not ask again before each `execute`. For anything irreversible that is not listed in D3, stop and ask.
- **D4 — STOP-AND-ASK. This overrides D3 and overrides the skill's "rulings, not stalls".**
  - **The rule.** If you or any sub-agent is unsure **at all** about any row, node, relationship, file or reference, that target stops. Report what was found and ask Evan. Delete nothing for that target until he answers. Never guess, never widen a selector, and never "clean up what looks like demo data".
  - **What counts as a stop.** Every `GATE FAIL`, every non-zero phase exit, every commit state other than the expected one, every G7 content doubt, and every tooling mismatch. You do **not** rule on them. The only exceptions are the plan's single G6 re-freeze rule and its commit-state rules.
  - **Other targets keep going.** Continue with the other, independent tasks.
  - **How to ask.** Collect every open question in the results file's "Open questions for Evan" and present them together, as a numbered list, the moment no runnable task remains. Also ask immediately if a stop happens after a committed delete: a `post` failure, a `MIXED`/`UNKNOWN` state, or a chudios purge failure.
  - **Tasks 9–10 wait.** They do not start until Evan has answered every question and each answer is recorded. That wait is intended.
- **The tooling is frozen.** `docs/superpowers/plans/2026-09-14-showcase-demo-data/` must pass `sha256sum -c SHA256SUMS` before every task. A change it seems to need is a D4 stop, never a fix. Implementers and reviewers must not edit it.

## How to run it

- **Worktrees.**
  - portfolio_site: create a worktree per the skill (superpowers:using-git-worktrees), branched from `main`. Run the tooling from the worktree root with the plan's relative paths.
  - infra: Task 9 creates its own worktree, `/home/evan/worktrees/infra-showcase-demo-data`, on branch `showcase-demo-data-meta-prompt`. Never edit the infra main checkout.
- **Evidence** goes only to `/home/evan/showcase-pending/_teardown-evidence/` (mode 700). Never commit it. Never paste it wholesale into a report or a dispatch, apart from the G7 inspection file, which the implementer reads in full.
- **Order.** Tasks run strictly in order (1 → 10), one at a time. Never dispatch two implementers at once.
- **Models.** Never use Fable for any sub-agent. Pass `model` explicitly on every dispatch.
  - `opus` for the Tasks 1–8 implementers, every task reviewer, and the final whole-branch reviewer.
  - `sonnet` is acceptable for the Tasks 9–10 implementers.
- **Implementer reports.** An implementer that hits D4 records the target's state and question in the results file, commits, and returns `BLOCKED` with the exact `GATE FAIL` line (or its judgment) and the question. It then stops: no retry, and no alternative path. Record the stop in the ledger as `Task <N>: STOPPED — <target> — <reason> — question: <question>`, then move to the next task.
- **Task 8** always ends `BLOCKED` with the chunk-norris question. That is expected.
- **Reviewers** get the task brief, the implementer's report, the review package (the results-file diff) and the target's evidence directory. They follow the plan's "Reviewer checklist". For cleanup tasks that means:
  1. snapshot the original evidence mtimes first;
  2. read the whole G7 file (`g7-inspection.txt`, or mind-palace's `fingerprint.txt`) and judge it independently;
  3. re-verify with `GATE_REVIEW=1` `classify` and `post`, which write only under `review/`;
  4. confirm the originals didn't change.

  Reviewers never run a phase without `GATE_REVIEW=1`, and never run a write phase.
- **Commits.**
  - In the portfolio_site worktree: the results file and the session log.
  - In the infra worktree branch: Task 9's two files.
  - Always use `git commit --only -m … -- <paths>`. Never push, and never merge; merging is Evan's call at the finish.
- **Finish.**
  - Run the skill's final whole-branch review on `opus`.
  - Present Evan with: the Summary table, every "Rulings I made" line, every D4 question with its answer, and the unmerged infra branch.
  - Then run superpowers:finishing-a-development-branch for the portfolio_site worktree. Also offer the same merge choice for the infra branch `showcase-demo-data-meta-prompt`.

## First actions

1. Load superpowers:subagent-driven-development, then read the plan and the spec once.
2. Run the skill's pre-flight conflict scan, and write its table to the ledger.
3. Check that neither `showcase_gate_selftest` nor `showcase_gate_digestcalc` exists as a database, that `/home/evan/showcase-pending/_teardown-evidence/` holds only the three backup files named in plan Task 1 Step 2, and that `/data/recordings/.showcase-quarantine` does not exist in `chudios-backend-1`. If any check fails, stop and ask; do not clean anything up.
4. Dispatch Task 1.
