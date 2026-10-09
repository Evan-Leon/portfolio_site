# Drive-In Theme roadmap — Part 3B review prompt (Codex continuation)

The 2026-09-08 Part 3 run (`drive-in-theme-part3-prompt.md`) hit Codex's usage limit
after 285 307 tokens and 95 commands with **no findings list written**; its transcript was
mined into `drive-in-theme-part3-codex-review.md` and folded into the roadmap at `7579eed`.
This prompt finishes the review: it closes off everything the partial run actually covered
and points the remaining budget at the five lenses it never reached, plus the five
triage edits `7579eed` made afterwards (unreviewed by anyone).

**Model:** `gpt-5.6-sol`, reasoning `high` — Evan's standing choice for adversarial runs.
Confirm the banner prints `model: gpt-5.6-sol`, `reasoning effort: high` and
`(network access enabled)` before trusting any probe result (`EVO-TOOL-105`).

**Launch** (from any directory):

```bash
mkdir -p /tmp/claude-1000/dt-theme-part3b && awk '/^````/{f=!f;next} f' /home/evan/EVOsystem/portfolio_site/docs/planning/drive-in-reviews/drive-in-theme-part3b-prompt.md \
  | codex exec -s workspace-write -c sandbox_workspace_write.network_access=true -c model=gpt-5.6-sol -c model_reasoning_effort=high -C /tmp/claude-1000/dt-theme-part3b --skip-git-repo-check - \
  | tee /tmp/claude-1000/dt-theme-part3b/review.md
```

Run 2026-09-08 by the writing session on Evan's instruction ("can we finish the
adversarial?"); the receipt lands beside this file.

````
Adversarial review of a roadmap — the SECOND HALF of a review whose first half ran out
of model quota. Do not edit any file in any repo; you are a reviewer, not an
implementer. Read-only probes against the running system are encouraged; your working
directory is a scratch dir outside every repo and you may copy files into it. If your
sandbox blocks a probe, say so explicitly and mark the related finding as unverified,
rather than reasoning from the documents as though you had checked it.

OUTPUT DISCIPLINE — READ THIS FIRST, IT IS THE POINT OF THIS RUN
Your predecessor did ~285k tokens of excellent probing and then died on a usage limit
with nothing written down, because it was saving its findings for a final message.
Do not repeat that.
  - FIRST ACTION, before any reading: create `findings.md` in your working directory with
    a heading. Then APPEND each finding to it the moment you have formed it — severity,
    phase and location, what is wrong and why it bites, evidence (the command and its
    real output, or file:line), VERIFIED or UNVERIFIED, and a concrete fix. Also append a
    one-line "CHECKED, no defect: <claim>" for anything substantial you cleared, so a
    truncated run still shows its coverage.
  - `findings.md` is the deliverable. Your final message is a convenience copy of it.
  - Work the lenses in the order given below and finish each one's writing before
    starting the next, so an interrupted run leaves whole lenses done rather than five
    half-formed ones.
  - Budget: prefer reading and small targeted probes over building things. Do NOT draft a
    DT15 implementation — your predecessor already did, and its draft is waiting for you
    (see SCRATCH INHERITANCE). Execution-simulation of DT15/DT16 is CLOSED; do not redo it.

TARGET (note the revisions — the roadmap has moved since the partial run)
  Roadmap:  /home/evan/EVOsystem/portfolio_site/docs/roadmaps/drive-in-theme-roadmap.md @ 7579eed (current)
  Spec:     /home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-09-08-drive-in-theme-design.md @ 14f398b
  Standard: /home/evan/EVOsystem/docs/meta-prompts/roadmap/roadmap-meta-prompt.md @ 0dad739
  Partial-review receipt (what the first half established):
            /home/evan/EVOsystem/portfolio_site/docs/planning/drive-in-reviews/drive-in-theme-part3-codex-review.md
  Original full prompt (for the framing you are continuing):
            /home/evan/EVOsystem/portfolio_site/docs/planning/drive-in-reviews/drive-in-theme-part3-prompt.md
  Consumers / cross-repo dependencies:
    /home/evan/EVOsystem/portfolio_site/theater/** — the vendored Vite/TS theater the
      phases edit; read src/lot/*, src/styles/*, src/main.ts, e2e/**,
      skills/rules-index/SKILL.md (SDS-*), vite.config.ts, playwright.config.ts, tsconfig.json.
    /home/evan/EVOsystem/portfolio_site/docs/wireframes/theater-drive-in-theme.html — the
      approved wireframe (six palettes, road, trees from the jitter table, wagon placeholder).
    /home/evan/EVOsystem/portfolio_site/docs/spikes/2026-08-25-transformed-video-probe.html —
      the DTF probe DT11 copies its harness from (a frozen receipt).
    /home/evan/EVOsystem/portfolio_site/docs/roadmaps/drive-in-theater-roadmap.md — the
      parent roadmap (DTF/DT0–DT10) with its Decision records and Changelog.
    /home/evan/EVOsystem/jourNOW/frontend/src/utils/timePeriod.ts and main.tsx — the
      time-of-day pattern DT12 ports.
    /home/evan/EVOsystem/infra/skills/rules-index/references/{universal,tooling,react-frontend}.md
      — the shared rule IDs cited.
  Live services you can probe: the portfolio container on evo-net —
    `curl -s -o /dev/null -w '%{http_code}' http://portfolio-site.localhost/theater/`
    returned 200 at 17:35 on 2026-09-08. You may run `pnpm exec vitest run`,
    `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm preview` and Playwright's Chromium
    against a preview IN YOUR SCRATCH COPY. The theater's Chromium is installed.
  Known access limitations: no browser fps measurement (treat DT11's bands as text); no
    image generation (DT14 is text); do not run `docker compose build` — reason from the
    Dockerfile and nginx.conf. Firefox is NOT installed on this host.

SCRATCH INHERITANCE — reuse it, do not rebuild it
  `/tmp/claude-1000/dt-theme-part3/sim/` is your predecessor's scratch copy of the repo,
  still intact (169 MB, real `node_modules` including `theater/node_modules/.bin/{vitest,
  playwright,tsc,vite}`, and a built `dist/`). Copy or symlink it rather than re-installing.
  It is DIRTY on purpose — it carries the predecessor's own DT15/DT12 draft:
    added:    theater/src/lot/scenery.ts, theater/src/lot/art.ts, theater/src/page/period.ts,
              theater/public/art/{car,tree-1,tree-2,tree-3}.svg  (placeholder SVGs)
    modified: theater/src/lot/build-lot.ts, lot-scene.ts, lot-scene.contract.test.ts,
              theater/src/styles/global.css
  Everything else matches the repo. That draft is a *reviewer's guess at the phases*, not
  law — but it is a working end-to-end DT15 you can probe against instead of writing one,
  and its four placeholder SVGs are exactly what the SVG-fallback lens needs. If you need a
  clean baseline, copy the real files over from the repo (keep `node_modules`).
  Its probe scripts are there too: `click-scan-probe.mjs`, `dt15-runtime-probe.mjs`,
  `loading-ring-probe.mjs` in `/tmp/claude-1000/dt-theme-part3/`.

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
  DT16 — `scenery.spec.ts` (trees ready/visible/masked, matrix literals, a SCAN for the
         first progress where screen 0's box overlaps the car's, then elementFromPoint +
         click → navigation), `art.spec.ts` (canvas contract), nginx parity for the
         sprite, three falsifications with backup/restore by copy.

ALREADY COVERED — CLOSED, DO NOT REDO
The partial run verified these against a live scratch build; the receipt has the numbers.
Treat them as settled and spend nothing on them:
  - DT16's scan-based click-under-the-car test is decidable and its falsification flips it
    (first overlap at progress 0.0690, world z 1160, at 390×720; elementFromPoint →
    `span.sds-screen__base`, `.closest('a.sds-screen')` → index 0; with the car at
    `pointer-events: auto` → `div.sds-lot__car`).
  - DT12's typed-stub falsification compiles and its copy-restore is byte-exact
    (`falsified_tsc_exit=0 restored_cmp_exit=0`).
  - SDS-006 holds with CSS-fetched masks: exactly four `/theater/art/` requests, all
    `resourceType: image`, no second download when `mask-image` is set from JS after the
    loader resolves; 88 trees `ready`/visible; car `ready` with `aspect-ratio` honoured.
  - The widened `lot-scene.contract.test.ts:76` assertion is necessary and sufficient
    (39/39 green with the four art URLs).
  - The loading ring does not reveal early with four more assets (0 → 83 % → revealed
    ~3.2 s). The ~2 s plateau at 83 % on four localhost SVGs is an OPEN FLAG, not settled —
    see lens 4.
  - 16 of 20 projects have a real `demo.mp4`; four fall back to the poster.
  - Prettier over the drafted files moves only the `.sds-tree` `transform` onto multiple
    lines; selector lines are unchanged.
  - Full execution-simulation of DT15 and DT16 (the predecessor drafted both and ran them).

UNREVIEWED — the five edits `7579eed` made AFTER the partial review
These were written by the same session that mined the transcript; nobody has reviewed
them. `git -C /home/evan/EVOsystem/portfolio_site show 7579eed -- docs/roadmaps/drive-in-theme-roadmap.md`
is the exact diff. Check them before the lenses — they are cheap and they are the newest
untested surface:
  1. Every `pnpm -C theater exec vitest|playwright …` line became
     `(cd theater && ./node_modules/.bin/<bin> …)`. Does that form actually work from the
     repo root in a fresh shell? Does `--reporter=verbose` now really print `✓` glyphs that
     the `grep -E '✓|✗|×'` catches (the old form printed nothing and could never fail)?
     Is the exit status still the *test run's*, given the subshell and the pipe to grep —
     or has a `| head -40` made the check vacuous a second way?
  2. `scenery.spec.ts` now also asserts the first tree's computed `mask-image` and
     `-webkit-mask-image` contain `art/tree-1.`. Does Chromium report both properties with
     a resolvable URL, or does one normalise to `none`/an absolute URL that fails a
     substring test against `art/tree-1.`? Under `ART_EXTENSION = 'svg'` does the same
     assertion still hold? Can it pass while the mask is applied to the WRONG trees?
  3. The pointer-events guards became `awk '/^\.sds-lot__car \{$/,/^\}/' … | grep -c`.
     Does that awk range actually match what Prettier emits for these rules (anchored
     `^\.sds-lot__car \{$` and a bare `^\}`), or is it silently empty — a `grep -c`
     printing 0 where the roadmap's comment says it must print 1? Test it against the
     predecessor's formatted `global.css` draft in the scratch dir.
  4. DT16's `## Done` now says the browser proof covers screen 0 at 390×720 in Chromium
     and generalises only through the `pointer-events: none` rule. Is that now an honest
     claim, or does it *under*-claim in a way that lets a real regression through?
  5. DT11's context now records 16 real clips / four poster fallbacks and argues the
     probe's 20 cycled clips "err heavy". Is erring heavy actually the safe side for a
     GO/NO-GO decision, or does it push the probe toward a NO-GO the production page
     would not deserve?

DECISION RECORD
Decisions made deliberately, with the reasoning behind each:
  1. The visitor's car is a stage-anchored overlay, not a 3D object; no parked cars —
     zero perf risk, never misaligned with the screens.
  2. Six periods on jourNOW's exact hour bands; night is the base palette, so a root with
     no attribute renders the night palette; the orb, deeper ground, road and scenery are
     new in every period including night.
  3. Generated raster sprites, trees as CSS alpha masks recoloured per period; SVG
     placeholder fallback exported with intrinsic dimensions.
  4. `?period=` override only, no visible toggle; the existing suite pins night, the new
     specs cover the unpinned path.
  5. Period re-evaluated on visibilitychange only (as jourNOW), never a timer.
  6. Only the lot responds to the period; hero/exit beats unchanged.
  7. Screens play clips in every period; daylight raises the unlit floor.
  8. The ground is re-sized from geometry in DT13 because daylight exposes a pre-existing
     depth bug (4800px, ends behind the camera a third of the way down).
  9. DT11 runs first on a production-shaped probe; DT12/DT13 are not gated on it;
     DT14/DT15/DT16 are. The procedure has INVALID and NO-GO-ALL outcomes.
  10. Tree masks are applied from JS only after the loader has the bytes (SDS-006); trees
      are `visibility: hidden` until `data-mask="ready"` because an unset mask paints a
      filled rectangle (measured).
  11. Phase IDs continue the parent roadmap (DT11–DT16).
  12. Part 2 triage split the old DT15 into DT15 (modules/DOM/loader/CSS/unit+contract)
      and DT16 (Playwright/parity/wireframe match).
  13. Part 2 triage replaced a pinned click-under-the-car progress with a bounded scan.
  14. Every falsification backs up and restores by `cp`/`cmp`, never `git checkout --`.
  15. Test filters call the binaries in `theater/node_modules/.bin/` directly, because
      pnpm 11 forwards `--` literally and parses `--reporter` as its own flag (measured).
A deliberate decision may still be a defect. Distinguish "I disagree with this choice"
from "this was an accidental omission", and say which you mean. Assess whether each
rationale is actually sufficient for the decision it is carrying.

YOUR LENSES — exactly the five the partial run never reached, in this order.
Finish writing each into `findings.md` before starting the next.

1. OMISSIONS. What must happen for this to work that no phase assigns to anyone?
   In scope, and specifically unexamined so far:
     - What a HALF-EXECUTED DT15 leaves behind: a lot that declares art the server does
       not have (DT14 is manual and may never produce PNGs), or art committed with no
       code to place it. Is there a safe intermediate state, and does any phase say so?
     - `destroy()` / re-mount — the engine can rebuild the scene. What happens to the
       masks, the car element, the loader's snapshot and its listeners on a second mount?
       Is there a leak or a double-append? (`dt15-runtime-probe.mjs` and the scratch draft
       let you actually test this.)
     - The narrow layout (≤ 767px) for trees and the car — the roadmap has a car box at
       390×720 but does any phase state what trees do when the viewport is narrow?
     - The conformance kit's listener-leak and order-independence checks with the new
       elements — do they cover the new DOM, or silently skip it?
     - Firefox for masks under `preserve-3d` (not installable here — reason from spec and
       caniuse-level knowledge and mark UNVERIFIED; say whether shipping Chrome-only
       verification is acceptable for this feature).
     - The pre-commit Prettier hook over the new `.ts`/`.css` (`.githooks/pre-commit`,
       `.prettierignore`) — does any phase's commit step trip it?
     - The docs-repo runlog row.
   NOT in scope — say so rather than manufacture: persistence, migrations, data rollback,
   concurrency, scarce hardware.

2. DECIDABILITY AND OUTCOME VALIDITY OF DT11. Its five-outcome procedure
   (INVALID / GO / GO-REDUCED / NO-GO-TREES / NO-GO-ALL), written before any number is
   taken and consumed by DT15's branching:
     - Decidable as written? Exhaustive? Mutually exclusive? Walk two or three plausible
       measurement vectors through it by hand and show which outcome each lands on — if
       any vector lands on two outcomes or none, that is a CRITICAL.
     - Can GO be reached while the SHIPPED page is slow — does the probe really reproduce
       the production path (Lenis-ticked rAF, custom-property lighting, 20 decoders
       resident, the DT13 ground) or an easier proxy? Transcribe-vs-reality: does the
       probe's copied CSS actually reproduce `build-lot.ts`'s timeline?
     - Can NO-GO be reached at all, or is the failing control (`scenery-overload`) the only
       thing that could ever fail?
     - Is the INVALID grep a real gate?
     - Does DT15 consume the verdict unambiguously — is there a verdict DT15 cannot act on?

3. DT14's ACCEPTANCE. It is the only [MANUAL] phase and the only one whose deliverable is
   art, so its gate is the whole quality control:
     - Can a diligent Evan commit WRONG art that passes both halves (structural PASS +
       four visual statements)? Construct the cheapest counterexample you can — a sprite
       that satisfies every stated numeric threshold and is still unusable.
     - Are the thresholds (1600×900 / 800×1200, corner alphas 0, transparent fraction
       [0.15, 0.85], car α-bbox width ≥ 960, tree bbox bottom ≥ 0.95·height) each doing
       work, and is any of them satisfiable by a checkerboard/matte artefact?
     - Does the `?selftest=1` mode prove the checker itself is honest, or only that it runs?
     - Is "accept, then commit" recoverable if the art is later judged wrong?
   Relatedly, for DT13: do its consumer assertions prove the sky is WIRED, or could a
   token be declared and the page still render night by day? Does the `?period=night` pin
   on every existing navigation hide a class of regression the suite used to catch?

4. THE SVG FALLBACK, END TO END. This is the branch that fires when the image models fail,
   which is the likely case, and no one has walked it:
     - checker's placeholder export → DT14 commit → DT15 `ART_EXTENSION = 'svg'` →
       `mask-image: url(... .svg)` under `preserve-3d` → `art.spec.ts` canvas contract on
       an SVG (does `Image` + `drawImage` give real alpha for an SVG with intrinsic
       dimensions?) → nginx parity content-type `image/svg+xml`.
     - The scratch dir HAS four placeholder SVGs and a working draft. Run the path.
     - Does the DT14 acceptance checker's own thresholds pass on its own exported
       placeholders — i.e. is the fallback self-consistent, or would the checker reject
       the very art it generated?
     - The OPEN FLAG from the partial run: the loading ring plateaued at 83 % for ~2 s on
       four localhost SVGs before revealing. Diagnose it if you cheaply can (the loader's
       `decode()` on SVG is the standing suspect) and say whether it would be worse or
       better with real PNGs.

5. STRATEGIC RISK. Is the core assumption (≈88 masked planes + a blurred overlay at ≥ 50 fps;
   masks paint at all under `preserve-3d`) the right one, and is DT11 the cheapest way to
   falsify it? Is anything load-bearing measured only LATE — after several phases of work
   are already committed? Is the phase ORDER right given that DT14 is manual and blocking?
   What is the single most likely way this roadmap ends with wasted work?

6. ANYTHING ELSE that would bite at execution time.

Test each `## Done` CLAIM against the MECHANISM that is supposed to produce it: "every
screen still a link" (DT16), "the car never steals a click", "the ring's number stays
true" (SDS-006 with masks fetched by CSS), "nothing visible changes" (DT12).

OUTPUT
`findings.md` in your working directory, written incrementally as instructed above, then
a final message that reproduces it: a prioritized findings list, most severe first. For
each: severity (CRITICAL/MAJOR/MINOR), the phase and location, what is wrong and why it
bites, evidence (the command you ran and its real output, or the file and line you read),
whether the finding is VERIFIED or UNVERIFIED, and a concrete fix. If a claim checks out,
do not report it as a finding — put it on the "CHECKED, no defect" list. If you find
nothing major, say so plainly rather than padding the list; that is a useful result. End
with a one-paragraph judgement: would you execute this roadmap as written?
````
