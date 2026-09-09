# Drive-In Theme Roadmap

> **For agentic sessions:** Load all listed skills before writing any code.
> Steps use checkbox (`- [ ]`) syntax for tracking progress.
> Each phase prompt is self-contained.

**Goal:** Make `/theater/` read as a drive-in: the visitor's car — a late-1970s
wood-panelled station wagon seen from behind, kids in the rear-facing third row — sits at
the bottom centre of a marked road with the lot driving past it, trees line both sides of
the drive, and the sky, lighting and ground match the visitor's own time of day: six
periods on jourNOW's hour bands, so a visitor at 07:30 pulls in at dawn and one at 23:00
at night.

**Architecture:** Everything visible stays a pure function of scroll progress and one
attribute. A new `theater/src/page/period.ts` (a port of jourNOW's `timePeriod.ts`) sets
`data-period` on `<html>` from the clock or a `?period=` override before the engine
starts, re-evaluating only on `visibilitychange`. Six `:host([data-period]), :root[data-period]`
token blocks restyle lot roles only — three sky stops, asphalt, a star-layer opacity, a
tree fill, an unlit-screen brightness floor, a glow multiplier, a headlight opacity and a
sun/moon orb — with night as the base values, so the night palette and the
`0.35 + 0.65·lit` brightness are unchanged and a root with no attribute renders the
night look. The ground plane, today a fixed 4800px that ends behind the camera a third of
the way down a 20-screen lot, is sized from `geometry.ts` (`GROUND_LEAD`, `groundDepth`)
and carries a dashed-yellow road. Trees are static `mask-image` planes appended to the
existing `.sds-lot__world` (they ride the one drive tween) from a pure `scenery.ts` with a
fixed jitter table; the car, beam and tail-light glows are stage-anchored overlays that
never hit-test. Four generated sprites under `theater/public/art/` are declared through
the asset loader with the posters; tree masks are applied from JS only after the loader
has the bytes, and a tree is `visibility: hidden` until its mask is ready. A falsifier
runs first on a probe that reproduces the *production* lot (20 screens, production CSS
and timeline, the new ground) and records an ordered, exhaustive verdict; DT12 and DT13
ship under any verdict, DT15 branches on it. The Playwright suite pins `?period=night` on
every existing navigation; new specs assert consumers (computed background, filter,
opacity, matrix, a click landing on a screen under the car) and one unpinned daytime
visit.

**Written:** 2026-09-08
**Source of truth:** `theater/src/page/period.ts` (new), `theater/src/lot/scenery.ts`
(new), `theater/src/lot/art.ts` (new), `theater/src/lot/geometry.ts`,
`theater/src/lot/build-lot.ts`, `theater/src/lot/lot-scene.ts`, `theater/src/main.ts`,
`theater/src/styles/tokens.css`, `theater/src/styles/global.css`, `theater/public/art/`
(new), `theater/e2e/helpers/app.ts`, `theater/e2e/{period,scenery,art}.spec.ts` (new),
`theater/e2e/reveal.spec.ts`, `theater/e2e/nginx-parity.sh`,
`docs/spikes/2026-09-08-scenery-probe.html` (new), `docs/spikes/art-check.html` (new),
`docs/wireframes/theater-drive-in-theme.html`
**Prerequisites:** Node 24.16.0 / pnpm 11.15.1 on the WSL host (verified 2026-08-25);
Docker + `evo-net` (`rebuild-restart`); the theater's Playwright Chromium (rendered the
wireframe 2026-09-08); the wireframe **approved by Evan 2026-09-08** at `14f398b` (road
markings and the wagon folded in); **DT11 must record a verdict other than `INVALID` or
`NO-GO-ALL` before DT14 or DT15 run** (DT12 and DT13 run under any verdict); DT14's files
(or the SVG fallback) committed before DT15; DT15 committed before DT16; an image model
Evan can drive for DT14.
**Spec:** `docs/superpowers/specs/2026-09-08-drive-in-theme-design.md` (rev 2, after the
Codex adversarial at `docs/roadmaps/drive-in-theme-spec-codex-review.md`)

| Phase | Name | Layer | Effort |
|---|---|---|---|
| DT11 | Falsifier on a production-shaped probe, and the art checker page | spike | S |
| DT12 | Period engine, `?period=` override, e2e pin | frontend | S |
| DT13 | Sky, orb, lighting roles, road markings, geometry-sized ground, six palettes | frontend | M |
| DT14 | Generate, accept and commit the four sprites | media [MANUAL] | — |
| DT15 | Trees, the visitor's car, the beam — modules, DOM, loader, CSS, unit and contract tests | frontend | M |
| DT16 | Scenery and art Playwright specs, nginx parity, wireframe match | tests | S |

## Skills and orientation, for every phase

`portfolio_site` has no `project-context` skill and no local `rules-index` skill. Every
phase below therefore loads:

1. `AGENTS.md` at the repo root — the orientation document (layout, commands, hook).
2. The shared rules tier: `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md`,
   `.../tooling.md`, `.../react-frontend.md` (index tables; `EVO-UNI-*`, `EVO-TOOL-*`,
   `EVO-FE-*`), and the vendored law `theater/skills/rules-index/SKILL.md` (`SDS-*`).
3. `.claude/skills/writing-session-logs/SKILL.md` — every phase ends with a session log.

Phase-specific domain skills are listed per phase.

---

## Phase DT11: Falsifier on a production-shaped probe, and the art checker page

<task>
You are executing **Phase DT11 of the Drive-In Theme Roadmap** — building, before any
scenery code is written, a throwaway probe that reproduces the production lot and adds
the trees, orb, beam and car so Evan can measure whether ~88 masked planes and a blurred
overlay keep the drive at ≥ 50 fps and clickable, plus a browser page that checks
generated art per-pixel — because the whole scenery phase is pointless if the planes do
not paint or the frame rate collapses, and the art phase has no other acceptance tool.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md` and `tooling.md`; `theater/skills/rules-index/SKILL.md`
3. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- `docs/spikes/2026-08-25-transformed-video-probe.html` is DTF's probe and is a **frozen
  receipt** — copy from it, never edit it. It holds: a `?variant=` selector
  (`flat|lot|overload|reduced`, `VARIANT_OVERRIDE` const), a `lot` variant that builds a
  perspective stage, a world, a ground and N `<a class="screen">` columns with
  `<video muted loop playsinline preload="none">` and eight local clips
  `docs/spikes/probe-clip-0..7.mp4` (960×600 h264, cycled by `i % 8`), a GSAP timeline
  (one world `translateZ` tween 0→`(N+1)·800` plus per-screen lit tweens that animate
  `filter` and marquee colours directly), a Lenis-ticked rAF loop that does
  `lenis.raf(t)` → one `scrollY` read → `tl.progress(p, true)`, play-iff-active on band
  crossings, and an automated in-page measurement mode `?measure=all` (three 10 s runs
  per variant, lowest fps over any contiguous 1 s window, medians printed, results kept
  in **`sessionStorage`** under `dtf-measure-results`, `&reset=1` clears them) that walks
  every variant by navigation (`MEASURE_ORDER`, line 815) and prints a verdict from a
  `renderSummary()` (lines 884–905) whose bands are DTF's three outcomes — that summary
  must be rewritten for the five outcomes below, not copied. Its header records the sampling protocol and the pre-registered
  bands. The DTF verdict was GO: `lot` 227 fps, `overload` 176, Chrome-only.
- The production lot the probe must now reproduce (read these; do not trust this
  summary): `theater/src/lot/geometry.ts` (`SPACING = 800`, `OFFSET = 480`, `YAW_DEG = 18`,
  `GROUND_LINE = 0.58`, `screenPlacement(i)`, `lotZ(progress, count)`,
  `screenProgress(i, count)`); `theater/src/lot/build-lot.ts` (the timeline: one
  `fromTo` on the world `z: 0 → lotZ(1, count)` over `count + 1` band-units, per screen a
  lit `fromTo` of the custom property `--sds-screen-lit` 0→1 over `LIT_IN_BANDS = 0.15`
  at `screenProgress(i) · bands` and an unlit `fromTo` 1→0 over `LIT_OUT_BANDS = 0.05`
  at the band end with `immediateRender: false`; placement written as inline
  `--sds-screen-x/z/yaw`); `theater/src/styles/global.css` lines 196–470 (the `.sds-lot`
  stage with `perspective: 900px` / `perspective-origin: 50% calc(100% - var(--sds-ground-line))`,
  `.sds-lot__world` with `will-change: transform` and `pointer-events: none`,
  `.sds-lot__ground` 4800px deep at `translateZ(0)`, `.sds-screen` composing the three
  placement properties, `.sds-screen__surface` with
  `filter: brightness(calc(0.35 + 0.65 * var(--sds-screen-lit, 0)))` and two
  `color-mix()` shadows, `.sds-screen__marquee` with `color-mix()` background/border/shadow,
  the 767px narrow block); `theater/src/styles/tokens.css` (the `--sds-*` values the CSS
  reads). `theater/src/projects.ts` has **20** projects today, of which 16 have a real
  `images/<slug>/demo.mp4` and four (`spead-read`, `media-cloud-web-tools`,
  `media-cloud-vitals`, `showrunner-digest`) fall back to the poster.
- **Production keeps twenty decoded poster images resident, and the probe must too.**
  `build-lot.ts` lines 270–291 give every screen a video *and* a poster URL, and
  `lot-scene.ts` lines 441–476 append a decoded poster `<img>` to every surface once the
  loader resolves. The DTF builder being copied has videos, surfaces and marquees but no
  poster `<img>` (`2026-08-25-transformed-video-probe.html` lines 631–655), so a
  straight copy measures a lot with **twenty transformed raster textures missing** — a
  materially lighter GPU-memory and paint workload than the shipped page, on which `GO`
  would be a false positive. Nor is "eight clips cycled across twenty screens errs heavy"
  a safe assumption in the other direction: cycling eight URLs lets the second and third
  use hit cache in a way sixteen distinct production URLs cannot, so the direction of
  bias is unknown, not conservative. The probe reproduces the **post-reveal production
  DOM**: all twenty real posters loaded and appended before measuring, sixteen distinct
  clips, four poster-only screens, and the same resident images in the control and in
  every variant.
- The spec (`docs/superpowers/specs/2026-09-08-drive-in-theme-design.md`) fixes what the
  scenery will be, so the probe can build the same thing: trees at
  `x = ±(480 + 420 + dx)`, one per `TREE_SPACING = 400` of Z from `z = -100` (left) and
  `z = -300` (right) down to `-(lotZ(1, count) + 800)`, an eight-entry jitter table
  (`dx` 0/60/0/40/0/80/0/40, `scale` 1.05/0.9/1.15/0.95/1.1/1.0/1.05/0.9; right side uses
  entry `(i + 3) % 8`), each a `260×390` span with `mask-image` at `contain`, filled with
  a colour, `transform: translate3d(x, 0, z) scale(s)` from `transform-origin: 50% 100%`,
  no filter; **88 trees for 20 projects, 44 for `TREE_SPACING = 800`**. The ground becomes
  `height = lotZ(1, count) + 5·800` px with `translateZ(800px) rotateX(-90deg)`, and its
  `::after` lane gains edge lines and a 14px dashed centre line. A stage-anchored car
  (`clamp(320px, 38vw, 620px)` wide, `aspect-ratio: 16/9`, bottom centre) with two
  blurred (`filter: blur(6px)`) radial-gradient pseudo-elements, a `clip-path` beam
  trapezoid above it, and an orb `<div>` with a `box-shadow` halo. The wireframe
  `docs/wireframes/theater-drive-in-theme.html` shows the composition and has the exact
  CSS for the road, orb, beam and car.
- The art contract (spec, "Art contract"): `car` 1600×900, `tree-1..3` 800×1200,
  transparent PNG; corners α = 0; transparent fraction 15–85 %; car α > 0 bounding box
  ≥ 960px wide; tree α > 0 bounding box bottom within 5 % of the canvas bottom; ≤ 400 KB;
  **plus the placement thresholds** — every sprite is drawn into a fixed box with
  `object-fit: contain`, so where the subject sits *inside its canvas* is exactly where it
  sits on the page, and width alone does not constrain that: the car α > 0 bounding box
  must also be **≥ 0.55 × 900 px tall**, have its **bottom within 5 % of the canvas
  bottom** (the wagon is parked on the road, not floating above it) and be **horizontally
  centred within 5 % of the canvas centre**; each tree bounding box must be **≥ 0.55 ×
  1200 px tall** and **horizontally centred within 8 %** (a wider tolerance — a leaning
  silhouette is legitimate). Without these, a genuinely correct 1200×500 wagon drawn at
  `y = 0` with 400 transparent rows beneath it passes every other numeric check and every
  visual confirmation, and then floats in the shipped car box (measured counterexample,
  Codex Part 3B);
  a checkerboard warning when ≥ 30 % of opaque pixels inside the bounding box are
  near-grey/near-white (`|r−g| < 12`, `|g−b| < 12`, `r > 180`). The host has no
  ImageMagick, PIL or sharp — the checker is canvas in the browser, and it must also
  handle SVG files (rasterised at their intrinsic size).
- The wireframe's four inline `data:image/svg+xml;utf8,…` placeholders (three tree masks
  in `.tree--1/2/3`'s `--tree-mask`, the wagon in `.lot__car img`'s `src`) have
  `viewBox` but **no intrinsic size** — loaded as files they measure 267×150 and 100×150,
  which fails the contract. The fallback the spec decided needs them exported with
  explicit `width`/`height` (1600×900 / 800×1200).

**Out of scope:** any change under `theater/` (DT12–DT15); the measurement itself and
the verdict, which are Evan's (Manual Verification below).

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier and the vendored law for this phase:
- **EVO-UNI-091** — the outcomes and the decision each changes are enumerated in the header before any number is taken; the procedure below is copied there verbatim.
- **EVO-UNI-120** — a metric must be able to report a bad number: `scenery-overload` is the failing control and step 0 of the procedure refuses a verdict when it does not read lower than `scenery`; the checker ships a wrong fixture that must WARN.
- **EVO-UNI-021** — baseline first: `lot20` is the production lot with nothing added, measured before the scenery variants.
- **EVO-TOOL-054** — image models draw checkerboards into opaque pixels; the checker's warning exists for exactly this, and `file`'s "RGBA" is never consulted.
- **EVO-TOOL-055** — alpha is read with `canvas.getImageData()`, never inferred from a scaled `<img>` screenshot.
- **EVO-UNI-061** — the checker is shown to WARN on the wrong fixture and FAIL on a 1×1 before it is trusted; the probe's control is shown to read lower.
- **EVO-UNI-012** — plain HTML, no libraries beyond the GSAP/Lenis CDN pins the DTF probe already uses.
- **EVO-UNI-128** — the probe hardcodes `SCREEN_COUNT = 20` and says so; it is a snapshot of today's `projects.length`, and the header states that a rerun should re-read the registry.
</rules>

<reference_material>
Read these files before writing any code:
- `docs/spikes/2026-08-25-transformed-video-probe.html` — the header format (what is measured, variants, protocol, bands, results slots), the Lenis-ticked loop, `buildLot`/`buildTimeline`, and the whole `?measure=all` harness (from `const MEASURE =` to the end); copy the loop and the harness, **do not copy its `lot` timeline's direct `filter`/colour tweens or its 4800px ground** — production tweens `--sds-screen-lit` and the CSS derives the look.
- `theater/src/styles/global.css` lines 196–470 — transcribe the lot rules verbatim into the probe (keep the `sds-` class names so the comparison is honest), then apply the DT13 ground/road edits from the wireframe.
- `theater/src/styles/tokens.css` — the `--sds-*` values the transcribed CSS needs; inline them in the probe's `:root`.
- `theater/src/lot/build-lot.ts` — the timeline shape and the placement properties; `theater/src/lot/geometry.ts` — the arithmetic to inline.
- `docs/wireframes/theater-drive-in-theme.html` — `.lot__ground`, `.lot__ground::after`, `.lot__orb`, `.lot__beam`, `.lot__car` and the tree rules; the four inline SVGs.
- `docs/superpowers/specs/2026-09-08-drive-in-theme-design.md` — "Core assumption" (variants, procedure) and "Art contract".
</reference_material>

<constraints>
- **Two new files, nothing else:** `docs/spikes/2026-09-08-scenery-probe.html` and `docs/spikes/art-check.html`. Both open over `file://`; both ship nothing.
- **The probe's variants:** `lot20` (20 screens, production CSS, production timeline shape, the DT13 ground and road, the **production media pattern** below, `preload="none"`, play iff active — nothing else), `car-only` (`lot20` + orb + beam + car with the two blurred glows), `scenery` (`car-only` + 88 tree planes at `TREE_SPACING = 400`), `scenery-half` (44 planes at `TREE_SPACING = 800`), `scenery-overload` (≈4× `scenery`'s planes — **351** by the same loop at `TREE_SPACING = 100`: 176 left, 175 right). Default variant `scenery`.
- **The production media pattern, in `lot20` and therefore in every variant** (this is the
  fidelity the whole GO decision rests on — see `<context>`): read the twenty slugs from
  `theater/src/projects.ts` and hardcode them in the probe; each screen gets
  `video.poster = '../../images/<slug>/01.png'` and, for the sixteen slugs that have one,
  a `<source src="../../images/<slug>/demo.mp4">`; the four poster-only slugs
  (`spead-read`, `media-cloud-web-tools`, `media-cloud-vitals`, `showrunner-digest`) get
  **no `<source>` at all**. Then reproduce what `lot-scene.ts` lines 441–476 do after the
  loader resolves: `await` an `Image` for all twenty posters and append each as a decoded
  `<img>` to its surface **before the measurement harness starts**, so twenty transformed
  raster textures are resident exactly as they are in production. The probe prints
  `posters resident: 20/20` in the header before it will measure; if any poster fails to
  decode it refuses to measure rather than reporting a light number. The DTF probe's own
  `probe-clip-0..7.mp4` files are **not** used — cycling eight URLs across twenty elements
  buys cache reuse production does not get.
- **Tree masks are generated in-page** — draw three silhouettes (deciduous, conifer, tall) on an 800×1200 canvas, `toDataURL('image/png')`, and use the data URL as `mask-image`; the probe must not depend on DT14's art. The tree fill colour and every other value come from the inlined tokens. **Second mask source (`&masksrc=svg`):** the same three silhouettes also ship as the exported intrinsic-size SVG placeholders (the same constants `art-check.html` downloads), applied as external `mask-image: url(...)` rather than a PNG data URL. This exists because the SVG branch is the *likely* art outcome and the roadmap otherwise first exercises external-SVG masks under `preserve-3d` in DT15, after the manual art phase and an implementation commit. It does not need the full performance matrix: one `scenery&masksrc=svg` run showing trees paint and fps within noise of the PNG run is enough to retire the risk, and step 5 of the procedure records it.
- **The scroll range is identical across variants** (as DTF's was), so the numbers compare; the measurement is the lowest fps over any contiguous 1 s window, median of three 10 s runs, via the copied `?measure=all` harness (store key `dt11-measure-results`, not DTF's).
- **The harness measures *relative* cost only; the absolute floor comes from a wheel run.**
  The inherited harness calls `window.scrollTo()` on every measurement rAF
  (`2026-08-25-transformed-video-probe.html` lines 857–878). The scene loop still calls
  `lenis.raf(time)`, but Lenis is never moving the page from wheel input, so production's
  actual frame path — `Lenis.raf` under real wheel deltas, then the engine update
  (`theater/src/engine.ts` lines 323–350) — is idle for the whole measurement. Comparing
  variants against each other under that harness is sound, because they all share the
  bias. Reading an **absolute** `≥ 50` off it is not: a `scenery = 50` harness run can
  yield GO without ever measuring the interaction the number is promising. So the probe
  reports two things, and the procedure uses each for what it can carry: the harness
  medians decide density (`scenery` vs `scenery-half` vs the control), and a separate
  **natural-wheel run** — Chrome DevTools performance panel, real wheel scrolling through
  the full lot, lowest fps over any contiguous 1 s window, recorded per variant for
  `car-only` and the selected scenery variant — owns every absolute `≥ 50` comparison.
  The header states both protocols and keeps their result slots apart.
- **The decision procedure is written in the header before any number is taken.** It is
  ordered, exhaustive and mutually exclusive, and **the car is gated before any tree
  branch** — the earlier draft jumped from "trees do not paint" straight to the fps step,
  so the vector *(control valid, trees invisible, `car-only` 60 fps, car-only click/Tab
  FAILS)* returned `NO-GO-TREES` and shipped a car already known to be unusable:
  - **(0) Instrument validity.** `scenery-overload` must read lower than `scenery` on the
    harness, else **INVALID** — fix the probe, record nothing.
  - **(1) The car must be usable.** In `car-only`: click on screen 3 navigates to
    `../../projects/classic-golf.html`, and Tab reaches the screens in DOM order. Either
    failing is **NO-GO-ALL**. Nothing downstream ships a car that cannot be clicked, so
    this is checked before anything about trees.
  - **(2) The car must be fast enough.** `car-only ≥ 50` on the **natural-wheel** run,
    else **NO-GO-ALL**.
  - **(3) The trees must paint.** Trees visible as silhouettes on both sides in `scenery`,
    else **NO-GO-TREES** (steps 1–2 have already established the car is fine, so every
    failure from here down is NO-GO-TREES, never NO-GO-ALL).
  - **(4) The trees must not break interaction.** Click and Tab in `scenery` as in step 1,
    else **NO-GO-TREES**.
  - **(5) Density.** On the harness medians (three runs per variant, the lowest browser
    deciding), with the absolute floor confirmed on the natural-wheel run for whichever
    variant is selected: `scenery ≥ 50` → **GO**; else if `scenery-half ≥ 50` **and** the
    reduced layout itself passes steps 3 and 4 when opened at `?variant=scenery-half`
    (fps alone never selected a layout nobody had looked at) → **GO-REDUCED**; else
    **NO-GO-TREES**. Under GO or GO-REDUCED, also record the `&masksrc=svg` smoke: trees
    paint with external SVG masks, fps within noise of the PNG run.
  Every outcome names what it changes downstream (GO: DT15 at 400; GO-REDUCED: DT15 at
  800; NO-GO-TREES: DT14 needs the car only and DT15/DT16 take their car-only branch;
  NO-GO-ALL: DT14, DT15 and DT16 are not executed; INVALID: no verdict). The
  `renderSummary()` copied from DTF is rewritten to print this procedure's outcome.
- **The verdict is computed by one classifier, and the classifier is tested** (see the
  self-test constraint below and `EVO-UNI-120`). `renderSummary()` delegates to a single
  pure `classify({overloadFps, sceneryFps, halfFps, carFps, carInteraction, treesPaint, sceneryInteraction, halfPaint, halfInteraction})` returning one of the five verdict strings, and it is **fail-closed**: any missing or non-numeric input returns `INVALID` rather than falling through to a verdict.
- **The probe carries its own verdict self-test (`?selftest=verdict`)**, because a grep for the outcome words proves only that the words appear in the header — an implementation that unconditionally prints `GO` while naming all five outcomes in prose satisfies it. The mode runs `classify()` over a table written into the probe and prints `case: EXPECTED/ACTUAL` per row into `<pre id="verdict-selftest">`, covering at minimum: INVALID precedence (`overload ≥ scenery` with everything else passing — `INVALID`, proving step 0 wins over a GO-shaped vector); car interaction failure with 60 fps everywhere (`NO-GO-ALL`, the vector the old ordering got wrong); `car-only` below the floor (`NO-GO-ALL`); trees not painting with the car fine (`NO-GO-TREES`); scenery interaction failure (`NO-GO-TREES`); `(overload 45, scenery 55, half 58, car 60)` all passing (`GO`); `(40, 45, 52, 60)` with the half layout painting and interacting (`GO-REDUCED`); the same with the half layout *not* painting (`NO-GO-TREES`); `(30, 40, 45, 48)` (`NO-GO-ALL`); and a row with `sceneryFps` absent (`INVALID`, the fail-closed path). The same throwaway Playwright driver reads this element, and **the decision row may not be written unless it printed all-match** — the probe refuses to render a verdict when its own self-test has not passed in that session.
- **The checker page** (`art-check.html`): a file input (multiple) and a drop zone — files are decoded through `FileReader.readAsDataURL` into an `Image` (never a blob/file URL, so `getImageData()` cannot throw `SecurityError` under `file://`); per file a card with: filename, decoded dimensions, file size, the four corner alphas, transparent fraction, α > 0 bounding box (x, y, w, h), the checkerboard ratio, a composite strip of the image over white, black and the six `--sds-tree` colours from the wireframe (trees rendered as a mask: fill a canvas with the colour and `destination-in` the image; the car drawn as-is), and a verdict **PASS / WARN / FAIL** against the contract chosen by filename (`car*` → car contract, `tree*` → tree contract, anything else → "unknown contract" FAIL). SVG files are loaded through `<img>` and drawn at `naturalWidth × naturalHeight`. Two controls: **"show me a wrong fixture"** generates a 1600×900 canvas with a 160px transparent border around a 32px grey/white checkerboard, names it `car-wrong-fixture.png`, and runs it through the same cards — it must show WARN with the checkerboard ratio ≥ 0.9 while every numeric check passes; **"download placeholder set"** holds the wireframe's four data URIs **pasted in as constants** (a `fetch()` of the wireframe file is always blocked under `file://` — Chrome gives the page an opaque origin — so there is no fetch path; a comment names the wireframe as the source and the date copied) and offers `car.svg`, `tree-1.svg`, `tree-2.svg`, `tree-3.svg` for download as standalone SVG documents with the `viewBox` preserved, `%23` decoded to `#`, and explicit `width="1600" height="900"` / `width="800" height="1200"` attributes on the root element.
- Every number the checker prints is computed from `getImageData()`; nothing is inferred from `<img>` rendering (EVO-TOOL-055).
- **The checker is drivable without a human, and the self-test proves the checker is honest — not merely that it runs.** The earlier draft asserted only `wrong-fixture: WARN`, `1x1: FAIL` and four dimension lines; a checker whose corner-alpha, transparent-fraction and bounding-box predicates were all mutated to `return true` still emits every one of those lines (the wrong fixture is deliberately numerically valid and warns via a separate ratio; the 1×1 fails on dimensions; the placeholder lines assert size, not PASS). So `?selftest=1` runs, on load, a **table of fixtures generated in-page**, each shadowing exactly one predicate, and writes `name: VERDICT (failed: <predicate>|none)` per case into `<pre id="selftest">`:
  | Fixture | Must report |
  |---|---|
  | `valid-car` — a synthetic 1600×900 wagon-shaped opaque blob, grounded, centred, ~50 % transparent | `PASS (failed: none)` |
  | `opaque-corner` — `valid-car` with one corner pixel α = 255 | `FAIL (failed: corners)` |
  | `too-opaque` — 95 % opaque | `FAIL (failed: transparentFraction)` |
  | `too-transparent` — 5 % opaque | `FAIL (failed: transparentFraction)` |
  | `narrow-car` — subject 700px wide | `FAIL (failed: bboxWidth)` |
  | `floating-car` — correct subject in the top 500 rows, 400 transparent rows below | `FAIL (failed: bboxBottom)` |
  | `short-car` — subject 300px tall, grounded | `FAIL (failed: bboxHeight)` |
  | `off-centre-car` — subject grounded but pushed 20 % right | `FAIL (failed: bboxCentre)` |
  | `floating-tree` — 800×1200 silhouette ending 200px above the bottom | `FAIL (failed: bboxBottom)` |
  | `oversize` — a 1600×900 that encodes above 400 KB | `FAIL (failed: fileSize)` |
  | `checkerboard` — the wrong fixture (numerically valid, grey/white check) | `WARN (failed: none)` |
  | `clean` — `valid-car` in a saturated colour | `PASS (failed: none)` with no WARN |
  | `1x1` — a generated 1×1 PNG | `FAIL (failed: dimensions)` |
  | the four exported placeholder SVGs, each loaded back through an `Image` | full structural `PASS`, and their decoded dimensions (`car.svg: 1600x900`, `tree-1.svg: 800x1200`, …) |
  Every fixture but `checkerboard` and `clean` isolates a single predicate, so a predicate stuck at `true` fails its own row. The exported placeholders must report **PASS**, not dimensions alone — that is what makes the SVG fallback's self-consistency a checked property rather than an assumption. The build order verifies the whole table with a throwaway Playwright script under the scratch directory (never committed) that opens the page over `file://` and reads that element's text — `pnpm -C theater exec node <script>` with `chromium` from `@playwright/test`, the same way the wireframe was rendered on 2026-09-08.
- Prettier does not run on `docs/` (`.prettierignore`), so format by hand to the DTF probe's style; the pre-commit hook will not touch these files. **This was challenged in Part 3B review and re-measured on 2026-09-08:** `.prettierignore`'s `docs/` entry is honoured even for paths passed explicitly on the command line, so the hook's `prettier --check <staged .html>` arm cannot block these two files. Identical misformatted HTML exits 0 at `docs/spikes/__fmt-probe.html` and exits 1 at the repo root. No format step is needed in the build order; do not add one.
</constraints>

<build_order>

### 1. The probe
- [ ] Copy the DTF probe to `docs/spikes/2026-09-08-scenery-probe.html`; rewrite the header (what is measured, the five variants, **both** measurement protocols and what each may decide, the decision procedure with its six steps and five outcomes, separate empty result slots for the harness medians and the natural-wheel runs); replace the `lot` builder with the production transcription (20 screens, `--sds-screen-lit` tweens, DT13 ground and road) and add the orb, beam, car and tree builders per variant; rename the results key.
- [ ] Wire the production media pattern: the twenty slugs, sixteen `<source>` clips, four poster-only screens, twenty posters decoded and appended before measurement, and the `posters resident: 20/20` gate that refuses to measure otherwise.
- [ ] Write `classify()` as a single pure function and have `renderSummary()` delegate to it; add `?selftest=verdict` with the case table.
- [ ] Screenshot each variant over `file://` (`pnpm -C theater exec playwright screenshot --browser chromium --viewport-size=1440,900 "file://…?variant=<v>" <out.png>`) and confirm none shows the fatal banner and `scenery` shows silhouettes on both sides.
- [ ] Screenshot `?variant=scenery&masksrc=svg` too — the external-SVG mask source must paint the same silhouettes under `preserve-3d`.
- [ ] Drive `?selftest=verdict` with the throwaway Playwright script and confirm every case prints `EXPECTED == ACTUAL`.

### 2. The checker
- [ ] Write `docs/spikes/art-check.html` with the cards, the two contracts (including the bbox height / bottom / centre thresholds), the composite strip, the wrong-fixture control and the placeholder downloader.
- [ ] Write a throwaway Playwright driver in the scratch directory that opens `art-check.html?selftest=1` and prints `#selftest`; confirm **every row of the fixture table** reports its stated verdict and failing predicate — in particular that `floating-car`, `short-car` and `off-centre-car` FAIL on `bboxBottom` / `bboxHeight` / `bboxCentre`, and that the four exported placeholders report full structural PASS.

### 3. Hand over
- [ ] Commit both files (the `<commit>` below). The measurement and the verdict are Evan's (Manual Verification); the decision row is written by whoever measures.

### 4. Session log
- [ ] Write the session log per `.claude/skills/writing-session-logs/SKILL.md`.

</build_order>

## Manual Verification (Evan)

**Browser scope: Chromium only, deliberately.** Evan's ruling, 2026-09-08, after Part 3B
raised that the spec's core assumption named Chrome *and* Firefox while DT11 said "Firefox
if installed" and DT16 is Chromium-only — with no Firefox on this host, the likely path was
to ship having never tested the second browser. Rather than leave a premise the process
cannot honour, the supported-browser claim is narrowed: this feature is verified on
Chromium, the spec's "Core assumption" says so (amended in the same edit), and nothing in
DT11 or DT16 claims Firefox evidence. If Firefox support is wanted later it is a new
phase with its own measurement, not an optional line here.

1. Chrome, 1440×900, mains power, no other media playing.
2. Confirm the probe's own gates before taking any number: the header shows
   `posters resident: 20/20`, and `?selftest=verdict` printed all-match (the probe refuses
   to render a verdict otherwise).
3. **Harness run (relative only):** `file:///home/evan/EVOsystem/portfolio_site/docs/spikes/2026-09-08-scenery-probe.html?variant=lot20&measure=all&reset=1` — let the harness walk all five variants; copy the printed medians into the header's harness result slots.
4. **Natural-wheel run (owns every absolute ≥ 50):** with the DevTools performance panel recording, wheel-scroll the full lot in `?variant=car-only` and again in whichever scenery variant step 5 of the procedure is about to select; take the lowest fps over any contiguous 1 s window; copy both into the header's wheel result slots. A harness median never decides an absolute threshold.
5. Open `?variant=scenery` by hand: are the trees visible as silhouettes on both sides? Scroll until screen 3 is lit and click it (must open `projects/classic-golf.html`); Tab from the top (focus must walk the screens in order). Repeat the click and Tab in `?variant=car-only`. **If the procedure is heading for GO-REDUCED, repeat both checks in `?variant=scenery-half`** — the reduced layout is what would ship, and fps alone must never select a layout nobody opened.
6. Under GO or GO-REDUCED, open `?variant=scenery&masksrc=svg` once: trees must paint from the external SVG masks, with fps within noise of the PNG run.
7. Apply the procedure in the header, in order, and write the decision row (verdict; harness medians per variant; the two natural-wheel numbers; painting; click/Tab per variant including `scenery-half` if it was reached; the `masksrc=svg` smoke; date; decider) into the "Decision records" table at the bottom of this roadmap. Commit as `docs(dt11): decision record`.

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
ls docs/spikes/2026-09-08-scenery-probe.html docs/spikes/art-check.html
git diff --quiet HEAD -- docs/spikes/2026-08-25-transformed-video-probe.html && echo "DTF receipt untouched"   # must print
grep -c 'lot20\|car-only\|scenery-half\|scenery-overload' docs/spikes/2026-09-08-scenery-probe.html            # ≥ 4
grep -n 'SCREEN_COUNT = 20' docs/spikes/2026-09-08-scenery-probe.html                                           # the production count, hardcoded and labelled
grep -n -- '--sds-screen-lit' docs/spikes/2026-09-08-scenery-probe.html | head -3                              # the production lit property is what the timeline tweens
grep -n 'brightness(calc(' docs/spikes/2026-09-08-scenery-probe.html                                            # the production CSS expression, not a tweened filter
grep -n 'INVALID\|NO-GO-TREES\|NO-GO-ALL\|GO-REDUCED' docs/spikes/2026-09-08-scenery-probe.html | head          # all five outcomes named in the header
# The grep above proves only that the WORDS appear — an implementation that always prints GO
# passes it. The gate is the classifier's own self-test, driven in a browser:
node "$SCRATCH/dt11-verdict-selftest.mjs"                                                                       # every row EXPECTED == ACTUAL; non-zero exit if any row differs
grep -n 'function classify' docs/spikes/2026-09-08-scenery-probe.html                                           # one classifier, which renderSummary delegates to
grep -c 'images/[a-z-]*/01.png' docs/spikes/2026-09-08-scenery-probe.html                                       # 20 — the real posters, resident as production has them
grep -c 'images/[a-z-]*/demo.mp4' docs/spikes/2026-09-08-scenery-probe.html                                     # 16 — the real clips; the other four screens are poster-only
grep -n 'probe-clip-' docs/spikes/2026-09-08-scenery-probe.html ; echo "exit=$?"                                # DTF's eight cycled clips are gone → exit=1
grep -n 'posters resident' docs/spikes/2026-09-08-scenery-probe.html                                            # the gate that refuses to measure a light lot
grep -n 'masksrc' docs/spikes/2026-09-08-scenery-probe.html | head -3                                           # the external-SVG mask source mode
grep -n 'dt11-measure-results' docs/spikes/2026-09-08-scenery-probe.html                                        # its own results key
grep -n 'dtf-measure-results\|GO-REDUCED   lot' docs/spikes/2026-09-08-scenery-probe.html ; echo "exit=$?"     # DTF's key and DTF's summary bands are gone → exit=1
grep -n 'getImageData' docs/spikes/art-check.html                                                               # alpha read from canvas
grep -n 'readAsDataURL' docs/spikes/art-check.html                                                              # the file→image path that cannot taint the canvas
grep -n 'fetch(' docs/spikes/art-check.html ; echo "exit=$?"                                                    # no fetch under file:// → exit=1
grep -n 'width="1600" height="900"\|width="800" height="1200"' docs/spikes/art-check.html                       # the exported SVGs carry intrinsic size
grep -n 'id="selftest"' docs/spikes/art-check.html                                                              # the drivable self-test
node "$SCRATCH/dt11-art-selftest.mjs"                                                                           # every fixture row reports its stated verdict AND failing predicate; non-zero exit otherwise
grep -n 'bboxBottom\|bboxHeight\|bboxCentre' docs/spikes/art-check.html | head -4                               # the placement predicates a floating car would otherwise pass
grep -E '^\| DT11 \| (GO|GO-REDUCED|NO-GO-TREES|NO-GO-ALL|INVALID) \|' docs/roadmaps/drive-in-theme-roadmap.md   # nothing yet; exactly one row after Manual Verification
```

`$SCRATCH` is this session's scratch directory; both driver scripts are throwaway and
never committed. Each must **exit non-zero when a row mismatches** — a driver that only
prints is the same vacuous check as the outcome-word grep it replaces.

Expected, for the session that builds the files: both files exist, the DTF receipt is
untouched, every grep above prints its lines (with the counts stated: 20 posters, 16
clips), both self-test drivers exit 0, and the decision-record grep prints **nothing**.
Expected after Manual Verification: exactly one decision row, harness medians for all
five variants and both natural-wheel numbers in the probe header, and `scenery-overload`
lower than `scenery`.
</verification>

<commit>
```
docs(dt11): production-shaped scenery falsifier probe and the art checker page
```
Then, by whoever measures (Manual Verification step 4):
```
docs(dt11): decision record
```
</commit>

## Done

After this phase, portfolio_site has a measured answer to whether the trees and car can
ship (`GO` / `GO-REDUCED` / `NO-GO-TREES` / `NO-GO-ALL`) and a page that accepts or
rejects generated sprites per-pixel — nothing in `theater/` has changed.

Paste Phase DT12 (it does not wait on the verdict).

---

## Phase DT12: Period engine, `?period=` override, e2e pin

<task>
You are executing **Phase DT12 of the Drive-In Theme Roadmap** — adding the time-of-day
engine that sets `data-period` on the root from the visitor's clock or a `?period=`
override, and pinning the Playwright suite to `?period=night`, because every later phase's
CSS hangs on that attribute and the suite has to stay deterministic once the sky starts
following the clock.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md`, `react-frontend.md`, `tooling.md`; `theater/skills/rules-index/SKILL.md`
3. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- `theater/src/main.ts` is the standalone entry: it imports `./styles/global.css`, builds
  `createLoadingRing`, calls `createEngine({ host: standaloneHost(mount), scenes, persistentLayer: createPageChrome(mount), loadingRing, reducedMotionSteps: projects.length + 1 })`
  at line 82, then `engine.start()`, then wires the `focusin` drive. `theater/src/page/`
  holds only `chrome.ts`.
- `theater/src/styles/tokens.css` scopes every block `:host, :root` (`SDS-009`) and
  already has an opt-in theme block `:host([data-theme="light"]), :root[data-theme="light"]`
  at line 211 — the attribute-on-root pattern this phase reuses. **No period roles or
  blocks exist yet; this phase adds none.** Nothing visible changes in DT12.
- jourNOW's implementation, the source being ported (read it, do not rely on this
  summary): `/home/evan/EVOsystem/jourNOW/frontend/src/utils/timePeriod.ts` —
  `type Period = 'dawn' | 'morning' | 'afternoon' | 'sunset' | 'evening' | 'night'`,
  `getPeriod(date = new Date())` on `date.getHours()` (5–7 dawn, 8–11 morning, 12–16
  afternoon, 17–19 sunset, 20–21 evening, else night), `applyPeriod()` writing
  `document.documentElement.dataset.period`; `/home/evan/EVOsystem/jourNOW/frontend/src/main.tsx`
  lines 7–10 call `applyPeriod()` and re-apply on `document`'s `visibilitychange`.
- `theater/src/test-setup.ts` fakes `matchMedia` and `ResizeObserver`; tests import
  from `'vitest'` explicitly (`EVO-FE-220`); Vitest collects `src/**/*.test.ts` only.
- `theater/e2e/helpers/app.ts` exports `APP_PATH = "/theater/"` (line 54) and
  `openPage(page)` (line 129: `page.goto(APP_PATH)` then `waitForReveal`); every spec
  navigates through `openPage` except `theater/e2e/reveal.spec.ts`, which calls
  `page.goto(APP_PATH)` directly at lines 54 and 66. Playwright is `@playwright/test 1.62.1`
  (`page.clock.install` / `setFixedTime` exist); e2e runs against `pnpm build && pnpm preview`
  on port 4173 (`theater/playwright.config.ts`).
- Under Vitest `import.meta.env.BASE_URL` is `/`; nothing in this phase needs it.

**Out of scope:** any token, CSS or visual change (DT13); the sky/consumer assertions in
`period.spec.ts` (DT13 adds them).

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier and the vendored law for this phase:
- **EVO-FE-183** — query parameters go through `URL`/`URLSearchParams`, never string interpolation; the rule is written for *building* params and is applied here to *reading* the override, the same family — never split `location.search` by hand.
- **EVO-UNI-017 / EVO-UNI-018** — behaviour with literal expected values: every hour 0–23 maps to a named period in the test, not a recomputed band.
- **EVO-UNI-015** — *intentional departure, recorded:* the period tests build fixed-hour `Date`s (`new Date(2026, 0, 1, 9)`), not `Date.now()`-relative fixtures, because the unit under test is the hour band and a relative fixture would test whatever hour the suite happens to run at.
- **EVO-FE-220** — every test file imports `describe`/`it`/`expect`/`vi` from `'vitest'`.
- **EVO-TOOL-071** — the e2e waits on the attribute value (`expect(...).toHaveAttribute`), never a timeout.
- **EVO-UNI-061** — `period.spec.ts` is shown to fail once against a `periodForHour` that always returns `night`.
- **EVO-UNI-014** — grep every consumer of `APP_PATH` before adding `APP_URL` beside it; `nginx-parity.sh` keeps using the bare path.
- **SDS-009** — no token block is touched here, but the attribute goes on the element `:root[...]` matches (standalone: `document.documentElement`); an embedded host would install on its custom-element host instead — state this in `period.ts`'s header.
- **SDS-005** — no scroll or window listener beyond `visibilitychange` on the document.
</rules>

<reference_material>
Read these files before writing any code:
- `/home/evan/EVOsystem/jourNOW/frontend/src/utils/timePeriod.ts` and `main.tsx` lines 1–12 — the bands and the `visibilitychange` wiring; **do not copy the module-level `document` access** — this port takes `root`, `now` and `doc` as parameters so it is testable in jsdom without stubbing globals.
- `theater/src/main.ts` — where `installPeriod` goes (before `createEngine` at line 82) and the file's header style.
- `theater/src/page/chrome.ts` — the page-module style (header comment explaining the *why*, exported attribute constants, a `required()` throw for missing markup); mirror the shape.
- `theater/e2e/helpers/app.ts` — `APP_PATH`, `openPage`, `waitForReveal`, and the header's rule that selectors are imported from `src`, never re-typed.
- `theater/e2e/reveal.spec.ts` lines 40–70 — the two direct `page.goto(APP_PATH)` calls to move to `APP_URL`.
- `theater/e2e/reduced-motion.spec.ts` header — how a spec pins browser state *before* `goto` (`emulateMedia`); `page.clock.install` follows the same ordering rule.
</reference_material>

<constraints>
- **`theater/src/page/period.ts`** exports exactly: `PERIODS = ['dawn','morning','afternoon','sunset','evening','night'] as const`, `type Period = (typeof PERIODS)[number]`, `PERIOD_ATTRIBUTE = 'data-period'`, `PERIOD_PARAM = 'period'`, `periodForHour(hour: number): Period` (throws `RangeError` unless `Number.isInteger(hour) && 0 <= hour <= 23`), `getPeriod(date: Date = new Date()): Period` — **returns `periodForHour(date.getHours())` and holds no band logic of its own** (jourNOW's inlines the bands; this port must not, because the falsification below stubs `periodForHour` and relies on the clock path going through it), `periodFromSearch(search: string): Period | null` (exact match against `PERIODS`; absent, empty or unknown → `null`), `applyPeriod(root: HTMLElement, period: Period): void`, and `installPeriod(root: HTMLElement, options: { search: string; now?: () => Date; doc?: Document }): () => void` — applies `periodFromSearch(search) ?? getPeriod(now())` once; when there was **no** override, adds a `visibilitychange` listener on `doc` (default `root.ownerDocument`) that re-applies `getPeriod(now())` while `doc.visibilityState === 'visible'`; when overridden, adds no listener; returns a function that removes the listener. DT13's CSS and DT15's tests consume these names literally.
- **`theater/src/main.ts`**: `installPeriod(document.documentElement, { search: location.search })` runs before `createEngine` and its return value is discarded (the page never uninstalls); one comment says why it must precede the engine (the loader's curtain lifts on the first painted sky).
- **`theater/src/page/period.test.ts`** (jsdom): every hour 0–23 against its literal period (a 24-row table, not a loop over the bands); `periodForHour(24)`, `(-1)`, `(9.5)` throw `RangeError`; `periodFromSearch` for `'?period=dawn'` … `'?period=night'` (all six), `'?period=noon'` → `null`, `'?period='` → `null`, `''` → `null`, `'?other=1&period=sunset'` → `'sunset'`; `installPeriod` on a detached `<div>` with an injected `now`: clock 09:00 → attribute `morning`; `search: '?period=night'` at 09:00 → `night`; with no override, `now` moved from 19:59 to 20:00 and a `visibilitychange` dispatched on the injected `doc` → `evening`, and the same dispatch with `now` still 19:59 leaves `sunset`; with the override, the same steps leave `night`; after the returned uninstaller runs, a dispatch changes nothing. Use a plain `document` from jsdom as `doc` and `Object.defineProperty(doc, 'visibilityState', { value: 'visible', configurable: true })` where needed. No fake timers.
- **`theater/e2e/helpers/app.ts`**: add `PINNED_PERIOD: Period = 'night'` and `APP_URL = \`${APP_PATH}?${PERIOD_PARAM}=${PINNED_PERIOD}\`` (import `PERIOD_PARAM` and `Period` from `../../src/page/period`), switch `openPage` to `APP_URL`, add `periodAttribute(page): Promise<string | null>` reading `document.documentElement.getAttribute(PERIOD_ATTRIBUTE)`. `APP_PATH` stays exported and unchanged. `reveal.spec.ts`'s two `goto(APP_PATH)` become `goto(APP_URL)` and its now-unused `APP_PATH` import is removed (`noUnusedLocals` is on and `pnpm build` runs `tsc --noEmit` first — an unused import kills the whole e2e run).
- **`theater/e2e/period.spec.ts`**: one test per period navigating to `${APP_PATH}?period=<p>` and asserting the attribute; `?period=bogus` with `page.clock.install({ time: new Date('2026-09-08T18:30:00') })` before `goto` → `sunset`; no parameter at `03:00` → `night`; no parameter with the clock at `19:59:30`, reveal, `page.clock.setFixedTime(new Date('2026-09-08T20:00:30'))`, `page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))` → `evening`; the same under `?period=sunset` → still `sunset`. Every assertion is `await expect.poll(() => periodAttribute(page)).toBe('<p>')` — the helper is the one reader of the attribute, so it is not dead code.
- The full unit suite and the full e2e suite must be green with the pin in place; no other spec changes.
</constraints>

<build_order>

### 1. The engine
- [ ] Write `page/period.ts` and `page/period.test.ts`; make them pass.
- [ ] Wire `installPeriod` into `main.ts` before `createEngine`.

### 2. The pin
- [ ] Add `PINNED_PERIOD`, `APP_URL`, `periodAttribute` to `e2e/helpers/app.ts`; point `openPage` and `reveal.spec.ts` at `APP_URL`.
- [ ] Write `e2e/period.spec.ts`.

### 3. Prove
- [ ] Typecheck, lint, unit suite, e2e suite, build; format; run the falsification in `<verification>` and restore the file from its backup.

### 4. Session log
- [ ] Write the session log per `.claude/skills/writing-session-logs/SKILL.md`.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
pnpm format:check
pnpm -C theater typecheck && pnpm -C theater lint && pnpm -C theater test
# The new suite, all ✓. Two separate defects were measured here on 2026-09-08, so the form matters:
# (a) `pnpm exec vitest … --reporter=verbose` exits 1 with no output — pnpm parses `--reporter` as its OWN
#     flag, and a `--` is forwarded literally. Hence the binary directly.
# (b) `<test> | grep … | head -40` returns HEAD's status, so a Vitest that never starts reports success
#     (measured: `pipeline_exit=0 pipe_statuses=1 1 0`). `pipefail` is the wrong fix — head closing the
#     pipe would then create false failures. Capture, check the status, THEN render.
(cd theater && ./node_modules/.bin/vitest run --reporter=verbose src/page) > /tmp/dt12-vitest.log 2>&1; vitest_status=$?
grep -E '✓|✗|×' /tmp/dt12-vitest.log | head -40
echo "vitest exit=$vitest_status"                                                                              # must be 0 — this, not the glyphs, is the check
awk '/installPeriod\(document.documentElement/{a=NR} /createEngine\(\{/{b=NR} END{exit !(a && b && a<b)}' theater/src/main.ts && echo "period installed before the engine"   # must print
grep -n "location.search.split\|indexOf('period')" theater/src/page/period.ts ; echo "exit=$?"   # EVO-FE-183: exit=1
grep -n "APP_URL" theater/e2e/helpers/app.ts theater/e2e/reveal.spec.ts | wc -l      # ≥ 4 (definition, openPage, two reveal gotos)
grep -n "goto(APP_PATH)" theater/e2e/helpers/app.ts theater/e2e/reveal.spec.ts theater/e2e/{active-screen,click-through,drive,keyboard,reduced-motion}.spec.ts ; echo "exit=$?"   # exit=1 — period.spec.ts is exempt: its clock-fallback tests navigate unpinned by design
pnpm -C theater test:e2e                                                              # every spec green, including period
# Falsify (EVO-UNI-061): a clock that always says night must fail period.spec. period.ts is NEW and uncommitted here —
# `git checkout --` cannot restore an untracked file — so back it up and copy it back.
cp theater/src/page/period.ts /tmp/dt12-period.ts.bak
sed -i 's/^export function periodForHour(/export function periodForHour_(/' theater/src/page/period.ts && printf '\nexport function periodForHour(_hour: number): Period { return "night"; }\n' >> theater/src/page/period.ts   # typed stub: `pnpm build` (tsc) must still pass so the spec fails on behaviour, not compilation
(cd theater && ./node_modules/.bin/playwright test period) ; echo "period exit=$?"                   # non-zero (the two clock-fallback tests)
cp /tmp/dt12-period.ts.bak theater/src/page/period.ts && cmp /tmp/dt12-period.ts.bak theater/src/page/period.ts && echo "period.ts restored"
(cd theater && ./node_modules/.bin/playwright test period) ; echo "period exit=$?"                   # 0
```

Expected: unit and e2e suites green with the pin; the two greps that guard string
parsing and bare `goto(APP_PATH)` print nothing; the falsified `periodForHour` makes
`period.spec.ts` fail and the restored file makes it green again.
</verification>

<commit>
```
feat(dt12): time-of-day period engine with ?period= override; e2e pinned to night
```
</commit>

## Done

After this phase, portfolio_site's `/theater/` carries `data-period` on its root from
the visitor's clock (or `?period=`), re-evaluated on tab visibility, with nothing visible
changed and the whole Playwright suite pinned to night.

Paste Phase DT13.

---

## Phase DT13: Sky, orb, lighting roles, road markings, geometry-sized ground, six palettes

<task>
You are executing **Phase DT13 of the Drive-In Theme Roadmap** — giving the lot six
time-of-day palettes (sky, stars, sun/moon, asphalt, unlit-screen floor, glow), a road
with a dashed yellow centre line, and a ground plane sized from the geometry, because
DT12's attribute drives nothing yet and a daylight sky exposes that today's ground ends
behind the camera a third of the way down the lot.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md`, `react-frontend.md`; `theater/skills/rules-index/SKILL.md`
3. `.claude/skills/rebuild-restart/SKILL.md`
4. `.claude/skills/writing-session-logs/SKILL.md`

> ## ⚠ MEASURED BEFORE YOU START: the specified ground plane flickers (DT11, 2026-09-08)
>
> DT11's probe built this phase's ground and road exactly as specified below, and Evan
> found the **whole scene blinking during scroll in every variant, `lot20` included** —
> so it is not caused by the scenery. Production is unaffected today only because it
> still carries the old `height: 4800px` plane. Two independent causes, both measured in
> Chromium on Evan's hardware and both reproduced by the probe's `&ground=` / `&road=`
> switches (`docs/spikes/2026-09-08-scenery-probe.html`):
>
> 1. **The ground plane exceeds the GPU's texture limit.** `MAX_TEXTURE_SIZE` is
>    **8192px**; `groundDepth(20)` is **20800px**, 2.5x that in one dimension, so Chromium
>    must tile the plane. Composited layers measured at `4000 x 20800 = 83.2 Mpx` for the
>    ground and `420 x 20800 = 8.7 Mpx` for the road, putting the page at **145 Mpx
>    (~580 MB of texture)**. Capping the depth at 8000px takes it to 88 Mpx (~354 MB) and
>    the blinking stops completely.
> 2. **The road is exactly coplanar with the asphalt.** `.sds-lot__ground::after` is its
>    own composited layer at the *same* Z as the plane it sits on — two surfaces with no
>    depth order, re-sorted every frame. Giving it 1px of Z visibly reduces the blinking.
>    **The sign is negative:** the parent's `rotateX(-90deg)` maps a child's local +Z onto
>    world *down*, so `translateZ(1px)` buries the road under the opaque asphalt and
>    `translateZ(-1px)` lifts it out. (Confirmed the hard way — the first diagnostic used
>    the wrong sign and the road vanished.)
>
> **The cap is not the fix.** 20800px *is* this phase's fix for the 20-screen lot, and
> 8000px re-opens the bug it was solving (the far screens stand on sky again). This phase
> needs a ground that spans `groundDepth(count)` with **no single layer over ~8192px**.
> Two candidates, neither yet built or measured:
> - **Section the plane** — N sibling planes of `groundDepth(count) / N` each, stacked
>    along Z, with the `linear-gradient(180deg, asphalt, asphalt-far)` sliced across them
>    so the fade still reads as one surface (a naive split repeats the fade N times).
> - **Fold the road into the ground's own background stack** — the road is three gradients
>    and the ground is already a gradient stack; a `420px`-wide, `center`-positioned
>    background layer would delete the second composited layer and the coplanarity
>    together, and is worth doing regardless of how cause 1 is solved.
>
> Whichever is chosen, **re-check it on real GPU hardware**: headless Chromium cannot see
> this at all. Renders at `translateZ` of none / `+1px` / `-1px` / `-4px` are
> pixel-identical, because software rasterisation sorts coplanar surfaces
> deterministically. The `groundDepth` literals in the tests below (`11200`, `20800`) may
> need to change with the design; the *depth the plane spans* must not.

> ## ✅ RESOLVED IN DT13 (2026-09-09) — neither candidate; the plane is SQUASHED
>
> Both candidates were built and measured against a scripted scrub in headless Chromium
> (1440x900, `?period=afternoon`, mean ms/frame over 120 scrubbed frames):
>
> - **Folding the road into the ground's background stack: kept.** It removes the second
>   composited layer and cause 2 outright, exactly as predicted, and costs nothing —
>   0.2 ms/frame. `.sds-lot__ground::after` no longer exists; the road is three layers of
>   the asphalt's own `background`, so a road drawn *by* the asphalt cannot fight it.
> - **Sectioning the plane: measured and REJECTED.** N abutting planes cost precisely what
>   one plane costs, because the total rastered **area** is unchanged and the area — not
>   the tiling — is what hurts: `groundDepth(20)` measured **137.9 ms/frame as three
>   abutting 4000x6934 planes and 134.0 as one 4000x20800 plane**. It satisfies the letter
>   of "no single layer over 8192px" and fixes nothing. The section machinery was written,
>   tested, measured and deleted.
> - **What shipped: `GROUND_SQUASH`.** The plane is laid out `groundDepth(count) / 4` px
>   deep and `scaleY(4)`d back out, so it spans the same world Z on a quarter of the
>   texture, and every depth-direction length it paints (the 140/320px dash period, the
>   780/784px parking rows) is divided by the same constant so it cancels. 134 → 51
>   ms/frame; the twenty projects `projects.ts` holds rasterise at **4000x5200** — one
>   untiled layer, and 20.8 Mpx against the 19.2 Mpx of the 4800px plane it replaces, so
>   two and a half times the depth for roughly the same texture. (The frame cost rises by
>   more than that ratio because the ground now reaches the horizon and covers about twice
>   as many *screen* pixels, which is the feature.) At squash 4 the cap is crossed at 35
>   projects, and `geometry.test.ts` asserts the invariant against `projects.length` so the
>   thirty-fifth project fails the suite rather than shipping a tiled plane.
>   **4 is the largest squash the markings survive** — the thinnest painted feature is the
>   4px parking-row hairline, which is one texel at 4, two-thirds of one at 6 and half of
>   one at 8; 6 and 8 measurably wash the rows and the near dash's edges out.
>
> `groundDepth(8) = 11200` and `groundDepth(20) = 20800` are unchanged and still asserted:
> the depth the plane *spans* did not move, only how many texels are spent on it.
>
> **CONFIRMED ON REAL HARDWARE (Evan, 2026-09-09).** Squash 1 — the unsquashed 20800px
> plane, reachable live with
> `document.querySelector('.sds-lot').style.setProperty('--sds-ground-squash','1')` and no
> rebuild — reproduces DT11's blinking during scroll, **and a second symptom DT11 did not
> name: scrubbing backwards, the road falls away.** Squash 4 is clean. 6 and 8 were tried
> and make no visible difference, so 4 stands, being the value that keeps the parking rows
> sharpest. That console override is the diagnostic to reach for if this regresses.
>
> **Still open, and lower stakes than it looked: does the raster scale track DPR?** The cap
> is in CSS pixels; `MAX_TEXTURE_SIZE` is in device texels, the same unit only at DPR 1, so
> a 2x display would nominally put the plane at 10400 texels — back over 8192. Measured
> against it: emulating DPR 2 is real in headless (a 400x300 viewport screenshots at
> 800x600), and the ground's *marginal* frame cost is unchanged (33.8ms at DPR 1, 32.4ms at
> DPR 2) where a DPR-tracking raster would cost about four times as much, while the same
> measurement is sharply sensitive to the CSS size (14.2ms at squash 8). That points at
> Chromium pinning the raster scale under `.sds-lot__world`'s animating
> `will-change: transform` — but it is not decisive, because headless exposes no
> `LayerTree` and SwiftShader shows no symptom. Browser zoom on real hardware settles it if
> it ever matters. Both bounds scale together — the texture rule wants
> `k >= depth * dpr / 8000` and the one-texel rule `k <= 4 * dpr` — so `k = 4 * dpr` holds
> at any density and pins the plane at a constant 5200 device texels; making the squash
> DPR-aware is a small correct change the day a high-density display is shown to suffer.
> This gap is DT11's too: its `20800 against 8192` is the same unit mismatch.

<context>
## What's already built

- DT12 landed `theater/src/page/period.ts` (`PERIODS`, `Period`, `PERIOD_ATTRIBUTE = 'data-period'`,
  `PERIOD_PARAM = 'period'`, `periodForHour`, `getPeriod`, `periodFromSearch`,
  `applyPeriod`, `installPeriod`), wired in `theater/src/main.ts` before `createEngine`,
  so `<html data-period="…">` is set before the loader's curtain lifts. The e2e helpers
  export `APP_PATH = "/theater/"`, `PINNED_PERIOD = 'night'`, `APP_URL` (path + `?period=night`),
  `periodAttribute(page)`; `openPage` uses `APP_URL`; `theater/e2e/period.spec.ts` asserts
  the attribute for six overrides, two clock fallbacks and the `visibilitychange`
  re-application.
- `theater/src/styles/tokens.css`: palette primitives then semantic roles, every block
  `:host, :root` (`SDS-009`); the lot roles today are `--sds-sky` (a gradient of
  `var(--sds-bg) 0%, var(--sds-lot-sky-mid) 45%, var(--sds-lot-sky-low) 100%`, line 95),
  `--sds-star`, `--sds-star-warm`, `--sds-star-cool`, `--sds-asphalt` (`#14102b`, line 52),
  `--sds-asphalt-far` (`#0a0520`), `--sds-marquee`, `--sds-screen-*`; a
  `[data-theme="light"]` block at line 211 and a reduced-motion block at 233. The header
  says why every block is `:host, :root`.
- `theater/src/styles/global.css`: `.sds-lot` (line 196) carries the ten star
  `radial-gradient`s **and** `var(--sds-sky)` in one `background` stack;
  `.sds-lot__world` (224); `.sds-lot__ground` (253) is `width: 4000px; height: 4800px;`
  `transform: rotateX(-90deg) translateZ(0)` with a parking-row `repeating-linear-gradient`
  over `linear-gradient(180deg, var(--sds-asphalt) 0%, var(--sds-asphalt-far) 70%)`;
  `.sds-lot__ground::after` (272) is the 420px lane — a faint purple horizontal gradient;
  `.sds-screen__surface` (318) has `filter: brightness(calc(0.35 + 0.65 * var(--sds-screen-lit, 0)))`
  (line 335) and a `box-shadow` whose second layer is
  `color-mix(in srgb, var(--sds-marquee) calc(var(--sds-screen-lit, 0) * 10%), transparent)`;
  `.sds-screen__marquee` (388) uses `color-mix()` for background, border and a
  `box-shadow` at `calc(var(--sds-screen-lit, 0) * 30%)`; the narrow block starts at 448.
- `theater/src/lot/geometry.ts`: `SPACING = 800` (line 39), `OFFSET`, `YAW_DEG`,
  `GROUND_LINE = 0.58` (53), `VH_PER_SCREEN`, `screenPlacement`, `lotZ(progress, count)`
  (100) `= clamp01(progress) * SPACING * (count + 1)`, `activeScreen`, `screenProgress`.
  `theater/src/lot/geometry.test.ts` asserts literal values and states why
  (`EVO-UNI-109`).
- `theater/src/lot/build-lot.ts`: `buildLot(projects)` creates the stage (`.sds-lot`),
  writes `GROUND_LINE_PROPERTY = '--sds-ground-line'` onto it as a rounded percentage
  (line 180), builds the world, appends the ground and the screens, and returns the
  timeline; helper `element(tag, className)` at line 309. `theater/src/lot/build-lot.test.ts`
  has a case "hands the stylesheet the horizon the placement was computed against"
  (line 180) reading the stage's inline property — the model for the two new properties.
- The approved wireframe `docs/wireframes/theater-drive-in-theme.html` (approved
  2026-09-08) is the source for every value: the six `:root[data-period]` blocks (sky
  stops, asphalt, `--sds-star-alpha`, `--sds-tree`, `--sds-unlit-floor`, `--sds-glow`,
  `--sds-headlight`, `--sds-orb*`), the road roles (`--sds-road-line: #e8c547`,
  `--sds-road-edge: rgba(240,240,255,.35)`), `.lot::before` (the star layer at
  `opacity: var(--sds-star-alpha)`), `.lot__orb`, `.lot__ground` (`height: 20800px`,
  `transform: translateZ(800px) rotateX(-90deg)` — the built page derives both from
  geometry), `.lot__ground::after` (the lane: dashed centre line via a
  `repeating-linear-gradient` sized `14px 100%` at `center top`, 4px edge lines,
  `color-mix(in srgb, var(--sds-asphalt) 78%, black)`), and the two lighting expressions.
  The spec's tokens table lists the night values (they equal today's).
- The Playwright suite is pinned to `?period=night`, so every existing assertion holds
  through this phase; `period.spec.ts` is where the visible consequences get asserted.
- **This phase runs under any DT11 outcome, including `INVALID`** — nothing here depends
  on the falsifier; do not wait for its decision row.

**Out of scope:** trees, car, beam, art (DT15); any change to `--sds-screen-lit` or the
timeline; the hero/exit beats.

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier and the vendored law for this phase:
- **SDS-009** — every new block is `:host([data-period="x"]), :root[data-period="x"]`, never `:root[...]` alone.
- **EVO-UNI-001 / EVO-UNI-002 / EVO-UNI-030** — `global.css` reads roles only; no hex, no `var(--x, #hex)` fallbacks. The period blocks set semantic roles with raw values — a recorded structural departure inside `tokens.css` (comment it there: six palettes with one consumer each do not earn a primitives layer).
- **EVO-UNI-057** — `GROUND_LEAD` and `groundDepth` live in `geometry.ts`; the CSS receives them as custom properties written by `buildLot`, exactly like `--sds-ground-line`.
- **EVO-UNI-109** — `groundDepth(8)` is asserted as `11200` and `groundDepth(20)` as `20800`, never as `lotZ(1, n) + 5 * SPACING` recomputed in the test.
- **EVO-UNI-048** — the built lot carries everything the approved wireframe shows: orb, star layer, road markings, ground to the horizon in every period.
- **EVO-UNI-017** — the e2e observes consumers (computed `background-image`, `filter`, `::before` opacity), not token declarations — a declared-but-unwired token passes a `getPropertyValue` check.
- **EVO-UNI-061** — the sky assertion is shown to fail once against a `.sds-lot` background that ignores `--sds-sky-top`.
- **EVO-FE-239** — tokens stay first in the module graph (unchanged).
- **EVO-TOOL-111** — the served check needs `rebuild-restart`.
</rules>

<reference_material>
Read these files before writing any code:
- `docs/wireframes/theater-drive-in-theme.html` — the `<style>` block: copy the six period blocks' values, the road roles, `.lot::before`, `.lot__orb`, `.lot__ground`, `.lot__ground::after`, and the two lighting expressions; **do not copy the switcher, the `.note`s, or the literal `20800px`/`800px` ground numbers** — those come from geometry at runtime.
- `theater/src/styles/tokens.css` — the block structure, the `:host, :root` rule, and the `--sds-sky` definition to recompose from three stops.
- `theater/src/styles/global.css` lines 196–300 and 318–420 — the rules being edited.
- `theater/src/lot/build-lot.ts` lines 159–190 — where the stage properties are written and where the orb is appended (to the stage, after the world, so it sits behind nothing 3D but is not inside `.sds-lot__world`).
- `theater/src/lot/build-lot.test.ts` line 180 — the horizon-property test to mirror.
- `theater/src/lot/geometry.test.ts` — the literal-value style.
- `theater/e2e/period.spec.ts` and `theater/e2e/helpers/app.ts` (`screenLocator`, `scrollToScreen`, `screenBandMiddle`) — where the consumer assertions go and how to drive to a band.
</reference_material>

<constraints>
- **`geometry.ts`**: export `GROUND_LEAD = SPACING` and `groundDepth(count: number): number` returning `lotZ(1, count) + 5 * SPACING`. **`build-lot.ts`**: export `GROUND_LEAD_PROPERTY = '--sds-ground-lead'`, `GROUND_DEPTH_PROPERTY = '--sds-ground-depth'`, `LOT_ORB_CLASS = 'sds-lot__orb'`; write both properties on the stage in px (`800px`, `20800px` for 20 projects) beside `--sds-ground-line`; append `<div class="sds-lot__orb" aria-hidden="true">` to the stage after the world.
- **`tokens.css`**: in the base `:host, :root` block add, at their night values, `--sds-sky-top/mid/low` (`#0a0520`, `#0d1033`, `#120a2e`), `--sds-star-alpha: 1`, `--sds-tree: #05030f`, `--sds-unlit-floor: 0.35`, `--sds-glow: 1`, `--sds-headlight: 1`, `--sds-beam`, the six `--sds-orb*` roles, and the two road roles; recompose `--sds-sky` from the three stops (`--sds-lot-sky-mid`/`-low` primitives may be retired in favour of the stops — keep the rendered gradient identical); then six `:host([data-period="…"]), :root[data-period="…"]` blocks transcribed from the wireframe, each restating only the roles the wireframe restates (night restates `--sds-star-alpha` only). `--sds-road-line`/`--sds-road-edge` are declared once and never restated.
- **`global.css`**: `.sds-lot { background: var(--sds-sky) }`; the ten star gradients move to `.sds-lot::before` (`content: ""; position: absolute; inset: 0; pointer-events: none; opacity: var(--sds-star-alpha)`, painted behind the world — give `.sds-lot__world` and the orb explicit `z-index`es per the wireframe); `.sds-lot__orb` from the wireframe; `.sds-lot__ground { height: var(--sds-ground-depth); transform: translateZ(var(--sds-ground-lead)) rotateX(-90deg); }` with the existing gradients; `.sds-lot__ground::after` becomes the wireframe's lane; `.sds-screen__surface`'s filter becomes `brightness(calc(var(--sds-unlit-floor) + (1 - var(--sds-unlit-floor)) * var(--sds-screen-lit, 0)))`; **only the three `box-shadow` colour mixes** gain `* var(--sds-glow)` inside their `calc()` — the surface's marquee-coloured halo, a **new second halo layer** `0 0 30px color-mix(in srgb, var(--sds-accent) calc(var(--sds-screen-lit, 0) * var(--sds-glow) * 20%), transparent)` that the approved wireframe shows on the lit screen, and the marquee's `box-shadow`; the marquee's `background` and `border` mixes stay at `calc(var(--sds-screen-lit, 0) * 100%)` so a lit marquee is fully lit in daylight too (the wireframe sets them flat). No other rule changes.
- **Tests**: `geometry.test.ts` gains the two literal `groundDepth` values and `GROUND_LEAD` equal to `800`; `build-lot.test.ts` gains a case asserting the stage's inline `--sds-ground-lead` is `800px` and `--sds-ground-depth` is `${groundDepth(projects.length)}px`, and that exactly one `.sds-lot__orb` exists **outside** `.sds-lot__world`. `period.spec.ts` gains, for `afternoon` and `night`: `.sds-lot`'s computed `background-image` contains `rgb(59, 120, 200)` / `rgb(10, 5, 32)`; `getComputedStyle(lot, '::before').opacity` is `'0'` / `'1'`; after `scrollToScreen(page, 0)`, screen 1's `.sds-screen__surface` computed `filter` is `brightness(0.75)` / `brightness(0.35)`; plus one **unpinned daytime visit**: `page.clock.install({ time: new Date('2026-09-08T14:00:00') })`, `goto(APP_PATH)`, `waitForReveal`, `scrollToScreen(page, 1)`, click screen 1, `waitForURL` for `projects[1].href`.
- The night rendering of the sky gradient, asphalt, brightness and marquee must be numerically identical to before this phase (the base values are today's values); confirm with the greps below.
</constraints>

<build_order>

### 1. Geometry and DOM
- [ ] Add `GROUND_LEAD` and `groundDepth` with literal tests; write the two properties and the orb in `buildLot`, with the `build-lot.test.ts` case.

### 2. Tokens and CSS
- [ ] Add the roles and six period blocks to `tokens.css` (with the departure comment); rewrite the lot rules in `global.css` per `<constraints>`.

### 3. Prove
- [ ] Extend `period.spec.ts` with the consumer assertions and the unpinned daytime visit; typecheck, lint, unit, e2e, build; `rebuild-restart`; compare each period against the wireframe at 1440×900 and 390px; run the falsification in `<verification>` and restore the file from its backup.

### 4. Session log
- [ ] Write the session log per `.claude/skills/writing-session-logs/SKILL.md`.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
pnpm format:check
pnpm -C theater typecheck && pnpm -C theater lint && pnpm -C theater test
grep -c ':host(\[data-period=' theater/src/styles/tokens.css                          # 6
[ "$(grep -c ':host(\[data-period=' theater/src/styles/tokens.css)" = "$(grep -c ':root\[data-period=' theater/src/styles/tokens.css)" ] && echo "every period block has its :host twin"   # SDS-009; must print (Prettier puts the two selectors on separate lines, so a per-line grep cannot check this)
grep -nE 'var\(--[a-z0-9-]+, *#[0-9a-fA-F]{3}' theater/src/styles/*.css ; echo "exit=$?"     # no hex fallbacks → exit=1
grep -n 'height: 4800px' theater/src/styles/global.css ; echo "exit=$?"                      # the fixed ground depth is gone → exit=1 (prints one line today)
grep -n 'var(--sds-ground-depth)\|var(--sds-ground-lead)' theater/src/styles/global.css    # both read
grep -n 'sds-road-line' theater/src/styles/global.css theater/src/styles/tokens.css        # the centre line exists and is a role
grep -n 'brightness(calc(var(--sds-unlit-floor)' theater/src/styles/global.css             # the floor expression
grep -n 'groundDepth\|GROUND_LEAD' theater/src/lot/geometry.ts theater/src/lot/build-lot.ts | head
pnpm -C theater test:e2e                                                               # green, including the new period assertions
docker compose build && docker compose up -d --force-recreate
curl -s -o /dev/null -w '%{http_code}\n' "http://portfolio-site.localhost/theater/"   # 200 — the container is up (the period itself is proven by period.spec, not by curl)
# Falsify (EVO-UNI-061): a sky that ignores the period must fail period.spec. global.css holds this phase's
# UNCOMMITTED work — `git checkout --` would erase it — so back it up and copy it back.
cp theater/src/styles/global.css /tmp/dt13-global.css.bak
sed -i 's/^\.sds-lot {$/.sds-lot { background: #0a0520 !important;/' theater/src/styles/global.css
(cd theater && ./node_modules/.bin/playwright test period) ; echo "period exit=$?"                    # non-zero
cp /tmp/dt13-global.css.bak theater/src/styles/global.css && cmp /tmp/dt13-global.css.bak theater/src/styles/global.css && echo "global.css restored"
(cd theater && ./node_modules/.bin/playwright test period) ; echo "period exit=$?"                    # 0
```

Manual (browser, `http://portfolio-site.localhost/theater/?period=<p>` for all six, and
with no parameter): the sky, stars, orb, asphalt, road markings and screen floor match
`docs/wireframes/theater-drive-in-theme.html` at that period; the ground reaches the
horizon at progress 0 and still does past the last screen; at 390px wide the narrow
layout holds. Night with no parameter is indistinguishable from `?period=night`.

Expected: every grep as noted; unit and e2e green; the falsified sky fails
`period.spec.ts` and the restored file makes it green again; six palettes visible on the
served page.
</verification>

<commit>
```
feat(dt13): six time-of-day palettes, sun/moon orb, road markings, geometry-sized ground
```
</commit>

## Done

After this phase, portfolio_site's `/theater/` shows the visitor's time of day — sky,
stars, sun or moon, asphalt and screen lighting — over a marked road whose ground
reaches the end of the lot, in every period.

Next: if DT11's decision row is `GO`, `GO-REDUCED` or `NO-GO-TREES`, paste Phase DT14
(Evan; needs DT11's checker page). If it is `NO-GO-ALL` the theme is complete here; if
`INVALID`, DT11 is re-measured first.

---

## Phase DT14: Generate, accept and commit the four sprites `[MANUAL]`

Executed by Evan, not an agent. This is a checklist; there is no `<build_order>`.

**Gate:** runs only if DT11's decision row is `GO`, `GO-REDUCED` or `NO-GO-TREES`. Under
`NO-GO-TREES` only the car is required (the three tree stems may be skipped; DT15 then
declares posters + car only). Under `NO-GO-ALL` or `INVALID` this phase is not executed.

**What lands:** `theater/public/art/car.png`, `tree-1.png`, `tree-2.png`, `tree-3.png`
(or, on the fallback, the same stems as `.svg`), committed as
`feat(dt14): drive-in art sprites`.

**Reference for the car:** `c:/Users/evan/Pictures/pics/3rd-row-facing-backwards-seats-in-a-station-wagon-v0-svsr4ztptt5d1.jpg`
— a late-1970s wood-panelled full-size wagon from behind, tailgate glass down, kids in
the rear-facing third row waving out the back.

**Prompts (any image model; adjust wording to the tool, keep every constraint):**

- *Car:* "Flat vector-style illustration, straight rear view of a late-1970s American
  full-size station wagon: tan body with wood-grain side panels, chrome rear bumper,
  vertical tail-lights, roof rack. The tailgate window is rolled down and two or three
  kids in the rear-facing third-row seat look out the back toward the viewer, one waving.
  Centred, whole car visible, no ground, no shadow, no text, no licence-plate text,
  transparent background, PNG with a real alpha channel, 1600×900."
- *Trees (one prompt each):* "Solid black silhouette of a single [broad deciduous oak /
  conifer pine / tall narrow poplar] tree with one trunk reaching the bottom edge of the
  image, centred, no ground, no other objects, transparent background, PNG with a real
  alpha channel, 800×1200."

**Checklist:**

1. Generate each file. If the tool offers a size, ask for the contract's; otherwise
   resize afterwards in the tool.
2. Open `docs/spikes/art-check.html` (DT11) over `file://`, drop the files in, and read
   the card per file: **structural PASS** on dimensions, corner alpha, transparent
   fraction, bounding box **width, height, bottom and horizontal centre**, size, and **no
   checkerboard WARN**. A WARN or FAIL means regenerate (ask explicitly for "transparent
   background with a real alpha channel, not a checkerboard") or fix in the tool; do not
   hand-edit pixels.
   *Why the placement predicates are in the structural half:* every sprite is drawn into a
   fixed box with `object-fit: contain`, so where the subject sits inside its canvas is
   where it sits on the page. Without them, a genuinely correct, readable rear-view wagon
   occupying an opaque 1200×500 region at `y = 0` — corners transparent, ~58 % transparent
   overall, bbox 1200px wide, under 400 KB — passes every other check and every visual
   statement below, and then floats above the road in the shipped car box. That
   counterexample was constructed and confirmed against this checklist (Part 3B).
3. Look at the composite strip for each file and confirm the visual statements, now
   including placement:
   - the subject is the one described;
   - nothing but the subject is opaque (no baked checkerboard, halo or backdrop);
   - **the car's wheels and body baseline sit on the bottom edge of its canvas, and the
     wagon is horizontally centred** — judged in the 320px composite, at the size it
     actually ships;
   - the trunk reaches the bottom edge (trees);
   - the tail-lights and rear window read at 320px wide (car).
   Structural PASS without these is not acceptance.
4. `mkdir -p theater/public/art` and copy the four files in with the contract names.
   Commit immediately (`EVO-UNI-090`): `git add theater/public/art && git commit -m "feat(dt14): drive-in art sprites"`.
5. **Fallback**, if after a reasonable number of tries a file cannot pass both halves:
   use the checker's "download placeholder set" for the failing stem(s) — but the
   extension must be uniform across all four (`ART_EXTENSION` is one value), so on any
   fallback take all four SVGs, commit them as `theater/public/art/*.svg`, and note in the
   commit message that DT15 must set `ART_EXTENSION = 'svg'`.
6. Write the session log (`writing-session-logs`), naming which files came from which
   tool and whether the fallback was taken.

## Done

After this phase, portfolio_site has the sprites the scenery phase places (four, or the
car alone under `NO-GO-TREES`), each accepted per-pixel and by eye.

Paste Phase DT15 (needs DT11's decision row, DT13 and these files).

---

## Phase DT15: Trees, the visitor's car, the beam — modules, DOM, loader, CSS, unit and contract tests

<task>
You are executing **Phase DT15 of the Drive-In Theme Roadmap** — lining the drive with
masked tree planes that ride the existing world tween, parking the visitor's wagon with
its headlight beam and tail-light glows at the bottom of the stage, and declaring the
sprites through the asset loader, all proven by unit tests and the conformance kit —
because this is the phase that turns a lit lot into a drive-in; DT16 then proves it in a
browser.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md`, `react-frontend.md`, `tooling.md`; `theater/skills/rules-index/SKILL.md` (`SDS-001`–`SDS-006` are load-bearing here)
3. `.claude/skills/rebuild-restart/SKILL.md`
4. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- **DT11's decision row** at the bottom of this roadmap says `GO`, `GO-REDUCED` or
  `NO-GO-TREES` (this phase must not run under `NO-GO-ALL` or `INVALID`; see `<branch>`).
- **DT14's art** is committed under `theater/public/art/` as `car`, `tree-1`, `tree-2`,
  `tree-3` (car only under `NO-GO-TREES`) with one extension for all (`.png`, or `.svg`
  on the fallback). Vite copies `public/` into `dist/` unhashed under `base: '/theater/'`,
  so the served URLs are `/theater/art/<name>.<ext>`.
- **DT13** landed in `theater/src/lot/geometry.ts`: `GROUND_LEAD = SPACING`,
  `groundDepth(count)`; in `theater/src/lot/build-lot.ts`: `GROUND_LEAD_PROPERTY`,
  `GROUND_DEPTH_PROPERTY`, `LOT_ORB_CLASS = 'sds-lot__orb'` (an orb `<div>` appended to
  the stage after the world); in `theater/src/styles/tokens.css`: `--sds-tree`,
  `--sds-headlight`, `--sds-beam` and the rest of the period roles, six
  `:host([data-period]), :root[data-period]` blocks; in `theater/src/styles/global.css`:
  `.sds-lot::before` stars, `.sds-lot__orb`, the geometry-sized ground and the marked
  lane, the floor/glow expressions. The narrow block (`max-width: 767px`) restates the
  screens' `--sds-screen-x`/`--sds-screen-yaw` with `!important` because `buildLot` writes
  placement as inline custom properties.
- **DT12** landed `theater/src/page/period.ts` and the e2e pin (`APP_URL`,
  `PINNED_PERIOD`, `periodAttribute` in `theater/e2e/helpers/app.ts`). Nothing in this
  phase touches `e2e/`.
- `theater/src/lot/build-lot.ts`: `buildLot(projects): GsapTimelineBuilder` builds the
  stage, writes the stage properties, builds `.sds-lot__world` with the ground then the
  screens (`world.append(...screens)` at line 187), returns the timeline; exports the
  class/attribute/property constants (`SCREEN_CLASS`, `SCREEN_INDEX_ATTRIBUTE`,
  `SCREEN_LIT_PROPERTY`, `SCREEN_X_PROPERTY`, …); `element(tag: "div" | "span", className)`
  helper at line 309. **It reads no `import.meta.env`** — `theater/e2e/helpers/app.ts`
  imports it under Playwright's Node runner, where `import.meta.env` is `undefined` and
  any read throws `Cannot read properties of undefined (reading 'BASE_URL')`.
- `theater/src/lot/lot-scene.ts`: `class LotScene` — `load()` (line 187) sets
  `units = projects.length + 1`, queues every poster via
  `sharedAssetLoader.add({ url: project.poster, kind: 'image' })` **before**
  `await this.#inner.load(...)` (line 210), and only **after** that await (the lot's DOM
  does not exist earlier — see the long comment there about the first seek) wires clip
  fallbacks and, once `Promise.all(posters)` resolves (line 245), calls
  `#placePoster(i, image, project)` (line 409) which checks
  `naturalWidth/Height >= MIN_POSTER_PX` and sets `data-poster="ready|missing"`;
  `destroy()` (292) pauses videos, `sharedAssetLoader.release(project.poster)` per
  project, then destroys the inner adapter; `snapshot()` (311) returns
  `{ progress, lotZ, activeScreen, timelineProgress, loadedPosters, playing, worldTransform, lit }`.
- `theater/src/loader/asset-loader.ts`: `add({ url, kind: 'image' }): Promise<HTMLImageElement>`
  (same URL twice → the first promise), `release(url)`, a 404 settles as an element with
  `naturalWidth 0`, never rejects. `theater/src/test-helpers/fake-image.ts`:
  `createFakeImages({ autoSettle: (url) => size | null })` — keyed by URL, so one asset
  can fail while the rest pass; `fake.inFlight()` lists requested URLs in order.
- `theater/src/lot/lot-scene.contract.test.ts` line 76 asserts
  `fake.inFlight().map(src)` equals exactly `projects.map(p => p.poster)` — "and nothing
  else". `theater/src/lot/lot-scene.test.ts` builds a three-project lot with
  `createFakeImages({ autoSettle: () => ({ width: 1280, height: 800 }) })` and tests the
  clip lifecycle; `theater/src/lot/build-lot.test.ts` drives the real GSAP timeline.
- Under Vitest `import.meta.env.BASE_URL` is `/` (probed 2026-09-08), not `/theater/`.
- `theater/src/styles/global.css`: `.sds-screen` sits at
  `bottom: calc(100% - var(--sds-ground-line))` (line 302 area) — the ground line is a
  property `buildLot` writes, never the literal `42%` the wireframe uses.
- The spec (`docs/superpowers/specs/2026-09-08-drive-in-theme-design.md`, "Scenery")
  and the approved wireframe fix the geometry and CSS: trees at `x = ±(OFFSET + TREE_SETBACK + dx)`,
  the eight-entry jitter table, `260×390` (narrow `180×270`, `x = ∓360px !important`),
  `visibility: hidden` unless `data-mask="ready"`; the car `clamp(320px, 38vw, 620px)`
  (narrow `64vw`), `aspect-ratio: 16 / 9`, `bottom: -1%`, glows on `::before/::after` at
  `opacity: var(--sds-headlight)`; the beam trapezoid (narrow `width: 70%`). **The stage
  `.sds-lot` does not opt out of hit-testing** (only `.sds-lot__world` does, line 224
  area), so anything appended to the stage hit-tests unless told not to.

**Out of scope:** any period/token change (DT13 owns them); every Playwright spec, the
parity script and the served comparison (DT16); parked cars; motion of any kind on the
car or trees.

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier and the vendored law for this phase:
- **SDS-006** — the car sprite and the tree masks are declared through `sharedAssetLoader` in `load()` and released in `destroy()`; a tree's `mask-image` is set only after the loader has resolved that URL, so the CSS fetch is a cache hit and the ring's number stays true.
- **SDS-001** — placements come from a fixed table; a rebuilt scene is identical; nothing here animates.
- **SDS-002** — trees, car, beam live inside the container the adapter was handed.
- **SDS-003** — the contract run still passes with a bigger `load()`; its "nothing else" assertion is widened, not deleted.
- **SDS-004** — no layout reads in `seek`; `snapshot()`'s new fields are DOM counts and attributes, not measurements.
- **EVO-UNI-053** — a missing car is `data-car="missing"` with the beam and glows still drawn in a box of real height; a missing mask variant is `visibility: hidden`, never a filled rectangle.
- **EVO-UNI-057** — `TREE_SETBACK`, `TREE_SPACING`, `TREE_LEAD`, `TREE_JITTER`, `MIN_CAR_PX`, every class/attribute/property name live once; the CSS receives placements as properties and the tree's bottom is `calc(100% - var(--sds-ground-line))`, never the wireframe's `42%`.
- **EVO-UNI-109** — placement tests assert literals (`-900`, `-100`, `940`, `-300`, `40`, `88`), never the formula.
- **EVO-UNI-014** — `LotSnapshot` gains fields; grep its consumers (`lot-scene.contract.test.ts`, `build-lot.test.ts`) first.
- **EVO-FE-220** — every new test imports from `'vitest'`.
</rules>

<reference_material>
Read these files before writing any code:
- `theater/src/lot/lot-scene.ts` — `load()`'s ordering (queue before the inner load, place after it), `#placePoster`, `destroy()`, `snapshot()`; **the art follows the poster path exactly**; do not add a `factory.assets` manifest (the header says why).
- `theater/src/lot/build-lot.ts` — `buildLot`, `buildScreen`, `element()`, the exported-constant convention (every class/attribute/property name is exported once; the CSS and tests spell it from there).
- `theater/src/lot/geometry.ts` and `geometry.test.ts` — the pure-module and literal-test style `scenery.ts` mirrors.
- `theater/src/lot/lot-scene.contract.test.ts` line 76 and `lot-scene.test.ts` — where the widened asset assertion and the new cases go.
- `theater/src/test-helpers/fake-image.ts` — `autoSettle(url)` keyed by URL.
- `theater/src/styles/global.css` — the `.sds-screen` placement rule (its `bottom` expression is the one `.sds-tree` copies) and the narrow block's `!important` pattern.
- `docs/wireframes/theater-drive-in-theme.html` — `.tree`, `.tree--left/right`, `.lot__car`, `.lot__car::before/::after`, `.lot__beam` and the narrow overrides; **do not copy the inline `data:` SVG masks** (masks come from the loader) **nor the literal `bottom: 42%`** (use the ground-line property).
</reference_material>

<constraints>
- **`theater/src/lot/scenery.ts`** (pure, no DOM, no `import.meta`): `TREE_SETBACK = 420`, `TREE_LEAD = 100`, `TREE_VARIANTS = 3`, `TREE_SPACING` (see `<branch>`), `TREE_JITTER: readonly { dx: number; scale: number }[]` = `[{0,1.05},{60,0.9},{0,1.15},{40,0.95},{0,1.1},{80,1.0},{0,1.05},{40,0.9}]`, `interface TreePlacement { side: 'left' | 'right'; x: number; z: number; scale: number; variant: 0 | 1 | 2 }`, `treePlacements(count: number): readonly TreePlacement[]` — left trees first then right; index `i` from 0 while `z >= -(lotZ(1, count) + SPACING)`; left `z = -(TREE_LEAD + i * TREE_SPACING)` with `jitter[i % 8]`, right `z = -(TREE_LEAD + TREE_SPACING / 2 + i * TREE_SPACING)` with `jitter[(i + 3) % 8]`; `x = sign * (OFFSET + TREE_SETBACK + jitter.dx)`; `scale = jitter.scale`; `variant = (i + (right ? 1 : 0)) % 3`.
- **`theater/src/lot/art.ts`** (pure): `export type ArtExtension = 'png' | 'svg'` and `export const ART_EXTENSION: ArtExtension = 'png'` (or `'svg'` — see `<branch>`; keep exactly this declaration form, DT16's parity script greps it), `ART_FILES = { car: 'car', trees: ['tree-1', 'tree-2', 'tree-3'] } as const`, `artUrls(base: string): { car: string; trees: readonly [string, string, string] }` returning `${base}art/${name}.${ART_EXTENSION}`. **Only `lot-scene.ts` calls `artUrls(import.meta.env.BASE_URL)`.** Unit tests use `artUrls('/')`; DT16's specs use `artUrls(APP_PATH)`.
- **`build-lot.ts`**: export `TREE_CLASS = 'sds-tree'`, `TREE_VARIANT_ATTRIBUTE = 'data-tree-variant'`, `MASK_STATE_ATTRIBUTE = 'data-mask'`, `TREE_X_PROPERTY = '--sds-tree-x'`, `TREE_Z_PROPERTY`, `TREE_SCALE_PROPERTY`, `LOT_CAR_CLASS = 'sds-lot__car'`, `CAR_SPRITE_CLASS = 'sds-lot__car-sprite'`, `LOT_BEAM_CLASS = 'sds-lot__beam'`, `CAR_STATE_ATTRIBUTE = 'data-car'`. Inside the world, after the ground and before the screens, one `<span class="sds-tree sds-tree--left|right" aria-hidden="true" data-tree-variant="k" data-mask="pending">` per placement with the three inline properties (`px`, `px`, unitless). On the stage, after the orb: `<div class="sds-lot__beam" aria-hidden="true">` then `<div class="sds-lot__car" aria-hidden="true" data-car="pending">`. No mask, no `<img>` here.
- **`lot-scene.ts`**: `load()` queues, after the posters and in this order, `art.car`, `art.trees[0..2]` from `const art = artUrls(import.meta.env.BASE_URL)` (`units = projects.length + 4 + 1`); after `await this.#inner.load(...)`, when the art promises resolve, `#placeCar(url: string, image: HTMLImageElement)` — usable iff `naturalWidth >= MIN_CAR_PX` (`export const MIN_CAR_PX = 640`) and `naturalHeight >= 360`, then `image.className = CAR_SPRITE_CLASS`, `image.alt = ''`, appended into `.sds-lot__car`, `data-car="ready"`; else `data-car="missing"` — and `#placeMask(k: 0 | 1 | 2, url: string, image: HTMLImageElement)` — usable iff both dimensions `>= 64`, then every `.sds-tree[data-tree-variant="k"]` gets `style.setProperty('mask-image', \`url("${url}")\`)` **and** `'-webkit-mask-image'` (the `url` is the string the loader was given, threaded through — never read back off the element, whose `src` is absolutised) and `data-mask="ready"`, else `data-mask="missing"`. `destroy()` releases the four URLs. `LotSnapshot` gains `trees: number` (count of `.sds-tree` in the container now — `0` before the inner build and after `destroy()`) and `car: 'pending' | 'ready' | 'missing'` (from the car element's attribute; `'pending'` when the element does not exist yet; unchanged by `destroy()`).
- **`global.css`**: `.sds-tree` — `position: absolute; left: 50%; bottom: calc(100% - var(--sds-ground-line)); width: 260px; height: 390px; margin-left: -130px; transform-origin: 50% 100%; transform: translate3d(var(--sds-tree-x, 0px), 0, var(--sds-tree-z, 0px)) scale(var(--sds-tree-scale, 1)); background: var(--sds-tree); pointer-events: none; visibility: hidden;` plus `mask: … center bottom / contain no-repeat` and `-webkit-mask` likewise with no image (the inline property supplies it), no `filter`, no `transform-style`; `.sds-tree[data-mask="ready"] { visibility: visible }`. `.sds-lot__car` — from the wireframe, with `aspect-ratio: 16 / 9` and **`pointer-events: none`**; its `img` at `width: 100%; height: 100%; object-fit: contain`; glows on `::before/::after` (they inherit `none`). `.sds-lot__beam` — from the wireframe, with **`pointer-events: none`**. The stage does not opt out, so these declarations are what make "the car never steals a click" true; DT16 falsifies exactly this. Narrow overrides: `.sds-tree` `180px × 270px`, `margin-left: -90px`; `.sds-tree--left { --sds-tree-x: -360px !important }`, `--right` `360px`; car `64vw`; beam `70%`. All colours through roles. The selector lines `.sds-lot__car {` and `.sds-tree {` stand alone (Prettier's form) — DT16's falsification `sed` anchors on them.
- **Unit tests**: `scenery.test.ts` — literals for the branch taken, every index qualified by its call: GO: `treePlacements(8).length === 40`, `treePlacements(20).length === 88`, `treePlacements(8)[0]` is `{ side: 'left', x: -900, z: -100, scale: 1.05, variant: 0 }`, `treePlacements(8)[20]` is `{ side: 'right', x: 940, z: -300, scale: 0.95, variant: 1 }`, `treePlacements(8)[19].z === -7700` (in `treePlacements(20)` the left block is 44 long, so `[20]` there is a left tree — never reuse an index across counts); GO-REDUCED: `treePlacements(8).length === 20`, `treePlacements(20).length === 44`, `treePlacements(8)[10]` is the first right tree at `z: -500`, `treePlacements(8)[9].z === -7300`. `art.test.ts` — `artUrls('/')` and `artUrls('/theater/')` literals. `lot-scene.contract.test.ts` line 76: expected list becomes `[...posters, art.car, ...art.trees]` with `art = artUrls('/')`. `lot-scene.test.ts` gains: car ready (attribute, `<img class="sds-lot__car-sprite">` present, snapshot `car === 'ready'`); car missing via `autoSettle` returning `{ width: 1, height: 1 }` for the car URL only (attribute `missing`, no `<img>`, beam element present); one mask failing (`null` for `artUrls('/').trees[1]`) leaves variant-1 trees `data-mask="missing"` and variants 0/2 `ready` with inline `mask-image` set; `snapshot().trees === treePlacements(3).length` after load; after `destroy()` `trees === 0`. `build-lot.test.ts` gains a DOM case: tree count and order (left block then right), inline properties of the first tree (`-900px`, `-100px`, `1.05`), every tree `data-mask="pending"` before load, car and beam present on the stage outside the world.
</constraints>

<branch>
Check the **Decision records** table at the bottom of this roadmap and `ls theater/public/art` before writing any code:
- If DT11 says `GO` → `TREE_SPACING = SPACING / 2` (400) and the GO literals.
- If DT11 says `GO-REDUCED` → `TREE_SPACING = SPACING` (800) and the GO-REDUCED literals; note the deviation from the wireframe's density in the session log.
- If DT11 says `NO-GO-ALL` or `INVALID`, or the row is empty → **stop**; this phase does not run.
- If `theater/public/art/car.svg` exists (and no `car.png`) → `ART_EXTENSION = 'svg'`; otherwise `'png'`.
- If DT11 says `NO-GO-TREES` → the car-only build. **Everything above assumes trees, so this
  is the full override — apply it to each section; where it conflicts with a bullet in
  `<constraints>`, `<build_order>`, `<verification>` or `## Done`, this wins.** (Part 3B
  found the earlier one-line version unexecutable: it dropped `scenery.ts` while the rest
  of the phase still required the file, its tests, its CSS and its greps.)
  | Section | Under `NO-GO-TREES` |
  |---|---|
  | `scenery.ts` / `scenery.test.ts` | Not written at all. Every literal in the `scenery.test.ts` bullet is void. |
  | `art.ts` | Written, but `ART_FILES.trees` stays declared and **unused**; `artUrls()` still returns the full shape so `art.test.ts`'s literals are unchanged. |
  | `build-lot.ts` | Export `LOT_CAR_CLASS`, `CAR_SPRITE_CLASS`, `LOT_BEAM_CLASS`, `CAR_STATE_ATTRIBUTE` only — no `TREE_CLASS`, `TREE_VARIANT_ATTRIBUTE`, `MASK_STATE_ATTRIBUTE` or the three tree properties. No tree elements in the world; beam and car on the stage exactly as written. |
  | `lot-scene.ts` | `load()` queues posters + `art.car` only (`units = projects.length + 2`); `#placeCar` as written, **no `#placeMask`**; `destroy()` releases the one art URL; `snapshot().trees` is always `0`; `snapshot().car` unchanged. |
  | `global.css` | No `.sds-tree` rule and no narrow tree overrides. `.sds-lot__car` and `.sds-lot__beam` — including both **`pointer-events: none`** declarations — are written exactly as specified; they are what "the car never steals a click" rests on and DT16 still falsifies them. |
  | Unit tests | `lot-scene.contract.test.ts` line 76 expects `[...posters, art.car]`. `lot-scene.test.ts` keeps the car-ready and car-missing cases and drops the mask cases; `snapshot().trees === 0` after load. `build-lot.test.ts` asserts **no** `.sds-tree` elements, plus car and beam on the stage outside the world. |
  | Build order | Step 1 is `art.ts` + `art.test.ts` only; step 2 omits the tree DOM, the mask placement and the `.sds-tree` rules. |
  | Verification | Drop the `visibility: hidden` grep (no tree rule exists). Keep both `awk … pointer-events: none` guards. Add `ls theater/src/lot/scenery.ts ; echo "exit=$?"` expecting **exit=1**, and `grep -c 'sds-tree' theater/src/styles/global.css theater/src/lot/build-lot.ts` expecting **0** — under this branch the absence is the assertion. |
  | Manual check | Look for the wagon, beam and road at night; there are no trees to look for. |
  | `## Done` | Says "the visitor's wagon on a marked road under a sky that follows the clock, **no trees — DT11 measured `NO-GO-TREES`**", and names the decision row. |
</branch>

<build_order>

### 1. Pure modules
- [ ] Write `lot/scenery.ts` + `scenery.test.ts` and `lot/art.ts` + `art.test.ts` for the branch taken.

### 2. DOM, loader, CSS
- [ ] Add trees, beam and car to `buildLot` (constants exported) with the `build-lot.test.ts` case.
- [ ] Declare, place and release the art in `lot-scene.ts`; add the snapshot fields; widen the contract test's asset assertion; add the `lot-scene.test.ts` cases.
- [ ] Write the `.sds-tree`, `.sds-lot__car`, `.sds-lot__beam` rules and the narrow overrides.

### 3. Prove
- [ ] Typecheck, lint, unit suite, build; format; `rebuild-restart`; look at the served lot once at night (the full comparison is DT16's).

### 4. Session log
- [ ] Write the session log per `.claude/skills/writing-session-logs/SKILL.md`.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
pnpm format:check
pnpm -C theater typecheck && pnpm -C theater lint && pnpm -C theater test
# scenery, art, lot-scene, build-lot, contract — all ✓. The binary directly (pnpm swallows `--reporter`),
# and captured rather than piped: `… | grep | head` returns head's status, so a suite that never starts
# reports success (measured 2026-09-08). Do not "fix" this with `pipefail` — head would then break it.
(cd theater && ./node_modules/.bin/vitest run --reporter=verbose src/lot) > /tmp/dt15-vitest.log 2>&1; vitest_status=$?
grep -E '✓|✗|×' /tmp/dt15-vitest.log | head -80
echo "vitest exit=$vitest_status"                                                                              # must be 0 — this, not the glyphs, is the check
grep -rn 'import.meta' theater/src/lot/ --include='*.ts' | grep -v 'lot/lot-scene.ts' ; echo "exit=$?"   # only lot-scene may read the env → exit=1 (works whether or not scenery.ts exists)
grep -n 'artUrls(import.meta.env.BASE_URL)' theater/src/lot/lot-scene.ts                   # exactly the one call site
grep -n 'Math.random' theater/src/lot/*.ts ; echo "exit=$?"                                # SDS-001: exit=1
grep -n 'getBoundingClientRect\|offsetHeight\|offsetWidth' theater/src/lot/*.ts ; echo "exit=$?"   # SDS-004: exit=1
grep -n 'bottom: 42%' theater/src/styles/global.css ; echo "exit=$?"                        # EVO-UNI-057: the wireframe literal never lands → exit=1
grep -n 'visibility: hidden' theater/src/styles/global.css                                 # the pending/missing tree rule
grep -n 'aspect-ratio: 16 / 9' theater/src/styles/global.css                               # the car box keeps its height
awk '/^\.sds-lot__car \{$/,/^\}/' theater/src/styles/global.css | grep -c 'pointer-events: none'    # 1 — the car opts out of hit-testing (the whole rule block, so Prettier's line wrapping cannot push the declaration out of a fixed -A window)
awk '/^\.sds-lot__beam \{$/,/^\}/' theater/src/styles/global.css | grep -c 'pointer-events: none'   # 1
grep -oE "ART_EXTENSION: ArtExtension = ['\"](png|svg)" theater/src/lot/art.ts               # the declaration form DT16 greps
pnpm -C theater build
docker compose build && docker compose up -d --force-recreate
curl -s -o /dev/null -w '%{http_code}\n' "http://portfolio-site.localhost/theater/art/car.$(grep -oE "ART_EXTENSION: ArtExtension = ['\"](png|svg)" theater/src/lot/art.ts | grep -oE 'png|svg')"   # 200
```

Manual (browser, `http://portfolio-site.localhost/theater/?period=night`, 1440×900):
trees line both sides, the wagon sits bottom-centre with the beam and glows, no `[sds]`
warnings in the console. The full per-period, per-viewport comparison against the
wireframe is DT16's.

Expected: all greps as noted; the unit suite green including the widened contract run;
the served container answers 200 for the car sprite.
</verification>

<commit>
```
feat(dt15): trees, the visitor's wagon and headlight beam; art declared through the loader
```
</commit>

## Done

After this phase, portfolio_site's `/theater/` renders the trees, the wagon and its beam
from loader-declared sprites, with the unit suite and the conformance kit green —
unproven in a real browser until DT16.

Paste Phase DT16.

---

## Phase DT16: Scenery and art Playwright specs, nginx parity, wireframe match

<task>
You are executing **Phase DT16 of the Drive-In Theme Roadmap** — proving in a real
browser that the trees paint, the wagon never steals a click from a screen passing
through it, the sprites meet their per-pixel contract, and nginx serves them, because
DT15's unit tests cannot see rendering, hit-testing or the served image.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md`, `react-frontend.md`, `tooling.md`; `theater/skills/rules-index/SKILL.md`
3. `.claude/skills/rebuild-restart/SKILL.md`
4. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- **DT15** landed (verify against the tree): `theater/src/lot/scenery.ts` with
  `treePlacements(count)`, `TREE_SPACING` and `TREE_JITTER` (absent under DT11's
  `NO-GO-TREES`); `theater/src/lot/art.ts` with `ART_EXTENSION: ArtExtension`,
  `ART_FILES`, `artUrls(base)` (pure — safe to import from `e2e/`);
  `theater/src/lot/build-lot.ts` exporting `TREE_CLASS = 'sds-tree'`,
  `TREE_VARIANT_ATTRIBUTE`, `MASK_STATE_ATTRIBUTE = 'data-mask'`, `TREE_X_PROPERTY`,
  `TREE_Z_PROPERTY`, `TREE_SCALE_PROPERTY`, `LOT_CAR_CLASS = 'sds-lot__car'`,
  `CAR_SPRITE_CLASS`, `LOT_BEAM_CLASS = 'sds-lot__beam'`, `CAR_STATE_ATTRIBUTE = 'data-car'`;
  `theater/src/lot/lot-scene.ts` declaring the art through the loader and setting
  `data-mask="ready|missing"` and `data-car="ready|missing"`; `theater/src/styles/global.css`
  with `.sds-tree` (`visibility: hidden` unless `[data-mask="ready"]`, `pointer-events:
  none`), `.sds-lot__car` (`aspect-ratio: 16 / 9`, `pointer-events: none`, glows on
  pseudo-elements) and `.sds-lot__beam` (`pointer-events: none`); the selector lines
  `.sds-lot__car {` and `.sds-tree {` stand alone.
- **DT14's art** under `theater/public/art/` (served at `/theater/art/<name>.<ext>`).
- **DT12** landed `theater/src/page/period.ts` (`PERIOD_PARAM`, `PERIODS`, …) and, in
  `theater/e2e/helpers/app.ts`: `APP_PATH = "/theater/"`, `PINNED_PERIOD`, `APP_URL`
  (path + `?period=night`), `openPage(page)` (navigates to `APP_URL` and waits for the
  reveal), `periodAttribute(page)`. Pre-existing helpers in the same file: `LOT_SCENE`
  (`'lot'`), `SCREEN` (`a.sds-screen`), `sceneScrollRange`,
  `scrollToSceneProgress(page, sceneId, progress)`, `scrollToScreen(page, i)`,
  `screenBandMiddle(i)`, `screenLocator(page, i)`, `worldZ`, `screenLit`, `clipStates`.
  `screenProgress(i, count)` comes from `../../src/lot/geometry`; `projects` from
  `../../src/projects` (20 entries; `projects[0].href` is `/projects/budget-app.html`).
- The suite runs against `pnpm build && pnpm preview` on port 4173
  (`theater/playwright.config.ts`, one Chromium project at Desktop Chrome, `retries: 0`);
  `pnpm build` is `tsc --noEmit && vite build`, so a TypeScript error in any spec kills
  the whole run. Specs assert navigation as `click-through.spec.ts` does:
  `waitForURL(\`**${href}\`)` then `new URL(page.url()).pathname`. **pnpm 11 forwards a
  `--` literally and parses flags such as `--reporter` as its own**, so filters and flags go to the binaries directly: `(cd theater && ./node_modules/.bin/playwright test <filter>)`, `(cd theater && ./node_modules/.bin/vitest run --reporter=verbose <path>)`. **And a test command's exit status must reach the shell**: `<test> | grep … | head` reports `head`'s success even when the runner never started (measured 2026-09-08 — a Vite startup failure and a nonexistent filter both gave `pipeline_exit=0 pipe_statuses=1 1 0`), so every filtered check redirects to a log, saves `$?`, and greps the log afterwards. `pipefail` is not the fix: `head` closing the pipe would manufacture failures.
- `theater/e2e/nginx-parity.sh` curls the served container with `report`, `status_of`,
  `content_type_of` helpers and checks `/images/nom-noms/01.png` is `image/png`.
- **Geometry that matters for the click test** (measured 2026-09-08 at 390×720 on the
  current lot with the wireframe's car box): screens are anchored with their **bottom on
  the ground line** (58 % down the stage) and grow upward; the car occupies roughly the
  bottom 20 %. At the middle or end of a screen's own lit band its box ends ~200px above
  the car; the two boxes first overlap only once that screen has **passed** the camera
  plane and is exploding across the viewport — at roughly one and a half bands after its
  band start. Measured with a 30-sample scan on 2026-09-08: first overlap at progress
  ≈ 0.069 (world `translateZ ≈ 1160`), where `elementFromPoint` at the intersection's
  centre returns `span.sds-screen__base` inside screen 0's link and
  `.closest('a.sds-screen')` is index 0; with the car forced to `pointer-events: auto`
  the same point returns `div.sds-lot__car`. So the overlap position must be **found by
  scanning**, never pinned by a formula, and the scan reliably finds it.

**Out of scope:** any change to `src/` other than what a falsification temporarily
edits and restores; new art.

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier and the vendored law for this phase:
- **EVO-UNI-061** — each new spec is shown to fail once against a deliberate breakage; a positive overlap is asserted before the click so the click cannot pass vacuously.
- **EVO-TOOL-071** — waits are on outcomes (`toHaveAttribute`, `expect.poll`, `waitForURL`), never timeouts; the scan uses the settle helper the suite already has.
- **EVO-TOOL-183** — the transform assertion reads the rendered matrix; the inline placement properties were asserted in DT15's unit tests.
- **EVO-TOOL-054 / EVO-TOOL-055** — `art.spec.ts` reads alpha from `getImageData()` on a same-origin image.
- **EVO-UNI-090** — the falsifications back files up and restore them by copy; `git checkout --` is not an undo for uncommitted work.
- **EVO-UNI-017 / EVO-UNI-018** — behaviour with literal expected values (`-900`, `-100`, `1.05`, `1600×900`).
- **EVO-TOOL-111** — the parity run needs `rebuild-restart`.
</rules>

<reference_material>
Read these files before writing any code:
- `theater/e2e/helpers/app.ts` — every helper named above and the header's rule that selectors are imported from `src`, never re-typed.
- `theater/e2e/click-through.spec.ts` — the navigation assertion; `theater/e2e/reduced-motion.spec.ts` — a sweep over sampled progress values with `scrollToSceneProgress` (the pattern the overlap scan follows).
- `theater/src/lot/build-lot.ts`, `theater/src/lot/scenery.ts`, `theater/src/lot/art.ts` — the constants to import.
- `theater/e2e/nginx-parity.sh` — the `report`/`content_type_of` helpers to extend.
- `docs/wireframes/theater-drive-in-theme.html` — the composition the manual check compares against.
</reference_material>

<constraints>
- **`e2e/scenery.spec.ts`** (skip the tree assertions under `NO-GO-TREES`): after `openPage`, `.sds-tree` count `=== treePlacements(projects.length).length` and every tree has `data-mask="ready"` with computed `visibility === 'visible'`; **every tree's computed `mask-image` and `-webkit-mask-image` contain `art/tree-${Number(el.dataset.treeVariant) + 1}.`** — read each element's `data-tree-variant` and assert against the URL that variant should carry, in one `$$eval` over all of them. Checking only tree 0 (the Part 3 fix) is not enough: with tree 1's masks removed after load, `count=88 ready=88 visible=88` and tree 0's two URLs all still held while tree 1 computed `none` (measured 2026-09-08), so the filled-rectangle failure was merely displaced to the 87 unchecked elements. Asserting per variant catches both a lost mask and a mask applied to the wrong variant. The car has `data-car="ready"` and a computed height > 0; the first left tree's computed `transform` parsed by `new DOMMatrixReadOnly(...)` has `m41 === -900`, `m43 === -100`, `m11 === 1.05` (to 3 dp). **Click-through under the car**, as a loop over **two viewports — `{ width: 390, height: 720 }` and `{ width: 1440, height: 900 }`** — because the `pointer-events: none` guard in DT15's `<verification>` reads the base rule block only and is not cascade-aware: an `@media (min-width: 768px) { .sds-lot__car { pointer-events: auto } }` regression leaves that block untouched, and a scan that only ever runs at 390×720 never sees it. (`click-through.spec.ts` does visit every screen at the default desktop viewport, but the `<context>` geometry note says those band-midpoint boxes do not overlap the car, so it cannot catch a desktop car stealing a click.) At each viewport: first assert `getComputedStyle(car).pointerEvents === 'none'` — the computed value, which the cascade decides; then scan `progress` from `screenProgress(0, n)` to `screenProgress(2, n)` in 40 equal steps using `scrollToSceneProgress(page, LOT_SCENE, p)`, at each reading screen 0's and `.sds-lot__car`'s bounding boxes; stop at the **first** sample where they intersect and `expect` that one was found (the geometry note in `<context>` says it will be, about one and a half bands in); at that position take the intersection's centre, assert `document.elementFromPoint(x, y)?.closest('a.sds-screen')` has `data-screen-index="0"`, `page.mouse.click(x, y)`, then `waitForURL` for `projects[0].href`. One screen per viewport is enough once the computed cascade is proved — `pointer-events: none` makes screen identity irrelevant. Import `SCREEN`, `LOT_CAR_CLASS`, `TREE_CLASS`, `MASK_STATE_ATTRIBUTE`, `CAR_STATE_ATTRIBUTE` — never re-type them.
- **`e2e/art.spec.ts`**: `openPage(page)` first (same origin, so the canvas is not tainted); then for each URL of `artUrls(APP_PATH)` (car only under `NO-GO-TREES`), in the page create an `Image`, await load (a load error is a failure), draw to a canvas and assert: dimensions `1600×900` / `800×1200`; four corner alphas `0`; transparent fraction in `[0.15, 0.85]`; car α > 0 bounding box width `>= 960`; tree bounding-box bottom `>= 0.95 * height`. SVG files load through the same `Image` path at their intrinsic size.
- **`nginx-parity.sh`**: add `report "/theater/art/car.<ext> is served" 200 …` and a content-type check (`image/png` or `image/svg+xml`), with `<ext>` read by `grep -oE "ART_EXTENSION: ArtExtension = ['\"](png|svg)" theater/src/lot/art.ts | grep -oE 'png|svg'` so the script cannot drift from the constant.
- No spec introduces a `waitForTimeout`; the scan relies on `scrollToSceneProgress`'s settle.
</constraints>

<branch>
Check the **Decision records** table before writing any code:
- `GO` / `GO-REDUCED` → the full `scenery.spec.ts` (the tree count comes from `treePlacements`, so density does not change the spec).
- `NO-GO-TREES` → the car-only build. **As in DT15, this is the full override and it wins
  over any conflicting line in `<constraints>`, `<reference_material>`, `<build_order>`,
  `<verification>` or `## Done`** — under this verdict `theater/src/lot/scenery.ts` does
  not exist, so a `cp` of it has no source and the phase cannot be executed as otherwise
  written (Part 3B, VERIFIED against the current tree):
  | Section | Under `NO-GO-TREES` |
  |---|---|
  | `scenery.spec.ts` | Keep the car assertions (`data-car="ready"`, computed height > 0) and the whole click-under-the-car scan at both viewports. Drop every tree assertion — count, `data-mask`, mask URLs, the transform matrix. Add the negative: `.sds-tree` count `=== 0`. |
  | `art.spec.ts` | Iterates `artUrls(APP_PATH)`'s car entry only; the tree canvas assertions are void. |
  | `reference_material` | `theater/src/lot/scenery.ts` is not listed — it does not exist. |
  | Falsification 1 (`scenery.ts` stub) | **Skipped entirely** — there is no file to back up, stub or restore. Its purpose (proving the tree assertions can fail) has no subject here. |
  | Falsification 2 (car steals click) | **Kept, and it is now the load-bearing one** — it is the only proof left that the click-through test can fail. Run it at both viewports. |
  | Falsification 3 (corrupt car sprite) | Kept as written. |
  | `nginx-parity.sh` | The car line only. |
  | Manual / wireframe comparison | Wagon, beam, road and sky; no tree comparison. |
  | `## Done` | "every screen still a link" as written, and the scenery sentence says the wagon and beam ship **without trees, per DT11's `NO-GO-TREES` row**. |
</branch>

<build_order>

### 1. Specs
- [ ] Write `e2e/scenery.spec.ts` and `e2e/art.spec.ts`; extend `nginx-parity.sh`.

### 2. Prove
- [ ] Typecheck, lint, unit, e2e; `rebuild-restart` and the parity script; compare the served lot with the wireframe in sunset and night at 1440×900 and 390px; run the three falsifications in `<verification>`, restoring each file from its backup.

### 3. Session log
- [ ] Write the session log per `.claude/skills/writing-session-logs/SKILL.md`.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
pnpm format:check
pnpm -C theater typecheck && pnpm -C theater lint && pnpm -C theater test
ls theater/e2e/scenery.spec.ts theater/e2e/art.spec.ts
grep -n 'waitForTimeout' theater/e2e/scenery.spec.ts theater/e2e/art.spec.ts ; echo "exit=$?"     # EVO-TOOL-071: exit=1
grep -n "closest('a.sds-screen')\|closest(SCREEN)\|closest(\`\${SCREEN}\`)" theater/e2e/scenery.spec.ts   # the positive hit-test
grep -n 'ART_EXTENSION: ArtExtension' theater/e2e/nginx-parity.sh                          # parity reads the constant
pnpm -C theater test:e2e                                                                   # green, including scenery and art
docker compose build && docker compose up -d --force-recreate && bash theater/e2e/nginx-parity.sh   # every line OK, including the art line
# Falsify (EVO-UNI-061). Files are backed up and restored by copy (EVO-UNI-090): copying is the one form that is
# safe for both committed and uncommitted files, so every falsification in this roadmap uses it.
cp theater/src/lot/scenery.ts /tmp/dt16-scenery.ts.bak
sed -i 's/^export function treePlacements(/export function treePlacements_(/' theater/src/lot/scenery.ts && printf '\nexport function treePlacements(_count: number): readonly TreePlacement[] { return []; }\n' >> theater/src/lot/scenery.ts   # typed stub so `pnpm build` still compiles
(cd theater && ./node_modules/.bin/playwright test scenery) ; echo "scenery exit=$?"                     # non-zero (no trees)
cp /tmp/dt16-scenery.ts.bak theater/src/lot/scenery.ts && cmp /tmp/dt16-scenery.ts.bak theater/src/lot/scenery.ts && echo "scenery.ts restored"
cp theater/src/styles/global.css /tmp/dt16-global.css.bak
sed -i 's/^\.sds-lot__car {$/.sds-lot__car { pointer-events: auto !important;/' theater/src/styles/global.css
(cd theater && ./node_modules/.bin/playwright test scenery) ; echo "scenery(car steals click) exit=$?"   # non-zero — elementFromPoint returns the car
cp /tmp/dt16-global.css.bak theater/src/styles/global.css && cmp /tmp/dt16-global.css.bak theater/src/styles/global.css && echo "global.css restored"
ext=$(grep -oE "ART_EXTENSION: ArtExtension = ['\"](png|svg)" theater/src/lot/art.ts | grep -oE 'png|svg'); echo "ext=$ext"
cp "theater/public/art/car.$ext" /tmp/dt16-car.bak && printf '\x89PNG\r\n\x1a\n' > "theater/public/art/car.$ext"
(cd theater && ./node_modules/.bin/playwright test art) ; echo "art exit=$?"                             # non-zero (the image fails to load)
cp /tmp/dt16-car.bak "theater/public/art/car.$ext" && cmp /tmp/dt16-car.bak "theater/public/art/car.$ext" && echo "car restored"
git diff --quiet -- theater/src theater/public && echo "tree clean apart from e2e"
pnpm -C theater test:e2e                                                                   # green again
```

Manual (browser, `http://portfolio-site.localhost/theater/?period=<p>` for sunset and
night, then no parameter; 1440×900 and 390px): trees line both sides and never sit in
front of a screen; the wagon sits bottom-centre with the beam on the road and tail-light
glows that fade by day; a screen passing through the car region is clickable; scrolling
back restores the identical frame (`SDS-001`); no `[sds]` warnings in the console.
Compare with `docs/wireframes/theater-drive-in-theme.html`.

Expected: all greps as noted; unit, e2e and parity green; the first falsification fails
`scenery` (no trees), the second fails at least `scenery` (the click lands on the car —
if `click-through` also fails, the car overlaps a band-middle screen at desktop width,
which is a real finding to record in the Changelog), the third fails `art`; every
restore prints its line; the lot matches the wireframe.
</verification>

<commit>
```
test(dt16): scenery and art Playwright specs; nginx parity for the sprites
```
</commit>

## Done

After this phase, portfolio_site's `/theater/` is a drive-in: the visitor's wagon on a
marked road, trees lining the lot, a sky and lighting that follow the visitor's clock,
every screen still a link — proven by unit tests, the conformance kit, Playwright and
the nginx parity check. What the browser proof covers, exactly — and this paragraph was
amended on execution, because the phase was written expecting an overlap at both
viewports and there is only one. The scan runs for **screen 0 at both 390×720 and
1440×900, in Chromium**, and each viewport asserts the car's *computed* `pointer-events`
is `none`, so a responsive override that flips it is caught by the cascade check rather
than assumed away by a source-text grep. **The click itself is landed at 390×720**, where
screen 0's box first meets the wagon's at progress ≈ 0.069. **At 1440×900 it never does**:
the wide layout puts screen 0 at `x = -OFFSET` with a yaw, so it flies off to the left as
it passes the camera — measured 2026-09-09, the horizontal gap closes to zero at progress
≈ 0.0605 while the vertical gap is still 8.3 px, and by the time the vertical gap closes
the horizontal one has reopened. So the desktop row asserts the cascade, asserts that the
sweep really happened (closest approach < 40 px), and states the non-overlap as a literal
that goes red the day a screen does reach the wagon there. The proof generalises to the
other screens through `pointer-events: none` itself — which the falsification shows is
load-bearing at **both** viewports — not through a per-screen sweep. Firefox is out of
scope by decision (see DT11's Manual Verification); this feature is verified on Chromium
and the spec says so.

This is the final phase. The completed roadmap gives the portfolio a drive-in that
changes with the hour; a later roadmap could add ambient sound or a period toggle, both
deliberately out of scope here.

---

## Decision records

Browser scope is **Chromium only** by Evan's ruling of 2026-09-08 (see DT11's Manual
Verification and the spec's "Core assumption"), so there is no second-browser column. The
two fps columns are the two protocols and are not interchangeable: harness medians decide
density and the control, the natural-wheel numbers own every absolute `≥ 50`.

| Phase | Decision | Harness fps, median of 3 (lot20 / car-only / scenery / scenery-half / scenery-overload) | Natural-wheel fps (car-only / selected variant) | Posters resident | Verdict self-test | Trees paint (scenery / scenery-half if reached) | Click + Tab (car-only / scenery / scenery-half if reached) | `masksrc=svg` smoke | Date | Decided by |
|---|---|---|---|---|---|---|---|---|---|---|
| DT11 | GO [^dt11] | not taken [^dt11] | not taken [^dt11] | not taken [^dt11] | not taken [^dt11] | not taken [^dt11] | not taken [^dt11] | not taken [^dt11] | 2026-09-09 | Evan |

[^dt11]: **This row records a ruling, not a measurement — read it as such.** Evan called
    `GO` on 2026-09-09, directing DT15 to proceed at `TREE_SPACING = SPACING / 2` (400),
    on the strength of the real-hardware performance work done while executing DT13
    rather than the six-step procedure in DT11's header. **DT11's protocol was never
    run**: no harness walk over the five variants, no natural-wheel DevTools runs, no
    `posters resident: 20/20` gate, no `?selftest=verdict`, no tree-paint check, no
    car-only or scenery click/Tab gate, no `masksrc=svg` smoke. Every measurement cell is
    therefore `not taken`, and none of DT11's numeric thresholds (`scenery >= 50`,
    `scenery-overload < scenery`) has been evaluated.

    What does back the ruling: DT13 measured this page's heaviest layer on Evan's own
    machine and tuned it (`GROUND_SQUASH = 4`, 134 -> 51 ms/frame; squash 1 visibly
    blinks and drops the road when scrubbing backwards, 4 is clean, 6 and 8 look no
    different), so the lot is known to have headroom in the browser that matters. DT13's
    own log is explicit that it proves nothing about this phase's subject: *"Trees, car
    and beam are absent and are DT15."* The trees' and car's cost, their painting, and
    their effect on hit-testing remain unmeasured going into DT15.

    Consequences to carry forward. The probe
    (`docs/spikes/2026-09-08-scenery-probe.html`) and the art checker are built,
    self-tested and committed at `bcdc561`; the measurement can still be run at any time
    and this row amended. Until it is, **DT16 is the first and only evidence that the
    trees and car are performant and do not steal a click** — its click-through proof at
    390x720 and 1440x900 and its computed `pointer-events` assertion carry weight they
    were never designed to carry alone, because DT11 was meant to have falsified both
    before a line of DT15 was written. If DT16 finds the lot slow or the car
    hit-testing, the fallbacks are DT11's own: drop to `TREE_SPACING = 800` (the
    GO-REDUCED layout) or to the car-only branch. DT14's four sprites were likewise
    generated ahead of this row (`df76193`) and are unaffected by the ruling.

## Changelog

| Date | Phase | Commit | Outcome / deviations |
|---|---|---|---|
| 2026-09-08 | — | `f4cfda3` → `14f398b` | Spec + wireframe written from a same-session brainstorm; Codex adversarial on the spec (gpt-6-astra high, in-session on Evan's say-so): 8 MAJOR / 5 MINOR, all 13 accepted (receipt `docs/roadmaps/drive-in-theme-spec-codex-review.md`); wireframe approved with road markings and the wagon. |
| 2026-09-08 | — | `4882883` → `a572b5e` | Roadmap written (Part 2); two cold Opus evaluators — code truth 3 CRITICAL / 5 MAJOR / 9 MINOR, structure 1 CRITICAL / 8 MAJOR / 11 MINOR — 28 findings, 27 accepted / 1 rescoped / 0 rejected. Headline: the click-under-the-car test was pinned where no screen overlaps the car (now a bounded scan); `git checkout --` reverts on new/uncommitted files (now backup by copy); `pnpm … -- <filter>` does not filter under pnpm 11 (now `pnpm exec`); the car never opted out of hit-testing; DT15 split into DT15/DT16. Part 3 prompt prepared for Codex (`gpt-5.6-sol` high, Evan-driven): `docs/roadmaps/drive-in-theme-part3-prompt.md`. |
| 2026-09-08 | — | `a572b5e` → `7579eed` | Part 3 (Codex `gpt-5.6-sol` high, in-session on Evan's approval) **hit the usage limit at 285k tokens with no findings list**; folded from its probe outputs (receipt `docs/roadmaps/drive-in-theme-part3-codex-review.md`, severities by the writing session): 2 MAJOR / 3 MINOR, all accepted — vacuous verbose-suite checks through `pnpm exec` (→ binaries directly), a lost mask invisible to `data-mask` + visibility (→ computed `mask-image` asserted), fragile `-A12` guards (→ awk rule blocks), DT16's Done stated to its one-screen Chromium proof, 16 real clips recorded in DT11. Its probes verified the Part 2 triage's own edits (scan-based click test, typed-stub falsification and copy restore, four requests for four declared art files). Not final — a full Part 3 re-run was owed and was run the same day (next row). |
| 2026-09-08 | — | `7579eed` → _this commit_ | **Part 3B: the owed Part 3 re-run, completed** (Codex `gpt-5.6-sol` high, in-session on Evan's "can we finish the adversarial?", exit 0 at 301k tokens / 33 commands; prompt `drive-in-theme-part3b-prompt.md`, receipt `drive-in-theme-part3b-codex-review.md`). Narrowed to the five lenses the partial run never reached plus the five unreviewed `7579eed` edits, and required findings to be written to disk as they formed — the process fix for the earlier quota death. **0 CRITICAL, 11 MAJOR, 4 MINOR; 14 accepted, 1 rejected.** Headline: DT11's `lot20` omitted the twenty decoded posters production keeps resident, so GO could be measured on a lighter workload; a tree-paint failure skipped the car-only interaction gate and could ship a known-broken car (procedure reordered — car first, six steps); the `NO-GO-TREES` branch was internally unexecutable in both DT15 and DT16 (now a full override table per section); DT14 could accept a correct-but-floating car (bbox height/bottom/centre thresholds added); the checker's and the probe's self-tests proved only that they ran (now per-predicate fixture tables that fail closed); the glyph pipelines returned `head`'s exit status; the tree-mask assertion covered one of 88 trees; the car-click proof was not cascade-aware (now two viewports, computed `pointer-events`). Evan ruled **Chromium-only** on the browser gate, amended into the spec. **Rejected — finding 14** (DT11 needs a format step before its commit): measured false, `.prettierignore`'s `docs/` entry is honoured for explicitly-passed paths, so the hook cannot block those files. Cleared by Codex and left alone: the procedure's decidability, `destroy()`/re-mount, the conformance kit, the whole SVG fallback path, and the 83 % loading-ring plateau — diagnosed as the probe's own 1500 ms route delay plus the reveal fade, with SVG `decode()` at 0 ms. |
| 2026-09-09 | DT13 | `baa6b6f` → _this commit_ | Six `[data-period]` palettes, the sun/moon orb, road markings and a geometry-sized ground shipped. **The ground plane took a third option, not either of the two the phase's MEASURED block proposed** (see the ✅ RESOLVED block in DT13). Folding the road into the asphalt's own `background` stack was kept — it deletes DT11's coplanar layer for 0.2 ms/frame. **Sectioning was built, measured and rejected**: N abutting planes cost precisely what one plane costs (`groundDepth(20)`: 137.9 ms/frame as three abutting planes, 134.0 as one), because the rastered *area* is the cost and not the tiling — it satisfies "no single layer over 8192px" and fixes nothing. What shipped is `GROUND_SQUASH = 4`: the plane is laid out `groundDepth(count) / 4` deep and `scaleY(4)`d back out, so it spans the same world Z on a quarter of the texture (134 → 51 ms/frame; 4000x5200 for the twenty projects that ship, 20.8 Mpx against the replaced plane's 19.2 Mpx — two and a half times the depth for about the same texture), with every depth-direction length it paints divided by the same constant so it cancels. 4 is the largest squash the 4px parking-row hairline survives at one texel; the cap is crossed at 35 projects and `geometry.test.ts` binds the invariant to `projects.length`. Also: `--sds-road-surface` added so `global.css` never spells `black` (`EVO-UNI-001`); `test.slow()` on the two long e2e sweeps, which were already at 23s and 28s against a 30s default before this phase. Night proven byte-identical to `baa6b6f` (sky gradient, asphalt, `brightness(0.35)`, marquee). **Codex adversarial run on the implementation** (`gpt-5.6-sol` high, exit 0 at 547k tokens; prompt `drive-in-theme-dt13-prompt.md`, receipt `drive-in-theme-dt13-codex-review.md`): **0 CRITICAL, 6 MAJOR, 2 MINOR, all 8 accepted — 6 fixed, 2 recorded.** Headline: `projects.ts` holds **twenty** projects and the texture guard was bound to literals (now to `projects.length`; the cap is crossed at 35); the sky check was a `toContain` that passed against an *inverted* gradient; the brightness checks sampled only unlit screens, so collapsing the filter left every screen dim with the whole suite green; nothing asserted the road rendered at all; and the one-texel parking row that *decides* `GROUND_SQUASH = 4` was unguarded. Accepted and **not** fixed: **screens 1–19 are unclickable at 390px** (pre-existing — the narrow rule stacks the screens single-file so each occludes the next; `click-through.spec.ts` only runs at desktop width), and the texture cap compares **CSS pixels** against a texel limit, which holds only at DPR 1. **Confirmed on real hardware the same day** (Evan): squash 1 reproduces the blinking *and* drops the road when scrubbing backwards; squash 4 is clean; 6 and 8 make no visible difference, so 4 stands. Still open, and measured as probably-benign: whether the raster scale tracks DPR (see the RESOLVED block). |
| 2026-09-09 | DT16 | `7b5a722` → _this commit_ | `scenery.spec.ts` (5 tests) and `art.spec.ts` (4) added, `nginx-parity.sh` extended with the car sprite; e2e 57 passed, unit 402 passed, parity 10/10 OK. **Deviation, measured, and the phase's one real finding: at 1440×900 screen 0's box never overlaps the wagon's, so the desktop click-through cannot be constructed.** The phase was written assuming the 390×720 measurement (`<context>`'s "the scan reliably finds it") generalised; it does not. The narrow layout stacks the screens single-file down the lane, so a screen grows straight out over the wagon and the click lands at progress ≈ 0.069. The wide layout puts screen 0 at `x = -OFFSET` with a yaw, so it flies off to the LEFT as it passes: scanned at 41 samples, the horizontal gap closes to zero at progress ≈ 0.0605 while the vertical gap is still **8.3 px**, and by the time the vertical gap closes (≈ 0.0619) the horizontal one has reopened to ≈ 10 px — a near-miss, not a margin. The only boxes that do intersect at desktop width are the degenerate ones a screen projects once it is *behind* the camera (progress ≥ 0.0968, past the end of the scan), where `elementFromPoint` returns nothing at all. So `VIEWPORTS` carries a measured `overlaps` literal per row: the desktop row asserts the computed cascade, asserts the sweep happened (closest approach < 40 px, guarding `EVO-UNI-118` — "no overlap" is equally true of a page with no lot), and states the non-overlap as a claim that goes red if the composition ever moves. `## Done` amended to say this. **Falsifications, all four run and restored by copy:** the `treePlacements` typed stub fails `scenery` on the hand-written `PLACEMENTS.length > 0` floor and the transform test (the count assertion alone could not fail — both sides move together, `EVO-UNI-207`); `pointer-events: auto !important` fails **both** viewports on the computed check, and with that check temporarily disabled the 390×720 hit-test fails on its own (`elementFromPoint` → `null` at 195,588) — so both halves are load-bearing, and `click-through.spec.ts` stayed green, meaning the car does **not** overlap a band-middle screen at desktop; a truncated `car.png` fails `art` on the load; flipping `ART_EXTENSION` to `svg` turns the two new parity lines red, proving they read the constant. Also falsified beyond the phase's list: stripping variant 1's masks while still setting `data-mask="ready"` — the Part 3B failure mode — fails the per-variant assertion with 30 trees computing `mask-image: none`, which the one-tree check it replaced would have passed. **Served-page check** (nginx, Chromium, sunset/night/no-param × 1440×900/390): 88 trees, 88 visible, `data-car="ready"`, computed `pointer-events: none`, `--sds-headlight` 0 / .5 / 1 by period, zero `[sds]` console warnings; `SDS-001` holds — driving away and back gives a byte-identical engine state (world matrix, all 20 lit values, tree and car transforms), and the only pixel difference is 136 px inside a distant `<video>`'s box (the decoder's frame; the same position sampled twice with no drive is byte-identical). Matches the wireframe, denser treeline per DT11's `GO`. `test.slow()` on the two click tests — 41 settled scroll positions is ~33 s at desktop against a 30 s default, the allowance `keyboard.spec.ts` and `active-screen.spec.ts` already take. |
