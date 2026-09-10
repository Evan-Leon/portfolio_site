---
date: 2026-09-09
agent: claude-code
type: feature
mode: attended
phases: []
repos: [portfolio_site]
---

## Accomplished

Done — every drive-in screen's marquee is now the two-tier readerboard from
Evan's reference photo (a Dallas theater marquee at night): a dark frame
carrying a lit crest with the project title over a white readerboard of black
push-in letters, a gold trim line between them, a row of amber incandescent
bulbs along the bottom lip, standing on two legs. It replaces the single amber
plate that held only the project name.

The amber inverted in the process. `--sds-marquee` used to be the panel colour
with dark ink on it; the bulbs and the crest glow carry it now, and the board is
white with black letters — which is what a readerboard actually is. New tokens:
`--sds-board*`, `--sds-crest*`, `--sds-bulb*`, `--sds-marquee-frame`. Unlit, the
board goes grey rather than black, for the same reason `--sds-unlit-floor`
exists — a black rectangle under a dark screen reads as a hole in the lot.

The second line is each project page's own `<meta name="description">`, copied
into `projects.ts` as a new `blurb` field rather than written fresh, so the lot
and the page say the same thing about a project. No new copy was authored and no
image asset was generated.

Not done, and deliberately: the reference outlines each glyph of "DALLAS" in its
own bulbs. That is not reachable in CSS without turning the title into an image,
and an image cannot be twenty different project names — the crest is lit letters
with a warm glow instead. The neon accent strips at the reference's right edge
were left out of scope. Both were surfaced to Evan and accepted.

Codex `gpt-6-astra` was offered in the ask and deliberately not used: the crest,
board, rails and bulb row all have to be live text and live colour interpolating
on `--sds-screen-lit` across twenty screens, which a baked PNG cannot do.

## Commits

portfolio_site:

- `5f360da` feat(theater): marquees become drive-in readerboards

## Uncommitted work left behind

None. `theater/dist/` is rebuilt but gitignored (`.gitignore:32`).

## Verification

All run from the repo root or `theater/`, all passing:

- `pnpm exec tsc --noEmit` (theater) — pass, no errors
- `pnpm exec vitest run` — 423 tests / 24 files pass
- `pnpm exec playwright test` — 57 e2e pass, including
  `click-through.spec.ts` and `scenery.spec.ts`'s wagon-occlusion specs at both
  1440x900 and 390x720, which are the ones the taller screen base could have
  broken
- Ad-hoc Playwright probe (throwaway spec, written and deleted): read
  `scrollWidth - clientWidth` on every crest and `scrollHeight - clientHeight`
  on every board, all 20 signs, at 1440x900 and 390x844. First run found the
  91-char blurb overflowing the narrow board by 1px; after the narrow sign grew
  82px → 92px, zero overflow at either width.
- `pnpm format` — reformatted `projects.ts` blurb lines; `pnpm theater:lint`
  (eslint) — clean
- `docker compose build && docker compose up -d --force-recreate` — built and
  recreated; `curl` 200 on `/`, `/theater/`, `/assets/css/styles.css`; the
  served `/theater/assets/index-BoV7i6D7.css` contains the `sds-screen__board`
  / `sds-screen__crest` rules, proving the rebuild took rather than the old
  image still serving
- `.githooks/pre-commit` prettier check — ran and passed on commit
- `fold_back_audit.py docs/session-logs/` at session start — `pending=0
  needs_decision=0`, nothing to clear

## Blockers

None.

## Open flags

- `BLURB_MAX = 95` in `projects.test.ts` is measured against the board's current
  width and type scale. Changing `.sds-screen__board`'s `font-size`,
  `letter-spacing` or the sign's width silently invalidates the number, and the
  test will keep passing at the old bound while real blurbs start overflowing.
  The overflow probe that would catch it was throwaway, not a committed spec —
  see Next steps.
- The narrow board clears three lines by a few pixels, not comfortably. The
  longest blurb today (`chunk-norris`, 91) is what set the margin; a future
  blurb at exactly 95 is untested at 390px.
- Crest glyphs are not bulb-outlined and the reference's neon edge strips are
  absent. Recorded as accepted scope, not debt to fix silently.

## Rules-index candidates

- `SDS-011` (draft): Text that must fit a fixed box is verified by measuring
  `scrollWidth`/`scrollHeight` against the clip box, never by looking at a
  screenshot. Failure story, this session: the phone-width capture of the
  longest blurb looked correct and was shipped-ready by eye; the measurement
  showed the board overflowing by 1px, on one screen out of twenty, at one
  viewport. An overflow of a few pixels is invisible in a screenshot and
  invisible in a passing test suite, and it only ever shows on the one project
  whose copy is longest.
  promote → universal

## Meta-prompt / skill / doc updates

- NO-CHANGE: `superpowers:brainstorming` — the three-path classification was
  exercised on a real judgement call (the marquee component already existed, so
  "bounded" rather than "architectural"); the bounded path's short in-chat
  design plus hard approval gate served as written.
- NO-CHANGE: `rebuild-restart` (project skill) — `--force-recreate` and the
  served-file verification step both did what the skill says they do; the
  hashed CSS filename check confirmed the new image was being served.
- NO-CHANGE: `writing-session-logs` / `theater-rules-index` — the rules-index
  bar ("a rule with no failure story behind it is a preference") did real work
  this session: it filtered out a CSS gotcha I knew but never actually tripped
  over, and kept the one candidate that had a failure behind it.
- NO-CHANGE: `CLAUDE.md` § Before committing — `pnpm format` before commit made
  the pre-commit hook the formality it describes.

## Next steps

- Consider promoting the throwaway overflow probe into a committed e2e spec, so
  the `BLURB_MAX` bound and the board's type scale can't drift apart unnoticed.
  Held back this session because it adds a 20-screen × 2-viewport measurement to
  every e2e run for a failure mode that has occurred once.
- Optional, if Evan wants closer fidelity to the reference: neon accent strips on
  the sign's outer edge (a CSS gradient, no asset), or a Codex-generated bulb
  frame around the crest that keeps the title live text.

## Pointers

- Reference photo: `/mnt/c/Users/evan/Pictures/pics/maruee.jpg` (Evan's, outside
  the repo)
- Sign markup: `theater/src/lot/build-lot.ts` `buildScreen()`; styling:
  `theater/src/styles/global.css` `.sds-screen__marquee` / `__crest` / `__board`
- Registry and its guards: `theater/src/projects.ts`, `theater/src/projects.test.ts`
- No handoff written.
