**The spec needs revision before a roadmap is written from it.** I found major problems in the falsifier, fallback path, and acceptance checks.

No repository files were changed. The reviewed targets match `f4cfda3`, and the roadmap standard matches `d5f5b5f`. The scratch unit suite passed **320 tests across 21 files**. Chromium rendered the wireframe and ran the browser probes; the live theater returned **HTTP 200**. The `pnpm` wrapper refused a package-manager version mismatch, so I invoked the installed Vitest binary directly in scratch. No probe was blocked by the sandbox. FPS and Firefox rendering remain **UNVERIFIED**.

1. **MAJOR — DT11 measures a materially different workload. VERIFIED mismatch; performance impact UNVERIFIED.**  
   **Sections:** Core assumption; DT11.

   Copying DTF preserves Lenis-ticked rAF and GSAP, but does not reproduce today’s production rendering path. DTF uses eight screens, directly tweens `filter`, uses different lighting timing, and retains the old ground. Production has 20 screens, animates `--sds-screen-lit` through inherited CSS calculations, and DT13 will quadruple the ground’s depth. A filesystem probe found **16 existing project clips**, versus eight synthetic clips in the proposed scenery variant.

   **Evidence:** [DTF timeline](/home/evan/EVOsystem/portfolio_site/docs/spikes/2026-08-25-transformed-video-probe.html:670), [production timeline](/home/evan/EVOsystem/portfolio_site/theater/src/lot/build-lot.ts:201), and [production brightness CSS](/home/evan/EVOsystem/portfolio_site/theater/src/styles/global.css:358).

   **Fix:** Keep the deliberate early falsifier, but reproduce the current 20-screen geometry, production lighting expressions and timing, proposed ground, and representative decoder residency. Record the inherited automated-scroll limitation: DTF explicitly says Lenis’s wheel-smoothing path is idle during measurement. The transfer rationale currently does not carry the chosen fixture.

2. **MAJOR — DT11’s decisions are neither exhaustive nor mutually exclusive, and NO-GO has no executable downstream branch. VERIFIED.**  
   **Sections:** Core assumption; Phase breakdown; DT15.

   Evaluating the written predicates, assuming painting and interaction pass, produced:

   ```text
   scenery / half / overload
   60 / 60 / 60 → no outcome
   25 / 55 / 20 → no outcome
   60 / 40 / 50 → GO and NO-GO
   45 / 55 / 60 → GO-REDUCED despite the failed control comparison
   ```

   NO-GO is reachable, but the phase table admits only GO/GO-REDUCED into DT15, and DT15 names only those branches. The promised car-only delivery consequently has no consistent execution path. Moreover, if the overlay caused the interaction failure, removing trees does not establish that retaining the car is safe.

   **Evidence:** [outcome predicates](/home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-09-08-drive-in-theme-design.md:282), dependencies at line 325, and DT15 branches at line 381.

   **Fix:** Define an ordered decision procedure, including invalid-instrument results and aggregation across browsers. Admit NO-GO explicitly and specify its assets, tests and progress denominator. Verify the car-only fallback independently. Branch reduced-density literals too: counts become **20/44**, and the first right depth becomes **−500**, rather than −300. This is an accidental inconsistency in a deliberate branching strategy.

3. **MAJOR — A failed mask left unset paints a rectangle. VERIFIED.**  
   **Sections:** Scenery loader and CSS; DT15.

   The spec conflates an absent mask with a failed mask URL. With no URL assigned, `mask-image` computes to `none`; the tree’s background paints its whole rectangular box. This also affects pending trees.

   **Evidence:** Running [browser-probes.cjs](/tmp/claude-1000/dt-theme-spec-review/browser-probes.cjs) produced:

   ```text
   unset mask: maskImage = 'none'; pixel = [255,0,0,255]
   broken mask URL: pixel = [0,0,255,255]
   ```

   Red was the tree; blue was the background.

   **Fix:** Specify an explicit pending/ready/missing mask state. Keep trees hidden until a usable mask has been assigned; failed variants remain hidden. Test the failed variant’s rendered invisibility, not merely whether successful variants received URLs. The post-loader assignment decision is workable; its failure-state explanation is accidentally wrong.

4. **MAJOR — The SVG fallback cannot satisfy the current runtime and acceptance contracts by direct export. VERIFIED.**  
   **Sections:** Art contract; DT11 checker; DT14; DT15 parity.

   The wireframe SVGs have `viewBox` values but no intrinsic `width`/`height`. Saving their decoded XML directly and loading those files in Chromium produced:

   ```text
   car:   267 × 150; alpha bounding-box width 201
   trees: 100 × 150
   ```

   The car therefore fails `MIN_CAR_PX = 640`; all four fail the prescribed dimensions. Separately, the parity requirement still demands `car.png` and `image/png` after selecting SVG.

   **Evidence:** [wireframe car](/home/evan/EVOsystem/portfolio_site/docs/wireframes/theater-drive-in-theme.html:828), tree definitions at line 491, and [probe results](/tmp/claude-1000/dt-theme-spec-review/browser-results.txt).

   **Fix:** Make the downloader decode the data URLs and emit standalone SVGs with explicit dimensions: car **1600×900**, trees **800×1200**. Preserve their viewBoxes and decoded colour references. I verified those additions produce the required intrinsic dimensions. Specify SVG acceptance and `image/svg+xml` parity explicitly. The deliberate fallback is sensible; the missing normalization prevents its promised use.

5. **MAJOR — The checker accepts precisely the wrong kind of art it claims to reject. VERIFIED.**  
   **Sections:** Art contract; DT11 checker; DT14 acceptance.

   A checkerboard surrounded by transparent margins satisfies every numerical car check. My canvas fixture contained no car and returned:

   ```text
   dimensions: 1600×900
   corner alpha: 0,0,0,0
   transparent fraction: 0.36
   alpha bounding-box width: 1280
   PNG size: 31,489 bytes
   ```

   Its transparent corners also suppress the proposed checkerboard warning. Equivalent rectangular tree fixtures can satisfy the bottom-bound requirement without containing a trunk.

   **Evidence:** The `wrong-art` case in [browser-probes.cjs](/tmp/claude-1000/dt-theme-spec-review/browser-probes.cjs); acceptance predicates at [spec line 210](/home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-09-08-drive-in-theme-design.md:210).

   **Fix:** Distinguish structural PASS from visual acceptance. Require Evan to inspect compositing over contrasting backgrounds and confirm silhouette, trunk, absence of baked checkerboards, and car content. Falsify the checker with this transparent-border fixture. I disagree with treating its numerical verdict as sufficient; genuine alpha somewhere does not establish correct transparency around the subject.

6. **MAJOR — DT13’s computed-token assertion does not test sky wiring. VERIFIED.**  
   **Sections:** Playwright; DT13.

   The claim that an unused token would fail this check is false. Leaving the old `--sds-sky` unchanged while declaring the expected afternoon token passes both prescribed assertions.

   **Evidence:** Running [period-probes.cjs](/tmp/claude-1000/dt-theme-spec-review/period-probes.cjs) returned:

   ```text
   --sds-sky-top: '#3b78c8'
   star opacity: '0'
   actual sky: old night gradient
   ```

   **Fix:** Assert the lot’s computed `background-image`, actual surface brightness at controlled lit values, and relevant glow output. Include an unoverridden daytime navigation through reveal and interaction. Pinning the existing suite is a reasonable deliberate choice, but leaves visitor-path rendering covered only by the new tests; those tests presently observe declarations rather than their consumers.

7. **MAJOR — The car-centre check does not prove a screen remains clickable beneath the car. VERIFIED.**  
   **Sections:** Scenery stacking; `scenery.spec.ts`.

   Excluding the car and beam permits `null`, the stage, or unrelated content. On the actual wireframe, the prescribed point returned:

   ```text
   hit: 'lot'
   screen: false
   ```

   It passes without exercising screen overlap.

   **Evidence:** [browser results](/tmp/claude-1000/dt-theme-spec-review/browser-results.txt). A stronger [scratch draft](/tmp/claude-1000/dt-theme-spec-review/scenery-hit-draft.cjs), using a 390×720 viewport and progress `1240/16800`, returned screen **0** beneath the injected car; deliberately enabling the car’s pointer events changed the hit to `sds-lot__car`.

   **Fix:** Specify the viewport, scroll position and intended screen. Assert a positive overlap, identify that screen through `closest()`, then click the coordinate and verify navigation. This is an accidental weakness in the proof, not a disagreement with the stage-anchored car.

8. **MAJOR — The art URL module needs an explicit contract across browser, Vitest and Playwright execution. VERIFIED.**  
   **Sections:** `art.ts`; DT15 tests.

   Following the existing e2e convention of importing production constants fails when those constants evaluate `import.meta.env.BASE_URL` in Playwright’s Node runner. Vitest can import the module, but supplies a different base in this installed configuration.

   **Evidence:** A scratch module with the prescribed expression produced:

   ```text
   Vitest: expected '/theater/art/car.png', received '/art/car.png'
   Playwright --list:
   TypeError: Cannot read properties of undefined (reading 'BASE_URL')
   ```

   See [Vitest results](/tmp/claude-1000/dt-theme-spec-review/env-results.txt) and [Playwright results](/tmp/claude-1000/dt-theme-spec-review/playwright-import-results.txt).

   **Fix:** Separate a pure art manifest/URL builder from the browser-only environment lookup, or explicitly prescribe how e2e obtains the URLs without importing that lookup. Key fake-image tests deliberately against the test environment’s URLs. This is an omitted integration contract, not a Vite public-directory copying defect.

9. **MINOR — The promised missing-car tail-light glows collapse with the image. VERIFIED.**  
   **Sections:** Scenery failure policy and CSS.

   The car wrapper’s height comes from its image. With the image absent, its percentage-sized pseudo-elements have no height.

   **Evidence:** Removing the image from the wireframe produced:

   ```text
   car height: 0
   ::before height: '0px'
   ```

   **Fix:** Reserve the sprite’s `aspect-ratio: 16 / 9` on the wrapper, or explicitly size the fallback glow container. Check the missing-car rendering, not only `data-car="missing"`. This is an accidental omission from the deliberate degraded state.

10. **MINOR — The deterministic placement contract is incomplete and conflicts with the wireframe. VERIFIED.**  
    **Sections:** Scenery arithmetic/CSS; DT15.

    `TREE_JITTER` is required but its eight entries are never specified. The wireframe cannot supply an unambiguous repeating table: left index 8 differs from index 0, the right row uses different scales, and it includes a **50px** outward offset excluded by the spec. The wireframe also shrinks narrow trees to **180×270**, whereas the spec names only narrow x overrides after prescribing **260×390**.

    **Evidence:** [wireframe placements](/home/evan/EVOsystem/portfolio_site/docs/wireframes/theater-drive-in-theme.html:725), especially lines 733 and 744; narrow rules at line 650.

    **Fix:** Publish the exact eight-entry table and narrow dimensions, and identify the wireframe differences being accepted. A fresh phase should not choose which visual source wins.

11. **MINOR — The literal computed-transform expectation uses the wrong representation. VERIFIED.**  
    **Sections:** Playwright; DT15.

    Chromium does not serialize this computed transform as `translate3d(...)`.

    **Evidence:** Applying the prescribed first-tree transform returned:

    ```text
    matrix3d(1.05, 0, 0, 0, 0, 1.05, 0, 0,
             0, 0, 1, 0, -900, 0, -100, 1)
    ```

    **Fix:** Specify assertions on `DOMMatrixReadOnly.m41/m42/m43` and scale components, or separately assert inline placement properties and computed matrix values. Otherwise a literal string implementation rejects correct rendering.

12. **MINOR — The HTML attribute does not activate shadow-host period selectors. VERIFIED; standalone is unaffected.**  
    **Sections:** Period-engine rationale; SDS-009.

    `:host([data-period="…"])` requires the attribute on the host element. Setting it on `<html>` does not satisfy that selector, and host base declarations override inherited period roles.

    **Evidence:** The shadow probe returned:

    ```text
    htmlPeriod: 'afternoon'
    hostPeriod: null
    rendered token: 'night'
    ```

    **Fix:** State that standalone installs on `document.documentElement`, while an embedded entry installs on its custom-element host. Since the parent deliberately removed the Wix entry, this is a portability clarification rather than a demand to restore that build.

13. **MINOR — “Night is byte-identical” contradicts the specified visual changes. VERIFIED.**  
    **Sections:** Premise; sky/ground architecture.

    The existing palette values match, but the new moon, ground coverage and scenery change the night rendering even without a period attribute.

    **Evidence:** The unconditional orb and ground changes are specified at [lines 122–139](/home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-09-08-drive-in-theme-design.md:122). Chromium’s ground probe changed the lower viewport from sky to asphalt at night as well as in daylight.

    **Fix:** Promise preservation of the existing night palette and brightness formula, while explicitly allowing scenery and ground changes. Those deliberate additions have a sound rationale; the stronger compatibility promise does not.

The [loader/snapshot scratch draft](/tmp/claude-1000/dt-theme-spec-review/copy/theater/src/dt15-review-draft.ts) passed two focused tests, including destruction during loading. It required choices the spec does not settle: waiting for DOM construction before applying already-arrived art, the mask-readiness attribute and visibility rule, the per-attempt usability predicate, whether `trees` counts current DOM or historical construction, and what `car` reports before construction/after destruction. The hit-test draft additionally required choosing viewport, progress and target screen. DT15 should carry those decisions explicitly. Its verification also needs to update the existing [poster-only asset assertion](/home/evan/EVOsystem/portfolio_site/theater/src/lot/lot-scene.contract.test.ts:76), which necessarily rejects four additional requests.

**A roadmap should not be written from this spec as it stands.** The overall design is feasible, and the early falsifier, period approach and stage-anchored car are reasonable choices. But the current document permits a misleading GO, an accepted checkerboard, invisible fallback art, and passing tests over broken rendering. Resolve those contracts and branches first; otherwise fresh execution sessions will either invent incompatible details or faithfully implement the defects.
