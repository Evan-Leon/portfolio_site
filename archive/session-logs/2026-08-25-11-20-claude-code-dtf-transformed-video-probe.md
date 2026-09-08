---
date: 2026-08-25
agent: claude-code
type: phase-execution
phases: [DTF]
repos: [portfolio_site]
---

## Accomplished

**Phase DTF is complete. The decision is `GO`.** The falsifier was built,
measured in real Chrome, and the row is in the roadmap's Decision records.

- **Eight distinct synthetic clips** at `docs/spikes/probe-clip-0..7.mp4` — 6 s,
  960×600, h264, no audio, faststart, eight distinct md5s. ffmpeg 6.1.1's
  `testsrc2` has **no `seed` option** (the roadmap assumed one), so per-file
  variation is a hue rotation plus overlay text; the generating command is in
  the probe header.
- **`docs/spikes/2026-08-25-transformed-video-probe.html`** — four variants
  (`flat` baseline, `lot` the production path, `overload` the 32-screen failing
  control, `reduced` the GO-REDUCED mitigation), driving a paused GSAP timeline
  (world `translateZ` 0→7200px plus per-screen brightness/marquee tweens) from a
  Lenis-ticked rAF that does `lenis.raf(t)` → one `scrollY` read →
  `tl.progress(p, true)`. Bands pre-registered in the header before any number
  was taken.
- **An automated in-page measurement mode** (`?measure=all`), added when both
  routes to driving real Chrome from this session turned out to be closed. It
  walks all four variants, three 10 s runs each, and prints the medians, the
  control check and the band. Inert without the parameter.
- **Measured, verdict written, committed.** `lot` = 227 fps against a 50 fps
  threshold; control moves; click and Tab pass.

**The finding that matters more than the verdict:** the baseline is the
*slowest* variant. `flat` (118) is half of `lot` (227), because `flat` autoplays
all eight clips while `lot` plays exactly one. **Decode count, not the CSS 3D
transform, is the dominant cost** — the transform stack is close to free. DT4's
play-iff-active rule is load-bearing, not an optimisation. And `reduced` (228)
is indistinguishable from `lot` (227), so DT4 takes the plain `GO` path: all
eight `<source>`s attached from construction, `preload="none"` deferring.

Attempted and abandoned: driving Windows Chrome over CDP from WSL (Chrome
ignores `--remote-debugging-address`, so the port binds to `127.0.0.1` only and
WSL cannot reach it), and measuring in WSL's own Chromium (renders through
`llvmpipe` — software — even with the d3d12 Mesa driver and
`MESA_LOADER_DRIVER_OVERRIDE` forced; `/dev/dxg` is present but Chromium would
not use it). Both were dead ends; the in-page harness replaced them.

## Commits

`portfolio_site`

- `f074646` — docs(dtf): transformed-video falsifier probe and decision
- `1a47254` — docs: session log — DTF probe built, measured hand-off to Evan
- `2981337` — docs(dtf): in-page automated measurement mode for the probe
- `3499e63` — docs(dtf): decision record — GO
- (this log, updated in place per the session-log skill)

## Uncommitted work left behind

None in the repo. `images/chunk-norris/` remains untracked and predates this
session; untouched.

Outside the repo: a staged copy of the probe at `C:\Users\evan\dtf-probe\`
(probe, clips, and copies of `projects/`, `assets/`, `images/` so the click test
resolves). Running from the WSL filesystem over `file://wsl.localhost/…` would
have pushed every mp4 read across the 9p bridge and depressed fps for reasons
unrelated to CSS 3D. Delete it whenever; it is a scratch copy, not a receipt.

## Verification

- The phase's `<verification>` block verbatim: eight lines of `h264,960,600`;
  eight clips; the video/gsap/brightness greps all hit; and
  `grep -E '^\| DTF \| (GO|GO-REDUCED|NO-GO) \|'` now prints **exactly one row**.
  (Caught and fixed one self-inflicted miss here: the row was first written as
  `**GO**`, which does not match the phase's own pre-registered regex.)
- `md5sum` over the eight clips → 8 unique digests.
- **Headless Chromium, 29 structural + hit-test assertions, green** — before the
  measurement patch and again after it. Placement, perspective, one-lit /
  one-playing at any progress, `reduced`'s source following the band,
  `elementFromPoint` resolving inside screen 3's `<a>`, a real click navigating
  to `/projects/el-blackjack.html`, Tab walking screens 0→7 with a 4px ring.
- **Measurement harness validated end-to-end headless**: navigation chain
  (flat → overload → lot → reduced), sessionStorage accumulation, summary
  rendering, median and band logic, zero page errors.
- **The measurement itself, Chrome 151 on Windows** (Evan): flat 118 / lot 227 /
  overload 176 / reduced 228, medians of three 10 s runs. Control check passes
  (176 < 227). Click and Tab confirmed by hand.
- `pnpm format:check` — pass. Pre-commit hook passed on all four commits.
- **Not run:** Firefox (not installed), WebKit (no Mac), and any hand-scrolled
  DevTools recording.

## Blockers

None. **DT0 is unblocked** — the Decision records row reads `GO`.

## Open flags

- **Firefox is genuinely unmeasured.** The pre-registered bands are judged in
  both browsers; Evan accepted a Chrome-only verdict. A 4.5× Chrome margin makes
  a Firefox NO-GO unlikely, but unlikely is not measured, and the roadmap row
  and probe header both say so rather than folding it into the GO. Firefox is a
  different compositor and a different media stack; DT6's Playwright suite is
  the natural place to catch a regression there.
- **Low-end hardware is unmeasured.** rAF cannot report above the display's
  refresh rate, so 227 fps implies a high-refresh panel and a capable GPU. On a
  60 Hz mid-range laptop a healthy result reads ~60. The probe says nothing
  about that visitor; a real-device pass after DT10 is the right place.
- **Three protocol deviations, all recorded in the probe header and under the
  roadmap table:** the rAF harness instead of a DevTools recording; page-driven
  scroll instead of a hand on a wheel; viewport 1201×882 @ dpr 1.5 instead of
  1440×900 @ 100% (1801×1323 device px — harsher than asked, not softer).
- **`overload` is the noisiest row** (211 / 176 / 103). Expected: 32 screens
  cycle 4× through eight clips and the spread is decoder scheduling. It still
  lands clearly below `lot`, which is all the control must establish.
- **Watch the decode count, not the transform, in every later phase.** If
  anything ever plays two screens at once — a hover preview, a cross-fade
  between bands, a reduced-motion path that leaves a clip running — `flat`'s 118
  is the number that predicts the cost.
- `docs/spikes/` adds ~9.3 MB of mp4 to the repo permanently, by the roadmap's
  own instruction ("the spike directory is the receipt").
- The probe's `-2400px` vs the wireframe's `-2200px` is not a divergence: the
  wireframe bakes `lotZ ≈ 200` into its static `nth-of-type` rules. Noted in the
  header so DT3 does not "fix" one to match the other.

## Rules-index candidates

- A falsifier's baseline is not automatically its cheapest variant — state what
  the baseline holds constant, and check the ordering before reading a
  difference as a cost. DTF's `flat` came in at half of `lot` because it
  autoplayed eight clips while `lot` played one; reading `lot − flat` as "the
  transform's cost" would have inverted the real finding, which is that decode
  count dominates and the transform is nearly free.
  `promote → universal`
- When a measurement's protocol is pre-registered, a verdict recorded with
  different instrumentation must state the deviation and the margin that
  absorbs it, in the same place the verdict is read. DTF cleared its threshold
  by 4.5×, which is what makes three protocol deviations survivable; at 1.2×
  the same deviations would have required a re-run.
  `promote → universal`
- Write a decision row in the exact form the phase's own verification command
  greps for. DTF's row was first written as `| DTF | **GO** |`, which its
  pre-registered `(GO|GO-REDUCED|NO-GO)` regex does not match — the phase would
  have reported itself incomplete.
  `promote → universal`

## Meta-prompt / skill / doc updates

- **`docs/roadmaps/drive-in-theater-roadmap.md`, phase DTF** — the clip recipe
  specifies "`testsrc2` with a different `seed`/overlay text per file";
  `testsrc2` has no `seed` option in ffmpeg 6.1.1. Proposed edit: replace with a
  per-file `hue=h=` rotation.
- **Same phase, the `flat` variant** — "eight videos in a plain grid" does not
  say whether the grid scrolls with the page or whether all eight stay on
  screen, and the two readings give different baselines (off-screen videos are
  throttled). The measured result makes this sharper than it first looked: what
  `flat` holds constant *is* the finding. Proposed edit: require the baseline to
  state its concurrent-decode count explicitly.
- **Same phase, Manual Verification** — it assumes DevTools is reachable and the
  measurer is on the same machine as the browser. On WSL neither holds without
  work. Proposed edit: allow an in-page harness as a sanctioned alternative
  instrument, with the deviation recorded — which is what happened here.

## Next steps

1. **Paste Phase DT0** — the roadmap's gate (`DTF records GO or GO-REDUCED`) is
   satisfied.
2. DT4 takes the **`GO`** path: all eight `<source>`s attached from
   construction, `preload="none"` doing the deferral. The `reduced` code path is
   not needed and should not be built.
3. Carry the decode-count finding into DT4 and DT5: play-iff-active is the
   performance contract, not an optimisation.
4. Optional, cheap: install Firefox and re-run `?measure=all` to close the one
   real gap in the verdict.

## Pointers

- Probe + full results and caveats:
  `docs/spikes/2026-08-25-transformed-video-probe.html` (header)
- Decision row + instrument note: `docs/roadmaps/drive-in-theater-roadmap.md`,
  "Decision records"
- Spec: `docs/superpowers/specs/2026-08-25-drive-in-theater-design.md` — "Core
  assumption"
- Wireframe: `docs/wireframes/theater.html`
- Engine shape the loop mirrors: `scroll-driven-skeleton/src/engine/engine.ts`,
  `scroll-driven-skeleton/src/adapters/gsap-timeline.ts`
- No handoff written.
