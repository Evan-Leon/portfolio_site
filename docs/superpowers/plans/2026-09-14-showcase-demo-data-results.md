# Showcase Demo Data Cleanup — Results

Plan: `docs/superpowers/plans/2026-09-14-showcase-demo-data.md` · Spec: `docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md`
Evidence (never committed): `/home/evan/showcase-pending/_teardown-evidence/<target>/`

## States

| Target | State |
|---|---|
| co-host | POST-VERIFIED |
| co-host-chud | POST-VERIFIED |
| co-author | POST-VERIFIED |
| chudios (db + files) | STOPPED at G7 inspection — question: are `demo-signal-noise.m4a` (named by 3 in-scope demo attempts) and the 2026-09-02..04 back-dated timestamps expected seed artifacts, so chudios may continue from rehearse? |
| mind-palace | POST-VERIFIED |
| leonsbudget | NOT-STARTED |
| the-classic | NOT-STARTED |
| chunk-norris audit | NOT-STARTED |

## Open questions for Evan

1. **chudios (Task 4, stopped at G7).** The plan expects the in-scope recording paths to name only `demo-sn-ep09/11/12.m4a`. Three of the 6 in-scope demo attempts (Ep. 10, 13 and 14; ids `dddddddd-0001-…-000000000010/13/14`) instead name `recording_path = demo-signal-noise.m4a`, which the plan and spec never mention. Read-only facts: that file is **not** in the `chudios_chudios-recordings` volume, and no surviving (non-`dddddddd-`) attempt names it. Separately, rows in clips, attempts, stage_runs, transcripts and content_items carry `created_at` 2026-09-02..04, outside the 2026-09-05/06 window. They share identical microsecond fractions at whole-day offsets from a 2026-09-06 ~19:16 UTC base, which looks like seed back-dating, but nothing in the plan says so. Are both expected artifacts of the showcase seed, so Task 4 may continue from `rehearse` on the current freeze (rows digest `94c9fa17f3a1`)? Nothing was written: no rehearse, quarantine or execute ran, and the three files are untouched in `/data/recordings`.

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

## Task 3 — co-author

### co-author (co_author)
State: **POST-VERIFIED** (2026-09-14 22:34:22 UTC)

| Phase | exit | Evidence |
|---|---|---|
| preflight | 0 | `co-author/preflight.log` |
| freeze | 0 | `co-author/scope.json`, rows digest `25753243f41c` |
| G7 inspection | fictional | `co-author/g7-inspection.txt` — all 462 lines are the fictional radio drama "The Lighthouse at Kestrel Point" (story 7, podcast_episode): 5 characters, 4 settings, 6 events, 3 relationships, 4 open questions, 5 beats, 3 edited beat drafts; `auth_user` is `demo@example.com` ("Demo Writer"); 16 outstanding tokens show only masked `jti`/`token`; every timestamp 2026-09-06 19:40–19:56 UTC; per-table counts match the expected scope exactly; no real person, email or content from Evan's own stories or account. |
| rehearse | 0 | `co-author/rehearse.log` (GATE ROLLED BACK) |
| negative | 0 | `co-author/negative.log` (GATE FAIL G3 count, as designed) |
| execute | 0 | `co-author/execute.log` (GATE COMMITTED; state COMMITTED) |
| post | 0 | `co-author/post.log` (GATE POST SCOPE OK, GATE POST OK) |

Deleted: outstanding tokens 16, beat drafts 3, beat↔character 14, beat↔event 6, event↔character 15, open-question↔character 7, open-question↔event 4, beats 5, open questions 4, relationships 3, events 6, characters 5, settings 4, story 1, user 1.

## Task 4 — chudios

### chudios (chudios + volume `chudios_chudios-recordings`)
State: **STOPPED at G7 inspection — question: are `demo-signal-noise.m4a` (named by 3 in-scope demo attempts) and the 2026-09-02..04 back-dated timestamps expected seed artifacts, so chudios may continue from rehearse?** (see Open questions 1)

| Phase | exit | Evidence |
|---|---|---|
| `sha256sum -c SHA256SUMS` | 0 | all OK (16/16 files) |
| preflight | 0 | `chudios/preflight.log` |
| files check | 0 | `chudios/files-check.log` |
| freeze | 0 | `chudios/scope.json`, rows digest `94c9fa17f3a1` |
| G7 inspection | STOP (D4 judgment) | `chudios/g7-inspection.txt` (542 lines): per-table counts match the expected scope exactly (clips 9, attempts 6, qc_reports 1, stage_runs 8, transcripts 2, content_items 6, marketing_assets 7, published_status 4). The content is the fictional "Signal & Noise" podcast (Ep. 09–14, e.g. "Interfaces Are Promises", "Your Queue Is Lying"), every attempt is `source = synthetic`, and the QC diff hashes are placeholders (`d3m0…`, `5eeded…`). No real person or email appears. **Triggers:** (1) attempts for Ep. 10/13/14 name `recording_path = demo-signal-noise.m4a`, where the brief expects only `demo-sn-ep09/11/12.m4a`; (2) `created_at` 2026-09-02..04 on rows in five tables, outside the showcase window, which nothing in the plan explains. |
| rehearse | not run | — |
| negative | not run | — |
| files quarantine | not run | — |
| execute | not run | no `state.txt` |
| files purge / restore | not run | — |
| post / files post | not run | — |

Deleted: nothing. Files: `demo-sn-ep09.m4a` (230111 B), `demo-sn-ep11.m4a` (246791 B) and `demo-sn-ep12.m4a` (286386 B) are untouched in `/data/recordings`, and there is no `.showcase-quarantine` directory (read-only `ls`, 2026-09-14). A read-only check found `demo-signal-noise.m4a` absent from the volume, and no surviving attempt names it.

## Task 5 — mind-palace

### mind-palace (Neo4j `mind-palace-neo4j-1`)
State: **POST-VERIFIED** (2026-09-14 22:51:23 UTC)

| Phase | exit | Evidence |
|---|---|---|
| `sha256sum -c SHA256SUMS` | 0 | all OK (16/16 files) |
| preflight | 0 | `mind-palace/preflight.log` (Route 2, Entity 228, HAS_STEP 5; degrees 3/2/9/14) |
| freeze | 0 | `mind-palace/scope.txt`, `degrees.txt`, `fingerprint.txt`, survivor hash `02d3e149b634` |
| G7 inspection | fictional | `mind-palace/fingerprint.txt` (one line, read in full): route "Collective Security" with only `created_at`, `id`, `name`, `updated_at`; 4 `HAS_STEP` rows (positions 0–3 → World War I, League of Nations, World War II, United Nations), each with exactly `elaboration_note`, `last_reviewed_at`, `position`. The notes are four one-sentence demo lines on one "referee without a whistle" metaphor, including the one the plan quotes; every timestamp 2026-09-06 19:31:32–37 UTC; no study notes, real person or private data. |
| dry | 0 | `mind-palace/dry.log` (real statement → `deleted_steps` 4; wrong-name statement → nothing) |
| rehearse | 0 | `mind-palace/rehearse.log` (`deleted_steps` 4, `remaining_in_tx` 0, rolled back; unchanged after) |
| negative | 0 | `mind-palace/negative.log` (`remaining_in_tx` 1: the wrong-name delete matched nothing) |
| execute | 0 | `mind-palace/execute.log` (`deleted_steps` 4, exit 0; state COMMITTED) |
| post | 0 | `mind-palace/post.log` (Route 1, Entity 228, HAS_STEP 1, demo route gone; degrees 2/1/8/13; survivor hash unchanged) |

Deleted: Route 1 (`60c383d5-921e-443c-9430-b2242469fbe0`) and its HAS_STEP relationships 4; 228 Entities retained.
