# Drive-In Theme — Design Spec

**Date:** 2026-09-08
**Status:** Draft for Codex adversarial review, then roadmap (Part 2)
**Extends:** `docs/superpowers/specs/2026-08-25-drive-in-theater-design.md` (the theater
itself: DTF, DT0–DT10). This spec is the follow-up roadmap's source; its phase IDs
continue that sequence (DT11–DT15).
**Wireframe:** `docs/wireframes/theater-drive-in-theme.html` (candidate — approval
recorded in the roadmap's Prerequisites once given).

## Goal

Make `/theater/` read as a drive-in: the visitor's car sits at the bottom centre of the
lane with the lot driving past it, trees line both sides of the drive, and the sky,
lighting and ground match the visitor's own time of day — six periods, the same hour
bands jourNOW uses — so a visitor at 07:30 pulls in at dawn and one at 23:00 at night.

## Premise and constraints

- **Everything visible stays a pure function of scroll progress and one attribute.**
  The lot's `seek` is absolute (`SDS-001`); nothing added here gets its own clock. The
  period is a `data-period` attribute on `<html>`, set once from the clock (or the
  `?period=` override) and re-evaluated only on `visibilitychange`, exactly as jourNOW
  does. Trees ride the one existing drive tween. The car is static. Sun/moon positions
  are fixed per period, not clock-driven.
- **The night look is byte-identical to today's theater.** The base token values *are*
  the night palette; the five other periods are override blocks. A root with no
  attribute (JavaScript off, or before the entry point runs) renders what ships today.
  The Playwright suite pins `?period=night` on every navigation, so every existing
  assertion keeps its meaning.
- **No visible period control.** The override is a query parameter for tests and for
  Evan's previews. A visitor gets their own time of day and nothing to fiddle with.
- **Screens play in every period.** A real drive-in is dark; this one is a portfolio,
  and the clips are the content. Daylight periods raise the *unlit* screens' brightness
  floor so switched-off screens read as screens rather than black holes, and scale the
  marquee/screen glow down. The lit logic (`--sds-screen-lit`, DT3/DT4) is untouched.
- **Only the lot changes.** The hero and exit beats, chrome, loader and footer keep the
  portfolio palette. The lot is a window onto the time of day, not the whole page.
- **Art is generated raster, recoloured by CSS.** Trees are alpha masks filled with the
  period's tree colour, so one silhouette serves six palettes; the car is a full-colour
  rear-view sprite. Four PNGs, produced by Evan with an image model in a MANUAL phase,
  against a contract checked per-pixel (`EVO-TOOL-054`, `EVO-TOOL-055`).
- **No new dependencies** (`EVO-UNI-012`). The host has no ImageMagick, PIL or sharp
  (probed 2026-09-08); every image check runs in Chromium via canvas, which Playwright
  already provides.
- **Accessibility unchanged.** Car, beam, orb, stars and trees are `aria-hidden` and
  `pointer-events: none`; the screens remain the only controls. Reduced motion is
  unaffected — nothing here moves on its own.

## Architecture

### The period engine (`theater/src/page/period.ts`, new)

A port of jourNOW's `frontend/src/utils/timePeriod.ts` (read 2026-09-08: six periods,
`getPeriod(date = new Date())` on `date.getHours()`, `applyPeriod()` writing
`document.documentElement.dataset.period`, re-applied on `visibilitychange` from
`main.tsx`), extended with the override and made injectable for tests:

```ts
export const PERIODS = ['dawn', 'morning', 'afternoon', 'sunset', 'evening', 'night'] as const
export type Period = (typeof PERIODS)[number]
export const PERIOD_ATTRIBUTE = 'data-period'
export const PERIOD_PARAM = 'period'

/** jourNOW's bands: dawn 05–07, morning 08–11, afternoon 12–16, sunset 17–19,
 *  evening 20–21, night 22–04. Throws RangeError for anything but an integer 0–23. */
export function periodForHour(hour: number): Period
export function getPeriod(date?: Date): Period                       // periodForHour(date.getHours())
/** `?period=<name>` → that period; absent, empty, or not one of PERIODS → null. */
export function periodFromSearch(search: string): Period | null      // URLSearchParams (EVO-FE-183)
export function applyPeriod(root: HTMLElement, period: Period): void // sets PERIOD_ATTRIBUTE
/** Apply once; with no override, re-apply on `visibilitychange` while visible.
 *  Returns the uninstaller. */
export function installPeriod(
  root: HTMLElement,
  options: { search: string; now?: () => Date; doc?: Document },
): () => void
```

`main.ts` calls `installPeriod(document.documentElement, { search: location.search })`
**before** `createEngine`, so the attribute is on the root before the loader's curtain
lifts and the first painted sky is the right one. The attribute goes on `<html>` because
the theater already scopes its light theme as `:host([data-theme="light"]), :root[data-theme="light"]`
(`SDS-009` — every token block is `:host, :root`, never `:root` alone).

Why `visibilitychange` and not a timer to the next boundary: it is what jourNOW ships,
it costs nothing, and a visitor who leaves the tab open across 19:59 → 20:00 sees the
change the next time they look. A timer would be a second clock (`SDS-001` in spirit).

### Tokens (`theater/src/styles/tokens.css`)

New lot roles, declared in the base `:host, :root` block **at their night values**, then
restated per period in six `:host([data-period="…"]), :root[data-period="…"]` blocks
(the night block restates only `--sds-star-alpha`, so an explicit `night` and an absent
attribute are the same palette):

| Role | Night (base = today) | What it drives |
|---|---|---|
| `--sds-sky-top` / `--sds-sky-mid` / `--sds-sky-low` | `#0a0520` / `#0d1033` / `#120a2e` | `--sds-sky`, now composed from these three |
| `--sds-asphalt` / `--sds-asphalt-far` | unchanged `#14102b` / `#0a0520` | the ground plane (already roles; now per period) |
| `--sds-star-alpha` | `1` | opacity of the star layer |
| `--sds-tree` | `#05030f` | fill behind the tree masks |
| `--sds-unlit-floor` | `0.35` | an unlit screen's brightness (today's literal `0.35`) |
| `--sds-glow` | `1` | multiplier on marquee and screen halo alphas |
| `--sds-headlight` | `1` | opacity of the beam and tail-light glows |
| `--sds-orb`, `--sds-orb-halo`, `--sds-orb-x`, `--sds-orb-y`, `--sds-orb-size`, `--sds-orb-halo-size` | moon: `#e9e7f7`, `rgba(233,231,247,.35)`, `78%`, `13%`, `56px`, `40px` | the sun/moon element |
| `--sds-beam` | `rgba(255,236,190,.42)` | the headlight cone's colour |

The five other palettes are **in the wireframe's `<style>`** (dawn, morning, afternoon,
sunset, evening — sky stops, asphalt, star alpha, tree, floor, glow, headlight, orb) and
are transcribed verbatim by DT13; the wireframe is the approved source for those values.
Recorded departure from the file's primitives/semantic split: the period blocks set
semantic roles with raw values directly. A primitives layer per period would be six
copies of one indirection with no second consumer; a comment in the file says so.

### The sky, the ground and the lighting (`theater/src/styles/global.css`, `lot/build-lot.ts`, `lot/geometry.ts`)

- **Stars** move off `.sds-lot`'s background stack onto `.sds-lot::before` (same ten
  radial gradients) with `opacity: var(--sds-star-alpha)`. `.sds-lot`'s background
  becomes `var(--sds-sky)` alone.
- **Orb**: `buildLot` appends one `.sds-lot__orb` `<div aria-hidden>` to the *stage*
  (`.sds-lot`, outside `.sds-lot__world`, so it never moves). CSS positions and colours
  it entirely from the `--sds-orb-*` roles; a `box-shadow` is the halo.
- **The ground is sized from the geometry.** Today `.sds-lot__ground` is `height: 4800px`
  and its near edge sits at the camera (`translateZ(0)`), which was written for eight
  screens and a night sky. With 20 projects the lot is `lotZ(1, 20) = 16 800px` deep: at
  progress 0 the region below the 58 % ground line shows `--sds-sky-low`, and past
  progress ≈ 0.3 the plane is entirely behind the camera and every remaining screen
  stands on sky. Invisible today because `--sds-lot-sky-low` (`#120a2e`) and the asphalt
  (`#14102b`) are near-identical; under a morning sky it is a lot floating on blue.
  Fix (DT13): `geometry.ts` exports `GROUND_LEAD = SPACING` (how far in front of the
  camera the near edge starts — 800 < the wide `perspective` of 900, so at progress 0 the
  edge projects far below the viewport; at the narrow perspective of 600 it is already
  behind the camera, which is the same condition every screen passes through) and
  `groundDepth(count) = lotZ(1, count) + 5 * SPACING` (near edge at `+SPACING`, far edge
  three spacings beyond the camera at progress 1). `buildLot` writes them to the stage as
  `--sds-ground-lead` / `--sds-ground-depth` (px, like `--sds-ground-line`), and the CSS
  reads `height: var(--sds-ground-depth)` and
  `transform: translateZ(var(--sds-ground-lead)) rotateX(-90deg)`. Constants live once
  (`EVO-UNI-057`).
- **Unlit floor**: `.sds-screen__surface`'s
  `filter: brightness(calc(0.35 + 0.65 * var(--sds-screen-lit, 0)))` becomes
  `brightness(calc(var(--sds-unlit-floor) + (1 - var(--sds-unlit-floor)) * var(--sds-screen-lit, 0)))`
  — identical at night, a higher floor by day. Marquee and screen halo alphas gain a
  `* var(--sds-glow)` factor inside their existing `color-mix()` percentages.

### Scenery (`theater/src/lot/scenery.ts`, new; `lot/build-lot.ts`; `lot/lot-scene.ts`; `lot/art.ts`, new)

- **`scenery.ts` is pure arithmetic, no DOM**, like `geometry.ts`:
  `TREE_SETBACK = 420` (trees stand at `x = ±(OFFSET + TREE_SETBACK) = ±900`, outside the
  screens' `±480`, so no tree is ever between the camera and a screen), `TREE_SPACING =
  SPACING / 2`, `TREE_LEAD = 100` (the first left tree's depth), `TREE_VARIANTS = 3`, and
  a fixed eight-entry `TREE_JITTER` table of `{ dx, scale }` (outward-only `dx` in
  `{0, 40, 60, 80}`, scale in `0.9–1.15`) — a table, never `Math.random`, because a
  rebuilt scene must look identical (`SDS-001`).
  `treePlacements(count): readonly TreePlacement[]` with
  `TreePlacement = { side: 'left' | 'right'; x: number; z: number; scale: number; variant: 0 | 1 | 2 }`:
  for each side, index `i` from 0 while `z ≥ -(lotZ(1, count) + SPACING)`, with
  `z = -(TREE_LEAD + i · TREE_SPACING)` on the left and the right side offset by half a
  `TREE_SPACING` so the rows alternate; `x = side · (OFFSET + TREE_SETBACK + jitter[i % 8].dx)`;
  `scale = jitter[i % 8].scale`; `variant = (i + (right ? 1 : 0)) % 3`. Left trees first,
  then right. For `count = 8` that is 20 + 20 trees; for the current 20 projects, 44 + 44.
  The row grows with the lot, so a 21st project needs no scenery change.
- **`art.ts`** owns the four asset URLs, built from `import.meta.env.BASE_URL` (they are
  theater assets under `theater/public/art/`, served at `/theater/art/…` — unlike the
  posters, which are the site's): `CAR_SPRITE`, `TREE_MASKS` (three). One
  `ART_EXTENSION` constant (`'png'`; see the fallback under DT14).
- **`buildLot`** appends, inside `.sds-lot__world` after the ground and before the
  screens, one `<span class="sds-tree sds-tree--left|right" aria-hidden data-tree-variant>`
  per placement with inline `--sds-tree-x`, `--sds-tree-z`, `--sds-tree-scale` (the same
  custom-property placement pattern as screens, so the narrow breakpoint can restate `x`
  in CSS with `!important`, exactly as `.sds-screen` does). No mask yet — see the loader.
  It also appends to the *stage* a `.sds-lot__beam` `<div aria-hidden>` and a
  `.sds-lot__car` `<div aria-hidden data-car="pending">`.
- **`lot-scene.ts`** declares the car sprite and the three tree masks through
  `sharedAssetLoader.add({ url, kind: 'image' })` alongside the posters in `load()`
  (progress units become `projects.length + 4 + 1`), and releases them in `destroy()`.
  When the car arrives with `naturalWidth ≥ MIN_CAR_PX` (640) the decoded `<img alt="">`
  is placed in `.sds-lot__car` and `data-car="ready"`; otherwise `data-car="missing"` and
  the beam and tail-light glows still render — an honest state, not a hole
  (`EVO-UNI-053`). When a tree mask arrives, every `.sds-tree` of that variant gets
  `mask-image: url(…)` (and `-webkit-mask-image`) set from JS; a mask that failed leaves
  its variant unmasked-and-invisible (CSS treats a failed mask image as fully
  transparent) and is reported through the loader's usual failure list. Setting the
  mask *after* the loader has the bytes is what keeps `SDS-006` true for a URL that CSS
  will fetch: the mask request is then a cache hit, not a second undeclared download.
  `LotSnapshot` gains `trees: number` (elements built) and
  `car: 'pending' | 'ready' | 'missing'`.
- **CSS**: `.sds-tree` — absolute, bottom on the ground line, `width: 260px; height: 390px`
  (the 800×1200 mask at `contain`), `transform: translate3d(var(--sds-tree-x), 0, var(--sds-tree-z)) scale(var(--sds-tree-scale))`
  with `transform-origin: 50% 100%`, `background: var(--sds-tree)`,
  `mask: … center bottom / contain no-repeat`, `pointer-events: none`, **no** `filter`
  and no `transform-style` of its own. `.sds-lot__car` — absolute, `left: 50%`,
  `bottom: -1%`, `width: clamp(320px, 38vw, 620px)`, `translateX(-50%)`, `pointer-events:
  none`; its `::before`/`::after` are the tail-light glows (radial gradients, `opacity:
  var(--sds-headlight)`). `.sds-lot__beam` — a `clip-path` trapezoid from just above the
  car to the horizon, `linear-gradient(to top, var(--sds-beam), transparent)`, `opacity:
  var(--sds-headlight)`. Narrow (`max-width: 767px`): trees restated to `x = ∓360px`
  (`!important`, as the screens' `x` is), car `width: 64vw`, beam `width: 70%`. All from
  the wireframe.
- **Stacking**: stars (`::before`) and orb behind the world; beam and car in front of
  it. The car covers the bottom ~35 % of the stage at its centre; because it does not
  hit-test, a screen passing through that region is still clickable, and
  `scenery.spec.ts` proves it with `document.elementFromPoint`.

### Art contract (`theater/public/art/`, MANUAL)

| File | Canvas | Content | Checks (all per-pixel, in Chromium) |
|---|---|---|---|
| `car.png` | 1600 × 900 | rear view of one car, centred, tail-lights, no ground shadow, no text | real alpha: all four corner pixels α = 0; transparent fraction 15–85 %; α > 0 bounding box ≥ 960px wide (the body fills ≥ 60 %); ≤ 400 KB |
| `tree-1.png`, `tree-2.png`, `tree-3.png` | 800 × 1200 | one tree silhouette each (deciduous / conifer / tall), single trunk reaching the bottom edge, centred, no ground | corners α = 0; transparent fraction 15–85 %; α > 0 bounding box bottom within 5 % of the canvas bottom; ≤ 400 KB. Colour is ignored — only alpha is used |

`EVO-TOOL-054`: some image models draw a checkerboard *into opaque pixels* to depict
transparency; `file`'s "RGBA" says nothing. So the checker reads `getImageData` alpha
(`EVO-TOOL-055`), and additionally warns when the four corners are opaque and near-grey
or near-white (the checkerboard tell). **Fallback, decided now:** if no generation passes
after a reasonable number of tries, the wireframe's placeholder silhouettes and car (the
inline SVGs in `docs/wireframes/theater-drive-in-theme.html`) are saved as
`theater/public/art/{car,tree-1,tree-2,tree-3}.svg` by the checker page's "download
placeholders" control, and DT15 sets `ART_EXTENSION = 'svg'`. The theme ships either
way; the art phase can never block the lot.

### Playwright (`theater/e2e/`)

- `helpers/app.ts` gains `PINNED_PERIOD: Period = 'night'` and
  `APP_URL = \`${APP_PATH}?${PERIOD_PARAM}=${PINNED_PERIOD}\``; `openPage` navigates to
  `APP_URL`, and `reveal.spec.ts`'s two direct `page.goto(APP_PATH)` calls become
  `APP_URL`. `APP_PATH` stays for the parity script and the period spec. A
  `periodAttribute(page)` helper reads the root attribute.
- `period.spec.ts` (DT12, extended in DT13): each of the six `?period=` values sets the
  attribute; `?period=bogus` and no parameter fall back to the clock, pinned with
  `page.clock.install({ time })` before `goto` (18:30 → `sunset`, 03:00 → `night`);
  from 19:59, advancing the clock past 20:00 and dispatching `visibilitychange` yields
  `evening`, while the same steps under `?period=sunset` leave `sunset`. DT13 adds: for
  each period the computed `--sds-sky-top` on the root equals the literal hex the
  wireframe specifies (a token wired to nothing would pass the attribute check and fail
  this one), and the star layer's computed opacity is `0` for `afternoon` and `1` for
  `night`.
- `scenery.spec.ts` (DT15): `.sds-tree` count equals `treePlacements(projects.length).length`;
  the car element carries `data-car="ready"`; `elementFromPoint` at the car's centre is
  neither the car, the beam nor anything inside them; the first left tree's computed
  transform carries `translate3d(-900px, 0, -100px)` — the literal, not the constant.
- `art.spec.ts` (DT15): for each of the four sprites, load it in the page, draw it to a
  canvas and assert the contract above (dimensions, corner alpha, transparent fraction,
  bounding box). This is the permanent form of the checker page's verdict.
- `nginx-parity.sh` gains `/theater/art/car.png` → 200 and `image/png`.
- Every new spec is falsified once against a deliberate breakage (`EVO-UNI-061`), as DT6
  did: a `periodForHour` that always returns `night`; a `treePlacements` that returns
  `[]`; a car sprite swapped for a 1×1.

## Core assumption

**Roughly ninety static masked planes inside the transformed world, plus a stage-anchored
car overlay with a blurred glow, keep the drive at ≥ 50 fps (DTF's band, lowest 1 s
window) and leave every screen clickable and Tab-reachable — and `mask-image` actually
paints on a plane under `preserve-3d` in Chrome and Firefox.**

Searched 2026-09-08: DTF (`docs/spikes/2026-08-25-transformed-video-probe.html`, decision
row in `docs/roadmaps/drive-in-theater-roadmap.md`, session log
`2026-08-25-11-20-claude-code-dtf-transformed-video-probe.md`) measured the eight-screen
`lot` at 227 fps median against a 50 fps floor, the 32-screen `overload` control at 176,
and recorded GO; `docs/evals/` does not exist in this repo; no sibling repo has measured
CSS masks under 3D transforms (grep of `mask-image` across `/home/evan/EVOsystem/*/docs`
and `*/src` returns nothing relevant).

**Transfer argument, and why it does not hold on its own.** DTF's headline finding was
that decoder count dominates and the transform stack is close to free — 32 transformed
screens with `filter: brightness()` still ran at 176 fps. Trees add no decoders and no
filters. What they add is *layers*: each masked plane is its own compositor layer, and
88 of them (44 per side at 20 projects) is more than DTF's 32 screens; the car's
`filter: blur()` on two pseudo-elements is a per-frame raster cost DTF never had; and
masks on 3D-transformed elements have a history of rendering quirks (a mask establishes
a stacking context, which flattens `preserve-3d` for the masked element's descendants —
harmless for a leaf, but never checked here). None of that is measured. So the
assumption is **not measured**, and DT11 is a cheap falsifier that runs first: it copies
the DTF probe's `lot` variant and in-page `?measure=all` harness (three 10 s runs, median
of the lowest 1 s window), adds a `scenery` variant (8 screens + 88 masked planes + orb +
beam + car with blurred glows), a `scenery-half` mitigation (44 planes — one per band per
side) and a `scenery-overload` failing control (4× the planes), and pre-registers the
bands before any number is taken (`EVO-UNI-091`, `EVO-UNI-120`, `EVO-UNI-021`).

Outcomes and what each changes: **GO** (scenery ≥ 50 fps, overload reads lower than
scenery, click + Tab pass, trees visibly paint) → DT15 as specified. **GO-REDUCED**
(scenery 30–49, scenery-half ≥ 50) → DT15 ships `TREE_SPACING = SPACING`. **NO-GO**
(scenery-half < 50, or trees do not paint, or click/Tab fails) → DT15 ships the car only
and trees leave the roadmap; Evan's call, recorded in the decision row. DT12 and DT13 do
not depend on the verdict — sky and period are worth shipping under every outcome —
which is why the falsifier is first but they are not gated on it.

A second, smaller assumption: **an image model available to Evan can produce PNGs with
real alpha.** `EVO-TOOL-054` records that this fails often enough to have a rule. It is
not measured here and does not need a falsifier phase: DT14 is itself the test, the
checker page gives a per-file verdict in seconds, and the SVG fallback above means a
failure costs the look, never the roadmap.

## What already exists

| File | Layer | Status |
|---|---|---|
| `theater/src/lot/geometry.ts` — `SPACING`, `OFFSET`, `GROUND_LINE`, `lotZ`, `screenPlacement`, `activeScreen`, `screenProgress` | geometry | Complete; gains `GROUND_LEAD`, `groundDepth` (DT13) |
| `theater/src/lot/build-lot.ts` — stage, world, ground, screens, one timeline; writes `--sds-ground-line`, `--sds-screen-{x,z,yaw,lit}` | scene DOM | Complete; gains orb + ground properties (DT13), trees + car + beam (DT15) |
| `theater/src/lot/lot-scene.ts` — posters via loader, `snapshot()`, clip activation | scene | Complete; gains four art assets, car placement, tree masks, two snapshot fields (DT15) |
| `theater/src/styles/tokens.css` — `--sds-sky` gradient, `--sds-asphalt*`, `--sds-star*`, `[data-theme="light"]` block, all `:host, :root` | tokens | Partial: no period roles, no period blocks (DT13) |
| `theater/src/styles/global.css` — `.sds-lot` starfield background, `.sds-lot__ground` (4800px, `translateZ(0)`), `.sds-screen__surface` brightness `0.35 + 0.65·lit`, narrow overrides | CSS | Partial: fixed ground depth, literal floor, stars on the stage background (DT13); no tree/car/beam rules (DT15) |
| `theater/src/main.ts` — `createEngine`, focus-drives-page | entry | Complete; gains `installPeriod` before the engine (DT12) |
| `theater/src/page/` — `chrome.ts` only | page | Missing `period.ts` (DT12) |
| `theater/src/lot/scenery.ts`, `theater/src/lot/art.ts` | geometry / assets | Missing (DT15) |
| `theater/public/art/*` | assets | Missing (DT14) |
| `theater/e2e/helpers/app.ts` — `APP_PATH`, `openPage`, `scrollToScreen`, `worldZ`, `screenLit` | e2e | Complete; gains `APP_URL`, `PINNED_PERIOD`, `periodAttribute` (DT12) |
| `theater/e2e/{reveal,drive,active-screen,click-through,reduced-motion,keyboard}.spec.ts`, `nginx-parity.sh` | e2e | Complete; `reveal.spec.ts` navigates by `APP_PATH` twice (DT12 pins it); parity gains the art check (DT15) |
| `theater/src/test-setup.ts` — `matchMedia` fake, `ResizeObserver`, media `play/pause` | tests | Complete; nothing new needed (period tests inject `now` and `doc`) |
| `theater/src/test-helpers/fake-image.ts` — `createFakeImages({ autoSettle })` | tests | Complete; `autoSettle` keyed by URL lets DT15's tests fail one art asset and pass the rest |
| `docs/spikes/2026-08-25-transformed-video-probe.html` + `probe-clip-*.mp4` | spike | Complete receipt for DTF; DT11 copies its `lot` variant and harness into a new file rather than editing the receipt |
| `docs/wireframes/theater-drive-in-theme.html` | wireframe | Candidate written 2026-09-08 (six palettes, trees, car, beam, orb, ground depth) — approval pending |
| jourNOW `frontend/src/utils/timePeriod.ts` (cross-repo, read directly) | reference | The hour bands and the `visibilitychange` pattern; not a dependency |

## Phase breakdown

| Phase | Name | Layer | Effort | Depends on |
|---|---|---|---|---|
| DT11 | Falsifier: scenery layers, masks under 3D, the car overlay; plus the art checker page | spike | S | — |
| DT12 | Period engine, `?period=` override, e2e pin | frontend | S | — |
| DT13 | Sky, orb, lighting roles and a geometry-sized ground, six palettes | frontend | M | DT12; wireframe approved |
| DT14 | Generate and commit the four sprites | media [MANUAL] | — | DT11's checker page |
| DT15 | Trees, the visitor's car, the beam; scenery and art specs; parity | frontend | M | DT11 `GO`/`GO-REDUCED`, DT13, DT14; wireframe approved |

Execution order is the table order. DT11 runs first because it is the falsifier and
because DT14 needs its checker page; DT12 and DT13 could run under any DT11 outcome.

## Per-phase detail

**DT11 — Falsifier and checker (spike, S).** Writes
`docs/spikes/2026-09-08-scenery-probe.html`: the DTF probe's `lot` variant and
`?measure=all` harness copied (not linked — the DTF file is a frozen receipt), plus
`scenery`, `scenery-half` and `scenery-overload` variants whose trees are masked planes
using a generated in-page mask (a canvas-drawn silhouette exported to a data URL at 800×1200,
so the probe needs no art), an orb, a beam, and a car `<div>` with two blurred
pseudo-element glows sized like the real one. Pre-registers the three bands in the header.
Also writes `docs/spikes/art-check.html`: drop or pick PNG/SVG files → per file, the
dimensions, four corner alphas, transparent fraction, α > 0 bounding box, the
checkerboard warning, file size, and a PASS/FAIL against the contract for the filename
(`car` vs `tree-*`), plus a "download placeholder set" control that saves the wireframe's
four inline SVGs as files. Evan measures (Chrome; Firefox if present) and records the
decision row in the roadmap. Unlocks: a number behind the tree count, and the tool DT14
is accepted with.

**DT12 — Period engine (frontend, S).** `page/period.ts` and `page/period.test.ts`
(every hour 0–23 against its literal period; `periodFromSearch` for all six, an unknown
name, an empty string and a missing parameter; `installPeriod` with an injected `now`:
applies the clock, applies an override, re-applies on `visibilitychange` when there is
no override and the hour has crossed a band, does not when overridden, and uninstalls);
`main.ts` wiring; `e2e/helpers/app.ts` pin; `reveal.spec.ts` on `APP_URL`;
`e2e/period.spec.ts` attribute-level. Nothing visible changes — the tokens have no period
blocks yet — so the whole existing suite must stay green with the pin in place. Unlocks:
a root attribute every later phase's CSS can hang on, and a suite that is deterministic
by construction.

**DT13 — Sky, orb, lighting, ground (frontend, M).** `tokens.css` roles and six blocks
transcribed from the wireframe; `global.css` star layer, orb, ground from the two new
properties, floor and glow arithmetic; `geometry.ts` `GROUND_LEAD` + `groundDepth` with
literal tests (`groundDepth(8) = 11200`, `groundDepth(20) = 20800`); `build-lot.ts` orb
element and the two properties on the stage, with `build-lot.test.ts` asserting the
stage's inline values for the real `projects.length`; `period.spec.ts` gains the
computed-token and star-opacity assertions. Manual check against the wireframe in all six
periods and at 390px. Unlocks: the theater matches the visitor's clock, and the ground
reaches the end of the lot in daylight.

**DT14 — Art (MANUAL, Evan).** Generate four sprites with an image model, run each through
`docs/spikes/art-check.html`, iterate until all four PASS (or take the SVG fallback), copy
them to `theater/public/art/`, commit as `feat(dt14): drive-in art sprites` the moment
they pass (`EVO-UNI-090`). The phase carries the prompts. Unlocks: DT15 has real pixels.

**DT15 — Scenery and the car (frontend, M).** `lot/scenery.ts` + literal tests
(`treePlacements(8)` is 40 entries; the first left entry is
`{ side: 'left', x: -900, z: -100, scale: 1.05, variant: 0 }`; the first right entry is
at `z = -300` with `variant: 1`; the last left entry's `z ≥ -8000`; `treePlacements(20)`
is 88), `lot/art.ts`, `build-lot.ts` trees/car/beam, `lot-scene.ts` art through the
loader + placement + masks + snapshot fields, `global.css` rules, `lot-scene.test.ts`
cases (car ready / car missing via a 1×1 / one tree mask failing leaves the other two
variants masked), contract test still green (`SDS-003`), `e2e/scenery.spec.ts`,
`e2e/art.spec.ts`, parity check, `<branch>` on DT11's verdict (`GO` / `GO-REDUCED`) and on
`ART_EXTENSION`. Unlocks: the finished drive-in — car, trees, sky and time of day.

## Applicable rules

Sources, as in the parent spec: the shared tier
(`/home/evan/EVOsystem/infra/skills/rules-index/references/{universal,tooling,react-frontend}.md`)
and the vendored law (`theater/skills/rules-index/SKILL.md`, `SDS-*`). `portfolio_site`
still has no `project-context` skill and no local rules index; `AGENTS.md` is the
orientation document.

**All phases:** `EVO-UNI-011` (no out-of-scope features — no period toggle, no parked
cars, no clock-driven sun), `EVO-UNI-012` (no dependencies — the probe and the checker
are plain HTML; every image check is canvas), `EVO-UNI-014` (grep consumers before
changing `LotSnapshot`, `buildLot`, `APP_PATH`), `EVO-UNI-057` (`GROUND_LEAD`,
`TREE_SPACING`, `TREE_SETBACK` live once; CSS receives them as properties),
`EVO-UNI-026` / `EVO-UNI-037` / `EVO-UNI-038` (session discipline; session log via
`writing-session-logs`), `EVO-UNI-072` / `EVO-UNI-119` (check whether the phase landed;
diff `<context>` against the tree), `EVO-TOOL-023` / `EVO-TOOL-024`, `EVO-TOOL-111` (no
bind mount — `rebuild-restart` for every served check), `SDS-001`, `SDS-002`, `SDS-004`,
`SDS-005`, `SDS-009` for anything under `theater/src`.

**Per phase:**
- **DT11:** `EVO-UNI-091` (enumerate outcomes and the decision each changes — done above),
  `EVO-UNI-120` (a failing control: `scenery-overload`), `EVO-UNI-021` (baseline `lot`
  first), `EVO-TOOL-055` (the checker reads canvas alpha), `EVO-TOOL-054` (the checkerboard
  warning).
- **DT12:** `EVO-FE-183` (`URLSearchParams`, never string parsing), `EVO-UNI-017` /
  `EVO-UNI-018` (literal periods per hour), `EVO-UNI-015` — *intentional departure*: the
  period tests construct fixed-hour `Date`s (`new Date(2026, 0, 1, 9)`), not
  `Date.now()`-relative fixtures, because the unit under test is the hour band and a
  relative fixture would test whatever hour the suite happens to run at; `EVO-TOOL-071`
  (the e2e waits on the attribute, never a timeout), `EVO-UNI-061` (falsify once).
- **DT13:** `EVO-UNI-001` / `EVO-UNI-002` / `EVO-UNI-003` / `EVO-UNI-030` (roles, no hex
  fallbacks; the period blocks' raw values are a recorded structural departure inside
  the tokens file, not a component hardcode), `EVO-FE-239` (tokens before global CSS —
  unchanged), `EVO-UNI-048` (the built lot carries everything the approved wireframe
  shows: orb, star layer, ground to the horizon in daylight), `EVO-UNI-109` (ground-depth
  tests assert `11200` and `20800`, not `lotZ(1, n) + 5 * SPACING`), `SDS-009`.
- **DT14:** `[MANUAL]`; `EVO-TOOL-054`, `EVO-TOOL-055`, `EVO-UNI-090` (commit each passing
  file at once).
- **DT15:** `SDS-006` (four declared assets; masks set only after the loader has them —
  the recorded nuance above), `EVO-UNI-053` (a missing car is `data-car="missing"` with
  the beam still drawn; a missing mask variant is invisible, never a grey box),
  `EVO-UNI-109` (placement tests are literals), `EVO-UNI-061` (each new spec falsified),
  `EVO-TOOL-071`, `SDS-003` (the contract run still passes with a bigger `load()`).

## Prerequisites

- Node and pnpm on the host as before (24.16.0 / 11.15.1, verified 2026-08-25); Docker +
  `evo-net` for served checks (`rebuild-restart`); the theater's Playwright Chromium
  installed (it rendered the wireframe on 2026-09-08).
- **Wireframe approval** of `docs/wireframes/theater-drive-in-theme.html` by Evan — before
  DT13 and DT15 are executed (and before the roadmap's UI phases are considered final).
- **DT11's decision row** (`GO` / `GO-REDUCED` / `NO-GO`) before DT15.
- **DT14's four files** committed before DT15 (or the SVG fallback taken).
- An image model Evan can drive for DT14 (Codex with image output, ChatGPT, or any other;
  the checker page is the contract, so the tool does not matter).

## Open questions

- `[FYI]` `theater/index.html`'s hero eyebrow still reads "Now showing · 8 projects" with
  20 on the lot. Unrelated to this roadmap; noted for a separate one-line fix.
- `[FYI]` DTF's measurement was Chrome-only (Firefox absent, no Mac). DT11 inherits the
  same limitation; its bands say "in every browser measured" and record which.
- `[FYI]` The `--sds-orb-*` positions are percentages of the stage; on very wide viewports
  the sun may overlap a near screen for part of the drive. Accepted — it is behind the
  world.
- `[FYI]` `installPeriod` uses `visibilitychange` only. A visitor who keeps the tab
  visible across a band boundary sees the change on their next tab switch or reload. Same
  behaviour as jourNOW; a timer was rejected as a second clock.
- `[FYI]` The Vite `public/` directory does not exist yet; DT14 creates
  `theater/public/art/`. Vite copies `public/` into `dist/` unhashed, so the URLs are
  stable and the nginx parity check can name them.
- `[FYI]` Under `GO-REDUCED`, `TREE_SPACING = SPACING` halves the tree count; the wireframe
  shows the denser row. Accepted as a documented deviation if it happens.
