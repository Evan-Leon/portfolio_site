# Drive-In Theme — Design Spec

**Date:** 2026-09-08 (rev 2 — after the Codex adversarial review, receipt at
`docs/roadmaps/drive-in-theme-spec-codex-review.md`: 8 MAJOR / 5 MINOR, all 13 accepted)
**Status:** Source for the DT11–DT15 roadmap (Part 2)
**Extends:** `docs/superpowers/specs/2026-08-25-drive-in-theater-design.md` (the theater
itself: DTF, DT0–DT10). Phase IDs continue that sequence.
**Wireframe:** `docs/wireframes/theater-drive-in-theme.html` — **approved by Evan
2026-09-08** with two notes, both folded in: the road carries a darker lane, edge lines
and a dashed yellow centre line; the car is a late-1970s wood-panelled station wagon seen
from behind with kids in the rear-facing third row (reference photo:
`c:/Users/evan/Pictures/pics/3rd-row-facing-backwards-seats-in-a-station-wagon-v0-svsr4ztptt5d1.jpg`).

## Goal

Make `/theater/` read as a drive-in: the visitor's car sits at the bottom centre of the
lane with the lot driving past it, trees line both sides of the drive, and the sky,
lighting and ground match the visitor's own time of day — six periods, the same hour
bands jourNOW uses — so a visitor at 07:30 pulls in at dawn and one at 23:00 at night.

## Premise and constraints

- **Everything visible stays a pure function of scroll progress and one attribute.**
  The lot's `seek` is absolute (`SDS-001`); nothing added here gets its own clock. The
  period is a `data-period` attribute on the root, set once from the clock (or the
  `?period=` override) and re-evaluated only on `visibilitychange`, exactly as jourNOW
  does. Trees ride the one existing drive tween. The car is static. Sun/moon positions
  are fixed per period, not clock-driven.
- **The night palette and the lighting formula are unchanged.** The base token values
  *are* the night palette; the five other periods are override blocks, and the
  brightness expression evaluates to today's `0.35 + 0.65·lit` at night. What *is* new in
  every period, night included: the orb, the ground reaching the end of the lot, the
  road markings, the trees and the car. A root with no attribute (JavaScript off, or
  before the entry point runs) gets the night palette. The Playwright suite pins
  `?period=night` on every navigation, so every existing assertion keeps its meaning;
  the new specs cover the visitor's unpinned path.
- **No visible period control.** The override is a query parameter for tests and for
  Evan's previews.
- **Screens play in every period.** Daylight periods raise the *unlit* screens'
  brightness floor so switched-off screens read as screens rather than black holes, and
  scale the marquee/screen glow down. The lit logic (`--sds-screen-lit`, DT3/DT4) is
  untouched.
- **Only the lot changes.** Hero and exit beats, chrome, loader and footer keep the
  portfolio palette.
- **Art is generated raster, recoloured by CSS.** Trees are alpha masks filled with the
  period's tree colour; the car is a full-colour rear-view sprite. Four PNGs, produced by
  Evan with an image model in a MANUAL phase, against a contract checked per-pixel
  (`EVO-TOOL-054`, `EVO-TOOL-055`) **and** accepted visually — the per-pixel checks are
  necessary, not sufficient.
- **No new dependencies** (`EVO-UNI-012`). The host has no ImageMagick, PIL or sharp
  (probed 2026-09-08); every image check runs in Chromium via canvas.
- **Accessibility unchanged.** Car, beam, orb, stars and trees are `aria-hidden` and
  `pointer-events: none`; the screens remain the only controls. Reduced motion is
  unaffected.

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
lifts. The token blocks are written `:host([data-period="…"]), :root[data-period="…"]`
(`SDS-009`). **Which element carries the attribute depends on the host:** the standalone
page installs on `document.documentElement`, which `:root[data-period]` matches; an
embedded (shadow-root) entry would have to install on its custom-element *host*, because
`:host([data-period])` matches only that element and an attribute on the outer `<html>`
reaches nothing inside the shadow tree (verified by the review's shadow probe). There is
no embedded entry in this repo today (the parent roadmap dropped the Wix host); the
selector pair is kept so one is not silently needed later.

Why `visibilitychange` and not a timer to the next boundary: it is what jourNOW ships,
it costs nothing, and a visitor who leaves the tab open across 19:59 → 20:00 sees the
change the next time they look. A timer would be a second clock.

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
| `--sds-road-line` / `--sds-road-edge` | `#e8c547` / `rgba(240,240,255,.35)` — **period-independent** (declared once, never restated) | the dashed centre line and the lane's edge lines |

The five other palettes are **in the wireframe's `<style>`** (dawn, morning, afternoon,
sunset, evening — sky stops, asphalt, star alpha, tree, floor, glow, headlight, orb) and
are transcribed verbatim by DT13; the wireframe is the approved source for those values.
Recorded departure from the file's primitives/semantic split: the period blocks set
semantic roles with raw values directly. A primitives layer per period would be six
copies of one indirection with no second consumer; a comment in the file says so.

### The sky, the ground and the lighting (`theater/src/styles/global.css`, `lot/build-lot.ts`, `lot/geometry.ts`)

- **Stars** move off `.sds-lot`'s background stack onto `.sds-lot::before` (same ten
  radial gradients) with `opacity: var(--sds-star-alpha)`. `.sds-lot`'s background
  becomes `var(--sds-sky)` alone, and `--sds-sky` is
  `linear-gradient(180deg, var(--sds-sky-top) 0%, var(--sds-sky-mid) 45%, var(--sds-sky-low) 100%)`.
- **Orb**: `buildLot` appends one `.sds-lot__orb` `<div aria-hidden>` to the *stage*
  (`.sds-lot`, outside `.sds-lot__world`, so it never moves). CSS positions and colours
  it entirely from the `--sds-orb-*` roles; a `box-shadow` is the halo.
- **The ground is sized from the geometry.** Today `.sds-lot__ground` is `height: 4800px`
  and its near edge sits at the camera (`translateZ(0)`), written for eight screens and a
  night sky. With 20 projects the lot is `lotZ(1, 20) = 16 800px` deep: at progress 0 the
  region below the 58 % ground line shows `--sds-sky-low`, and past progress ≈ 0.3 the
  plane is entirely behind the camera and every remaining screen stands on sky (the
  review's ground probe confirmed both, at night as well as by day — invisible today only
  because `#120a2e` and `#14102b` are near-identical). Fix (DT13): `geometry.ts` exports
  `GROUND_LEAD = SPACING` (how far in front of the camera the near edge starts — 800 < the
  wide `perspective` of 900, so at progress 0 the edge projects far below the viewport;
  at the narrow perspective of 600 it is already behind the camera, the same condition
  every screen passes through) and `groundDepth(count) = lotZ(1, count) + 5 * SPACING`
  (near edge at `+SPACING`, far edge three spacings beyond the camera at progress 1).
  `buildLot` writes them to the stage as `--sds-ground-lead` / `--sds-ground-depth` (px,
  like `--sds-ground-line`), and the CSS reads `height: var(--sds-ground-depth)` and
  `transform: translateZ(var(--sds-ground-lead)) rotateX(-90deg)`. Constants live once
  (`EVO-UNI-057`).
- **The road** (Evan's note): `.sds-lot__ground::after` — today a faint purple 420px
  band — becomes the lane: a darker asphalt fill
  (`color-mix(in srgb, var(--sds-asphalt) 78%, black)`), 4px edge lines in
  `--sds-road-edge`, and a 14px-wide dashed centre line in `--sds-road-line` (dashes 140px
  of Z, gaps 180px, via a `repeating-linear-gradient` sized `14px 100%` at `center top`).
  All on the ground plane, so it recedes with the perspective. Exactly the wireframe's
  rule.
- **Unlit floor**: `.sds-screen__surface`'s
  `filter: brightness(calc(0.35 + 0.65 * var(--sds-screen-lit, 0)))` becomes
  `brightness(calc(var(--sds-unlit-floor) + (1 - var(--sds-unlit-floor)) * var(--sds-screen-lit, 0)))`
  — identical at night, a higher floor by day. Marquee and screen halo alphas gain a
  `* var(--sds-glow)` factor inside their existing `color-mix()` percentages.

### Scenery (`theater/src/lot/scenery.ts`, new; `lot/art.ts`, new; `lot/build-lot.ts`; `lot/lot-scene.ts`)

- **`scenery.ts` is pure arithmetic, no DOM**, like `geometry.ts`:
  `TREE_SETBACK = 420` (trees stand at `x = ±(OFFSET + TREE_SETBACK + dx) = ±900` or
  further out — never between the camera and a screen at `±480`), `TREE_SPACING`
  (`SPACING / 2` under `GO`, `SPACING` under `GO-REDUCED` — see the decision procedure),
  `TREE_LEAD = 100`, `TREE_VARIANTS = 3`, and the eight-entry `TREE_JITTER` table, **the
  source of truth for scale and outward offset** (the wireframe's tree list was generated
  from it):

  | i | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
  |---|---|---|---|---|---|---|---|---|
  | `dx` | 0 | 60 | 0 | 40 | 0 | 80 | 0 | 40 |
  | `scale` | 1.05 | 0.9 | 1.15 | 0.95 | 1.1 | 1.0 | 1.05 | 0.9 |

  `treePlacements(count): readonly TreePlacement[]` with
  `TreePlacement = { side: 'left' | 'right'; x: number; z: number; scale: number; variant: 0 | 1 | 2 }`:
  left trees first, then right. For index `i` from 0 while `z ≥ -(lotZ(1, count) + SPACING)`:
  left `z = -(TREE_LEAD + i · TREE_SPACING)`, right `z = -(TREE_LEAD + TREE_SPACING / 2 + i · TREE_SPACING)`
  (the rows alternate); left uses `jitter[i % 8]`, right uses `jitter[(i + 3) % 8]`;
  `x = ±(OFFSET + TREE_SETBACK + jitter.dx)`; `scale = jitter.scale`;
  `variant = (i + (right ? 1 : 0)) % 3`. A table, never `Math.random` — a rebuilt scene
  must look identical (`SDS-001`).
  **Literals the tests assert** (`EVO-UNI-109`):
  - `GO` (`TREE_SPACING = 400`): `treePlacements(8)` has 40 entries (20 + 20);
    `treePlacements(20)` has 88; first left `{ side: 'left', x: -900, z: -100, scale: 1.05, variant: 0 }`;
    first right `{ side: 'right', x: 940, z: -300, scale: 0.95, variant: 1 }`; last left
    `z = -7700` for `count = 8`.
  - `GO-REDUCED` (`TREE_SPACING = 800`): `treePlacements(8)` has 20 (10 + 10);
    `treePlacements(20)` has 44; first right `z = -500`; last left `z = -7300` for `count = 8`.
- **`art.ts`** is a **pure manifest** with no environment lookup, so Vitest, Playwright's
  Node runner and the browser can all import it:
  `ART_EXTENSION: 'png' | 'svg'` (`'png'`; see the fallback), `ART_FILES = { car: 'car', trees: ['tree-1', 'tree-2', 'tree-3'] }`,
  and `artUrls(base: string): { car: string; trees: readonly [string, string, string] }`
  returning `${base}art/${name}.${ART_EXTENSION}`. **Only `lot-scene.ts` evaluates
  `import.meta.env.BASE_URL`** (`artUrls(import.meta.env.BASE_URL)`); `e2e/` uses
  `artUrls(APP_PATH)`; unit tests key their `FakeImages` on `artUrls('/')`, because
  Vitest's `BASE_URL` is `/` in this configuration (probed 2026-09-08), not the Vite
  `base`. Importing an `import.meta.env` read into a Playwright spec throws
  `Cannot read properties of undefined (reading 'BASE_URL')` — the review reproduced it.
- **`buildLot`** appends, inside `.sds-lot__world` after the ground and before the
  screens, one `<span class="sds-tree sds-tree--left|right" aria-hidden data-tree-variant="0|1|2" data-mask="pending">`
  per placement with inline `--sds-tree-x`, `--sds-tree-z`, `--sds-tree-scale` (the same
  custom-property placement pattern as screens). It also appends to the *stage* a
  `.sds-lot__beam` `<div aria-hidden>` and a `.sds-lot__car` `<div aria-hidden data-car="pending">`.
  Nothing in `build-lot.ts` reads `import.meta.env` (e2e imports it).
- **`lot-scene.ts`** declares the car sprite and the three tree masks through
  `sharedAssetLoader.add({ url, kind: 'image' })` alongside the posters in `load()`
  (queued in drive order after the posters: car, tree-1, tree-2, tree-3; progress units
  become `projects.length + 4 + 1`), releases them in `destroy()`, and places them **in
  the same step that places the posters — after `await this.#inner.load(...)`**, because
  the lot's DOM does not exist until the inner adapter has built it (the exact gap DT4's
  clip fix documents in this file). Predicates and states, decided here so DT15 does not
  choose:
  - car usable iff `naturalWidth ≥ MIN_CAR_PX` (640) **and** `naturalHeight ≥ 360`; then
    the decoded `<img alt="">` goes into `.sds-lot__car` and `data-car="ready"`, else
    `data-car="missing"`. The beam and the tail-light glows render in both states.
  - a tree mask usable iff `naturalWidth ≥ 64` and `naturalHeight ≥ 64`; then every
    `.sds-tree[data-tree-variant="k"]` gets `mask-image: url(…)` **and**
    `-webkit-mask-image` set from JS and `data-mask="ready"`, else those trees get
    `data-mask="missing"`. **An unset `mask-image` computes to `none` and paints the
    tree's whole rectangle in `--sds-tree`** (the review measured it), so the CSS keeps
    every tree `visibility: hidden` unless `data-mask="ready"`. Pending and missing trees
    are invisible, never grey boxes.
  - `LotSnapshot` gains `trees: number` (the count of `.sds-tree` elements currently in
    the container — 0 before the inner build and after `destroy()`) and
    `car: 'pending' | 'ready' | 'missing'` (`pending` until placement decides; unchanged
    by `destroy()`).
  Setting the mask *after* the loader has the bytes is what keeps `SDS-006` true for a
  URL that CSS will fetch: the mask request is then a cache hit, not a second undeclared
  download. `lot-scene.contract.test.ts`'s "declares every poster … and nothing else"
  assertion (line 76 today) becomes posters followed by the four art URLs from
  `artUrls('/')`, in that order.
- **CSS**: `.sds-tree` — absolute, bottom on the ground line, `width: 260px; height: 390px`
  (the 800×1200 mask at `contain`), `transform: translate3d(var(--sds-tree-x), 0, var(--sds-tree-z)) scale(var(--sds-tree-scale))`,
  `transform-origin: 50% 100%`, `background: var(--sds-tree)`,
  `mask: … center bottom / contain no-repeat` (the image comes from the inline property),
  `pointer-events: none`, `visibility: hidden` overridden to `visible` by
  `[data-mask="ready"]`, **no** `filter` and no `transform-style` of its own.
  `.sds-lot__car` — absolute, `left: 50%`, `bottom: -1%`, `width: clamp(320px, 38vw, 620px)`,
  **`aspect-ratio: 16 / 9`** (so the wrapper keeps its height when the image is missing
  and the glows still have a box — the review measured `0px` without it),
  `translateX(-50%)`, `pointer-events: none`; its `::before`/`::after` are the tail-light
  glows (radial gradients, `opacity: var(--sds-headlight)`). `.sds-lot__beam` — a
  `clip-path` trapezoid from just above the car to the horizon,
  `linear-gradient(to top, var(--sds-beam), transparent)`, `opacity: var(--sds-headlight)`.
  Narrow (`max-width: 767px`): `.sds-tree` becomes `180px × 270px` (`margin-left: -90px`)
  with `x` restated to `∓360px` (`!important`, as the screens' `x` is), car `width: 64vw`,
  beam `width: 70%`. All from the wireframe.
- **Stacking**: stars (`::before`) and orb behind the world; beam and car in front of
  it. The car covers the bottom ~35 % of the stage at its centre; because it does not
  hit-test, a screen passing through that region is still clickable, and
  `scenery.spec.ts` proves it positively (below).

### Art contract (`theater/public/art/`, MANUAL)

| File | Canvas | Content | Structural checks (per-pixel, in Chromium) |
|---|---|---|---|
| `car.png` | 1600 × 900 | **Rear view of a late-1970s American full-size station wagon**, wood-grain side panels, chrome bumper, vertical tail-lights, roof rack; the tailgate window is down and **two or three kids in the rear-facing third-row seat look out the back at the visitor**, one waving. Centred, no ground shadow, no text, no licence-plate text. Reference: Evan's photo (path in the header) | corner pixels α = 0; transparent fraction 15–85 %; α > 0 bounding box ≥ 960px wide; ≤ 400 KB |
| `tree-1.png`, `tree-2.png`, `tree-3.png` | 800 × 1200 | one silhouette each (deciduous / conifer / tall), single trunk reaching the bottom edge, centred, no ground. Colour is ignored — only alpha is used | corners α = 0; transparent fraction 15–85 %; α > 0 bounding box bottom within 5 % of the canvas bottom; ≤ 400 KB |

**Structural PASS is necessary, not sufficient.** The review built a 1600×900 file
containing nothing but a checkerboard with transparent margins and it passed every
numeric check above. So acceptance has two halves:

1. *Structural* — the checks in the table, run by `docs/spikes/art-check.html` (DT11) and
   permanently by `e2e/art.spec.ts` (DT15). The checker also warns on the checkerboard
   tell (`EVO-TOOL-054`): ≥ 30 % of the opaque pixels inside the α > 0 bounding box are
   near-grey or near-white (`|r−g|, |g−b| < 12` and `r > 180`). The checker ships a
   "show me a wrong fixture" control that generates exactly the review's transparent-
   bordered checkerboard, so DT11 can prove the warning fires (`EVO-UNI-061`).
2. *Visual* — the checker composites each file over white, black and the six
   `--sds-tree` colours (trees as masks, the car as an image), and Evan confirms four
   statements per file before it is committed: the subject is the one described; nothing
   but the subject is opaque (no baked checkerboard, halo or backdrop); the trunk reaches
   the bottom edge (trees); the tail-lights and window read at 320px wide (car).

**Fallback, decided now:** if no generation passes both halves after a reasonable number
of tries, the wireframe's placeholder silhouettes and wagon are exported by the checker
page's "download placeholder set" control **as standalone SVG files with explicit
intrinsic dimensions** — `width="1600" height="900"` for the car, `width="800" height="1200"`
for the trees, `viewBox` preserved, colour references decoded — because the wireframe's
inline data URIs have no intrinsic size and load at 267×150 / 100×150 (measured), which
fails `MIN_CAR_PX` and every dimension check. Saved as
`theater/public/art/{car,tree-1,tree-2,tree-3}.svg`; DT15 sets `ART_EXTENSION = 'svg'`;
the structural checks run on the SVG rasterised to a canvas at its intrinsic size; the
parity script requests `car.${ART_EXTENSION}` and expects `image/svg+xml` in that
branch. The theme ships either way; the art phase can never block the lot.

### Playwright (`theater/e2e/`)

- `helpers/app.ts` gains `PINNED_PERIOD: Period = 'night'` and
  `APP_URL = \`${APP_PATH}?${PERIOD_PARAM}=${PINNED_PERIOD}\``; `openPage` navigates to
  `APP_URL`, and `reveal.spec.ts`'s two direct `page.goto(APP_PATH)` calls become
  `APP_URL`. `APP_PATH` stays for the parity script, `artUrls(APP_PATH)` and the
  unpinned navigations below. A `periodAttribute(page)` helper reads the root attribute.
- `period.spec.ts` (DT12, extended in DT13). DT12: each of the six `?period=` values sets
  the attribute; `?period=bogus` and no parameter fall back to the clock, pinned with
  `page.clock.install({ time })` before `goto` (18:30 → `sunset`, 03:00 → `night`); from
  19:59, `page.clock.setFixedTime` past 20:00 plus a dispatched `visibilitychange` yields
  `evening`, while the same steps under `?period=sunset` leave `sunset`. DT13 adds
  assertions on **consumers, not declarations** (the review showed a token declared and
  never wired passes a `getPropertyValue` check): for `afternoon` and `night`, `.sds-lot`'s
  computed `background-image` contains the sky-top colour as Chromium serialises it
  (`rgb(59, 120, 200)` / `rgb(10, 5, 32)`); `getComputedStyle(lot, '::before').opacity`
  is `0` / `1`; at the middle of screen 0's band, screen 1's `.sds-screen__surface`
  computed `filter` is `brightness(0.75)` / `brightness(0.35)`; and an **unpinned daytime
  visit** — clock at 14:00, no parameter — reveals, drives to screen 1 and clicks it,
  landing on its project page.
- `scenery.spec.ts` (DT15): `.sds-tree` count equals `treePlacements(projects.length).length`
  and every one has `data-mask="ready"` and computed `visibility: visible`; the car has
  `data-car="ready"` and a computed height > 0; the first left tree's computed transform,
  parsed with `new DOMMatrixReadOnly(...)`, has `m41 = -900`, `m43 = -100`, `m11 = 1.05`
  (Chromium serialises the computed transform as `matrix3d(...)`, never as the
  `translate3d(...)` string — the review checked); and the **positive click-through under
  the car**: at a 390×720 viewport (single-file layout), scrolled to three quarters
  through screen 0's band (`screenProgress(0) + 0.75 · (screenProgress(1) − screenProgress(0))`),
  screen 0's bounding box must overlap `.sds-lot__car`'s (asserted, not assumed), a point
  inside the intersection resolves via `elementFromPoint(...).closest('a.sds-screen')` to
  `data-screen-index="0"`, and `page.mouse.click` at that point navigates to
  `/projects/budget-app.html`. Falsified by setting `pointer-events: auto` on the car,
  which the review showed flips the hit to `.sds-lot__car`.
- `art.spec.ts` (DT15): for each of the four sprites from `artUrls(APP_PATH)`, load it in
  the page, draw it to a canvas and assert the structural contract above.
- `nginx-parity.sh` gains `/theater/art/car.<ext>` → 200 and the matching content type
  (`image/png` or `image/svg+xml`, by the branch DT15 took).
- Every new spec is falsified once against a deliberate breakage (`EVO-UNI-061`): a
  `periodForHour` that always returns `night`; a `treePlacements` that returns `[]`; a
  car sprite swapped for a 1×1; the car's `pointer-events` flipped.

## Core assumption

**Roughly ninety static masked planes inside the transformed world, plus a stage-anchored
car overlay with two blurred glows, keep the 20-screen drive at ≥ 50 fps (DTF's band,
lowest 1 s window) and leave every screen clickable and Tab-reachable — and `mask-image`
actually paints on a plane under `preserve-3d` in Chrome and Firefox.**

Searched 2026-09-08: DTF (`docs/spikes/2026-08-25-transformed-video-probe.html`, decision
row in `docs/roadmaps/drive-in-theater-roadmap.md`, session log
`2026-08-25-11-20-claude-code-dtf-transformed-video-probe.md`) measured an eight-screen
`lot` at 227 fps median against a 50 fps floor, a 32-screen `overload` control at 176,
and recorded GO; `docs/evals/` does not exist in this repo; no sibling repo has measured
CSS masks under 3D transforms (`mask-image` across `/home/evan/EVOsystem/*/src`,
`*/frontend/src`, `*/docs`: no hits).

**Transfer argument, and why it does not hold on its own.** DTF's finding was that decoder
count dominates and the transform stack is close to free. Trees add no decoders and no
filters. But (a) DTF measured a workload that is no longer production: eight screens
where there are twenty, `filter` tweened directly where production tweens
`--sds-screen-lit` and lets CSS `calc()`/`color-mix()` derive brightness and glow, and a
4800px ground where DT13 makes it 20 800px; (b) each masked plane is its own compositor
layer, and 88 of them exceed DTF's 32 screens; (c) the car's `filter: blur()` on two
pseudo-elements is a per-frame raster cost DTF never had; (d) masks on 3D-transformed
elements have a history of rendering quirks (the review's probe confirmed masks paint on
a transformed leaf in Chromium; Firefox is unmeasured). So the assumption is **not
measured**, and DT11 is a cheap falsifier that runs first — **on a probe that reproduces
production, not DTF**: 20 screens; the lot CSS copied verbatim from `global.css`
(custom-property placement, the `--sds-screen-lit` brightness `calc()`, the `color-mix()`
marquee); the timeline shape of `build-lot.ts` (one world tween, per-screen lit
`fromTo`s with `immediateRender: false` on the ramp-down, `LIT_IN_BANDS` 0.15 /
`LIT_OUT_BANDS` 0.05); the DT13 ground (`--sds-ground-lead` / `--sds-ground-depth`) and
road; decoder residency as production has it (`preload="none"`, play iff active, the
eight probe clips cycled across the twenty screens); driven by the DTF probe's
Lenis-ticked rAF and its in-page `?measure=all` harness (three 10 s runs, median of the
lowest 1 s window). Recorded limitation, inherited from DTF: the harness scrolls
programmatically, so Lenis's wheel-smoothing path is idle during measurement.

Variants: `lot20` (the production baseline, `EVO-UNI-021`), `car-only` (`lot20` + orb +
beam + car with glows, no trees), `scenery` (`car-only` + 88 masked planes from
`treePlacements(20)` at `TREE_SPACING = 400`, masks generated in-page from a canvas
silhouette at 800×1200), `scenery-half` (44 planes, `TREE_SPACING = 800`),
`scenery-overload` (4× the planes, the failing control, `EVO-UNI-120`). Bands are
pre-registered in the probe's header before any number is taken (`EVO-UNI-091`).

**Decision procedure, ordered, exhaustive and exclusive** (the review showed the first
draft admitted results that matched no outcome or two):

0. *Instrument validity.* `scenery-overload` must read lower than `scenery` in every
   browser measured. If not, the result is **INVALID**: fix the probe, do not record a
   verdict.
1. *Painting.* In the `scenery` variant the trees are visible as silhouettes in every
   browser measured. If not: **NO-GO-TREES** (go to step 4).
2. *Interaction.* In `car-only`, click on screen 3 navigates and Tab reaches the screens
   in DOM order. If not: **NO-GO-ALL** (the overlay itself breaks interaction; trees are
   moot). Then the same in `scenery`; if that fails while `car-only` passed:
   **NO-GO-TREES** (go to step 4).
3. *Frame rate, judged on the median of three per variant, in every browser measured,
   the lowest browser deciding:* `scenery ≥ 50` → **GO**; else `scenery-half ≥ 50` →
   **GO-REDUCED**; else → step 4.
4. *Car-only frame rate:* `car-only ≥ 50` → **NO-GO-TREES**; else **NO-GO-ALL**.

What each outcome changes: **GO** → DT15 as specified (`TREE_SPACING = 400`).
**GO-REDUCED** → DT15 with `TREE_SPACING = 800` and the reduced literals.
**NO-GO-TREES** → DT15 ships the car, beam and art contract without `scenery.ts`, trees
or tree masks (car and one art file only; `load()` declares posters + car). **NO-GO-ALL**
→ DT15 is not executed; the roadmap records it; the theme is DT12 + DT13 (period, sky,
ground, road). **INVALID** → no downstream change until re-measured. DT12 and DT13 do not
depend on the verdict — sky and period are worth shipping under every outcome — which is
why the falsifier is first but they are not gated on it. The verdict, the medians per
variant per browser, and the click/Tab results land in the roadmap's Decision records.

A second, smaller assumption: **an image model available to Evan can produce PNGs with
real alpha around the subject.** `EVO-TOOL-054` records that this fails often enough to
have a rule, and the review showed real alpha *somewhere* proves nothing about alpha
*around the subject*. It does not need a falsifier phase: DT14 is itself the test, the
checker gives a per-file structural verdict in seconds, the visual half is Evan looking
at a composite, and the SVG fallback means a failure costs the look, never the roadmap.

## What already exists

| File | Layer | Status |
|---|---|---|
| `theater/src/lot/geometry.ts` — `SPACING`, `OFFSET`, `GROUND_LINE`, `lotZ`, `screenPlacement`, `activeScreen`, `screenProgress` | geometry | Complete; gains `GROUND_LEAD`, `groundDepth` (DT13) |
| `theater/src/lot/build-lot.ts` — stage, world, ground, screens, one timeline; writes `--sds-ground-line`, `--sds-screen-{x,z,yaw,lit}` | scene DOM | Complete; gains orb + ground properties (DT13), trees + car + beam (DT15) |
| `theater/src/lot/lot-scene.ts` — posters via loader after the inner load, `snapshot()`, clip activation | scene | Complete; gains four art assets, car placement, tree masks, two snapshot fields (DT15) |
| `theater/src/lot/lot-scene.contract.test.ts` — asserts the loader saw posters and nothing else (line 76) | tests | Complete; assertion widened to posters + art (DT15) |
| `theater/src/styles/tokens.css` — `--sds-sky` gradient, `--sds-asphalt*`, `--sds-star*`, `[data-theme="light"]` block, all `:host, :root` | tokens | Partial: no period roles, no period blocks, no road roles (DT13) |
| `theater/src/styles/global.css` — `.sds-lot` starfield background, `.sds-lot__ground` (4800px, `translateZ(0)`), `::after` lane, `.sds-screen__surface` brightness `0.35 + 0.65·lit`, narrow overrides | CSS | Partial: fixed ground depth, literal floor, stars on the stage background, no road markings (DT13); no tree/car/beam rules (DT15) |
| `theater/src/main.ts` — `createEngine`, focus-drives-page | entry | Complete; gains `installPeriod` before the engine (DT12) |
| `theater/src/page/` — `chrome.ts` only | page | Missing `period.ts` (DT12) |
| `theater/src/lot/scenery.ts`, `theater/src/lot/art.ts` | geometry / assets | Missing (DT15) |
| `theater/public/art/*` | assets | Missing (DT14 creates `theater/public/`) |
| `theater/e2e/helpers/app.ts` — `APP_PATH`, `openPage`, `scrollToScreen`, `worldZ`, `screenLit` | e2e | Complete; gains `APP_URL`, `PINNED_PERIOD`, `periodAttribute` (DT12) |
| `theater/e2e/{reveal,drive,active-screen,click-through,reduced-motion,keyboard}.spec.ts`, `nginx-parity.sh` | e2e | Complete; `reveal.spec.ts` navigates by `APP_PATH` twice (DT12 pins it); parity gains the art check (DT15) |
| `theater/src/test-setup.ts` — `matchMedia` fake, `ResizeObserver`, media `play/pause` | tests | Complete; nothing new needed (period tests inject `now` and `doc`) |
| `theater/src/test-helpers/fake-image.ts` — `createFakeImages({ autoSettle })` keyed by URL | tests | Complete; DT15's tests fail one art URL and pass the rest |
| `docs/spikes/2026-08-25-transformed-video-probe.html` + `probe-clip-*.mp4` | spike | Complete receipt for DTF; DT11 copies its harness into a new file and rebuilds the lot to production shape rather than editing the receipt |
| `docs/wireframes/theater-drive-in-theme.html` | wireframe | **Approved 2026-09-08** (six palettes, road, trees from the jitter table, wagon placeholder, car, beam, orb, ground depth) |
| jourNOW `frontend/src/utils/timePeriod.ts` (cross-repo, read directly) | reference | The hour bands and the `visibilitychange` pattern; not a dependency |

## Phase breakdown

| Phase | Name | Layer | Effort | Depends on |
|---|---|---|---|---|
| DT11 | Falsifier on a production-shaped probe (scenery layers, masks under 3D, the car overlay); the art checker page | spike | S | — |
| DT12 | Period engine, `?period=` override, e2e pin | frontend | S | — |
| DT13 | Sky, orb, lighting roles, road markings and a geometry-sized ground, six palettes | frontend | M | DT12; wireframe approved (done) |
| DT14 | Generate, accept and commit the four sprites | media [MANUAL] | — | DT11's checker page |
| DT15 | Trees, the visitor's car, the beam; scenery and art specs; parity | frontend | M | DT11 verdict ≠ NO-GO-ALL / INVALID, DT13, DT14 |

Execution order is the table order. DT11 runs first because it is the falsifier and
because DT14 needs its checker page; DT12 and DT13 run under any DT11 outcome.

## Per-phase detail

**DT11 — Falsifier and checker (spike, S).** Writes
`docs/spikes/2026-09-08-scenery-probe.html`: the DTF probe's Lenis-ticked loop and
`?measure=all` harness copied (not linked — the DTF file is a frozen receipt), the lot
rebuilt to production shape as the Core assumption describes, and the five variants.
Pre-registers the procedure and bands in the header. Also writes
`docs/spikes/art-check.html`: drop or pick PNG/SVG files → per file the structural
checks, the checkerboard warning, the composite strip over white / black / six tree
colours, a PASS/WARN/FAIL per the filename (`car` vs `tree-*`), the "show me a wrong
fixture" control (the transparent-bordered checkerboard, which must WARN) and the
"download placeholder set" control (four standalone SVGs with intrinsic dimensions).
Evan measures (Chrome; Firefox if present), records the decision row in the roadmap.
Unlocks: a number behind the tree count, and the tool DT14 is accepted with.

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

**DT13 — Sky, orb, lighting, road, ground (frontend, M).** `tokens.css` roles and six
blocks transcribed from the wireframe plus the two road roles; `global.css` star layer,
orb, ground from the two new properties, the lane rule, floor and glow arithmetic;
`geometry.ts` `GROUND_LEAD` + `groundDepth` with literal tests (`groundDepth(8) = 11200`,
`groundDepth(20) = 20800`); `build-lot.ts` orb element and the two properties on the
stage, with `build-lot.test.ts` asserting the stage's inline values for the real
`projects.length`; `period.spec.ts` gains the consumer assertions and the unpinned
daytime visit. Manual check against the wireframe in all six periods and at 390px.
Unlocks: the theater matches the visitor's clock, the road reads as a road, and the
ground reaches the end of the lot in daylight.

**DT14 — Art (MANUAL, Evan).** Generate four sprites with an image model (the phase
carries the prompts — the wagon prompt names the reference photo's details), run each
through `docs/spikes/art-check.html`, iterate until all four PASS structurally *and* the
four visual statements hold (or take the SVG fallback), copy them to `theater/public/art/`,
commit as `feat(dt14): drive-in art sprites` the moment they pass (`EVO-UNI-090`).
Unlocks: DT15 has real pixels.

**DT15 — Scenery and the car (frontend, M).** `lot/scenery.ts` + literal tests for the
branch taken; `lot/art.ts` (pure manifest); `build-lot.ts` trees/car/beam;
`lot-scene.ts` art through the loader, placement after the inner load, masks with
`data-mask`, snapshot fields; `global.css` rules including `aspect-ratio` and the
visibility rule; `lot-scene.test.ts` cases (car ready / car missing via a 1×1 with the
beam box still > 0 high / one tree mask failing leaves that variant `data-mask="missing"`
and the other two `ready`); the contract test's asset assertion widened (`SDS-003`);
`e2e/scenery.spec.ts`, `e2e/art.spec.ts`, parity; `<branch>` on DT11's verdict (`GO` /
`GO-REDUCED` / `NO-GO-TREES`) and on `ART_EXTENSION`. Unlocks: the finished drive-in —
wagon, trees, road, sky and time of day.

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
`TREE_SPACING`, `TREE_SETBACK`, `TREE_JITTER` live once; CSS receives placements as
properties), `EVO-UNI-026` / `EVO-UNI-037` / `EVO-UNI-038` (session discipline; session
log via `writing-session-logs`), `EVO-UNI-072` / `EVO-UNI-119` (check whether the phase
landed; diff `<context>` against the tree), `EVO-TOOL-023` / `EVO-TOOL-024`,
`EVO-TOOL-111` (no bind mount — `rebuild-restart` for every served check), `SDS-001`,
`SDS-002`, `SDS-004`, `SDS-005`, `SDS-009` for anything under `theater/src`.

**Per phase:**
- **DT11:** `EVO-UNI-091` (outcomes enumerated with the decision each changes — the
  procedure above), `EVO-UNI-120` (a failing control: `scenery-overload`; the checker's
  wrong fixture), `EVO-UNI-021` (baseline `lot20` first), `EVO-TOOL-055` (canvas alpha),
  `EVO-TOOL-054` (the checkerboard warning), `EVO-UNI-061` (the checker is shown to WARN
  on the wrong fixture before it is trusted).
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
  shows: orb, star layer, road markings, ground to the horizon in daylight),
  `EVO-UNI-109` (ground-depth tests assert `11200` and `20800`), `EVO-UNI-017` (the e2e
  observes consumers — computed background, filter, opacity — not declarations), `SDS-009`.
- **DT14:** `[MANUAL]`; `EVO-TOOL-054`, `EVO-TOOL-055`, `EVO-UNI-090` (commit each passing
  file at once).
- **DT15:** `SDS-006` (four declared assets; masks set only after the loader has them),
  `EVO-UNI-053` (a missing car is `data-car="missing"` with the beam and glows still
  drawn in a box of real height; a missing mask variant is `visibility: hidden`, never a
  filled rectangle), `EVO-UNI-109` (placement tests are literals), `EVO-UNI-061` (each new
  spec falsified), `EVO-TOOL-071`, `SDS-003` (the contract run still passes with a bigger
  `load()`), `EVO-TOOL-183` (the transform assertion observes the rendered matrix, not a
  recomputed string).

## Prerequisites

- Node and pnpm on the host as before (24.16.0 / 11.15.1, verified 2026-08-25); Docker +
  `evo-net` for served checks (`rebuild-restart`); the theater's Playwright Chromium
  installed (it rendered the wireframe on 2026-09-08).
- ~~Wireframe approval~~ — **approved 2026-09-08**, notes folded in (road markings, wagon).
- **DT11's decision row** (`GO` / `GO-REDUCED` / `NO-GO-TREES` / `NO-GO-ALL`; `INVALID`
  blocks) before DT15.
- **DT14's four files** committed before DT15 (or the SVG fallback taken).
- An image model Evan can drive for DT14 (any; the checker page is the contract).

## Open questions

- `[FYI]` `theater/index.html`'s hero eyebrow still reads "Now showing · 8 projects" with
  20 on the lot. Unrelated to this roadmap; noted for a separate one-line fix.
- `[FYI]` DTF's measurement was Chrome-only (Firefox absent, no Mac). DT11 inherits the
  same limitation; the procedure says "every browser measured" and the decision row
  records which. Tree painting in Firefox is therefore unverified until Firefox exists on
  the host.
- `[FYI]` The `--sds-orb-*` positions are percentages of the stage; the sunset sun sits at
  the vanishing point and is partly behind the far screens by design.
- `[FYI]` `installPeriod` uses `visibilitychange` only. Same behaviour as jourNOW.
- `[FYI]` The Vite `public/` directory does not exist yet; DT14 creates
  `theater/public/art/`. Vite copies `public/` into `dist/` unhashed, so the URLs are
  stable and the parity check can name them.
- `[FYI]` The wireframe's inline SVG placeholders are illustrative; the exported
  fallback SVGs carry intrinsic dimensions the inline ones lack.
