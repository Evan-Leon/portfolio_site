---
date: 2026-09-09
agent: claude-code
type: debugging
mode: attended
phases: []
repos: [portfolio_site]
---

## Accomplished

**Done — `theater/public/art/car.png` transparency restored, production unblocked.**
`f7a6603` had committed the regenerated wagon exactly as the image tool returned it:
1672×941, 1.4 MB, **0 % transparent**, all four corners opaque, painted onto a flat slate
backdrop `rgb(76,105,113)`. The theater composites the sprite over a night sky at eight
times of day, so what shipped was a grey rectangle. The replacement is 1600×900,
284.2 KB, 37.7 % transparent, corners 0, bottom gap 0, dead centre — structural PASS on
`docs/spikes/art-check.html` and visually clean on all six theater palettes plus the white
and black extremes.

**Done — the treatment is now in the repo instead of a session scratch directory.** DT14's
`fit.mjs` / `measure.mjs` / `check.mjs` were never committed (recorded at the time as
"stay in the session scratch directory"), which is why a regenerated sprite could be
committed raw with nothing to re-run. All three are recovered into `scripts/art/`, joined
by two new scripts, a README, and a `treating-art-sprites` skill with its Codex wrapper.
`check.mjs` no longer hardcodes DT14's absolute scratch paths.

**Done — `key.mjs`, the step DT14 never had.** DT14's sprites arrived with real alpha, so
nothing existed to remove a backdrop; `fit.mjs` deliberately refuses such a source (exit 3)
so a *photographic* background can never be quietly keyed out. `key.mjs` is the narrow,
explicit exception and keeps that guard intact:

- **Flood-fills from the border, never a global colour key.** A global key also deletes
  matching pixels inside the subject; a fill only reaches what is connected to the outside,
  so tinted glass and bumper shading are structurally safe.
- **Refuses (exit 3) unless ≥ 98 % of the border ring is within tolerance of one colour** —
  it is a studio-backdrop cutter, not a background remover. Verified against a synthetic
  gradient: refused at 7.4 % flat.
- **Feathers and despills the edge** (`observed = a·F + (1−a)·B`, solved for F), so no slate
  rim survives against the night palette.
- **Opens enclosed pockets by connected component, not by colour.** On the wagon that split
  cleanly and by a wide margin: opened 3 components / 6688 px (the roof-rack slot at 6094 px
  and its two leg gaps at 300 and 294 px — genuinely see-through), kept 348 components /
  1576 px (largest 79 px — 1 px shading slivers along the chrome bumper, genuinely subject).
- **Floors alpha**, which closes DT14's own open flag (below).

**Done — `treat.mjs` makes the pipeline atomic.** key → fit → measure, writing the
destination only when all three pass, so a half-treated sprite can never be left on disk
looking committable. Verified: a refused source leaves neither the destination nor the
intermediate behind.

## Commits

- portfolio_site `77cd80d` — `fix(theater): restore car.png transparency, make the treatment reusable`

## Uncommitted work left behind

None. Raw input, keyed/fitted intermediates, the magenta/night/pocket-map proofs and the
checker card screenshots stay in the session scratch directory. `scripts/art/node_modules/`
is gitignored; `scripts/art/pnpm-lock.yaml` is committed so the install is reproducible.

## Verification

Run and **passing**:

- `node check.mjs theater/public/art/*.png` — the real DT11 checker page driven headlessly:
  all four sprites PASS, exit 0. Card screenshots inspected by eye across white, black and
  the six theater palettes — no backdrop, no halo, roof-rack slot see-through, chrome and
  tyres intact.
- `node measure.mjs` on the pre-fix file — reproduced the defect exactly: `FAIL
  ["dimensions"]`, `1672x941`, `corners [255,255,255,255]`, `transparentPct 0`, `1426.2 KB`.
- Guards, each exiting 3 with nothing written: `fit.mjs` on an alpha-less source; `key.mjs`
  on a synthetic gradient; `treat.mjs` on the same gradient (no destination, no intermediate).
- `key.mjs` on an already-keyed sprite (`tree-1.png`) — copied through unchanged, so the
  pipeline is idempotent.
- `pnpm format:check` — clean (`.mjs` is outside Prettier's `{html,css,js,ts}` glob by
  existing design; nothing regressed).
- `pnpm theater:typecheck` — clean. `pnpm theater:test` — 402 tests, 24 files, all pass.
- `python3 scripts/validate_codex_setup.py` — PASSED, 3 wrappers. It **caught a real
  defect**: the first `treating-art-sprites` Codex wrapper was 866 B against a 814 B ceiling
  (25 % of canonical), i.e. drifting from pointer toward duplicate. Trimmed, re-run passes.
- `docker compose build && docker compose up -d --force-recreate`, then `curl` of
  `/theater/art/car.png` → 200. The served bytes are **byte-identical** to the committed
  source (`cmp`) and PASS the checker page on their own.
- `fold_back_audit.py docs/session-logs/` at session start — `pending=0 needs_decision=0`,
  nothing stale to clear.

**Skipped:** `pnpm theater:e2e` — no theater source changed; the sprite is an asset the
existing DT16 specs already cover, and they run against the same declared art URLs.

## Blockers

None.

## Open flags

- **DT14's "anchor after quantising" flag is resolved, but by a different route than it
  proposed.** It recorded that `fit.mjs`'s palette quantisation dropped a faint sub-1 %
  alpha fringe under the car, leaving the subject 31 px above the canvas bottom (tolerance
  45), and suggested reordering `fit.mjs`. `key.mjs`'s alpha floor fixes it upstream
  instead — the bbox `fit.mjs` measures is now the bbox that survives quantisation — and the
  new car lands at bottom gap **0**. `fit.mjs` is unchanged, so the flag's own suggestion is
  still untaken and would still be the fix for a sprite that arrives already keyed with a
  faint fringe. Not retro-edited into the DT14 log: it sits under that log's `Open flags`,
  not in its disposition record, so the item-9 carve-out does not reach it.
- **The wagon reads ~7 % larger in the lot.** It now fills the full 900 px height
  (bbox 1264×900, bottom gap 0) where DT14's sat 31 px up at 1174×835. Same contract, and
  the new framing is the more correct one, but it is a visible change nobody asked for.
  Worth a look on real hardware before it is taken as final.
- **`--pockets 200` is a judgement call baked into a default.** It is correct for this wagon
  by a 300-vs-79 px margin, but a sprite with a genuinely small hole (a gap in a wing mirror,
  a window vent) would have it filled silently-ish — `key.mjs` prints the kept tally every
  run, so the evidence is there, but only if someone reads it.
- **`scripts/art/` is outside the pnpm workspace on purpose** (`sharp` is a native binary and
  formatting the static site must not require building it). That means `pnpm install` at the
  root does *not* provide it and a stale `scripts/art/node_modules` will never be noticed by
  CI. Documented in AGENTS.md and the README; still a footgun.
- **Pre-existing, untouched:** `fold_back_audit.py` reports one `APPLIED_NO_COMMIT` finding
  in `2026-09-08-12-30-claude-code-drive-in-theme-roadmap.md:69` — an `APPLIED` bullet for
  memory files outside any repo, so it has no hash to cite. Not this session's to resolve.

## Rules-index candidates

- Draft, for `theater/skills/rules-index/SKILL.md` (it takes a rule only when a real mistake
  is recorded with it — this one has a failure story and a production symptom):
  **"A generated asset under `theater/public/` is never committed as the generator returned
  it. Run it through `scripts/art/` and look at the checker card first."**
  Failure it would have prevented: on 2026-09-09 `car.png` was committed raw at 1672×941,
  1.4 MB, 0 % transparent, and the theater served a grey rectangle over the night sky. No
  existing rule covers it — `SDS-006` governs how assets are *declared* through the loader,
  not what state a file is in when it lands in the tree, and the file passed every check the
  repo actually runs on a commit (Prettier does not read PNGs).
  promote → tooling

## Meta-prompt / skill / doc updates

- APPLIED: `scripts/art/` — the DT14 treatment recovered from a session scratch directory
  into the repo, plus `key.mjs`, `treat.mjs` and `README.md`; `check.mjs` de-hardcoded off
  DT14's absolute paths → `scripts/art/*` (see Commits: `77cd80d`)
- APPLIED: new `treating-art-sprites` skill and its thin Codex wrapper, so a future session
  finds the treatment before it commits a raw sprite rather than after →
  `.claude/skills/treating-art-sprites/SKILL.md`, `.agents/skills/treating-art-sprites/SKILL.md`
  (see Commits: `77cd80d`)
- APPLIED: `AGENTS.md` — `theater/public/art/` named in the layout with the never-commit-raw
  warning, and `scripts/art/` in the setup commands with the reason it sits outside the pnpm
  workspace → `AGENTS.md` (see Commits: `77cd80d`)
- NO-CHANGE: `.claude/skills/rebuild-restart/SKILL.md` — followed for the rebuild and its
  curl verification; the `--force-recreate` warning and the "poll until 200" note were both
  load-bearing here (the first curl raced Traefik); served as written
- NO-CHANGE: `docs/spikes/art-check.html` — driven headlessly over `file://` again, unmodified,
  a second time in its life; its palette strip is what made the result acceptable by eye
  rather than by numbers; served as written
- NO-CHANGE: `scripts/validate_codex_setup.py` — caught the over-long wrapper on the first
  run with an actionable message (byte counts and the ceiling); served as written
- REJECTED (decided-by: human): weakening `fit.mjs`'s exit-3 on an alpha-less source so it
  could key backdrops itself. The refusal is the guard that keeps a photographic background
  from being silently keyed into a fringed sprite; the keying belongs in a separate script
  that refuses anything but a provably flat backdrop, which is what `key.mjs` does.

## Next steps

1. Look at the wagon on real hardware at the new framing before treating it as final.
2. If the `theater/public/` rule above is wanted, add it to the theater rules-index with the
   failure story attached.
3. Three distinct completed days of raw logs are not yet present in the root (2026-09-08 and
   2026-09-09 only), so no sweep is due; run `sweeping-session-logs` once a third day lands.

## Pointers

- Treatment reference: `scripts/art/README.md`
- Skill: `.claude/skills/treating-art-sprites/SKILL.md`
- Checker: `docs/spikes/art-check.html`
- The session that generated the original sprites: `docs/session-logs/2026-09-09-13-12-claude-code-dt14-sprites-via-codex.md`
- Roadmap: `docs/roadmaps/drive-in-theme-roadmap.md` § Phase DT14
