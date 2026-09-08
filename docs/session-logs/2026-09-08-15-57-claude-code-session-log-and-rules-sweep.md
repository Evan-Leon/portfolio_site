---
date: 2026-09-08
agent: claude-code
type: docs
mode: attended
phases: []
repos: [portfolio_site, infra]
---

## Accomplished
Ran two sweeps back to back, both complete.

**Session-log sweep (`sweeping-session-logs`) — done.** First-ever sweep for
this repo. Rolled the 17 outstanding raw logs (2026-07-23 ×5, 2026-08-25 ×12)
up through every tier: daily digests `2026-07-23.md` + `2026-08-25.md` →
weeklies `2026-W30.md` + `2026-W35.md` → monthlies `2026-07.md` + `2026-08.md`,
archiving each consumed tier. The unattended marker at
`~/.claude/unattended-run.json` protects a journal in the **chud** repo, not
here, so all 17 were eligible; today's log (2026-09-08-12-30) was correctly left
in the root. Cascade fired in one pass (both months fully ended; W30 owned by
July, W35 by August, verified via `date -d … +%G-W%V`). Digests written this run
were archived with plain `mv` + `git add` (never committed, so `git mv` would
have failed); the tracked raw logs moved with `git mv`.

**Rules sweep (`sweeping-rules`, scoped to portfolio_site) — done.** This repo
has no local rules-index (opt-out), so its candidates are session-log tags with
no local ID → shared-tier index rows only. Collected 10 tagged + 1 untagged
candidate from the 2026-08-25 drive-in theater logs, judged each against the
promotion bar (helps another repo on the same stack today; default stay-local),
deduped against all five stack files. **8 promoted, 3 kept local, 0 retired.**
Promotions landed in infra:
- `measurement.md`: EVO-UNI-204 (a falsifier's baseline is not automatically its
  cheapest arm), 205 (a verdict on deviant instrumentation must state the
  absorbing margin where it is read), 206 (record a decision in the exact form
  its own verification grep matches).
- `universal.md`: EVO-UNI-207 (an e2e spec importing the app's own module can't
  fail; extends EVO-UNI-061), 208 (a falsification that breaks the build not the
  assertion; extends EVO-UNI-082).
- `react-frontend.md`: EVO-FE-281 (a DOM-constructor test fake must be a real
  `Node`), 282 (a breakpoint override of inline geometry needs `!important`),
  283 (a `perspective`/`translateZ` wrapper swallows child pointer events).

Kept local (marked in place across the canonical raw log and every digest copy):
adapter-`observe`-reads-written-state (tied to this repo's SDS adapter
architecture; near EVO-UNI-136), adapter-re-apply-on-`load` (this engine's
lifecycle only), and the untagged GSAP `immediateRender` gotcha (GSAP-only, no
fleet repo benefits today).

## Commits
portfolio_site:
- `dc12c0b` docs: session-log sweep through 2026-08-25
- `3cbefd1` docs(rules): rules sweep 2026-09-08 — 8 promoted, 0 retired (consumed-tag markers)

infra:
- `e6eda97` docs(rules): rules sweep 2026-09-08 — 8 promoted, 0 retired (shared-tier rows)

## Uncommitted work left behind
None. Both working trees clean after the two rules-sweep commits.

## Verification
- `sweep_candidates.py docs/session-logs` — 17 ELIGIBLE before; empty (idempotent) after the log-sweep commit.
- Tree state after log sweep: root holds only today's raw log + README; `daily/` and `weekly/` empty; `monthly/` holds the two monthlies; `archive/` holds 17 raw + 2 daily + 2 weekly. Staged set was session-log paths only.
- Rules-sweep self-check grep (unconsumed promote tags in `docs/session-logs/` + `archive/session-logs/`, both arrow forms, `— swept:` and prose filters) — empty after marking. Ran twice, clean both times.
- Max-ID scan before minting: EVO-UNI 203, EVO-FE 280, EVO-TOOL 210 (EVO-UNI minted prefix-globally across `universal.md` + `measurement.md`).
- Citations: only additions, zero retirements → no existing citation broke; the new IDs I cite (FE-281/282/283 in the swept markers) resolve to the rows just minted.
- `sync-rules-to-appdash.py` — exit 0; `synced 2071 rules, deleted 0 stale rows`; `react-frontend.md: 283` confirms +3.
- Both repos `git status` clean post-commit.

## Blockers
None.

## Open flags
- The `sweeping-session-logs` step-7 nudge grep counted 33 occurrences for ~10
  distinct candidates, because the skill mandates carrying tags up verbatim into
  daily/weekly/monthly and the archived raw logs are also in scope — one
  candidate appears in 3–4 places. `sweeping-rules` handles this by design ("the
  raw log is canonical — judge once, mark every copy consumed"), which is what I
  did, so the count is cosmetic, not a defect.
- portfolio_site's `scripts/validate_codex_setup.py` `EXPECTED_HIGH_VALUE` still
  names skills the repo never had (incl. retired phase-status) — pre-existing,
  untouched (carried from the 2026-08-25 logs).

## Rules-index candidates
None. (Repo has a deliberate rules-index opt-out.)

## Meta-prompt / skill / doc updates
- NO-CHANGE: `sweeping-session-logs` — drove the first-ever sweep here cleanly;
  the catch-up cascade, the `git mv` vs plain-`mv` trap for same-run digests, and
  the active-unattended-journal exclusion all matched reality as written.
- NO-CHANGE: `sweeping-rules` — the one-repo scope, prefix-global EVO-UNI
  minting, index-row-only path for candidates with no local ID, and the
  mark-every-copy-consumed rule all applied without ambiguity.
- NO-CHANGE: `rules-index` — Conventions (ID lifecycle, minting, table format,
  measurement.md sub-topic) were sufficient to dedupe and promote.

## Next steps
- Next session-log sweep will pick up today's logs (this one + 2026-09-08-12-30)
  once the day is past.
- Other fleet repos still hold their own outstanding promote candidates — each
  gets swept when `sweeping-rules` is run in that repo.

## Pointers
- Digests: `archive/session-logs/{daily,weekly}/`, `docs/session-logs/monthly/{2026-07,2026-08}.md`.
- Shared tier: `infra/skills/rules-index/references/{measurement,universal,react-frontend}.md`.
