---
date: 2026-08-25
agent: claude-code
type: phase-execution
phases: [DT6]
repos: [portfolio_site]
---

## Accomplished

Done — DT6 complete. Six Chromium Playwright specs under `theater/e2e/`
(18 tests), a bash production-parity smoke, and the helper extensions they
share. Every spec was shown to fail against a deliberate breakage of the
behaviour it owns, then reverted.

Done — a real theater bug, found by the suite and fixed. `.sds-lot__world` is
a full-stage box the drive translates to `translateZ(lotZ)`; the stage's
`perspective` is `900px`, so while `lotZ < 900` that box sits between the
camera and every screen and absorbs every click. `lotZ < 900` is
`progress < 0.125`, which is exactly screen 0's entire lit band — **screen 0
was never clickable at any scroll position** since DT3. Nothing looked wrong:
screens stayed lit, animated and keyboard-reachable. Fixed with
`pointer-events: none` on the world and `auto` on `.sds-screen`; no visual
change. Committed separately from the suite because it is a behaviour change
and DT6 is not supposed to make any.

Done — `reveal.spec.ts` cross-checks the eight screens against `index.html`'s
hand-written `.sds-exit-list` as well as against `src/projects.ts`. The
module half cannot fail on its own: the spec imports the same list the lot is
built from, so deleting a project shrinks both sides of the comparison
(`EVO-UNI-061`). Caught while designing the falsification, not after it.

Not attempted — Firefox, WebKit, touch, and clip production. Out of scope for
the phase and still manual.

## Commits

portfolio_site:

- `2effd98` fix(dt3): the lot's world swallowed every pointer event for the first 900px
- `f42acc3` test(dt6): playwright suite for the theater — reveal, drive, active screen, click-through, reduced motion, keyboard

## Uncommitted work left behind

`images/chunk-norris/` — untracked before this session started, unrelated to
DT6, left alone.

## Verification

- `pnpm -C theater exec playwright --version` → 1.62.1; required Chromium
  revision 1234 already present and complete in `~/.cache/ms-playwright/`
  (`INSTALLATION_COMPLETE` + `DEPENDENCIES_VALIDATED`). No `playwright install`
  was needed or run (`EVO-TOOL-086`, `EVO-TOOL-087`).
- `pnpm -C theater typecheck` → pass. `pnpm -C theater lint` → pass.
- `pnpm -C theater test` → 21 files, 296 tests, pass.
- `pnpm -C theater test:e2e` → 6 spec files, 18 tests, pass (~14s).
- `prettier --check "theater/**/*.{ts,css}" package.json` → pass; pre-commit
  hook ran clean on both commits.
- `docker compose build && docker compose up -d --force-recreate` then
  `bash theater/e2e/nginx-parity.sh` → all 8 checks pass.
- Parity script falsified: `BASE_URL=http://localhost:4173` (vite preview)
  → fails on exactly `/theater` (404, not 301) and `/theater/nope` (200, not
  404), which is the SPA-fallback divergence the script exists to catch.
- Six spec falsifications, each reverted, each failing only the owning spec:
  - `projects.ts` classic-golf → `/projects/nope.html` → **click-through** fails
    on the landed page's `<title>`.
  - `main.ts` `reducedMotionSteps: 1` → **reduced-motion** fails (2 distinct
    depths, not 10).
  - `geometry.ts` `activeScreen` → `null` → **active-screen** fails on the clip
    test. The lit test still passes, correctly: lighting is a pure timeline
    function and does not go through `activeScreen`.
  - `geometry.ts` `lotZ` → `0` → **drive** fails on the monotonic Z assertion.
  - `main.ts` `:focus-visible` guard inverted → **keyboard** fails on
    "screen 0 was not lit".
  - `projects.ts` showrunner-digest entry removed → **reveal** fails on the
    exit-list count.

## Blockers

None.

## Open flags

- The roadmap's falsification commands use `pnpm -C theater test:e2e -- <name>`.
  The `--` is swallowed and Playwright receives no filter, so the whole suite
  runs. `pnpm -C theater test:e2e <name>` filters correctly and is what was
  used.
- Two of the roadmap's `sed` breakages append a replacement with no parameters
  (`activeScreen(): number | null`, `lotZ(): number`). Callers pass two
  arguments, so `tsc --noEmit` fails, the `webServer` build fails, and the run
  exits non-zero without any spec having executed — a green-looking
  falsification that proves nothing. Both were given `_progress`/`_count`
  parameters so the build succeeds and the spec genuinely fails. The roadmap's
  `focusin` → `focusin-disabled` sed has the same problem (the listener's
  `FocusEvent` parameter stops type-checking); inverting the `:focus-visible`
  guard is the type-valid equivalent.
- `active-screen.spec.ts` sets `test.describe.configure({ mode: "serial" })`
  because the file owns a file on disk. Under `fullyParallel` each worker runs
  its own `beforeAll`/`afterAll`, so worker A would delete the synthetic clip
  out from under worker B. Serial mode also means a failure skips the rest of
  the file.
- The synthetic clip is only created when `images/nom-noms/demo.mp4` is absent,
  and only deleted when this run created it — a DT9-era real clip is left
  alone. A crash between the hooks leaves it untracked; `git status` shows it.
- `theater/dist/` is a build artefact and `nginx-parity.sh` reads the hashed
  bundle name out of it. A stale `dist/` relative to the running image makes
  that one check fail confusingly; the script names the file in its failure
  message.

## Rules-index candidates

- A CSS `perspective` ancestor turns every 3D-transformed *wrapper* into a
  hit-testing plane of its own: a full-size, transparent, un-painted container
  translated to `translateZ(n)` with `n` approaching the perspective distance
  sits in front of its own children and silently swallows their pointer
  events. Nothing visual changes, so lit/animated/focusable all keep working
  and only a click reveals it. Give the moving wrapper `pointer-events: none`
  and its interactive descendants `pointer-events: auto`.
  `promote → tooling`
- An e2e spec that imports the same module the page is built from cannot fail
  on a change to that module — both sides of the assertion move together. Pin
  at least one assertion to a witness the module does not generate (a
  hand-written fallback list in the HTML, the landed page's `<title>`, a
  server response). Specialises `EVO-UNI-061` to the imported-fixture case.
  `promote → universal`
- A falsification `sed` that changes a TypeScript signature or an
  `addEventListener` event name breaks the build, not the test — the run exits
  non-zero without executing a single assertion, which reads as a successful
  falsification. Write breakages that stay type-valid, and check that the
  failure message names the assertion you meant to break.
  `promote → tooling`

## Meta-prompt / skill / doc updates

- The DT6 phase brief numbers screens 1-indexed in the clip assertions ("at
  screen 2's band its `<video>` … screen 5 (`spead-read`)") and 0-indexed in
  the lit assertions ("for `i` in 0..7"). `spead-read` is `data-screen-index`
  4, which is the only thing that disambiguates it. Phases that name a screen
  should say which index they mean, or name the slug.
- The same brief asks for "screen 1's `paused === true`" while screen 1
  (1-indexed = `budget-app`) has no clip, so its `<video>` is *removed*, not
  paused — the assertion is about an element that does not exist. The spec
  asserts the set of screens actually playing instead, which is the claim the
  brief was reaching for and stays true once DT9 lands the other seven clips.
  A phase brief that asserts on an element's property should say what makes
  that element exist.
- Roadmap falsification blocks should be executed, not just written
  (`EVO-UNI-082`): three of DT6's six `sed`s do not compile.

## Next steps

- DT7: the hero CTA.
- DT9 will replace the synthetic clip with real demo reels; `active-screen.spec.ts`
  needs no change when it does, but the seven screens still reporting
  `data-clip="missing"` become a real assertion at that point.

## Pointers

- `docs/roadmaps/drive-in-theater-roadmap.md` § Phase DT6.
- `theater/e2e/nginx-parity.sh` header for why the parity check is bash and not
  a Playwright spec.
