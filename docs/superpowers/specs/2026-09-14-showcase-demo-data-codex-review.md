# Codex adversarial review — showcase demo data spec (rev 1)

Model: gpt-5.6-sol, `codex exec -s read-only`. Reviewed revision: portfolio_site `e0d0703`. Verbatim final message below.

Executing this spec as written is not safe or reliably buildable. A compliant agent must stop on several apps before deletion; an incompletely compliant agent could delete or mutate real data, and several seed paths can strand demo data.

1. **Severity: BLOCKER — The stop rule makes LeonsBudget and mind-palace impossible to process**

   **Where:** STOP-AND-ASK rule §Decisions lines 31–35; LeonsBudget manifest line 79; mind-palace manifest line 83.

   **Evidence (VERIFIED):** The rule says any demo row referencing a shared/out-of-scope row requires stopping. Every LeonsBudget demo `BudgetLine` references a global `Category` (`LeonsBudget/budgets/models.py:45-54`), and the seed explicitly uses all existing categories (`showcase-pending/budget-app/seed.py:70,91-94`). Demo bank accounts similarly reference the global institution (`LeonsBudget/accounts/models.py:67-76`). The mind-palace seed intentionally linked the route to four pre-existing Wikidata `Entity` nodes (`mind-palace/docs/session-logs/2026-09-06-15-59-claude-code-portfolio-showcase-capture.md:43-47`); `create_step` matches an existing `Entity` and stores the elaboration note as a relationship property (`mind-palace/backend/app/selectors/routes.py:130-154`). The manifest’s “node the route didn’t create” trigger therefore applies to all four steps. It also inaccurately describes “4 relationships (4 steps + an elaboration note)”; there are four `HAS_STEP` relationships, each with a note property.

   **Fix:** Distinguish safe outbound references to explicitly retained shared parents from dangerous inbound references to rows being deleted. Allowlist the exact Category, Institution, and Entity identities as retained dependencies. Abort only if deletion would remove or mutate them, or if an unexpected relationship exists. For mind-palace, delete only the exact `Route` plus its four `HAS_STEP` relationships; the existing route delete already leaves Entity nodes untouched (`selectors/routes.py:46-55`).

2. **Severity: BLOCKER — “Unsure” is prose, not a mechanically complete pre-mutation gate**

   **Where:** Script contract lines 52–71; task flow lines 94–105.

   **Evidence (VERIFIED):** Required tests cover only selector scope, remote host, count mismatch, and one outside reference (`spec:65-69`). They do not require proof that every FK, cascade, M2M through table, semantic reference, file store, or external system has been enumerated. This matters because some references are invisible to FK inspection: CHUD’s `artifacts.conversation_id` has no FK (`chud/backend/db.py:271-282`), co-host’s `bible_amendments.source_episode_id` has no FK (`co-host/backend/migrations/0002_channels.sql:46-56`), and CHUD’s `cohost_documents` stores plain channel/episode IDs (`chud/backend/db.py:292-311`). Count-only survivor assertions also cannot detect `SET NULL` or arbitrary column mutations; `weekly_directions.conversation_id ON DELETE SET NULL` is a concrete example (`chud/backend/db.py:342-352`).

   **Fix:** Require a machine-readable dependency manifest per app listing every table, through table, relationship label, semantic reference, filesystem location, and external service. Preflight must fail closed on any schema dependency not in that allowlist. Snapshot survivor primary keys plus hashes of relevant columns—not merely counts—and repeat the complete gate inside the write transaction before its first mutation. Add tests proving missing dependency metadata and survivor-column mutation abort before deletion.

3. **Severity: BLOCKER — Exact committed identifiers conflict with app-generated IDs and interrupted-seed recovery**

   **Where:** Fixture contract line 63; `seed` contract line 54; graces-tree/mind-palace/co-host/chudios rows.

   **Evidence (VERIFIED):** mind-palace creates route UUIDs internally (`mind-palace/backend/app/services/routes.py:124-128`); chudios creates content and attempt UUIDs internally (`chudios/backend/app/repositories.py:44-60`); co-host generates channel and every child ID internally (`co-host/backend/app/repositories/channels.py:10-34`, and `rg "new_id(" backend/app` lists episodes, scripts, jobs, reviews, timelines, etc.); graces-tree uses ordinary auto-increment Person IDs and has no ownership link between people and the demo user (`graces-tree/backend/people/models.py:6-29`; `rg "AUTH_USER|owner" backend/people backend/question_bank backend/interviews` found no model ownership field). A committed fixture cannot contain these future generated IDs. The spec also has no durable creation receipt. If a multi-request API seed fails halfway, teardown rejects the partial counts, so the next `seed` cannot clean up and demo data remains indefinitely.

   **Fix:** Choose one explicit design per app:

   - An app-native management/import command that accepts deterministic fixture IDs; or
   - A crash-safe, atomically written seed receipt containing every returned ID and path.

   Teardown must accept only a receipt-proven subset after an interrupted seed, while still rejecting unidentified rows. Missing or corrupt receipts must stop and ask. Add interrupted-seed recovery tests at every write boundary.

4. **Severity: BLOCKER — the-classic manifest is not the cascade closure and Supabase teardown is underspecified**

   **Where:** the-classic row line 80; single-transaction contract line 53.

   **Evidence (VERIFIED):** The manifest omits known tables touched by the fixture: `profiles`, `course_holes`, `player_scores`, and `chat_reads`. Profile deletion cascades from `auth.users` (`supabase/migrations/20260322000000_create_profiles.sql:1-6`); course holes cascade from the demo course (`20260322000001_create_courses.sql:12-19`); player scores cascade from scores (`20260322000005_create_scores.sql:36-50`); the cascade migration explicitly names `player_scores`, chirp tables, and `chat_reads` among tournament dependencies (`20260725110612_cascade_tournament_delete.sql:15-17`). Visiting Chirps can upsert a `chat_reads` row (`src/shared/hooks/ChatUnreadProvider.tsx:35-49,60-99`). Its current existence is **UNVERIFIED**, but the write path is verified. The original audit counted only ten tables (`docs/session-logs/...portfolio-showcase-clip.md:73-75`), and the spec admits only the user and tournament were freshly reverified.

   Supabase signup also creates vendor-managed auth dependencies such as identities/sessions; their current counts are **UNVERIFIED**. Storage is enabled (`supabase/config.toml:105-119`), although no repository upload path was found. Admin API deletion cannot share one database transaction with public-table SQL.

   **Fix:** Export and enumerate the complete `public`, relevant `auth`, and `storage.objects` closure before approval. Require explicit expected zero/nonzero counts. Use one direct transaction against the verified local Postgres instance for database deletion, with the demo UUID fixed in the statement; separately require storage-prefix emptiness. Do not use the Auth Admin HTTP API as the transactional teardown channel.

5. **Severity: BLOCKER — chudios cannot meet its own-code-path and atomic teardown contracts**

   **Where:** chudios row line 81; seed line 54; nontransactional-store risk line 137.

   **Evidence (VERIFIED):** The session log supplies exact omitted child counts: 6 attempts, 8 stage runs, 2 transcripts, 1 QC report, 9 clips, 7 marketing assets, and 4 published-status rows (`chudios/docs/session-logs/...portfolio-showcase-capture.md:30-44`). The application’s own deletion tests enumerate those seven cascade targets (`backend/tests/test_content_item_delete.py:19-27,114-146`). App-native creation generates random UUIDs (`backend/app/repositories.py:44-60`), not the required `dddddddd-` identifiers. Registration stores a file and immediately advances the workflow (`backend/app/routers/content_items.py:85-112`), potentially creating CHUD activity. Deleting an item explicitly abandons—not cancels—a running CHUD stage (`content_items.py:308-322`).

   The DB delete and volume unlink cannot be one transaction. The spec says to stop if atomicity cannot be established, so a literal implementation must always stop. It also calls the volume `chudios-recordings`, while repository instructions warn the actual Docker volume is `chudios_chudios-recordings` and that guessing the shorter name silently creates an empty volume (`chudios/AGENTS.md:75-81`).

   **Fix:** Commit the exact seven child counts. Resolve the mount from `docker inspect`, never a literal volume name. Build an offline app-native fixture importer that does not invoke CHUD. Use a two-phase file protocol: rename exact files to a quarantine directory on the same volume, perform/commit the DB transaction, then unlink quarantined files; restore them if the DB rolls back, and make status report quarantine residue.

6. **Severity: BLOCKER — co-host teardown ignores data written into CHUD**

   **Where:** co-host row line 82.

   **Evidence (VERIFIED):** co-host’s FKs use the default restrictive behavior, not cascades: channels/bibles (`migrations/0002_channels.sql:14-57`), jobs (`0003_chud_jobs.sql:1-30`), episodes and versioned children (`0004_episodes.sql:1-104`), and reviews (`0005_reviews.sql:1-22`). `rg -n "@router.delete|DELETE FROM" co-host/backend` returned no delete route or application deletion implementation.

   More importantly, submitting a job first ingests a CHUD artifact and starts a workflow (`co-host/backend/app/services/chud_jobs.py:110-157`). The client exposes POST/GET operations but no delete (`clients/chud_client.py:92-150`). The showcase freeze created failed job `job_fba52731d285` (`docs/session-logs/...portfolio-showcase.md:98-103`); if ingest succeeded before start failed, its artifact may be orphaned because the local job records IDs only after both calls complete. Current CHUD residue is **UNVERIFIED**. CHUD also has `cohost_documents` and `cohost_mirror_gaps` keyed by plain channel/episode strings with no FK (`chud/backend/db.py:292-335`).

   **Fix:** Treat CHUD as part of co-host’s write-effect boundary. Query exact channel/episode/job IDs across `artifacts`, workflows, `cohost_documents`, and mirror gaps before any local deletion. If an artifact cannot be identified exactly, stop and ask. Either add a guarded CHUD deletion capability or seed co-host through an offline fake/provider path that cannot create CHUD state. Explicitly define child deletion order and exact counts.

7. **Severity: BLOCKER — graces-tree has no durable safe deletion scope, and its fixture source mixes real and demo data**

   **Where:** graces-tree row line 85; “normal local database” decision line 29.

   **Evidence (VERIFIED):** Demo people are not owned by the demo auth user, so dynamic IDs are the only proposed scope. “IDs above the real maximum at seed time” becomes unsafe as soon as a real person is added after seeding; range teardown can then delete that person and cascade Couples, ParentChild links, photos, and jobs. The model cascades are at `graces-tree/backend/people/models.py:39-79`; InterviewQuestion and Interview protect Person deletion (`question_bank/models.py:55-66`, `interviews/models.py:17-23`).

   The cleanup log says the backup contains all 39 pre-cleanup people and associated real tables (`docs/session-logs/2026-09-13-18-03-claude-code-remove-portfolio-demo-family.md:42-46`) and recommends a separate database for future captures (`:86-89`). Whether the proposed private subset was extracted correctly is **UNVERIFIED**; I did not read the prohibited evidence directory.

   **Fix:** Do not use an ID range. Prefer a disposable cloned demo database, as the app’s own cleanup log recommends. Otherwise add durable demo ownership/namespace metadata and a receipt of exact created PKs. Generate the fixture from a code-authored fictional dataset; if the mixed backup must be used, extraction must be an allowlist program that rejects every model/PK and FK edge outside the approved set.

8. **Severity: BLOCKER — the “local-only” guard authenticates a hostname, not the target**

   **Where:** Local-only guard lines 56–61.

   **Evidence (VERIFIED):** Any database on `localhost`, any local forward, and any container reachable by a local URL passes the stated rule. The guard does not require the expected database name, container identity, Supabase project ID, schema fingerprint, or a local-only sentinel. This is material: the-classic repository is linked such that `supabase db push` and function deployment target production (`the-classic/docs/session-logs/...portfolio-showcase-clip.md:132-134`), and co-author carries both local and production settings while resolving `DATABASE_URL` from the environment (`co-author/backend/config/settings/base.py:83-88`; `production.py:1-12`).

   **Fix:** Require an exact per-app target tuple: resolved DSN/API URL, database name, expected container ID/Compose project labels, schema migration head, and a database sentinel created only in the local stack. For Supabase require project ID `the-classic`, ports 54331/54332, container labels, and explicitly ban linked CLI operations. Resolve and print the target before any credentials or connection are used.

9. **Severity: MAJOR — co-author user deletion leaves token records and the manifest omits nonzero M2M tables**

   **Where:** co-author row line 84.

   **Evidence (VERIFIED):** Signup and every login issue a refresh token (`co-author/backend/users/views.py:62-75,94-108`; `backend/users/services.py:63-69`). SimpleJWT’s installed `OutstandingToken.user` FK is `SET_NULL`, not cascade (`backend/.venv/.../token_blacklist/migrations/0012_alter_outstandingtoken_user.py:15-23`), so deleting user 2 leaves outstanding-token rows carrying demo token metadata with `user_id=NULL`. Repeated logins also make a static exact token count infeasible.

   The fixture creates nonzero auto-generated M2M rows: Beats→Events/Characters (`domains/beats/models.py:30-33`), Events→Characters (`domains/events/models.py:24-26`), and four OpenQuestion link tables (`domains/open_questions/models.py:30-49`). The seed populates these links (`showcase-pending/co-author/seed.py:193-267,323-454`), but the manifest names none of the through tables.

   **Fix:** Enumerate every generated through table and expected count. Delete exact OutstandingToken rows for the demo user—including BlacklistedToken children—before deleting the user. Define how variable login/session records are scoped; do not pretend they have a fixed fixture count.

10. **Severity: MAJOR — the CHUD deletion check misses concrete reference and mutation paths**

   **Where:** chud row line 87 and special flow line 109.

   **Evidence (VERIFIED):** The source schema has `messages` and `session_notes` referencing conversations without cascades (`chud/backend/db.py:15-30`), `priority_proposals` cascading from conversations (`:38-49`), `weekly_directions` setting the reference to NULL (`:342-352`), and `artifacts.conversation_id` with no FK (`:271-282`). The showcase log confirms conversation 7206 but does not establish the claimed eight-message count or absence of these other references (`archive/session-logs/...portfolio-showcase-chud.md:100-101`). The live eight-message count was supplied by the author but is **UNVERIFIED** here.

   **Fix:** Name and query all four reference classes explicitly, including the non-FK artifact column. Require exact eight message IDs/content hashes, zero session notes, zero proposals, zero weekly directions, and zero artifacts. Delete messages explicitly before the conversation so no cascade or `SET NULL` can touch an unenumerated row.

11. **Severity: MAJOR — full-suite verification can write to the same live local Supabase database**

   **Where:** Task flow line 106; test contract lines 65–71.

   **Evidence (VERIFIED):** the-classic’s backend suite requires the running local Supabase (`the-classic/CLAUDE.md:16-19,110`) and tests create/delete Auth users through the admin API (`tests/backend/rls/roster.test.ts:252-294`, `scores.test.ts:128-160`, `chat-reads.test.ts:35-82`). The same CLAUDE file warns `db reset` destroys all local dev accounts (`:34-39`). A failing or interrupted suite can leave test users/rows after the teardown baseline was approved.

   **Fix:** Run destructive integration tests against an isolated temporary Supabase project/database cloned from migrations, not the owner’s dev instance. Keep showcase script guard tests pure or mocked. If any suite must use the dev database, take and verify a complete identity/hash baseline after the suite as well as before it.

12. **Severity: MAJOR — the planned meta-prompt edit leaves contradictory app-repo write rules**

   **Where:** Meta-prompt change lines 111–118.

   **Evidence (VERIFIED):** The existing prompt says the app repo is read-only except `docker compose up` (`infra/meta-prompts/portfolio-showcase/portfolio-showcase.md:178-183`), says not to rebuild because it is read-only (`:245-254`), repeats read-only during recon (`:295-302`) and bug handling (`:610-615`), and currently mandates scratch-only seed scripts (`:361-368`). The spec proposes changing STEP 1 and searching only for “left in dev DB”/“never in app repo” (`spec:114-124`), so the other absolute read-only statements remain. “The one allowed app-repo write” is also inaccurate: execution writes a script, fixture, tests, session log, and commit.

   **Fix:** Qualify every read-only statement consistently: app product code remains read-only, while only `scripts/showcase_demo.*`, its fixture, its tests, and the required session log may be added. Preserve “do not fix app bugs” and “do not redeploy” independently. Verification should search all `app repo is read-only`/`no app changes` variants, not two phrases.

13. **Severity: MINOR — the coverage closure is incomplete, although no additional persisted demo row was verified**

   **Where:** Meta-prompt Coverage change line 117.

   **Evidence (VERIFIED):** NomNoms deleted every CookSession and ended at zero (`NomNoms/...portfolio-showcase-clip.md:70-76`); Prompt-heus and logson were read-only; el-blackjack used browser-context-local `localStorage` only (`el-blackjack-pwa/...portfolio-showcase-clip.md:29-35`). Voice Trainer restored `draft/approved` counts but left a changed `updated_at` on a real row (`voice-trainer/...portfolio-showcase.md:45-48`). app-dash intentionally retains its append-only activity row (`app-dash/...portfolio-showcase-run.md:132-134`) and is correctly represented in the manifest.

   The chunk-norris pilot log records repository outputs but contains no app-store baseline or mutation audit (`portfolio_site/archive/session-logs/2026-08-25-17-05-claude-code-portfolio-showcase-meta-prompt.md:9-24`). Source inspection suggests Test Query is read-only, but the pilot’s actual database/Qdrant effects remain **UNVERIFIED**.

   **Fix:** Do not wholesale strike the leftover-data history. Replace every Coverage row with an explicit disposition: cleaned, intentionally retained, ephemeral-only, verified read-only, or unresolved. Record Voice Trainer’s timestamp mutation and perform a read-only Postgres/Qdrant audit for the chunk-norris pilot before declaring it clean.

No additional app-specific deletion defect was found for jourNOW beyond the generic target-authentication, receipt, and survivor-verification problems above. Its required entry-before-user ordering is consistent with the source. The materially cheaper and safer overall path is disposable cloned demo databases/volumes—especially for graces-tree, LeonsBudget, and the-classic—followed by destroying the disposable stack instead of performing repeated surgical deletes in databases containing live owner data.

**Tally: 8 BLOCKER, 4 MAJOR, 1 MINOR.**