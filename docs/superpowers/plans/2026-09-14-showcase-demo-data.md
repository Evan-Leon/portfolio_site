# Showcase Demo Data Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the portfolio-showcase demo data still sitting in six apps' local stores, proving with a fail-closed gate that no real row, node or file was deleted or changed. Then record every showcase-touched app's disposition and change the showcase meta-prompt so demo data goes into throwaway stores from now on.

**Architecture:** All deletion runs through committed, already-validated tooling in `docs/superpowers/plans/2026-09-14-showcase-demo-data/`.
- **Postgres gate** (`gate.sql` + `gate-run.sh` + one declaration per app): session-temporary functions check the target, the dependency closure (foreign keys, plus reviewed-and-allowlisted DELETE/UPDATE triggers; any rewrite rule stops), exact scope counts, inbound references, outbound references and survivor hashes. It then runs a rehearsal that rolls back and a negative control, and only then commits one guarded delete.
- **Neo4j** (`neo4j/mind-palace-gate.sh`): the same phase shape, ending in one atomic conditional delete.
- **Volume files** (`files/chudios-files.sh`): a two-phase quarantine protocol.

Each task runs one app's phases in a fixed order, records the evidence, and commits a results row. Nothing is committed to any app repo.

**Tech Stack:** bash, PostgreSQL 17 (`infra-postgres-1`, local Supabase `supabase_db_the-classic`), Neo4j 5.26 community (`mind-palace-neo4j-1`), docker, python3 (read-only evidence inspection only).

**Spec:** `docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md` (rev 2). Its Codex review is `docs/superpowers/specs/2026-09-14-showcase-demo-data-codex-review.md`.

## Global Constraints

- **D4 — STOP-AND-ASK. This overrides everything else in this plan.** If you are unsure **at all** about any row, node, relationship, file or reference, stop. Report what you found and ask Evan. Delete nothing for that app until he answers. Never guess, never widen a selector, and never "clean up what looks like demo data".
  - **Mechanical triggers.** Any gate check failing (target identity, dependency closure, scope counts, inbound references, survivor hashes, negative control). Also any command erroring, and any count or id that differs between the frozen export and the in-transaction re-query.
  - **Judgment triggers.**
    - exported text that reads like real content (a real person's name, a real email, prose that reads like Evan's own writing);
    - a timestamp outside the showcase window that nothing explains;
    - a table, column or reference this plan did not anticipate;
    - anything you would describe as "probably fine".
  - **Outbound references to allowlisted retained shared rows are not triggers.**
  - **A stop on one app halts only that app.** Continue independent tasks; the controller asks Evan.
- **D3 — Authority.** Evan's approval of this plan authorizes exactly the deletes performed by the committed tooling's `execute` phases for the six apps named in Tasks 2–7, and nothing more.
  - `execute` may run only after the same app's `rehearse` and `negative` phases have passed against the current freeze.
  - No other DELETE, UPDATE, `DETACH DELETE`, `rm` or `mv` may be run by hand against any app store.
- **Tooling is frozen.** Before every task, run `(cd docs/superpowers/plans/2026-09-14-showcase-demo-data && sha256sum -c SHA256SUMS)`, and every line must say `OK`.
  - Never edit `gate.sql`, `gate-run.sh`, `apps/*.sql`, `neo4j/*`, `files/*`, `selftest/*` or `SHA256SUMS` during execution.
  - A needed change to the tooling (a count, an allowlist entry, a check) is a D4 stop, never a fix.
- **Evidence** lives only in `/home/evan/showcase-pending/_teardown-evidence/` (mode 700). It is never committed and never pasted in full into a commit, a report or a dispatch. Quote single log lines only.
- **Phase order per app is fixed:** preflight → freeze → G7 content inspection → rehearse → negative → execute → post.
  - **Re-freeze rule:** at most once per app, and only when `rehearse`, `negative` or `execute` fails with `GATE FAIL G6 survivors`, meaning live data outside the scope changed between freeze and delete. Move the frozen files into `superseded-<UTC timestamp>/` inside the app's evidence dir, then restart from freeze.
  - A second G6 failure is a D4 stop.
- **Never touch:** chud conversation 7206 or anything in chud's database (D2; only co-host's read-only residue check reads it), app-dash, graces-tree, jourNOW, voice-trainer, NomNoms, Prompt-heus, logson, el-blackjack-pwa.
  - No container restarts.
  - No `supabase` CLI command. the-classic's CLI is linked to production.
  - No app repo writes or commits.
- **Commits.** Only this worktree's results file and session log in portfolio_site, and `meta-prompts/portfolio-showcase/portfolio-showcase.md` + `portfolio-showcase-changelog.md` in infra. Always use `git commit --only -m "<msg>" -- <paths>`.
- **Sub-agents** never run on Fable. Use Opus for the Tasks 2–8 implementers and every reviewer. The Task 9–10 implementers may use Sonnet. Tasks run strictly one at a time.

## File Structure

Existing, committed, validated before this plan was written:

| Path (under `docs/superpowers/plans/2026-09-14-showcase-demo-data/`) | Responsibility |
|---|---|
| `gate.sql` | Session-temporary gate library: preflight (G2–G5), snapshot/digest (G6), export, delete (G9), post (G10). Creates nothing persistent. |
| `gate-run.sh` | Runs one Postgres app's phase: G1 container/project check, the co-host CHUD residue check, evidence files, rehearse/negative/execute ordering. |
| `apps/{co-host,co-author,chudios,leonsbudget,the-classic}.sql` | Per-app declaration: G1 database/schema/anchor checks, exact scope + counts + delete order, FK allowlist, retained parents, extra checks. |
| `apps/selftest.sql`, `apps/selftest-flip.sql`, `selftest/schema.sql`, `selftest/selftest.sh` | 17-case gate selftest in the throwaway database `showcase_gate_selftest` (created and dropped by the script). |
| `neo4j/mind-palace-gate.sh` | mind-palace Route removal: counts/shape/degree checks, survivor hash, `:begin`/`:rollback` rehearsal, wrong-name negative control, conditional delete. |
| `files/chudios-files.sh`, `files/selftest-files.sh` | chudios demo recordings: exact size+sha checks, quarantine/restore/purge/post; 11-case selftest in `/tmp` inside the container. |
| `SHA256SUMS` | Freeze manifest for all of the above. |

Created by this plan:

| Path | Responsibility |
|---|---|
| `docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md` (portfolio_site) | One section per task, holding the outcome, phase exits, key numbers and evidence paths. It is the review surface for every task. |
| `infra/meta-prompts/portfolio-showcase/portfolio-showcase.md` + `portfolio-showcase-changelog.md` | Task 9: throwaway-store rule, read-only qualification, D4 copy, dispositions. |
| `docs/session-logs/<timestamp>-claude-code-showcase-demo-data-cleanup.md` (portfolio_site) | Task 10. |

Shell variables used in every task. Set them at the start of each Bash call, because shell state does not persist between calls:

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
R=docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
EVID=/home/evan/showcase-pending/_teardown-evidence
```

Every phase command prints `PASS <app> <phase>` and exits 0, or prints `STOP …` plus the first `GATE FAIL` line and exits non-zero. Capture the exit code directly: `"$T/gate-run.sh" co-host preflight; echo "exit=$?"`. Never pipe a phase through `tail`, `head` or `tee`.

---

### Task 1: Verify tooling and preflight every target (read-only)

**Files:**
- Create: `docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md`

**Interfaces:**
- Consumes: the committed tooling listed above.
- Produces: the results file, with a `## Task 1` section. Later tasks append `## Task N — <app>` sections in the same format.

- [ ] **Step 1: Verify the tooling manifest**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS); echo "exit=$?"
```
Expected: every line `OK`, `exit=0`. Anything else → D4 stop.

- [ ] **Step 2: Confirm the evidence directory holds no previous gate run**

```bash
EVID=/home/evan/showcase-pending/_teardown-evidence
stat -c '%a %U' "$EVID"; ls -la "$EVID"
```
Expected: `700 evan`. Only these three files are present: `graces-tree-pre-cleanup-backup-2026-09-13.json`, `journow-demo-entries-2026-09-14.csv`, `journow-demo-user-2026-09-14.csv`. Any per-app subdirectory (`co-host/`, `chudios/`, …) means an earlier run happened → D4 stop.

- [ ] **Step 3: Run the SQL gate selftest**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/selftest/selftest.sh" > /tmp/showcase-gate-selftest.log 2>&1; echo "exit=$?"
grep '^FAIL\|selftest:' /tmp/showcase-gate-selftest.log
```
Expected: `exit=0`, no `FAIL` line, and last line `selftest: 0 failure(s)`. If it says the database `showcase_gate_selftest already exists`, that is a D4 stop. Do not drop it.

- [ ] **Step 4: Run the file-protocol selftest**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/files/selftest-files.sh" > /tmp/showcase-files-selftest.log 2>&1; echo "exit=$?"
grep '^FAIL\|selftest-files:' /tmp/showcase-files-selftest.log
```
Expected: `exit=0`, no `FAIL` line, and `selftest-files: 0 failure(s)`.

- [ ] **Step 5: Preflight every target**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
for a in co-host co-author chudios leonsbudget the-classic; do "$T/gate-run.sh" "$a" preflight; echo "$a exit=$?"; done
"$T/neo4j/mind-palace-gate.sh" preflight; echo "mind-palace exit=$?"
"$T/files/chudios-files.sh" check; echo "chudios-files exit=$?"
```
Expected: seven `PASS` lines and seven `exit=0`. Any STOP is a D4 stop for **that app only**. Record it, then continue Task 1 and skip that app's task later, with the stop recorded.

- [ ] **Step 6: Create the results file**

Write `docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md` with this content, filling each `exit=` value with the real value from Steps 1–5:

```markdown
# Showcase Demo Data Cleanup — Results

Plan: `docs/superpowers/plans/2026-09-14-showcase-demo-data.md` · Spec: `docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md`
Evidence (never committed): `/home/evan/showcase-pending/_teardown-evidence/<app>/`

## Task 1 — tooling and preflight

| Check | Result |
|---|---|
| `sha256sum -c SHA256SUMS` | exit=0, 14 OK |
| gate selftest | exit=0, 0 failures |
| file selftest | exit=0, 0 failures |
| preflight co-host / co-author / chudios / leonsbudget / the-classic | exit=0 ×5 |
| preflight mind-palace | exit=0 |
| chudios files check | exit=0 |
```

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
git commit --only -m "docs(showcase-cleanup): task 1 — tooling verified, all targets preflighted" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 2: co-host — remove channel `ch_b11b31a0d9ae` "The Long Fuse"

**Files:**
- Modify: `docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md` (append the `## Task 2 — co-host` section)

**Interfaces:**
- Consumes: `gate-run.sh co-host <phase>`, `apps/co-host.sql`.
- Produces: the co-host evidence dir `$EVID/co-host/` (`scope.json`, `scope-ids.json`, `snapshot.txt`, `digest.txt`, per-phase logs).

**Expected scope** (from `apps/co-host.sql`): timeline_events 7, table_reads 1, reviews 0, script_versions 2, beat_sheet_versions 2, chud_jobs 1 (`job_fba52731d285`), episodes 2 (`ep_a78a3f018922`, `ep_df1c614c159e`), premises 2, bible_amendments 0, character_bible_versions 0, character_bibles 0, show_bible_versions 1, show_bibles 1, channels 1. The CHUD residue check must read 0.

- [ ] **Step 1: Verify tooling**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS) > /dev/null; echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 2: Preflight**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" co-host preflight; echo "exit=$?"
```
Expected: `PASS co-host preflight`, `exit=0`.

- [ ] **Step 3: Freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" co-host freeze; echo "exit=$?"
```
Expected: `PASS co-host freeze`, `exit=0`. Four files are now in `$EVID/co-host/`.

- [ ] **Step 4: G7 content inspection (read the frozen rows; judgment step)**

```bash
python3 - /home/evan/showcase-pending/_teardown-evidence/co-host/scope.json <<'PY'
import json, sys
SKIP = ("password", "token", "secret", "hash", "key")
d = json.load(open(sys.argv[1]))
for table, v in d.items():
    print(f"== {table}: expected {v['expected']}, rows {len(v['rows'])}")
    for row in v["rows"]:
        texts = {k: (val[:160] + "…" if isinstance(val, str) and len(val) > 160 else val)
                 for k, val in row.items() if isinstance(val, str) and not any(s in k.lower() for s in SKIP)}
        print("  ", texts)
PY
```
Expected: every table's `rows` equals `expected`. The text is the fictional "The Long Fuse" show: its premises, bible and episodes, including "The Year Without a Summer". Evan's real channels must not appear.
- Any row that reads like real content, names a real person, or belongs to another channel → D4 stop.
- Write one sentence of what you read into the results section (Step 9).

- [ ] **Step 5: Rehearse (full delete, rolled back)**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" co-host rehearse; echo "exit=$?"
```
Expected: `PASS co-host rehearse`, `exit=0`, and `grep -c '^GATE ROLLED BACK$' /home/evan/showcase-pending/_teardown-evidence/co-host/rehearse.log` prints `1`. A `GATE FAIL G6 survivors` falls under the re-freeze rule in Global Constraints. Any other failure → D4 stop.

- [ ] **Step 6: Negative control**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" co-host negative; echo "exit=$?"
```
Expected: `PASS co-host negative`, `exit=0`. The script passes only when the off-by-one transaction failed with `GATE FAIL G3 count` and the data is unchanged afterwards.

- [ ] **Step 7: Execute (the one committed delete)**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" co-host execute; echo "exit=$?"
grep -c '^GATE COMMITTED$' /home/evan/showcase-pending/_teardown-evidence/co-host/execute.log
```
Expected: `PASS co-host execute`, `exit=0`, `1`. On failure the transaction was rolled back and nothing is deleted. Do not retry; this is a D4 stop, apart from the G6 re-freeze rule.

- [ ] **Step 8: Post-check**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" co-host post; echo "exit=$?"
```
Expected: `PASS co-host post`, `exit=0`: every frozen id is gone and survivors are identical to the snapshot. A failure after a committed execute → D4 stop. Report it immediately and do not attempt any repair.

- [ ] **Step 9: Record and commit**

Append to the results file, with the real values:

```markdown
## Task 2 — co-host

Outcome: **cleaned** (<UTC timestamp of execute.log>)
| Phase | exit | Evidence |
|---|---|---|
| preflight | 0 | `co-host/preflight.log` (CHUD residue 0) |
| freeze | 0 | `co-host/scope.json`, `snapshot.txt` sha256 `<first 12 hex of sha256sum snapshot.txt>` |
| G7 inspection | fictional | <one sentence: what the rows were> |
| rehearse | 0 | `co-host/rehearse.log` |
| negative | 0 | `co-host/negative.log` (GATE FAIL G3 count, as designed) |
| execute | 0 | `co-host/execute.log` (GATE COMMITTED) |
| post | 0 | `co-host/post.log` |
Deleted: timeline_events 7, table_reads 1, script_versions 2, beat_sheet_versions 2, chud_jobs 1, episodes 2, premises 2, show_bible_versions 1, show_bibles 1, channels 1.
```

On a D4 stop, write `Outcome: **STOPPED at <phase>** — <the GATE FAIL line or your judgment> — question for Evan: <question>` and list only the phases that ran.

```bash
git commit --only -m "docs(showcase-cleanup): task 2 — co-host demo channel removed" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```
(On a stop: `-m "docs(showcase-cleanup): task 2 — co-host STOPPED at <phase>"`.)

---

### Task 3: co-author — remove user 2 and story 7 "The Lighthouse at Kestrel Point"

**Files:**
- Modify: the results file (append `## Task 3 — co-author`)

**Interfaces:**
- Consumes: `gate-run.sh co-author <phase>`, `apps/co-author.sql`.
- Produces: `$EVID/co-author/`.

**Expected scope:** token_blacklist_blacklistedtoken 0, token_blacklist_outstandingtoken 16, beat_drafts_beatdraft 3, beats_beat_characters 14, beats_beat_events 6, events_event_characters 15, open_questions_openquestion_linked_characters 7, …_linked_events 4, …_linked_relationships 0, …_linked_settings 0, beats_beat 5, open_questions_openquestion 4, relationships_relationship 3, events_event 6, characters_character 5, settings_places_setting 4, stories_story 1, auth_user_groups 0, auth_user_user_permissions 0, django_admin_log 0, auth_user 1.
- The outstanding-token count grows each time the demo account logs in. A different count at preflight is a D4 stop; it means someone used the account.

- [ ] **Step 1: Verify tooling**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS) > /dev/null; echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 2: Preflight**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" co-author preflight; echo "exit=$?"
```
Expected: `PASS co-author preflight`, `exit=0`.

- [ ] **Step 3: Freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" co-author freeze; echo "exit=$?"
```
Expected: `PASS co-author freeze`, `exit=0`.

- [ ] **Step 4: G7 content inspection**

```bash
python3 - /home/evan/showcase-pending/_teardown-evidence/co-author/scope.json <<'PY'
import json, sys
SKIP = ("password", "token", "secret", "hash", "key", "jti")
d = json.load(open(sys.argv[1]))
for table, v in d.items():
    print(f"== {table}: expected {v['expected']}, rows {len(v['rows'])}")
    if table.startswith("token_blacklist"):
        continue  # token rows: count only, never print
    for row in v["rows"]:
        texts = {k: (val[:160] + "…" if isinstance(val, str) and len(val) > 160 else val)
                 for k, val in row.items() if isinstance(val, str) and not any(s in k.lower() for s in SKIP)}
        print("  ", texts)
PY
```
Expected: counts match. `auth_user` is `demo@example.com` ("Demo Writer"). All story elements belong to the fictional radio drama "The Lighthouse at Kestrel Point": a lighthouse, a storm, a keeper and similar. Anything from Evan's real stories or account → D4 stop.

- [ ] **Step 5: Rehearse**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" co-author rehearse; echo "exit=$?"
```
Expected: `PASS co-author rehearse`, `exit=0`. G6 falls under the re-freeze rule. Anything else → D4 stop.

- [ ] **Step 6: Negative control**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" co-author negative; echo "exit=$?"
```
Expected: `PASS co-author negative`, `exit=0`.

- [ ] **Step 7: Execute**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" co-author execute; echo "exit=$?"
grep -c '^GATE COMMITTED$' /home/evan/showcase-pending/_teardown-evidence/co-author/execute.log
```
Expected: `PASS co-author execute`, `exit=0`, `1`. On failure → D4 stop, apart from the G6 re-freeze rule.

- [ ] **Step 8: Post-check**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" co-author post; echo "exit=$?"
```
Expected: `PASS co-author post`, `exit=0`.

- [ ] **Step 9: Record and commit**

Append the `## Task 3 — co-author` section, using the same table format as Task 2 with co-author's evidence paths. The `Deleted:` line is: outstanding tokens 16, beat drafts 3, beat↔character 14, beat↔event 6, event↔character 15, open-question↔character 7, open-question↔event 4, beats 5, open questions 4, relationships 3, events 6, characters 5, settings 4, story 1, user 1. On a stop, use the STOPPED form from Task 2.

```bash
git commit --only -m "docs(showcase-cleanup): task 3 — co-author demo user and story removed" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 4: chudios — remove the "Signal & Noise" show and its three recordings

**Files:**
- Modify: the results file (append `## Task 4 — chudios`)

**Interfaces:**
- Consumes: `gate-run.sh chudios <phase>`, `apps/chudios.sql`, `files/chudios-files.sh <phase>`.
- Produces: `$EVID/chudios/` (gate files + `files-*.log`).

**Expected scope:** qc_reports 1, transcripts 2, stage_runs 8, clips 9, marketing_assets 7, published_status 4, attempts 6, content_items 6 (ids `dddddddd-…`). The 8 other content items survive. Files in volume `chudios_chudios-recordings` at `/data/recordings`: `demo-sn-ep09.m4a` (230111 B), `demo-sn-ep11.m4a` (246791 B), `demo-sn-ep12.m4a` (286386 B), with the sha256 values embedded in `files/chudios-files.sh`.

**Ordering is load-bearing.** The files move into quarantine only after the database gate's rehearse and negative have passed. They are purged only after the database execute has committed, and restored if it has not.

- [ ] **Step 1: Verify tooling**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS) > /dev/null; echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 2: Preflight the database and check the files**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" chudios preflight; echo "db exit=$?"
"$T/files/chudios-files.sh" check; echo "files exit=$?"
```
Expected: two `PASS` lines, `db exit=0`, `files exit=0`.

- [ ] **Step 3: Freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" chudios freeze; echo "exit=$?"
```
Expected: `PASS chudios freeze`, `exit=0`.

- [ ] **Step 4: G7 content inspection**

```bash
python3 - /home/evan/showcase-pending/_teardown-evidence/chudios/scope.json <<'PY'
import json, sys
SKIP = ("password", "token", "secret", "hash", "key")
d = json.load(open(sys.argv[1]))
for table, v in d.items():
    print(f"== {table}: expected {v['expected']}, rows {len(v['rows'])}")
    for row in v["rows"]:
        texts = {k: (val[:160] + "…" if isinstance(val, str) and len(val) > 160 else val)
                 for k, val in row.items() if isinstance(val, str) and not any(s in k.lower() for s in SKIP)}
        print("  ", texts)
PY
```
Expected: counts match. Every item belongs to the fictional "Signal & Noise" podcast. Recording paths name only `demo-sn-ep09/11/12.m4a`. Any real episode title, or any path to a non-demo file → D4 stop.

- [ ] **Step 5: Rehearse and negative control**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" chudios rehearse; echo "rehearse exit=$?"
"$T/gate-run.sh" chudios negative; echo "negative exit=$?"
```
Expected: both `PASS`, both `exit=0`. G6 falls under the re-freeze rule. Anything else → D4 stop, with the files untouched.

- [ ] **Step 6: Quarantine the files**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/files/chudios-files.sh" quarantine; echo "exit=$?"
```
Expected: `PASS chudios files quarantine`, `exit=0`. If it fails partway, run `"$T/files/chudios-files.sh" restore` (which must `PASS`), then D4 stop.

- [ ] **Step 7: Execute the database delete, then purge or restore the files**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" chudios execute; st=$?; echo "execute exit=$st"
if [ "$st" -eq 0 ] && grep -q '^GATE COMMITTED$' /home/evan/showcase-pending/_teardown-evidence/chudios/execute.log; then
  "$T/files/chudios-files.sh" purge; echo "purge exit=$?"
else
  "$T/files/chudios-files.sh" restore; echo "restore exit=$?"
fi
```
Expected: `execute exit=0` and `purge exit=0`.
- **If execute failed:** `restore exit=0` must print. The database rolled back and the files are back. This is a D4 stop, apart from the G6 re-freeze rule, where you restart at Step 3 after restoring.
- **If purge failed after a commit:** the rows are gone and the files sit in quarantine. D4 stop immediately. Run nothing else on these files.

- [ ] **Step 8: Post-checks**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/gate-run.sh" chudios post; echo "db post exit=$?"
"$T/files/chudios-files.sh" post; echo "files post exit=$?"
```
Expected: both `PASS`, both `exit=0`.

- [ ] **Step 9: Record and commit**

Append `## Task 4 — chudios` in the Task 2 table format, with extra rows for `files check`, `files quarantine`, `files purge` and `files post` (each exit and log `chudios/files-<phase>.log`). The `Deleted:` line is: qc_reports 1, transcripts 2, stage_runs 8, clips 9, marketing_assets 7, published_status 4, attempts 6, content_items 6, and files demo-sn-ep09/11/12.m4a. On a stop, use the STOPPED form, and say where the files are: in place, quarantined, or restored.

```bash
git commit --only -m "docs(showcase-cleanup): task 4 — chudios demo show and recordings removed" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 5: mind-palace — remove the "Collective Security" Route

**Files:**
- Modify: the results file (append `## Task 5 — mind-palace`)

**Interfaces:**
- Consumes: `neo4j/mind-palace-gate.sh <phase>`.
- Produces: `$EVID/mind-palace/` (`scope.txt`, `degrees.txt`, `snapshot.txt`, phase logs).

**Expected shape:** Route 2 total; Entity 228; HAS_STEP 5 total. The demo route `60c383d5-921e-443c-9430-b2242469fbe0`, named "Collective Security", has 0 inbound and 4 outbound HAS_STEP links, to League of Nations (degree 3), United Nations (2), World War I (9) and World War II (14). The other route has 1 relationship. Only the Route node and its own 4 relationships are deleted; Entity nodes are never deleted.

- [ ] **Step 1: Verify tooling**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS) > /dev/null; echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 2: Preflight**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/neo4j/mind-palace-gate.sh" preflight; echo "exit=$?"
```
Expected: `PASS mind-palace preflight`, `exit=0`.

- [ ] **Step 3: Freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/neo4j/mind-palace-gate.sh" freeze; echo "exit=$?"
```
Expected: `PASS mind-palace freeze`, `exit=0`.

- [ ] **Step 4: G7 content inspection**

```bash
cat /home/evan/showcase-pending/_teardown-evidence/mind-palace/scope.txt
```
Expected: one route "Collective Security" with 4 `HAS_STEP` rows. Each has `elaboration_note`, `last_reviewed_at` and `position`, and points at League of Nations, United Nations, World War I and World War II. The notes are short demo elaborations about collective security between the wars. A note that reads like Evan's own study notes → D4 stop.

- [ ] **Step 5: Rehearse and negative control**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
"$T/neo4j/mind-palace-gate.sh" rehearse; echo "rehearse exit=$?"
"$T/neo4j/mind-palace-gate.sh" negative; echo "negative exit=$?"
```
Expected: both `PASS`, both `exit=0`.
- `rehearse.log` contains `deleted_steps` / `4` / `remaining_in_tx` / `0`, which was rolled back.
- `negative.log` contains only `remaining_in_tx` / `1`.
- Any failure → D4 stop. The Neo4j tooling has no re-freeze rule; a changed survivor hash is a stop.

- [ ] **Step 6: Execute**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/neo4j/mind-palace-gate.sh" execute; echo "exit=$?"
```
Expected: `PASS mind-palace execute`, `exit=0`. The log ends `deleted_steps` / `4`. An empty result means the condition did not hold and nothing was deleted → D4 stop.

- [ ] **Step 7: Post-check**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/neo4j/mind-palace-gate.sh" post; echo "exit=$?"
```
Expected: `PASS mind-palace post`, `exit=0`. That means Route 1, Entity 228, HAS_STEP 1, the demo route gone, degrees 2/1/8/13, and an unchanged survivor hash.

- [ ] **Step 8: Record and commit**

Append `## Task 5 — mind-palace` in the Task 2 table format, with mind-palace evidence paths. The `Deleted:` line is: Route 1 and its HAS_STEP relationships 4; Entities retained 228. On a stop, use the STOPPED form.

```bash
git commit --only -m "docs(showcase-cleanup): task 5 — mind-palace demo route removed" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 6: LeonsBudget — remove user 3, household 3 and institution 9

**Files:**
- Modify: the results file (append `## Task 6 — LeonsBudget`)

**Interfaces:**
- Consumes: `gate-run.sh leonsbudget <phase>`, `apps/leonsbudget.sql`.
- Produces: `$EVID/leonsbudget/`.

**Expected scope:** categorization_categoryoverride 0, categorization_categoryrule 0, transactions_transaction 71, transactions_importbatch 0, budgets_budgetline 44, budgets_monthlybudget 4, accounts_bankaccount 2, accounts_institution 1 (id 9 "Northwind Bank"), accounts_householdmember 1, accounts_household 1 (id 3 "Demo Household"), auth_user_groups 0, auth_user_user_permissions 0, django_admin_log 0, auth_user 1 (id 3). The retained shared parent is `categorization_category`: 11 distinct categories referenced by both lines and transactions.
- This database holds Evan's real finances. Survivor hashes cover every table the scope touches, including `auth_user`. If Evan logs in during the run, that is a G6 failure and falls under the re-freeze rule.

- [ ] **Step 1: Verify tooling**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS) > /dev/null; echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 2: Preflight**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" leonsbudget preflight; echo "exit=$?"
```
Expected: `PASS leonsbudget preflight`, `exit=0`.

- [ ] **Step 3: Freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" leonsbudget freeze; echo "exit=$?"
```
Expected: `PASS leonsbudget freeze`, `exit=0`.

- [ ] **Step 4: G7 content inspection**

```bash
python3 - /home/evan/showcase-pending/_teardown-evidence/leonsbudget/scope.json <<'PY'
import json, sys
SKIP = ("password", "token", "secret", "hash", "key")
d = json.load(open(sys.argv[1]))
for table, v in d.items():
    print(f"== {table}: expected {v['expected']}, rows {len(v['rows'])}")
    for row in v["rows"][:80]:
        texts = {k: (val[:120] + "…" if isinstance(val, str) and len(val) > 120 else val)
                 for k, val in row.items() if isinstance(val, str) and not any(s in k.lower() for s in SKIP)}
        print("  ", texts)
PY
```
Expected: counts match. `auth_user` is `demo` / `demo@example.com`, the household is "Demo Household", the institution "Northwind Bank", and the accounts belong to that household. Transaction descriptions are fictional merchants.
- **D4 stop, not a guess:** any description that looks like a real merchant from Evan's statements, a real account number, or a real person's name.

- [ ] **Step 5: Rehearse**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" leonsbudget rehearse; echo "exit=$?"
```
Expected: `PASS leonsbudget rehearse`, `exit=0`. G6 falls under the re-freeze rule. Anything else → D4 stop.

- [ ] **Step 6: Negative control**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" leonsbudget negative; echo "exit=$?"
```
Expected: `PASS leonsbudget negative`, `exit=0`.

- [ ] **Step 7: Execute**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" leonsbudget execute; echo "exit=$?"
grep -c '^GATE COMMITTED$' /home/evan/showcase-pending/_teardown-evidence/leonsbudget/execute.log
```
Expected: `PASS leonsbudget execute`, `exit=0`, `1`.

- [ ] **Step 8: Post-check**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" leonsbudget post; echo "exit=$?"
```
Expected: `PASS leonsbudget post`, `exit=0`.

- [ ] **Step 9: Record and commit**

Append `## Task 6 — LeonsBudget` in the Task 2 table format. The `Deleted:` line is: transactions 71, budget lines 44, monthly budgets 4, bank accounts 2, institution 1 (Northwind Bank), household member 1, household 1, user 1; categories retained. On a stop, use the STOPPED form.

```bash
git commit --only -m "docs(showcase-cleanup): task 6 — LeonsBudget demo household removed" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 7: the-classic — remove the demo auth user, tournament and course

**Files:**
- Modify: the results file (append `## Task 7 — the-classic`)

**Interfaces:**
- Consumes: `gate-run.sh the-classic <phase>`, `apps/the-classic.sql`.
- Produces: `$EVID/the-classic/`.

**Expected scope:** auth.mfa_amr_claims 4, auth.refresh_tokens 4, auth.sessions 4, auth.mfa_challenges 0, auth.mfa_factors 0, auth.one_time_tokens 0, auth.oauth_authorizations 0, auth.oauth_consents 0, auth.webauthn_challenges 0, auth.webauthn_credentials 0, auth.identities 1, public.player_scores 0, public.chat_messages 6, public.accolades 6, public.scores 37, public.tournament_players 12, public.foursomes 3, public.tournaments 1 (`dddddddd-dddd-dddd-dddd-dddddddddddd`), public.course_holes 18, public.courses 1 (`d0000000-…`), public.profiles 1, auth.users 1 (`921fafc9-d77f-4b55-b57e-7422f39c30f3`).
- `chirp_templates` row `d22792ea…` is real app data and is **not** in scope.
- Never run a `supabase` CLI command. Never run the app's test suite: `pnpm test:backend` writes to this database.

- [ ] **Step 1: Verify tooling**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
(cd "$T" && sha256sum -c SHA256SUMS) > /dev/null; echo "exit=$?"
```
Expected: `exit=0`.

- [ ] **Step 2: Preflight**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" the-classic preflight; echo "exit=$?"
```
Expected: `PASS the-classic preflight`, `exit=0`.

- [ ] **Step 3: Freeze**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" the-classic freeze; echo "exit=$?"
```
Expected: `PASS the-classic freeze`, `exit=0`.

- [ ] **Step 4: G7 content inspection**

```bash
python3 - /home/evan/showcase-pending/_teardown-evidence/the-classic/scope.json <<'PY'
import json, sys
SKIP = ("password", "token", "secret", "hash", "key", "code", "factor")
d = json.load(open(sys.argv[1]))
for table, v in d.items():
    print(f"== {table}: expected {v['expected']}, rows {len(v['rows'])}")
    if table.startswith("auth.") and table not in ("auth.users", "auth.identities"):
        continue  # session/token rows: counts only, never print
    for row in v["rows"]:
        texts = {k: (val[:120] + "…" if isinstance(val, str) and len(val) > 120 else val)
                 for k, val in row.items() if isinstance(val, str) and not any(s in k.lower() for s in SKIP)}
        print("  ", texts)
PY
```
Expected:
- Counts match.
- The auth user and identity are `demo@example.com`, the profile is "Sam", the course is "Cypress Ridge Golf Club", and the tournament is "The Classic 2026".
- The 12 players are fictional names. The 6 chat messages and 6 accolades are golf chirps and awards about those players.
- The spec expects 37 scores and 6 chat messages, where the capture log said 36 and 5 chirps. The extra score and message must be inside the demo tournament and read as the live final beat of the take, a score and its auto-chirp.
- **D4 stop:** any player or message naming a real person (Evan's golf group), or any row you cannot tie to the demo tournament.

- [ ] **Step 5: Rehearse**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" the-classic rehearse; echo "exit=$?"
```
Expected: `PASS the-classic rehearse`, `exit=0`. G6 falls under the re-freeze rule. Anything else → D4 stop.

- [ ] **Step 6: Negative control**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" the-classic negative; echo "exit=$?"
```
Expected: `PASS the-classic negative`, `exit=0`.

- [ ] **Step 7: Execute**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" the-classic execute; echo "exit=$?"
grep -c '^GATE COMMITTED$' /home/evan/showcase-pending/_teardown-evidence/the-classic/execute.log
```
Expected: `PASS the-classic execute`, `exit=0`, `1`.

- [ ] **Step 8: Post-check**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data; "$T/gate-run.sh" the-classic post; echo "exit=$?"
```
Expected: `PASS the-classic post`, `exit=0`.

- [ ] **Step 9: Record and commit**

Append `## Task 7 — the-classic` in the Task 2 table format. The `Deleted:` line is: auth amr claims 4, refresh tokens 4, sessions 4, identity 1, chat messages 6, accolades 6, scores 37, tournament players 12, foursomes 3, tournament 1, course holes 18, course 1, profile 1, auth user 1. On a stop, use the STOPPED form.

```bash
git commit --only -m "docs(showcase-cleanup): task 7 — the-classic demo user, tournament and course removed" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 8: chunk-norris — read-only audit of the 2026-08-25 pilot

**Files:**
- Modify: the results file (append `## Task 8 — chunk-norris audit`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the chunk-norris disposition line that Task 9 copies.

This task **deletes nothing and writes nothing** to any store.

Known facts, verified 2026-09-14:
- **The pilot.** It ran on 2026-08-25. Its session log (`portfolio_site/archive/session-logs/2026-08-25-17-05-claude-code-portfolio-showcase-meta-prompt.md`) was written at 17:05 ET. The walk was Health → Collections → Test Query → Data Quality.
- **Postgres.** `chunk_norris` shows 4 `ingest_jobs` rows touched on 2026-08-25:
  - three at 06:00 UTC (02:00 ET, the nightly schedule);
  - one at 15:02:26 UTC (11:02 ET) for source `5d7fdb85-fd80-4719-8498-7ddf55d48527`, which the 06:00 run also ingested.
  - No other timestamped table has a row that day.
- **Qdrant** (`infra-qdrant-1`) has no write timestamps.

- [ ] **Step 1: Re-run the Postgres audit**

```bash
docker exec infra-postgres-1 psql -U postgres -d chunk_norris -X -At -v ON_ERROR_STOP=1 -c "
select 'app_registry', count(*) from app_registry where created_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York' or updated_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York' or last_checked_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York'
union all select 'ingest_jobs', count(*) from ingest_jobs where started_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York' or completed_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York'
union all select 'quality_job_results', count(*) from quality_job_results where started_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York' or completed_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York'
union all select 'sources', count(*) from sources where created_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York' or updated_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York' or last_indexed_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York'
union all select 'staleness_flags', count(*) from staleness_flags where raised_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York' or reviewed_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York';"; echo "exit=$?"
docker exec infra-postgres-1 psql -U postgres -d chunk_norris -X -At -c "select id, source_id, status, started_at from ingest_jobs where started_at between '2026-08-25 00:00 America/New_York' and '2026-08-26 00:00 America/New_York' order by started_at;"
```
Expected: `app_registry|0`, `ingest_jobs|4`, `quality_job_results|0`, `sources|0`, `staleness_flags|0`, then the four jobs listed above. Different numbers are new facts: record them exactly.

- [ ] **Step 2: List Qdrant collections (read-only)**

```bash
docker exec chunk-norris-backend-1 python -c "import json,urllib.request as u; d=json.load(u.urlopen('http://qdrant:6333/collections',timeout=5)); print(sorted(c['name'] for c in d['result']['collections']))"; echo "exit=$?"
```
Expected: a list of collection names, and `exit=0`. No collection name should suggest demo or showcase data. One that does is a new fact: record it.

- [ ] **Step 3: Record the audit and raise the question**

Append:

```markdown
## Task 8 — chunk-norris audit (read-only)

Outcome: **STOPPED for Evan (audit only, nothing to delete)**
- Postgres, 2026-08-25 ET: <paste the five count lines>. ingest_jobs: 3 nightly at 06:00 UTC; 1 at 15:02:26 UTC for source 5d7fdb85… (also ingested by the nightly run).
- Qdrant: <collection list>; no write timestamps, so it cannot be dated.
- The pilot's walk (Health → Collections → Test Query → Data Quality) includes no ingest action.
- Question for Evan: was the 11:02 ET re-index of source 5d7fdb85 part of the 2026-08-25 chunk-norris showcase pilot? Nothing will be deleted either way; the answer only sets the Coverage disposition ("verified read-only" vs "one manual re-index during the pilot, no demo data").
```

The task returns `BLOCKED` with that question. It is a D4 ask under Global Constraints, not a failure. The controller carries the question into its batch for Evan and continues with Task 9.

```bash
git commit --only -m "docs(showcase-cleanup): task 8 — chunk-norris pilot audit recorded" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 9: infra — update the showcase meta-prompt

**Files:**
- Modify: `/home/evan/EVOsystem/infra/meta-prompts/portfolio-showcase/portfolio-showcase.md`
- Modify: `/home/evan/EVOsystem/infra/meta-prompts/portfolio-showcase/portfolio-showcase-changelog.md`

**Interfaces:**
- Consumes: the `Outcome:` line of each Task 2–8 section in the results file.
- Produces: an infra commit (its hash goes into Task 10).

- [ ] **Step 1: Provenance check**

```bash
git -C /home/evan/EVOsystem/infra status --short -- meta-prompts/portfolio-showcase/
```
Expected: no output. Any line means another session is editing these files → D4 stop, with nothing edited.

- [ ] **Step 2: Apply edit E1 — the "Decisions already made" teardown bullet**

In `portfolio-showcase.md`, replace exactly:
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
with the block below. Each `<outcome>` is filled from that app's `Outcome:` line in the results file:
- `cleaned <YYYY-MM-DD> (fail-closed gate; evidence kept outside git)` for a cleaned app;
- `STOPPED <YYYY-MM-DD> at <phase> — awaiting Evan: <question>` for a stopped one.

```
**Showcase demo data dispositions (2026-09-14)** — what each run left behind and
what became of it. Record: `portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md`.
- co-host ("The Long Fuse" channel, 2 episodes): <outcome>
- co-author (`demo@example.com`, "The Lighthouse at Kestrel Point"): <outcome>
- chudios ("Signal & Noise", 6 items, 3 `.m4a` files): <outcome>
- mind-palace ("Collective Security" route): <outcome>
- LeonsBudget (`demo@example.com`, Demo Household, Northwind Bank): <outcome>
- the-classic (`demo@example.com` "Sam", "The Classic 2026", Cypress Ridge): <outcome>
- graces-tree: cleaned 2026-09-13 by hand (17 demo people + `demo-arborist`).
- jourNOW: cleaned 2026-09-14 by hand (guarded transaction; 20 entries + demo user).
- chud: retained — conversation 7206 began as the demo Q&A but was reused on 2026-09-10 for real test messages and a session note.
- app-dash: retained — one "Description updated" row in an append-only activity log.
- voice-trainer: read-only verified, one accepted mutation (a real pair's `updated_at` from approve→revert).
- NomNoms: cleaned during its run (every CookSession deleted).
- Prompt-heus, logson: verified read-only.
- el-blackjack-pwa: ephemeral only (browser-context `localStorage`).
- chunk-norris (2026-08-25 pilot): <Task 8 outcome — "awaiting Evan: was the 11:02 ET re-index part of the pilot?" until answered>
```

- [ ] **Step 4: Apply edits E3–E5 — qualify the read-only statements**

Replace exactly `theater rules). The app repo is read-only for this run except \`docker compose\nup -d\`.` (two lines):
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
F=/home/evan/EVOsystem/infra/meta-prompts/portfolio-showcase/portfolio-showcase.md
grep -n 'never in the app repo\|no script in the repo\|filter the \*response\* of every list endpoint\|Demo data still in dev databases' "$F"; echo "stale-phrase hits above (expect none)"
grep -n 'read-only' "$F"
grep -n 'left by design\|no cleanup owed' "$F"
grep -c '^````' "$F"
```
Expected:
- the first command prints no matches;
- every `read-only` hit is one of: the recon "one read-only pass", "App product code is read-only", "app product code is read-only", "app's product code is read-only", or a historical Coverage row;
- `left by design` appears only in the new E1 and E10 text, and `no cleanup owed` only in the historical LeonsBudget Coverage row;
- the fence count is `2`.

Judge every hit. An unexpected one means an edit went wrong: restore the file with `git -C /home/evan/EVOsystem/infra checkout -- meta-prompts/portfolio-showcase/portfolio-showcase.md`, which is safe here because Step 1 proved the file was clean, then redo the edits.

- [ ] **Step 10: Changelog receipt and commit**

Append to `portfolio-showcase-changelog.md`:
```
| 2026-09-14 | **Throwaway stores + dispositions** (spec `portfolio_site/docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md`, after the showcase demo-data cleanup). **Decisions already made:** demo data never lives in the app's real database; seeded runs use a throwaway store and a committed `scripts/showcase_demo.*`; real-database seeding needs Evan's approval and the fail-closed gate. **STEP 0 / 0.5 / STEP 2 trap:** "app repo is read-only" qualified to app product code, with the committed seed script, its fixture/tests and the session log as the only app-repo writes. **STEP 1:** Write-effects rewritten around the throwaway store, walk-write cleanup and the verbatim STOP-AND-ASK rule; the seed sentence points at the committed seed script; the fifth outcome no longer filters list endpoints by id range. **STEP 3 teardown gate:** drop the throwaway store and prove the app is back on its real database. **Coverage:** the leftover-data list replaced by per-app dispositions from the cleanup results. |
```
Then:
```bash
git -C /home/evan/EVOsystem/infra commit --only -m "docs(meta-prompts): portfolio-showcase — throwaway demo stores, stop-and-ask, cleanup dispositions" -- meta-prompts/portfolio-showcase/portfolio-showcase.md meta-prompts/portfolio-showcase/portfolio-showcase-changelog.md
git -C /home/evan/EVOsystem/infra log --oneline -1
```
Append to the results file:
```markdown
## Task 9 — infra meta-prompt

Outcome: **updated** — infra `<hash>` (edits E1–E10 + changelog receipt; verification greps judged clean).
```
```bash
git commit --only -m "docs(showcase-cleanup): task 9 — meta-prompt updated (infra <hash>)" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md
```

---

### Task 10: Close out — summary and session log

**Files:**
- Modify: the results file (append `## Summary`)
- Create: `docs/session-logs/<YYYY-MM-DD-HH-MM>-claude-code-showcase-demo-data-cleanup.md` in this worktree

**Interfaces:**
- Consumes: the results file.
- Produces: the final commit of the branch.

- [ ] **Step 1: Verify final store state (read-only)**

```bash
T=docs/superpowers/plans/2026-09-14-showcase-demo-data
for a in co-host co-author chudios leonsbudget the-classic; do
  [ -f "/home/evan/showcase-pending/_teardown-evidence/$a/execute.log" ] && { "$T/gate-run.sh" "$a" post; echo "$a post exit=$?"; }
done
[ -f /home/evan/showcase-pending/_teardown-evidence/mind-palace/execute.log ] && { "$T/neo4j/mind-palace-gate.sh" post; echo "mind-palace post exit=$?"; }
[ -f /home/evan/showcase-pending/_teardown-evidence/chudios/files-purge.log ] && { "$T/files/chudios-files.sh" post; echo "chudios files post exit=$?"; }
```
Expected: every app that executed prints `PASS … post` with `exit=0`. Apps that stopped print nothing. A `post` failure now → D4 stop, reported first in the summary.

- [ ] **Step 2: Write the summary**

Append to the results file:
```markdown
## Summary

| App | Outcome |
|---|---|
| co-host | <cleaned / STOPPED at phase> |
| co-author | … |
| chudios | … |
| mind-palace | … |
| LeonsBudget | … |
| the-classic | … |
| chunk-norris audit | awaiting Evan (question in Task 8) |
| infra meta-prompt | infra `<hash>` |

Questions for Evan (every D4 stop, verbatim): <numbered list, or "none">
```

- [ ] **Step 3: Write the session log**

Follow `/home/evan/EVOsystem/infra/skills/writing-session-logs/SKILL.md`: frontmatter `type: docs`, `mode: attended`, `repos: [portfolio_site, infra]`, and every heading present.
- Accomplished = the summary table.
- Commits = every task commit plus the infra hash.
- Verification = each phase's exit per app.
- Open flags = every D4 stop and the chunk-norris question.

- [ ] **Step 4: Commit**

```bash
git add docs/session-logs/*-claude-code-showcase-demo-data-cleanup.md
git commit --only -m "docs(session-log): showcase demo data cleanup" -- docs/superpowers/plans/2026-09-14-showcase-demo-data-results.md docs/session-logs/*-claude-code-showcase-demo-data-cleanup.md
```

---

## Plan review record

| Date | Event |
|---|---|
| 2026-09-14 | Plan rev 1 written. Tooling validated before writing: SQL gate selftest (every planted defect fails with its specific diagnostic; happy path deletes only demo rows) passes in `showcase_gate_selftest`; file-protocol selftest passes; read-only preflight PASS on co-host, co-author, chudios, LeonsBudget, the-classic and mind-palace; mind-palace freeze and Cypher output shapes verified read-only. Pending: Codex adversarial plan review. |
