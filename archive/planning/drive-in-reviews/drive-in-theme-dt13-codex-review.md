# Drive-In Theme DT13 — Codex implementation review (complete)

Run 2026-09-09 by the executing session on Evan's standing offer ("if you want an extra set
of eyes on anything you can ask codex for an adversarial — only use gpt-5.6-sol"), from
`drive-in-theme-dt13-prompt.md` against the **uncommitted DT13 working tree** on top of
portfolio_site `baa6b6f`. Model `gpt-5.6-sol`, reasoning high, workspace-write with network
(banner confirmed per `EVO-TOOL-105`). **Exit 0 — 547 717 tokens, findings written to disk
as they formed.**

Unlike the roadmap reviews that precede it, this one reviewed an **implementation, not a
plan**, and it ran *while* the implementation was still being edited — so four of its
findings were fixed mid-run and it re-verified the fixes itself in a fresh copy of the
tree. The raw transcript (59 477 lines), `findings.md`, three scratch build copies
(`baseline/`, `current/`, `latest/`) and its probe scripts stayed under
`/tmp/claude-1000/dt13-review/` and are not committed. No repository file was edited by
Codex.

**Result: 0 CRITICAL, 6 MAJOR, 2 MINOR. All 8 accepted — 6 fixed, 2 accepted-and-recorded.**

## Findings, as returned

| # | Sev | Location | Defect | V? | Disposition |
|---|-----|----------|--------|----|-------------|
| 1 | MAJOR | `geometry.test.ts` 33–37, 110–127 | `projects.ts` holds **twenty** projects; the texture-limit tests were bound to the literals 8 and 20 and to nothing production reads, so the cap (crossed at 35 projects) could be passed silently. The "4000x2800, smaller than the plane it replaces" claim was false for the shipping lot | V | **FIXED** — test bound to `projects.length`; three derived size claims corrected |
| 2 | MAJOR | `period.spec.ts` 137–161 | `expect(sky).toContain(skyTop)` is satisfied by a sky with its stops in the wrong order — swapping `--sds-sky-top` and `--sds-sky-low` inverted the sky and left both tests green | V | **FIXED** — both periods pin the complete three-stop value with positions |
| 3 | MAJOR | `period.spec.ts` 171–183 | Both assertions sampled an **unlit** screen, so nothing proved a lit one reaches full brightness. Collapsing the filter to `brightness(var(--sds-unlit-floor))` leaves every screen dim, and both look tests *and all of `active-screen.spec.ts`* stayed green | V | **FIXED** — both ends of the interval asserted |
| 4 | MAJOR | `global.css` 347–375, all specs | Nothing asserted the road **renders**. Making the lane equal the apron and both markings `transparent` left all 13 period tests passing; the phase's own grep proves only that a token is spelled | V | **FIXED** — road consumer test in both periods; four mutations fail it |
| 5 | MAJOR | `global.css` 573 (narrow rule) | **Screens 1–19 are unclickable at 390px.** The narrow layout centres every screen with zero yaw, so screen `i-1` — nearer and larger — owns screen `i`'s centre. Pre-existing; `click-through.spec.ts` only runs at desktop width | V | **ACCEPTED, not fixed** — verified independently, out of DT13's scope, needs a composition decision. Recorded as an open flag; a phase is proposed |
| 6 | MAJOR | `geometry.ts` 239 + tests | The texture cap compares **CSS pixels** with a `MAX_TEXTURE_SIZE` in **device texels**. Same unit only at DPR 1; at DPR 2 the shipped 5200px plane is nominally 10400 texels, back over 8192. (Real tiling UNVERIFIED — SwiftShader) | V (unit gap) / U (symptom) | **ACCEPTED** — every "one untiled layer" claim qualified with the display; `GROUND_SQUASH` unchanged pending Evan's hardware |
| 7 | MINOR | `global.css` 367 | The **one-texel parking row is the entire reason `GROUND_SQUASH` is 4** and nothing guarded it: widening 780/784 to 780/782 yields a half-pixel line and every road assertion still passed | V | **FIXED** — computed `195px` / `196px` stops pinned; the mutation fails |
| 8 | MINOR | `keyboard.spec.ts` 80, `build-lot.ts` 202, `period.spec.ts` 324 | Obsolete eight-screen prose, including the false `4000x2800` | V | **FIXED** — plus three pre-existing instances in `build-lot.ts` and `main.ts` |

`V` = Codex verified it by running a mutation or a runtime probe; `U` = it said so and marked
it unverified rather than reasoning as though it had checked.

## What it cleared

Each of these was probed, not read:

- **The squash arithmetic.** It derived `translateZ(lead) rotateX(-90deg) scaleY(k)` on a
  plane of height `depth/k` independently and confirmed in Chromium that the projected
  ground rectangles at squash 1 and 4 are **exactly equal** (`rectDelta` 0 on all four
  sides), with depth-axis paint lengths 140/320/780/784 → 35/80/195/196 and the
  across-axis 14/420/4 untouched.
- **The registry guard** it asked for: 15 dummy projects push the raster to 8200px and fail
  the new test.
- **The six palettes** — its own declaration-map diff against the wireframe, `diffs=0` per
  period; `SDS-009` scoping 6 `:host` / 6 `:root`; road roles declared once; no hex `var()`
  fallback (`EVO-UNI-030`); `--sds-road-surface` judged a justified role.
- **Night parity** against an independently built HEAD copy — same sky gradient, same ten
  star gradients moved intact to the opacity-1 layer, same asphalt roles and gradient, same
  `brightness(0.35)` unlit and `brightness(1)` lit, same marquee background/border/halo.
- **The orb**: one `aria-hidden` stage child outside the world, `z-index: 0` against the
  world's `1`, `pointer-events: none`, and its rect **byte-identical** while the world drove
  1680 → 8400px.
- Star layer `pointer-events: none`; all 20 desktop click-through links; the removed
  `::after` and dropped `transform-style` have no surviving consumers.
- **Both `test.slow()` calls** preserve every assertion and reflect measured runtime
  (keyboard 33.5s, active-screen 27.7s in a full parallel run against a 30s default).
- The static gates and both builds, re-run in isolated scratch copies.

## What it refused to clear

**The hardware residual.** Its Chromium reports `ANGLE … SwiftShader Device`, not Evan's
GPU, so it can verify the squash *mechanism* and not the *symptom* DT11 observed. It
explicitly declined to convert that into a pass. Finding 6 sharpens the residual rather than
resolving it: the check Evan makes on real hardware should now also read
`window.devicePixelRatio`.

## Process note

The prompt required `findings.md` to be created as the first action and appended to as each
finding formed — the fix carried over from the Part 3 run that died on quota with nothing
written. It worked: every finding above survived, including the four that were fixed
mid-run, and Codex added a "Resolved during the live review" section verifying the fixes
against its own original mutations.

Two of its findings landed on checks the executing session had **rationalised in comments**
— the sky substring was defended in prose as avoiding duplication, and the brightness
assertion sampled only the end of the interval that moves. Both comments argued for the
weaker check. That is the specific value an adversarial run adds over self-review.
