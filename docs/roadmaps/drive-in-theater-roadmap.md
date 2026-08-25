# Drive-In Theater Roadmap

> **For agentic sessions:** Load all listed skills before writing any code.
> Steps use checkbox (`- [ ]`) syntax for tracking progress.
> Each phase prompt is self-contained.

**Goal:** Add an opt-in, scroll-driven "drive-in movie theater" to the portfolio at
`/theater/`: the visitor drives through a night-time lot past eight screens, one per
project, each playing a short looping demo clip under a marquee, and clicks any screen to
reach that project's page. The existing homepage, project pages and card grid stay
exactly as they are and remain the fallback path.

**Architecture:** `theater/` is a self-contained Vite + strict-TypeScript project vendored
from `/home/evan/EVOsystem/scroll-driven-skeleton` (engine, `gsapTimeline` adapter,
conformance kit, loader, host, chrome — lottie/frame-sequence/Wix dropped), managed with
pnpm as a workspace member of the repo root. One scene, `lot`, holds a CSS-3D lot built
by a `GsapTimelineBuilder`: one tween moves the whole lot toward the camera along Z as
scroll progress goes 0→1; each screen is an `<a href="/projects/<slug>.html">` whose
`<video>` plays iff its screen is the active one (a pure function of progress, so
`seek` stays idempotent). Eight posters (`images/<slug>/01.png`, already on disk) are
declared to the asset loader and gate the reveal; clips (`images/<slug>/demo.mp4`,
produced by hand in the final phase) are deliberately outside the loader and degrade to
the poster when missing. A multi-stage `Dockerfile` builds the theater in a Node stage
and copies `theater/dist` into today's nginx image at `/theater/`; `index.html` gains one
hero CTA hidden on phones and under reduced motion. Delivery is its own phase (DT10): a
GitHub Actions workflow builds and pushes the image to ghcr.io with an immutable commit
tag and deploys it to the droplet by `docker compose pull`, and Evan's cutover decision
moves `evanleon.com` — today served from the droplet root, not this container — onto it.
The load-bearing assumption — transformed `<video>` elements perform and hit-test — is
falsified first, cheaply, on a probe that reproduces the production rendering path.

**Written:** 2026-08-25
**Source of truth:** `theater/**` (new), `Dockerfile`, `.dockerignore`, `package.json`,
`pnpm-workspace.yaml` (new), `.githooks/pre-commit`, `.prettierignore`, `index.html`,
`assets/css/styles.css`, `images/<slug>/demo.mp4` (new), `.claude/skills/adding-project-demo-clips/`
(new), `.agents/skills/adding-project-demo-clips/` (new), `.github/workflows/deploy.yml`
(new), `docs/deploy.md` (new), `docs/wireframes/theater.html`, `docs/wireframes/index-hero-cta.html`
**Prerequisites:** Node `^20.19.0 || >=22.12.0` and pnpm on the WSL host (host has Node
24.16.0 / pnpm 11.15.1, verified 2026-08-25); Docker with the external `evo-net` network
(the existing `rebuild-restart` skill); ffmpeg for DT9 (host has 6.1.1); the sibling
checkout `/home/evan/EVOsystem/scroll-driven-skeleton` at commit `7e5d44a` for DT0's
vendoring; **DTF must record `GO` or `GO-REDUCED` before DT0 runs**; **`images/el-blackjack/01.png` is a
68-byte 1×1 placeholder PNG (verified 2026-08-25) and must be replaced by a real screenshot
(≥ 1280×800 landscape or the portrait shape the other pages use) via the
`adding-project-screenshots` skill before DT3 — DT3's poster-dimension test fails until it is**;
for DT10, droplet SSH access, the three repo secrets (`DROPLET_HOST`, `DROPLET_USER`,
`DROPLET_SSH_KEY`) and control of `evanleon.com`'s DNS (Cloudflare); both wireframes approved 2026-08-25
(`docs/wireframes/theater.html` @ `c9e55bd`, `docs/wireframes/index-hero-cta.html` @ `959cdb9`).
**Spec:** `docs/superpowers/specs/2026-08-25-drive-in-theater-design.md`

| Phase | Name | Layer | Effort |
|---|---|---|---|
| DTF | Falsifier: transformed-video performance and hit-testing | spike | XS |
| DT0 | pnpm workspace, `theater/` scaffold, vendored engine with green tests | tooling | L |
| DT1 | Multi-stage Dockerfile; `/theater/` served by nginx | infra | S |
| DT2 | Tokens re-palette and theater page shell | frontend | M |
| DT3 | Projects registry, lot geometry, lot adapter, conformance test | frontend | M |
| DT4 | Video activation band and poster fallback | frontend | S |
| DT5 | Keyboard drive-by-focus, `reducedMotionSteps`, narrow layout | frontend | S |
| DT6 | Playwright suite for the theater | tests | S |
| DT7 | Hero CTA on `index.html` | site | XS |
| DT10 | Publish to ghcr, deploy to the droplet, cut over `evanleon.com` | infra [MANUAL gate] | S |
| DT8 | `adding-project-demo-clips` skill and ffmpeg recipe | skills | XS |
| DT9 | Record and encode the eight demo clips | media [MANUAL] | — |

## Skills and orientation, for every phase

`portfolio_site` has no `project-context` skill and no local `rules-index` skill. Every
phase below therefore loads:

1. `AGENTS.md` at the repo root — the orientation document (layout, commands, hook).
2. The shared rules tier: `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md`,
   `.../tooling.md`, `.../react-frontend.md` (index tables; `EVO-UNI-*`, `EVO-TOOL-*`,
   `EVO-FE-*`). From DT0 onward, also `theater/skills/rules-index/SKILL.md` (`SDS-*`).
3. `.claude/skills/writing-session-logs/SKILL.md` — every phase ends with a session log.

Phase-specific domain skills are listed per phase.

---

## Phase DTF: Falsifier — transformed-video performance and hit-testing

<task>
You are executing **Phase DTF of the Drive-In Theater Roadmap** — measuring, before any
code is vendored, whether eight CSS-3D-transformed `<video>` elements scrub smoothly and
remain clickable and focusable, because the whole roadmap is pointless if they do not.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md` and `tooling.md` — shared rules index (this repo has no local one)
3. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

Nothing for this feature. The repo is a no-build static site (`index.html`,
`projects/<slug>.html` × 8, `assets/`, `images/<slug>/01..05.png`) served by
`nginx:alpine` via `Dockerfile` (`COPY . /usr/share/nginx/html`). The approved wireframe
`docs/wireframes/theater.html` is a static CSS-3D composition of the intended lot:
`.lot { perspective: 900px }` → `.lot__world { transform-style: preserve-3d }` → eight
`<a class="screen">` placed with `translate3d(±480px, 0, -(i+1)·800px) rotateY(±18deg)`,
each holding a 520px-wide 16:10 surface. It uses `<img>` posters; the built page will
put a `<video>` in that surface.

No measurement of this exists anywhere in EVOsystem (searched 2026-08-25: no relevant
hit in any repo's `docs/evals/`, no gate scorecard; the only CSS-3D precedent is el-blackjack-pwa's single
card flip, which has no media element).

**Out of scope:** any vendoring, any `theater/` directory, any change to served files.
This phase produces a decision line, not code that ships.

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier for this phase:
- **EVO-UNI-091** — enumerate the reachable outcomes and which decision each changes before running the measurement; the bands below are that enumeration, written first.
- **EVO-UNI-120** — a metric that cannot report a bad number is not a measurement: include a failing control (a deliberately overloaded variant) and confirm the fps read drops for it.
- **EVO-UNI-021** — baseline first: measure the flat (untransformed) eight-video page before the transformed one, so the transform's cost is a difference against a known number.
- **EVO-UNI-011** — build only the probe; no styling beyond what the measurement needs.
</rules>

<reference_material>
Read these files before writing any code:
- `docs/wireframes/theater.html` — the `.lot`, `.lot__world`, `.screen` CSS block, the lit/unlit screen rules (`filter: brightness`, marquee glow) and the eight `nth-of-type` placements: the probe reproduces exactly this transform stack with `<video>` in place of `<img>`. Do not copy the annotations (`.note`) or the beats.
- `/home/evan/EVOsystem/scroll-driven-skeleton/src/engine/engine.ts` — the frame loop (`Lenis({ autoRaf: false })` ticked from rAF, one scroll read, `seek(progress)`): the probe's loop must have this shape, not a `scroll` listener.
- `/home/evan/EVOsystem/scroll-driven-skeleton/src/adapters/gsap-timeline.ts` — how progress is applied (`timeline.progress(p)`), which the probe mirrors.
- `docs/superpowers/specs/2026-08-25-drive-in-theater-design.md` — "Core assumption" section, for what the result feeds.
</reference_material>

<constraints>
- The probe is a single standalone HTML file at `docs/spikes/2026-08-25-transformed-video-probe.html`, opened over `file://`. It ships nothing; it may load `gsap` and `lenis` from jsdelivr `<script>` tags (the same libraries the vendored engine uses) — nothing else.
- It needs eight video sources. No clips exist yet: generate **eight distinct** 6-second 960×600 synthetic clips once with ffmpeg (`testsrc2` with a different `seed`/overlay text per file, H.264, no audio) into `docs/spikes/probe-clip-0..7.mp4` — one repeated file would let the browser share a decoder and understate the cost. Delete nothing afterwards — the spike directory is the receipt.
- Four variants, selected by a query string or a top-of-file constant, all with eight videos `muted loop playsinline`:
  - **flat** — eight videos in a plain grid, no transforms, all `autoplay`: the baseline.
  - **lot** — the production path, not a sketch of it: the wireframe's transform stack (`perspective: 900px`, `preserve-3d` world, eight screens at `translate3d(±480px, 0, −(i+1)·800px) rotateY(±18°)`, 520px 16:10 surfaces, marquee and posts); a GSAP timeline (`{ paused: true }`) holding one tween on the world's `translateZ` from 0 to 7200px **and** per-screen lit tweens driving `filter: brightness()` 0.35→1 and a marquee glow (`box-shadow`/`background`) in and out over each screen's band; Lenis constructed with `autoRaf: false`; a rAF loop that calls `lenis.raf(t)`, reads `window.scrollY` once, and seeks `timeline.progress(scrollY / range)` absolutely. All eight `<source>`s attached; only the screen whose band contains the camera is told to `play()`, the rest `pause()` — exactly DT4's rule.
  - **overload** — the lot variant with 32 screens: the failing control (EVO-UNI-120).
  - **reduced** — the lot variant where a screen's `<source>` is attached only while it is active and removed (with `load()`) when it leaves the band: DT4's GO-REDUCED mitigation, measured here so a GO-REDUCED verdict rests on a number, not a hope.
- **Measurement is defined, not left to feel** (manual, real browsers on the host — Chrome and Firefox; WebKit only if a Mac is available, else "not measured"): a 1440×900 window at 100% zoom, laptop on mains power, no other tabs playing media; DevTools Performance recording of **10 s of continuous wheel scrolling at a natural reading pace, top to bottom**; the metric is the **lowest fps over any contiguous 1 s window** in that recording; **three recordings per variant per browser, take the median**. Write all numbers into the probe's header comment.
- Hit-testing, on the lot variant: click the third screen (yawed away from the camera) and confirm the `<a>`'s `href` navigates; Tab from the top and confirm focus lands on screens in DOM order with a visible ring.
- Decision bands, pre-registered on the **lot** variant's median-of-three in **both** Chrome and Firefox: **GO** = ≥ 50 fps, overload reads lower than lot (the meter moves), click and Tab succeed. **GO-REDUCED** = lot in 30–49 fps in either browser **and** the *reduced* variant ≥ 50 fps in both, click and Tab succeed — DT4 then attaches a `<source>` only to the active screen. **NO-GO** = lot < 30 fps in either browser, or reduced < 50 when lot is in the 30–49 band, or click/Tab fails. A result straddling a boundary across the three runs is resolved by the median, never by re-running until it passes.
- Record the decision line in this roadmap under "Decision records" below and in the session log. On NO-GO, stop: the fallback (cross-fading the existing PNGs on untransformed screens, or dropping the lit-state filters) is a spec change, decided by Evan, not by this phase.
</constraints>

<build_order>

### 1. Probe page
- [ ] Generate `docs/spikes/probe-clip-0..7.mp4` with ffmpeg (6 s, 960×600, `testsrc2` with a distinct seed/label per file, libx264, `-an`, `-movflags +faststart`).
- [ ] Write `docs/spikes/2026-08-25-transformed-video-probe.html` with the four variants; the lot/overload/reduced variants drive a GSAP timeline (world `translateZ` + per-screen brightness/marquee tweens) from a Lenis-ticked rAF loop, per `<constraints>`.
- [ ] Add a header comment stating what is measured, the four variants, the sampling protocol, and the pre-registered bands, with empty slots for the numbers.

### 2. Hand over
- [ ] Commit the probe and the clip (the `<commit>` below). The measurement itself is a human step — see **Manual Verification** — so the session's work ends here; the decision line is written by whoever measures.

</build_order>

## Manual Verification (Evan, in a real browser — not an agent step)

1. Open the **flat** variant in Chrome and in Firefox; DevTools → Performance → record 10 s of continuous wheel scrolling at a natural pace; note the lowest 1 s-window fps. Three recordings per browser; write the median (and the three raw numbers) into the probe file's header comment.
2. **overload** — same. It must read lower than **lot** — if it does not, the meter is not moving (EVO-UNI-120): hand the probe back to a session to add screens / enlarge surfaces before measuring further.
3. **lot** — same measurement, plus the click and Tab checks from `<constraints>`.
4. **reduced** — same measurement (this is what a GO-REDUCED verdict rests on).
5. Apply the pre-registered bands and write the decision row (`GO` / `GO-REDUCED` / `NO-GO`, the four medians per browser, click/Tab result, date, decider) into the "Decision records" table at the bottom of this roadmap; commit it as `docs(dtf): decision record`.

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
for i in 0 1 2 3 4 5 6 7; do ffprobe -v error -show_entries stream=codec_name,width,height -of csv=p=0 docs/spikes/probe-clip-$i.mp4; done
# expected: eight lines of h264,960,600
ls docs/spikes/probe-clip-*.mp4 | wc -l                       # 8 distinct clips
grep -c '<video\|createElement(.video.)' docs/spikes/2026-08-25-transformed-video-probe.html   # ≥ 1 — screens may be built in script
grep -n 'gsap.timeline\|timeline.progress(' docs/spikes/2026-08-25-transformed-video-probe.html   # the lot variant seeks a GSAP timeline absolutely
grep -n 'brightness(' docs/spikes/2026-08-25-transformed-video-probe.html   # the lit-state filter is in the probe
grep -E '^\| DTF \| (GO|GO-REDUCED|NO-GO) \|' docs/roadmaps/drive-in-theater-roadmap.md
# expected: exactly one matching row in the DTF decision record table
```

Expected, for the session that builds the probe: eight distinct h264 960×600 clips; the probe seeks a GSAP timeline and carries the brightness filter; the decision-record grep prints **nothing yet** (the row is still `_not yet run_`). Expected, after Manual Verification: the grep prints exactly one row, and the medians for all four variants are in the probe file's header with overload lower than lot in both browsers.
</verification>

<commit>
```
docs(dtf): transformed-video falsifier probe and decision
```
</commit>

## Done

After this phase — the session's probe plus Evan's Manual Verification — portfolio_site has
a recorded, pre-registered answer to whether the drive-in's rendering approach performs:
one decision line in this roadmap.

On `GO` or `GO-REDUCED`, paste Phase DT0. On `NO-GO`, stop and hand the result to Evan —
the fallback is a spec decision.

---

## Phase DT0: pnpm workspace, `theater/` scaffold, vendored engine with green tests

<task>
You are executing **Phase DT0 of the Drive-In Theater Roadmap** — creating `theater/`
as a self-contained Vite + TypeScript project by vendoring the scroll-driven-skeleton
engine into this repo, with its unit tests green, so every later phase has a place to
build.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md`, `tooling.md`, `react-frontend.md` — shared rules index; and `/home/evan/EVOsystem/scroll-driven-skeleton/skills/rules-index/SKILL.md` — the `SDS-*` law this phase copies in
3. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- DTF recorded `GO` (or `GO-REDUCED`) in this roadmap's "Decision records". Check it.
- This repo: root `package.json` (`name: portfolio-site`, scripts `format` /
  `format:check` = Prettier over `"**/*.{html,css,js}"`, `validate:codex`; devDependency
  `prettier ^3.6.2`; `packageManager: pnpm@11.15.1`), `pnpm-lock.yaml`, no
  `pnpm-workspace.yaml`, no `.prettierrc` (Prettier defaults: semicolons, double
  quotes, width 80). `.prettierignore` excludes `*.md`, `docs/`, `node_modules/`,
  `pnpm-lock.yaml`. `.githooks/pre-commit` line 59 filters staged files with
  `grep -E '\.(html|css|js)$'` and runs `node_modules/.bin/prettier --check` on them;
  it is installed with `git config core.hooksPath .githooks`. `.gitignore` ignores
  `node_modules/` and `*.log` at any depth. There is no `theater/` directory and no CI.
- The skeleton at `/home/evan/EVOsystem/scroll-driven-skeleton` @ `7e5d44a` (Vite
  `^8.2.1`, Vitest `^4.1.10`, TypeScript `^5.9.3`, `@playwright/test ^1.62.1`, ESLint
  10 flat config, `gsap ^3.15.0`, `lenis ^1.3.26`, `lottie-web`, `vitest-canvas-mock`,
  `jsdom`; **npm** with `package-lock.json`). Its layout: `src/engine/` (engine.ts,
  mount.ts, scene.ts, progress.ts, scroll-source.ts, fake-layout.ts, engine-styles.ts +
  tests), `src/adapters/` (types.ts, placeholder.ts, adapter-contract.ts,
  gsap-timeline.ts, frame-sequence.ts, lottie.ts + tests incl.
  `dynamic-import-boundary.test.ts` which mocks both `gsap` and
  `lottie-web/build/player/lottie_light`), `src/host/` (types.ts, standalone.ts + test),
  `src/loader/` (asset-loader.ts, loading-ring.ts + tests), `src/page/chrome.ts` (+
  test), `src/scenes/` (types.ts, registry.ts), `src/styles/` (tokens.css, global.css),
  `src/main.ts`, `src/index.ts` (library entry), `src/test-setup.ts` (+ test; stubs
  `matchMedia`, `ResizeObserver`, and installs `vitest-canvas-mock` for the
  frame-sequence adapter), `e2e/` (six specs keyed to the demo scenes + `helpers/app.ts`,
  `helpers/canvas.ts`), `vite.config.ts` (single file; `defineConfig` from
  `'vitest/config'`; `test.include: ['src/**/*.test.ts']`, `setupFiles`, no
  `passWithNoTests`), `playwright.config.ts` (testDir `e2e`, port 4173, `retries: 0`,
  `trace: 'retain-on-first-failure'`, webServer `npm run build && npm run preview --
  --port 4173 --strictPort`, `reuseExistingServer: false`), `tsconfig.json` (strict,
  `noEmit`, `noUncheckedIndexedAccess`, `include: ["src","e2e","vite.config.ts","playwright.config.ts"]`,
  `types: ["vite/client"]`), `eslint.config.js`, `.prettierrc.json` (`semi: false`,
  `singleQuote: true`, `printWidth: 100`, `trailingComma: all`), `skills/rules-index/SKILL.md`
  (ten `SDS-*` rules + three recorded departures), `public/frames`, `public/lottie`,
  `probe/`, `scripts/`, `docs/`.
- `AnimationAdapter` (`src/adapters/types.ts`): `load(onProgress)`, `seek(progress)`,
  `resize(w,h)`, `destroy()`, optional `eager`. `AdapterFactory` is `(container) =>
  AnimationAdapter` with optional `assets: readonly AssetSpec[]` (`kind: 'image' |
  'json' | 'binary'`). `createEngine(options: EngineOptions)` returns `{ start, stop,
  destroy }`; `EngineOptions` = `{ host, scenes, persistentLayer?, loadingRing?, lenis? }`.

**Out of scope:** the Dockerfile (DT1), the page content and palette (DT2), any scene
beyond a placeholder (DT3). The scaffold's page is the skeleton's shell with one
`placeholder('Lot')` scene so `vite build` produces a working page.

Verify this list against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier and the skeleton's law for this phase:
- **EVO-TOOL-002** — pnpm for JS/TS; the skeleton's `npm` is its own recorded departure and does not transfer. No `package-lock.json` in `theater/`.
- **EVO-TOOL-005** — Vitest `include` stays `src/**/*.test.ts` under `theater/`; Playwright owns `e2e/`.
- **EVO-TOOL-047 / EVO-TOOL-057** — the skeleton records deliberate departures (`.ts`-only glob; `passWithNoTests` unset). Carry both departures *and their reasoning* into the vendored rules index; do not "fix" either.
- **EVO-TOOL-068** — `vitest` pinned to a version whose peer `vite` range covers Vite 8; keep the skeleton's pair (`vite ^8.2.1`, `vitest ^4.1.10`).
- **EVO-TOOL-076** — exactly one Vite config file (`vite.config.ts`); never add a `.js` sibling.
- **EVO-TOOL-080** — `defineConfig` from `'vitest/config'`.
- **EVO-TOOL-081** — `tsconfig.json` keeps `noEmit: true`; test files are type-checked via `include` (they import from `'vitest'` explicitly, so this is safe).
- **EVO-TOOL-010** — pnpm blocks native build scripts: after `pnpm install`, if pnpm prints an "ignored build scripts" warning for any package, add it to `pnpm.onlyBuiltDependencies` in the root `package.json` and reinstall. (Vite 8's rolldown binding is a prebuilt optional dependency and should need nothing.)
- **EVO-TOOL-110** — `core.hooksPath` stays the repo-relative `.githooks`.
- **EVO-FE-067** — `jsdom` is an explicit devDependency of `theater/`.
- **EVO-FE-220** — no Vitest globals; every test imports from `'vitest'` (the vendored tests already do — keep it so).
- **EVO-UNI-012** — dependencies are exactly the skeleton's minus `lottie-web` and (see `<branch>`) `vitest-canvas-mock`; nothing new.
- **EVO-UNI-057** — the vendored rules index is a *copy* of the skeleton's file with tombstones, not a paraphrase.
- **SDS-003** — every vendored adapter (placeholder, gsap-timeline) still passes `adapterContract()` after the move.
- **SDS-009** — `tokens.css` keeps `:host, :root`; do not simplify while reformatting.
</rules>

<reference_material>
Read these files before writing any code:
- `/home/evan/EVOsystem/scroll-driven-skeleton/AGENTS.md` — "Where things live" and "What not to change without understanding the consequences"; the vendoring must preserve every load-bearing shape listed there.
- `/home/evan/EVOsystem/scroll-driven-skeleton/src/test-setup.ts` — its header names the three jsdom gaps it fills; item 3 (canvas) exists for the frame-sequence adapter this phase drops.
- `/home/evan/EVOsystem/scroll-driven-skeleton/src/adapters/dynamic-import-boundary.test.ts` — mocks `lottie-web`; after the drop, keep only its `gsap` half (the test's point — no static `gsap` import in the entry graph — still applies).
- `/home/evan/EVOsystem/scroll-driven-skeleton/src/index.ts` — the library entry; drop the `frameSequence`/`lottie` export blocks, keep the rest. `src/main.ts` must never import it (it reaches `vitest`).
- `/home/evan/EVOsystem/scroll-driven-skeleton/vite.config.ts`, `playwright.config.ts`, `tsconfig.json`, `eslint.config.js` — copy, then edit per `<constraints>`.
- `/home/evan/EVOsystem/scroll-driven-skeleton/docs/deployment.md` — "The sub-path trap": why `base` matters and why every asset URL must be built from `import.meta.env.BASE_URL` with no leading slash.
- `.githooks/pre-commit` — line 59, the staged-file filter to widen.
- `AGENTS.md` (this repo) — "Setup & verification commands" and the dependency policy paragraph; update both to mention `theater/`.
</reference_material>

<constraints>
- Root: add `pnpm-workspace.yaml` with `packages: ['theater']`; add root scripts `theater:build`, `theater:test`, `theater:typecheck`, `theater:lint` that run `pnpm -C theater <script>`; widen `format`/`format:check` globs to `"**/*.{html,css,js,ts}"`; add `theater/dist/` and `theater/node_modules/` to `.prettierignore`; add `theater/dist/`, `theater/test-results/`, `theater/playwright-report/`, `theater/.vite/` to `.gitignore`. One `pnpm-lock.yaml` at the root covers both packages.
- `.githooks/pre-commit` line 59: the filter becomes `\.(html|css|js|ts)$`. Nothing else in the hook changes.
- `theater/package.json`: `name: "portfolio-theater"`, `private: true`, `type: "module"`, scripts `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `typecheck`, `lint`, `test` (`vitest run`), `test:watch`, `test:e2e`; dependencies `gsap`, `lenis`; devDependencies `@eslint/js`, `@playwright/test`, `eslint`, `eslint-config-prettier`, `jsdom`, `typescript`, `typescript-eslint`, `vite`, `vitest` at the skeleton's ranges (plus `vitest-canvas-mock` only per `<branch>`). No `prettier` here — the root owns formatting. No `engines` field (the root does not pin one either; the host runs Node 24).
- Vendor (copy, then adapt): `src/engine/**`, `src/adapters/{types,placeholder,adapter-contract,gsap-timeline}.ts` and their `.test.ts` / `.contract.test.ts` files, `src/adapters/dynamic-import-boundary.test.ts` (gsap half only), `src/host/**`, `src/loader/**`, `src/page/**`, `src/scenes/types.ts`, `src/scenes/registry.ts` (reduced to one `placeholder('Lot')` scene, `vh: 300`), `src/styles/{tokens,global}.css`, `src/main.ts`, `src/index.ts`, `src/test-setup.ts` (+ its test), `e2e/helpers/app.ts`, `vite.config.ts`, `playwright.config.ts`, `tsconfig.json`, `eslint.config.js`, `index.html` (the skeleton's shell, scene slots reduced to one `data-scene-slot="lot"`). **Do not vendor:** `frame-sequence.*`, `lottie.*`, `e2e/helpers/canvas.ts`, the six `e2e/*.spec.ts` files (DT6 writes fresh ones against the real page), `probe/`, `scripts/`, `public/**`, `docs/**`, `.github/**`, `package-lock.json`, `.prettierrc.json`.
- `theater/vite.config.ts`: `base: '/theater/'`; `build.outDir: 'dist'`; keep `sourcemap: true`, the `test` block, `setupFiles`. Add the dev/preview middleware plugin below.
- **Site-assets middleware (decided here, not left open):** add `theater/vite-site-assets.ts` exporting a Vite plugin `siteAssets()` that, in both `configureServer` and `configurePreviewServer`, serves any request whose path starts with `/images/` or `/projects/` from the repo root (`../images`, `../projects`) with a content type from a small extension map (`png`, `jpg`, `jpeg`, `mp4`, `webm`, `html`) and a 404 otherwise. No new dependency; Node `fs`/`path` only. This is what lets `/images/<slug>/01.png` and `/projects/<slug>.html` resolve under `vite dev`, `vite preview` and the Playwright suite exactly as they will under nginx.
- `theater/playwright.config.ts`: webServer command becomes `pnpm build && pnpm preview -- --port 4173 --strictPort`; `use.baseURL` stays `http://localhost:4173`; everything else as vendored. No specs are written in this phase, so **do not run `test:e2e` here** — Playwright exits non-zero on an empty suite, and that is the honest answer until DT6.
- `theater/tsconfig.json`: `include` adds `vite-site-assets.ts`; `exclude` drops `dist-wix` and `probe`.
- `theater/eslint.config.js`: drop the `probe/**` and `docs/wireframes/**` ignores and the `scripts/**/*.mjs` Node-globals block; add a Node-globals block for `vite-site-assets.ts` (`process`, `console`) if `no-undef` needs it.
- Reformat every vendored file with the **root** Prettier (`pnpm format`) as part of this phase — one mechanical change, so later diffs against the skeleton are semantic only. Do not add a `theater/.prettierrc`.
- `theater/skills/rules-index/SKILL.md`: a copy of the skeleton's file with the header reworded for this repo, `SDS-007` and `SDS-008` rows replaced by tombstone rows ("retired on vendoring 2026-08-25 — subject not vendored; ID never reused"), and the `EVO-TOOL-002` departure row **removed** (this repo uses pnpm; the departure no longer exists). Keep the `EVO-TOOL-047` and `EVO-TOOL-057` departure rows verbatim.
- `theater/README.md`: five lines — what this is, that it was vendored from `scroll-driven-skeleton` @ `7e5d44a` on 2026-08-25, what was dropped, and the three commands (`pnpm -C theater dev|test|build`).
- `AGENTS.md`: add `theater/` to "Repository layout & source of truth" and the three `theater:*` scripts to "Setup & verification commands"; note that `theater/dist` is a build artefact never committed.
- `SDS-009`: while reformatting `tokens.css`, the `:host, :root` selectors stay.
- `EVO-TOOL-121`-adjacent: `tsc --noEmit` runs over `src` + `e2e` + configs; after dropping the frame-sequence and lottie modules, `grep -rn 'frameSequence\|lottie' theater/src theater/e2e` must be empty or the typecheck fails on a dangling import — clean up every reference (index.ts exports, dynamic-import test, test-setup comments that describe SD8).
</constraints>

<branch>
Check `/home/evan/EVOsystem/scroll-driven-skeleton/src/test-setup.ts` before writing any code:
- If, after dropping `frame-sequence.ts` and its test, **no remaining vendored file calls the canvas API** — `grep -rnE '\.getContext\(|HTMLCanvasElement' theater/src` is empty (match the API, not the word: several vendored comments say "canvas" in prose, and `adapter-contract.test.ts` creates a `<canvas>` element as an opaque fixture without ever drawing on it — neither needs the mock) → remove the `vitest-canvas-mock` import and its numbered item from `test-setup.ts`'s header, leave `vitest-canvas-mock` out of `theater/package.json`, **and delete the `canvas 2d fill` `describe` block from `src/test-setup.test.ts`** — its two tests exist only to prove the mock and fail the moment it is gone (a scratch run of this exact removal on `7e5d44a` failed 2 of 233 tests for that reason); keep that file's `matchMedia` and `ResizeObserver` tests. **This is the expected outcome** as of `7e5d44a`; the `<rules>` bullet for `EVO-UNI-012` assumes it.
- If something still calls the API → keep `vitest-canvas-mock` as a devDependency and its header item, and record which file needs it in the test-setup header.
</branch>

<build_order>

### 1. Workspace
- [ ] Create `pnpm-workspace.yaml`; add the root `theater:*` scripts; widen the Prettier globs; extend `.prettierignore` and `.gitignore`; widen the pre-commit filter on line 59.

### 2. Scaffold and vendor
- [ ] Create `theater/package.json`, `tsconfig.json`, `eslint.config.js`, `vite.config.ts` (with `base` and the `siteAssets()` plugin), `playwright.config.ts`, `index.html` per `<constraints>`.
- [ ] Copy the vendored source and test files; delete every frame-sequence / lottie / Wix reference; reduce the registry to one placeholder scene; keep `src/main.ts`'s wiring (`standaloneHost`, `createPageChrome`, `createLoadingRing`, `createEngine`).
- [ ] Write `theater/vite-site-assets.ts`.
- [ ] Resolve the `<branch>` for `vitest-canvas-mock`.
- [ ] `pnpm install` from the root; act on any build-scripts warning (EVO-TOOL-010).

### 3. Law and docs
- [ ] Write `theater/skills/rules-index/SKILL.md` (copy + tombstones + departure edits) and `theater/README.md`.
- [ ] Update `AGENTS.md`.

### 4. Format and prove
- [ ] `pnpm format` from the root; confirm `pnpm format:check` is clean.
- [ ] Run typecheck, lint, unit tests and `vite build` per `<verification>`; fix until green.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
cat pnpm-workspace.yaml                                   # lists theater
pnpm install --frozen-lockfile                            # exit 0, no "ignored build scripts" warning
pnpm -C theater typecheck && pnpm -C theater lint && pnpm -C theater test
pnpm -C theater test -- src/test-setup.test.ts               # matchMedia + ResizeObserver tests pass; no canvas tests remain
pnpm -C theater build && test -f theater/dist/index.html
grep -c 'src="/theater/assets/' theater/dist/index.html   # ≥ 1: base applied to the built asset URLs
grep -rn 'frameSequence\|lottie\|dist-wix\|build:wix' theater/src theater/e2e theater/*.ts theater/*.json ; echo "exit=$?"   # expected: no output, exit=1
grep -n "html|css|js|ts" .githooks/pre-commit             # the widened filter on line 59
pnpm format:check                                         # "All matched files use Prettier code style!"
grep -E '^\| `SDS-00[78]`' theater/skills/rules-index/SKILL.md   # two tombstone rows
# the site-assets middleware, against preview (base is /theater/, so the page is under it):
(pnpm -C theater preview -- --port 4173 --strictPort >/tmp/preview.log 2>&1 &) ; sleep 3
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4173/theater/            # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4173/images/nom-noms/01.png   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4173/projects/nom-noms.html   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4173/images/does-not-exist.png # 404
pkill -f 'vite preview' || true
```

Expected: every command exits 0 except the `grep -rn` for dropped modules (which must print nothing) and the deliberate 404; the vendored suites (engine, scene, progress, mount, scroll-source, loader, loading-ring, loading-gate, chrome, standalone, placeholder + gsap contract tests, test-setup) pass; `theater/dist/index.html` references `/theater/assets/…`.
</verification>

<commit>
```
feat(dt0): vendor the scroll-driven-skeleton engine into theater/ as a pnpm workspace member
```
</commit>

## Done

After this phase, portfolio_site can: build, typecheck, lint and unit-test a self-contained
`theater/` Vite project that renders the skeleton's shell with one placeholder scene at
`/theater/`, with `/images/` and `/projects/` resolving under dev and preview.

Paste Phase DT1.

---

## Phase DT1: Multi-stage Dockerfile; `/theater/` served by nginx

<task>
You are executing **Phase DT1 of the Drive-In Theater Roadmap** — making the Docker image
build the theater in a Node stage and serve `theater/dist` at `/theater/` from the
existing nginx image, so every later phase has a real integration check.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/tooling.md` (Docker/pnpm rows) and `universal.md`; `theater/skills/rules-index/SKILL.md`
3. `.claude/skills/rebuild-restart/SKILL.md` — the rebuild + recreate procedure and why `--force-recreate`
4. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- `theater/` exists (DT0): a pnpm workspace member whose `pnpm -C theater build` runs
  `tsc --noEmit && vite build` into `theater/dist/` with `base: '/theater/'`. Root
  `pnpm-workspace.yaml` lists it; root `package.json` pins `packageManager: pnpm@11.15.1`;
  one root `pnpm-lock.yaml`.
- `Dockerfile` is single-stage: `FROM nginx:alpine`, `COPY . /usr/share/nginx/html`,
  `COPY nginx.conf /etc/nginx/conf.d/default.conf`, `RUN rm -f /usr/share/nginx/html/nginx.conf`,
  `EXPOSE 80`. `.dockerignore` excludes `.git`, `docs`, `*.md`, `node_modules`,
  `.githooks`, `package.json`, `pnpm-lock.yaml`, `.prettierignore`, `.prettierrc*`,
  `Dockerfile*`, `docker-compose.yml`, `.env*`, `CNAME`, `.claude`, `.superpowers`.
- `nginx.conf`: `root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri.html $uri/ =404; }` with a custom `404.html`. No change is needed for `/theater/` — `$uri/` resolves the directory index.
- `docker-compose.yml`: service `portfolio-site`, `image: ghcr.io/evan-leon/portfolio-site:latest`, `build: .`, `restart: unless-stopped`, Traefik labels for `Host(portfolio-site.${DOMAIN:-localhost})` on the external `evo-net` network. Locally the site answers at `http://portfolio-site.localhost` via Traefik.

**Out of scope:** page content (DT2). The placeholder page DT0 built is what this phase
serves.

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier for this phase:
- **EVO-TOOL-061** — the dependency-install layer must `COPY` `pnpm-workspace.yaml` alongside `package.json` and `pnpm-lock.yaml` (and `theater/package.json`), or `pnpm install --frozen-lockfile` resolves a different tree than the lockfile describes.
- **EVO-TOOL-107** — `corepack enable` is only safe because the root `package.json` commits a `packageManager` pin; the build stage must copy that file before enabling corepack.
- **EVO-TOOL-058** — `.dockerignore` must not exclude anything `theater/tsconfig.json` `include`s (`src`, `e2e`, the config files) — the build stage type-checks them.
- **EVO-TOOL-111** — no bind mount: a served change needs the `rebuild-restart` procedure, every time.
- **EVO-TOOL-130** — if `/theater/` looks unreachable, prove where the break is: `curl` inside the container first, then through Traefik.
- **EVO-TOOL-167** — `Up` says nothing about the published route; the check is an HTTP status through Traefik.
- **EVO-TOOL-040** — the compose file's project naming: run compose from the main checkout, not a worktree.
</rules>

<reference_material>
Read these files before writing any code:
- `Dockerfile`, `.dockerignore`, `nginx.conf`, `docker-compose.yml` — the whole serving config; the nginx stage stays byte-for-byte what it is today apart from the one added `COPY --from`.
- `.claude/skills/rebuild-restart/SKILL.md` — the verification procedure.
- `theater/package.json` and `pnpm-workspace.yaml` — what the build stage must copy before installing.
</reference_material>

<constraints>
- Two stages. **Build stage:** `node:22-alpine`, `WORKDIR /app`, copy `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `theater/package.json`; `corepack enable`; `pnpm install --frozen-lockfile`; copy `theater/` (source only — `.dockerignore` keeps `theater/node_modules` and `theater/dist` out of the context); `pnpm -C theater build`. **Serve stage:** today's nginx stage, plus `RUN rm -rf /usr/share/nginx/html/theater` after the existing `COPY .` (the source tree must not be served) and then `COPY --from=build /app/theater/dist /usr/share/nginx/html/theater`.
- `.dockerignore`: **remove** `package.json`, `pnpm-lock.yaml` from the exclusions (the build stage needs them); add `theater/node_modules`, `theater/dist`, `theater/test-results`, `theater/playwright-report`. Because they now enter the context, the serve stage's existing `COPY .` lands them in the webroot — extend the existing `RUN rm -f` line to also remove `/usr/share/nginx/html/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (same pattern as `nginx.conf`).
- Keep `nginx.conf` unchanged. Keep `docker-compose.yml` unchanged.
- Pin the Node major deliberately (`node:22-alpine`, which ships corepack — `EVO-TOOL-107`); do not bump it without re-testing that corepack resolves `pnpm@11.15.1` in that image (or switch to an explicit `npm i -g pnpm@11.15.1` and drop corepack).
- Update `.claude/skills/rebuild-restart/SKILL.md`'s "When to use" list to include `theater/**` (the theater is built into the image; any change to it needs a rebuild), and note that a theater type error now fails `docker compose build`.
</constraints>

<build_order>

### 1. Dockerfile and context
- [ ] Rewrite `Dockerfile` as the two stages described in `<constraints>`.
- [ ] Edit `.dockerignore` per `<constraints>`.

### 2. Skill update
- [ ] Extend `.claude/skills/rebuild-restart/SKILL.md` (the canonical body; the `.agents/` wrapper needs no change).

### 3. Build and serve
- [ ] `docker compose build && docker compose up -d --force-recreate` from the repo root; fix until the image builds and the container is up.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
docker compose build 2>&1 | tail -5                       # exit 0; the build stage ran tsc + vite build
docker compose up -d --force-recreate
docker compose ps                                         # portfolio-site Up
# inside the container first (EVO-TOOL-130), then through Traefik (EVO-TOOL-167):
docker compose exec portfolio-site sh -c 'ls /usr/share/nginx/html/theater/index.html && ls /usr/share/nginx/html/theater/assets | head -3'
docker compose exec portfolio-site sh -c 'ls /usr/share/nginx/html/theater/src 2>&1; ls /usr/share/nginx/html/package.json 2>&1' # both: No such file
curl -s -o /dev/null -w '%{http_code}\n' http://portfolio-site.localhost/theater/        # 200
curl -s http://portfolio-site.localhost/theater/ | grep -c 'src="/theater/assets/'      # ≥ 1
curl -s -o /dev/null -w '%{http_code}\n' http://portfolio-site.localhost/                # 200 (site unchanged)
curl -s -o /dev/null -w '%{http_code}\n' http://portfolio-site.localhost/projects/nom-noms.html   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://portfolio-site.localhost/theater/nope    # 404 (nginx; note vite preview serves the index here — a known, accepted difference)
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://portfolio-site.localhost/theater   # 301 → …/theater/ (nginx directory redirect); the CTA links the slashed form
# negative: a type error must fail the image build — introduce one, build, revert
echo 'const x: number = "no"' >> theater/src/main.ts && (docker compose build >/dev/null 2>&1; echo "build exit=$?") ; git checkout -- theater/src/main.ts
# expected: build exit=1
```

Expected: the two `ls` probes for source/package files report "No such file"; `/theater/`
is 200 with base-prefixed asset URLs; the deliberate type error makes `docker compose build` exit non-zero.
</verification>

<commit>
```
feat(dt1): multi-stage Dockerfile — build theater/ in a Node stage, serve it at /theater/
```
</commit>

## Done

After this phase, portfolio_site serves `/theater/` from the nginx image on `evo-net`,
built from source on every `docker compose build`, and a theater type error fails the image.

Paste Phase DT2.

---

## Phase DT2: Tokens re-palette and theater page shell

<task>
You are executing **Phase DT2 of the Drive-In Theater Roadmap** — giving `/theater/` the
portfolio's palette and the approved page structure (chrome, hero beat, one scene slot,
exit beat with the no-JS list), so the lot has a page to live in that looks like the rest
of the site.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md` (token rows) and `react-frontend.md`; `theater/skills/rules-index/SKILL.md`
3. `.claude/skills/rebuild-restart/SKILL.md`
4. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- `theater/` (DT0) builds and is served at `/theater/` (DT1). Its `index.html` is the
  skeleton's demo shell: `#app` root, `.sds-skip` link to `#content`, `.sds-chrome__bar`
  (`data-sds-progress-bar`), `.sds-chrome` header with `data-sds-progress-percent`, a
  `.sds-section--hero`, one `<div data-scene-slot="lot"></div>`, a `#content` section,
  `.sds-footer`, and the `data-sds-persistent` element `createPageChrome` requires
  (`theater/src/page/chrome.ts` throws if any of the three `data-sds-*` elements is
  missing). `theater/src/main.ts` wires `createLoadingRing(mount, { minVisibleMs:
  loaderMinVisibleMs(mount) })`, `standaloneHost(mount)`, `createPageChrome(mount)`, and
  `createEngine({...}).start()`; the registry is one `placeholder('Lot')` scene.
- `theater/src/styles/tokens.css` is the skeleton's brand-neutral palette: primitives
  `--sds-ink-950…000`, `--sds-signal-500/400/300`, `--sds-warn-500`; semantic
  `--sds-bg`, `--sds-bg-raised`, `--sds-bg-inset`, `--sds-text`, `--sds-text-muted`,
  `--sds-text-subtle`, `--sds-border`, `--sds-border-strong`, `--sds-accent`,
  `--sds-accent-soft`, `--sds-warn`, `--sds-focus-ring`, `--sds-loader-*`; spacing
  `--sds-space-1…32`; type `--sds-font-sans/mono`, `--sds-text-display…micro`; radii,
  durations, z-indices. Every block is `:host, :root` (`SDS-009`). `global.css` styles
  `.sds-chrome*`, `.sds-section`, `.sds-section--hero`, `.sds-skip`, `.sds-footer`,
  `.sds-persistent`, and `@import`s `tokens.css`.
- The site's tokens live in `assets/css/styles.css` lines 4–48 (`--deep-space #0a0520`,
  `--void`, `--nebula-start #7c3aed`, `--nebula-end #3b82f6`, `--star-white #f0f0ff`,
  `--body-text #a0a8c8`, `--muted #6b7280`, `--label-blue #7c8aff`, `--light-purple`,
  `--footer-bg #060315`, `--footer-text`, `--font-primary` Inter, `--font-mono` JetBrains
  Mono). Every site page loads Inter + JetBrains Mono from Google Fonts and a Google
  Analytics `gtag` snippet for `G-N6J50LX4EY` (see `index.html` head, lines 24–50).
- The approved wireframe `docs/wireframes/theater.html` defines the page: chrome (logo
  `Evan Leon` → `/`, percent readout, 2px gradient bar), hero beat (eyebrow "Now showing ·
  8 projects", h1 "The Drive-In", lede, hint "↓ SCROLL TO DRIVE"), the lot, exit beat
  (`#exit`, `tabindex="-1"`, eyebrow "End of the lot", h2, two buttons → `/#projects` and
  `/#contact`, a two-column `<ul class="exit-list">` of the eight project links), footer
  "© 2026 Evan Leon". It also proposes three theater-only tokens: `--marquee-glow: #d4a862`,
  `--asphalt: #14102b`, `--asphalt-far: #0a0520`.

**Out of scope:** the lot itself (DT3) — this phase's scene stays `placeholder('Lot')`
at the final length (`vh: 1060`) so the page's scroll geometry is real; the hero CTA on
`index.html` (DT7).

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier and the skeleton's law for this phase:
- **EVO-UNI-001 / EVO-UNI-002 / EVO-UNI-003** — every colour, space, font and size is a token from `tokens.css`; re-palette by editing the PALETTE block's *values*, keep the semantic names; add the three theater tokens there rather than approximating inline.
- **EVO-UNI-030** — no `var(--token, #hex)` fallbacks.
- **EVO-FE-239** — `tokens.css` is imported before the rules that read it (`global.css` already `@import`s it first; keep that order).
- **EVO-FE-223** — CSS enters through `main.ts` (`import './styles/global.css'`), not a `<link>`.
- **EVO-UNI-048** — everything the approved wireframe shows must be on the built page: chrome, both beats, the no-JS list, the skip link.
- **SDS-009** — every `tokens.css` block stays `:host, :root`.
- **SDS-005** — the chrome is driven by the engine's `persistentLayer`; add no `scroll` listener.
</rules>

<reference_material>
Read these files before writing any code:
- `docs/wireframes/theater.html` — the page structure and copy, and its `:root` token block (a copy of the site's) mapped onto the skeleton's semantic names below. **Do not copy its `.note` annotations, its `.lot`/`.screen` CSS, or its inline `<style>` approach** — the lot is DT3's and styles live in `global.css`.
- `theater/src/styles/tokens.css` — the PALETTE block to re-value and the semantic layer to leave alone.
- `theater/src/styles/global.css` — restyle the existing `.sds-*` classes to the wireframe; add `.sds-eyebrow`, `.sds-lede`, `.sds-hint`, `.sds-btn`, `.sds-btn--primary`, `.sds-btn--secondary`, `.sds-exit-list` (namespaced `sds-` like the rest).
- `theater/src/page/chrome.ts` — the three `data-sds-*` attributes the page must carry.
- `index.html` (site root) lines 24–50 — the fonts `<link>`s and the GA snippet to replicate in `theater/index.html`'s head.
</reference_material>

<constraints>
- Palette mapping (values only): `--sds-bg` ← `--deep-space` `#0a0520`; `--sds-bg-raised` ← `--void` `#0f0a2a`; `--sds-bg-inset` ← `--footer-bg` `#060315`; `--sds-text` ← `--star-white`; `--sds-text-muted` ← `--body-text`; `--sds-text-subtle` ← `--muted`; `--sds-accent` ← `--nebula-start` `#7c3aed`; `--sds-accent-soft` ← `--light-purple` `#c4b5fd`; `--sds-focus-ring` ← `--label-blue` `#7c8aff`; `--sds-border` / `--sds-border-strong` ← the site's `--purple-border-subtle` at two alphas; `--sds-font-sans` ← `"Inter", system-ui, -apple-system, sans-serif`; `--sds-font-mono` ← `"JetBrains Mono", ui-monospace, monospace`. Add `--sds-marquee: #d4a862`, `--sds-asphalt: #14102b`, `--sds-asphalt-far: #0a0520`, and `--sds-gradient-accent: linear-gradient(135deg, #7c3aed, #3b82f6)` for the chrome bar and primary button. Loader tokens follow `--sds-bg` / `--sds-accent`.
- `theater/index.html`: `<title>The Drive-In | Evan Leon</title>`, description meta, the fonts links, favicon `/images/favicon.png`, the GA snippet; body per the wireframe. The skip link targets `#exit`; `#exit` carries `tabindex="-1"`. The `data-sds-persistent` element stays (the chrome requires it) but is visually hidden — the percent readout is the visible one.
- Every internal link is site-absolute (`/`, `/#projects`, `/#contact`, `/projects/<slug>.html`) — never relative, never prefixed with `/theater/`.
- The exit-beat `<ul>` lists the eight projects in drive order: Leon's Budget (`budget-app`), Nom Nom's (`nom-noms`), El Blackjack (`el-blackjack`), The Classic (`classic-golf`), Spead Read (`spead-read`), Media Cloud Web Tools (`media-cloud-web-tools`), Media Cloud Vitals (`media-cloud-vitals`), ShowRunner Digest (`showrunner-digest`). This list is hand-written HTML (it must exist with JS off); DT3's `projects.ts` will carry the same eight and a test will cross-check them.
- Registry: `{ id: 'lot', vh: 1060, adapter: placeholder('Lot') }` — the final length, so the page scrolls as it will when the lot lands.
- Wireframe conformance is part of done: open `docs/wireframes/theater.html` and the built page side by side.
</constraints>

<build_order>

### 1. Tokens
- [ ] Re-value the PALETTE block and add the four theater tokens in `theater/src/styles/tokens.css`.

### 2. Page shell
- [ ] Rewrite `theater/index.html` per the wireframe and `<constraints>`.
- [ ] Restyle `theater/src/styles/global.css` to the wireframe (chrome, beats, buttons, exit list, footer); remove demo-only rules.
- [ ] Set the registry's placeholder scene to `vh: 1060`.

### 3. Prove
- [ ] Unit tests, typecheck, lint, build; then `rebuild-restart` and compare with the wireframe.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
pnpm -C theater typecheck && pnpm -C theater lint && pnpm -C theater test && pnpm -C theater build
grep -c ':host,' theater/src/styles/tokens.css            # unchanged from DT0 (every block still :host, :root)
grep -nE 'var\(--[a-z0-9-]+, *#[0-9a-fA-F]{3}' theater/src/styles/*.css ; echo "exit=$?"   # no hex fallbacks → no output, exit=1 (the vendored global.css header mentions `var(--token, #hex)` in prose; `h` is not a hex digit, so it is not matched)
grep -c 'href="/projects/' theater/index.html             # 8
grep -n 'href="\.\./\|href="/theater/' theater/index.html ; echo "exit=$?"   # no relative / self-prefixed links → exit=1
grep -n 'data-sds-progress-bar\|data-sds-progress-percent\|data-sds-persistent\|data-scene-slot="lot"\|id="exit"' theater/index.html   # all five present
docker compose build && docker compose up -d --force-recreate
curl -s http://portfolio-site.localhost/theater/ | grep -c 'G-N6J50LX4EY'   # 1
```

Manual: open `http://portfolio-site.localhost/theater/` beside `docs/wireframes/theater.html`
— chrome, hero beat, exit beat and footer match in structure, copy, fonts and palette; the
placeholder scene sits between the beats and the page scrolls ~11 screens; Tab's first
stop is the skip link and activating it lands focus on the exit beat.

Expected: all greps as noted; unit suite green; site palette visible on the built page.
</verification>

<commit>
```
feat(dt2): theater page shell and portfolio palette
```
</commit>

## Done

After this phase, portfolio_site shows at `/theater/` a page in the site's own palette with
the approved hero and exit beats, a skip link, the no-JS project list, and a placeholder
lot of the final scroll length.

Paste Phase DT3.

---

## Phase DT3: Projects registry, lot geometry, lot adapter, conformance test

<task>
You are executing **Phase DT3 of the Drive-In Theater Roadmap** — building the lot: the
eight-project data file, the pure geometry that places screens and decides which one is
active, the GSAP-driven scene that drives past them, and the conformance test that proves
it scrubs backwards exactly.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md` and `react-frontend.md`; `theater/skills/rules-index/SKILL.md` (`SDS-001`–`SDS-006` are load-bearing here)
3. `.claude/skills/rebuild-restart/SKILL.md`
4. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- `theater/` page shell in the site palette (DT2) with one scene slot
  `data-scene-slot="lot"` and registry entry `{ id: 'lot', vh: 1060, adapter: placeholder('Lot') }`
  in `theater/src/scenes/registry.ts`. Tokens include `--sds-marquee`, `--sds-asphalt`,
  `--sds-asphalt-far`, `--sds-gradient-accent`.
- `theater/src/adapters/gsap-timeline.ts`: `gsapTimeline(build: GsapTimelineBuilder): AdapterFactory`
  where `build({ container, gsap })` returns a paused GSAP timeline the adapter scrubs by
  `timeline.progress()`; the adapter instance implements `GsapTimelineAdapter` with
  `snapshot(): GsapTimelineSnapshot` (`progress`, `timelineProgress`, `ready`, `failed`,
  `width`, `height`). It dynamically imports `gsap` on `load()`; the factory carries no
  `assets` manifest. `theater/src/adapters/gsap-timeline.contract.test.ts` shows how the
  contract kit is run against it in jsdom.
- `theater/src/adapters/adapter-contract.ts`: `adapterContract(factory, { name, observe })`
  registers the Vitest suite; `observe` must return a plain comparable snapshot (the kit
  rejects a live node and reports `visual-state-unverified` when `observe` is omitted).
  `CONTRACT_CHECKS` names every check.
- `theater/src/loader/asset-loader.ts`: `sharedAssetLoader.add({ url, kind: 'image' })`
  returns a `Promise<HTMLImageElement>` (fetched once per URL), `release(url)` forgets it;
  `onProgress(cb)` subscribes. `AssetSpec` kinds are `'image' | 'json' | 'binary'` — there
  is no video kind.
- `AnimationAdapter.eager` (instance property) is what the loading ring waits on; the
  engine builds the first registry scene's adapter to read it (`theater/src/engine/engine.ts`,
  `gateScene`). `AdapterFactory.assets` is the manifest the engine warms for non-eager
  scenes.
- The approved wireframe `docs/wireframes/theater.html` fixes the composition: perspective
  900px with origin `50% 42%`; ground line at 58% of the viewport height; screen *i* at
  `translate3d(x, 0, z) rotateY(yaw)` with `z = -(i+1)·800px`, `x = ∓480px` alternating
  (screen 0 on the left), `yaw = ±18°` toward the lane; a screen is a column (520px wide
  surface at 16:10, then a 96px base with two posts and a 320px marquee) whose bottom sits
  on the ground line; the lit screen has `filter: brightness(1)` and a marquee in
  `--sds-marquee` with a faint glow, unlit screens `brightness(0.35)` and a dull marquee.
- The eight projects, in drive order, with their site pages and posters (all files exist):
  `budget-app` "Leon's Budget", `nom-noms` "Nom Nom's", `el-blackjack` "El Blackjack",
  `classic-golf` "The Classic", `spead-read` "Spead Read", `media-cloud-web-tools`
  "Media Cloud Web Tools", `media-cloud-vitals` "Media Cloud Vitals", `showrunner-digest`
  "ShowRunner Digest" — pages at `projects/<slug>.html`, posters at `images/<slug>/01.png`.
  **Seven posters are real screenshots (1280×794 up to 2056×1071; `classic-golf` is a
  556×1003 portrait); `images/el-blackjack/01.png` is a 68-byte 1×1 placeholder** — it
  decodes successfully, so the loader counts it as loaded and the ring reaches 100% over
  a blank screen. The header Prerequisites require Evan to replace it before this phase;
  the test below refuses to pass until he has.

**Out of scope:** `<video>` elements and playback (DT4) — this phase's screens show the
poster `<img>` only; keyboard drive-by-focus and the narrow layout (DT5).

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier and the skeleton's law for this phase:
- **SDS-001** — `seek` is absolute: the lot's Z and every lit state are functions of progress via the GSAP timeline; nothing accumulates.
- **SDS-002** — everything the lot creates lives inside the container it was handed; the starfield is CSS on the stage element, not document-level DOM.
- **SDS-003** — `lotScene(projects)` passes `adapterContract()` with a discriminating `observe`.
- **SDS-004** — `seek` reads no layout; sizes come from `resize`.
- **SDS-006** — the eight posters are declared through `sharedAssetLoader` in `load()` and released in `destroy()`; no bare `new Image()`/`fetch`.
- **EVO-UNI-057** — `SPACING`, `OFFSET`, `YAW_DEG`, `GROUND_LINE`, `VH_PER_SCREEN` live once, in `theater/src/lot/geometry.ts`; the registry imports `VH_PER_SCREEN`.
- **EVO-UNI-109** — geometry tests assert literal expected values for the real constants (e.g. screen 2's `z` is `-2400`), never `-(i+1)*SPACING` recomputed in the test.
- **EVO-UNI-017 / EVO-UNI-018** — behaviour with committed expected values.
- **EVO-UNI-053** — a project with a missing poster still renders a screen (dark surface, marquee lit as normal); never a blank hole in the lot.
</rules>

<reference_material>
Read these files before writing any code:
- `theater/src/adapters/gsap-timeline.ts` — the builder contract and `snapshot()`; **do not copy** the skeleton's demo timeline from the old registry (bars rotating) — the lot's timeline is described below.
- `theater/src/adapters/gsap-timeline.contract.test.ts` and `theater/src/adapters/placeholder.contract.test.ts` (or `placeholder.test.ts`, whichever holds the contract run) — how `adapterContract` is invoked with `observe`.
- `theater/src/adapters/adapter-contract.ts` — the `observeNotDiscriminating` check: the snapshot must differ across the kit's sweep points, which `lotZ` guarantees.
- `theater/src/loader/asset-loader.ts` — `add`, `release`, and the failure semantics (a 404 settles, never rejects).
- `docs/wireframes/theater.html` — the `.lot`, `.lot__world`, `.lot__ground`, `.screen*` CSS (transcribe into `global.css` with `sds-` prefixes; keep the three narrow-viewport overrides for DT5 to finish).
- `theater/index.html` — the hand-written exit-beat `<ul>`; the cross-check test below reads it.
</reference_material>

<constraints>
- **`theater/src/projects.ts`** exports `interface TheaterProject { slug: string; name: string; href: string; poster: string; clip: string }` and `const projects: readonly TheaterProject[]` — eight entries, `href = '/projects/<slug>.html'`, `poster = '/images/<slug>/01.png'`, `clip = '/images/<slug>/demo.mp4'`. Site-absolute; never built from `import.meta.env.BASE_URL` (these are not theater assets).
- **`theater/src/lot/geometry.ts`** (pure, no DOM): `SPACING = 800`, `OFFSET = 480`, `YAW_DEG = 18`, `GROUND_LINE = 0.58`, `VH_PER_SCREEN = 120`. (The approved wireframe's static `nth-of-type` transforms read `z = -600, -1400, -2200, …` — that is placement `z` **plus** a depicted `lotZ` of 200px, the "just past the gate" frame its header comment describes; the formulas below are the source of truth and the literal test values come from them, not from the wireframe's CSS.) `screenPlacement(i: number): { x: number; z: number; yaw: number }` (even `i` → `x = -OFFSET`, `yaw = +YAW_DEG`; odd → `+OFFSET`, `-YAW_DEG`; `z = -(i + 1) * SPACING`); `lotZ(progress: number, count: number): number` = `clamp01(progress) * SPACING * (count + 1)` (the camera starts at the gate and ends one spacing past the last screen); `activeScreen(progress: number, count: number): number | null` = the `i` with `i * SPACING <= lotZ < (i + 1) * SPACING` when `0 <= i < count`, else `null` — bands are contiguous and disjoint, and the last screen goes inactive at exactly `lotZ = count * SPACING`; `screenProgress(i: number, count: number): number` = the progress at which screen `i`'s band begins (`i * SPACING / (SPACING * (count + 1))`) — DT5 consumes this by exact name.
- **`theater/src/lot/build-lot.ts`** exports `buildLot(projects: readonly TheaterProject[]): GsapTimelineBuilder`. Inside the container: `.sds-lot` stage (perspective, CSS starfield background), `.sds-lot__world` (preserve-3d), `.sds-lot__ground`, and one `<a class="sds-screen" href data-screen-index>` per project containing `.sds-screen__surface` (holding an `<img>` for the poster, `alt=""`), `.sds-screen__base` with two `.sds-screen__post`s and `.sds-screen__marquee` (the project name — this text is the link's accessible name). Placement from `screenPlacement(i)` via inline `transform`. The timeline: one tween on `.sds-lot__world` from `translateZ(0)` to `translateZ(lotZ(1, n))` spanning the whole timeline; per screen, a lit tween (`filter` brightness 0.35→1 and marquee colour/glow via a `--sds-screen-lit` custom property 0→1) that begins at `screenProgress(i, n)` and completes over 15% of the band, and an unlit tween back that begins when the band ends and completes over 5% of a band. Durations are relative weights only.
- **`theater/src/lot/lot-scene.ts`** exports `lotScene(projects: readonly TheaterProject[]): AdapterFactory` and `interface LotAdapter extends AnimationAdapter { snapshot(): LotSnapshot }` with `LotSnapshot = { progress: number; lotZ: number; activeScreen: number | null; timelineProgress: number | null; loadedPosters: number; worldTransform: string; lit: number[] }` — `worldTransform` is the world element's **inline** `style.transform` as GSAP wrote it and `lit` is each screen's **inline** `--sds-screen-lit` value (`style.getPropertyValue`, rounded to 2 dp) in drive order. Both are reads of styles the timeline itself set, not layout (`SDS-004`), and they make the snapshot observe what is *rendered*, not what was *computed*: a tween aimed at the wrong element or a misspelled property now fails the contract's discrimination and order-independence checks instead of passing on the pure values alone. The factory builds the inner `gsapTimeline(buildLot(projects))` adapter and wraps it: `load()` first declares every poster via `sharedAssetLoader.add({ url, kind: 'image' })`, reporting combined progress (posters and the inner load) through `onProgress`, and swaps a poster that settled without bytes **or decoded smaller than 64×64** (`naturalWidth`/`naturalHeight` on the element the loader resolves — a placeholder is "valid but wrong", EVO-UNI-053) for a dark surface marked `data-poster="missing"`; `seek(p)` forwards to the inner adapter; `destroy()` releases the posters then destroys the inner adapter; `eager` is `true`. Do **not** attach a `factory.assets` manifest: the engine's `warmDeferredAssets` skips eager scenes, and the lot is the only scene, so a manifest would never be read — the posters gate the reveal through `load()` alone. `activeScreen` in the snapshot is computed from progress with `geometry.activeScreen`. DT4 adds the video side effect to this wrapper's `seek` — leave a clearly named seam (`onActiveScreenChange(prev, next)`) for it.
- **Registry:** `{ id: 'lot', vh: 100 + VH_PER_SCREEN * projects.length, adapter: lotScene(projects) }`.
- **Tests:** `theater/src/projects.test.ts` — slugs unique; for every project `../projects/<slug>.html` and `../images/<slug>/01.png` exist (Node `fs`, resolved from `import.meta.dirname`) **and the poster's PNG header declares width ≥ 640 and height ≥ 400 or width ≥ 400 and height ≥ 640** (read bytes 16–23 of the file: big-endian width then height after the 8-byte signature and the IHDR length/type — no image library; a 1×1 placeholder fails); and the eight `href`s equal, in order, the `href`s inside `theater/index.html`'s exit-beat `<ul>` (read the file, extract with a regex anchored on `<li><a href="`) — the hand-written no-JS list and the registry cannot drift. `theater/src/lot/geometry.test.ts` — literal placements for `i = 0, 1, 2, 7`; `lotZ` at 0, 0.5, 1 for `count = 8`; `activeScreen` at band boundaries (`0` at progress 0, `null` at progress 1, the exact progress where screen 0 hands over to screen 1, out-of-range progress clamps). `theater/src/lot/lot-scene.contract.test.ts` — `adapterContract(lotScene(projects), { name: 'lot', observe: (a) => (a as LotAdapter).snapshot() })`. `theater/src/lot/build-lot.test.ts` — build the adapter in jsdom (real `gsap`, as the vendored gsap contract test does), `load()` with the `Image` stub, then seek to the middle of screens 0, 3 and 7's bands forward and back to 3 and 0, asserting after each seek the exact `lit` vector (e.g. `[1,0,0,0,0,0,0,0]` at screen 0's band middle, `[0,0,0,1,0,0,0,0]` at screen 3's) and that `worldTransform` contains a `translateZ`/`translate3d` whose Z increases across the forward seeks and returns to the earlier string exactly on the way back. **jsdom's real `Image` never fires `load` or `error`** (stated in `theater/src/loader/asset-loader.test.ts`'s header), so without help each poster settles only via the loader's real 4 s `STALL_TIMEOUT_MS` — eight of them against Vitest's 5 s default timeout is a hang. Both `lot-scene.contract.test.ts` and (in DT4) `lot-scene.test.ts` must therefore mirror `asset-loader.test.ts`: `vi.stubGlobal('Image', FakeImage)` with a `FakeImage` that settles on demand (copy that test's class into a shared `theater/src/test-helpers/fake-image.ts` rather than duplicating it — EVO-UNI-057), or `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(STALL_TIMEOUT_MS)` around `load()`. With that in place the contract's `load-resolves` check passes as the loader guarantees (a settled-unsuccessful asset resolves, never rejects).
- **CSS** for the lot lives in `theater/src/styles/global.css`, transcribed from the wireframe with `sds-` prefixes and tokens only (`--sds-marquee`, `--sds-asphalt*`, `--sds-text`, etc.). The `--sds-screen-lit` property drives brightness and marquee glow through `calc()`/`color-mix()` or two-state classes toggled by the timeline — either is acceptable; pick one and use it for both surface and marquee.
- `filter: brightness()` on eight surfaces is the known cost centre from DTF; add `will-change: transform` to `.sds-lot__world` only.
</constraints>

<build_order>

### 1. Data and geometry
- [ ] Write `projects.ts` and `projects.test.ts`.
- [ ] Write `lot/geometry.ts` and `lot/geometry.test.ts`.

### 2. The lot
- [ ] Write `lot/build-lot.ts` (DOM + timeline) and the lot CSS in `global.css`.
- [ ] Write `lot/lot-scene.ts` (wrapper: posters via the loader — no factory manifest — `eager`, `snapshot` incl. `worldTransform`/`lit`, the `onActiveScreenChange` seam).
- [ ] Write `lot/lot-scene.contract.test.ts` and `lot/build-lot.test.ts`; make both pass.
- [ ] Point the registry at `lotScene(projects)` with the computed `vh`.

### 3. Prove
- [ ] Typecheck, lint, unit tests, build; `rebuild-restart`; drive the lot in a browser and compare to the wireframe.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
pnpm -C theater typecheck && pnpm -C theater lint && pnpm -C theater test
pnpm -C theater test -- --reporter=verbose 2>&1 | grep -E 'lot|geometry|projects' | head -60   # the four new suites, all ✓
file images/*/01.png | grep -v 'x 1,'                                  # eight real posters (a 1×1 line here means the prerequisite was skipped)
grep -n 'new Image\|fetch(' theater/src/lot/*.ts ; echo "exit=$?"     # SDS-006: exit=1
grep -n 'getBoundingClientRect\|offsetHeight\|offsetWidth' theater/src/lot/*.ts ; echo "exit=$?"   # SDS-004: exit=1
grep -c '/projects/' theater/src/projects.ts                          # 8
pnpm -C theater build
docker compose build && docker compose up -d --force-recreate
curl -s http://portfolio-site.localhost/theater/ | grep -c 'data-scene-slot="lot"'   # 1 (the slot; screens are built by JS)
```

Manual (browser, `http://portfolio-site.localhost/theater/`): the loading ring waits on the
posters and reveals; scrolling drives past eight screens alternating left/right, each
lighting as it becomes the next one ahead and dimming after it passes; scrolling back up
restores the identical frame (`SDS-001`); clicking a screen opens its project page; the
console has no `[sds]` warnings (in particular no `asset settled without its bytes`).
Compare a mid-lot frame with `docs/wireframes/theater.html`.

Expected: all four new suites green alongside the vendored ones; the `file` check lists eight real posters; both `grep … exit=1`
guards print nothing; the lot matches the wireframe.
</verification>

<commit>
```
feat(dt3): the lot — projects registry, geometry, GSAP scene, conformance test
```
</commit>

## Done

After this phase, portfolio_site's `/theater/` drives past eight lit poster screens,
reversibly, each a link to its project page, with the posters gating the reveal.

Paste Phase DT4.

---

## Phase DT4: Video activation band and poster fallback

<task>
You are executing **Phase DT4 of the Drive-In Theater Roadmap** — putting a muted looping
`<video>` on each screen that plays exactly while its screen is the active one and falls
back to the poster when the clip is missing, so the theater is complete before any clip
exists and upgrades one screen at a time.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/react-frontend.md` (Vitest/jsdom rows) and `universal.md`; `theater/skills/rules-index/SKILL.md`
3. `.claude/skills/rebuild-restart/SKILL.md`
4. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- The lot (DT3): `theater/src/lot/build-lot.ts` builds one `<a class="sds-screen"
  data-screen-index>` per project with a `.sds-screen__surface` holding a poster `<img>`;
  `theater/src/lot/lot-scene.ts` exports `lotScene(projects): AdapterFactory` and
  `LotAdapter` with `snapshot(): { progress, lotZ, activeScreen, timelineProgress,
  loadedPosters }`, declares posters through `sharedAssetLoader`, is `eager`, and has an
  `onActiveScreenChange(prev: number | null, next: number | null)` seam called from `seek`
  whenever `geometry.activeScreen(progress, n)` changes. `theater/src/projects.ts` gives
  each project a `clip` path `/images/<slug>/demo.mp4`. **No `demo.mp4` exists yet** for
  any project (DT9 produces them); every screen must therefore take the fallback path
  today.
- `theater/src/lot/lot-scene.contract.test.ts` runs the conformance kit in jsdom. jsdom's
  `HTMLMediaElement.prototype.play()` returns `undefined` and logs "not implemented";
  `pause()` is a no-op. `theater/src/test-setup.ts` stubs `matchMedia` and `ResizeObserver`.
- DTF's decision row (bottom of this roadmap, "Decision records") says `GO` or
  `GO-REDUCED`. Under `GO-REDUCED`, only the active screen may hold a `src` — DTF measured
  that exact variant (`reduced`) at ≥ 50 fps before proceeding, so this is a mitigation with
  a number behind it.

**Out of scope:** reduced-motion suppression of video (DT5), keyboard focus (DT5).

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier and the skeleton's law for this phase:
- **SDS-001** — which videos play is a pure function of progress (`activeScreen`); the side effect sets state to "playing iff active" idempotently, never toggles.
- **SDS-006 (recorded departure)** — videos are deliberately *not* declared to the asset loader: a stream is never "loaded", `preload="none"` fetches nothing until activation, and gating the reveal on eight clips is the spinner-forever case the ring exists to prevent. State this departure in a comment at the `<video>` creation site, citing `SDS-006`.
- **EVO-FE-064** — mock `HTMLMediaElement.prototype.play` (returning a resolved Promise) and `pause` in `test-setup.ts` as a new numbered item in its header list (renumber as needed — DT0 may have removed the canvas item) so the contract test and the activation test do not hit jsdom's "not implemented" path.
- **EVO-UNI-053** — a missing clip is an explicit honest state: the poster stays lit; no broken-media icon, no blank.
- **EVO-UNI-011** — no autoplay-on-hover, no sound, no controls.
</rules>

<reference_material>
Read these files before writing any code:
- `theater/src/lot/lot-scene.ts` — the `onActiveScreenChange` seam and `destroy()`; the video side effect lands in the seam, and `destroy()` must pause and detach every video.
- `theater/src/lot/build-lot.ts` — the surface markup to extend.
- `theater/src/test-setup.ts` — where the media-element mocks go (a new numbered item in its header list).
- `docs/roadmaps/drive-in-theater-roadmap.md` "Decision records" — `GO` vs `GO-REDUCED` decides the `src` strategy below.
</reference_material>

<constraints>
- Each surface gains a `<video muted loop playsinline preload="none" aria-hidden="true">` layered over the poster `<img>`, with `poster` set to the same poster URL and a single `<source src={clip} type="video/mp4">`. Under **`GO-REDUCED`** the `<source>` is attached only while the screen is active and removed (with `load()` to release the decoder) when it goes inactive; under **`GO`** the source is present from construction and `preload="none"` does the deferral.
- Activation: in `onActiveScreenChange(prev, next)`, pause `prev`'s video (if any) and call `play()` on `next`'s (if any), catching the returned promise's rejection silently (autoplay policy or a missing file both reject — neither is an error here). A repeated call with the same `next` must not restart playback.
- Fallback: listen for the `error` event on each `<video>` (and on its `<source>` — Chrome fires it on the source element when the last candidate fails); on error, remove the `<video>` and mark the screen `data-clip="missing"` so the poster `<img>` is what shows. The marquee and lit state are unaffected.
- The `LotSnapshot` gains `playing: number | null` (the index whose video was last told to play, or `null`) so the contract kit's order-independence check covers the side effect.
- New test `theater/src/lot/lot-scene.test.ts`: construct the adapter in jsdom, spy on the mocked `play`/`pause`, seek through three consecutive bands forward then backward, and assert the exact sequence of play/pause calls (each screen played once on entry, paused once on exit, and the same on the way back); assert that dispatching `error` on screen 2's video removes it and sets `data-clip="missing"`; assert `destroy()` pauses everything and leaves no `<video>` with a `src`.
- `destroy()`: pause and remove `src` from every video before the inner adapter is destroyed, so no decoder outlives the scene when it unmounts and remounts (the engine does this many times per visit).
</constraints>

<build_order>

### 1. Test setup
- [ ] Add the `HTMLMediaElement` `play`/`pause` mocks to `theater/src/test-setup.ts` (new header item).

### 2. Videos
- [ ] Extend `build-lot.ts`'s surface with the `<video>` per `<constraints>` (branching on the DTF record for the `src` strategy).
- [ ] Implement activation, fallback and teardown in `lot-scene.ts`; extend `LotSnapshot` with `playing`.

### 3. Tests and proof
- [ ] Write `lot-scene.test.ts`; keep `lot-scene.contract.test.ts` green.
- [ ] Typecheck, lint, unit tests, build; `rebuild-restart`; confirm in a browser that every screen shows its poster (no clips exist) with no broken-media UI, and that the console shows only the expected 404s for `demo.mp4`.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
pnpm -C theater typecheck && pnpm -C theater lint && pnpm -C theater test
grep -n 'SDS-006' theater/src/lot/build-lot.ts theater/src/lot/lot-scene.ts   # the recorded departure comment, ≥ 1 hit
grep -n 'preload="none"\|preload = .none\|preload.*none' theater/src/lot/build-lot.ts   # ≥ 1
grep -nE "setAttribute\(['\"](controls|autoplay)|\.(controls|autoplay) *= *true" theater/src/lot/build-lot.ts ; echo "exit=$?"   # neither attribute is set (matches the API, not prose) → exit=1
pnpm -C theater build && docker compose build && docker compose up -d --force-recreate
# a synthetic clip proves the play path end to end without waiting for DT9:
ffmpeg -v error -y -f lavfi -i testsrc2=size=960x600:rate=30 -t 4 -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart images/nom-noms/demo.mp4
docker compose build && docker compose up -d --force-recreate
curl -s -o /dev/null -w '%{http_code}\n' http://portfolio-site.localhost/images/nom-noms/demo.mp4   # 200
```

Manual: at `/theater/`, drive to screen 2 (Nom Nom's) — the test pattern plays while it is
the next screen ahead and stops once passed; every other screen holds its poster with no
broken-media icon; drive back and it plays again. Then **delete the synthetic clip**
(`rm images/nom-noms/demo.mp4`) and confirm `git status` shows no `images/` change before
committing — the real clip is DT9's.

Expected: the activation test's exact play/pause sequence passes; the departure comment
exists; neither `controls` nor `autoplay` is set; the synthetic clip plays on approach and is removed
before the commit.
</verification>

<commit>
```
feat(dt4): screens play their clip while active, fall back to the poster when missing
```
</commit>

## Done

After this phase, portfolio_site's screens play a muted looping clip exactly while the
camera approaches them — and, with no clips yet on disk, show their posters cleanly.

Paste Phase DT5.

---

## Phase DT5: Keyboard drive-by-focus, `reducedMotionSteps`, narrow layout

<task>
You are executing **Phase DT5 of the Drive-In Theater Roadmap** — making the lot work for
keyboard users (Tab drives to each screen), reduced-motion users (one keyframe per
screen, no video), and narrow viewports (single-file lot), so a direct link to `/theater/`
is never a dead end for anyone.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md`, `tooling.md`, `react-frontend.md`; `theater/skills/rules-index/SKILL.md`
3. `.claude/skills/rebuild-restart/SKILL.md`
4. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- The lot with videos (DT3/DT4). `theater/src/lot/geometry.ts` exports
  `screenProgress(i, count)` — the progress at which screen `i`'s band begins — plus
  `SPACING`, `OFFSET`, `YAW_DEG`, `screenPlacement`, `lotZ`, `activeScreen`. Screens are
  `<a class="sds-screen" data-screen-index="i">` inside the scene's pinned container.
  `lot-scene.ts` plays a screen's video from `onActiveScreenChange`.
- `theater/src/engine/engine.ts`: `export const REDUCED_MOTION_STEPS = 4` (a module
  constant); inside the frame loop, when `matchMedia('(prefers-reduced-motion: reduce)')`
  matches, the progress handed to `seek` is `quantiseProgress(clamp01(raw), REDUCED_MOTION_STEPS)`.
  `EngineOptions` = `{ host, scenes, persistentLayer?, loadingRing?, lenis? }`; `Engine`
  = `{ start(), stop(), destroy() }`. The engine holds its `MountedScene[]` privately;
  each `MountedScene` has `def`, `spacer`, `pin`, and cached `metrics: { top, length }`
  (`top` = document offset of the spacer, `length` = pinned duration) refreshed by
  `measure()` on start and on debounced resize. When `lenis` is on (default), the engine
  owns a `Lenis` instance (`autoRaf: false`, ticked from the engine's rAF).
- `theater/src/main.ts` creates the engine and starts it; `theater/index.html`'s exit beat
  is `#exit` with `tabindex="-1"`.
- `theater/src/styles/global.css` carries the lot CSS transcribed from the wireframe,
  including the wireframe's `@media (max-width: 767px)` overrides (perspective 600px,
  300px screens, `x = 0` placements) as a starting point — those override inline
  transforms only if the placement is expressed as custom properties, which DT3 may not
  have done.
- The engine's reduced-motion e2e in the skeleton asserted stepped motion at 4 steps; the
  vendored unit tests in `theater/src/engine/engine.test.ts` assert the default.

**Out of scope:** the Playwright suite (DT6) — this phase proves itself with unit tests
and a manual check.

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier and the skeleton's law for this phase:
- **EVO-TOOL-121** — the `EngineOptions.reducedMotionSteps` addition, its use in the frame loop, and the theater's call site land in one commit; `tsc --noEmit` gates the build.
- **EVO-UNI-014** — grep every `createEngine(` call and every `REDUCED_MOTION_STEPS` reference (tests included) before changing either.
- **SDS-004 / SDS-005** — the focus→scroll mapping uses the engine's *cached* `metrics`, reads no layout, and adds no `scroll` listener; it *writes* scroll position, which no rule forbids, through the engine so Lenis stays in charge of the motion.
- **EVO-FE-279** — jsdom's `scrollHeight`/`clientHeight` are 0: test the new engine method through `createFakeScrollSource` and a fake mounted scene, never through real layout.
- **EVO-FE-219** — if the focus handler uses `scrollIntoView`, mock it in `test-setup.ts`; the design below avoids it.
- **EVO-UNI-017 / EVO-UNI-018** — assert the exact target `scrollY` for known metrics.
</rules>

<reference_material>
Read these files before writing any code:
- `theater/src/engine/engine.ts` — the `Engine` interface, `SceneState`, the reduced-motion branch in `update()`, and where the Lenis instance lives; the two additions below go here.
- `theater/src/engine/engine.test.ts` — the existing reduced-motion tests (they pin 4 steps by default and must stay green) and the fake-host pattern for testing the engine without a browser.
- `theater/src/engine/mount.ts` — `MountedScene.metrics` semantics (`top`, `length`), already measured.
- `theater/src/lot/geometry.ts` — `screenProgress` and `OFFSET`.
- `theater/src/main.ts` — where the `focusin` wiring goes (page-level behaviour, not adapter behaviour: the adapter must not know about the engine).
</reference_material>

<constraints>
- **Engine contract (consumed by `main.ts` by exact name):** `EngineOptions.reducedMotionSteps?: number` (default `REDUCED_MOTION_STEPS`, i.e. 4; the constant stays exported); and `Engine.scrollToScene(sceneId: string, progress: number): boolean` (not `scrollToSceneProgress` — the vendored `theater/e2e/helpers/app.ts` already exports an unrelated Playwright helper of that name at line ~121, and EVO-UNI-014's grep would surface the collision) — computes `metrics.top + clamp01(progress) * metrics.length` for the mounted scene with that id from its cached metrics, scrolls the page there (through the Lenis instance's `scrollTo` when Lenis is on, else `window.scrollTo`), and returns `false` without scrolling if no such scene is mounted or the engine has not started. Under reduced motion the scroll is instant (Lenis already forces `lerp` 1; the `window.scrollTo` branch passes `behavior: 'auto'`).
- **Theater wiring (`main.ts`):** pass `reducedMotionSteps: projects.length + 1`; add one `focusin` listener on the mount root that, when the target is inside a `.sds-screen`, reads its `data-screen-index` and calls `engine.scrollToScene('lot', screenProgress(i, projects.length) + BAND_SETTLE)` where `BAND_SETTLE` is a small fraction (`0.02` of total progress) into the band so the screen is unambiguously the active one. Focus from a *mouse click* must not trigger the scroll (the visitor is already there): guard with `:focus-visible` (`target.matches(':focus-visible')`).
- **Reduced motion, video:** in `lot-scene.ts`, when `matchMedia('(prefers-reduced-motion: reduce)').matches` at activation time, do not call `play()` — the poster holds. Evaluate the media query at each activation (the preference can change mid-session), reading it through the same `matchMedia` the engine uses (`REDUCED_MOTION_QUERY` is exported from `engine.ts`; import it — EVO-UNI-057).
- **Narrow layout:** express each screen's placement as custom properties on the `.sds-screen` element (`--sds-screen-x`, `--sds-screen-z`, `--sds-screen-yaw`) set from `screenPlacement(i)`, with the `transform` in CSS reading them — so the `< 768px` media query in `global.css` can override `--sds-screen-x: 0` and `--sds-screen-yaw: 0deg` and shrink the surface to 300px without JavaScript knowing the breakpoint. The 767px breakpoint matches `assets/css/styles.css` line 1033.
- Tests: `engine.test.ts` gains (a) `reducedMotionSteps: 9` produces the ten expected quantised values across a sweep and the default still produces five, and (b) `scrollToScene` returns `false` before `start()` and for an unknown id, and after `start()` scrolls a fake window/Lenis to exactly `top + progress * length` for a scene with known fake metrics. `lot-scene.test.ts` gains a reduced-motion case: with the `matchMedia` stub set to match, activation calls `pause` on the previous screen but never `play`.
- Do not move the `focusin` logic into the adapter; the adapter has no engine reference by design (`SDS-002` in spirit — it owns its container, not the page).
</constraints>

<build_order>

### 1. Engine additions
- [ ] Add `reducedMotionSteps` to `EngineOptions` and use it in the frame loop; add `scrollToScene` to `Engine`; update the engine tests.

### 2. Theater wiring
- [ ] Wire `reducedMotionSteps` and the `focusin` handler in `main.ts`.
- [ ] Suppress `play()` under reduced motion in `lot-scene.ts`; add the test.

### 3. Narrow layout
- [ ] Switch screen placement to custom properties; finish the `< 768px` overrides in `global.css`.

### 4. Prove
- [ ] Typecheck, lint, unit tests, build; `rebuild-restart`; manual checks.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
grep -rn 'createEngine(' theater/src | grep -v test          # exactly one call site (main.ts) — EVO-UNI-014
pnpm -C theater typecheck && pnpm -C theater lint && pnpm -C theater test
grep -n 'reducedMotionSteps' theater/src/engine/engine.ts theater/src/main.ts   # option declared, used, and passed
grep -n 'scrollToScene(' theater/src/engine/engine.ts theater/src/main.ts # method declared and called
grep -n 'scrollIntoView' theater/src/main.ts theater/src/lot/*.ts ; echo "exit=$?"   # not used → exit=1
grep -n 'max-width: 767px' theater/src/styles/global.css      # the narrow block exists
pnpm -C theater build && docker compose build && docker compose up -d --force-recreate
```

Manual (browser, `/theater/`): from the top, Tab → skip link, Tab → screen 1: the page
drives to screen 1 and it lights; Tab again → screen 2, and so on; Enter opens the
project. Enable "reduce motion" in the OS: scrolling snaps the camera screen to screen
(nine positions), and no video plays even where a clip exists. Narrow the window below
768px: screens line up single-file down the lane at 300px and the page still drives.

Expected: the new engine tests pass with the default reduced-motion tests untouched;
`scrollIntoView` unused; the three manual behaviours hold.
</verification>

<commit>
```
feat(dt5): keyboard drive-by-focus, reducedMotionSteps engine option, narrow single-file lot
```
</commit>

## Done

After this phase, portfolio_site's theater can be driven by Tab, snaps one screen per
keyframe under reduced motion with no video, and lays out single-file on a phone.

Paste Phase DT6.

---

## Phase DT6: Playwright suite for the theater

<task>
You are executing **Phase DT6 of the Drive-In Theater Roadmap** — writing the browser
suite that proves the theater in a real Chromium: reveal, eight screens, forward and
backward scrubbing, click-through, reduced motion, and keyboard driving — the regression
net for every later change.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/tooling.md` (Playwright rows) and `universal.md`; `theater/skills/rules-index/SKILL.md`
3. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- The complete theater (DT0–DT5) at `theater/`: `pnpm -C theater build` then
  `pnpm -C theater preview -- --port 4173 --strictPort` serves the page at
  `http://localhost:4173/theater/` with `/images/*` and `/projects/*` served from the
  repo root by the `siteAssets()` Vite plugin (`theater/vite-site-assets.ts`).
  `theater/playwright.config.ts` (vendored in DT0): `testDir: 'e2e'`, `retries: 0`,
  `trace: 'retain-on-first-failure'`, `baseURL http://localhost:4173`, webServer
  `pnpm build && pnpm preview -- --port 4173 --strictPort`, `reuseExistingServer: false`,
  chromium only. `theater/e2e/helpers/app.ts` (vendored): `LOADER`, `LOADER_REVEALED_CLASS`,
  `SKIP_LINK`, `PROGRESS_READOUT` selectors, a `scrollTo(page, y)` that waits for the
  scroll position to settle across frames (never a fixed timeout), and reveal waiting
  with a 20 s timeout. **There are no spec files yet** — DT0 dropped the skeleton's six.
- Page facts: skip link `.sds-skip` → `#exit`; chrome readout `[data-sds-progress-percent]`;
  one scene `lot` (`[data-scene="lot"]` spacer, `vh: 1060`); screens `a.sds-screen[data-screen-index]`
  with `href="/projects/<slug>.html"` in drive order (`budget-app`, `nom-noms`, `el-blackjack`,
  `classic-golf`, `spead-read`, `media-cloud-web-tools`, `media-cloud-vitals`,
  `showrunner-digest`); the active screen's video plays; `LotAdapter.snapshot()` reports
  `{ progress, lotZ, activeScreen, playing, … }` but is not exposed on `window`. Screen
  placement is via `--sds-screen-x/z/yaw` custom properties; `.sds-lot__world`'s
  `transform` carries the drive (`translateZ`).
- `theater/src/lot/geometry.ts`: `screenProgress(i, 8)`, `SPACING = 800`, `lotZ`.
- Host: Chromium for Playwright must be installed once (`pnpm -C theater exec playwright install chromium`); the machine already has a `~/.cache/ms-playwright/` revision from the skeleton, which may or may not match this `@playwright/test` version.

**Out of scope:** the hero CTA (DT7); any change to the theater's behaviour — a failing
spec here is a finding for the phase that owns the behaviour, unless it is the spec that is wrong.

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier for this phase:
- **EVO-TOOL-071** — wait for outcomes (`expect(locator).toHaveClass`, `toHaveAttribute`, settled scroll), never `waitForTimeout`; reuse the vendored `scrollTo` helper.
- **EVO-TOOL-082** — `retries: 0` with `trace: 'retain-on-first-failure'` (already configured; do not change to `on-first-retry`).
- **EVO-TOOL-070** — the project's own `@playwright/test`; no throwaway installs.
- **EVO-TOOL-056 / EVO-TOOL-086 / EVO-TOOL-087** — Chromium launch needs OS libs; `playwright install` can hang silently — never retry it blindly; the cache is keyed by revision.
- **EVO-UNI-061** — each spec is shown to fail once against a broken condition (the verification block does this for two of them).
- **EVO-UNI-017** — assert observable behaviour (computed transforms, `paused`, focus, URL), not internals; nothing new is exposed on `window` for the tests.
</rules>

<reference_material>
Read these files before writing any code:
- `theater/e2e/helpers/app.ts` — the settle-based `scrollTo` and the reveal helpers; extend it with the theater's selectors rather than duplicating them in each spec.
- `theater/playwright.config.ts` — confirm the webServer command and port.
- `/home/evan/EVOsystem/scroll-driven-skeleton/e2e/scrubbing.spec.ts`, `reduced-motion.spec.ts`, `keyboard.spec.ts` — the *shape* of a spec against this engine (how a reveal is awaited, how reduced motion is emulated with `page.emulateMedia({ reducedMotion: 'reduce' })`, how stepped motion was asserted). **Do not copy their canvas-frame assertions** — there is no canvas here.
- `theater/src/lot/geometry.ts` — to compute target scroll positions for a given screen from `screenProgress` and the spacer's measured top/height.
</reference_material>

<constraints>
- Specs, one file each under `theater/e2e/`:
  - `reveal.spec.ts` — the loading ring appears, reaches its revealed class, and eight `a.sds-screen` exist with the eight `href`s in drive order.
  - `drive.spec.ts` — read `.sds-lot__world`'s computed `transform` (a `matrix3d`) at three increasing scroll positions inside the lot: the Z translation increases monotonically; scroll back to the first position and the matrix equals the first reading exactly (`SDS-001`). Positions are derived from the `[data-scene="lot"]` spacer's bounding box and `screenProgress`, not hardcoded pixels.
  - `active-screen.spec.ts` — **all eight screens, forward then backward**: for `i` in 0..7, scroll to the middle of screen `i`'s band and assert screen `i` is lit (`--sds-screen-lit` computed value `1`) and the other seven are not; then for `i` in 7..0 the same in reverse. Real playback must be proven, and no clip exists until DT9, so the spec makes its own: `test.beforeAll` runs ffmpeg (`testsrc2`, 3 s, 960×600, libx264, `-an`) to write `images/nom-noms/demo.mp4` **only if that file does not already exist**, remembering that it created it; `test.afterAll` deletes it in that case (a DT9-era real clip is left alone). Then: at screen 2's band its `<video>` reports `paused === false` and screen 1's `paused === true`; at screen 3's band screen 2's is paused; **back at screen 2's band it is playing again** (reverse activation); and screen 5 (`spead-read`, no clip) carries `data-clip="missing"` with its poster visible. The spec header states the synthetic-clip mechanism and that a crash mid-run can leave `images/nom-noms/demo.mp4` untracked (`git status` shows it; delete it).
  - `click-through.spec.ts` — **parameterised over all eight** entries of `theater/src/projects.ts` (import it — `e2e/` is in the theater `tsconfig` `include`): scroll to screen `i`'s band, click its `<a>`, assert the URL ends with `href` and the `<title>` contains `name`.
  - `reduced-motion.spec.ts` — under `emulateMedia({ reducedMotion: 'reduce' })`, sweep the lot in 40 evenly spaced scroll positions and collect the distinct Z translations of `.sds-lot__world`'s computed `matrix3d`; assert the set equals `{ lotZ(k / 9, 8) : k = 0..9 }` within ±1 px (ten values — `reducedMotionSteps` is 9, from `projects.length + 1`), and that no `<video>` is unpaused at any sampled position.
  - `keyboard.spec.ts` — Tab from the top reaches the skip link first; activating it moves focus to `#exit`; reload, then Tab past the skip link **through all eight screens**, asserting after each Tab that the focused element is screen `i`, that `scrollY` is strictly greater than after the previous Tab, and that screen `i` is lit.
- Extend `theater/e2e/helpers/app.ts` with `SCREEN = 'a.sds-screen'`, `LOT_WORLD = '.sds-lot__world'`, `LOT_SPACER = '[data-scene="lot"]'`, `scrollToScreen(page, i)` built on the existing `scrollTo`, and `worldZ(page)` that parses the Z translation out of `LOT_WORLD`'s computed `matrix3d`.
- **Production-parity smoke**, in `theater/e2e/nginx-parity.sh` (plain bash, not Playwright): against `http://portfolio-site.localhost` after `rebuild-restart`, assert `/theater/` 200, `/theater` 301→`/theater/`, `/theater/nope` 404, one hashed `/theater/assets/*.js` from `theater/dist/index.html` 200 with a JavaScript content type, `/images/nom-noms/01.png` 200 `image/png`, `/projects/nom-noms.html` 200. This is what catches a URL that works under `vite preview`'s SPA fallback and 404s under nginx; the Playwright suite deliberately stays on `vite preview`.
- Chromium only, as configured; the `## Done` claim below is scoped to that.
- `theater/package.json` `test:e2e` stays `playwright test`; add a root script `theater:e2e`.
- If `playwright install chromium` is needed, run it once and confirm `pnpm -C theater exec playwright --version` matches the cached revision before blaming a spec (EVO-TOOL-087).
</constraints>

<build_order>

### 1. Helpers
- [ ] Extend `e2e/helpers/app.ts` with the theater selectors and `scrollToScreen`.

### 2. Specs
- [ ] Write the six spec files per `<constraints>`.
- [ ] Add the root `theater:e2e` script.

### 3. Prove and falsify
- [ ] Run the suite green; run `theater/e2e/nginx-parity.sh` green against the rebuilt image; then run the six deliberate breakages in `<verification>` — one per spec — and confirm each named spec fails; revert.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
pnpm -C theater exec playwright --version
pnpm -C theater typecheck && pnpm -C theater lint && pnpm -C theater test
pnpm -C theater test:e2e                                    # six files, all pass
ls theater/e2e/*.spec.ts | wc -l                            # 6
docker compose build && docker compose up -d --force-recreate && bash theater/e2e/nginx-parity.sh   # every line OK
# Falsify (EVO-UNI-061): one breakage per spec, expect exactly the owning spec to fail, revert.
sed -i 's#/projects/classic-golf.html#/projects/nope.html#' theater/src/projects.ts
pnpm -C theater test:e2e -- click-through ; echo "click-through exit=$?"   # non-zero
git checkout -- theater/src/projects.ts
sed -i 's/reducedMotionSteps: projects.length + 1/reducedMotionSteps: 1/' theater/src/main.ts
pnpm -C theater test:e2e -- reduced-motion ; echo "reduced-motion exit=$?"   # non-zero
git checkout -- theater/src/main.ts
# active-screen: make every screen report inactive
sed -i 's/^export function activeScreen(/export function activeScreen_(/' theater/src/lot/geometry.ts && printf '\nexport function activeScreen(): number | null { return null }\n' >> theater/src/lot/geometry.ts
pnpm -C theater test:e2e -- active-screen ; echo "active-screen exit=$?"   # non-zero
git checkout -- theater/src/lot/geometry.ts
# drive: freeze the world
sed -i 's/^export function lotZ(/export function lotZ_(/' theater/src/lot/geometry.ts && printf '\nexport function lotZ(): number { return 0 }\n' >> theater/src/lot/geometry.ts
pnpm -C theater test:e2e -- drive ; echo "drive exit=$?"   # non-zero
git checkout -- theater/src/lot/geometry.ts
# keyboard: disconnect the focus handler
sed -i "s/addEventListener('focusin'/addEventListener('focusin-disabled'/; s/addEventListener(\"focusin\"/addEventListener(\"focusin-disabled\"/" theater/src/main.ts
pnpm -C theater test:e2e -- keyboard ; echo "keyboard exit=$?"   # non-zero
git checkout -- theater/src/main.ts
# reveal: drop a project
python3 - <<'EOF'
import re
p='theater/src/projects.ts'; t=open(p).read(); open(p,'w').write(re.sub(r"\{[^{}]*showrunner-digest[^{}]*\},?", "", t, count=1))
EOF
pnpm -C theater test:e2e -- reveal ; echo "reveal exit=$?"   # non-zero
git checkout -- theater/src/projects.ts
pnpm -C theater test:e2e                                    # green again
```

Expected: six specs pass; the nginx parity script passes against the rebuilt image; each of
the six deliberate breakages makes the named spec fail; the suite is green after the reverts
and `git status` shows only the new e2e files and the helper/package edits.
</verification>

<commit>
```
test(dt6): playwright suite for the theater — reveal, drive, active screen, click-through, reduced motion, keyboard
```
</commit>

## Done

After this phase, portfolio_site has a Chromium suite that fails when the theater stops
revealing with eight screens, driving forward or restoring its exact position on the way
back, lighting exactly the active screen in either direction, playing and re-playing the
active clip, linking any of the eight screens to its page, snapping to the ten reduced-motion
keyframes, or driving to each screen by Tab — plus a bash smoke that fails when the nginx
image serves the theater's URLs differently from `vite preview`. It does not cover Firefox or
WebKit, touch, or clip production; those remain manual.

Paste Phase DT7.

---

## Phase DT7: Hero CTA on `index.html`

<task>
You are executing **Phase DT7 of the Drive-In Theater Roadmap** — adding the one
homepage change: an "Enter the Drive-In" button in the hero that is hidden on phones and
under reduced motion, so the site finally links to the theater now that it is real.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md` — token rows
3. `.claude/skills/rebuild-restart/SKILL.md`
4. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- `/theater/` is complete and tested (DT0–DT6) and served by the image.
- `index.html` lines 141–144: `<div class="hero__ctas">` holding
  `<a href="#projects" class="btn btn--primary">View Projects</a>` and
  `<a href="#contact" class="btn btn--secondary">Get in Touch</a>`. `assets/css/styles.css`:
  `.hero__ctas` at line 378 (flex, gap 1rem, centred); `.btn`, `.btn--primary`
  (nebula gradient), `.btn--secondary` (purple border) at lines 168–205; existing media
  queries at 470/989 (`prefers-reduced-motion: no-preference`), 1001
  (`prefers-reduced-motion: reduce`), 1013 (`max-width: 1023px`), 1033
  (`max-width: 767px`, where `.hero__ctas` becomes a column at line 1058).
- The approved wireframe `docs/wireframes/index-hero-cta.html` shows the result: three
  buttons — `Enter the Drive-In` (`btn btn--primary hero__cta--theater`, href `/theater/`),
  `View Projects` (`btn btn--secondary`), `Get in Touch` (`btn btn--secondary`) — and the
  two hide rules for `.hero__cta--theater` (`max-width: 767px` and
  `prefers-reduced-motion: reduce`).
- The site's HTML/CSS is Prettier-checked by the pre-commit hook.

**Out of scope:** any other homepage change; project pages; the theater.

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier for this phase:
- **EVO-UNI-001** — the button uses the existing `.btn` classes and tokens; no new colours.
- **EVO-UNI-011** — one button and two hide rules; nothing else on the homepage moves.
- **EVO-UNI-048** — the built hero matches the approved wireframe.
</rules>

<reference_material>
Read these files before writing any code:
- `docs/wireframes/index-hero-cta.html` — the exact markup and the two rules to add (its `<style>` block is the CSS; its `.note` is not).
- `index.html` lines 141–144 and `assets/css/styles.css` lines 168–205, 378–383, 1001–1011, 1033–1062.
</reference_material>

<constraints>
- Markup: insert the theater anchor as the *first* child of `.hero__ctas`; demote `View Projects` to `btn--secondary`. `href="/theater/"` (site-absolute, trailing slash — nginx serves the directory index without a redirect).
- CSS: add the `.hero__cta--theater { display: none; }` rule inside the existing `@media (max-width: 767px)` block (line 1033) and the existing `@media (prefers-reduced-motion: reduce)` block (line 1001) — not new media blocks.
- Run `pnpm format` before committing; the hook will check `index.html` and `styles.css`.
</constraints>

<build_order>

### 1. Markup and CSS
- [ ] Edit `index.html`'s `.hero__ctas` and add the two hide rules to `assets/css/styles.css`.
- [ ] `pnpm format`.

### 2. Prove
- [ ] `rebuild-restart`; compare with the wireframe at desktop width, below 768px, and with reduced motion on.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
pnpm format:check
grep -n 'href="/theater/"' index.html                                       # 1 hit, inside .hero__ctas
grep -c 'hero__cta--theater' index.html                                     # 1
grep -c 'hero__cta--theater' assets/css/styles.css                          # 2 (one per media block)
awk '/@media \(max-width: 767px\)/,/^}/' assets/css/styles.css | grep -c 'hero__cta--theater'          # 1
awk '/@media \(prefers-reduced-motion: reduce\)/,/^}/' assets/css/styles.css | grep -c 'hero__cta--theater'  # 1
awk '/class="hero__ctas"/,/<\/div>/' index.html | grep -c 'btn btn--primary'   # 1 — scoped to the hero: the About section's Resume link (line ~223) is also btn--primary and stays
docker compose build && docker compose up -d --force-recreate
curl -s http://portfolio-site.localhost/ | grep -c 'Enter the Drive-In'     # 1
curl -s -o /dev/null -w '%{http_code}\n' http://portfolio-site.localhost/theater/   # 200
```

Manual: at desktop width the hero shows the three buttons as in
`docs/wireframes/index-hero-cta.html`; below 768px the drive-in button is gone and the
other two stack; with the OS "reduce motion" on, the button is gone at any width.

Expected: the two `awk` counts are both 1 (each hide rule sits in the right existing block); the site links to a 200.
</verification>

<commit>
```
feat(dt7): hero "Enter the Drive-In" CTA, hidden on phones and under reduced motion
```
</commit>

## Done

After this phase, portfolio_site's homepage offers the drive-in to desktop visitors who
have not asked for reduced motion, and shows exactly what it did before to everyone else —
locally. Nothing is public until DT10.

Paste Phase DT10.

---

## Phase DT10: Publish to ghcr, deploy to the droplet, cut over `evanleon.com`

<task>
You are executing **Phase DT10 of the Drive-In Theater Roadmap** — giving the theater a
path to the public site: a workflow that builds and pushes the image on every push to
`main` and deploys it to the droplet, a rollback that is one command, and Evan's recorded
decision on moving `evanleon.com` onto the container — because until this phase runs,
nothing built by DT0–DT7 can reach a visitor.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — repo orientation (no `project-context` skill exists here)
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/tooling.md` (Docker, git rows) and `universal.md`; `theater/skills/rules-index/SKILL.md`
3. `.claude/skills/rebuild-restart/SKILL.md`
4. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- The theater is complete, tested and linked from the homepage (DT0–DT7): `docker compose
  build` produces the multi-stage image (Node build stage → nginx) and `docker compose up -d
  --force-recreate` serves it locally at `http://portfolio-site.localhost` behind Traefik on
  `evo-net`. `docker-compose.yml` declares `image: ghcr.io/evan-leon/portfolio-site:latest`,
  `build: .`, `restart: unless-stopped`, and two Traefik routers on
  `Host(portfolio-site.${DOMAIN:-localhost})` — `web` (HTTP) and `websecure` (HTTPS, `le`
  cert resolver, prod only). `.env` holds `DOMAIN=localhost` locally; `.env.example` is committed.
- **There is no `.github/workflows/` directory and nothing pushes the image anywhere** — the
  ghcr image name in the compose file has never been published. **Production `evanleon.com`
  is served directly from the droplet root — not containerised, not on `evo-net`** — per
  `/home/evan/EVOsystem/infra/domain-registry.md` ("Portfolio Site": "prod-ready … but NOT
  cut over") and `/home/evan/EVOsystem/infra/local-deployment/onboard-project.md`
  ("No `.github/workflows/` created — cutover is a separate future decision", 2026-07-23).
  Verified 2026-08-25: `https://evanleon.com/` is 200 behind Cloudflare, `/theater/` is 404.
- The fleet's delivery pattern is `/home/evan/EVOsystem/infra/local-deployment/cicd-github-actions.md`:
  a `deploy.yml` on push to `main` that logs in to ghcr with `GITHUB_TOKEN`, builds and
  pushes with `docker/build-push-action`, then `appleboy/ssh-action` runs `docker compose
  pull && docker compose up -d --remove-orphans` in `/opt/<project>` on the droplet, using
  repo secrets `DROPLET_HOST`, `DROPLET_USER`, `DROPLET_SSH_KEY`. jourNOW's
  `/home/evan/EVOsystem/jourNOW/.github/workflows/deploy.yml` is the live precedent.
  Droplet one-time setup is `/home/evan/EVOsystem/infra/local-deployment/onboard-droplet.md`
  (compose file + `.env` in `/opt/<project>`, first `docker compose pull`).
- The theater's build already runs inside the Dockerfile (DT1), so the workflow needs no
  Node step of its own — but the build stage runs `tsc --noEmit`, so a type error fails
  the workflow, which is the point.

**Out of scope:** the clip skill and the clips (DT8, DT9 — every later commit to `main`
deploys automatically once this phase lands, so clips ship as they are committed); any
change to what the image contains.

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier for this phase:
- **EVO-UNI-006** — no secrets in the repo: the droplet host, user and key are GitHub Actions secrets; `.env` stays gitignored.
- **EVO-TOOL-107** — the build stage's corepack relies on the committed `packageManager` pin; the workflow builds the same Dockerfile, so nothing new is needed, but do not "simplify" the pin away.
- **EVO-TOOL-111** — the droplet container has no bind mount; only a pulled image changes what it serves.
- **EVO-TOOL-131** — `restart: unless-stopped` stays on the service.
- **EVO-TOOL-167** — `Up (healthy)` proves nothing about the public route; verification is HTTP through the real hostname.
- **EVO-TOOL-130** — if the public URL fails, prove where: on the droplet, `curl` the container by name on `evo-net` first, then through Traefik, then through Cloudflare.
- **EVO-UNI-090** — the cutover decision and the deploy outcome are written into this roadmap the moment they happen.
</rules>

<reference_material>
Read these files before writing any code:
- `/home/evan/EVOsystem/infra/local-deployment/cicd-github-actions.md` — the `deploy.yml` template and the secrets table; **do not copy its `:latest`-only tag** — see `<constraints>`.
- `/home/evan/EVOsystem/jourNOW/.github/workflows/deploy.yml` — a working instance of the same pattern.
- `/home/evan/EVOsystem/infra/local-deployment/onboard-droplet.md` — the one-time droplet setup this phase's Manual Verification walks Evan through.
- `/home/evan/EVOsystem/infra/domain-registry.md` "Portfolio Site" — the current prod truth; this phase updates it after the cutover decision.
- `docker-compose.yml`, `.env.example`, `Dockerfile` — what the workflow builds and the droplet runs.
- `theater/src/projects.ts` — the poster and clip URLs the post-deploy audit walks.
</reference_material>

<constraints>
- **Workflow** `.github/workflows/deploy.yml`, on push to `main`: checkout; log in to ghcr; build the repo-root Dockerfile once and push **two tags**: `ghcr.io/evan-leon/portfolio-site:latest` and `ghcr.io/evan-leon/portfolio-site:sha-<short sha>` (immutable — the rollback handle); then ssh to the droplet and run, in `/opt/portfolio-site`: `docker compose pull` **then** `docker compose up -d --remove-orphans` — pull first, so a failed pull leaves the running container untouched. `permissions: contents: read, packages: write`. No `ci.yml` is added — the image build *is* the check (typecheck + vite build run inside it).
- **Rollback is one command:** `docker-compose.yml` reads `image: ghcr.io/evan-leon/portfolio-site:${IMAGE_TAG:-latest}` so that on the droplet `IMAGE_TAG=sha-<previous> docker compose up -d` restores the prior image without a rebuild. Locally `IMAGE_TAG` stays unset and `build: .` continues to produce `:latest`.
- **The cutover is a recorded decision, not an assumption.** Two hostnames exist: `portfolio-site.${DOMAIN}` (the compose file's Traefik rule today — with `DOMAIN=evanleon.com` on the droplet that is `portfolio-site.evanleon.com`, which the workflow deploys to unconditionally) and `evanleon.com` itself (today served from the droplet root by something outside Docker). Evan decides `CUTOVER: GO` or `CUTOVER: NO-GO`; on GO the compose routers gain `Host(\`evanleon.com\`) || Host(\`www.evanleon.com\`)` in addition to the subdomain, the non-container server for that host is stopped, and Cloudflare's records point at the droplet (they may already); on NO-GO the theater is public only at `portfolio-site.evanleon.com/theater/` and the `## Done` line says exactly that. Either way the decision row goes into the "Decision records" table.
- **Recovery is written down** in a new `docs/deploy.md` (short): build fails → nothing deployed, fix and push; push fails → nothing deployed; pull fails on the droplet → old container keeps serving; container recreated but the public host fails → `IMAGE_TAG=sha-<previous> docker compose up -d` (previous sha from `docker image ls`), then diagnose per EVO-TOOL-130; cutover regressions → revert the router rule commit and re-run the workflow, or restart the previous root server. Also: the DNS/Cloudflare state before and after cutover, so it can be undone.
- **Post-deploy asset audit** (the owner-side observability this roadmap otherwise lacks — monitoring is deliberately manual/synthetic, and this is the synthetic part): a script `scripts/audit_theater_assets.sh` that, given a base URL, curls `/`, `/projects/<slug>.html`, `/theater/`, the hashed theater JS (parsed from `/theater/`), and every poster and clip URL from `theater/src/projects.ts`, printing status, content type and byte count per URL and exiting non-zero on any poster that is not `200 image/png` with > 10 000 bytes, or any project page that is not 200. Clips are reported but do not fail the audit (they may legitimately not exist yet). Run it locally against `http://portfolio-site.localhost` in `<verification>` and against the public host in Manual Verification.
- Update `/home/evan/EVOsystem/infra/domain-registry.md`'s "Portfolio Site" block with the outcome (a separate commit in the `infra` repo, same phase scope).
</constraints>

<build_order>

### 1. Workflow and compose
- [ ] Write `.github/workflows/deploy.yml` per `<constraints>` (two tags, pull before up).
- [ ] Parameterise the compose image tag with `IMAGE_TAG`; document it in `.env.example`.

### 2. Recovery and audit
- [ ] Write `docs/deploy.md` (recovery paths, DNS/Cloudflare before/after).
- [ ] Write `scripts/audit_theater_assets.sh`; run it against the local stack.

### 3. Hand over
- [ ] Commit; the push to `main` triggers the workflow. The droplet setup, the first public verification and the cutover decision are Evan's — see Manual Verification.

</build_order>

## Manual Verification (Evan — droplet, GitHub, DNS)

1. GitHub → Settings → Secrets → Actions: `DROPLET_HOST`, `DROPLET_USER`, `DROPLET_SSH_KEY` (per `cicd-github-actions.md`). Confirm the repo's Packages visibility allows the droplet to pull (public package, or `docker login ghcr.io` on the droplet).
2. Droplet: `/opt/portfolio-site/` with `docker-compose.yml` and a `.env` containing `DOMAIN=evanleon.com` (per `onboard-droplet.md`); `docker compose pull && docker compose up -d`.
3. Watch the workflow run for the DT10 commit go green; then `bash scripts/audit_theater_assets.sh https://portfolio-site.evanleon.com` — every poster 200, `/theater/` 200, hashed JS 200.
4. Decide the cutover. On **GO**: add the `evanleon.com` host rule (a commit; the workflow deploys it), stop the root server, confirm `bash scripts/audit_theater_assets.sh https://evanleon.com` passes and `https://evanleon.com/theater/` renders. On **NO-GO**: leave `evanleon.com` as it is.
5. Write the row `| DT10 | CUTOVER: GO / NO-GO | <hostname the theater is public at> | <date> | Evan |` into the "Decision records" table; update `infra/domain-registry.md`; commit both.

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
test -f .github/workflows/deploy.yml && grep -n 'sha-\|:latest\|docker compose pull\|docker compose up' .github/workflows/deploy.yml   # both tags; pull precedes up
grep -n 'IMAGE_TAG' docker-compose.yml .env.example                       # parameterised tag, documented
test -f docs/deploy.md && grep -c 'IMAGE_TAG=sha-' docs/deploy.md          # ≥ 1: the rollback command is written down
docker compose build && docker compose up -d --force-recreate
bash scripts/audit_theater_assets.sh http://portfolio-site.localhost ; echo "audit exit=$?"   # 0
# the audit must be able to fail (EVO-UNI-120): point it at a host with no theater
bash scripts/audit_theater_assets.sh https://evanleon.com ; echo "audit exit=$?"   # non-zero today (/theater/ is 404 there until cutover)
pnpm format:check
```

Expected: workflow file present with both tags and pull-before-up; the audit passes locally and fails against the not-yet-cut-over public host. After Manual Verification: a green workflow run, the audit passing against the public hostname, and one `DT10` row in the Decision records table.
</verification>

<commit>
```
feat(dt10): deploy workflow (ghcr sha + latest tags, pull-then-up), IMAGE_TAG rollback, deploy.md, asset audit
```
</commit>

## Done

After this phase — the session's workflow plus Evan's Manual Verification — every push to
`main` builds, publishes and deploys the site image, a bad deploy is undone with one
`IMAGE_TAG=sha-… docker compose up -d`, and the theater is public at the hostname the
Decision records row names (`evanleon.com/theater/` on `CUTOVER: GO`, else
`portfolio-site.evanleon.com/theater/`).

Paste Phase DT8.

---

## Phase DT8: `adding-project-demo-clips` skill and ffmpeg recipe

<task>
You are executing **Phase DT8 of the Drive-In Theater Roadmap** — writing the skill that
tells any future session (Claude or Codex) how to record, encode, place and verify a
project's demo clip, so DT9's manual work has exact instructions and later projects can be
added without rediscovering them.
</task>

## Load skills first — do this before writing any code

1. `AGENTS.md` — "Codex Skills" section: the wrapper/canonical split
2. `/home/evan/EVOsystem/infra/skills/rules-index/references/universal.md`
3. `.claude/skills/adding-project-screenshots/SKILL.md` — the sibling skill this one mirrors
4. `.claude/skills/writing-session-logs/SKILL.md`

<context>
## What's already built

- The theater plays `images/<slug>/demo.mp4` on a project's screen while it is active
  (DT4) and shows the poster when the file is missing. `theater/src/projects.ts` lists
  the eight slugs; adding a ninth project to the theater is one entry there plus one `<li>`
  in `theater/index.html`'s exit list (a unit test enforces they agree).
- Skills convention (AGENTS.md "Codex Skills"): the canonical body lives at
  `.claude/skills/<name>/SKILL.md` with `name`/`description` frontmatter; a thin Codex
  wrapper at `.agents/skills/<name>/SKILL.md` has the same frontmatter and a body that
  says to read `../../../.claude/skills/<name>/SKILL.md` in full.
  `scripts/validate_codex_setup.py` checks every wrapper's body contains
  `.claude/skills/<name>/SKILL.md` (`references_canonical`, lines 78–81) against
  `WRAPPERS_DIR`/`CANONICAL_DIR` (lines 26–27). Its `EXPECTED_HIGH_VALUE` tuple (line 36)
  names skills this repo has never had — leave it alone.
- `.claude/skills/adding-project-screenshots/SKILL.md` is the model: overview, the two
  reference points that must agree, a checklist, quality rules, common mistakes.
- Host: ffmpeg 6.1.1 at `/usr/bin/ffmpeg`.

**Out of scope:** recording any clip (DT9).

Verify this against the actual codebase before proceeding — commits may have landed
since this roadmap was written.
</context>

<rules>
Applicable rules from the shared tier for this phase:
- **EVO-UNI-024** — the spec's clip convention (below) is authoritative; the skill restates it, it does not invent a second one.
- **EVO-UNI-011** — one skill, one wrapper; no changes to the validator's expectations.
</rules>

<reference_material>
Read these files before writing any code:
- `.claude/skills/adding-project-screenshots/SKILL.md` and `.agents/skills/adding-project-screenshots/SKILL.md` — structure and wrapper shape to mirror.
- `scripts/validate_codex_setup.py` — what a valid wrapper must contain.
- `docs/superpowers/specs/2026-08-25-drive-in-theater-design.md` "Media pipeline" — the convention.
- `theater/src/projects.ts` and `theater/src/lot/build-lot.ts` — the file path the theater expects and the `<video>` attributes it sets (so the skill's encode matches: H.264, yuv420p, no audio, faststart).
</reference_material>

<constraints>
- Skill name `adding-project-demo-clips`. Frontmatter description: "Use when recording, encoding, replacing or troubleshooting a project's demo clip for the drive-in theater — images/<slug>/demo.mp4, its poster, and the theater registry."
- Body sections: **Convention** (`images/<slug>/demo.mp4`; H.264 `libx264`, `yuv420p`, no audio, `-movflags +faststart`, 960×600 or the poster's aspect, ≤ 10 s, target ≤ 1.5 MB; poster is `images/<slug>/01.png` and needs no separate file); **Recording** (what to capture — the app doing its main thing with realistic data, no personal data, same "tight crop" rule as screenshots); **Encode recipe** (one ffmpeg command taking an input recording, scaling to 960:-2, trimming to ≤ 10 s, `-crf 28` (UI captures compress well; raise toward 32 if a clip lands over 1.5 MB), with the flags above; and one `ffprobe` line to verify codec/size/duration); **Placing** (drop the file in; nothing else changes for the eight existing projects; for a *new* project add the `projects.ts` entry and the `theater/index.html` `<li>`, then `pnpm -C theater test`); **Verify** (rebuild-restart, drive to the screen, it plays on approach; `curl` the URL for 200); **Common mistakes** (an audio track left in — the element is muted but the bytes still ship; a non-16:10 recording — the surface is `object-fit: cover`, so the edges are cropped, not letterboxed; a file over 1.5 MB, times eight screens; forgetting that the Docker image must be rebuilt before the clip is served).
- Wrapper at `.agents/skills/adding-project-demo-clips/SKILL.md` with the same frontmatter and the standard "read the canonical file in full" body.
- Update `AGENTS.md`'s "Codex Skills" list with the new skill, one line, same style as the existing two.
- Do not touch `EXPECTED_HIGH_VALUE` or any other line of the validator.
</constraints>

<build_order>

### 1. Skill and wrapper
- [ ] Write `.claude/skills/adding-project-demo-clips/SKILL.md`.
- [ ] Write `.agents/skills/adding-project-demo-clips/SKILL.md`.
- [ ] Add the line to `AGENTS.md`.

### 2. Prove the recipe
- [ ] Run the skill's own ffmpeg recipe once against a synthetic source (`testsrc2`) into a scratch path outside the repo and `ffprobe` it — the recipe must work as written before it is committed.

</build_order>

<verification>
```bash
cd /home/evan/EVOsystem/portfolio_site
python3 scripts/validate_codex_setup.py                                   # exit 0, lists adding-project-demo-clips
grep -c 'adding-project-demo-clips' AGENTS.md                              # ≥ 1
grep -n 'libx264\|faststart\|yuv420p\|-an' .claude/skills/adding-project-demo-clips/SKILL.md   # all four present
# the recipe, executed as written from the skill, against a synthetic source:
S=/tmp/claude-dt8; mkdir -p $S
ffmpeg -v error -y -f lavfi -i testsrc2=size=1920x1200:rate=30 -t 12 -c:v libx264 -pix_fmt yuv420p $S/raw.mp4
# paste the skill's encode command here with INPUT=$S/raw.mp4 OUTPUT=$S/demo.mp4, then:
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt:format=duration -of csv=p=0 $S/demo.mp4
# expected: h264,960,600,yuv420p and a duration ≤ 10
ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 $S/demo.mp4 | wc -l   # 0 (no audio stream)
```

Expected: the validator passes with the new wrapper; the recipe produces a ≤ 10 s
960×600 h264 yuv420p file with no audio stream.
</verification>

<commit>
```
docs(dt8): adding-project-demo-clips skill, Codex wrapper, ffmpeg recipe
```
</commit>

## Done

After this phase, portfolio_site has a verified, paste-ready procedure for producing a
project's demo clip, usable by Evan for DT9 and by any future session adding a project.

Paste Phase DT9 (a manual checklist for Evan).

---

## Phase DT9: Record and encode the eight demo clips `[MANUAL]`

This phase is executed by Evan, not an agent. It produces the content the theater was
built for; the theater is complete and shipped without it, showing posters.

**Checklist** (follow `.claude/skills/adding-project-demo-clips/SKILL.md` for each):

- [ ] `budget-app` — record Leon's Budget doing its main flow with realistic data; encode to `images/budget-app/demo.mp4`.
- [ ] `nom-noms` — `images/nom-noms/demo.mp4`.
- [ ] `el-blackjack` — `images/el-blackjack/demo.mp4`.
- [ ] `classic-golf` — `images/classic-golf/demo.mp4`.
- [ ] `spead-read` — `images/spead-read/demo.mp4`.
- [ ] `media-cloud-web-tools` — `images/media-cloud-web-tools/demo.mp4`.
- [ ] `media-cloud-vitals` — `images/media-cloud-vitals/demo.mp4`.
- [ ] `showrunner-digest` — `images/showrunner-digest/demo.mp4`.
- [ ] After each clip: `ffprobe` it per the skill; `git add images/<slug>/demo.mp4 && git commit -m "feat(dt9): <slug> demo clip"` — commit each clip as it lands (`EVO-UNI-090`); a clip that exists only in the working tree is not delivered.
- [ ] When all eight are in: `docker compose build && docker compose up -d --force-recreate`, drive the lot, confirm every screen plays on approach and none shows `data-clip="missing"`; each pushed clip commit has already been deployed by DT10's workflow — run `bash scripts/audit_theater_assets.sh https://<public host>` and confirm eight clips report 200.
- [ ] Record the outcome (date, which clips landed, any that were skipped and why) in the Changelog table below.

**Paste-ready prompt for a session that helps with the encoding** (the recording itself is yours):

> Read `.claude/skills/adding-project-demo-clips/SKILL.md`. I have raw screen recordings at `<paths>`; encode each to `images/<slug>/demo.mp4` per the convention, verify with `ffprobe`, and commit each one as `feat(dt9): <slug> demo clip`. Do not modify anything under `theater/`.

## Done

After this phase, portfolio_site's drive-in is the thing that was envisioned: eight
screens, each playing its project as you pull up, each a door into that project's page.

The completed roadmap enables: a ninth project in three edits (a `projects.ts` entry, an
exit-list `<li>`, a clip), a homepage that stays exactly as it was for everyone the theater
is not for, and an engine the portfolio owns outright.

---

## Decision records

| Phase | Decision | Chrome fps, median of 3 (flat / lot / overload / reduced) | Firefox fps (flat / lot / overload / reduced) | WebKit | Click + Tab | Date | Decided by |
|---|---|---|---|---|---|---|---|
| DTF | _not yet run_ | | | | | | |

| Phase | Decision | Public hostname of the theater | Date | Decided by |
|---|---|---|---|---|
| DT10 | _not yet run_ | | | |

## Changelog

| Date | Phase | Commit | Outcome / deviations |
|---|---|---|---|
| 2026-08-25 | — | `0a23820` → `647f093` | Roadmap written (Part 2); two cold Sonnet evaluators, 16 findings, 15 accepted / 1 rescoped. |
| 2026-08-25 | — | (Part 3 corrective commit) | Part 3 (Codex, Evan-driven; receipt `docs/roadmaps/drive-in-theater-part3-codex-review.md`): 8 findings, 7 accepted / 1 rescoped / 0 rejected. Added DT10 (deploy + cutover — production was never on this container); DTF now reproduces the production path (GSAP + brightness + Lenis-ticked rAF), adds a `reduced` variant and a defined sampling protocol; DT0 removes the canvas describe block; DT3 gates on poster dimensions (el-blackjack's 01.png is a 1×1) and snapshots rendered state; DT6 parameterised over all eight screens, one breakage per spec, nginx parity smoke, Done rescoped to what is proven. |
