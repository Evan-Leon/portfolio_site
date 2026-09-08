---
date: 2026-08-25
agent: claude-code
type: phase-execution
phases: [DT3]
repos: [portfolio_site]
---

## Accomplished

Phase DT3 is done: `/theater/` now drives past eight lit poster screens, each a
link to its project page, with the posters gating the reveal.

- `theater/src/projects.ts` carries the eight projects in drive order with
  site-absolute `href`/`poster`/`clip` (they are the portfolio site's own files,
  one level above the theater — the registry's `BASE_URL` rule does not apply
  and the header says so).
- `theater/src/lot/geometry.ts` holds the composition constants and the pure
  placement / `lotZ` / `activeScreen` / `screenProgress` arithmetic.
- `theater/src/lot/build-lot.ts` builds the stage, world, ground and eight
  `<a class="sds-screen">` columns and returns the one GSAP timeline; the lot
  CSS was transcribed from `docs/wireframes/theater.html` into `global.css`
  with `sds-` prefixes, and the lot roles it needs were added to `tokens.css`.
- `theater/src/lot/lot-scene.ts` wraps the GSAP adapter: posters declared
  through `sharedAssetLoader`, `eager: true`, no `assets` manifest, a snapshot
  carrying the inline transform and lit values GSAP actually wrote, and
  `onActiveScreenChange` left as DT4's seam.
- `theater/src/test-helpers/fake-image.ts` is now the single controllable
  `Image` for every test that goes through the loader; the two existing copies
  (`asset-loader.test.ts`, `loading-gate.test.ts`) import it instead.
- Registry points at `lotScene(projects)` with `vh: 100 + VH_PER_SCREEN * 8`,
  which is the 1060 DT2 reserved.

Two real defects were found by the tests rather than by reading, and both are
fixed in production code:

- `screenProgress(3, 8) * 7200` is `2399.9999999999995`, so `activeScreen` at
  the exact progress its own inverse reports returned the screen *behind* the
  one asked for. `activeScreen` now computes from progress directly with a
  `BAND_EPSILON`; DT5 scrolls to `screenProgress` by name, where landing a
  screen early would have been the visible symptom.
- The unlit tween's `fromTo` wrote its `from: 1` onto all eight screens at
  build time (`immediateRender` defaults to true), so a fresh seek into the
  middle of the drive lit every screen the visitor had not reached yet while
  scrubbing to the same progress from the end left them dark. The conformance
  kit's `seek-order-independent` check caught it — the first time the observer
  reading *rendered* state (not just the pure numbers) has paid for itself.

Attempted and reverted: adding `@types/node` so the new `fs`-based test could
typecheck. `vite-site-assets.ts` records a deliberate policy of keeping
@types/node out of this browser workspace, so the dependency was removed again
and `projects.test.ts` carries the same `@ts-expect-error` that file does.
`package.json` and `pnpm-lock.yaml` are unchanged.

## Commits

portfolio_site:

- `08c145a` feat(dt3): the lot — projects registry, geometry, GSAP scene, conformance test

## Uncommitted work left behind

`images/chunk-norris/` is untracked in the working tree. It predates this
session (it was untracked at session start), is not one of the eight projects,
and was deliberately left alone.

## Verification

All run from `portfolio_site/`:

- `pnpm -C theater typecheck` — pass.
- `pnpm -C theater lint` — pass.
- `pnpm -C theater test` — pass, 283 tests in 20 files (four new suites:
  `projects`, `lot/geometry`, `lot/lot-scene.contract`, `lot/build-lot`).
- `pnpm -C theater build` — pass; `gsap` still splits into its own chunk, so
  the dynamic-import boundary survived.
- `prettier --check "theater/src/**/*.{ts,css}"` — pass; the pre-commit hook
  ran its own scoped check and passed.
- `grep -n 'new Image\|fetch(' theater/src/lot/*.ts` — no output (`SDS-006`).
  Proved non-vacuous by running the same pattern against
  `loader/asset-loader.ts`, which matches 3 times.
- `grep -n 'getBoundingClientRect\|offsetHeight\|offsetWidth' theater/src/lot/*.ts`
  — no output (`SDS-004`).
- `grep -c '/projects/' theater/src/projects.ts` — 8.
- `file images/*/01.png | grep 'x 1,'` — no 1×1 placeholders. The poster guard
  was proved non-vacuous by mutating its comparison to 4000px, which failed all
  eight, then restoring it.
- `docker compose build && docker compose up -d --force-recreate` — pass;
  `/theater/` returns 200, the page still carries one `data-scene-slot="lot"`,
  and `/images/<slug>/01.png` + `/projects/<slug>.html` serve 200.
- Browser (headless Chromium at 1440×900, against the running container, driven
  by a throwaway script — not committed): all eight surfaces reach
  `data-poster="ready"`; the lit screen computes `brightness(1)` against
  `brightness(0.35)` for the rest and its marquee resolves to `#d4a862`; the
  snapshot at screen 3's and screen 0's band middles is byte-identical after
  driving to the end and scrubbing back (`SDS-001`); the eight links carry the
  right hrefs and marquee names; nothing is `aria-hidden`; the console is empty
  (no `[sds]` warnings, no page errors). A frame driven to `lotZ = 200` — the
  frame the wireframe depicts — matches `docs/wireframes/theater.html`
  screenshot for screenshot apart from the wireframe's own annotation callouts.
- `pnpm -C theater test:e2e` — not run. DT6 writes the Playwright suite; the
  `e2e/` directory still has no specs.

## Blockers

None.

## Open flags

- `buildLot` removes the `aria-hidden="true"` that `gsap-timeline.ts` puts on
  its root. That attribute is right for a decorative animation and wrong for a
  scene made of eight real links, but it does mean the lot depends on an
  implementation detail of the adapter it wraps. If the GSAP adapter ever grows
  an option for this, take it.
- Screens the camera has passed are still painted (they are in front of the
  camera plane, just very close), so a mid-drive frame has large dim shapes
  sliding off the edges. That is what driving past a billboard looks like and
  the wireframe — a near-the-gate frame — could not show it. Worth a look with
  human eyes before DT6 pins screenshots.
- `theater/src/test-helpers/` sits under `src/`, so it is typechecked and
  linted with production code but imported only by tests. That matches how
  `adapters/adapter-contract.ts` already lives, and nothing in `main.ts`
  reaches it, so it stays out of `dist/`.

## Rules-index candidates

- A GSAP `fromTo` renders its `from` value at build time (`immediateRender`
  defaults to true), so every `fromTo` placed later in a scrubbed timeline
  writes its start state onto the element the moment the timeline is built. Any
  element whose tween has not rendered yet keeps it — a fresh seek into the
  middle of the timeline and a scrub back to the same progress then produce
  different frames, which is `SDS-001` broken with no error anywhere. Set
  `immediateRender: false` on every `fromTo` that does not start at position 0.
  Found in DT3 by the conformance kit's `seek-order-independent` check.

- An adapter's `observe` must read state the animation library actually
  *wrote* (the inline transform, the inline custom property), not only the
  adapter's own computed numbers. A snapshot of pure arithmetic passes every
  contract check while the tween is aimed at the wrong element or writes a
  misspelled property, because the arithmetic is right and only the DOM is
  wrong. DT3's snapshot carries `worldTransform` and `lit` for this reason, and
  they are what caught the `immediateRender` bug.
  promote → universal

- A test fake that stands in for a DOM constructor must produce a real `Node`
  when anything downstream reasons about the DOM. The conformance kit treats a
  listener as leaked unless its target is a disconnected `Node`
  (`targetOutlivesScene`), and the asset loader adds `{ once: true }` handlers
  to every image it builds — so an `EventTarget`-subclass `Image` fake fails a
  correct adapter with sixteen findings that describe nothing real.
  promote → universal

## Meta-prompt / skill / doc updates

- The DT3 phase specifies the exit-list cross-check as "a regex anchored on
  `<li><a href="`". Prettier wraps the three longest entries in
  `theater/index.html` onto their own lines, so that literal matches only five
  of the eight — a check that would have compared two lists neither of which
  was complete. The test uses a whitespace-tolerant pattern and asserts eight
  matches on both sides (`EVO-UNI-118`). Future phases that prescribe a regex
  against a Prettier-formatted file should say "whitespace-tolerant" rather
  than pinning a literal.
- The DT3 phase says paths in `projects.test.ts` are resolved from
  `import.meta.dirname`. Worth recording *why* the obvious alternative is
  wrong: Vite rewrites `new URL('…', import.meta.url)` into an asset URL, so
  the file fails to import under Vitest before a single test runs.
- The phase's constraint that the lot CSS is "tokens only" needed eleven new
  raw values in the PALETTE block to satisfy honestly (bezel, posts, the dim
  marquee and its two edges, the sky ramp, the cool star). Phases that
  transcribe a wireframe should say whether new primitives are expected, so the
  choice is not re-litigated per phase.

## Next steps

- DT4: the video activation band — the `<video>` per screen and the clip
  lifecycle, hung off `lot-scene.ts`'s `onActiveScreenChange(prev, next)`.
  Note there is no `'video'` asset kind in the loader, which DT4 has to decide
  about.
- DT5: keyboard drive-by-focus (it consumes `screenProgress(i, count)` by
  name), `reducedMotionSteps`, and the narrow layout — `global.css`'s
  `max-width: 767px` block carries the three overrides transcribed from the
  wireframe, but per-screen placement is an inline transform CSS cannot
  override, so single-file placement has to come from the geometry.

## Pointers

- `docs/roadmaps/drive-in-theater-roadmap.md` § Phase DT3 (and DT4/DT5 next).
- `docs/wireframes/theater.html` — the approved composition this was built to.
- `theater/skills/rules-index/SKILL.md` — `SDS-001`, `SDS-002`, `SDS-004`,
  `SDS-006` are the load-bearing ones here.
