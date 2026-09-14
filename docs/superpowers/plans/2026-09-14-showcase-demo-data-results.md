# Showcase Demo Data Cleanup — Results

Plan: `docs/superpowers/plans/2026-09-14-showcase-demo-data.md` · Spec: `docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md`
Evidence (never committed): `/home/evan/showcase-pending/_teardown-evidence/<target>/`

## States

| Target | State |
|---|---|
| co-host | POST-VERIFIED |
| co-host-chud | POST-VERIFIED |
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
| `sha256sum -c SHA256SUMS` | exit=0, all OK (16/16 files) |
| no earlier run (evidence, selftest DBs, container temp dirs, quarantine) | clean — evidence dir `700 evan` with only the 3 expected files; selftest DB count 0; container temp dir + quarantine count 0 (re-checked clean after each self-test) |
| gate self-test | exit=0, 0 failures |
| file self-test | exit=0, 0 failures, temp dir removed |
| preflight co-host / co-host-chud / co-author / chudios / leonsbudget / the-classic | exit=0 ×6 |
| preflight mind-palace | exit=0 |
| chudios files check | exit=0 |

## Task 2 — co-host

### co-host (co_host)
State: **POST-VERIFIED** (2026-09-14 22:24:31 UTC)
| Phase | exit | Evidence |
|---|---|---|
| preflight | 0 | `co-host/preflight.log` |
| freeze | 0 | `co-host/scope.json`, rows digest `9b6855bb42c5` |
| G7 inspection | fictional | `co-host/g7-inspection.txt` — all 741 lines are the fictional history show "The Long Fuse" (template-seeded bible, the Molasses Flood and Tambora premises, beat sheets, scripts and table read, 7 stage events, the failed energy_map job), every timestamp 2026-09-06 19:23–19:31 UTC, no real private person, email, other channel or personal note. |
| rehearse | 0 | `co-host/rehearse.log` (GATE ROLLED BACK) |
| negative | 0 | `co-host/negative.log` (GATE FAIL G3 count, as designed) |
| execute | 0 | `co-host/execute.log` (GATE COMMITTED; state COMMITTED) |
| post | 0 | `co-host/post.log` (GATE POST SCOPE OK, GATE POST OK) |
Deleted: timeline_events 7, table_reads 1, script_versions 2, beat_sheet_versions 2, chud_jobs 1, episodes 2, premises 2, show_bible_versions 1, show_bibles 1, channels 1.

### co-host-chud (chud)
State: **POST-VERIFIED** (2026-09-14 22:26:50 UTC)
| Phase | exit | Evidence |
|---|---|---|
| preflight | 0 | `co-host-chud/preflight.log` |
| freeze | 0 | `co-host-chud/scope.json`, rows digest `72c22511e8dd` |
| G7 inspection | fictional | `co-host-chud/g7-inspection.txt` — one `source_bundle` artifact (created 2026-09-06 19:23:58 UTC, 24 ms after job `job_fba52731d285`) holding "The Long Fuse" channel name/genre, its template show bible v1 and the frozen Molasses Flood script v1, identical to that job's input; nothing from any other channel. |
| rehearse | 0 | `co-host-chud/rehearse.log` (GATE ROLLED BACK) |
| negative | 0 | `co-host-chud/negative.log` (GATE FAIL G3 count, as designed) |
| execute | 0 | `co-host-chud/execute.log` (GATE COMMITTED; state COMMITTED) |
| post | 0 | `co-host-chud/post.log` (GATE POST SCOPE OK, GATE POST OK) |
Deleted: artifacts 1 (`e6135781-…`). Conversation 7206: 8 messages before and after.
