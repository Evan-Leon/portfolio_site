# Showcase Demo Data — Guarded Cleanup, Seeds Later

**Date:** 2026-09-14
**Status:** Rev 3. Two Codex reviews are folded in:
- **Spec review** (rev 1 `e0d0703`): 8 BLOCKER / 4 MAJOR / 1 MINOR. The review is `2026-09-14-showcase-demo-data-codex-review.md`.
- **Plan review** (plan rev 1.1 `5c0259b`): 6 BLOCKER / 9 MAJOR / 1 MINOR. The review is `../plans/2026-09-14-showcase-demo-data-plan-codex-review.md`.

**Where Rev 3 overrides earlier text:** decisions D5 and D6, and the "Rev 3 amendments" section at the end, override any earlier line they contradict. Both disposition tables are at the end.
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
  - **CHUD residue (Rev 3, D5).** The failed job `job_fba52731d285` ingested one source-bundle artifact into CHUD before its workflow failed: `artifacts` `e6135781-781a-436f-9af0-fb79136abd5b`, created 2026-09-06 19:23:58 UTC.
    - It names "The Long Fuse" but not the demo ids, so the Rev 2 id-only check read 0 and missed it.
    - It is removed by its own gated declaration against `chud` (`co-host-chud`).
    - Every other chud table was scanned: nothing else references it, and `cohost_documents` and `cohost_mirror_gaps` hold 0 rows naming the demo show.
    - Nothing else in chud is deleted, and conversation 7206 is untouched (D2).
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

## Rev 3 amendments (after the Codex plan review)

### New decisions (Evan, 2026-09-14)

- **D5 — Delete co-host's CHUD residue, gated.** Artifact `e6135781-…` (above) is removed through the same fail-closed gate, as declaration `co-host-chud` against the `chud` database. Conversation 7206 stays untouched; D2 still holds.
- **D6 — Delete the demo user's auth audit rows.** the-classic's `auth.audit_log_entries` holds exactly 5 rows whose `payload->>'actor_id'` is the demo user: its signup and 4 logins, 2026-09-06 18:49–18:53 UTC. No other row mentions it. They are deleted by exact id inside the same transaction as the rest of the demo user. They sit outside every FK, so this is a declared non-FK scope table.
- **D7 — The chunk-norris 11:02 ET re-index was not part of the pilot (Evan, 2026-09-14).** The 2026-08-25 15:02:26 UTC `ingest_jobs` row for source `5d7fdb85…` is unrelated to the showcase. With the Postgres and Qdrant audits as measured, chunk-norris's disposition is "verified read-only". The audit still re-runs, and it becomes a question again only if its live numbers differ from the measured ones, or if Qdrant reports any unparseable or pilot-window point.

### Gate protocol amendments

These supersede the matching Rev 2 steps.

- **G1.**
  - The migration check pins a SHA-256 of the **complete** migration manifest, not a lexical maximum:
    - Django `app.name` pairs for LeonsBudget and co-author;
    - the `schema_migrations` versions for chudios and co-host;
    - `supabase_migrations` and `auth.schema_migrations` for the-classic;
    - the `artifacts` column list for chud, which has no migrations table.
  - Anchors are **mode-aware**. In pre mode each anchor must exist; in post mode it must be gone.
- **G2.**
  - Every allowlisted FK also pins its `confdeltype`.
  - Every DELETE- or UPDATE-firing trigger on a scope, referencing or parent table must be allowlisted with a SHA-256 of `pg_get_triggerdef || pg_get_functiondef`.
  - Any rewrite rule is a stop.
- **G6 scope rows.**
  - **What is frozen.** Freeze is **one** repeatable-read transaction producing the export, ids, survivor snapshot, id digest and a **scope-row content digest**: length-prefixed canonical JSON, ordered by key.
  - **The check at delete time.** The delete transaction is repeatable-read. It takes `FOR UPDATE` row locks on every scope row, then requires the content digest to equal the freeze before anything is deleted. A row whose content changed after G7 inspected it is a stop.
  - **Hashing.** All hashes are SHA-256 over length-prefixed canonical JSON.
- **mind-palace.**
  - The conditional delete also requires a canonical fingerprint of every route and step property to equal the frozen one, inside the same statement.
  - A read-only `dry` phase runs the exact assembled statement without its delete line.
- **Commit state.**
  - After every `execute`, a read-only classifier records `PRE-STATE` (all frozen ids present), `COMMITTED` (none) or `MIXED` in `state.txt`. `execute` passes only on `COMMITTED`.
  - chudios purges its quarantined files only on `COMMITTED` and restores them only on `PRE-STATE`. `MIXED`, `UNKNOWN` or a timeout keeps the files quarantined and stops.
  - A committed `execute` can't be re-run, and it can't be re-frozen afterwards.
- **Post (G10).**
  - The declaration is loaded in **post mode**. Every scope selector must re-resolve to nothing, every extra check must equal its declared post value, and the closure must be intact.
  - Then the frozen ids must be gone and the survivors identical to the freeze.
- **Timeouts.** `lock_timeout` 10 s, `statement_timeout` 300 s, `idle_in_transaction_session_timeout` 600 s, and `timeout` around every docker call. A timed-out `execute` is classified, never assumed.
- **Files.** Quarantine, restore and purge are **resumable per file**. Each file must be in exactly one allowed place with its exact size and sha256. A stray file or a file found in both places is a stop.
- **Self-tests.**
  - The file self-test uses a validated `mktemp` directory and removes only that directory.
  - Selftest overrides are refused against the real volume.
  - Every diagnostic is matched against the invoking phase's own log.
  - New planted cases cover: scope-row drift, a changed FK delete rule, a changed allowlisted trigger, post-mode residue, classifier states, re-freeze, execute re-run refusal, and crash-and-resume at each file step.

### chunk-norris audit, measured

Qdrant points carry `indexed_at`. A read-only scroll of all 18 collections on 2026-09-14 found **0 points** dated 2026-08-25 or 2026-08-26; everything has been re-indexed since. Postgres (half-open ET window) shows 3 nightly `ingest_jobs` at 02:00 ET and 1 at 11:02 ET, for a source the nightly run also ingests. The disposition question to Evan stays as the plan states it.

## Codex plan review disposition (plan rev 1.1 → rev 2)

| # | Sev | Disposition |
|---|---|---|
| 1 | BLOCKER | **Accepted.** Scope-row content digest frozen in the same transaction as the export, re-checked under `FOR UPDATE` locks in the delete transaction. Neo4j property fingerprint inside the conditional delete. The G7 inspector walks JSON recursively without truncation. |
| 2 | BLOCKER | **Accepted and confirmed live.** Artifact `e6135781-…` found by content. Removed under D5 via `co-host-chud`. |
| 3 | BLOCKER | **Accepted and confirmed live.** 5 audit rows. Removed under D6. |
| 4 | BLOCKER | **Accepted.** Post mode re-resolves every selector and extra check. |
| 5 | BLOCKER | **Accepted.** Every `execute` is classified. File purge/restore is keyed to the classified state. |
| 6 | BLOCKER | **Accepted.** Unique validated `mktemp` directory with a trap; selftest overrides refused on the real volume. |
| 7 | MAJOR | **Accepted.** FK delete rules and trigger definition/function digests pinned. |
| 8 | MAJOR | **Accepted.** Full migration-manifest SHA-256 pins, including the GoTrue auth schema. |
| 9 | MAJOR | **Accepted.** Per-file resumable moves, with crash-injection self-tests. |
| 10 | MAJOR | **Accepted.** Server and client timeouts; a timeout during `execute` is classified. |
| 11 | MAJOR | **Accepted.** Qdrant `indexed_at` scroll done (0 pilot-day points). Half-open windows in the audit. |
| 12 | MAJOR | **Accepted.** Explicit per-app states. Tasks 9–10 wait until every D4 question is answered. |
| 13 | MAJOR | **Accepted.** An SDD worktree for portfolio_site, a separate infra worktree branch for Task 9, and reviewers who re-run post/classify read-only against the evidence. The Codex worker-pool point does not apply: Claude executes. |
| 14 | MAJOR | **Accepted.** The listed planted cases were added, and matching is per-invocation. |
| 15 | MAJOR | **Accepted.** Task 9 edits in an infra worktree and never runs `git checkout --` on a shared checkout. |
| 16 | MINOR | **Accepted.** SHA-256 over length-prefixed canonical JSON everywhere. |

## Codex plan re-review disposition (rev 2 → rev 3)

Receipt: `../plans/2026-09-14-showcase-demo-data-plan2-codex-review.md` (reviewed `e4298e3`): 1 BLOCKER / 5 MAJOR / 2 MINOR. Prior findings: 9 addressed, 7 partial, 0 not addressed.

| # | Sev | Disposition |
|---|---|---|
| 1 | BLOCKER | **Accepted.** mind-palace G7 now inspects `fingerprint.txt`, the exact value the delete compares, so the reviewed and compared content cannot diverge. The fingerprint length-prefixes every key, `valueType()` and value, and is bound as a Cypher `:param`. It was verified live: equal for the real route, and unequal after a one-character change. |
| 2 | MAJOR | **Accepted.** Reviewer mode (`GATE_REVIEW=1`) allows only read-only phases and writes logs and state under `review/`. The reviewer snapshots the original mtimes first and judges the full G7 file independently. A self-test proves the originals are untouched. |
| 3 | MAJOR | **Accepted.** Each allowlisted trigger also pins `tgtype` and `tgenabled`, and is checked row by row whatever events it fires on now. Self-tests cover a disabled trigger and one re-pointed at another event. |
| 4 | MAJOR | **Accepted.** `timeout --foreground -k` on every docker call, in the tooling and in the plan's Task 1/8 commands. |
| 5 | MAJOR | **Accepted.** The Qdrant audit reads `indexed_at` and `source_id`, requires a parseable tz-aware timestamp on every point, and reports every unparseable point and hit. Measured 2026-09-14: 18 collections, 0 unparseable, 0 hits. |
| 6 | MAJOR | **Accepted.** New self-test cases: a non-FK `audit_note` residue caught only by a post-only extra check (`GATE FAIL G10 extra check`), and a lost COMMIT marker (execute fails, state `COMMITTED`, post verifies). |
| 7 | MINOR | **Accepted.** Exact-name stray matching (`grep -xF`); a self-test case covers a regex-lookalike `f..m4a`. |
| 8 | MINOR | **Accepted.** The scope-id digest length-prefixes every table name and id. |

**Narrow verification of rev 3** (`../plans/2026-09-14-showcase-demo-data-plan3-codex-review.md`, reviewed `2265ac3`): 6 fixed, 2 partially fixed (#4 timeouts, #5 Qdrant exit status and disposition), and no new findings. Both partial fixes were completed in the following commit.
