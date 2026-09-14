# Codex adversarial review — showcase demo data plan (rev 1.1)

Model: gpt-5.6-sol, `codex exec -s read-only`. Reviewed revision: portfolio_site `5c0259b` (plan rev 1.1 + tooling). Verbatim final message below. Dispositions: spec `2026-09-14-showcase-demo-data-design.md` § "Codex plan review disposition".

Do not execute this plan yet. Static review was performed at commit `5c0259baeb40acaef6e5d5e187474e4528b61625`; all 14 checksums and five shell syntax checks pass. I made no tracked-file changes and did not access Docker or live stores.

1. **Severity: BLOCKER**  
   **Where:** [gate.sql:180](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate.sql:180), [gate-run.sh:97](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate-run.sh:97), [plan:406](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:406), [mind-palace-gate.sh:54](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/neo4j/mind-palace-gate.sh:54)  
   **Evidence (VERIFIED):** PostgreSQL survivor hashes exclude every row being deleted, while the in-transaction digest covers only table names and IDs. Freeze obtains export, IDs, snapshot, and digest in four separate transactions. Thus a scope row can acquire real content after G7 while retaining its ID, and every gate can still pass before deleting it. G7 compounds this by printing only top-level strings, truncating them, and ignoring JSON/JSONB content; both co-host and chudios store substantial prose in JSONB. Neo4j similarly freezes Route/relationship properties but never compares them before deletion; its survivor hash deliberately excludes them.  
   **Fix:** Freeze a canonical full-row digest for scope rows and compare it under row locks immediately before deletion. Recursively inspect all JSON/JSONB content without truncation. Include exact Route and `HAS_STEP` property fingerprints in the Neo4j conditional delete.

2. **Severity: BLOCKER**  
   **Where:** [gate-run.sh:49](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate-run.sh:49), [chud_jobs.py:61](/home/evan/EVOsystem/co-host/backend/app/services/chud_jobs.py:61), [chud_jobs.py:140](/home/evan/EVOsystem/co-host/backend/app/services/chud_jobs.py:140)  
   **Evidence (VERIFIED):** The CHUD check searches only four co-host IDs. `ingest_artifact()` can succeed and `start()` then fail, leaving an artifact while the co-host job is recorded failed. The artifact source bundle contains channel names and content but is not guaranteed to contain those IDs. Therefore `artifacts=0` can pass while the failed demo artifact remains.  
   **Fix:** Identify artifacts using fields/content actually persisted—plus time and unique fictional markers—and check all three CHUD tables. If an artifact cannot be uniquely correlated without guessing, D4 requires stopping and asking Evan.

3. **Severity: BLOCKER**  
   **Where:** [the-classic.sql:18](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/apps/the-classic.sql:18), [gotrue-version:1](/home/evan/EVOsystem/the-classic/supabase/.temp/gotrue-version:1), [spec:175](/home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md:175)  
   **Evidence:** **VERIFIED** that the local stack uses GoTrue `v2.190.0`, while the declaration has no `auth.audit_log_entries` check. Supabase’s auth schema defines that non-FK table with JSON payloads, and Auth audit events may contain user identity data. G2 cannot discover it through FK introspection. [Official schema](https://github.com/supabase/auth/blob/master/migrations/00_init_auth_schema.up.sql), [audit-log documentation](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/audit-logs.mdx). The live presence of demo-user audit rows is **UNVERIFIED** because Docker was intentionally not accessed; under D4, that uncertainty itself blocks execution.  
   **Fix:** Read-only query/export audit rows mentioning the demo UUID/email and obtain an explicit disposition. If deletion is authorized, add exact frozen IDs to reviewed tooling; otherwise record that complete removal is intentionally impossible.

4. **Severity: BLOCKER**  
   **Where:** [gate.sql:269](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate.sql:269), [gate-run.sh:156](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate-run.sh:156), [the-classic.sql:100](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/apps/the-classic.sql:100), [spec:132](/home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md:132)  
   **Evidence (VERIFIED):** Post-check does not load the app declaration or rerun G3/`gate_extra`; it checks only frozen IDs and survivor hashes. Non-FK checks such as `storage.objects`, `auth.flow_state`, and null-user tokens can therefore become nonzero after preflight yet post still report success. This directly contradicts the spec’s “rerun G3 (all zero)” requirement.  
   **Fix:** Give every declaration an explicit post-mode that re-resolves all scope selectors and non-FK checks with expected zero counts, then run it outside the committed transaction.

5. **Severity: BLOCKER**  
   **Where:** [gate-run.sh:82](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate-run.sh:82), [gate-run.sh:151](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate-run.sh:151), [plan:438](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:438), [mind-palace-gate.sh:131](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/neo4j/mind-palace-gate.sh:131)  
   **Evidence (VERIFIED):** SQL sends `COMMIT` before emitting the marker. A connection/container failure after server commit but before receipt of that marker yields a nonzero or “missing marker” result even though rows are gone. The chudios plan then restores files and incorrectly states that the database rolled back. Neo4j has the same uncertainty around its autocommitted write.  
   **Fix:** Treat every execute transport anomaly as “commit state unknown.” Keep files quarantined and run a fresh read-only classifier: confirmed pre-state, confirmed committed post-state, or mixed/unknown. Restore or purge only after that classification.

6. **Severity: BLOCKER**  
   **Where:** [files/selftest-files.sh:7](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/files/selftest-files.sh:7), [files/selftest-files.sh:14](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/files/selftest-files.sh:14)  
   **Evidence (VERIFIED):** Task 1 reruns a selftest that unconditionally executes `rm -rf /tmp/gate-files-selftest` inside the live backend container. It never establishes ownership of that pre-existing path. It can therefore delete unrelated files before any D4 gate runs.  
   **Fix:** Allocate a unique container-side directory with `mktemp -d`, validate the resolved path, and clean only that exact directory with a guarded trap.

7. **Severity: MAJOR**  
   **Where:** [gate.sql:20](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate.sql:20), [gate.sql:24](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate.sql:24), [gate.sql:85](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate.sql:85), [spec:101](/home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md:101)  
   **Evidence (VERIFIED):** G2’s FK allowlist stores only referencing table, column, and target table. `confdeltype` and the required “delete-through versus expect-zero” disposition are absent. Trigger approval binds only table/name, not trigger definition or function body. A same-name trigger changed to mutate an unrelated table can pass G2 and evade every survivor hash.  
   **Fix:** Pin FK delete actions and expected disposition. Pin `pg_get_triggerdef()` and trigger-function definitions by digest, or reject mutating triggers entirely; snapshot every reviewed trigger write target.

8. **Severity: MAJOR**  
   **Where:** [co-author.sql:6](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/apps/co-author.sql:6), [leonsbudget.sql:6](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/apps/leonsbudget.sql:6), [the-classic.sql:6](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/apps/the-classic.sql:6)  
   **Evidence (VERIFIED):** Django G1 compares only the global lexical `max(name)`. A new migration in another app with a lower name is invisible. The Classic check pins only the public Supabase migration maximum, not the vendor-managed `auth` schema version. Schema drift introducing non-FK references can therefore evade G1.  
   **Fix:** Compare the exact per-app migration leaf set or complete migration manifest. Separately pin the installed Supabase Auth schema/version and relevant definitions.

9. **Severity: MAJOR**  
   **Where:** [chudios-files.sh:64](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/files/chudios-files.sh:64), [chudios-files.sh:70](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/files/chudios-files.sh:70), [plan:429](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:429)  
   **Evidence (VERIFIED):** Quarantine moves three files sequentially. If a later move fails, files are split between root and quarantine. `restore` first requires all three in quarantine, so the plan’s assertion that restore “must PASS” is false. Purge is likewise non-resumable after partial deletion.  
   **Fix:** Implement an idempotent reconciliation phase that validates each file in either location and safely completes or reverses a partial transition without overwriting. Add injected second-move and second-delete failures to the selftest.

10. **Severity: MAJOR**  
    **Where:** [gate-run.sh:46](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate-run.sh:46), [mind-palace-gate.sh:31](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/neo4j/mind-palace-gate.sh:31), [chudios-files.sh:43](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/files/chudios-files.sh:43)  
    **Evidence (VERIFIED):** There is no PostgreSQL `lock_timeout`/`statement_timeout` and no outer timeout around Docker, `psql`, `cypher-shell`, or file operations. A concurrent live transaction or wedged container can stall indefinitely; the plan provides no classification or recovery path.  
    **Fix:** Add bounded server and client timeouts. Treat timeout during a write as commit-unknown and use Finding 5’s read-only classifier.

11. **Severity: MAJOR**  
    **Where:** [plan:752](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:752), [plan:767](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:767), [ingestion.py:523](/home/evan/EVOsystem/chunk-norris/backend/app/services/ingestion.py:523), [quality.py:94](/home/evan/EVOsystem/chunk-norris/backend/app/services/quality.py:94)  
    **Evidence (VERIFIED):** The plan states Qdrant has no write timestamps and merely lists collection names. Every indexed point actually receives an `indexed_at` payload, and existing quality tooling already requests that field. Task 8 can therefore miss precisely the dated pilot writes it is supposed to audit. PostgreSQL’s inclusive `BETWEEN` also includes midnight at the start of August 26.  
    **Fix:** Read-only page through owned Qdrant collections and count/correlate `indexed_at` and `source_id` for a half-open `[start,end)` interval. Use half-open predicates in PostgreSQL too.

12. **Severity: MAJOR**  
    **Where:** [plan:131](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:131), [plan:143](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:143), [plan:781](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:781), [plan:1089](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:1089), [spec:215](/home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md:215)  
    **Evidence (VERIFIED):** Task 1 says a stopped preflight is recorded, but its fixed results template says all preflights passed. Task 8 returns `BLOCKED`, yet Tasks 9–10 continue and commit a final result “awaiting Evan.” This contradicts the spec’s required `question — answer` record. Task 10 also equates an `execute.log` with execution even though failed attempts create that log.  
    **Fix:** Maintain explicit states—never attempted, stopped/question pending, rollback confirmed, commit confirmed, post confirmed—and a resume path. Do not finalize Coverage/results until every D4 question has an answer or clearly label the effort paused and unfinalized.

13. **Severity: MAJOR**  
    **Where:** [plan:3](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:3), [plan:35](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:35), [plan:43](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:43), [plan:64](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:64)  
    **Evidence (VERIFIED):** Both `portfolio_site` and `infra` are currently branch `main` with `.git` as both git-dir and common-dir—not isolated worktrees. Task 9 writes the absolute infra checkout. The plan mentions reviewers but defines no per-task specification or quality review dispatches. For deletion tasks, the Git diff contains only a results row while material evidence is excluded from dispatch, so the standard reviewer package cannot verify the external mutation. The requested Opus/Sonnet/Fable routing is also not executable in the current Codex worker pool.  
    **Fix:** Establish explicit isolated worktrees for both repositories, use available worker models, and add two review checkpoints per task. Reviewers must receive the result diff plus read-only access to narrowly scoped evidence and independently rerun post-checks.

14. **Severity: MAJOR**  
    **Where:** [selftest.sh:2](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/selftest/selftest.sh:2), [selftest.sh:21](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/selftest/selftest.sh:21), [selftest.sh:38](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/selftest/selftest.sh:38)  
    **Evidence (VERIFIED):** The advertised “every gate check” proof lacks cases for scope-content drift, FK delete-action mismatch, a changed allowlisted trigger writing outside the snapshot, missing post-only/non-FK residue, and commit-marker ambiguity. File tests omit partial moves. The SQL matcher also accepts its expected diagnostic from any log in the current case rather than tying it to the just-run phase.  
    **Fix:** Add deterministic planted cases for every failure above and match only the current invocation’s newly created log/output.

15. **Severity: MAJOR**  
    **Where:** [plan:806](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:806), [plan:1054](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data.md:1054)  
    **Evidence (VERIFIED):** Task 9 treats the initial cleanliness check as permanent authority for a later `git checkout --`. A concurrent edit after Step 1 would be silently overwritten, changing a real file despite D4.  
    **Fix:** Use an isolated worktree. Before any rollback, recheck the blob/OID and working-tree state; if it differs from the exact expected intermediate version, stop instead of checking out.

16. **Severity: MINOR**  
    **Where:** [gate.sql:166](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate.sql:166), [gate.sql:201](/home/evan/EVOsystem/portfolio_site/docs/superpowers/plans/2026-09-14-showcase-demo-data/gate.sql:201), [spec:114](/home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-09-14-showcase-demo-data-design.md:114)  
    **Evidence (VERIFIED):** Survivor hashing uses MD5 over newline-delimited composite `x::text` sorted by the full row, rather than the reviewed `row_to_json` ordered by primary key. Scope IDs also use MD5. This weakens canonicality and retains collision/delimiter ambiguity.  
    **Fix:** Hash length-prefixed canonical JSON ordered by actual primary key with SHA-256, or preserve and compare the canonical JSON directly.

Task 9’s prescribed old strings and E6/E10 boundaries were separately verified to exist verbatim exactly once; there is no anchor-count finding.

**TALLY: 6 BLOCKER, 9 MAJOR, 1 MINOR.**