---
date: 2026-09-09
agent: claude-code
type: feature
mode: attended
phases: []
repos: [portfolio_site]
---

## Accomplished

**Done.** Refreshing the theater returns to the beginning of the drive instead
of to wherever the visitor was. `theater/src/main.ts` sets
`history.scrollRestoration = "manual"` and scrolls to the top before the engine
is constructed — two statements rather than one, because the browser may already
have restored the position by the time a deferred module runs, so stopping
future restores does not by itself undo the one that already happened.

**Done.** The reset is deliberately session-scoped rather than load-scoped, so
the back button starts the drive over as well. Evan chose this over branching on
`performance.getEntriesByType("navigation")[0].type === "reload"`: arriving
mid-drive is the same disorientation however the visitor got there, and the
narrower version costs a branch and a second thing for the suite to pin.

**Done.** A fragment overrides the reset. `#exit` is where the page's skip link
points, and a reset that ignored the fragment would have broken the keyboard
escape hatch in the worst way — the link still present, still focusable, and
going nowhere.

**Done.** `theater/e2e/reload.spec.ts`, three cases: reload mid-drive, back-
navigation, and `#exit`. The first two assert `scrollY === 0` *and* the chrome
readout at `0%`, because `scrollY === 0` alone also passes on a build whose
frame loop died during `start()`.

## Commits

portfolio_site:

- `c63b11f` feat(theater): every load starts the drive at the beginning

## Uncommitted work left behind

None.

## Verification

Run from `theater/` unless noted:

- `npx tsc --noEmit -p tsconfig.json` — pass
- `npx vitest run` — pass, 429 tests / 24 files
- `npx eslint src e2e` — pass, no output
- `npx playwright test` — pass, 61/61 (the three new cases plus the 58 that
  already existed; nothing in the suite turned out to depend on a restored
  scroll position)
- `./node_modules/.bin/prettier --check` on both changed files, from the repo
  root — pass
- `docker compose build && docker compose up -d --force-recreate` — pass
- Served-bytes check: `/theater/` 200 after polling, and the served bundle
  (`/theater/assets/index-DsVYN1BB.js`) contains `scrollRestoration` — the edit
  is in the image, not only in the tree
- Throwaway probe, since deleted: a temporary spec drove to screen 4, navigated
  to `about:blank`, went back, and read `scrollY` — 4423 before, 0 after. This
  is what the back-navigation case in `reload.spec.ts` was written from.

## Blockers

None.

## Open flags

- **The bfcache path is untested, not proven.** The back-navigation case
  navigates away and back for real; a back-forward-cache restore is a different
  code path, where the page is resurrected without re-running any script.
  Chrome is documented to honour a `manual` restoration mode on traversal, but
  the probe above almost certainly disqualified bfcache (`about:blank`), so this
  session has no evidence either way. If a visitor ever reports coming back
  mid-drive, that is the first place to look.
- **`theater/skills/rules-index/` exists and is not routed to from anywhere a
  session reads at startup.** Its own description says "Load first at every
  session start", but neither the root `CLAUDE.md` nor the skill listing puts it
  in front of a session — and the immediately preceding session log
  (`2026-09-09-17-40-…`) records "None. (No rules-index in this repo.)", which is
  a session having looked and concluded wrongly. Not retro-edited here: item 9
  of the fold-back lifecycle covers clearing an open *disposition*, not
  correcting a committed log's prose. Carried as a candidate below instead.
- **`docs/wireframes/theater.html` is still stale**, and `global.css` still
  calls it "the approved composition". Unchanged from the previous session's
  flag; this session did not touch either.

## Rules-index candidates

None. `theater/skills/rules-index/SKILL.md` admits a rule only when a mistake
was made that the existing rules would not have prevented, and records what the
failure looked like. Nothing failed here — `SDS-005` and `SDS-009` between them
already decide where this code goes and why the Wix entry does not get it, and
a fourth rule restating "the page entry owns page-level browser state" would be
a preference with no failure story behind it.

## Meta-prompt / skill / doc updates

- NO-CHANGE: `superpowers:brainstorming` — bounded path: classified out loud,
  one clarifying question that actually changed the design (session-scoped vs
  reload-only), short in-chat design, approval before code. Served as written.
- NO-CHANGE: `rebuild-restart` — `--force-recreate` and the poll-until-200
  window behaved as documented, and the "prove the rebuild path" section is what
  prompted grepping the served bundle rather than trusting the build log.
  Served as written.
- NO-CHANGE: `writing-session-logs` — template and triage vocabulary applied
  without ambiguity. Served as written.
- PENDING (decided-by: human): defer — route `theater/skills/rules-index` from
  the root `CLAUDE.md` so a session meets the project's law before it starts
  editing, as that skill's own description asks. Deferred rather than applied:
  `CLAUDE.md` is the instruction file every session in this repo loads, so a new
  standing directive in it is a behaviour change with repo-wide blast radius,
  not the mechanical correction APPLY-AT-ORIGIN is for. Next action: Evan rules
  on whether the pointer goes in, and whether it reads as "load first" or as
  "cite by ID when load-bearing".

## Next steps

1. Rule on the `CLAUDE.md` → rules-index pointer above.
2. Still outstanding from 2026-09-09-17-40 and untouched here: trees 2 and 3 in
   the kept `/tmp/art-run-trees-realistic/` workspace, and the decision about
   `docs/wireframes/theater.html`.

## Pointers

- The change: `theater/src/main.ts`, immediately after `installPeriod`.
- Its evidence: `theater/e2e/reload.spec.ts`.
- Why it is not in the engine: `SDS-005` and `SDS-009` in
  `theater/skills/rules-index/SKILL.md`.
