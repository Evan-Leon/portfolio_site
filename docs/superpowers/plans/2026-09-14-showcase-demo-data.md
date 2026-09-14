# Showcase Demo Data Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the portfolio-showcase demo data still sitting in six apps' local stores, plus co-host's one leftover artifact in CHUD. Prove with a fail-closed gate that no real row, node or file was deleted or changed. Then record every showcase-touched app's disposition and change the showcase meta-prompt so demo data goes into throwaway stores from now on.

**Architecture:** All deletion runs through committed, already-validated tooling in `docs/superpowers/plans/2026-09-14-showcase-demo-data/`.
- **Postgres gate** (`gate.sql` + `gate-run.sh` + one declaration per target). Session-temporary functions check:
  - the target: container, compose project, database, a pinned migration manifest, and anchors;
  - the dependency closure: foreign keys with pinned delete rules, DELETE/UPDATE triggers pinned by definition digest, and no rewrite rules;
  - exact scope counts, inbound references, outbound references, and survivor hashes.

  Freeze captures everything in one repeatable-read transaction, including a digest of the scope rows' content. The delete transaction locks the scope rows, re-proves the content digest, the ids and the survivors, deletes children first by exact id, and re-proves the survivors. Rehearsal (rolled back) and a negative control come first. Every `execute` is followed by a read-only commit-state classification.
- **Neo4j** (`neo4j/mind-palace-gate.sh`): the same phase shape, ending in one atomic conditional delete that also requires the route's property fingerprint to equal the freeze.
- **Volume files** (`files/chudios-files.sh`): a two-phase, per-file resumable quarantine protocol keyed to the database's classified commit state.

Each task runs one app's phases in a fixed order, records the evidence and the app's state, and commits a results entry. Nothing is committed to any app repo.

**Tech Stack:** bash, PostgreSQL 17 (`infra-postgres-1`, local Supabase `supabase_db_the-classic`), Neo4j 5.26 community (`mind-palace-neo4j-1`), docker, python3 (read-only evidence inspection only).

**Spec:** `docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md` (Rev 3; D1–D6 and the "Rev 3 amendments" section are binding). Reviews: `docs/superpowers/specs/2026-09-14-showcase-demo-data-codex-review.md` (spec) and `docs/superpowers/plans/2026-09-14-showcase-demo-data-plan-codex-review.md` (plan rev 1.1).

## Global Constraints

- **D4 — STOP-AND-ASK. This overrides everything else in this plan.** If you are unsure **at all** about any row, node, relationship, file or reference, stop. Report what you found and ask Evan. Delete nothing for that app until he answers. Never guess, never widen a selector, and never "clean up what looks like demo data".
  - **Mechanical triggers:** every `GATE FAIL`, every non-zero phase exit, every commit state other than the expected one, and every tooling-manifest mismatch.
  - **Judgment triggers:**
    - exported text that reads like real content (a real person's name, a real email, prose that reads like Evan's own writing);
    - a timestamp outside the showcase window that nothing explains;
    - a table, column or reference this plan did not anticipate;
    - anything you would describe as "probably fine".
  - **Outbound references to allowlisted retained shared rows are not triggers.**
  - **A stop on one app halts only that app.** Continue with independent tasks; the controller asks Evan.
- **D3 — Authority.** Evan's approval of this plan authorizes exactly:
  - the `execute` phases of the committed tooling for co-host, co-host-chud, co-author, chudios, mind-palace, LeonsBudget and the-classic (Tasks 2–7);
  - the chudios `purge` of the three quarantined files once the chudios database execute is classified `COMMITTED`.

  `execute` may run only after that target's `rehearse` and `negative` phases have passed against its current freeze (mind-palace also needs `dry`). No other DELETE, UPDATE, `DETACH DELETE`, `rm` or `mv` may be run by hand against any app store, by you or by any sub-agent.
- **D5 / D6.** co-host's CHUD artifact `e6135781-…` (declaration `co-host-chud`) and the-classic's 5 demo `auth.audit_log_entries` rows are in scope. Nothing else in chud is touched. Conversation 7206 stays (D2), and `co-host-chud`'s declaration checks its 8 messages before and after.
- **The tooling is frozen.** Before every task, run `(cd docs/superpowers/plans/2026-09-14-showcase-demo-data && sha256sum -c SHA256SUMS)`; every line must say `OK`. Never edit anything under that directory during execution. A change the tooling seems to need (a count, an allowlist entry, a pin, a check) is a D4 stop, never a fix.
- **Evidence** lives only in `/home/evan/showcase-pending/_teardown-evidence/` (mode 700). It is never committed. Never paste it wholesale into a commit, a report or a dispatch; quote single log lines only, except the G7 inspection, which the implementer reads in full.
- **Phase order per Postgres target is fixed:** preflight → freeze → G7 inspection → rehearse → negative → execute → post. mind-palace adds `dry` after G7.
- **Re-freeze rule.** Applies at most **once per target**, and only when `rehearse`, `negative` or `execute` fails with `GATE FAIL G6` (`survivors` or `scope rows changed`) and `state.txt` is not `COMMITTED`: run `gate-run.sh <target> refreeze`, redo G7 on the new freeze, then continue from rehearse. A second G6 failure is a D4 stop. Neo4j has no re-freeze; a changed hash or fingerprint there is a stop.
- **Commit states.** `execute` writes `state.txt` and passes only on `COMMITTED`.
  - `PRE-STATE` means nothing was deleted: apply the re-freeze rule if the failure was G6, otherwise D4 stop.
  - `COMMITTED` with a non-zero exit (a transport anomaly): run `post` (read-only), record both, then D4 stop.
  - `MIXED` or `UNKNOWN`: D4 stop immediately, with no further command on that target.
- **Per-app state** is recorded in the results file as exactly one of: `NOT-STARTED`, `STOPPED at <phase> — question: <question>`, `ROLLED-BACK (PRE-STATE)`, `COMMITTED`, `POST-VERIFIED`. A task finishes cleanly only at `POST-VERIFIED`.
- **Questions gate the finish.** Tasks 9 and 10 run only after Evan has answered every open D4 question from Tasks 1–8, with each answer recorded in the results file. The controller asks and waits. That wait is the one intended pause.
- **Never touch:** chud's conversations, messages, notes or anything outside `co-host-chud`'s scope; app-dash, graces-tree, jourNOW, voice-trainer, NomNoms, Prompt-heus, logson, el-blackjack-pwa.
  - No container restarts.
  - No `supabase` CLI command. the-classic's CLI is linked to production.
  - No app test suites; the-classic's backend suite writes to the live local Supabase.
  - No app repo writes or commits.
- **Commits.**
  - portfolio_site: only this plan's worktree (the results file and the session log).
  - infra: only the Task 9 worktree branch.
  - Always use `git commit --only -m "<msg>" -- <paths>`. Never push.
- **Sub-agents** never run on Fable.
  - `opus` for the implementers of Tasks 1–8 and every reviewer.
  - `sonnet` may implement Tasks 9–10.
  - Tasks run strictly one at a time.

## File Structure

Existing, committed, validated before this plan was written (see "Plan review record"):

| Path (under `docs/superpowers/plans/2026-09-14-showcase-demo-data/`) | Responsibility |
|---|---|
| `gate.sql` | Session-temporary gate library: G1 helpers, closure G2, preflight G3–G5, post-mode preflight, SHA-256 survivor/scope-row/id digests, row locks, delete G9, post G10, commit-state classifier. Creates nothing persistent. |
| `gate-run.sh` | Runs one Postgres target's phase: `preflight`, `freeze`, `refreeze`, `rehearse`, `negative`, `execute`, `classify`, `post`. It also does the G1 container check, timeouts and evidence files. |
| `apps/{co-host,co-host-chud,co-author,chudios,leonsbudget,the-classic}.sql` | Per-target declaration: mode-aware anchors, the migration-manifest pin, the exact scope and counts, the delete order, the FK allowlist with delete rules, the trigger allowlist with digests, retained parents, and extra checks with pre and post values. |
| `apps/selftest.sql`, `apps/selftest-flip.sql`, `selftest/schema.sql`, `selftest/selftest.sh` | Gate self-test in the throwaway database `showcase_gate_selftest` (created and dropped by the script). |
| `neo4j/mind-palace-gate.sh` | mind-palace Route removal: `preflight`, `freeze` (with fingerprint), `dry`, `rehearse`, `negative`, `execute`, `classify`, `post`. |
| `files/chudios-files.sh`, `files/selftest-files.sh` | chudios demo recordings: `check`, `quarantine`, `restore`, `purge`, `post`, resumable per file. Its self-test runs in a unique `mktemp` directory inside the container. |
| `inspect-scope.py` | G7 aid: prints every text value of a frozen `scope.json`, untruncated, with secret keys masked; exit 3 on a count mismatch. |
| `SHA256SUMS` | Freeze manifest for all of the above. |

Created by this plan:

| Path | Responsibility |
|---|---|
| `docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md` (portfolio_site worktree) | One section per task: the app state, every phase exit, key numbers, and evidence paths. It is each task's review surface. |
| `/home/evan/worktrees/infra-showcase-demo-data/meta-prompts/portfolio-showcase/{portfolio-showcase.md,portfolio-showcase-changelog.md}` (infra worktree branch `showcase-demo-data-meta-prompt`) | Task 9 edits. |
| `docs/session-logs/<timestamp>-claude-code-showcase-demo-data-cleanup.md` (portfolio_site worktree) | Task 10. |

Shell variables: set them at the start of **each** Bash call, because shell state does not persist between calls.

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
R=docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
EVID=/home/evan/showcase-pending/_teardown-evidence
```

Every phase prints `PASS <target> <phase>` and exits 0, or prints `STOP …` plus the first `GATE FAIL` line and exits non-zero. Capture the exit directly: `"$T/gate-run.sh" co-host preflight; echo "exit=$?"`. Never pipe a phase through `tail`, `head` or `tee`.

**Reviewer checklist for every cleanup task (Tasks 2–7).** The reviewer gets the task brief, the implementer's report, the review package (the results-file diff) and the target's evidence directory path. It may read the evidence but must never edit it, and it must never run a phase without `GATE_REVIEW=1`. In order:
1. **Snapshot the originals first.** Run `ls -l --time-style=full-iso /home/evan/showcase-pending/_teardown-evidence/<target>`. Confirm from those mtimes that the phases ran in the fixed order, and that the results entry's numbers match the logs.
2. **Judge G7 independently.** Read the **whole** `g7-inspection.txt` (mind-palace: `fingerprint.txt`) and record your own verdict on whether anything reads as real data. Do not rely on the implementer's sentence.
3. **Re-verify in reviewer mode**, which writes only under `<target>/review/` and never touches the original logs or `state.txt`:
   - `GATE_REVIEW=1 "$T/gate-run.sh" <target> classify` (must print `state: COMMITTED`), then `GATE_REVIEW=1 "$T/gate-run.sh" <target> post` (must `PASS`);
   - for mind-palace, the same phases through `neo4j/mind-palace-gate.sh`.
4. **Confirm nothing moved.** Re-run step 1's `ls`: every original file keeps its size and mtime, and only `review/` is new.

For a stopped task, the reviewer confirms instead that `state.txt` and the question are recorded, and that no write phase ran after the stop.

---

### Task 1: Verify tooling, run the self-tests, preflight every target (read-only)

**Files:**
- Create: `docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md`

**Interfaces:**
- Consumes: the committed tooling listed above.
- Produces: the results file with `## Task 1` and a `## States` table. Later tasks update their row and append `## Task N — <target>` sections.

- [ ] **Step 1: Verify the tooling manifest**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS); echo "exit=$?"
```
Expected: every line `OK`, and `exit=0`. Anything else → D4 stop.

- [ ] **Step 2: Confirm nothing from an earlier run exists**

```bash
EVID=/home/evan/showcase-pending/_teardown-evidence
stat -c '%a %U' "$EVID"; ls -la "$EVID"
timeout --foreground -k 10 60 docker exec infra-postgres-1 psql -U postgres -At -c "SELECT count(*) FROM pg_database WHERE datname IN ('showcase_gate_selftest','showcase_gate_digestcalc')"
timeout --foreground -k 10 60 docker exec chudios-backend-1 sh -c 'ls -d /tmp/gate-files-selftest.* /data/recordings/.showcase-quarantine 2>/dev/null | wc -l'
```
Expected:
- `700 evan`;
- only these three files: `graces-tree-pre-cleanup-backup-2026-09-13.json`, `journow-demo-entries-2026-09-14.csv`, `journow-demo-user-2026-09-14.csv`;
- `0`, then `0`.

Anything else → D4 stop. Do not clean it up.

- [ ] **Step 3: Run the SQL gate self-test**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
timeout --foreground -k 30 1800 "$T/selftest/selftest.sh" > /tmp/showcase-gate-selftest.log 2>&1; echo "exit=$?"
grep '^FAIL\|selftest:' /tmp/showcase-gate-selftest.log
```
Expected: `exit=0`, no `FAIL` line, and last line `selftest: 0 failure(s)`. `exit=124` (or 137) means the self-test timed out → D4 stop. Its trap drops the throwaway database on the way out, so re-check Step 2 before reporting.

- [ ] **Step 4: Run the file-protocol self-test**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
timeout --foreground -k 30 1200 "$T/files/selftest-files.sh" > /tmp/showcase-files-selftest.log 2>&1; echo "exit=$?"
grep '^FAIL\|selftest-files:' /tmp/showcase-files-selftest.log
timeout --foreground -k 10 60 docker exec chudios-backend-1 sh -c 'ls -d /tmp/gate-files-selftest.* 2>/dev/null | wc -l'
```
Expected: `exit=0`, no `FAIL`, `selftest-files: 0 failure(s)`, then `0` (its temporary directory is gone).

- [ ] **Step 5: Preflight every target**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
for a in co-host co-host-chud co-author chudios leonsbudget the-classic; do "$T/gate-run.sh" "$a" preflight; echo "$a exit=$?"; done
"$T/neo4j/mind-palace-gate.sh" preflight; echo "mind-palace exit=$?"
"$T/files/chudios-files.sh" check; echo "chudios-files exit=$?"
```
Expected: eight `PASS` lines and eight `exit=0`. A STOP is a D4 stop for **that target only**. Record it as `STOPPED at preflight — …`, keep going with Task 1, and later record that target's task as not run.

- [ ] **Step 6: Create the results file**

Write `docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md`, filling in real values:

```markdown
# Showcase Demo Data Cleanup — Results

Plan: `docs/superpowers/plans/2026-09-14-showcase-demo-data.md` · Spec: `docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md`
Evidence (never committed): `/home/evan/showcase-pending/_teardown-evidence/<target>/`

## States

| Target | State |
|---|---|
| co-host | NOT-STARTED |
| co-host-chud | NOT-STARTED |
| co-author | NOT-STARTED |
| chudios (db + files) | NOT-STARTED |
| mind-palace | NOT-STARTED |
| leonsbudget | NOT-STARTED |
| the-classic | NOT-STARTED |
| chunk-norris audit | NOT-STARTED |

## Open questions for Evan

(none yet)

## Task 1 — tooling and preflight

| Check | Result |
|---|---|
| `sha256sum -c SHA256SUMS` | exit=0, all OK |
| no earlier run (evidence, selftest DBs, container temp dirs, quarantine) | clean |
| gate self-test | exit=0, 0 failures |
| file self-test | exit=0, 0 failures, temp dir removed |
| preflight co-host / co-host-chud / co-author / chudios / leonsbudget / the-classic | exit=0 ×6 |
| preflight mind-palace | exit=0 |
| chudios files check | exit=0 |
```

A target that stopped at Step 5 gets its `States` row set to `STOPPED at preflight — question: <question>`, and the question is added under "Open questions for Evan".

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
git commit --only -m "docs(showcase-cleanup): task 1 — tooling verified, self-tests pass, all targets preflighted" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 2: co-host — channel `ch_b11b31a0d9ae` "The Long Fuse", then its CHUD artifact

**Files:**
- Modify: the results file (the `States` rows for co-host and co-host-chud; append `## Task 2 — co-host`)

**Interfaces:**
- Consumes: `gate-run.sh co-host <phase>`, `gate-run.sh co-host-chud <phase>`, `inspect-scope.py`.
- Produces: `$EVID/co-host/` and `$EVID/co-host-chud/`.

**Expected scope.**
- **co-host** (database `co_host`): timeline_events 7, table_reads 1, reviews 0, script_versions 2, beat_sheet_versions 2, chud_jobs 1 (`job_fba52731d285`), episodes 2 (`ep_a78a3f018922` "The Year Without a Summer", `ep_df1c614c159e` "The Great Molasses Flood"), premises 2, bible_amendments 0, character_bible_versions 0, character_bibles 0, show_bible_versions 1, show_bibles 1, channels 1. The 6 other channels survive.
- **co-host-chud** (database `chud`, D5): artifacts 1 (`e6135781-781a-436f-9af0-fb79136abd5b`, `source_bundle`, created 2026-09-06 19:23:58 UTC, naming "The Long Fuse"). No other chud row references it. Conversation 7206 keeps its 8 messages.

The two targets are independent gates. Run co-host fully, then co-host-chud. A stop in one does not block the other.

- [ ] **Step 1: Verify tooling**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS) > /dev/null; echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 2: co-host — preflight and freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" co-host preflight; echo "preflight exit=$?"
"$T/gate-run.sh" co-host freeze; echo "freeze exit=$?"
```
Expected: two `PASS` lines, and both exits 0. Five frozen files are now in `$EVID/co-host/`.

- [ ] **Step 3: co-host — G7 content inspection (judgment step)**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; EVID=/home/evan/showcase-pending/_teardown-evidence
python3 "$T/inspect-scope.py" "$EVID/co-host/scope.json" > "$EVID/co-host/g7-inspection.txt"; echo "exit=$?"
wc -l "$EVID/co-host/g7-inspection.txt"
```
Expected: `exit=0`, meaning every count matches. Now **read the whole of `g7-inspection.txt` with the Read tool**. Every text must belong to the fictional "The Long Fuse" show: its premises, bible, beat sheets, scripts and table read, the episodes "The Year Without a Summer" and "The Great Molasses Flood", and the failed energy-map job. Evan's real channels must not appear.
- A real person's name, text belonging to another channel, or prose that reads like Evan's own notes → D4 stop.
- Write one sentence of what you read into the results entry (Step 9).

- [ ] **Step 4: co-host — rehearse, negative control, execute, post**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" co-host rehearse; echo "rehearse exit=$?"
"$T/gate-run.sh" co-host negative; echo "negative exit=$?"
```
Expected: both `PASS`, both exits 0.
- A G6 failure: apply the re-freeze rule. Run `"$T/gate-run.sh" co-host refreeze`, repeat Step 3 on the new freeze, then repeat this step.
- Any other failure → D4 stop.

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" co-host execute; echo "execute exit=$?"; cat /home/evan/showcase-pending/_teardown-evidence/co-host/state.txt
"$T/gate-run.sh" co-host post; echo "post exit=$?"
```
Expected: `PASS co-host execute`, `exit=0`, `COMMITTED`, then `PASS co-host post`, `exit=0`. On any other outcome, follow the **Commit states** rule in Global Constraints.

- [ ] **Step 5: co-host-chud — preflight and freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" co-host-chud preflight; echo "preflight exit=$?"
"$T/gate-run.sh" co-host-chud freeze; echo "freeze exit=$?"
```
Expected: two `PASS` lines, both exits 0.

- [ ] **Step 6: co-host-chud — G7 content inspection**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; EVID=/home/evan/showcase-pending/_teardown-evidence
python3 "$T/inspect-scope.py" "$EVID/co-host-chud/scope.json" > "$EVID/co-host-chud/g7-inspection.txt"; echo "exit=$?"
```
Expected: `exit=0`. Read the whole file. The artifact must be a source bundle for "The Long Fuse" demo show's energy map: episode premises, beats and the like from the demo channel. Anything about Evan's real channels or other content → D4 stop.

- [ ] **Step 7: co-host-chud — rehearse, negative control, execute, post**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" co-host-chud rehearse; echo "rehearse exit=$?"
"$T/gate-run.sh" co-host-chud negative; echo "negative exit=$?"
```
Expected: both `PASS`. CHUD writes artifacts during its nightly jobs, so a G6 `survivors` failure here is plausible: apply the re-freeze rule. Any other failure → D4 stop.

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" co-host-chud execute; echo "execute exit=$?"; cat /home/evan/showcase-pending/_teardown-evidence/co-host-chud/state.txt
"$T/gate-run.sh" co-host-chud post; echo "post exit=$?"
```
Expected: `PASS`, `exit=0`, `COMMITTED`, then `PASS`, `exit=0`. The post check also re-confirms conversation 7206 still has 8 messages.

- [ ] **Step 8: Update States**

Set the `States` rows for co-host and co-host-chud to their final state (`POST-VERIFIED` or the stop). Add any question under "Open questions for Evan".

- [ ] **Step 9: Record and commit**

Append:

```markdown
## Task 2 — co-host

### co-host (co_host)
State: **<POST-VERIFIED | STOPPED at …>** (<UTC time of execute.log>)
| Phase | exit | Evidence |
|---|---|---|
| preflight | 0 | `co-host/preflight.log` |
| freeze | 0 | `co-host/scope.json`, rows digest `<first 12 hex of rows-digest.txt>` |
| G7 inspection | fictional | `co-host/g7-inspection.txt` — <one sentence> |
| rehearse | 0 | `co-host/rehearse.log` (GATE ROLLED BACK) |
| negative | 0 | `co-host/negative.log` (GATE FAIL G3 count, as designed) |
| execute | 0 | `co-host/execute.log` (GATE COMMITTED; state COMMITTED) |
| post | 0 | `co-host/post.log` (GATE POST SCOPE OK, GATE POST OK) |
Deleted: timeline_events 7, table_reads 1, script_versions 2, beat_sheet_versions 2, chud_jobs 1, episodes 2, premises 2, show_bible_versions 1, show_bibles 1, channels 1.

### co-host-chud (chud)
State: **<…>** — same table shape. Deleted: artifacts 1 (`e6135781-…`). Conversation 7206: 8 messages before and after.
```

A refreeze adds a row `refreeze | 0 | co-host/superseded-<ts>/ — reason: <the G6 line>`. A stop lists only the phases that ran, plus the question.

```bash
git commit --only -m "docs(showcase-cleanup): task 2 — co-host demo channel and its CHUD artifact" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 3: co-author — user 2 and story 7 "The Lighthouse at Kestrel Point"

**Files:**
- Modify: the results file (the `States` row; append `## Task 3 — co-author`)

**Interfaces:**
- Consumes: `gate-run.sh co-author <phase>`, `inspect-scope.py`.
- Produces: `$EVID/co-author/`.

**Expected scope:** token_blacklist_blacklistedtoken 0, token_blacklist_outstandingtoken 16, beat_drafts_beatdraft 3, beats_beat_characters 14, beats_beat_events 6, events_event_characters 15, open_questions_openquestion_linked_characters 7, …_linked_events 4, …_linked_relationships 0, …_linked_settings 0, beats_beat 5, open_questions_openquestion 4, relationships_relationship 3, events_event 6, characters_character 5, settings_places_setting 4, stories_story 1, auth_user_groups 0, auth_user_user_permissions 0, django_admin_log 0, auth_user 1.
- The outstanding-token count grows each time the demo account logs in. A different count is a D4 stop: someone used the account.

- [ ] **Step 1: Verify tooling**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS) > /dev/null; echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 2: Preflight and freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" co-author preflight; echo "preflight exit=$?"
"$T/gate-run.sh" co-author freeze; echo "freeze exit=$?"
```
Expected: two `PASS` lines, both exits 0.

- [ ] **Step 3: G7 content inspection**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; EVID=/home/evan/showcase-pending/_teardown-evidence
python3 "$T/inspect-scope.py" "$EVID/co-author/scope.json" > "$EVID/co-author/g7-inspection.txt"; echo "exit=$?"
```
Expected: `exit=0`. Read the whole file. `auth_user` is `demo@example.com` ("Demo Writer"). Every story element belongs to the fictional radio drama "The Lighthouse at Kestrel Point". Token rows show only masked values. Anything from Evan's real stories or account → D4 stop.

- [ ] **Step 4: Rehearse and negative control**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" co-author rehearse; echo "rehearse exit=$?"
"$T/gate-run.sh" co-author negative; echo "negative exit=$?"
```
Expected: both `PASS`. For G6, apply the re-freeze rule (`refreeze`, then Step 3 again, then this step). Anything else → D4 stop.

- [ ] **Step 5: Execute and post**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" co-author execute; echo "execute exit=$?"; cat /home/evan/showcase-pending/_teardown-evidence/co-author/state.txt
"$T/gate-run.sh" co-author post; echo "post exit=$?"
```
Expected: `PASS`, `exit=0`, `COMMITTED`, then `PASS`, `exit=0`. Otherwise follow the **Commit states** rule.

- [ ] **Step 6: Record and commit**

Update the `States` row. Append `## Task 3 — co-author` in Task 2's table shape. `Deleted:` outstanding tokens 16, beat drafts 3, beat↔character 14, beat↔event 6, event↔character 15, open-question↔character 7, open-question↔event 4, beats 5, open questions 4, relationships 3, events 6, characters 5, settings 4, story 1, user 1.

```bash
git commit --only -m "docs(showcase-cleanup): task 3 — co-author demo user and story" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 4: chudios — the "Signal & Noise" show and its three recordings

**Files:**
- Modify: the results file (the `States` row; append `## Task 4 — chudios`)

**Interfaces:**
- Consumes: `gate-run.sh chudios <phase>`, `files/chudios-files.sh <phase>`, `inspect-scope.py`.
- Produces: `$EVID/chudios/` (gate files, `state.txt`, `files-*.log`).

**Expected scope:**
- **Database:** qc_reports 1, transcripts 2, stage_runs 8, clips 9, marketing_assets 7, published_status 4, attempts 6, content_items 6 (ids `dddddddd-…`). The 8 other content items survive.
- **Files** in volume `chudios_chudios-recordings` at `/data/recordings`: `demo-sn-ep09.m4a` (230111 B), `demo-sn-ep11.m4a` (246791 B), `demo-sn-ep12.m4a` (286386 B), with the sha256 values embedded in `files/chudios-files.sh`.

**The ordering is load-bearing.**
1. Files move to quarantine only after the database's `rehearse` and `negative` pass.
2. They are purged only when the database `execute` is classified `COMMITTED`.
3. They are restored only when it is classified `PRE-STATE`.
4. Any other state keeps them quarantined and stops.

- [ ] **Step 1: Verify tooling**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS) > /dev/null; echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 2: Preflight, file check, freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" chudios preflight; echo "preflight exit=$?"
"$T/files/chudios-files.sh" check; echo "files check exit=$?"
"$T/gate-run.sh" chudios freeze; echo "freeze exit=$?"
```
Expected: three `PASS` lines, all exits 0.

- [ ] **Step 3: G7 content inspection**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; EVID=/home/evan/showcase-pending/_teardown-evidence
python3 "$T/inspect-scope.py" "$EVID/chudios/scope.json" > "$EVID/chudios/g7-inspection.txt"; echo "exit=$?"
```
Expected: `exit=0`. Read the whole file. Every item belongs to the fictional "Signal & Noise" podcast, and recording paths name only `demo-sn-ep09/11/12.m4a`. Any real episode title, or a path to a non-demo file → D4 stop, with the files untouched.

- [ ] **Step 4: Rehearse and negative control**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" chudios rehearse; echo "rehearse exit=$?"
"$T/gate-run.sh" chudios negative; echo "negative exit=$?"
```
Expected: both `PASS`. For G6, apply the re-freeze rule. Anything else → D4 stop, with the files untouched.

- [ ] **Step 5: Quarantine the files**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/files/chudios-files.sh" quarantine; echo "exit=$?"
```
Expected: `PASS chudios files quarantine`, `exit=0`. If it fails partway, run the same command once more; it resumes per file. If that fails too, D4 stop, and record where each file is, from `files-quarantine.log`.

- [ ] **Step 6: Execute the database delete, then purge or restore, by classified state**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; EVID=/home/evan/showcase-pending/_teardown-evidence
"$T/gate-run.sh" chudios execute; st=$?; echo "execute exit=$st"
state="$(cat "$EVID/chudios/state.txt" 2>/dev/null)"; echo "state=$state"
case "$state" in
  COMMITTED) "$T/files/chudios-files.sh" purge;   echo "purge exit=$?" ;;
  PRE-STATE) "$T/files/chudios-files.sh" restore; echo "restore exit=$?" ;;
  *)         echo "state '$state': files stay quarantined — D4 stop" ;;
esac
```
Expected: `execute exit=0`, `state=COMMITTED`, `purge exit=0`.
- **`PRE-STATE`:** nothing was deleted and `restore exit=0` must follow. For a G6 failure, apply the re-freeze rule, restarting at Step 3 after the restore. Otherwise D4 stop.
- **`COMMITTED` with a non-zero execute exit:** purge still runs, because the rows are gone. Then run Step 7 and D4 stop.
- **A purge failure after `COMMITTED`:** re-run purge once, since it resumes. If it fails again, D4 stop immediately.

- [ ] **Step 7: Post-checks**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" chudios post; echo "db post exit=$?"
"$T/files/chudios-files.sh" post; echo "files post exit=$?"
```
Expected: both `PASS`, both exits 0.

- [ ] **Step 8: Record and commit**

Update the `States` row. Append `## Task 4 — chudios` in Task 2's table shape, plus rows for `files check`, `files quarantine` and `files purge` (or `restore`), and `files post`. `Deleted:` qc_reports 1, transcripts 2, stage_runs 8, clips 9, marketing_assets 7, published_status 4, attempts 6, content_items 6, and files demo-sn-ep09/11/12.m4a. On a stop, record where the files are.

```bash
git commit --only -m "docs(showcase-cleanup): task 4 — chudios demo show and recordings" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 5: mind-palace — the "Collective Security" Route

**Files:**
- Modify: the results file (the `States` row; append `## Task 5 — mind-palace`)

**Interfaces:**
- Consumes: `neo4j/mind-palace-gate.sh <phase>`.
- Produces: `$EVID/mind-palace/` (`scope.txt`, `degrees.txt`, `snapshot.txt`, `fingerprint.txt`, `state.txt`, logs).

**Expected shape:**
- Route 2 total, Entity 228, HAS_STEP 5 total.
- The demo route `60c383d5-921e-443c-9430-b2242469fbe0` is "Collective Security", with 0 inbound links and 4 outbound HAS_STEP links to League of Nations (degree 3), United Nations (2), World War I (9) and World War II (14).
- The other route has 1 relationship.

Only the Route node and its own 4 relationships are deleted. Entity nodes are never deleted.

- [ ] **Step 1: Verify tooling**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS) > /dev/null; echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 2: Preflight and freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/neo4j/mind-palace-gate.sh" preflight; echo "preflight exit=$?"
"$T/neo4j/mind-palace-gate.sh" freeze; echo "freeze exit=$?"
```
Expected: two `PASS` lines, both exits 0.

- [ ] **Step 3: G7 content inspection**

Read `/home/evan/showcase-pending/_teardown-evidence/mind-palace/fingerprint.txt` with the Read tool. This is the exact value the conditional delete will compare. Every route and step property is written as `length:key|type|length:value`, so what you inspect is exactly what gets deleted. `scope.txt` is a readable copy of the same content.

Expected: one route "Collective Security" with 4 `HAS_STEP` rows, each with `elaboration_note`, `last_reviewed_at` and `position`, pointing at the four entities. The notes are short demo lines about collective security between the wars; one reads "The referee they built — but with no standing army and no United States, it had no whistle." A note that reads like Evan's own study notes → D4 stop.

- [ ] **Step 4: Dry run, rehearse, negative control**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/neo4j/mind-palace-gate.sh" dry; echo "dry exit=$?"
"$T/neo4j/mind-palace-gate.sh" rehearse; echo "rehearse exit=$?"
"$T/neo4j/mind-palace-gate.sh" negative; echo "negative exit=$?"
```
Expected: three `PASS` lines. `dry.log` shows the real statement returning `4` and the wrong-name one returning nothing. `rehearse.log` contains `deleted_steps` / `4` / `remaining_in_tx` / `0` (rolled back). Any failure → D4 stop; there is no re-freeze.

- [ ] **Step 5: Execute and post**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/neo4j/mind-palace-gate.sh" execute; echo "execute exit=$?"; cat /home/evan/showcase-pending/_teardown-evidence/mind-palace/state.txt
"$T/neo4j/mind-palace-gate.sh" post; echo "post exit=$?"
```
Expected: `PASS`, `exit=0`, `COMMITTED`, then `PASS`, `exit=0`. That means Route 1, Entity 228, HAS_STEP 1, the demo route gone, degrees 2/1/8/13 and an unchanged survivor hash. `PRE-STATE` means nothing was deleted: D4 stop. Anything else also follows the **Commit states** rule.

- [ ] **Step 6: Record and commit**

Update the `States` row. Append `## Task 5 — mind-palace` in Task 2's table shape, with `dry` as its own row. `Deleted:` Route 1 and its HAS_STEP relationships 4; 228 Entities retained.

```bash
git commit --only -m "docs(showcase-cleanup): task 5 — mind-palace demo route" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 6: LeonsBudget — user 3, household 3, institution 9

**Files:**
- Modify: the results file (the `States` row; append `## Task 6 — LeonsBudget`)

**Interfaces:**
- Consumes: `gate-run.sh leonsbudget <phase>`, `inspect-scope.py`.
- Produces: `$EVID/leonsbudget/`.

**Expected scope:** categorization_categoryoverride 0, categorization_categoryrule 0, transactions_transaction 71, transactions_importbatch 0, budgets_budgetline 44, budgets_monthlybudget 4, accounts_bankaccount 2, accounts_institution 1 (id 9 "Northwind Bank"), accounts_householdmember 1, accounts_household 1 (id 3 "Demo Household"), auth_user_groups 0, auth_user_user_permissions 0, django_admin_log 0, auth_user 1 (id 3). The retained shared parent is `categorization_category`: 11 distinct categories referenced by lines and 11 by transactions.
- This database holds Evan's real finances. Evan logging in during the run changes `auth_user` and trips G6 (the re-freeze rule).

- [ ] **Step 1: Verify tooling**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS) > /dev/null; echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 2: Preflight and freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" leonsbudget preflight; echo "preflight exit=$?"
"$T/gate-run.sh" leonsbudget freeze; echo "freeze exit=$?"
```
Expected: two `PASS` lines, both exits 0.

- [ ] **Step 3: G7 content inspection**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; EVID=/home/evan/showcase-pending/_teardown-evidence
python3 "$T/inspect-scope.py" "$EVID/leonsbudget/scope.json" > "$EVID/leonsbudget/g7-inspection.txt"; echo "exit=$?"
```
Expected: `exit=0`. Read the whole file.
- `auth_user` is `demo` / `demo@example.com`, the household is "Demo Household", the institution is "Northwind Bank", and every transaction description is a fictional merchant.
- **D4 stop, not a guess:** any description that looks like a real merchant from Evan's statements, a real account number, or a real person's name.

- [ ] **Step 4: Rehearse and negative control**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" leonsbudget rehearse; echo "rehearse exit=$?"
"$T/gate-run.sh" leonsbudget negative; echo "negative exit=$?"
```
Expected: both `PASS`. For G6, apply the re-freeze rule. Anything else → D4 stop.

- [ ] **Step 5: Execute and post**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" leonsbudget execute; echo "execute exit=$?"; cat /home/evan/showcase-pending/_teardown-evidence/leonsbudget/state.txt
"$T/gate-run.sh" leonsbudget post; echo "post exit=$?"
```
Expected: `PASS`, `exit=0`, `COMMITTED`, then `PASS`, `exit=0`. Otherwise follow the **Commit states** rule.

- [ ] **Step 6: Record and commit**

Update the `States` row. Append `## Task 6 — LeonsBudget` in Task 2's table shape. `Deleted:` transactions 71, budget lines 44, monthly budgets 4, bank accounts 2, institution 1 (Northwind Bank), household member 1, household 1, user 1; categories retained.

```bash
git commit --only -m "docs(showcase-cleanup): task 6 — LeonsBudget demo household" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 7: the-classic — the demo auth user, its audit rows, the tournament and the course

**Files:**
- Modify: the results file (the `States` row; append `## Task 7 — the-classic`)

**Interfaces:**
- Consumes: `gate-run.sh the-classic <phase>`, `inspect-scope.py`.
- Produces: `$EVID/the-classic/`.

**Expected scope:** auth.audit_log_entries 5 (D6: `actor_id` = the demo user), auth.mfa_amr_claims 4, auth.refresh_tokens 4, auth.sessions 4, auth.mfa_challenges 0, auth.mfa_factors 0, auth.one_time_tokens 0, auth.oauth_authorizations 0, auth.oauth_consents 0, auth.webauthn_challenges 0, auth.webauthn_credentials 0, auth.identities 1, public.player_scores 0, public.chat_messages 6, public.accolades 6, public.scores 37, public.tournament_players 12, public.foursomes 3, public.tournaments 1 (`dddddddd-dddd-dddd-dddd-dddddddddddd`), public.course_holes 18, public.courses 1 (`d0000000-…`), public.profiles 1, auth.users 1 (`921fafc9-d77f-4b55-b57e-7422f39c30f3`).
- `chirp_templates` row `d22792ea…` is real app data and is **not** in scope.
- Never run a `supabase` CLI command or the app's test suite.
- Any real user logging in writes an audit row, which trips G6 (the re-freeze rule).

- [ ] **Step 1: Verify tooling**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS) > /dev/null; echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 2: Preflight and freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" the-classic preflight; echo "preflight exit=$?"
"$T/gate-run.sh" the-classic freeze; echo "freeze exit=$?"
```
Expected: two `PASS` lines, both exits 0.

- [ ] **Step 3: G7 content inspection**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; EVID=/home/evan/showcase-pending/_teardown-evidence
python3 "$T/inspect-scope.py" "$EVID/the-classic/scope.json" > "$EVID/the-classic/g7-inspection.txt"; echo "exit=$?"
```
Expected: `exit=0`. Read the whole file.
- The 5 audit rows are `user_signedup` plus 4 `login` rows for `demo@example.com`, all between 18:49 and 18:53 UTC on 2026-09-06.
- The user and identity are `demo@example.com`, the profile is "Sam", the course "Cypress Ridge Golf Club", the tournament "The Classic 2026". The 12 players are fictional names, and the 6 chat messages and 6 accolades are golf chirps and awards about them.
- The extra score and chat message (37 and 6, where the capture log said 36 and 5) must sit inside the demo tournament and read as the take's live final beat: a score and its auto-chirp.
- **D4 stop:** any player or message naming a real person (Evan's golf group), or any row you cannot tie to the demo account or tournament.

- [ ] **Step 4: Rehearse and negative control**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" the-classic rehearse; echo "rehearse exit=$?"
"$T/gate-run.sh" the-classic negative; echo "negative exit=$?"
```
Expected: both `PASS`. For G6, apply the re-freeze rule. Anything else → D4 stop.

- [ ] **Step 5: Execute and post**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" the-classic execute; echo "execute exit=$?"; cat /home/evan/showcase-pending/_teardown-evidence/the-classic/state.txt
"$T/gate-run.sh" the-classic post; echo "post exit=$?"
```
Expected: `PASS`, `exit=0`, `COMMITTED`, then `PASS`, `exit=0`. Otherwise follow the **Commit states** rule.

- [ ] **Step 6: Record and commit**

Update the `States` row. Append `## Task 7 — the-classic` in Task 2's table shape. `Deleted:` audit rows 5, auth amr claims 4, refresh tokens 4, sessions 4, identity 1, chat messages 6, accolades 6, scores 37, tournament players 12, foursomes 3, tournament 1, course holes 18, course 1, profile 1, auth user 1.

```bash
git commit --only -m "docs(showcase-cleanup): task 7 — the-classic demo user, audit rows, tournament and course" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 8: chunk-norris — read-only audit of the 2026-08-25 pilot

**Files:**
- Modify: the results file (the `States` row; "Open questions for Evan"; append `## Task 8 — chunk-norris audit`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the chunk-norris disposition line Task 9 copies. There is no open question unless the audit finds new facts: Evan answered the only known one on 2026-09-14 (spec D7). The 11:02 ET re-index was not part of the pilot.

This task **deletes nothing and writes nothing** to any store.

Facts measured 2026-09-14:
- **The pilot.** Its session log (`portfolio_site/archive/session-logs/2026-08-25-17-05-claude-code-portfolio-showcase-meta-prompt.md`) was written at 17:05 ET. The walk was Health → Collections → Test Query → Data Quality, with no ingest step.
- **Postgres.** `chunk_norris` shows 4 `ingest_jobs` rows started on 2026-08-25 ET:
  - three at 06:00 UTC, the nightly schedule;
  - one at 15:02:26 UTC (11:02 ET) for source `5d7fdb85-fd80-4719-8498-7ddf55d48527`, which the nightly run also ingests.
- **Qdrant.** Points carry `indexed_at`, and none of the 18 collections holds a point dated 2026-08-25 or 2026-08-26.

- [ ] **Step 1: Re-run the Postgres audit (half-open ET window)**

```bash
W="'2026-08-25 00:00 America/New_York' AND %s < '2026-08-26 00:00 America/New_York'"
timeout --foreground -k 10 120 docker exec infra-postgres-1 psql -U postgres -d chunk_norris -X -At -v ON_ERROR_STOP=1 -c "
SELECT 'app_registry', count(*) FROM app_registry WHERE (created_at >= $(printf "$W" created_at)) OR (updated_at >= $(printf "$W" updated_at)) OR (last_checked_at >= $(printf "$W" last_checked_at))
UNION ALL SELECT 'ingest_jobs', count(*) FROM ingest_jobs WHERE (started_at >= $(printf "$W" started_at)) OR (completed_at >= $(printf "$W" completed_at))
UNION ALL SELECT 'quality_job_results', count(*) FROM quality_job_results WHERE (started_at >= $(printf "$W" started_at)) OR (completed_at >= $(printf "$W" completed_at))
UNION ALL SELECT 'sources', count(*) FROM sources WHERE (created_at >= $(printf "$W" created_at)) OR (updated_at >= $(printf "$W" updated_at)) OR (last_indexed_at >= $(printf "$W" last_indexed_at))
UNION ALL SELECT 'staleness_flags', count(*) FROM staleness_flags WHERE (raised_at >= $(printf "$W" raised_at)) OR (reviewed_at >= $(printf "$W" reviewed_at));"; echo "exit=$?"
timeout --foreground -k 10 120 docker exec infra-postgres-1 psql -U postgres -d chunk_norris -X -At -c "SELECT id, source_id, status, started_at FROM ingest_jobs WHERE started_at >= '2026-08-25 00:00 America/New_York' AND started_at < '2026-08-26 00:00 America/New_York' ORDER BY started_at;"
```
Expected: `app_registry|0`, `ingest_jobs|4`, `quality_job_results|0`, `sources|0`, `staleness_flags|0`, `exit=0`, then the four jobs above. Different numbers are new facts: record them exactly.

- [ ] **Step 2: Scroll Qdrant for pilot-day points (read-only)**

```bash
timeout --foreground -k 10 600 docker exec -i chunk-norris-backend-1 python - <<'PY'; echo "exit=$?"
import json, urllib.request as u
from datetime import datetime, timezone
START = datetime(2026, 8, 25, 4, 0, tzinfo=timezone.utc)   # 2026-08-25 00:00 America/New_York (EDT)
END = datetime(2026, 8, 26, 4, 0, tzinfo=timezone.utc)     # 2026-08-26 00:00 America/New_York — half-open [START, END)
def post(path, body):
    r = u.Request('http://qdrant:6333' + path, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    return json.load(u.urlopen(r, timeout=30))
cols = sorted(c['name'] for c in json.load(u.urlopen('http://qdrant:6333/collections', timeout=10))['result']['collections'])
bad_total = hit_total = 0
for c in cols:
    n = bad = 0; hits = []; off = None
    while True:
        body = {'limit': 256, 'with_payload': ['indexed_at', 'source_id'], 'with_vector': False}
        if off is not None: body['offset'] = off
        res = post(f'/collections/{c}/points/scroll', body)['result']
        for p in res['points']:
            n += 1
            raw = p.get('payload', {}).get('indexed_at')
            try:
                ts = datetime.fromisoformat(str(raw))
                if ts.tzinfo is None: raise ValueError('naive')
            except (TypeError, ValueError):
                bad += 1; print('   UNPARSEABLE', c, p['id'], repr(raw)); continue
            if START <= ts < END:
                hits.append((p['id'], p['payload'].get('source_id'), str(raw)))
        off = res.get('next_page_offset')
        if off is None: break
    bad_total += bad; hit_total += len(hits)
    print(f"{c} points={n} unparseable_indexed_at={bad} pilot_window_hits={len(hits)}")
    for h in hits: print('   HIT', h)
print(f"TOTAL unparseable={bad_total} hits={hit_total}")
raise SystemExit(3 if (bad_total or hit_total) else 0)
PY
```
Expected: 18 collection lines, each with `unparseable_indexed_at=0 pilot_window_hits=0`, then `TOTAL unparseable=0 hits=0`, and `exit=0` (measured 2026-09-14). `exit=3` means at least one `UNPARSEABLE` or `HIT` line was printed. Any such line is a new fact: record every such line in the results entry, and add it to the Evan question. It changes the disposition, and nothing is deleted.

- [ ] **Step 3: Record the audit**

**If** Step 1 printed exactly the counts and four jobs listed under "Facts measured", **and** Step 2 printed `TOTAL unparseable=0 hits=0` with `exit=0`:
- set the `States` row to `DONE — verified read-only (11:02 ET re-index not part of the pilot: Evan, 2026-09-14, spec D7)`;
- raise no question.

**Otherwise** the audit found new facts:
- set the row to `STOPPED at audit — question pending (read-only; nothing to delete)`;
- add a question to "Open questions for Evan" that quotes every differing count and every `UNPARSEABLE` or `HIT` line.

Either way, append:

```markdown
## Task 8 — chunk-norris audit (read-only)

- Postgres, 2026-08-25 ET (half-open window): <the five count lines>. ingest_jobs: 3 nightly at 06:00 UTC; 1 at 15:02:26 UTC for source 5d7fdb85… (also nightly-ingested).
- Qdrant: <N> collections scrolled with `indexed_at` + `source_id`: <TOTAL line>; <every UNPARSEABLE/HIT line, or "none">.
- The pilot walk had no ingest step.
```

Also add the line `- 11:02 ET re-index: not part of the pilot (Evan, 2026-09-14, spec D7).` to that section. The task returns `DONE`. It returns `BLOCKED` only in the "Otherwise" case, with the new question.

```bash
git commit --only -m "docs(showcase-cleanup): task 8 — chunk-norris pilot audit recorded" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 9: infra — update the showcase meta-prompt (in its own worktree)

**Precondition:** every entry under "Open questions for Evan" in the results file has Evan's answer recorded beside it. If any is unanswered, the controller asks Evan and waits; this task does not start.

**Files:**
- Modify (in the infra worktree): `meta-prompts/portfolio-showcase/portfolio-showcase.md`, `meta-prompts/portfolio-showcase/portfolio-showcase-changelog.md`

**Interfaces:**
- Consumes: the `States` table and every answered question in the results file.
- Produces: the infra branch `showcase-demo-data-meta-prompt` and its commit hash.

- [ ] **Step 1: Create the infra worktree**

```bash
git -C /home/evan/EVOsystem/infra status --short -- meta-prompts/portfolio-showcase/
git -C /home/evan/EVOsystem/infra worktree add /home/evan/worktrees/infra-showcase-demo-data -b showcase-demo-data-meta-prompt
git -C /home/evan/worktrees/infra-showcase-demo-data status --short; git -C /home/evan/worktrees/infra-showcase-demo-data log --oneline -1
```
Expected: the first command prints nothing. If it prints lines, another session is editing these files on infra `main` → D4 stop. Then the worktree is created, and it is clean. Every edit below is made **inside** `/home/evan/worktrees/infra-showcase-demo-data`. Never edit the infra main checkout and never run `git checkout --` there. If an edit goes wrong, remove the worktree and branch, and start this task again.

- [ ] **Step 2: Apply edit E1 — the "Decisions already made" teardown bullet**

In the worktree's `portfolio-showcase.md`, replace exactly:
```
- **Everything the run creates is deleted before the run is done.** That covers
  demo accounts, seeded rows, walk writes, and uploaded files or volume/bucket
  objects. Record a baseline before the first write (STEP 1). Tear down once
  STEP 3's contact sheet passes; the encoded clip and PNGs are all that later
  steps need. The run is not done until the baseline matches again. "Left in
  the dev DB by design" is not an outcome, because the dev database is usually
  the app's real data. On 2026-09-14, jourNOW's 20 demo entries were still
  sitting beside Evan's real journal, and a voice-corpus review had to flag
  them as fake. graces-tree's 17-person demo family had to be removed by hand
  on 2026-09-13.
```
with:
```
- **Demo data never lives in the app's real database.** A run that needs seeded
  data points the app at a throwaway store built from the app's own migrations
  (STEP 1, Write-effects), seeds it with the app's committed
  `scripts/showcase_demo.*`, and drops the store once STEP 3's contact sheet
  passes. The run is not done until the app is back on its real database and
  the throwaway store is gone. "Left in the dev DB by design" is not an outcome:
  the 2026-09-05/06 sweep left demo rows beside real data in nine apps, and
  removing them took a fail-closed gate
  (`portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/`).
  Seeding into a real database needs Evan's explicit approval for that run, and
  its teardown must use that gate.
```

- [ ] **Step 3: Apply edit E2 — replace the leftover list with dispositions**

Replace exactly:
```
**Demo data still in dev databases from runs before the teardown rule
(2026-09-14)**, per their Coverage notes. Each one needs deleting in a session
in that app's repo, guarded the way STEP 1's teardown describes, and then
striking from this list:
- LeonsBudget: `demo@example.com` and its household, 4 budgets, 71 transactions.
- the-classic: `demo@example.com` ("Sam") and the `d`-prefixed demo tournament.
- chudios: the "Signal & Noise" show (`dddddddd-` ids) and three silent `.m4a`
  files in the recordings volume.
- co-host: the "The Long Fuse" channel and its 2 episodes.
- mind-palace: the "Collective Security" route.
- chud: demo conversation 7206.
- co-author: `demo@example.com` and "The Lighthouse at Kestrel Point".
```
with the block below. Fill each `<outcome>` from the `States` table:
- `cleaned <YYYY-MM-DD> (fail-closed gate; evidence kept outside git)` for `POST-VERIFIED`;
- `STOPPED <YYYY-MM-DD> at <phase> — <Evan's answer>` otherwise.

```
**Showcase demo data dispositions (2026-09-14)** — what each run left behind and
what became of it. Record: `portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md`.
- co-host ("The Long Fuse" channel, 2 episodes): <outcome>
- co-host's CHUD residue (source-bundle artifact from the failed demo job): <outcome>
- co-author (`demo@example.com`, "The Lighthouse at Kestrel Point"): <outcome>
- chudios ("Signal & Noise", 6 items, 3 `.m4a` files): <outcome>
- mind-palace ("Collective Security" route): <outcome>
- LeonsBudget (`demo@example.com`, Demo Household, Northwind Bank): <outcome>
- the-classic (`demo@example.com` "Sam", its 5 auth audit rows, "The Classic 2026", Cypress Ridge): <outcome>
- graces-tree: cleaned 2026-09-13 by hand (17 demo people + `demo-arborist`).
- jourNOW: cleaned 2026-09-14 by hand (guarded transaction; 20 entries + demo user).
- chud: retained — conversation 7206 began as the demo Q&A but was reused on 2026-09-10 for real test messages and a session note.
- app-dash: retained — one "Description updated" row in an append-only activity log.
- voice-trainer: read-only verified, one accepted mutation (a real pair's `updated_at` from approve→revert).
- NomNoms: cleaned during its run (every CookSession deleted).
- Prompt-heus, logson: verified read-only.
- el-blackjack-pwa: ephemeral only (browser-context `localStorage`).
- chunk-norris (2026-08-25 pilot): <Task 8's recorded result: if its Qdrant TOTAL line was "unparseable=0 hits=0", write "no pilot-day data remains (Postgres audited, Qdrant scrolled <date>)"; otherwise write the recorded UNPARSEABLE/HIT facts and Evan's disposition of them>; verified read-only (the 11:02 ET re-index was unrelated to the pilot: Evan, 2026-09-14).
```

- [ ] **Step 4: Apply edits E3–E5 — qualify the read-only statements**

Replace exactly:
```
theater rules). The app repo is read-only for this run except `docker compose
up -d`.
```
with:
```
theater rules). App product code is read-only for this run. The only app-repo
writes allowed are `docker compose up -d`, the committed
`scripts/showcase_demo.*` seed script with its fixture and tests (STEP 1), and
the session log.
```
Replace exactly:
```
running UI is behind the repo. Do NOT rebuild — the app repo is read-only and a
```
with:
```
running UI is behind the repo. Do NOT rebuild — app product code is read-only and a
```
Replace exactly:
```
app repo is read-only the fix is to keep that route out of the flow and report
```
with:
```
app's product code is read-only the fix is to keep that route out of the flow and report
```

- [ ] **Step 5: Apply edit E6 — Write-effects**

Replace exactly the block that starts `Write-effects: list everything the run will CREATE. That means what the walk` and ends `incomplete until the baseline matches.` (22 lines, as in the file today) with:
```
Write-effects: list everything the run will CREATE — what the walk writes (a
cook session, an order, an uploaded file) and everything a seed adds (a demo
account, seeded rows, files in a volume or bucket). You will re-run the capture
several times, so each retry leaves another row. Where those writes land decides
the teardown:
- **Seeded demo data (fourth and fifth outcomes) goes into a throwaway store.**
  Create `<db>_showcase` (or a throwaway Neo4j instance, volume or local
  Supabase project) from the app's own migrations — never a copy of real data —
  and start the app against it with a compose override or environment variable
  you do not commit. Teardown is dropping that store and restarting the app on
  its normal configuration, then proving it is back on its real database by
  reading back one known real record. If the app cannot be pointed at a
  throwaway store without a code change, STOP and ask Evan.
- **A walk that writes into the real database** (an app with nothing to seed):
  capture the baseline **before** the first write — row counts for every table
  the walk touches, max ids, which rows were open — and write the exact cleanup
  statements now, scoped by the ids the walk created, never by a date or a
  `LIKE` pattern.
- **STOP-AND-ASK.** If you are unsure **at all** about any row, node,
  relationship, file or reference, stop, report, and ask Evan; delete nothing
  until he answers. Never guess, never widen a selector, never "clean up what
  looks like demo data". Unsure includes: a count that differs from what you
  expect; a row that references, or is referenced by, data outside what the run
  created; exported text that reads like real content (a real person's name, a
  real email, prose that reads like Evan's own writing); a timestamp nothing
  explains; a table, column or reference you did not anticipate; anything you
  would describe as "probably fine".

Cleanup that needs `DELETE`/`UPDATE` against a real database may be refused by
the permission classifier. If it is, do not work around the denial. Report the
exact statements verbatim and ask Evan to run or approve them. The run stays
incomplete until the baseline matches.
```

- [ ] **Step 6: Apply edits E7–E8 — the seed sentence and the fifth outcome**

Replace exactly:
```
the run, create a demo account through the app's **own** signup route or
management command and seed a plausible, obviously-demo scenario from a seed
script that lives in the scratch dir and never in the app repo, with ids given a
recognisable prefix and the script written idempotently so each retake resets
it, with its teardown script beside it (see Write-effects above); put a short sleep between a create and the writes that reference it — a
```
with:
```
the run, point the app at a throwaway store (Write-effects above), create a demo
account through the app's **own** signup route or management command, and seed a
plausible, obviously-demo scenario from the app's committed
`scripts/showcase_demo.*` (create and commit it in the app repo if the app has
none), with ids given a recognisable prefix and the script written idempotently
so each retake resets it; put a short sleep between a create and the writes that reference it — a
```
Replace exactly:
```
`manage.py shell` against the app's own services instead (still the app's own
code, still no script in the repo). Check too whether the create endpoint is a
```
with:
```
`manage.py shell` against the app's own services instead (still the app's own
code, driven from the committed seed script). Check too whether the create endpoint is a
```
Replace exactly:
```
redaction empties the app and STOP wastes an authorised seeding budget. Seed a
demo dataset through the app's own models and give every seeded row an id above
the highest pre-existing one, then filter the *response* of every list endpoint
down to that range (STEP 2). Grep the URL conf for the endpoints that return
collections — usually only three or four — and note that detail endpoints need
no filter, because the walk only ever opens rows the run created.
```
with:
```
redaction empties the app and STOP wastes an authorised seeding budget. Seed a
demo dataset into the throwaway store (Write-effects above): the real data is
not in it, so no list endpoint needs filtering and no id range has to be
reserved.
```

- [ ] **Step 7: Apply edit E9 — the app-bug trap**

Replace exactly:
```
- **A walk that trips an app bug is not yours to fix** — the app repo is
  read-only for this run. Route the walk around it and report it. (NomNoms:
```
with:
```
- **A walk that trips an app bug is not yours to fix** — app product code is
  read-only for this run. Route the walk around it and report it. (NomNoms:
```

- [ ] **Step 8: Apply edit E10 — the teardown gate**

Replace exactly the block that starts `**Teardown gate — once the contact sheet passes, before STEP 4.** Everything` and ends `data as outstanding, never as "left by design".` (17 lines, as in the file today) with:
```
**Teardown gate — once the contact sheet passes, before STEP 4.** Everything
STEPs 4–8 need (PNGs, `demo.mp4`) is now in `$S`, so nothing the run created
in the app is needed any more.
1. Seeded runs: stop the app, drop the throwaway store (database, Neo4j
   instance, volume or bucket prefix), and restart the app on its normal
   configuration. Prove it is back on its real database by reading back one
   known real record, and prove the throwaway store is gone.
2. Walk writes into a real database: run the exact cleanup statements from
   STEP 1, then re-run the baseline queries. Every count must equal its pre-run
   value.
3. For files and objects, list the directory or bucket prefix the run wrote to,
   and require it to be empty.
4. Keep the before/after output for the STEP 8 report.

If a take is needed after this point, re-create the throwaway store, re-seed
from the committed seed script, then tear down again. For a run split into
phases across sessions, the teardown still belongs to the capture phase: Phase 2
needs only the media.
**If the classifier blocks the teardown:** hand Evan the exact statements, and
continue with STEPs 4–8. The report and the Coverage note then name the run's
data as outstanding, never as "left by design".
```

- [ ] **Step 9: Verify the edits**

```bash
F=/home/evan/worktrees/infra-showcase-demo-data/meta-prompts/portfolio-showcase/portfolio-showcase.md
grep -n 'never in the app repo\|no script in the repo\|filter the \*response\* of every list endpoint\|Demo data still in dev databases' "$F"; echo "stale-phrase hits above (expect none)"
grep -n 'read-only' "$F"
grep -n 'left by design\|no cleanup owed' "$F"
grep -c '^````' "$F"
git -C /home/evan/worktrees/infra-showcase-demo-data diff --stat
```
Expected:
- the first command prints no matches;
- every `read-only` hit is one of: the recon "one read-only pass", "App product code is read-only", "app product code is read-only", "app's product code is read-only", "verified read-only" in the dispositions, or a historical Coverage row;
- `left by design` appears only in the new E1 and E10 text, and `no cleanup owed` only in the historical LeonsBudget Coverage row;
- the fence count is `2`;
- the diff touches only `portfolio-showcase.md`.

An unexpected hit means an edit went wrong: `git -C /home/evan/worktrees/infra-showcase-demo-data checkout -- meta-prompts/portfolio-showcase/portfolio-showcase.md` (safe: it is this task's private worktree), then redo Steps 2–8.

- [ ] **Step 10: Changelog receipt and commit on the branch**

Append to the worktree's `portfolio-showcase-changelog.md`:
```
| 2026-09-14 | **Throwaway stores + dispositions** (spec `portfolio_site/docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md`, after the showcase demo-data cleanup). **Decisions already made:** demo data never lives in the app's real database; seeded runs use a throwaway store and a committed `scripts/showcase_demo.*`; real-database seeding needs Evan's approval and the fail-closed gate. **STEP 0 / 0.5 / STEP 2 trap:** "app repo is read-only" qualified to app product code, with the committed seed script, its fixture/tests and the session log as the only app-repo writes. **STEP 1:** Write-effects rewritten around the throwaway store, walk-write cleanup and the verbatim STOP-AND-ASK rule; the seed sentence points at the committed seed script; the fifth outcome no longer filters list endpoints by id range. **STEP 3 teardown gate:** drop the throwaway store and prove the app is back on its real database. **Coverage:** the leftover-data list replaced by per-app dispositions from the cleanup results. |
```
Then:
```bash
W=/home/evan/worktrees/infra-showcase-demo-data
git -C "$W" commit --only -m "docs(meta-prompts): portfolio-showcase — throwaway demo stores, stop-and-ask, cleanup dispositions" -- meta-prompts/portfolio-showcase/portfolio-showcase.md meta-prompts/portfolio-showcase/portfolio-showcase-changelog.md
git -C "$W" log --oneline -1
```
Append to the results file:
```markdown
## Task 9 — infra meta-prompt

Outcome: committed on infra branch `showcase-demo-data-meta-prompt` as `<hash>` (edits E1–E10 + changelog receipt; verification greps judged clean). Merging it into infra `main` is Evan's call at the finish.
```
```bash
git commit --only -m "docs(showcase-cleanup): task 9 — meta-prompt updated on infra branch (<hash>)" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 10: Close out — final verification, summary, session log

**Precondition:** the same as Task 9. Every question is answered.

**Files:**
- Modify: the results file (append `## Summary`)
- Create: `docs/session-logs/<YYYY-MM-DD-HH-MM>-claude-code-showcase-demo-data-cleanup.md` (worktree)

**Interfaces:**
- Consumes: the results file and every target's `state.txt`.
- Produces: the branch's final commit.

- [ ] **Step 1: Re-verify every target that committed (read-only)**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; EVID=/home/evan/showcase-pending/_teardown-evidence
for a in co-host co-host-chud co-author chudios leonsbudget the-classic; do
  if [ "$(cat "$EVID/$a/state.txt" 2>/dev/null)" = COMMITTED ]; then "$T/gate-run.sh" "$a" post; echo "$a post exit=$?"; fi
done
[ "$(cat "$EVID/mind-palace/state.txt" 2>/dev/null)" = COMMITTED ] && { "$T/neo4j/mind-palace-gate.sh" post; echo "mind-palace post exit=$?"; }
[ -f "$EVID/chudios/files-purge.log" ] && { "$T/files/chudios-files.sh" post; echo "chudios files post exit=$?"; }
```
Expected: every committed target prints `PASS … post` and `exit=0`. A `post` failure now → D4 stop, reported first in the summary.

- [ ] **Step 2: Write the summary**

Append to the results file:
```markdown
## Summary

| Target | Final state |
|---|---|
| co-host | … |
| co-host-chud | … |
| co-author | … |
| chudios (db + files) | … |
| mind-palace | … |
| leonsbudget | … |
| the-classic | … |
| chunk-norris audit | … |
| infra meta-prompt | branch `showcase-demo-data-meta-prompt` `<hash>` (unmerged) |

Questions asked and Evan's answers (verbatim): <numbered list>
```

- [ ] **Step 3: Write the session log**

Follow `/home/evan/EVOsystem/infra/skills/writing-session-logs/SKILL.md`: frontmatter `type: docs`, `mode: attended`, `repos: [portfolio_site, infra]`, and every heading present.
- Accomplished = the summary table.
- Commits = every task commit plus the infra branch hash.
- Verification = each phase's exit per target.
- Open flags = anything a D4 stop left behind, plus the unmerged infra branch.

- [ ] **Step 4: Commit**

```bash
git add docs/session-logs/*-claude-code-showcase-demo-data-cleanup.md
git commit --only -m "docs(session-log): showcase demo data cleanup" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md docs/session-logs/*-claude-code-showcase-demo-data-cleanup.md
```

---

## Plan review record

| Date | Event |
|---|---|
| 2026-09-14 | Plan rev 1 (`c263cff`) and rev 1.1 (`5c0259b`: trigger allowlist added) written. |
| 2026-09-14 | **Codex plan review of rev 1.1: 6 BLOCKER / 9 MAJOR / 1 MINOR, all accepted.** Receipt: `2026-09-14-showcase-demo-data-plan-codex-review.md`; dispositions in the spec's "Codex plan review disposition". Two blockers were confirmed live and became Evan's decisions D5 (CHUD artifact) and D6 (5 auth audit rows). |
| 2026-09-14 | Plan rev 2 + tooling rev 2 written and validated before commit: SQL self-test 0 failures across every planted case; file self-test 0 failures (incl. crash-and-resume); read-only preflight + freeze + classify PASS/PRE-STATE on all six Postgres targets; mind-palace preflight + freeze + `dry` PASS (`dry` caught and fixed a statement-assembly bug before any write). Committed as `e4298e3`. |
| 2026-09-14 | **Codex scoped re-review of rev 2: 1 BLOCKER / 5 MAJOR / 2 MINOR; prior findings 9 addressed, 7 partial, 0 not addressed. All 8 new findings accepted.** Receipt: `2026-09-14-showcase-demo-data-plan2-codex-review.md`; dispositions in the spec's "Codex plan re-review disposition". Fixes: the mind-palace G7 now inspects the exact typed, length-prefixed fingerprint the delete compares, bound as a Cypher parameter; a reviewer mode that never overwrites evidence; trigger event masks and enabled states pinned; hard-kill timeouts on every docker call; a strict Qdrant audit (parseable timestamps, `source_id`, hits reported); self-test cases for a post-only extra check, a lost commit marker, a disabled or re-pointed trigger, reviewer mode, and a regex-lookalike stray; exact-name stray matching; a length-prefixed id digest. Committed as `2265ac3`. |
| 2026-09-14 | **Codex narrow verification of rev 3: 6 FIXED, 2 PARTIALLY FIXED, 0 new findings.** Receipt: `2026-09-14-showcase-demo-data-plan3-codex-review.md`. Both partial fixes were completed: Task 1's self-tests now run under an outer hard-kill timeout (and the SQL self-test's `pg()` is bounded); the Qdrant audit exits 3 on any hit or unparseable point, and Task 9's chunk-norris disposition is taken from Task 8's recorded result instead of being hard-coded. |
