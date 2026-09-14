# Showcase Demo Data — Teardown and Committed Seed Scripts

**Date:** 2026-09-14
**Status:** Rev 1, pre-Codex review
**Author:** Claude (brainstorming session started in jourNOW, landed here at Evan's direction)
**Related:**
- `infra/meta-prompts/portfolio-showcase/portfolio-showcase.md`: the teardown rule, infra `c0bee1d`.
- Evidence folder: `/home/evan/showcase-pending/_teardown-evidence/` (mode 700, never committed).

## Problem

The 2026-09-05/06 portfolio-showcase sweep seeded demo data into apps' real local databases so it could film them. Its orchestrator ruled that the demo data "may persist". Two of those apps have already been cleaned up by hand:
- graces-tree, 2026-09-13;
- jourNOW, 2026-09-14: 20 fake entries sitting beside Evan's real journal.

Seven apps still hold demo data. Almost every seed script lived in `/tmp` and is gone. So these clips can't be re-recorded, and every cleanup has to be rediscovered by hand. For several of these apps (jourNOW, graces-tree, LeonsBudget) the local database is the app's **real, live data**.

## Goals

1. Remove every leftover demo record from the seven apps, and never touch real data.
2. Give each of the 8 apps whose showcase needed seeding a committed script with `seed | teardown | status`, plus a fictional fixture. Re-recording then becomes one command, and cleanup is tested once.
3. Change the showcase meta-prompt so future runs use or create that script.

**Not goals:** re-recording any clip, changing any published portfolio page, and fixing any app bug the showcase logs flagged.

## Decisions (Evan, 2026-09-14)

- **Script scope.** Only the 8 apps whose showcase needed seeded data get a script: LeonsBudget, the-classic, chudios, co-host, mind-palace, co-author, graces-tree, jourNOW. Future showcase runs that seed commit one.
- **Where demo data lives.** Seed into the app's normal local database under a demo account or id prefix, record, then tear down. No separate demo databases.
- **Delete authority.** Approving the final plan authorizes the scoped, checked deletes listed below. It authorizes nothing else.
- **STOP-AND-ASK RULE, which overrides the authority above.** If the executing agent is unsure **at all** about any row, file, node or relationship, it stops, reports what it found, and asks Evan. It deletes nothing until he answers. Any of the following means unsure:
  - a count that differs from the manifest below or from the fresh export;
  - a demo-scoped row that references, or is referenced by, anything outside the demo scope (a foreign key, a join row, a shared lookup row such as LeonsBudget's global `Institution`);
  - a row inside the demo scope whose content doesn't look like the fictional demo content (a real name, a real email, text that reads like Evan's own writing);
  - an `ON DELETE CASCADE` reaching a table the manifest doesn't name;
  - a timestamp or id outside the showcase window that can't be explained;
  - an app whose local database turns out to be something other than what this spec says;
  - any check that fails, any command that errors, or any "probably fine".

  Guessing, widening a selector, or "cleaning up what looks like demo data" is never allowed. When the agent stops, no teardown runs for that app, and the other apps' tasks carry on only if they're fully independent.

## Approach

**A committed script per app (chosen).** Each of the 8 app repos gets `scripts/showcase_demo.<ext>`, in the language and channel native to the app, with a committed fixture beside it. Rejected alternatives:
- **One central tool in portfolio_site that knows every schema:** it rots silently, and puts app knowledge in the wrong repo.
- **Raw dump fixtures with a generic loader:** they bypass app code, break on migrations, and can't express Neo4j nodes or volume files.

## Script contract (all 8 apps)

| Command | Behaviour |
|---|---|
| `status` | Prints each demo-scoped table/node/file set with its count. Exit `0` when no demo data exists, `3` when some exists, `1` on error. Read-only. |
| `teardown` | Deletes only the demo scope, in **one transaction** where the store has transactions. Before deleting it asserts:<br>(a) the demo scope matches the fixture's expected counts exactly;<br>(b) no row outside the scope references a row inside it;<br>(c) real-data counts (every table the app touches, outside the scope) are captured.<br>After deleting, still inside the transaction, it asserts the demo scope is empty and the real-data counts are unchanged. Any failed assertion rolls back and exits non-zero with a message saying which assertion failed. Files, and non-transactional stores (volume files, Neo4j when a transaction isn't available), are listed before and after. It deletes only exact paths or ids named by the fixture, never globs. |
| `seed` | Runs `teardown` first. That is a no-op when `status` is clean, and aborts if teardown's checks fail. Then it creates the fixture through the app's **own** code path: a signup/register route, a management command or service, or the REST API. Where the app offers no way to set a field (a backdated `created_at`), it applies a scoped `UPDATE … WHERE <demo scope>`. It ends by running `status` and comparing counts to the fixture. |

**Local-only guard (every command):** the script resolves its database, API or volume target and refuses to run unless it's the local stack:
- a Postgres host of `localhost` / `127.0.0.1` / the local docker container;
- the local Supabase container;
- `*.localhost` / `127.0.0.1` URLs.

A prod URL in a `.env.prod`, or any non-local host, exits non-zero before connecting.

**Fixture:** fictional data only. It holds the demo identifiers (account email/username, id prefix or fixed ids) and the expected count for each table. It's committed next to the script. It never holds real rows, credentials beyond the demo password the script itself sets, or any id range that could overlap real rows.

**Tests:** each script's scope and guard logic is unit-tested in the app's own test framework:
- scope selection;
- the local-only guard refusing a non-local target;
- a mismatched expected count aborting teardown;
- a row outside the scope referencing a row inside it aborting teardown.

This uses the repo's existing test DB or fixture conventions. Where an app has no test harness for its channel (Neo4j, Supabase SQL), the task adds the narrowest runnable test the repo supports and says so in its log. The live round-trip below is required on top of the tests, never instead of them.

## Per-app manifest (verified 2026-09-14 unless marked)

The executing agent **re-verifies every line before acting**. Any difference from this manifest is a stop-and-ask trigger.

| App (repo) | Local store | Demo scope still present | Fixture source | Notes |
|---|---|---|---|---|
| LeonsBudget | `infra-postgres-1` / `leons_budget` (Django) | user `demo@example.com` (auth_user id 3), household 3 "Demo Household", its 1 membership, 2 bank accounts, 4 monthly budgets (+ lines), 71 transactions; **global** `accounts_institution` id 9 "Northwind Bank" | `/home/evan/showcase-pending/budget-app/seed.py` (207 lines, Django shell) | Institution 9 has no household FK. If anything outside household 3 references it, **stop and ask**. Check categories, import batches and any other FK to the household or user. |
| the-classic | local Supabase `supabase_db_the-classic` | auth user `demo@example.com` (`921fafc9…`), course `d0000000-…-000000000001`, tournament `dddddddd-dddd-dddd-dddd-dddddddddddd`, 3 foursomes, 12 players, 36 scores, 6 accolades, 5 chirps (per the 2026-09-06 log; only the user and tournament were re-verified) | **Lost** (`seed-demo.sql` was in `/tmp`). Export the current demo rows first | The dev DB is test cruft plus real accounts. Chirps and accolades generated live during the take are in scope only if they're under the `d`-prefixed tournament. |
| chudios | `infra-postgres-1` / `chudios` + volume `chudios-recordings` | 6 `content_items` with ids `dddddddd-%` (the log says child tables cascade) + `/data/recordings/demo-sn-ep{09,11,12}.m4a` | **Lost**. Export first | The log's teardown is `DELETE … LIKE 'dddddddd-%'` plus `rm`. Enumerate every cascade target and each file's size before relying on it. |
| co-host | `infra-postgres-1` / `co_host` | channel `ch_b11b31a0d9ae` "The Long Fuse", 2 episodes (incl. `ep_a78a3f018922`) + their versioned child rows (bibles, beat sheets, scripts, table reads, reviews, timeline, `chud_jobs`) | **Lost** (it seeded via REST). Export first | The two real channels must be untouched. A `chud_jobs` row created by `POST /freeze` is in scope only if it references a demo episode. |
| mind-palace | `mind-palace-neo4j-1` (Neo4j) | `Route` `60c383d5-921e-443c-9430-b2242469fbe0` "Collective Security", 4 relationships (4 steps + an elaboration note per the log) | **Lost** (it seeded via API). Export the subgraph first | Evan's real `WW1` route must be untouched. Every node reachable from the demo route that is also reachable from a non-demo node is a stop-and-ask trigger, and so is any node the route links to that the route didn't create. |
| co-author | `infra-postgres-1` / `co_author` (Django) | auth_user id 2 `demo@example.com`, story id 7 "The Lighthouse at Kestrel Point" + its elements (5 characters, 4 settings, 6 events, 3 relationships, 4 open questions, 5 beats, 3 drafts per the Coverage note) + auth tokens | `/home/evan/showcase-pending/co-author/seed.py` (517 lines, REST) | Evan's account and his two stories must be untouched. |
| graces-tree | `infra-postgres-1` / `graces_tree_db` (Django) | **None**, deleted 2026-09-13 | The demo subset of `_teardown-evidence/graces-tree-pre-cleanup-backup-2026-09-13.json`: persons 91–107, couples 36–42, parent-child 94–111, 11 interview questions on person 97, auth user `demo-arborist` | The backup also holds the **real family**. The fixture takes only the listed pks, and the task proves no other pk made it in. The seed must give demo rows ids above the real family's maximum at seed time, never fixed low ids. |
| jourNOW | `infra-postgres-1` / `journow_db` (FastAPI) | **None**, deleted 2026-09-14 | `_teardown-evidence/journow-demo-entries-2026-09-14.csv` (20 rows) + `journow-demo-user-2026-09-14.csv` | Register via `POST /api/v1/auth/register`, create entries through the API, then backdate `created_at` by a scoped `UPDATE`. No audio and no R2. Evan's 32 entries must be untouched. |
| chud (no script) | `infra-postgres-1` / `chud` | conversation 7206 + 8 messages | n/a | The intentional demo Q&A left by the showcase run. **Delete only, guarded.** First confirm its messages are the chunk-norris Q&A the log describes and that nothing else references the conversation. |
| app-dash (no action) | `app_dash` | one "Description updated" activity-log row | n/a | The log is append-only by design. Left in place and recorded. |

## Per-app task flow

Each app is one task. Repos and stores are independent, so a stop on one app doesn't block the others.

1. **Pre-flight.**
   - The repo's `git status` is clean.
   - The store is reachable.
   - Re-verify the manifest line.
   - Record baseline counts of every table/label the app owns, split into demo scope and everything else.
2. **Export** the current demo scope (rows, nodes, files) to `_teardown-evidence/<app>-demo-export-2026-09-14.*`. Skip this for graces-tree and jourNOW.
3. **Build the fixture** from the surviving seed or the export.
   - Strip anything that isn't demo content.
   - Look at the fixture's text. Anything that reads as real is a stop-and-ask trigger.
4. **Write** `scripts/showcase_demo.<ext>`, the fixture, and tests, following the repo's rules index and conventions.
5. **Teardown the leftovers** with the script, where step 2 exported something. `status` must then exit 0, and real-data counts must equal the baseline.
6. **Round-trip:** `seed` → `status` exits 3 with counts equal to the fixture → `teardown` → `status` exits 0 → real counts equal the baseline.
7. **Verify:** the full app test suite and lint (the repo's own commands). Pre-existing failures are recorded, not fixed.
8. **Commit** in the app repo (`feat(showcase): committed demo seed/teardown script`), plus a session log in that repo per its `writing-session-logs` skill.

**chud** runs steps 1, 2 and a guarded delete. It needs the same in-transaction count assertions (conversation exists with exactly 8 messages, no other referencing rows), then a baseline re-check. It gets no script, no commit, and no session log in chud; the portfolio_site session log records it.

## Meta-prompt change (infra)

`portfolio-showcase.md` changes as follows:
- **STEP 1:** the seed script lives in the app repo as `scripts/showcase_demo.<ext>` with the contract above. A run uses the existing script, or creates and commits one (commit in the app repo, the one allowed app-repo write besides `docker compose up -d`). This replaces "lives in the scratch dir, never in the app repo".
- **STEP 3 teardown gate:** `showcase_demo teardown` then `status` exits 0, plus the real-data baseline.
- **The stop-and-ask rule is copied into STEP 1's data check verbatim.**
- **Coverage:** the leftover-data list is struck, and each of the 8 rows notes its script path.
- **Changelog:** a receipt row.

## Verification (whole effort)

- For each of the 8 apps: `status` exits 0, the round-trip evidence is in the app's session log, and tests and lint pass (or pre-existing failures are recorded).
- chud: conversation 7206 is gone and baseline counts are unchanged.
- The showcase meta-prompt has no remaining "left in the dev DB by design" / "never in the app repo" instruction.
- The portfolio_site session log lists every app's outcome: `done` / `stopped — asked Evan: <question>`.

## Risks

- **A wrong teardown deletes real data.** Mitigations:
  - the scope is by exact ids or prefixes from the fixture;
  - in-transaction assertions;
  - an export before any delete;
  - the stop-and-ask rule;
  - no deletes outside the manifest.
- **An export or fixture captures real data.** Mitigations: fixtures are built only from demo-scoped rows, the text is inspected, and graces-tree's is limited to listed pks.
- **A script pointed at prod.** Mitigation: the local-only guard, tested.
- **Non-transactional stores** (Neo4j, volume files). Mitigation: exact ids and paths, with listings before and after. If atomicity can't be established, stop and ask.

## Open questions

None blocking. Anything the executing agent discovers that this spec didn't anticipate falls under the stop-and-ask rule.
