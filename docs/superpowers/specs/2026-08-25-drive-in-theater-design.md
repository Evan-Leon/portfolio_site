# Drive-In Theater — Design Spec

**Date:** 2026-08-25
**Status:** Approved (brainstorm 2026-08-25); enhanced in place by roadmap meta-prompt Part 1 (2026-08-25)

---

## Goal

Add an opt-in, scroll-driven "drive-in movie theater" to the portfolio: the
visitor drives through a night-time lot past eight screens, one per project,
each playing a short looping demo clip under a lit marquee, and clicks any
screen to reach that project's page. The existing homepage, project pages and
card grid remain exactly as they are and stay the fallback path.

## Premise and constraints

- The engine is the `scroll-driven-skeleton` project
  (`/home/evan/EVOsystem/scroll-driven-skeleton`), built for a collaborator and
  due to be transferred to him. The portfolio must not depend on that repo's
  future, so the engine is **vendored**, not linked.
- `portfolio_site` is a no-build static site: `Dockerfile` is `COPY . …` into
  `nginx:alpine`, pnpm, Prettier is the only check, no test suite. The theater
  introduces a build step **scoped to one directory** and the Docker image; the
  rest of the site stays no-build.
- No demo clips exist today. Commit `c23fbf4` removed the legacy GIF demos;
  every project has only PNG screenshots in `images/<slug>/01..05.png`. Clip
  production is a manual phase; the code must ship and degrade gracefully
  before any clip lands.
- Every decision below was approved in the brainstorming session that produced
  this document (motion model, entry flow, code location, build strategy,
  media, project set, screen chrome, fallbacks, rendering approach).

## Architecture

### Site structure and entry flow

```
/                      index.html (unchanged apart from one hero CTA)
/projects/<slug>.html  unchanged
/theater/              NEW — theater/dist/index.html, built by Vite
```

- **`/theater/`** is its own page with minimal chrome: the `Evan Leon` logo
  linking home, the site fonts, favicon and Google Analytics tag. No full nav —
  the drive-in is the page.
- **Hero CTA.** `index.html`'s `.hero__ctas` gains `Enter the Drive-In` →
  `/theater/` as the primary button; `View Projects` becomes secondary. The
  CTA is hidden by CSS below `767px` (the site's existing mobile breakpoint)
  and under `prefers-reduced-motion: reduce`. No JavaScript is involved.
- **Theater page flow:** hero beat (title, "scroll to drive", skip link) in
  normal HTML → **one scene, `lot`** → exit beat in normal HTML ("End of the
  lot", links to `/#projects` and `/#contact`, and a plain `<ul>` of the eight
  project links). Real HTML at both ends means the page reads with JavaScript
  off and the skip link has a real destination, as in the skeleton's page
  shell (`scroll-driven-skeleton/index.html`).
- **Every screen is an `<a>`** to `/projects/<slug>.html`. Project pages are
  not modified.

### Toolchain and packaging

- **`theater/` is a self-contained Vite + strict TypeScript project**, vendored
  from the skeleton:
  - keep: `src/engine/*`, `src/adapters/{types,placeholder,adapter-contract,gsap-timeline}.ts`
    (+ tests), `src/host/*`, `src/loader/*`, `src/page/chrome.ts`,
    `src/styles/{tokens,global}.css`, `src/test-setup.ts`, `vite.config.ts`,
    `playwright.config.ts`, `e2e/helpers/app.ts`, `eslint.config.js`,
    `tsconfig.json`;
  - drop: `lottie`, `frame-sequence` (+ their tests and `e2e/helpers/canvas.ts`),
    `probe/`, `scripts/build-wix.mjs`, `scripts/generate-demo-frames.mjs`,
    `public/frames`, `public/lottie`, everything Wix-specific in docs;
  - the `Host` seam and `SDS-009`'s `:host, :root` scoping stay — they cost
    nothing and keep the vendored code recognisably the same as its origin.
- **Package manager: pnpm**, matching the portfolio. (The skeleton's `npm`
  choice is a recorded departure for the collaborator's benefit; it does not
  transfer.) The root `package.json` becomes a pnpm workspace containing
  `theater/`, so `pnpm -C theater <script>` works from the repo root and one
  `pnpm-lock.yaml` covers both. Root `format`/`format:check` globs widen to
  include `theater/src/**/*.ts`; the pre-commit hook's staged-file filter
  widens from `\.(html|css|js)$` to include `.ts`.
- **Multi-stage `Dockerfile`:**
  1. `node:22-alpine` + corepack-enabled pnpm: copy the workspace, `pnpm install --frozen-lockfile`,
     `pnpm -C theater build` (= `tsc --noEmit && vite build`, so a type error
     fails the image build);
  2. today's `nginx:alpine` stage, plus `COPY --from=build /app/theater/dist /usr/share/nginx/html/theater`.
  `.dockerignore` gains `theater/node_modules` and `theater/dist` (the build
  stage produces its own). `nginx.conf` needs no change: `try_files $uri $uri/`
  already resolves `/theater/` → `theater/index.html`.
- **Vite `base: '/theater/'`** in `theater/vite.config.ts` so built asset URLs
  resolve under the sub-path (the trap `scroll-driven-skeleton/docs/deployment.md`
  documents). Because `base` is set in the config, `vite preview` serves at
  `/theater/` too, and the Playwright suite navigates to `/theater/` rather
  than `/`. Project links and media are site-absolute (`/projects/…`,
  `/images/…`) so the theater reads the same `images/<slug>/` tree the grid
  does — one copy of every asset. For `vite dev`/`vite preview`, a dev-server
  proxy (or `publicDir` symlink) serves `/images/` and `/projects/` from the
  repo root so links resolve locally without Docker.

### The scene

**One registry entry, one adapter, one data file.**

- **`theater/src/projects.ts`** — the drive order and the only file that knows
  the projects:

  ```ts
  export interface TheaterProject {
    slug: string   // 'nom-noms'
    name: string   // "Nom Nom's" — the marquee text and the link's accessible name
    href: string   // '/projects/nom-noms.html'
    poster: string // '/images/nom-noms/01.png'
    clip: string   // '/images/nom-noms/demo.mp4'
  }
  export const projects: readonly TheaterProject[]
  ```

  Eight entries in drive order: budget-app, nom-noms, el-blackjack,
  classic-golf, spead-read, media-cloud-web-tools, media-cloud-vitals,
  showrunner-digest. Adding a ninth screen is one entry.
- **`theater/src/scenes/registry.ts`** — a single scene:
  `{ id: 'lot', vh: 100 + VH_PER_SCREEN * projects.length, adapter: lotScene(projects) }`
  with `VH_PER_SCREEN = 120` (≈1060vh for eight screens). Retiming is that one
  constant.
- **`theater/src/lot/`** — the lot adapter, built on the vendored
  `gsapTimeline` adapter:
  - `geometry.ts` — pure functions, no DOM: `screenPlacement(i)` →
    `{ x: ±OFFSET, z: -(i+1)·SPACING, yaw }` (alternating sides, yawed ~15°
    toward the lane); `lotZ(progress, n)` → how far the lot has moved toward
    the camera; `activeScreen(progress, n)` → index of the screen whose
    *approach band* contains the camera, or `null`. A screen's approach band
    is the stretch of drive from one `SPACING` before its `z` up to its `z` —
    the screen is active while it is the next one ahead, and goes inactive the
    instant the camera passes it. Bands are contiguous and disjoint, so at most
    one screen is active at any progress.
  - `build-lot.ts` — the `GsapTimelineBuilder`: inside the pinned container it
    creates a `perspective` stage, a ground plane (rotated, gradient asphalt
    with faint parking-row lines), a CSS-only starfield (no randomised DOM —
    `SDS-001` needs a rebuilt scene to look identical), and one
    `<a class="screen">` per project containing the screen surface
    (`<video muted loop playsinline preload="none" poster=…>` with the clip
    as its source), a marquee sign with the project name, and support posts.
    The timeline is one tween translating the lot toward the camera along Z
    over the whole scene, plus per-screen keyframed *lit* state (dark → marquee
    glows and screen brightens on approach → dims after passing), so scrolling
    back rewinds exactly.
  - `lot-scene.ts` — wraps `gsapTimeline(buildLot)` in an adapter that also
    owns the video activation side effect: on every `seek`, each video is set
    to *playing iff its screen is `activeScreen(progress)`*. Same progress →
    same set of playing videos, so `SDS-001` holds and at most one or two clips
    decode at a time. It exposes `observe()` → `{ lotZ, activeScreen, litScreens }`
    and passes `adapterContract()` (`SDS-003`).
- **Camera:** driver's eye height, centred on the lane. No car model; a hood
  silhouette is a possible later flourish and is out of scope.
- **Keyboard drive-by-focus:** screens are `<a>`s in drive order, so Tab walks
  the lot. On `focusin` of a screen, the page scrolls to that screen's progress
  position, computed from the scene's *measured* geometry (the engine's
  `mount.ts` measurements, never a layout read inside `seek` — `SDS-004`).
  Enter opens the project.

### Media pipeline

- **Convention:** `images/<slug>/demo.mp4` — H.264, no audio track, ≤ 10 s,
  960×600 (the existing 16:10 screenshot aspect), target ≤ 1.5 MB. Poster is
  the existing `images/<slug>/01.png`; no new poster files.
- **Production is a `[MANUAL]` phase.** Evan screen-records each app; the
  roadmap ships the ffmpeg recipe and a new skill
  `adding-project-demo-clips` (canonical `.claude/skills/…/SKILL.md`, Codex
  wrapper under `.agents/skills/`, registered with
  `scripts/validate_codex_setup.py`) — the same shape as
  `adding-project-screenshots`.
- **Missing clip = poster, not error.** The `<video>` `error` event hides the
  video element and leaves the poster lit. The theater is complete before any
  clip exists and upgrades one screen at a time as clips land.
- **Loading gate:** the eight posters are declared to `sharedAssetLoader` from
  the lot adapter's `load()` and the adapter is `eager`, so the ring's number is
  honest (no `factory.assets` manifest — the engine only warms manifests of
  non-eager scenes, and the lot is the sole, eager scene) and the reveal shows every screen
  with a picture on it. **Videos are deliberately outside the loader** — a
  recorded departure from `SDS-006`: a stream is never "loaded",
  `preload="none"` means nothing is fetched until a screen goes active, and
  gating the reveal on eight clips is the spinner-forever case the ring exists
  to prevent.

### Fallbacks and accessibility

- **Reduced motion:** the engine's existing path quantises progress to
  `steps + 1` keyframes and nothing else changes. `REDUCED_MOTION_STEPS` is a
  module constant (`engine.ts:97`) in the skeleton; the vendored engine promotes
  it to an `EngineOptions.reducedMotionSteps` field (default `4`, so every
  vendored test is unchanged) and the theater passes `projects.length + 1` so
  each step lands the camera on a screen rather than between two. Under
  `prefers-reduced-motion: reduce` the video activation band is also disabled
  (screens hold their poster) — one option and one media query, no second code
  path.
- **Narrow viewports (< 768px):** the lot goes single-file — `OFFSET` becomes
  0, screens centre on the lane and scale down. The index CTA is hidden at the
  same breakpoint, so this serves direct/shared links only; it has to work,
  not be beautiful. A dedicated portrait theater is a follow-up roadmap.
- **No JavaScript:** the scene slot stays empty (the engine's design) and the
  exit beat's plain `<ul>` of project links keeps the page from being a dead
  end.
- **Skip link** at the top of the page targets the exit beat (`tabindex="-1"`,
  the skeleton's pattern). Screen links take their accessible name from the
  marquee text; videos are `aria-hidden="true"` and muted.
- **Lenis smooth scroll** stays on (engine default) — it is what makes the
  drive feel driven rather than notched.

## Core assumption

**CSS-3D-transformed `<video>` elements play smoothly and remain
click/focus-hit-testable in current Chromium, Firefox and WebKit.**

**Never measured.** Step 1b search (2026-08-25) across `/home/evan/EVOsystem`:
no relevant hit in any repo's `docs/evals/`; no gate scorecard or roadmap Changelog row
mentions transformed video; the only "CSS 3D" hits fleet-wide are
el-blackjack-pwa's single hole-card flip (`docs/roadmap.md:72`,
`docs/superpowers/specs/2026-05-18-pwa-conversion-design.md:196`) — one
`rotateY` on a static element via Framer Motion, no `<video>`, no perspective
stage, no eight concurrent planes; it says nothing about decode + composite
cost under a scrubbed 3D transform. The skeleton's own GSAP scene
(`scroll-driven-skeleton/src/scenes/registry.ts:85-118`) transforms five
plain `<div>`s — same engine path, but no media element. No transfer argument
is available, so a cheap falsifier runs first: phase DTF (below) — a throwaway
page with eight transformed videos, fps read from DevTools, and a click/Tab
check — before any vendoring happens. Its decision line (`GO`/`NO-GO`) is
recorded in the roadmap.

## What already exists

Prior-art search (Step 1, 2026-08-25): `grep -rniE 'theater|drive-in|video|scroll-driven|gif' docs/session-logs/`
→ no hits; nothing in this repo has touched the feature. The cross-repo
dependency (Step 5b) is the skeleton's source, read directly — every citation
below names a file and line in `/home/evan/EVOsystem/scroll-driven-skeleton`.
No external service is involved (Step 5 N/A).

| File | Layer | Status |
|---|---|---|
| `index.html` `.hero__ctas` | site | Complete — gains one CTA |
| `projects/<slug>.html` × 8 | site | Complete — link targets, unchanged |
| `images/<slug>/01.png` × 8 | media | Complete — used as posters |
| `images/<slug>/demo.mp4` | media | **Missing** — manual production phase |
| `Dockerfile`, `.dockerignore`, `nginx.conf` | infra | Partial — single-stage; nginx needs no change |
| `package.json`, `pnpm-lock.yaml`, `.githooks/pre-commit`, `.prettierignore` | tooling | Partial — no workspace, hook filters `.(html\|css\|js)$` only |
| `scroll-driven-skeleton/src/{engine,adapters,host,loader,page,styles}` | engine | Complete in the sibling repo — to be vendored |
| `scroll-driven-skeleton/e2e/helpers/app.ts`, `playwright.config.ts` | tests | Complete in the sibling repo — to be vendored |
| `.claude/skills/adding-project-screenshots` | skills | Complete — pattern for the new clips skill |
| `scripts/validate_codex_setup.py` | skills | Complete — registers Codex wrappers |
| `theater/**` | theater | **Missing** |

## Phase breakdown

Prefix `DT` (the repo has no roadmaps yet; the prefix is chosen so `feat(dt3):`
scopes cannot collide with anything). Rows are in execution order.

| Phase | Name | Layer | Effort | Depends on |
|---|---|---|---|---|
| DTF | Falsifier: transformed-video performance and hit-testing | spike | XS | — |
| DT0 | pnpm workspace + `theater/` scaffold + vendored engine with green tests | tooling | L | DTF GO |
| DT1 | Multi-stage Dockerfile, serve `/theater/` | infra | S | DT0 |
| DT2 | Tokens re-palette + theater page shell (wireframe first) | frontend | M | DT1 |
| DT3 | `projects.ts` + lot geometry + lot adapter + conformance test | frontend | M | DT2 |
| DT4 | Video activation band, poster fallback | frontend | S | DT3 |
| DT5 | Keyboard drive-by-focus, `reducedMotionSteps`, narrow layout | frontend | S | DT4 |
| DT6 | Playwright e2e suite for the theater | tests | S | DT5 |
| DT7 | Hero CTA on `index.html` + hide rules | site | XS | DT6 |
| DT8 | `adding-project-demo-clips` skill, ffmpeg recipe, Codex wrapper | skills | XS | DT4 |
| DT9 | `[MANUAL]` record and encode the eight clips | media [MANUAL] | — | DT8 |

## Per-phase detail

- **DTF** — A single throwaway HTML file outside the served tree (scratch or
  `docs/spikes/`) with a `perspective` stage and eight `<video>` elements on
  transformed planes, driven by a scroll listener. Records fps under scrub in
  Chromium and Firefox (WebKit if available), and whether clicking and Tab
  focus land on the transformed elements. Decision line `GO`/`NO-GO` recorded
  in the roadmap. On `NO-GO`, the fallback is cross-fading the existing PNGs
  on flat (untransformed) screens — decided then, not now.
- **DT0** — Root `pnpm-workspace.yaml`; `theater/package.json` with the
  skeleton's scripts (`dev`, `build`, `preview`, `typecheck`, `lint`, `test`,
  `test:e2e`) and deps (`gsap`, `lenis`, Vite/Vitest/Playwright/ESLint/TS);
  vendored source per the keep/drop list; `pnpm -C theater test` green;
  Prettier globs and the pre-commit filter widened. Unlocks: a place to build.
- **DT1** — Multi-stage `Dockerfile`, `.dockerignore` additions, a placeholder
  `theater/index.html`; `docker compose build && up` serves `/theater/` and
  the rest of the site unchanged. Unlocks: the integration check every later
  phase reuses.
- **DT2** — `tokens.css` PALETTE block swapped to the portfolio's
  `--deep-space`/`--nebula-*`/`--star-white` values; theater page shell (chrome,
  hero beat, `data-scene-slot="lot"`, exit beat with the no-JS list, skip link);
  approved wireframe `docs/wireframes/theater.html` cited. Unlocks: a page
  that looks like the portfolio with an empty lot.
- **DT3** — `projects.ts`; `lot/geometry.ts` (pure, tested); `lot/build-lot.ts`;
  `lot/lot-scene.ts` with `observe()`; contract test; registry entry. Unlocks:
  driving past eight lit posters.
- **DT4** — Video elements, activation band on `seek`, `error` → poster
  fallback. Unlocks:
  screens that play when a clip exists.
- **DT5** — `focusin` scroll-to-screen; `reducedMotionSteps` engine option and
  theater value; reduced-motion video suppression; `< 768px` single-file
  layout. Unlocks: keyboard and reduced-motion visitors can drive the lot.
- **DT6** — Playwright specs: ring dismisses; eight screens with correct hrefs;
  `lotZ` monotonic under scroll and restored on scroll-back; click navigates;
  reduced-motion emulation quantises; Tab moves scroll. Unlocks: the
  regression net.
- **DT7** — Hero CTA markup + CSS hide rules; `View Projects` demoted to
  secondary. Last, so the site never links to a half-built lot.
- **DT8** — The skill and its Codex wrapper; ffmpeg recipe; validator
  registration. Unlocks: DT9 has instructions.
- **DT9** — `[MANUAL]`: eight recordings encoded to `images/<slug>/demo.mp4`
  and committed. Unlocks: the theater as envisioned.

## Testing strategy

- **Vendored suites** (engine, loader, chrome, adapter contract, gsap adapter)
  stay green under `pnpm -C theater test`.
- **New unit tests:** `projects.ts` — unique slugs, and a Node-side check that
  `../projects/<slug>.html` and `../images/<slug>/01.png` exist on disk;
  `lot/geometry.ts` — placements alternate sides, `activeScreen` at band
  boundaries and out of range; `adapterContract(lotScene(projects), { observe })`.
- **Playwright e2e** per DT6, against `vite preview` at `/theater/`.
- **Integration:** `docker compose build && docker compose up -d --force-recreate`,
  then `curl` `/theater/` and one project page — both 200; the theater HTML
  contains the screen markup (or the slot, pre-JS).
- **Site-level:** `pnpm format:check` covers `theater/src`.

## Applicable rules

`portfolio_site` has no local rules index. Two rule sources apply:

1. **Shared EVOsystem tier** — `/home/evan/EVOsystem/infra/skills/rules-index/references/{universal,tooling,react-frontend}.md`
   (`EVO-UNI-*`, `EVO-TOOL-*`, `EVO-FE-*`; the FE file's Vitest/jsdom/Playwright
   rows apply even though the theater is framework-free vanilla TS).
2. **The skeleton's project law** — `/home/evan/EVOsystem/scroll-driven-skeleton/skills/rules-index/SKILL.md`
   (`SDS-*`). These transfer with the vendored code and DT0 copies that file
   into `theater/skills/rules-index/SKILL.md` (minus `SDS-007`/`SDS-008`, whose
   subjects — frame budget, Wix single-file — are not vendored; their IDs get
   tombstone rows, never reuse) so a fresh session executing a later phase can
   cite them at a path inside this repo.

**All phases:**
- `EVO-UNI-011` no out-of-scope features; `EVO-UNI-012` no unapproved
  dependencies (the theater's dependency list is exactly the skeleton's minus
  `lottie-web` and `vitest-canvas-mock`); `EVO-UNI-014` grep consumers before
  changing a shared signature (`EngineOptions`, `AdapterFactory`);
  `EVO-UNI-057` import a constant from its canonical home, never re-`const` it
  (`VH_PER_SCREEN`, `SPACING`, `OFFSET` live in `lot/geometry.ts` only).
- `EVO-UNI-026`, `EVO-UNI-037`, `EVO-UNI-038` session discipline (rules index
  second, session-log tail first, session log at the end — via
  `writing-session-logs`); `EVO-UNI-072` and `EVO-UNI-119` check whether the
  phase already landed and diff the `<context>` block against the tree.
- `EVO-TOOL-023` absolute paths / `git -C`; `EVO-TOOL-024` prove changes with
  `git diff --numstat`, not `git status`.
- `SDS-001`, `SDS-002`, `SDS-004`, `SDS-005`, `SDS-009` for any phase touching
  `theater/src`.

**Per phase:**
- **DTF:** `EVO-UNI-091` enumerate reachable outcomes and the decision each
  changes before measuring; `EVO-UNI-120` a metric must be able to report a
  bad number — include a failing control (e.g. 8× the video count) so the fps
  read is known to move; `EVO-UNI-021` baseline (flat, untransformed videos)
  before the transformed case.
- **DT0:** `EVO-TOOL-002` pnpm; `EVO-TOOL-005` Vitest `include` under `src/`;
  `EVO-TOOL-047` and `EVO-TOOL-057` — the skeleton's recorded departures
  (`.ts`-only glob, `passWithNoTests` unset) carry over with their reasoning
  into the vendored rules index; `EVO-TOOL-068` pin `vitest` to a version
  whose peer `vite` range covers Vite 8 (the skeleton's `vitest@^4.1.10` does —
  keep both versions); `EVO-TOOL-076` exactly one Vite config file;
  `EVO-TOOL-080` `defineConfig` from `'vitest/config'`; `EVO-TOOL-081`
  `noEmit` + tests excluded in `tsconfig`; `EVO-TOOL-010` pnpm blocks native
  build scripts — Vite 8's rolldown binding is a prebuilt optional dependency,
  not a build script, but confirm `pnpm install` emits no "ignored build
  scripts" warning and allowlist if it does; `EVO-TOOL-110` `core.hooksPath`
  stays repo-relative; `EVO-FE-067` `jsdom` installed explicitly;
  `EVO-FE-220` no Vitest globals — every test imports from `'vitest'`
  (the skeleton already does); `SDS-003` every vendored adapter still passes
  the contract.
- **DT1:** `EVO-TOOL-061` the install layer `COPY`s `pnpm-workspace.yaml`
  alongside `package.json`/`pnpm-lock.yaml`; `EVO-TOOL-107` corepack needs the
  committed `packageManager` pin (root `package.json` already pins
  `pnpm@11.15.1` — the build stage must run against that file);
  `EVO-TOOL-058` `.dockerignore` must not exclude anything `theater/tsconfig.json`
  `include`s; `EVO-TOOL-111` no bind mount → every served change needs
  `rebuild-restart`; `EVO-TOOL-130` probe from inside `evo-net` before
  debugging the app; `EVO-TOOL-167` `Up (healthy)` says nothing about the
  published route — curl through Traefik.
- **DT2:** `EVO-UNI-001`, `EVO-UNI-002`, `EVO-UNI-003`, `EVO-UNI-030` token
  discipline (re-palette by editing `tokens.css`'s PALETTE block, no `var(--x, #hex)`
  fallbacks); `EVO-FE-239` tokens imported before global CSS; `EVO-FE-223`
  CSS imported from `main.ts`, not a `<link>`; `EVO-UNI-048` the built page
  must carry everything the approved wireframe shows; `SDS-009`.
- **DT3:** `SDS-001`–`SDS-004`; `EVO-UNI-017`/`EVO-UNI-018` behaviour tests
  with committed expected values; `EVO-UNI-109` a geometry test must not
  derive its expected value from the constant under test (assert literal
  placements for a fixed `SPACING`/`OFFSET`, not `-(i+1)*SPACING` recomputed
  in the test).
- **DT4:** `EVO-FE-064` mock `HTMLMediaElement.prototype.play/pause` in jsdom
  (`play()` returns `undefined` there and the real one returns a Promise);
  `SDS-006` with the recorded video departure; `EVO-UNI-053` the missing-clip
  state is explicit and honest (lit poster), never a blank screen.
- **DT5:** `EVO-TOOL-121` the `EngineOptions.reducedMotionSteps` change and
  its consumers land in one commit (`tsc --noEmit` gates the build);
  `EVO-FE-219` mock `Element.prototype.scrollIntoView` if the focus handler
  uses it; `EVO-FE-279` jsdom's `scrollHeight` is `0` — test the focus→scroll
  mapping through `createFakeScrollSource`, not layout; `EVO-UNI-014`.
- **DT6:** `EVO-TOOL-071` wait for outcomes, never `waitForTimeout` (the
  vendored `e2e/helpers/app.ts` `scrollTo` already does this — reuse it);
  `EVO-TOOL-082` `trace: 'on-first-failure'` when `retries: 0`;
  `EVO-TOOL-070` the project's own Playwright; `EVO-TOOL-056`, `EVO-TOOL-086`,
  `EVO-TOOL-087` Chromium install/cache gotchas on this host; `EVO-UNI-061`
  every spec must be shown to fail against a broken input once.
- **DT7:** `EVO-UNI-001` (CTA uses existing `.btn` classes and tokens);
  Prettier via the pre-commit hook.
- **DT8:** the wrapper/canonical split the validator enforces
  (`scripts/validate_codex_setup.py:26-27`, `references_canonical` at
  `:78-81` — the wrapper body must contain `.claude/skills/<name>/SKILL.md`).
- **DT9:** `[MANUAL]`; `EVO-UNI-090` commit each clip the moment it is
  captured — a file that exists only in the working tree is not delivered.

## Prerequisites

- Node `^20.19.0 || >=22.12.0` and pnpm on the WSL host (host has Node
  24.16.0, pnpm 11.15.1 — verified 2026-08-25).
- ffmpeg on the host for DT9 (host has 6.1.1 — verified 2026-08-25).
- Docker + the `evo-net` network for DT1's integration check (existing
  `rebuild-restart` skill).
- DTF must record `GO` before DT0 runs.

## Open questions

- `[FYI]` The skeleton's `.prettierrc.json` (`semi: false`, `singleQuote`,
  `printWidth: 100`, `trailingComma: all`) and the portfolio's Prettier
  defaults (no `.prettierrc`: semicolons, double quotes, width 80) differ.
  **Decision:** one config per repo — the vendored code is reformatted to the
  portfolio's defaults in DT0 as part of the vendoring commit, so later diffs
  against the skeleton are semantic only. No `theater/.prettierrc`.
- `[FYI]` `scripts/validate_codex_setup.py` enforces only the wrapper →
  canonical relationship (`WRAPPERS_DIR`/`CANONICAL_DIR` at lines 26-27,
  `references_canonical` at 78-81). Its `EXPECTED_HIGH_VALUE` tuple (line 36:
  `rules-index`, `backend`, `frontend`, `phase-status`) names skills this repo
  has never had, including the retired `phase-status`; DT8 adds the new
  wrapper and leaves that tuple alone — cleaning it is unrelated scope.
- `[FYI]` `images/chunk-norris/` is untracked with no project page. It is not
  in the eight; adding it is a separate change (page + card + registry entry).
- `[FYI]` Whether `vite dev` proxies `/images/` and `/projects/` from the repo
  root or uses a `publicDir` symlink is decided in DT0 by whichever works
  cleanly on WSL; the requirement is that project links and posters resolve
  without Docker.
