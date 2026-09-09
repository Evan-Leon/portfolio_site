# Drive-In Theme roadmap — Part 3B Codex review (complete)

Run 2026-09-08 17:35–18:4x by the writing session on Evan's instruction ("can we finish
the adversarial?"), from `drive-in-theme-part3b-prompt.md` against portfolio_site
`7579eed` (roadmap) / `14f398b` (spec) and the standard at docs `0dad739`. Model
`gpt-5.6-sol`, reasoning high, workspace-write with network (banner confirmed).
**Exit 0 — 301 022 tokens, 33 commands, findings list written in full.** This completes
the review that `drive-in-theme-part3-codex-review.md` records as partial.

The process fix that made the difference: the prompt required `findings.md` to be created
as the first action and appended to as each finding formed, with a `CHECKED, no defect`
line for every claim cleared. The raw transcript (22 630 lines), the findings file and
four new probe scripts (`remount-probe.mjs`, `svg-contract-probe.mjs`,
`svg-loading-diagnosis.mjs`, `svg-render.png`) stayed under
`/tmp/claude-1000/dt-theme-part3b/` and are not committed. Probes ran against the
predecessor's scratch build (`/tmp/claude-1000/dt-theme-part3/sim/`) on `vite preview`
:4174 — reusing it, rather than rebuilding, is what kept this run inside quota.

**Result: 0 CRITICAL, 11 MAJOR, 4 MINOR. Judgement — would NOT execute as written.**

## Findings, as returned (severity and ordering are Codex's own)

| # | Sev | Phase / location | Defect | V? |
|---|-----|------------------|--------|----|
| 1 | MAJOR | DT11 `lot20`, roadmap 186–198 | The "production" probe omits all twenty decoded poster `<img>` that production appends to every screen surface, so GO can be measured on a lighter workload | V |
| 2 | MAJOR | DT11 decision step 1, roadmap 198 | A tree-paint failure jumps to step 4, skipping the car-only click/Tab gate — `(control valid, trees invisible, car 60 fps, car interaction FAIL)` returns NO-GO-TREES and ships a known-broken car | V |
| 3 | MAJOR | DT15/DT16 NO-GO-TREES branch, roadmap 778–851, 878–1016 | The sanctioned car-only path is internally unexecutable: the branch omits `scenery.ts` and trees, but unconditional constraints, build order, greps, the `cp`+`sed` falsification, manual checks and both `## Done` texts still require them | V |
| 4 | MAJOR | DT11 fps protocol, roadmap 197, 225–228 | The absolute ≥50 gate uses per-rAF `scrollTo`, leaving production's Lenis wheel-smoothing path idle — GO can be recorded without measuring the promised interaction | U |
| 5 | MAJOR | DT11 INVALID gate, roadmap 235–253 | The grep proves only that the verdict words appear in the header; it never invokes `renderSummary()` or tests precedence, so an implementation that unconditionally prints GO passes | V |
| 6 | MAJOR | DT14 car acceptance, roadmap 608–649 | Alpha-bbox vertical position, height and centring are unchecked: a correct 1200×500 wagon at `y=0` with 400 transparent rows below passes both halves and floats in the shipped `object-fit: contain` box | V |
| 7 | MAJOR | DT11 checker self-test, roadmap 199–201, 242–247 | `?selftest=1` passes with corner-alpha, transparency and bbox predicates mutated to constant `true` — it proves the page runs, not that the checker is honest | V |
| 8 | MAJOR | Firefox gate, roadmap 225–228, 903–904 | The spec names Chrome **and** Firefox in the core assumption (`design.md:341`); DT11 weakens it to "Firefox if installed" and DT16 is Chromium-only, so the likely path ships without ever testing the second browser | U |
| 9 | MAJOR | DT16 car click proof, roadmap 1027–1033 | The base-rule grep is not cascade-aware and the scan runs only at 390×720; an `@media (min-width: 768px) { .sds-lot__car { pointer-events: auto } }` regression passes every named mechanism and steals clicks on desktop | V |
| 10 | MAJOR | DT16 tree-mask proof, roadmap 951 | Only tree 0's masks are asserted. Removing both masks from tree 1 left `count=88 ready=88 visible=88` and tree 0 green while tree 1 computed `none` — the filled-rectangle failure displaced to 87 unchecked elements | V |
| 11 | MAJOR | DT12/DT15 glyph pipelines, roadmap 379, 815 | `… \| grep -E '✓\|✗\|×' \| head -40` returns `head`'s status: a Vite startup failure and a nonexistent filter both gave `pipeline_exit=0 pipe_statuses=1 1 0` | V |
| 12 | MINOR | DT11 GO-REDUCED, roadmap 196–198, 225–228 | `scenery-half` is measured for fps only; the reduced layout is never opened for paint/click/Tab before it is selected | V |
| 13 | MINOR | DT11 clip bias, roadmap 129–136, 196–198 | The probe cycles eight URLs across twenty elements, which can gain cache reuse sixteen distinct production clips cannot — "errs heavy" has no established direction | U |
| 14 | MINOR | DT11 commit path, roadmap 208–264 | ~~DT11 creates and stages two `.html` files but never runs `pnpm format`/`format:check`, so the Prettier hook stops a correct implementation at commit time~~ — **REJECTED, measured false** (see below) | ✗ |
| 15 | MINOR | SVG timing/order, roadmap 196–201, 951–952 | DT11 benchmarks PNG data-URL masks; the likely external-SVG-mask path first appears in DT15 and is browser-checked only in DT16 | V |

## Disposition: 14 accepted, 1 rejected

**Finding 14 is REJECTED — the claim was measured and is false.** Codex read
`.githooks/pre-commit` lines 59–63 (which select staged `.html|.css|.js|.ts` and run
`prettier --check` over them) but not Prettier's own handling of `.prettierignore`, which
is applied even to paths passed explicitly on the command line. `.prettierignore` contains
`docs/`, so the hook's check cannot fire on `docs/spikes/*.html`. Measured 2026-09-08 with
identical misformatted content in two places:

```text
$ ./node_modules/.bin/prettier --check docs/spikes/__fmt-probe.html
Checking formatting...
All matched files use Prettier code style!
exit=0
$ ./node_modules/.bin/prettier --check __fmt-probe-root.html
[warn] __fmt-probe-root.html
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
exit=1
```

The roadmap's original claim ("the pre-commit hook will not touch these files") was
correct, and now carries this measurement so it is not re-litigated. Note the trap:
`prettier --check` prints "All matched files use Prettier code style!" and exits 0 both
when files pass *and* when every file was ignored — the ambiguity is what makes this
worth measuring rather than reading.

The other 14 findings were accepted and folded in at the commit that follows this receipt.
Three of the five `7579eed` triage edits are themselves defective (findings 11, 10, 9);
the other two — the `awk` rule-block guards and the DT11 clip-residency note — came back
clean and UNVERIFIED-neutral respectively (finding 13 downgrades the note's claim, not
its numbers).

## What Codex cleared (selected — full list in the transcript's `CHECKED` lines)

| Claim under review | Method | Result |
|---|---|---|
| DT11's procedure is decidable | Four vectors walked by hand: `(45,55,58,60)`→GO, `(40,45,52,60)`→GO-REDUCED, `(30,40,45,48)`→NO-GO-ALL, `overload ≥ scenery`→INVALID first | Ordered, exhaustive, mutually exclusive — no vector lands on two verdicts or none. **No CRITICAL decidability defect.** NO-GO is reachable without the 351-plane control |
| `destroy()` / re-mount | `remount-probe.mjs` + the widened teardown unit test | No double-append and no leak: `lot-scene.ts:317–336` releases all four art URLs before the container empties; a remount gave `stages=1, trees=88, readyTrees=88, cars=1, carSprites=1` and four art requests. The one-scene production page never actually unmounts, so the unit remount is the real proof |
| The conformance kit sees the new nodes | Read `adapter-contract.ts:230–359`, `lot-scene.ts:339–364` | Not silently skipped — the widened snapshot observes tree count and car state; global listener leaks would still fail |
| SVG fallback end to end | `svg-contract-probe.mjs`, `svg-render-screenshot.mjs` against the inherited placeholders | **No defect in the fallback itself.** car 1600×900, corners `[0,0,0,0]`, fraction 0.5959, bbox 1100×570, PASS; three trees PASS with bbox bottom 1199. `Image.decode()`+`drawImage()` gives real SVG alpha; Chromium paints the SVG masks inside the transformed world (screenshot shows silhouettes, not rectangles); preview served `image/svg+xml` |
| The 83 % loading-ring plateau (open flag from Part 3) | `svg-loading-diagnosis.mjs` | **Diagnosed, and it is not SVG `decode()`.** The inherited probe delays every `/theater/art/*` route by 1500 ms. Loader hits 83 % at 255 ms; the four decodes start at 1736–1746 ms and each take **0 ms**; the ring's last 900 ms is the reveal fade. Without the route delay, decode is 0–0.1 ms and 83→100 takes ~33 ms. 83 % is truthful: 20 of 24 loader assets settled. Real PNGs would not improve it |
| DT13's sky assertions are consumer-level | Read roadmap 505–506, 522–568 | Afternoon must compute `rgb(59, 120, 200)` and night `rgb(10, 5, 32)` — a page that stays on night by day fails. No practical declaration-only hole |
| The `?period=night` pin | Compared old and new suites | Hides nothing: the page had no periods before DT12, and the new suite covers overrides, two clock fallbacks, visibility re-apply and an unpinned 14:00 visit |
| DT14→DT15 intermediate state | Read roadmap 49–52, 643–649, 683–688, 786–793 | Safe: art lands inert under `public/art/`, DT15 refuses to run without both a usable verdict and committed art, and has one end-of-phase commit. "Accept then commit" is recoverable — four immutable static files in Git |
| Phase ordering and the core assumption | Reasoned against the spec | Both sound: ~88 masked transformed planes plus two blurred glows are the real novel compositor cost, DT11 is the cheapest falsifier, and DT12/DT13 are correctly ungated because they hold value under every verdict |
| Narrow layout, docs runlog, "every screen still a link", "nothing visible changes" (DT12), SDS-006 ring truth | Reads and the live build | All assigned / mechanism-backed. The click-through spec parameterises over the live 20-entry `projects` array |

## Codex's judgement, verbatim

> I would **not execute the roadmap as written**. The overall architecture, phase ordering
> and SVG fallback are sound, and no CRITICAL/exclusive-decision defect remains, but DT11
> can still authorize work from a non-production workload and can bypass a known-bad car
> interaction; the valid NO-GO-TREES branch is internally unexecutable; and DT14 can accept
> spatially unusable art. Repair those outcome gates and branch contracts first. The
> remaining browser-coverage and verification holes are smaller but should be fixed in the
> same edit because their remedies are cheap.

## Open decisions for Evan (not mechanical fixes)

- **Finding 8 — Firefox.** Two legitimate resolutions: require a Firefox smoke on another
  host / a remote browser service before any tree-bearing verdict, **or** explicitly narrow
  the supported browsers and the spec's core-assumption sentence to Chromium. Codex notes
  `NO-GO-TREES` is the safe fallback if Firefox cannot paint the masks. This changes the
  spec, not just the roadmap.
- **Finding 4 — the fps protocol.** Moving the absolute floor onto a natural-wheel
  DevTools measurement makes DT11 more manual than currently written; the alternative is
  to keep the in-page harness for relative comparisons only and add a separate
  production-path floor measurement.

## Notes for the meta-prompt

Finding 11 is the **third** distinct consequence of the falsification-hygiene bullet's
class, and the first that is not about the package manager: a check whose exit status is
swallowed by its own pipeline. The bullet currently names `--` forwarding (Part 3) and
colliding flag names (Part 3 partial); the general rule is *a verification command must
carry the checked thing's exit status all the way to the shell*. Note also Codex's caveat
that `pipefail` is the wrong fix here, because `head` closing the pipe would create false
failures — capture to a file, check the status, then render.
