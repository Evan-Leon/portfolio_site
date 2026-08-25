---
date: 2026-08-25
agent: claude-code
type: phase-execution
phases: [DTF]
repos: [portfolio_site]
---

## Accomplished

Phase DTF's falsifier rig is built, verified and committed. It is the agent half
of the phase; the fps measurement is Evan's and has not happened.

- **Eight distinct synthetic clips** at `docs/spikes/probe-clip-0..7.mp4` — 6 s,
  960×600, h264, no audio, faststart, eight distinct md5s. Distinctness is the
  point: one repeated file would let the browser share a decoder and understate
  the cost. ffmpeg 6.1.1's `testsrc2` has **no `seed` option** (the roadmap
  assumed one), so per-file variation is a hue rotation (`hue=h=i*45`) plus
  per-file overlay text; the exact generating command is in the probe's header
  so the clips are reproducible.
- **`docs/spikes/2026-08-25-transformed-video-probe.html`** — four variants
  selected by `?variant=` or a top-of-file `VARIANT_OVERRIDE`:
  - `flat` — baseline (EVO-UNI-021): eight autoplaying videos, plain grid, no
    transforms, no GSAP, no Lenis, native scrolling.
  - `lot` — the production path, not a sketch: the wireframe's transform stack
    (perspective 900px / origin 50% 42%, `preserve-3d` world, screens at
    `translate3d(±480px, 0, −(i+1)·800px) rotateY(±18°)`, 520px 16:10 surfaces,
    marquee + posts); one `gsap.timeline({paused:true})` carrying the single
    world `translateZ` 0→7200px tween plus per-screen lit tweens
    (`filter: brightness()` 0.35→1→0.35 and the marquee background/box-shadow
    glow in and out over each band); `new Lenis({autoRaf:false})` ticked from
    our own rAF, which does `lenis.raf(t)` first, then one `window.scrollY`
    read, then `tl.progress(scrollY / range, true)`. Nothing in the frame path
    measures layout — `range` is measured on load and on resize, as in
    `scroll-driven-skeleton/src/engine/engine.ts`. All eight `<source>`s
    attached with `preload="none"`; only the in-band screen is played, and the
    switch is idempotent (DT4's rule).
  - `overload` — the failing control (EVO-UNI-120): the same, at 32 screens.
  - `reduced` — DT4's GO-REDUCED mitigation measured rather than hoped for: a
    `<source>` attached only while active, removed with `load()` on exit.
- **Header comment** carries what is measured, the four variants, the sampling
  protocol (median of three 10 s recordings, lowest fps over any contiguous 1 s
  window), the pre-registered bands written before any number was taken
  (EVO-UNI-091), empty result slots, and five named limits of the rig.
- **Roadmap** DTF build-order boxes ticked. The Decision records row is
  deliberately still `_not yet run_`.

Attempted-and-not-done: nothing. No fps number exists yet, in either browser.

## Commits

`portfolio_site`

- `f074646` — docs(dtf): transformed-video falsifier probe and decision
- (this log) — docs: session log — DTF probe built and handed over

## Uncommitted work left behind

`images/chunk-norris/` is untracked and predates this session; not touched, not
staged. The headless smoke-test script lives in the session scratchpad only —
it was a hand-off gate, not a deliverable, and DTF's scope is the probe.

## Verification

All run from the repo root, all pass.

- The roadmap's `<verification>` block verbatim: eight lines of `h264,960,600`
  from ffprobe; `ls docs/spikes/probe-clip-*.mp4 | wc -l` = 8;
  `grep -c '<video\|createElement(.video.)'` = 5; `gsap.timeline` and the
  absolute seek both present; `brightness(` present; the
  `^\| DTF \| (GO|GO-REDUCED|NO-GO) \|` grep prints **nothing** (exit 1) — the
  expected state for the build session.
- `md5sum` over the eight clips → 8 unique digests (the distinctness claim).
- **Headless Chromium (Playwright, from the skeleton's node_modules): 29
  assertions, all green.** `flat`: 8 videos, all autoplaying, no transforms.
  `lot`: 8 screens, screen 3 at `translate3d(-480px, 0px, -2400px)
  rotateY(18deg)`, perspective 900px, all 8 `<source>`s attached,
  `preload="none"`, world transform moving with scroll, exactly one surface at
  `brightness(1)` with the other seven at `0.35`, exactly one video playing and
  it is the in-band one, active marquee at `rgb(212,168,98)`.
  `overload`: 32 screens, deepest at `-25600px`. `reduced`: zero `<source>`s at
  rest, exactly one on the active screen, and it follows the band off the old
  screen. Hit-testing: `elementFromPoint` at screen 3's centre resolves inside
  its `<a>`, a real click navigated to `/projects/el-blackjack.html`, and Tab
  walked screens 0→7 in DOM order with a 4px ring.
- `pnpm format:check` — pass. Pre-commit hook ran on commit and passed.
- **Not run:** the measurement itself. Headless Chromium is neither Chrome's nor
  Firefox's compositor or decoder, and fps is not measurable that way. The rig
  being known-good only means a bad number will be a finding about the approach
  rather than a bug in the probe.

## Blockers

None for this session. **DT0 is blocked** until the Decision records row reads
`GO` or `GO-REDUCED` — that is Evan's manual pass, not an agent step.

## Open flags

- **The probe's `-2400px` vs the wireframe's `-2200px` is not a divergence.**
  `docs/wireframes/theater.html` is a single static frame with the camera ~200px
  into the lot, so it bakes `lotZ` into each `nth-of-type` rule; the probe puts
  that offset where it belongs, in the animated world `translateZ`. Noted in the
  probe header so DT3 doesn't "fix" one to match the other.
- **`flat` is a floor, not a controlled A/B.** The roadmap defines it without
  GSAP or Lenis, so `lot − flat` is the combined cost of the transform stack
  *and* the engine loop. Recorded in the probe header; do not read the
  difference as the transform's cost alone.
- **`flat`'s grid is `position: fixed`** with the same spacer as every other
  variant. Two reasons: identical scroll range makes the four numbers
  comparable, and an off-screen `<video>` is throttled by both browsers — a
  baseline that quietly stopped decoding halfway down is exactly the
  metric-that-cannot-report-a-bad-number EVO-UNI-120 warns about. This is a
  deliberate deviation from a literal reading of "plain grid".
- **`overload`'s 32 screens cycle the same eight clips**, four uses each. A
  control may be cheaper per screen than the real thing; it only has to read
  heavier overall. If it does not read lower than `lot`, no verdict may be drawn.
- `docs/spikes/` adds ~9.3 MB of mp4 to the repo, permanently, by the roadmap's
  own instruction ("the spike directory is the receipt"). Cheap now; worth a
  thought if more spikes follow.
- The probe depends on jsdelivr at open time. It refuses to run (visible fatal
  banner) rather than measuring a static page if gsap/lenis fail to load.

## Rules-index candidates

None. (`portfolio_site` has no local rules-index; the shared tier is edited only
in `infra`.)

## Meta-prompt / skill / doc updates

- **`docs/roadmaps/drive-in-theater-roadmap.md`, phase DTF** — the clip recipe
  says "`testsrc2` with a different `seed`/overlay text per file". `testsrc2`
  has no `seed` option in ffmpeg 6.1.1 (nor, as far as the filter's AVOptions
  go, at all). Proposed edit: replace `seed` with "a per-file `hue=h=` rotation".
  Everything else in the phase was executable exactly as written.
- **Same phase, the `flat` variant** — "eight videos in a plain grid" does not
  say whether the grid scrolls with the page, and the two readings give
  different baselines (off-screen videos get throttled). Proposed edit: state
  that the baseline keeps all eight on-screen for the whole recording and that
  the scroll range matches the other variants.

## Next steps

1. Evan: run the Manual Verification block — flat, overload, lot (+ click and
   Tab), reduced, three 10 s recordings each in Chrome and Firefox; write the
   raw numbers and medians into the probe's header.
2. Check the control first: `overload` median must read lower than `lot` in both
   browsers, or the meter is not moving and no verdict may be drawn.
3. Apply the pre-registered bands; write the `DTF` row into the roadmap's
   Decision records table; commit as `docs(dtf): decision record`.
4. On `GO`/`GO-REDUCED`, paste Phase DT0. On `NO-GO`, stop — the fallback is a
   spec change and Evan's call.

## Pointers

- Probe: `docs/spikes/2026-08-25-transformed-video-probe.html` (header holds the
  protocol, bands and result slots)
- Roadmap: `docs/roadmaps/drive-in-theater-roadmap.md` — phase DTF, and the
  "Decision records" table at the bottom
- Spec: `docs/superpowers/specs/2026-08-25-drive-in-theater-design.md` — "Core
  assumption"
- Wireframe the transform stack came from: `docs/wireframes/theater.html`
- Engine shape the loop mirrors: `scroll-driven-skeleton/src/engine/engine.ts`,
  `scroll-driven-skeleton/src/adapters/gsap-timeline.ts`
- No handoff written.
