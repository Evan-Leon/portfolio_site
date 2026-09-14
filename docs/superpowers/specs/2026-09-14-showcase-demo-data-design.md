# Showcase Demo Data — Guarded Cleanup, Seeds Later

**Date:** 2026-09-14
**Status:** Rev 2 — Codex spec review folded in. Rev 1 was `e0d0703`; the review is `2026-09-14-showcase-demo-data-codex-review.md`: 8 BLOCKER / 4 MAJOR / 1 MINOR, disposition table at the end.
**Author:** Claude. The brainstorming session started in jourNOW and was landed here at Evan's direction.
**Related:**
- `infra/meta-prompts/portfolio-showcase/portfolio-showcase.md`: teardown rule added in infra `c0bee1d`.
- Evidence directory: `/home/evan/showcase-pending/_teardown-evidence/`, mode 700, never committed.

## Problem

The 2026-09-05/06 portfolio-showcase sweep seeded demo data into apps' local databases so it could film them. Its orchestrator ruled that the demo data "may persist". For several apps the local database **is the owner's real, live data**: jourNOW's journal, graces-tree's family, LeonsBudget's finances.

Cleanup so far:
- graces-tree was cleaned by hand on 2026-09-13.
- jourNOW was cleaned on 2026-09-14. It had 20 fake entries sitting beside Evan's journal.
- Six apps still hold demo data.
- A seventh leftover, chud conversation 7206, turned out to be shared with later real test data (see D2).

## Goals

1. **Remove every leftover demo record from the six apps**, with a fail-closed gate that proves no real row was deleted or changed.
2. **Give every showcase-touched app a recorded disposition**: cleaned, retained with a reason, ephemeral-only, verified read-only, or unresolved.
3. **Change the showcase meta-prompt** so a future re-recording seeds into a throwaway database. The app's seed script is committed at that point, and never before.

**Not goals:**
- building seed scripts now;
- re-recording any clip;
- changing any published portfolio page;
- fixing any app bug the showcase logs flagged;
- changing any app repo's code.

## Decisions (Evan, 2026-09-14)

- **D1 — Cleanup now, seeds later.** This supersedes rev 1's "committed seed scripts for 8 apps in real dev databases". Codex showed that approach needs, in every app, seed receipts, ownership markers, CHUD-offline seeding paths and an isolated test Supabase. No clip is being re-recorded, so none of that is built now.
- **D2 — chud conversation 7206 is retained.** It began as the showcase's 2-message chunk-norris Q&A on 2026-09-06. A 2026-09-10 session then reused it for 6 more messages and session note 4910. It is no longer demo-only. Its disposition is "retained — mixed with 2026-09-10 test data". Nothing in chud is touched.
- **D3 — Authority.** Approving the final plan authorizes the deletes it names, and nothing more. Those are exactly the scopes in the manifest below, executed through the gate protocol.
- **D4 — STOP-AND-ASK. This overrides D3.** If the executing agent is unsure **at all** about any row, node, relationship, file or reference, it stops, reports, and asks Evan. It deletes nothing for that app until he answers. It never guesses, never widens a selector, and never "cleans up what looks like demo data". The rule is enforced mechanically by the gate (below), and the agent's own judgment adds to it:
  - **Mechanical triggers.** Any gate check failing, meaning:
    - target identity;
    - dependency closure;
    - scope counts;
    - inbound references;
    - survivor hashes;
    - negative control.
    Also any command erroring, and any count or id differing between the frozen export and the in-transaction re-query.
  - **Judgment triggers.** Any of these:
    - exported text that reads like real content (a real person's name, a real email, prose that reads like Evan's own writing);
    - a timestamp outside the showcase window that nothing explains;
    - a table, column or reference the plan did not anticipate;
    - anything the agent would describe as "probably fine".
  - **Outbound references to retained shared rows are not triggers.** A demo row pointing *at* an allowlisted shared parent the delete keeps is expected; examples are LeonsBudget budget lines → a shared category, and a mind-palace step → a shared Entity. The triggers are:
    - an **inbound** reference from outside the scope into a row being deleted;
    - any change to the allowlisted parents themselves;
    - an outbound reference to a parent that is not on the allowlist.
  - **Stops are isolated.** A stop on one app halts only that app. Independent apps continue.

## Scope and dispositions

| App | Disposition target | Action |
|---|---|---|
| LeonsBudget | cleaned | guarded delete |
| the-classic | cleaned | guarded delete |
| chudios | cleaned | guarded delete, plus files |
| co-host | cleaned | guarded delete, plus a CHUD residue check |
| mind-palace | cleaned | guarded delete (Neo4j) |
| co-author | cleaned | guarded delete |
| graces-tree | cleaned (2026-09-13) | none, record only |
| jourNOW | cleaned (2026-09-14) | none, record only |
| chud | retained: conversation 7206 mixed with 2026-09-10 test data (D2) | none, record only |
| app-dash | retained: one "Description updated" row in an append-only activity log | none, record only |
| voice-trainer | read-only-verified with one accepted mutation: queue counts restored, one real pair's `updated_at` changed by approve→revert (showcase log lines 45–48) | none, record only |
| NomNoms | cleaned during its run (every CookSession deleted) | none, record only |
| Prompt-heus, logson | verified read-only (their logs) | none, record only |
| el-blackjack-pwa | ephemeral-only (browser-context `localStorage`) | none, record only |
| chunk-norris (2026-08-25 pilot) | **unresolved**: the pilot recorded no store baseline | read-only audit of the `chunk_norris` Postgres DB and Qdrant for writes dated 2026-08-25; finding nothing → "verified read-only (audit 2026-09-14)"; anything found → stop and ask, never delete |

## Cleanup mechanism

This is a one-time operation. It runs as direct store access against the authenticated local store, with the exact SQL and Cypher written in the implementation plan. It deliberately does not go through app code or the Supabase Admin API, because exact enumerated deletes with in-transaction assertions are the auditable path. Nothing is committed to any app repo.

### Target authentication (G1) — before any credential or connection is used

Every app's gate first verifies an exact target tuple and prints it. Any mismatch is a stop.

| App | Container (compose project → working dir) | Store / database | Schema head sentinel | Anchor row sentinel |
|---|---|---|---|---|
| LeonsBudget | `infra-postgres-1` (infra → `/home/evan/EVOsystem/infra`) | Postgres `leons_budget` | `django_migrations` latest non-core = `0003_seed_ignore_category` | `auth_user` id 3 email `demo@example.com`; `accounts_household` id 3 name "Demo Household" |
| the-classic | `supabase_db_the-classic` (the-classic) | Supabase Postgres `postgres` | `supabase_migrations.schema_migrations` max = `20260725110612` | `auth.users` `921fafc9-d77f-4b55-b57e-7422f39c30f3` email `demo@example.com` |
| chudios | `infra-postgres-1` + `chudios-backend-1` (chudios → `/home/evan/EVOsystem/chudios`) | Postgres `chudios`; volume `chudios_chudios-recordings`, mount resolved with `docker inspect`, never a literal name | `schema_migrations` latest = `0010_qc_script_diff.sql` | 6 `content_items` with ids beginning `dddddddd-` |
| co-host | `infra-postgres-1`; CHUD residue on `chud` | Postgres `co_host` (plus a read-only look at `chud`) | `schema_migrations` latest = `0007_handoff_reason_code.sql` | `channels` id `ch_b11b31a0d9ae` name "The Long Fuse" |
| mind-palace | `mind-palace-neo4j-1` (mind-palace → `/home/evan/EVOsystem/mind-palace`) | Neo4j 5.26.27 community | `Route` count = 2, `Entity` count = 228 | `Route` id `60c383d5-921e-443c-9430-b2242469fbe0` |
| co-author | `infra-postgres-1` | Postgres `co_author` | `django_migrations` latest non-core = `0013_alter_blacklistedtoken_options_and_more` | `auth_user` id 2 email `demo@example.com`; `stories_story` id 7 "The Lighthouse at Kestrel Point" |

- Each store is reached only through `docker exec <container>`, never through a host port or DSN. No `supabase` CLI command runs; the-classic's CLI is linked to production. No `.env*` file is read for connection settings.
- **Known oddity:** LeonsBudget's `redis` and `frontend` containers run from the frozen `/mnt/d` copy while its backend runs from ext4. This is irrelevant to the DB target (`infra-postgres-1`), and is recorded, not fixed.

### Gate protocol (per Postgres app) — fail-closed, in order

1. **G1 Target.** Check the tuple above.
2. **G2 Dependency closure.**
   - Introspect every foreign key in the database that references any table in the app's scope set (`pg_constraint`, all schemas, `auth` and `storage` included for the-classic).
   - Compare them to the plan's committed **dependency allowlist**: every referencing table and column, its delete rule, and whether the plan deletes through it or expects zero rows. Any FK not on the allowlist is a stop.
   - Run each **non-FK reference check** the plan lists and require its expected count, for example chud `artifacts`, `cohost_documents` and `cohost_mirror_gaps` for co-host ids.
3. **G3 Scope freeze.**
   - Resolve the scope from its anchors through the allowlisted closure only: demo user id, household id, tournament and course ids, channel id, content item ids, story id.
   - Require each table's count to equal the manifest.
   - Export every scope row (`row_to_json`) and the per-table id sets to `_teardown-evidence/<app>-scope-2026-09-14.json`. The id sets freeze here.
4. **G4 Inbound.** For every allowlisted FK, count rows **outside** the scope that reference a row **inside** it. Every count must be 0.
5. **G5 Outbound allowlist.**
   - List the distinct retained parents referenced from the scope (LeonsBudget: `categorization_category` ids).
   - They must be exactly the kind the plan names.
   - They go into the survivor snapshot.
6. **G6 Survivor snapshot.**
   - For every table in the dependency allowlist, every table in the scope set, and every allowlisted parent table: record count and `md5(string_agg(row_to_json(t)::text, '' ORDER BY <pk>))` over rows **not** in the frozen id sets.
   - Store the snapshot in the evidence directory.
7. **G7 Content inspection.** The agent reads the exported scope text fields. Anything that reads as real triggers D4.
8. **G8 Negative control.**
   - Run the deletion transaction with one expected count deliberately off by one.
   - It must abort with that assertion's message and roll back.
   - Re-run G3 counts and G6 hashes, which must be unchanged.
   - A gate that has never failed is not tested.
9. **Execute (one transaction).**
   - `BEGIN`.
   - Re-query the scope id sets and require them identical to the frozen sets.
   - Recompute the G6 hashes and require them identical.
   - Delete child → parent by frozen ids (`WHERE id = ANY(ARRAY[…])`). Never use `LIKE`, ranges or anchors alone.
   - Assert every scope table has 0 rows for the frozen ids.
   - Recompute the G6 hashes and require them identical to the snapshot.
   - `COMMIT`.
   - Any failed assertion raises, and the transaction rolls back.
10. **Post-check.** Outside the transaction, rerun G3 (all zero) and G6 (identical). Record both outputs.

### Per-store specifics

- **the-classic (Supabase).**
  - `auth.users` and its auth rows (identities, sessions, refresh tokens) plus `public.profiles` are deleted **inside the same Postgres transaction** as the public tables, in explicit order.
  - The Admin API is never used, and `storage.objects` owned by the demo user must be 0.
  - No test suite runs, because no app code changes, so Codex MAJOR 11 does not arise.
  - `chirp_templates` row `d22792ea…` (created 2026-06-14) is **real app data** that merely starts with `d`. It is the documented reason prefix selectors are banned.
- **chudios (database plus volume files): two-phase file protocol.**
  1. Resolve the recordings mount from `docker inspect chudios-backend-1`.
  2. Record each demo file's size and sha256.
  3. `mv` the 3 exact files into `/data/recordings/.showcase-quarantine/` on the same volume.
  4. Run the database transaction.
  5. On commit, delete the quarantined files and remove the directory.
  6. On rollback, move them back and verify their sha256.
  7. The post-check requires the files absent and no quarantine directory.
  8. If the backend container isn't running, stop.
- **co-host.**
  - FKs are `NO ACTION`, so the delete order is explicit: children → episodes → channel.
  - Before any delete, `chud.artifacts`, `chud.cohost_documents` and `chud.cohost_mirror_gaps` must have 0 rows mentioning the demo channel, episode or job ids (verified 0 on 2026-09-14).
  - The failed CHUD job `job_fba52731d285` was never mirrored.
  - Nothing is deleted in chud.
- **mind-palace (Neo4j).**
  - Export the Route node's properties and its 4 `HAS_STEP` relationship properties (`elaboration_note`, `last_reviewed_at`, `position`) to the evidence directory.
  - Snapshot the Entity count (228), `HAS_STEP` count (5), `Route` count (2), and the degree of each linked Entity: United Nations 2, World War II 14, League of Nations 3, World War I 9.
  - Delete with a **single atomic conditional statement**: match the exact route id, require exactly 4 outbound `HAS_STEP` relationships to the four named Entities and 0 inbound relationships, and only then `DETACH DELETE` the Route node. That removes only the route and its own 4 relationships; Entity nodes are never deleted. If the condition fails, it deletes nothing and returns 0 rows, which is a stop.
  - The post-check requires Entity 228, `HAS_STEP` 1, Route 1, and each of those four degrees reduced by exactly 1.
- **co-author.**
  - SimpleJWT's `OutstandingToken.user` FK is `SET NULL` in Django. The 16 outstanding tokens (0 blacklisted) are deleted explicitly by frozen id before the user, and no null-user token may exist afterwards.
  - The M2M through tables are deleted explicitly, before their parents.
- **LeonsBudget.**
  - All FKs are `NO ACTION`, so the delete order is explicit.
  - `accounts_institution` id 9 "Northwind Bank" is **in scope** (created by the showcase, and no account outside household 3 references it).
  - `categorization_category` rows are **retained allowlisted parents**.

## Per-app manifest (live-verified 2026-09-14)

The executing agent re-verifies every number at G3. Any difference is a stop.

| App | Scope (exact counts) |
|---|---|
| LeonsBudget | `auth_user` 1 (id 3) · `accounts_householdmember` 1 · `accounts_household` 1 (id 3) · `accounts_bankaccount` 2 · `accounts_institution` 1 (id 9) · `budgets_monthlybudget` 4 · `budgets_budgetline` 44 · `transactions_transaction` 71 · `transactions_importbatch` 0 · `categorization_categoryrule` 0 · `categorization_categoryoverride` 0 · `auth_user_groups` / `auth_user_user_permissions` / `django_admin_log` for user 3: 0. Retained parents: `categorization_category`, 11 distinct ids referenced by lines and 11 by transactions. |
| the-classic | `auth.users` 1 · `auth.identities` 1 · `auth.sessions` 4 · `auth.refresh_tokens` 4 · `auth.mfa_factors` 0 · `auth.one_time_tokens` 0 · `public.profiles` 1 · `courses` 1 (`d0000000-…-000000000001`, created by the demo user) · `course_holes` 18 · `tournaments` 1 (`dddddddd-dddd-dddd-dddd-dddddddddddd`) · `foursomes` 3 · `tournament_players` 12 · `scores` 37 · `player_scores` 0 · `accolades` 6 · `chat_messages` 6 · `chat_reads` 0 · `tournament_chirp_settings` 0 · `storage.objects` 0. Out-of-scope checks, each 0: demo user in other tournaments, scores entered elsewhere, messages sent elsewhere, other tournaments on the demo course. Scores 37 vs the log's 36, and messages 6 vs 5 chirps: both extras are under the exact demo tournament, consistent with the live final beat in the log. G7 must confirm this, or stop. |
| chudios | `content_items` 6 (`dddddddd-`) · `attempts` 6 · `stage_runs` 8 · `transcripts` 2 · `qc_reports` 1 · `clips` 9 · `marketing_assets` 7 · `published_status` 4 · files: `demo-sn-ep09.m4a` 230111 B, `demo-sn-ep11.m4a` 246791 B, `demo-sn-ep12.m4a` 286386 B. Survivors: 8 other content items. |
| co-host | `channels` 1 · `episodes` 2 (`ep_a78a3f018922`, `ep_df1c614c159e`) · `premises` 2 · `show_bibles` 1 · `show_bible_versions` 1 · `character_bibles` 0 · `character_bible_versions` 0 · `bible_amendments` 0 (including non-FK `source_episode_id`) · `chud_jobs` 1 (`job_fba52731d285`, failed) · `beat_sheet_versions` 2 · `script_versions` 2 · `table_reads` 1 · `reviews` 0 · `timeline_events` 7 · chud residue 0 across 3 tables. Survivors: 6 other channels. |
| mind-palace | `Route` 1 · `HAS_STEP` 4 (to United Nations, World War II, League of Nations, World War I) · inbound 0. Retained: all 228 `Entity` nodes, the other Route and its 1 `HAS_STEP`. |
| co-author | `auth_user` 1 (id 2) · `stories_story` 1 (id 7; user 2 owns no other) · `characters_character` 5 · `settings_places_setting` 4 · `events_event` 6 · `relationships_relationship` 3 · `open_questions_openquestion` 4 · `beats_beat` 5 · `beat_drafts_beatdraft` 3 · `beats_beat_characters` 14 · `beats_beat_events` 6 · `events_event_characters` 15 · `open_questions_openquestion_linked_characters` 7 · `…_linked_events` 4 · `…_linked_relationships` 0 · `…_linked_settings` 0 · `token_blacklist_outstandingtoken` 16 · `token_blacklist_blacklistedtoken` 0 · request tables (element generation/proposal, beat proposal, research, timeline ordering, draft request) 0 · `timeline_timelinedivider` 0. |

## Meta-prompt change (infra `portfolio-showcase.md`)

1. **Re-recording seeds into a throwaway database.**
   - STEP 1's fourth and fifth outcomes change: seeded demo data goes into a database created **from the app's own migrations** (never a copy of real data), for example `<db>_showcase` on the same server or a throwaway local Supabase or Neo4j instance.
   - The app is pointed at it only for the capture, through a compose override or environment variable the run does not commit.
   - Teardown means dropping that database or volume and restoring the app's normal configuration, with a check that the app is back on its real database.
   - The seed script is committed in the app repo **at that point**, as `scripts/showcase_demo.*`.
   - Seeding into the real database remains only as a fallback with Evan's explicit approval, and it must follow this spec's gate protocol.
2. **Qualify every read-only statement consistently.** App product code stays read-only, and so does no rebuild or redeploy, and no app bug fixes. The only app-repo writes allowed are the committed `scripts/showcase_demo.*`, its fixture, its tests, and the session log.
   - The edit covers every occurrence: the STEP 0 header, the image-staleness paragraph, the recon paragraph, the "walk trips an app bug" trap, and STEP 1's scratch-only seed sentence.
   - Verification greps `read-only`, `never in the app repo`, `left by design` and `no cleanup owed`, and every remaining hit is judged.
3. **Copy D4 (stop-and-ask) verbatim** into STEP 1's data check.
4. **Coverage.**
   - Replace the "demo data still in dev databases" list with a per-row disposition taken from this spec's table.
   - Keep historical notes intact; append each disposition.
   - Add a changelog receipt row.

## Execution shape

- **Session.** A clean Claude session in `portfolio_site` runs the plan with subagent-driven development, one task per app plus an audit task, a meta-prompt task and a record task.
- **Model.** Sub-agents run on a non-Fable model; Opus for the delete tasks.
- **Stops.** A task that hits D4 returns `STOPPED — <question>` to the orchestrator, which asks Evan and continues other independent tasks.
- **Commits.**
  - portfolio_site: the plan's Changelog/results and the session log.
  - infra: the meta-prompt change.
  - No app repo commits.

## Verification (whole effort)

- **Deleted apps.** Each of the six has step-10 post-check evidence (all scope counts 0, survivor hashes identical) in the evidence directory. The negative-control abort is recorded.
- **mind-palace.** Entity and degree post-checks pass.
- **chudios.** The files are absent, and there is no quarantine directory.
- **chunk-norris.** The audit is recorded.
- **Meta-prompt.** Its greps are judged, and its Coverage dispositions are complete.
- **Results record.** The portfolio_site session log and the plan's results table list each app as `done` or `stopped — asked Evan: <question> — <answer>`.

## Codex review disposition (rev 1 → rev 2)

| # | Sev | Disposition |
|---|---|---|
| 1 | BLOCKER | **Accepted.** D4 now distinguishes outbound refs to allowlisted retained parents from inbound refs. mind-palace deletes only the Route and its own rels, via a conditional atomic statement. |
| 2 | BLOCKER | **Accepted.** G2 adds FK introspection against a committed allowlist plus listed non-FK checks. G6 adds survivor hashes, not just counts. G8 adds a negative control. Re-checks run inside the transaction before mutation. |
| 3 | BLOCKER | **Moot under D1.** No seed scripts or fixtures are built now. Re-recording uses throwaway databases. |
| 4 | BLOCKER | **Accepted.** The full the-classic closure (auth, profiles, holes, player_scores, chat_reads, storage) was live-verified. Auth rows are deleted in the same Postgres transaction, and there is no Admin API. |
| 5 | BLOCKER | **Accepted.** Exact chudios child counts. Volume resolved with `docker inspect` (real name `chudios_chudios-recordings`). Two-phase quarantine file protocol. No app-native import (D1). |
| 6 | BLOCKER | **Accepted.** CHUD residue checked across 3 tables, live 0. Explicit NO ACTION delete order. No CHUD deletion. |
| 7 | BLOCKER | **Moot under D1.** graces-tree is already clean and gets no seed. Re-recording must use a throwaway database, which matches its own cleanup log's advice. |
| 8 | BLOCKER | **Accepted.** G1 checks an exact tuple (container, compose project, database, migration head, anchor sentinel), access only through `docker exec`, and bans the linked Supabase CLI. |
| 9 | MAJOR | **Accepted.** Outstanding tokens are deleted explicitly before the user. The M2M through tables are enumerated with live counts. |
| 10 | MAJOR | **Superseded by D2.** Conversation 7206 is retained; live inspection found it mixed with 2026-09-10 data (note 4910, 6 later messages). |
| 11 | MAJOR | **Moot.** No app code changes, so no app test suites run against the live Supabase. |
| 12 | MAJOR | **Accepted.** Every read-only statement is qualified consistently, and the grep list is widened. |
| 13 | MINOR | **Accepted.** Coverage gets per-row dispositions (no wholesale strike), the voice-trainer timestamp mutation is recorded, and a chunk-norris read-only audit is added. |
