---
date: 2026-09-09
agent: claude-code
type: phase-execution
mode: attended
phases: [DT13]
repos: [portfolio_site]
---

## Accomplished

**Done — DT13 in full.** `/theater/` now renders the visitor's time of day: six
`[data-period]` palettes (sky stops, star opacity, sun/moon orb, asphalt, unlit-screen
floor, glow), a road with a dashed yellow centre line and white edge lines, and a ground
plane sized from `lot/geometry.ts` that reaches the horizon at every point of the drive
instead of ending behind the camera a third of the way down the lot.

**Done — the ground-plane flicker DT11 measured is resolved, by a third option neither
the roadmap nor DT11 proposed.** The roadmap offered two unbuilt candidates. Both were
built and measured:

- **Folding the road into the asphalt's own `background` stack: kept.** `.sds-lot__ground::after`
  is gone; the road is three layers of the ground's background. This removes the second
  composited layer and the coplanarity (DT11's cause 2) outright, at 0.2 ms/frame.
- **Sectioning the plane: built, measured, REJECTED, deleted.** N abutting planes cost
  exactly what one plane costs — `groundDepth(20)` measured **137.9 ms/frame as three
  abutting 4000x6934 planes and 134.0 as one 4000x20800 plane**. The rastered **area** is
  what hurts, not the tiling, so sectioning satisfies the letter of "no single layer over
  8192px" and fixes nothing.
- **What shipped: `GROUND_SQUASH = 4`.** The plane is laid out `groundDepth(count) / 4` px
  deep and `scaleY(4)`d back out — same world Z, a quarter of the texture — and every
  depth-direction length it paints (140/320px dashes, 780/784px parking rows) is divided
  by the same constant so it cancels. 134 → 51 ms/frame. For the twenty projects that
  ship, the plane rasterises at **4000x5200 CSS pixels — 20.8 Mpx against the 19.2 Mpx of
  the 4800px plane it replaces**, two and a half times the depth for about the same
  texture, and inside the texture limit at DPR 1 (see Blockers for the density caveat). 4 is the largest squash the markings survive: the 4px parking-row
  hairline is one texel at 4, two-thirds of one at 6, half at 8, and 6/8 measurably wash
  the rows and the near dash out.

**Done — proved.** Unit 379 green; e2e 48 green over repeated full runs; the
falsification required by the phase (`EVO-UNI-061`) fails `period.spec.ts` and the restored
file makes it green; the container serves 200; all six palettes compared against the
approved wireframe at 1440x900 and 390px.

**Done — two chrome defects Evan found on the served page, neither of them DT13's doing
but both of them DT13's to fix** (`7af0ade`). `.sds-chrome` blurred the sun and the moon
with a `backdrop-filter` that has no falloff, and swallowed every click in its own 58px
because a fixed full-width strip had no opinion about hit-testing. Replaced with a gradient
scrim and the container-opts-out / control-opts-in pairing already documented twenty lines
away in the same file. `click-through.spec.ts` gains the regression guard that was missing.

**Done — and confirmed on real hardware the same day.** Evan ran the A/B: squash 1 (the
unsquashed 20800px plane, reachable live from the console with no rebuild) reproduces DT11's
blinking during scroll **and a second symptom DT11 never named — scrubbing backwards, the
road falls away.** Squash 4 is clean. 6 and 8 make no visible difference, so 4 stands, being
the value that keeps the parking rows sharpest. The squash is the fix, measured on the
hardware the bug was found on.

## Commits

- portfolio_site `d4eff15` — `feat(dt13): six time-of-day palettes, sun/moon orb, road markings, geometry-sized ground`
- portfolio_site `f81b323` — `docs(session): DT13 palettes, orb, road, geometry-sized ground`
- portfolio_site `7af0ade` — `fix(dt13): the header stops blurring the sky and stops swallowing clicks`
- portfolio_site `4ec4932` — `docs(session): the header's blur and click trap, found on the served page`
- portfolio_site `b44cdba` — `docs(dt13): the squash is confirmed on real hardware; the DPR gap is measured`
- portfolio_site `<this commit>` — `docs(session): audit the DT13 log against the commits it claims`

## Uncommitted work left behind

None beyond the commits above.

## Verification

Run and **passing**:

- `pnpm format:check`
- `pnpm -C theater typecheck`, `pnpm -C theater lint`
- `pnpm -C theater test` — 379 tests, 22 files
- `pnpm -C theater test:e2e` — 48 tests (43 before the review and Evan's report added five), green on every full run
- The phase's `<verification>` greps: 6 `:host([data-period=` blocks matching 6
  `:root[data-period=` twins; no hex `var()` fallbacks (exit 1); `height: 4800px` gone
  (exit 1); `--sds-ground-depth` / `--sds-ground-lead` / `--sds-ground-squash` all read in
  `global.css`; `sds-road-line` present as a role in both stylesheets; `groundDepth` /
  `GROUND_LEAD` / `GROUND_SQUASH` exported from `geometry.ts` and consumed in `build-lot.ts`
- `docker compose build && docker compose up -d --force-recreate`; `/theater/` → 200
- **Falsification (`EVO-UNI-061`)**: `.sds-lot { background: #0a0520 !important }` →
  `playwright test period` exit **1** (both look tests fail); file restored by copy,
  `cmp` clean, re-run exit **0**. Every other progress grep was also run against the
  pre-work tree and confirmed in its failing state before the work started.
- **New unit tests falsified individually** by mutating `build-lot.ts` three ways (orb into
  the world; section offsets not accumulated; wrong `GROUND_LEAD`) — each mutation failed
  exactly one new test.
- **Night parity**, the constraint that night must render numerically identically to before
  the phase: computed styles probed on the new build and on a rebuilt HEAD.
  `linear-gradient(rgb(10, 5, 32) 0%, rgb(13, 16, 51) 45%, rgb(18, 10, 46) 100%)`,
  `--sds-asphalt: #14102b`, `--sds-asphalt-far: #0a0520`, `brightness(0.35)`, and the
  marquee's background / border / box-shadow are **byte-identical**. The ten star gradients
  moved off that stack onto `.sds-lot::before`, which is the intended change.
- **The squash cancels completely**, proved against the *shipped* rule rather than the
  comment: overriding only `--sds-ground-squash` on the served page from 4 to 1 (which
  turns every `calc(140px / var(--sds-ground-squash))` into `140px` and removes the
  `scaleY`) moves **0.015 % of subpixels by more than 24/255** — antialiasing at feature
  edges, nothing else. A depth-direction length that failed to cancel would re-tile the
  road at a different pitch and be unmissable in that diff.
- **No-parameter night is pixel-identical to `?period=night`** (`cmp` on two 1440x900
  screenshots, clock faked to 03:00).
- Wireframe comparison, all six periods at 1440x900 plus narrow at 390px: sky, stars, orb
  position/size/colour, asphalt, road markings and screen floor match
  `docs/wireframes/theater-drive-in-theme.html`. Trees, car and beam are absent and are
  DT15. **This check covered appearance only** — see Open flags for what it missed at 390px.
- Four more mutations, all failing as they should: the parking row widened to a half-pixel
  line; the centre-line layer deleted; the dash stops not divided by the squash; the lane
  collapsed into the apron.

**Codex adversarial** (`gpt-5.6-sol`, reasoning high, banner confirmed per `EVO-TOOL-105`;
prompt `docs/roadmaps/drive-in-theme-dt13-prompt.md`, receipt
`docs/roadmaps/drive-in-theme-dt13-codex-review.md`) — run against the uncommitted tree.
**It caught a real one, and it was mine:** `theater/src/projects.ts` holds **twenty**
projects, not eight. Every measurement in this log was taken against the real build so the
numbers stand, but three claims derived from the wrong count did not, and are corrected:

1. "an eight-screen lot rasterises at 4000x2800, less than the 4800px plane it replaces"
   was **false for the lot that ships** — twenty projects give 4000x5200, slightly *more*
   texture (20.8 vs 19.2 Mpx) for two and a half times the depth. Corrected in
   `geometry.ts`, the roadmap and above.
2. The texture-limit tests were bound to the literals 8 and 20 and to nothing production
   reads, so **the cap could be crossed silently**: at squash 4 the ground exceeds
   `GROUND_RASTER_MAX` at 35 projects. Added a test bound to `projects.length` itself,
   and proved it bites (mutating `GROUND_SQUASH` to 2 fails it; a 35-project registry
   pushes the raster to 8200px).
3. The two `test.slow()` comments said "eight Tab presses" and "sixteen scroll positions";
   they are twenty and forty.

**And a second, worse one — a check of mine that could not fail.** The sky assertion was
`expect(sky).toContain(skyTop)`, which proves only that the top colour appears *somewhere*
in the computed gradient. Codex built the mutation: swapping `--sds-sky-top` and
`--sds-sky-low` in `--sds-sky` inverts the sky on screen and both period tests stayed
**green**. My own comment rationalised the substring ("pinning all three would duplicate
`tokens.css` into this file") and that reasoning was backwards — hand-written literals in
the spec are exactly what makes it an independent witness (`EVO-UNI-207`), not a
restatement. Both periods now pin the complete three-stop value with positions, and the
inverted-sky mutation fails both tests (exit 1) with the restored file green (exit 0).

**And a third, the same shape.** The brightness assertions sampled only an *unlit* screen,
so nothing anywhere proved a lit one reaches full brightness: collapsing the filter to
`brightness(var(--sds-unlit-floor))` leaves every screen permanently dim and both look
tests **and the whole of `active-screen.spec.ts`** stay green — that spec reads the
timeline's custom property and the video element, not this CSS consumer. Both periods now
assert both ends of the interval (screen 0 lit at `brightness(1)`, screen 1 at the
period's floor), and Codex's mutation now fails both (exit 1).

**And a fourth: nothing asserted the road at all.** The phase's own `<verification>` greps
`global.css` for `sds-road-line`, which proves a token is spelled and nothing about whether
a road is painted — Codex made the lane identical to the apron and both markings
`transparent`, and all thirteen period tests passed. A road consumer test now reads the
ground's computed background in both periods and asserts the layer sizes exactly
(`14px 100%, 420px 100%, 420px 100%, auto, auto`), the dash's stops at the *squashed* pitch
(35px of paint every 80px — 140/320 divided by `--sds-ground-squash`), the 4px edge lines,
and that the lane is darker than the apron in every channel. Four mutations were built
against it and all four fail it: the centre-line layer deleted; the dash stops not divided
by the squash (the exact silent failure the cancellation invites); Codex's transparent-token
road; and `--sds-road-surface` collapsed to `var(--sds-asphalt)` on its own.

Codex independently **cleared**: the squash arithmetic (it derived the transform the same
way and confirmed in Chromium that the projected ground rectangles at squash 1 and 4 are
*exactly* equal, with paint lengths 140/320/780/784 → 35/80/195/196 and the width-direction
14/420/4 untouched); the palette transcription (its own declaration-map diff, `diffs=0` per
period) and `SDS-009` scoping (6 `:host` / 6 `:root`); the road roles declared once; no hex
`var()` fallback (`EVO-UNI-030`); `--sds-road-surface` as justified; night parity against
its own independently built HEAD copy; the `::before` opacity assertion as live; that the
orb is one `aria-hidden` stage child outside the world with `z-index: 0` against the world's
`1`, whose rect is **byte-identical** while the world drives 1680 → 8400px; the star layer's
`pointer-events: none` and all 20 click-through links; and the narrow 390×844 layout. It
also re-ran the static gates and both builds in isolated scratch copies, and confirmed the
texture arithmetic against a probed `MAX_TEXTURE_SIZE` of 8192.

It explicitly declined to convert the hardware residual into a pass: its Chromium reports
`SwiftShader`, not Evan's GPU, so it can verify the mechanism and not the symptom.

**Its final pass (exit 0, 547 717 tokens) raised four more — 0 CRITICAL, 2 MAJOR, 2 MINOR.**
Dispositions:

5. **MAJOR, accepted, NOT fixed — screens 1–19 are unclickable at 390px.** Pre-existing:
   the narrow layout centres every screen with zero yaw, so screen `i-1`, nearer and
   therefore larger, covers screen `i`'s centre. **Verified independently** rather than
   taken on trust — at 390px `elementFromPoint` on screen `i`'s centre returns screen
   `i-1` for every `i >= 1`, while at 1440px every screen owns its own centre. Not fixed
   here: DT13 changed no `.sds-screen` rule, and the repair is a composition decision
   (offset the single file, or make passed screens non-interactive), not a one-liner. See
   Open flags and Next steps.
6. **MAJOR, accepted as a claim correction — the texture cap is in CSS pixels, the hardware
   limit is in device texels.** They are the same unit only at `devicePixelRatio` 1; on a 2x
   display the shipped 5200px plane may rasterise at 10400 and be back over 8192. Codex
   marks the actual tiling UNVERIFIED (SwiftShader) and so do I. `GROUND_SQUASH` is
   unchanged — moving it is a measurement Evan's hardware has to make, and squash 8 would
   hold to DPR 2 only by halving the parking rows below one texel. Every "one untiled
   layer" claim in `geometry.ts`, `global.css`, `geometry.test.ts` and this log is now
   qualified with the display. DT11's own `20800 against 8192` comparison has the same gap.
7. **MINOR, fixed — the one-texel parking row was unguarded**, which is embarrassing given
   it is the entire reason `GROUND_SQUASH` is 4: widening the row period from 780/784 to
   780/782 yields a HALF-pixel line that starts dropping out of the raster, and every road
   assertion still passed. The road test now pins the computed stops (`195px` gap, `196px`
   line — the `196 - 195 = 1` *is* the contract) and Codex's mutation fails it.
8. **MINOR, fixed — stale "eight screens" prose.** My `keyboard.spec.ts` comment repeated
   the wrong `4000x2800`, and `global.css` still claimed the new plane was smaller than the
   one it replaces. Three pre-existing instances were corrected in passing (`build-lot.ts`
   x2, `main.ts`, `keyboard.spec.ts` — "eight links" for a twenty-project lot); trivial,
   behaviour-neutral, recorded below.

Codex's final cleared list also covers the squash transform order/origin/world-Z
equivalence and every axis cancellation, the 35-project guard, the six dual-scoped
palettes, night parity, orb placement and fixity, desktop click-through, the road and
brightness tests *after* its four earlier findings were fixed (it re-ran every mutation
against the fixed tree), both raised timeouts, and that the removed `::after` and dropped
`transform-style` have no surviving consumers.

**Not run / not possible here:** the GPU check. See Blockers.

**Evan's review of the served page found two more, both in `.sds-chrome`, both
pre-existing and both first made visible by this phase** (fixed in `7af0ade`):

9. **The header blurred the sun and the moon.** `backdrop-filter: blur(8px)` on a full-bleed
   fixed strip has no falloff, so it drew a hard-edged rectangle of blur across the orb —
   invisible for as long as the top of the lot was empty night sky. Replaced by
   `--sds-chrome-scrim`, a gradient that fades to nothing at its own bottom edge and does
   what the blur was actually standing in for: keeping the logo legible over a daylight sky.
10. **The header swallowed every click in its own 58px.** `position: fixed` at
    `--sds-z-chrome` across the viewport with no opinion about hit-testing. Measured before
    the fix: `elementFromPoint` anywhere in the strip returned `.sds-chrome`, and screen 0
    reaches under it at 1440x900, screens 0 and 1 at 1280x620. The container now opts out
    and the logo opts back in — the same pairing already documented on `.sds-lot__world`
    twenty lines below in the same file, which is the annoying part.

The regression guard that was missing is now in `click-through.spec.ts`: those tests drove
to each screen's band middle and clicked the centre of the frame, so nothing in the suite
had ever clicked near the header. Two viewports, a scan across four bands, read from
`elementsFromPoint` rather than a bounding box — a screen is a yawed 3D quad whose
axis-aligned box is strictly larger than the shape the browser hit-tests, and my first draft
failed for exactly that reason rather than because of the header. The logo's own click is
pinned separately. Both fail against the pre-fix stylesheet.

## Blockers

**Cleared during the session.** The flicker verdict needed real hardware and was not mine
to give — headless Chromium rasterises through SwiftShader and reproduces neither symptom
at any squash value. Evan ran the A/B on his own machine and confirmed both directions, so
the argument became an observation. What made that cheap was that the lever reaches CSS as
a custom property: `--sds-ground-squash` can be overridden from the console, so the
known-bad shape is one line away and no rebuild is needed to compare.

**Still open, and measured as probably-benign:** whether Chromium's raster scale tracks
`devicePixelRatio` for this layer. Emulating DPR 2 in headless is real (a 400x300 viewport
screenshots at 800x600) and the ground's *marginal* frame cost is unchanged — 33.8ms at
DPR 1 against 32.4ms at DPR 2, where a DPR-tracking raster would cost about four times as
much, while the same measurement is sharply sensitive to CSS size (14.2ms at squash 8).
That points at Chromium pinning the raster scale under `.sds-lot__world`'s animating
`will-change: transform`. Not decisive: headless exposes no `LayerTree` (the same wall
Codex hit), so the layer's real texture size was never read.

**Not blocking:** DT13 explicitly runs under any DT11 outcome, and nothing here waits on
DT11's decision row.

## Open flags

- **Screens 1–19 cannot be clicked at 390px, and that is not new.** Verified this session
  (`elementFromPoint` on screen `i`'s centre returns screen `i-1` for every `i >= 1` at
  390x844; correct at 1440x900). The narrow rule flattens the slalom to a single file, so
  each screen is directly behind the last and genuinely occluded. `click-through.spec.ts`
  only ever runs at the default desktop viewport, so nothing in the suite sees it. DT13
  neither caused nor fixed it — but this phase's manual check *was* supposed to cover the
  narrow layout, and my first pass looked at a screenshot and concluded "the narrow layout
  holds", which was a statement about appearance sold as a statement about the layout.
- **The texture-limit guard is in CSS pixels and the limit it cites is in device texels.**
  Fine at DPR 1; at DPR 2 the evidence now points at Chromium pinning the raster scale
  rather than doubling it (see Blockers), but the layer's real texture size was never read
  and the guard still cannot *prove* a high-density display. If it ever needs fixing the
  shape is known and small: both bounds scale with density — the texture rule wants
  `k >= depth * dpr / 8000`, the one-texel rule `k <= 4 * dpr` — so `k = 4 * dpr` holds at
  any DPR and pins the plane at a constant 5200 device texels.
- **`GROUND_SQUASH` resamples the ground along its depth axis, and the texel floor is now
  guarded at exactly one place.** The road test pins the parking row's computed `195px` /
  `196px` stops. A future phase adding a *finer* depth-direction marking would still soften
  silently — the guard covers the feature that exists, not the rule.
- **Two e2e tests were given `test.slow()`** (`keyboard.spec.ts`'s tab sweep,
  `active-screen.spec.ts`'s both-directions sweep). Both were already at ~23s and ~28s
  against Playwright's 30s default *before* this phase; the deeper ground costs the headless
  software rasteriser about 24 ms/frame more and pushed them over under a 13-worker parallel
  run. What they assert is unchanged. It is still a raised timeout, and if either creeps
  again the right answer is to look at the settle loop, not to raise it further.
- **`--sds-tree`, `--sds-beam` and `--sds-headlight` are declared with no consumer** — the
  trees, car and beam are DT15. Declared now because the six palettes are one transcription
  and a palette revisited later to add three values per period ends up inconsistent. They
  are invisible to `EVO-UNI-017`-style consumer assertions by construction until DT15.
- **The orb is behind the world**, so at `dawn` and `morning` the sun sits behind the first
  screen and only its halo shows. This matches the approved wireframe exactly (checked
  side by side), but it is the kind of thing that reads as a bug to someone who has not
  compared them.
- **The `<verification>` block's `brightness(calc(var(--sds-unlit-floor)` grep cannot match
  a Prettier-formatted file** — Prettier breaks `brightness(` onto its own line at 80 cols.
  Substituted a whitespace-insensitive check over the whole expression, which is strictly
  stronger. See Meta-prompt updates.

## Rules-index candidates

- **A composited layer's cost is its rastered AREA, not its largest dimension — so
  splitting it changes nothing.** A ground plane past `MAX_TEXTURE_SIZE` was diagnosed as
  "the GPU must tile it", and the obvious fix (N sibling layers each under the limit) was
  measured at *exactly* the cost of the single layer, because the pixel count is unchanged.
  The fix that works reduces the pixels: lay the element out smaller and `scale()` it back,
  which decouples a surface's texture size from the world size it covers. Before splitting
  a too-large layer, measure whether the cost tracks area or dimension — the two
  hypotheses predict the same symptom and opposite fixes.
  `promote → universal`
- **`backface-visibility: hidden` on a plane laid flat by `rotateX(-90deg)` deletes it.**
  It reads as a harmless compositing hint and was measured as a 3x frame-time win —
  because it had removed the ground entirely. The rotation puts the element's normal in
  +Y (screen down) while the camera looks at it from above, so the visible side is the
  back face. Any "free" performance win of this size is a rendering bug until a screenshot
  says otherwise.
  `promote → react-frontend`
- **A `toContain` on one member of a composite computed value passes for every arrangement
  of the others.** A sky assertion read the stage's computed `background-image` and checked
  it contained the period's top colour; reversing the gradient's first and last stops
  inverted the sky on screen and left the test green, because the colour was still in the
  string. The same hole is available on any multi-part computed value — `transform`,
  `box-shadow`, `background` with several layers, `grid-template`. Pin the whole value as a
  hand-written literal (which is also what keeps the spec independent of the stylesheet it
  is checking), or parse it and assert each part *with its position*. Sibling of
  `EVO-UNI-018`; the failure mode is `EVO-UNI-061`'s, one level down — the check runs, it
  just cannot distinguish the states it exists to distinguish.
  `promote → universal`
- **A fixed overlay with one control in it needs `pointer-events: none` on the container
  and `auto` on the control, and nothing but a click test will tell you it does not.** A
  `position: fixed` header spanning the viewport owns every point in its own height, so
  anything beneath it in that strip is unclickable — silently, with the page looking
  perfect. It survives a suite that clicks element *centres*, because a control's centre is
  rarely under the chrome. Test it by reading `elementsFromPoint` at points in the strip and
  asserting the topmost is not the decoration; and pin the container's own control
  separately, because a focus/tab-order test stays green when an inherited
  `pointer-events: none` has made it mouse-dead.
  `promote → react-frontend`
- **A hit-test assertion must not pick its point from `getBoundingClientRect` when the
  element is 3D-transformed.** A yawed or rotated element's axis-aligned box is strictly
  larger than the shape the browser hit-tests, so points sampled from the box land outside
  the element and the test fails for a reason unrelated to what it is checking. Ask the
  browser instead — `elementsFromPoint` returns the real stack, and omits anything with
  `pointer-events: none`.
  `promote → react-frontend`
- **Telling a human to "set" a read-only DOM property produces a confident false negative,
  not an error.** `window.devicePixelRatio = 2` in the console fails *silently* in
  non-strict mode: nothing throws, the value does not change, and the operator reports back
  that they tried every level and saw nothing — which is exactly what they would see if the
  thing under test were fine. Hand-written diagnostic steps for a human need the same
  scepticism as an automated check (`EVO-UNI-061`): before asking someone to change a value,
  confirm the mechanism can change it, and have them read the value back as part of the
  step so a no-op is visible. For `devicePixelRatio` the real levers are browser zoom and OS
  display scaling.
  `promote → universal`
- **A `pgrep`/`grep` whose pattern appears in the checking command's own command line
  matches itself.** Polling for a background job with
  `until ! pgrep -f 'codex exec'; do sleep 30; done` never terminates: the waiting shell's
  own `/proc/<pid>/cmdline` contains the literal `codex exec`, so `pgrep -f` finds it. Two
  such waiters also keep each other alive. The damage is not only the leaked process — every
  "is it still running?" reading the session takes afterwards is partly a reading of its own
  poller, so the answer is unfalsifiable in the direction that matters. Match something the
  checking command cannot contain (the resolved binary path, a PID captured at launch, or a
  sentinel file the job writes on exit). Same family as `EVO-UNI-061`.
  `promote → tooling`
- **A phase's own `<verification>` grep can be unsatisfiable under the repo's formatter.**
  A single-line `grep` for a CSS expression the project's Prettier config wraps at 80
  columns can never match; the honest move is a whitespace-insensitive equivalent
  (`tr -s '[:space:]' ' ' | grep -o '<full expression>'`), which is stronger than the
  original, not weaker — never reformat the file to satisfy the check.
  `promote → tooling`

## Meta-prompt / skill / doc updates

- APPLIED: DT13's "MEASURED BEFORE YOU START" block asked for one of two candidates and
  said neither was built or measured; both now are, and neither shipped. Added a
  "✅ RESOLVED IN DT13" block recording what was measured, why sectioning was rejected, what
  `GROUND_SQUASH` is, why it is 4, and that Evan's GPU check is still owed →
  `docs/roadmaps/drive-in-theme-roadmap.md` (see Commits: `d4eff15`)
- APPLIED: DT13 changelog row → `docs/roadmaps/drive-in-theme-roadmap.md`
  (see Commits: `d4eff15`)
- APPLIED: Codex DT13 review prompt written and run →
  `docs/roadmaps/drive-in-theme-dt13-prompt.md` (see Commits: `d4eff15`)
- NO-CHANGE: `.claude/skills/rebuild-restart/SKILL.md` — followed for the served check
  (`docker compose build && up -d --force-recreate`, poll until 200); the `--force-recreate`
  warning and the Traefik 404 window both held as written.
- NO-CHANGE: `AGENTS.md`, `.claude/skills/writing-session-logs/SKILL.md` — served as
  written.
- APPLIED: three pre-existing "eight links" / "eight project pages" comments corrected for
  a twenty-project registry (trivial, behaviour-neutral, noticed while fixing my own) →
  `theater/src/lot/build-lot.ts`, `theater/src/main.ts`, `theater/e2e/keyboard.spec.ts`
  (see Commits: `d4eff15`)
- PENDING (decided-by: human): DT13's Manual Verification says "at 390px wide the narrow
  layout holds", which a screenshot can satisfy while every screen but the first is
  unclickable. The phase's check should name the interaction, not only the layout. Not
  edited: changing a phase's verification after executing it is a structural edit to a
  document DT14–DT16 are written against. Next action: Evan rules whether the narrow check
  in DT13 (and the same wording wherever DT15/DT16 repeat it) should require a click at
  phone width.
- PENDING (decided-by: human): DT13's `<constraints>` specify a single-plane ground and a
  `::after` road that its own measured warning block contradicts, and its
  `brightness(calc(var(--sds-unlit-floor)` grep cannot match under the repo's Prettier
  config. Both were worked around in-session and the outcome is recorded in the phase, but
  the `<constraints>` text itself still reads as the instruction. Not edited: rewriting a
  phase's constraints after executing it is a structural change to a document the next
  phases are written against, and a reasonable person could prefer the original with the
  resolution block beside it. Next action: Evan rules whether DT13's `<constraints>` should
  be rewritten to the shipped shape or left as the historical instruction.

## Next steps

- **Evan:** open `http://portfolio-site.localhost/theater/` on real GPU hardware and scroll,
  in at least `?period=afternoon` and `?period=night`. The question is only "does the scene
  blink during scroll". If it does, the lever is `GROUND_SQUASH` in
  `theater/src/lot/geometry.ts` — raising it to 6 or 8 halves the texture again at a
  measurable cost to the road markings.
- **The DPR question, if anyone wants it closed properly.** `window.devicePixelRatio` is
  read-only, so the obvious test (assigning to it) silently does nothing — that is how the
  first attempt at this went. The real levers are browser zoom (Ctrl+= genuinely raises it
  and re-rasterises) or the OS display-scaling setting. The check is the same A/B as the
  blink: zoom up, scroll, watch. Not urgent — see Blockers for why it is probably moot.
- **Propose a phase for the narrow lot's hit-testing.** Screens 1–19 are unclickable at
  390px (see Open flags). It is a composition decision — offset the single file so each
  screen shows some of itself, raise the approached screen's z-index, or make passed screens
  non-interactive — plus a `click-through.spec.ts` that runs at a phone viewport, which is
  the check whose absence let this live.
- DT14 next if DT11's decision row is `GO`, `GO-REDUCED` or `NO-GO-TREES`; DT11's row is
  still `_not yet run_`.

## Pointers

- Phase: `docs/roadmaps/drive-in-theme-roadmap.md` § "Phase DT13" and its
  "✅ RESOLVED IN DT13" block.
- Approved wireframe: `docs/wireframes/theater-drive-in-theme.html`.
- DT11's measurement this phase had to answer: `docs/spikes/2026-09-08-scenery-probe.html`
  and `docs/session-logs/2026-09-08-19-33-claude-code-dt11-scenery-falsifier-and-art-checker.md`.
- Codex review prompt: `docs/roadmaps/drive-in-theme-dt13-prompt.md`.
- No handoff written.
