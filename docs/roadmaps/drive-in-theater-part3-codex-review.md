# Drive-In Theater roadmap — Part 3 review (Codex, run by Evan, 2026-08-25)

Receipt for the third-lens review of `docs/roadmaps/drive-in-theater-roadmap.md` @ `647f093`,
launched from `docs/roadmaps/drive-in-theater-part3-prompt.md`. Findings are reproduced as
returned (the reviewer's DT0 scratch diff is omitted; it is summarised under finding 4).
Triage outcome is recorded in the corrective commit and in the roadmap Changelog.

---

I found six material issues. The most serious is that the roadmap does not currently have a path to production.

## 1. CRITICAL — DT1 / production delivery is unassigned and apparently nonexistent

**What is wrong:** DT1 proves a local image can build and run, but no phase builds or publishes `ghcr.io/evan-leon/portfolio-site:latest`, deploys it to the droplet, or verifies the public site. This is more than undocumented existing infrastructure: the pinned repository contains no GitHub Actions workflow, and the shared infra registry says production still serves `evanleon.com` directly from the droplet root, not this container.

Decision 3's rationale—"who builds/pushes that image is unchanged"—is insufficient because the unchanged mechanism does not appear to exist. As written, the roadmap can complete while the public site never receives `/theater/`.

**Evidence: VERIFIED** — `git ls-tree -r --name-only 647f093 | rg '^\.github/workflows|deploy|Dockerfile|docker-compose'` → `Dockerfile`, `docker-compose.yml` only. `infra/domain-registry.md:224-225` says the portfolio is "prod-ready" but not cut over, and live production still serves directly from the droplet root. `infra/local-deployment/onboard-project.md:366-368` independently says no workflow was created and cutover is a future decision. DT1's implementation and verification are local-only. The current container is healthy; probes returned `/` 200, `/projects/nom-noms.html` 200, `/theater/` 404. A half-executed local DT1 is relatively safe (a red build does not recreate the running container) but leaves a dirty, non-building checkout; no actual production procedure exists to verify.

**Concrete fix:** Add a dedicated deployment/cutover phase that defines who builds and pushes the exact commit image to GHCR; uses immutable commit tags, not only `latest`; pulls before recreating and retains the prior tag for rollback; resolves the documented non-containerized `evanleon.com` cutover; verifies `/`, a project page, `/theater/`, a hashed theater asset, and a poster through the real public hostname; documents recovery when build, push, pull, health check, or Traefik cutover fails.

## 2. MAJOR — DTF does not measure the production rendering path, and GO-REDUCED is never revalidated

The probe and production differ on several independent performance axes: scheduling (plain scroll listener + one rAF vs Lenis, engine rAF, scene progress, GSAP timeline seeking); compositing (the probe omits the eight `filter: brightness()`/marquee transitions DT3 identifies as a cost centre); media load (eight autoplaying videos vs production playing at most one, though GO keeps all sources attached); one repeated identical clip may not reproduce decoder behaviour for eight distinct streams. A GO therefore does not isolate whether the real GSAP/filter path meets the threshold; a 30–50 fps result is ambiguous, and the roadmap proceeds under GO-REDUCED without measuring the reduced variant. "Lowest sustained fps over 10 seconds" is not operationally defined (no duration for "sustained", wheel cadence, viewport, zoom, power state, or repeat/aggregation rule).

**Evidence: VERIFIED against roadmap/source; browser result UNVERIFIED.**

**Concrete fix:** Make the lot probe use the production transform/filter/marquee work and an absolute GSAP seek from a representative rAF loop. Define sampling conditions and require multiple runs. For GO-REDUCED, include a fourth "active-source-only" variant and require that it clear an explicit threshold before proceeding.

## 3. MAJOR — one "existing poster" is a successful 1×1 image, so the loader can reveal a visibly broken lot at 100%

`images/el-blackjack/01.png` exists and decodes but is a 1×1, 68-byte PNG. The prescribed fallback only detects "settled without bytes" (`naturalWidth === 0`); this file has bytes and a nonzero width, counts as loaded, and lets the ring reach 100% while the El Blackjack screen is effectively blank. This answers the loading-gate question: yes, the page can reveal with a visibly wrong lot while reporting completion.

**Evidence: VERIFIED** — `git show 647f093:images/el-blackjack/01.png | wc -c` → 68; `file -` → `PNG image data, 1 x 1, 8-bit/color RGBA`. The live route returns `200 image/png`, 68 bytes.

**Concrete fix:** Add an asset-integrity prerequisite before DT3: decode all eight posters and assert meaningful dimensions. Replace the placeholder El Blackjack image. Make `projects.test.ts` validate dimensions, not merely `existsSync`.

## 4. MAJOR — DT0's prescribed canvas-removal branch cannot pass as written

DT0 vendors `src/test-setup.ts` **and its test**, then removes `vitest-canvas-mock` on the expected branch — but `src/test-setup.test.ts` contains two canvas tests whose only purpose is proving that mock. Removing the mock while retaining the prescribed test makes the unit suite fail; a fresh agent must guess between keeping an unused dependency, deleting only the canvas block (never instructed), or dropping the whole file (losing matchMedia/ResizeObserver coverage).

**Evidence: VERIFIED by scratch execution** — copied the pinned skeleton to `/tmp/dt-part3/dt0-sim`, removed frame-sequence/Lottie modules and specs, removed the canvas setup import/dependency, reduced the registry to the placeholder, set `base: '/theater/'`; result `Test Files 1 failed | 15 passed (16)`, `Tests 2 failed | 231 passed (233)` — both failures in `src/test-setup.test.ts > canvas 2d fill`. Typecheck and Vite build passed. Baseline skeleton: 19 files / 299 tests pass. Root tooling checks out (corepack → pnpm 11.15.1; `pnpm install --frozen-lockfile` ok; Prettier binary present; `core.hooksPath` `.githooks`; `pnpm validate:codex` PASS).

**Concrete fix:** Instruct DT0 to retain `test-setup.test.ts` but remove its `canvas 2d fill` describe block; update the setup header; add `pnpm -C theater test -- src/test-setup.test.ts` to verification.

## 5. MAJOR — DT3's conformance observer can pass while the actual lot is visually wrong

The required `LotSnapshot` (`progress`, pure `lotZ`, pure `activeScreen`, inner `timelineProgress`, poster count) observes no rendered transform and no screen's actual lit state. The contract can therefore pass if the world tween targets the wrong element, brightness/marquee properties are misspelled, every screen stays dark, lighting fails to reverse, or the placement DOM is wrong — as long as `seek()` forwards to GSAP. Also an internal contradiction: line 710 says no `factory.assets`, while build-order line 725 says "eager, assets".

**Evidence: VERIFIED from real source** — `adapter-contract.ts` compares only the caller's `observe()` serialisation at 0.42 and the 0→0.5→1→0.5→0 sweep.

**Concrete fix:** Extend `LotSnapshot` with rendered state sampled from the owned DOM without layout reads (the world's inline transform and all eight `--sds-screen-lit` values). Assert explicit forward and reverse lit-state vectors in a dedicated unit test. Clarify line 725.

## 6. MAJOR — DT6's Done statement materially overclaims the suite

"Lighting the right screen" is tested only for two adjacent screens, forward only; "linking" covers only `classic-golf` (the href-order assertion checks attributes, not navigability); "snapping under reduced motion" checks only that distinct transforms number between 5 and 10; "answering the keyboard" covers only the first two screens; video reversal is not proven; only two of six specs receive deliberate breakages despite the cited rule.

**Evidence: VERIFIED from prescribed assertions.**

**Concrete fix:** Parameterise link navigation across all eight screens; sweep lighting and keyboard focus through all eight forward and backward; assert exact reduced-motion transform/keyframe values; add reverse playback assertions; falsify each spec with an owning breakage.

## 7. MINOR — preview and nginx do not have equivalent URL behaviour, and DT6 never checks nginx

Vite preview's SPA fallback serves the theater index for unknown nested theater paths, whereas nginx is expected to 404 them; Vite returned 404 for `/theater` without the slash. Scratch build with `base: '/theater/'`: `/theater/` 200, `/theater` 404, `/theater/nope` 200, `/assets/nope` 404, `/` 302 → `/theater/`. nginx post-DT1 behaviour UNVERIFIED (could not build the image).

**Concrete fix:** Run the suite against the built nginx image, or add a production-parity smoke covering `/theater`, `/theater/`, `/theater/nope`, a hashed asset, `/images/...`, `/projects/...`.

## 8. MINOR — failures are visible to visitors only as degradation and to Evan only opportunistically

No production telemetry, aggregate failed-asset counter, health check, or post-deployment asset audit; silent valid-but-wrong assets (the 1×1 poster) produce no warning at all.

**Concrete fix:** At minimum, a deterministic deployment audit over every registry poster/clip (status, MIME, bytes, decoded dimensions, ffprobe constraints). If ongoing telemetry is wanted, emit a lightweight asset-failure event; otherwise document that monitoring is intentionally synthetic/manual.

---

**Judgement:** I would not execute the roadmap as written. DT0 has a reproducible test-prescription defect, DT3 can certify a visibly wrong lot, DTF does not validate the actual GO-REDUCED mitigation, and — most importantly — the repository has no demonstrated route from a local image to the live public site. I would fix the production/cutover phase, poster integrity gate, DT0 canvas instructions, production-like falsifier, and DT3/DT6 outcome checks before starting DTF.
