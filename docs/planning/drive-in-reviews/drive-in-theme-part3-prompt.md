# Drive-In Theme roadmap — Part 3 review prompt (Codex handoff)

Filled from `/home/evan/EVOsystem/docs/meta-prompts/roadmap/roadmap-meta-prompt.md` Part 3
on 2026-09-08, after Part 2's two-agent evaluation was triaged and committed. The reviewed
revision is frozen at portfolio_site `a572b5e` (roadmap) / `14f398b` (spec, wireframe); do
not edit the roadmap until the review returns.

**Model:** `gpt-5.6-sol`, reasoning `high` — Evan's standing choice for adversarial runs
(2026-09-08). Confirm the banner prints `model: gpt-5.6-sol`, `reasoning effort: high` and
`(network access enabled)` before trusting any probe result (`EVO-TOOL-105`).

**Launch** (from any directory):

```bash
mkdir -p /tmp/claude-1000/dt-theme-part3 && awk '/^````/{f=!f;next} f' /home/evan/EVOsystem/portfolio_site/docs/planning/drive-in-reviews/drive-in-theme-part3-prompt.md \
  | codex exec -s workspace-write -c sandbox_workspace_write.network_access=true -c model=gpt-5.6-sol -c model_reasoning_effort=high -C /tmp/claude-1000/dt-theme-part3 --skip-git-repo-check - \
  | tee /tmp/claude-1000/dt-theme-part3/review.md
```

Run 2026-09-08 by the writing session itself on Evan's per-instance approval ("you can orchestrate the codex adversarial part 3 using the codex CLI"); the response is triaged in that session and the receipt lands beside this file.

````
Adversarial review of a roadmap. Do not edit any file in any repo — you are a
reviewer, not an implementer. Read-only probes against the running system are
encouraged; your working directory is a scratch dir outside every repo and you may
copy files into it. If your sandbox blocks a probe, say so explicitly and mark the
related finding as unverified, rather than reasoning from the documents as though you
had checked it.

TARGET
  Roadmap:  /home/evan/EVOsystem/portfolio_site/docs/roadmaps/drive-in-theme-roadmap.md @ a572b5e
  Spec:     /home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-09-08-drive-in-theme-design.md @ 14f398b
  Standard: /home/evan/EVOsystem/docs/meta-prompts/roadmap/roadmap-meta-prompt.md @ b6c9a6a (gains the falsification-hygiene bullet this roadmap already follows)
  Consumers / cross-repo dependencies:
    /home/evan/EVOsystem/portfolio_site/theater/** @ a572b5e — the vendored Vite/TS theater the phases edit; read src/lot/*, src/styles/*, src/main.ts, e2e/**, skills/rules-index/SKILL.md (SDS-*), vite.config.ts, playwright.config.ts, tsconfig.json.
    /home/evan/EVOsystem/portfolio_site/docs/wireframes/theater-drive-in-theme.html @ 14f398b — the approved wireframe (six palettes, road, trees from the jitter table, wagon placeholder).
    /home/evan/EVOsystem/portfolio_site/docs/spikes/2026-08-25-transformed-video-probe.html — the DTF probe DT11 copies its harness from (a frozen receipt).
    /home/evan/EVOsystem/portfolio_site/docs/roadmaps/drive-in-theater-roadmap.md — the parent roadmap (DTF/DT0–DT10) with its Decision records and Changelog.
    /home/evan/EVOsystem/jourNOW/frontend/src/utils/timePeriod.ts and main.tsx — the time-of-day pattern DT12 ports.
    /home/evan/EVOsystem/infra/skills/rules-index/references/{universal,tooling,react-frontend}.md — the shared rule IDs cited.
  Live services you can probe: the portfolio container on evo-net, if up — `curl -s -o /dev/null -w '%{http_code}' http://portfolio-site.localhost/theater/` (200 on 2026-09-08). You may copy `theater/` (and the repo-root `node_modules`, or run `pnpm -C <copy>/theater install --offline`) into your scratch dir and run `pnpm exec vitest run`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm preview`, and Playwright's Chromium against the preview — the previous reviewers did, and it worked. The theater's Chromium is installed.
  Known access limitations: no browser fps measurement (treat DT11's bands as text); no image generation (DT14 is text); do not run `docker compose build` — reason from the Dockerfile and nginx.conf.

WHAT IT IS
Six phases, executed in ToC order, each phase prompt pasted into a FRESH Claude Code
session with no memory of the others:
  DT11 — spike: a throwaway probe that reproduces the PRODUCTION lot (20 screens, the
         production `--sds-screen-lit` lighting, the DT13 ground) and adds five variants
         (lot20 baseline, car-only, scenery = 88 masked tree planes + orb + beam + car
         with blurred glows, scenery-half, scenery-overload as failing control), measured
         by the DTF probe's in-page rAF harness; an ordered five-outcome decision
         procedure (INVALID / GO / GO-REDUCED / NO-GO-TREES / NO-GO-ALL) written before
         any number is taken; plus an art checker page (canvas alpha, checkerboard
         warning, composite strip, `?selftest=1`, placeholder-SVG export). Evan measures
         and writes the decision row.
  DT12 — `page/period.ts` (jourNOW's six hour bands, `?period=` override,
         visibilitychange re-apply) installed on <html> before the engine; the Playwright
         helpers pin `?period=night` on every existing navigation; `period.spec.ts`
         attribute-level with `page.clock`.
  DT13 — six token palettes, a star layer, a sun/moon orb, a dashed-yellow road, a
         ground plane sized from geometry (`GROUND_LEAD`, `groundDepth`), an unlit-screen
         brightness floor and a glow multiplier; `period.spec.ts` gains consumer
         assertions (computed background-image, ::before opacity, computed filter) and an
         unpinned daytime visit that clicks a screen.
  DT14 — [MANUAL] Evan generates four sprites (a 1970s wood-panelled wagon from behind
         with kids in the rear-facing third row; three tree silhouettes), accepts them
         with the checker (structural PASS + four visual statements), commits; SVG
         fallback with intrinsic dimensions if no model yields real alpha.
  DT15 — `scenery.ts` (deterministic placements from a jitter table), `art.ts` (pure URL
         manifest), trees/car/beam DOM, art through the asset loader with masks applied
         only after the bytes arrive and `data-mask`/`data-car` states, CSS, unit +
         contract tests; branches on DT11's verdict and on the art extension.
  DT16 — `scenery.spec.ts` (trees ready/visible, matrix literals, a SCAN for the first
         progress where screen 0's box overlaps the car's, then elementFromPoint +
         click → navigation), `art.spec.ts` (canvas contract), nginx parity for the
         sprite, three falsifications with backup/restore by copy.

PRIOR REVIEW — METHODS AND ACCESS (not conclusions)
  Spec: one Codex pass (gpt-6-astra, high; workspace-write + network; scratch copy of
  theater with a live preview and Chromium probes; unit suite run) on the spec at
  f4cfda3, instructed to verify code truth, composability/feasibility, outcome validity
  of the falsifier and the art acceptance, omissions and strategic risk. Its findings
  were folded into spec rev 2 (14f398b); receipt at
  docs/planning/drive-in-reviews/drive-in-theme-spec-codex-review.md.
  Roadmap (Part 2), two cold Claude Opus agents on 4882883, no session context:
    Agent A (code truth): read access to portfolio_site, jourNOW, the shared rules
    index; ran the unit suite, tsc, a scratch build + preview + Chromium; instructed to
    re-verify every path/line/symbol/rule ID/literal/environment claim, run every
    verification command that can run today, and hunt shadowed checks, vacuous greps,
    seds whose anchors do not exist, and stubs that would not compile.
    Agent B (structure): same access; instructed to check template conformance,
    self-contained contexts, cross-phase contracts by exact name, dependency ordering,
    the decidability of DT11's procedure and its consumption by DT15, and to
    execution-simulate DT15/DT13/DT11 in a scratch dir and report every guess.
  Before either ran, the writing session executed every runnable verification guard
  against the pre-phase tree to confirm its before-polarity.
Those passes occurred; do not assume their conclusions were correct, and do not treat
any area as settled because it was looked at. Where re-checking is cheap, re-check.

DECISION RECORD
Decisions already made deliberately, with the reasoning behind each:
  1. The visitor's car is a stage-anchored overlay, not a 3D object; no parked cars —
     zero perf risk, never misaligned with the screens (Evan chose it 2026-09-08).
  2. Six periods on jourNOW's exact hour bands; night is the base palette, so a root
     with no attribute renders the night palette; the orb, deeper ground, road and
     scenery are new in every period including night (rev 2 reworded an earlier
     "byte-identical" claim after the Codex pass).
  3. Generated raster sprites, trees as CSS alpha masks recoloured per period; SVG
     placeholder fallback exported with intrinsic dimensions.
  4. `?period=` override only, no visible toggle; the existing suite pins night, the
     new specs cover the unpinned path.
  5. Period re-evaluated on visibilitychange only (as jourNOW), never a timer.
  6. Only the lot responds to the period; hero/exit beats unchanged.
  7. Screens play clips in every period; daylight raises the unlit floor.
  8. The ground is re-sized from geometry in DT13 because daylight exposes a
     pre-existing depth bug (4800px, ends behind the camera a third of the way down).
  9. DT11 runs first on a production-shaped probe; DT12/DT13 are not gated on it;
     DT14/DT15/DT16 are. The procedure has INVALID and NO-GO-ALL outcomes.
  10. Tree masks are applied from JS only after the loader has the bytes (SDS-006);
      trees are `visibility: hidden` until `data-mask="ready"` because an unset mask
      paints a filled rectangle (measured).
  11. Phase IDs continue the parent roadmap (DT11–DT16).
  12. Part 2 triage split DT15 into DT15 (modules/DOM/loader/CSS/unit+contract) and
      DT16 (Playwright/parity/wireframe match) on the structure agent's finding of three
      unrelated verification checkpoints at ~14 files.
  13. Part 2 triage replaced a pinned click-under-the-car progress (both agents measured
      no overlap there) with a bounded scan for the first overlapping progress across
      screen 0's and 1's bands, followed by a positive elementFromPoint assertion and a
      real click.
  14. Every falsification backs up and restores by `cp`/`cmp` — `git checkout --` was
      wrong for both untracked-new files and files holding uncommitted phase work.
  15. Test filters use `pnpm -C theater exec vitest|playwright …` because pnpm 11
      forwards a `--` literally (measured).
A deliberate decision may still be a defect. Distinguish "I disagree with this choice"
from "this was an accidental omission", and say which you mean. Assess whether each
rationale is actually sufficient for the decision it is carrying.

THE PART 2 TRIAGE'S OWN EDITS ARE UNREVIEWED — re-verify these first. They were written
after both cold agents read the document, by the session that shares its blind spots:
  - DT16's scan-based click-under-the-car test (40 samples from screenProgress(0) to
    screenProgress(2); first intersecting sample; elementFromPoint.closest('a.sds-screen')
    index 0; mouse click; waitForURL). Can it pass for the wrong reason, or fail for a
    reason unrelated to pointer-events? Is screen 0 still the topmost hit when it is
    exploding past the camera at z ≈ +400 under a 600px perspective? Does the settle
    helper cope with 40 scrolls?
  - The backup/restore-by-copy falsification blocks in DT12, DT13, DT16 and the typed
    stubs (`periodForHour(_hour: number)`, `treePlacements(_count: number)`).
  - The `pnpm -C theater exec vitest run --reporter=verbose src/page|src/lot | grep '✓|✗|×'`
    lines — does verbose output actually carry those glyphs on this host, or is the
    grep empty (vacuous)?
  - DT15's `pointer-events: none` constraint on `.sds-lot__car`/`.sds-lot__beam` and the
    `grep -A12 … | grep -c 'pointer-events: none'` guard (fragile to rule length?).
  - DT13's glow scope (box-shadows only) and the added second accent halo layer.
  - DT12's `getPeriod` → `periodForHour` delegation and the `expect.poll(periodAttribute)`
    assertion style.
  - `#placeMask(k, url, image)` / `#placeCar(url, image)` and the `'pending'` /
    `destroy()` snapshot semantics.
  - DT13's and DT14's new gate text; DT13's conditional `## Done` pointer.
  - DT11's `?selftest=1` mode, the FileReader decode path, the pasted-constant
    placeholder export, the 351 count, the INVALID grep, the two named commits.

YOUR LENSES, in priority order — aimed at what this roadmap is exposed to:

1. OMISSIONS. What must happen for this to work that no phase assigns to anyone? In
   scope here: what a half-executed DT15 leaves behind (a lot that declares art the
   server does not have); the loading ring under four more assets on a slow
   connection; `destroy()`/re-mount (the engine can rebuild the scene) with masks and
   the car; the narrow layout for trees and car; the conformance kit's
   listener-leak and order-independence checks with the new elements; Firefox for
   masks under preserve-3d; the pre-commit Prettier hook over new .ts/.css; the docs
   repo runlog. Not in scope (say so rather than manufacture): persistence, migrations,
   rollback of data, concurrency, scarce hardware.

2. EXECUTION SIMULATION. Walk DT15 and DT16 as the agent holding ONLY that phase prompt
   and this repo; draft the loader/mask/snapshot code and the scan-based spec in your
   scratch dir against the real theater (a preview + Chromium is available to you).
   Report every point where you had to guess, and what you guessed. Do the same more
   briefly for DT11's probe (can the copied harness walk five variants; does the
   production CSS transcription actually reproduce build-lot.ts's timeline?).

3. DECIDABILITY AND OUTCOME VALIDITY. DT11's procedure: decidable as written, exhaustive,
   exclusive? Can GO be reached while the shipped page is slow — does the probe really
   reproduce the production path (Lenis-ticked rAF, custom-property lighting, 20
   decoders resident, the real ground) or an easier proxy? Can NO-GO be reached at all?
   DT14's acceptance: can a diligent Evan commit wrong art that passes both halves? Do
   DT13's consumer assertions prove the sky is wired, or could a token be declared and
   the page still render night by day? Does the `?period=night` pin hide a class of
   regression the suite used to catch? Test each `## Done` CLAIM against the MECHANISM:
   "every screen still a link" (DT16), "the car never steals a click", "the ring's
   number stays true" (SDS-006 with masks fetched by CSS), "nothing visible changes"
   (DT12).

4. STRATEGIC RISK. Is the core assumption (≈88 masked planes + blurred overlay at ≥ 50
   fps; masks paint under preserve-3d) the right one, and is DT11 the cheapest way to
   falsify it? Is anything measured only late? Is the SVG fallback actually reachable
   end-to-end (export → checker → DT15 `ART_EXTENSION = 'svg'` → mask-image with an SVG
   → parity)?

5. ANYTHING ELSE that would bite at execution time.

OUTPUT
A prioritized findings list, most severe first. For each: severity
(CRITICAL/MAJOR/MINOR), the phase and location, what is wrong and why it bites,
evidence (the command you ran and its real output, or the file and line you read),
whether the finding is VERIFIED or UNVERIFIED, and a concrete fix. If a claim checks
out, do not report it. If you find nothing major, say so plainly rather than padding
the list — that is a useful result. End with a one-paragraph judgement: would you
execute this roadmap as written?
````
