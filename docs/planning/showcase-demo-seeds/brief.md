# Brief: committed demo seeds for re-filming showcase apps

**Status:** brief, 2026-10-03. This is input to a spec or roadmap, not a plan to execute. It is multi-repo work, so it takes the roadmap route: run `infra/meta-prompts/roadmap/roadmap-meta-prompt.md` Part 1 from Step 1 when it is scheduled.

**Evidence:** `survey-2026-10-03.md`, in this folder. It is a read-only survey of every showcase app's data store, migrations, DB switch, auth, sensitivity and reusable seed code. Its file:line citations came from sub-agents and were not all spot-checked.

## Goal

Any portfolio app can be re-filmed at any time with realistic **fake** data, without touching or exposing the real data. Apps with sensitive personal data come first: graces-tree, LeonsBudget, jourNOW, co-author and co-host.

## Why

- **The rule exists, but nothing implements it.** `infra/meta-prompts/portfolio-showcase/portfolio-showcase.md` (lines 96–107) already says demo data never lives in the real database. A run builds a throwaway store from the app's own migrations, seeds it with the app's committed `scripts/showcase_demo.*`, films, and then drops it. Yet **no app has a `scripts/showcase_demo.*`**. Every re-film would have to write its seed from scratch, mid-run.
- **The last sweep shows what that costs.** The 2026-09-05/06 sweep filmed all 16 apps against their real dev databases. It left demo rows next to real data in nine apps, and removing them needed a fail-closed gate (`archive/superpowers/plans/2026-09-14-showcase-demo-data/`).
- **A committed seed script beats a kept mock database.** It runs through the app's current migrations every time, so it never drifts from the schema. It lives in git, where it can be reviewed and checked to be fictional. And there is no second database to secure.

## Proposed approach

1. **One seed contract for every app**, so the meta-prompt can drive any of them the same way:
   - `scripts/showcase_demo.py`, with the subcommands `seed`, `reset` and `check`.
   - Django apps use `django.setup()`; FastAPI and asyncpg apps run as standalone asyncio scripts. Whether to use Python everywhere is an open question (Q3).
   - It **refuses to run** unless the target database name ends in `_showcase`, or the Neo4j URI names the showcase container. It parses `DATABASE_URL`, `DB_NAME`, `POSTGRES_URL` or `NEO4J_URI`. This is the same pinning `gate-run.sh` and chud's `gate_safety.py` already use.
   - Rerunning it is safe: it is idempotent, with recognisable ID and email prefixes such as `demo-`.
   - The fixtures are hand-written and fictional, with no real names. graces-tree `seeds/people.py` and Prompt-heus `docs/*-output.json` hold real content and must not be reused as-is.
   - No external side effects: no Celery or Temporal enqueue, no CHUD or LLM calls, and no media in R2. It inserts final-state rows directly rather than going through APIs that start jobs.
   - It creates the demo login user where the app needs auth.
   - A test runs the seed against the app's `_test` database, so the seed breaks loudly when the schema moves.
2. **A shared infra helper**, `showcase-store.sh <app> up|down`:
   - `up`: as `postgres`, `CREATE DATABASE <app>_showcase` on `infra-postgres-1`; run the app's own migrate through `docker compose run --rm --no-deps -e …`; run the seed; and start the app against it with an uncommitted compose override.
   - `down`: return the app to its normal config; read back one known real record; `DROP DATABASE … WITH (FORCE)`; and prove the throwaway store is gone.
   - It reuses `gate-run.sh`'s container and project pinning. This covers 12 of the 16 apps with one mechanism.
3. **A meta-prompt update.** portfolio-showcase STEP 1 and STEP 3 call the helper and the seed instead of writing a seed per run. The allowed-writes line is widened if a seed may live outside `scripts/` (Q2). Like any fleet-wide meta-prompt edit, this one goes through a fresh-session gate and a Codex review.

## Priority and order (from the survey)

| Pri | App | Size | Notes |
|---|---|---|---|
| P1 | LeonsBudget | S | Your real finances. `manage.py seed_demo` already exists (654 lines; demo/demo1234), so this is a thin wrapper plus a check that its data is fictional. Its single `DATABASE_URL` is set in compose `environment:`. |
| P1 | jourNOW | S | A personal voice journal, very high sensitivity. One `DATABASE_URL` (asyncpg); Alembic is not run automatically. `register_user` creates the login. Seed no audio. |
| P1 | graces-tree | M | The family tree. **Migrations run automatically at container start**, so use `run --rm --no-deps -e` or you migrate the real database. The arborist login is a Django superuser. Photos live in R2, so seed none. |
| P1 | co-author | M | Your private story planning. Migrations are automatic. A head start from the 09-06 run is at `/home/evan/showcase-pending/co-author/seed.py`. Note that chudios calls co-author live. |
| P1 | co-host | M | Your real channels. Note that CHUD mirrors co-host documents into the **real** CHUD database if CHUD is driven during filming. |
| P1 | chudios | M–L | `DB_*` variables, plus a throwaway `RECORDINGS_DIR`. Every AI stage calls CHUD, so insert final-state rows directly. |
| P1 | voice-trainer | M | The backend **and** worker must switch together; the shared Temporal queue means a second instance's workflows go to the live worker. |
| P1 | chud | L | Hardest: three database consumers (compose backend, host systemd worker, `chud_ro`), schema created at init, Temporal, and the 27B model. Do it last, and possibly keep it hybrid (Q5). |
| P2 | app-dash, logson, mind-palace, the-classic, NomNoms | S–L | Lower sensitivity. logson takes live fleet telemetry, so it needs a second instance rather than a repoint. mind-palace needs a second Neo4j container, because Community edition has no multi-database. the-classic needs a second Supabase project, and its URL is baked into the frontend at build time. |
| P3 | Prompt-heus, chunk-norris, el-blackjack-pwa, the remote four | S / none | Prompt-heus is the dependency root, so seed it first if a dependent app is filmed on throwaway data. chunk-norris also writes to shared Qdrant (use unique `Showcase__*` collections). el-blackjack only needs a fresh browser context. |

Suggested build order: helper and contract → LeonsBudget → jourNOW → graces-tree → co-author → co-host → chudios → voice-trainer → P2 as needed → chud last.

## Out of scope

- Re-filming anything. This builds the means, not the clips.
- Changing what the portfolio site shows.
- Redacting panels that show live data from other sources. app-dash reads the real repo tree, and chud's session-log context and app-health panels show the real fleet. A throwaway database does not make those frames safe, so STEP 1's data check still applies to them.

## Risks

- **Cross-app bleed.** Repointing Prompt-heus, app-dash, logson or chud changes what other live apps show. The fix is second instances on other ports, or seeding matching IDs.
- **Auto-migrating apps.** For graces-tree, co-author, chudios, co-host, chunk-norris, logson and chud, `docker compose up` on the normal URL migrates the **real** database. The helper must never take that path.
- **Write paths with external effects**, if a seed goes through APIs: a co-host freeze starts a CHUD job; chudios content goes to CHUD; voice-trainer ingest and auditions go to Temporal; chud chat goes to the 27B model, which has the BSOD history.
- **Seed drift.** The `_test`-database seed test is the guard.
- **Found in passing, unrelated to this brief:** jourNOW tracks `.env.dev` and `.env.copy` in git. Check whether they hold real secrets.

## Open questions for Evan

1. Scope and timing: should every P1 app get a seed now, or only those you plan to re-film soon? Is a re-film scheduled?
2. LeonsBudget's existing `seed_demo` is a management command in product code. Should it count as the showcase seed through a thin `scripts/showcase_demo.*` wrapper, or be forked so dev edits can't change the demo? And should the meta-prompt's "only `scripts/showcase_demo.*`" write rule be widened?
3. Python for every app, or each app's own idiom? And hand-written fixtures, or Faker with a fixed seed? Faker is only present in co-author, NomNoms and LeonsBudget.
4. Is the extra infrastructure (a second Supabase project, a second Neo4j container, a second logson instance) worth it for low-sensitivity apps? Or should they keep the existing "seed into the real store, then remove it with the gate" path?
5. Should chud and app-dash stay hybrid, with a throwaway database where possible and redaction for panels fed from live data?
6. Should `gate-run.sh` be retired once the seeds exist, or kept as the fallback for approved seeding into a real database?
