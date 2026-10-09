# Drive-In Theme roadmap — Part 3 Codex review (partial: usage limit)

Run 2026-09-08 by the writing session on Evan's per-instance approval, from
`drive-in-theme-part3-prompt.md` against portfolio_site `a572b5e` / `14f398b` and the
standard at docs `b6c9a6a`. Model `gpt-5.6-sol`, reasoning high, workspace-write with
network (banner confirmed). **Codex hit its usage limit after 285 307 tokens and 95
commands with no findings list written** (`ERROR: You've hit your usage limit … try again
at 3:38 PM`). Evan: "We hit codex quota, fold in what you can from the review." This
file is the normalised receipt: what the transcript shows Codex verified and found,
severities assigned by the writing session, and the disposition of each. The raw
transcript (37 322 lines) stayed under `/tmp/claude-1000/dt-theme-part3/` and is not
committed; its three probe scripts (`click-scan-probe.mjs`, `dt15-runtime-probe.mjs`,
`loading-ring-probe.mjs`) drove a scratch copy of the theater with Codex's own DT15
draft (scenery.ts, art.ts, build-lot.ts, lot-scene.ts, global.css) served by
`vite preview` on :4174.

## What Codex verified (no change needed)

| Claim under review | Method | Result |
|---|---|---|
| Part 2's scan-based click-under-the-car test (DT16) | `click-scan-probe.mjs`: 30 samples over screen 0's and 1's bands at 390×720 against the real lot with the wireframe's car box | First overlap at sample 29, progress 0.0690 (world z 1160); `elementFromPoint` at the intersection centre → `span.sds-screen__base`, `.closest('a.sds-screen')` → index 0; with `pointer-events: auto` on the car → `div.sds-lot__car`. The design is decidable and its falsification flips it. |
| DT12's typed-stub falsification and copy restore | In the scratch theater: `cp` backup, the exact `sed` + `printf` stub, `tsc --noEmit`, `cp` back, `cmp` | `falsified_tsc_exit=0 restored_cmp_exit=0` — the stub compiles (so the spec would fail on behaviour) and the restore is byte-exact. |
| SDS-006 with CSS-fetched masks (DT15) | `dt15-runtime-probe.mjs` on Codex's DT15 draft: network log filtered to `/theater/art/` | Exactly four requests (car + three masks), all `resourceType: image`; the `mask-image` set from JS after the loader resolved produced no second download. 88 trees `ready`/visible, first mask `url(".../art/tree-1.svg")` on both `mask-image` and `-webkit-mask-image`; car `ready` with a 140px-high box (`aspect-ratio` works). |
| The widened contract assertion (DT15) | Its first draft left `lot-scene.contract.test.ts:76` unwidened | The "declares every poster … and nothing else" test failed with the four art URLs as the diff; widening it per the roadmap made the four-file lot suite green (39/39). |
| Loading ring with four more assets | `loading-ring-probe.mjs` | Ring at 0% → 83% (posters + inner) → revealed at ~3.2 s with car `ready` and 88 trees `ready`; no early reveal. (The ~2 s plateau on four localhost SVGs is unexplained — see open flags.) |
| DT13's clip-residency premise for DT11 | `for path in $(… projects.ts …)` | 16 of 20 projects have a real `demo.mp4`; four fall back to the poster. |
| Prettier over the DT15 draft | `prettier --write` on the six drafted files | One file reformatted (the multi-line `transform` in `.sds-tree`); selector lines unchanged, so DT16's `sed` anchors survive. |
| Pins | `git show` on `a572b5e`, `14f398b`, `b6c9a6a` | All resolve. |

## What Codex found (folded in — severities assigned by the writing session)

1. **MAJOR — vacuous verbose-suite check (DT12, DT15 `<verification>`).**
   `pnpm -C theater exec vitest run --reporter=verbose src/lot 2>&1 | grep -E '✓|✗|×'`
   produced `glyph_count=0`, `PIPESTATUS=1 0 1 0`: pnpm parses `--reporter=verbose` as
   its **own** flag and exits 1 before vitest runs, so the "all ✓" check printed nothing
   and could never fail. The same command through the binary
   (`./node_modules/.bin/vitest run --reporter=verbose src/lot`) printed 39 `✓` lines.
   **Fix applied:** both lines now call the binary directly from `theater/`; every
   Playwright filter uses the binary too for one consistent form. (Second consequence of
   the same pnpm-forwarding class the meta-prompt's new bullet describes — the bullet's
   example named `--`, this is a colliding flag name.)
2. **MAJOR — `data-mask="ready"` + `visibility` cannot see a lost mask (DT16
   `scenery.spec.ts`).** Forcing every tree to `mask-image: none !important` left the
   spec's two assertions true (`ready: true, visible: true, matrix [-900,-100,1.05]`)
   while the trees would paint as filled rectangles. **Fix applied:** the spec also
   asserts the first tree's computed `mask-image` / `-webkit-mask-image` contains
   `art/tree-1.` (consumer-level, `EVO-UNI-017`).
3. **MINOR — the `-A12` / `-A8` pointer-events guards (DT15 `<verification>`) are fragile
   to Prettier's wrapping** (its draft's `.sds-tree` transform became five lines).
   **Fix applied:** the guards extract the whole rule block with `awk '/^sel \{$/,/^\}/'`.
4. **MINOR — "Done" claims rest on one sampled screen in Chromium** (Codex's second
   interim message: "their permanent tests cover only one sampled screen and Chromium").
   **Fix applied:** DT16's `## Done` states exactly what the browser proof covers
   (screen 0, 390×720, Chromium) and that generalisation comes from the
   `pointer-events: none` rule the falsification shows is load-bearing; DT16's context
   carries the measured overlap numbers.
5. **MINOR — DT11's decoder-residency sentence** now records that production has 16
   clips and four poster-fallback screens, so the probe's 20 cycled clips err heavy.

Lenses Codex did not reach before the limit: omissions (half-executed DT15,
destroy/re-mount, Firefox), DT11's procedure decidability, DT14's acceptance, the SVG
fallback end-to-end, strategic risk. Outcome-vs-correctness: findings 2 and 4 are about
outcomes (a passing test over a broken render; a Done broader than its proof), 1 and 3
about mechanism.

## Open flags from the transcript

- The loading ring plateaued at 83 % for ~2 s on four localhost SVG files in the scratch
  run before revealing. Not diagnosed. DT16's manual check should watch the ring timing
  with the real PNGs; if it recurs, the loader's `decode()` on SVG is the first suspect.
- In the scratch copy `pnpm` (corepack 11.20.0) refused the repo's `packageManager`
  pin (11.15.1) until `--pm-on-fail=ignore`; the repo's own `pnpm` works. Scratch-only.
