---
date: 2026-09-09
agent: claude-code
type: qa
mode: attended
phases: []
repos: [portfolio_site]
---

## Accomplished

Answered "how realistic is the theater on mobile" by measuring rather than
estimating, then shipped the one change the answer implied.

**The finding: it already worked.** The `@media (max-width: 767px)` block in
`theater/src/styles/global.css` (built in DT5, kept current through DT13–DT16)
lays the lot out single-file down the lane with a rescaled marquee, a pulled-in
treeline and a 64vw wagon. Nothing in the engine needed changing. The only thing
standing between a phone visitor and the theater was DT7's
`.hero__cta--theater { display: none }` inside the site's own 767px block — a
rule written before the narrow lot had ever been looked at on a phone.

**Done:** removed that rule (the `prefers-reduced-motion` twin stands); rebuilt
and recreated the container; verified against the served stylesheet and, after
the change reached `evanleon.com`, against the live public site.

**Confirmed on real hardware by Evan** — the part no emulation could settle:
the theater runs on iPhone Safari and on iPhone Chrome. This closes the session's
one identified blocker, `transform-style: preserve-3d` (`global.css:304`) under
the `overflow: hidden` sticky pin (`engine/engine-styles.ts`): had WebKit
flattened that subtree, the drive would have collapsed to stacked flat screens
and the feature would have been dead on iOS. It does not.

**Attempted and inconclusive:** frame cost. Measured, but in headless Chromium
on SwiftShader, so the numbers bound nothing about a phone GPU — see Open flags.

**Ruled, not done:** no roadmap was written. Evan pointed at
`docs/meta-prompts/roadmap/roadmap-meta-prompt.md`; the assessment was that the
remaining scope (a real-device pass whose findings were unknown until it ran)
was not roadmap-shaped, and that writing phases for a verification pass would be
inventing scope to fill a template. The device pass then came back clean, which
retired the question rather than deferring it.

## Commits

portfolio_site:

- `f468b08` — feat(hero): show the "Enter the Drive-In" CTA on phones
- (this log) — docs(session): the theater already worked on mobile

## Uncommitted work left behind

None.

## Verification

Measurements — Playwright/Chromium against `vite preview` on port 4188 serving
a fresh `pnpm -C theater build`:

- Layout at 390x844 DPR3, screenshots at three points of the drive — **pass**,
  single-file lot renders correctly.
- Page/console errors across `desktop-1440x900-dpr1`, `phone-390x844-dpr3`,
  `phone-390x844-dpr3-cpu4x`, `phone-390x844-dpr1` — **none in any case**.
- Tap a lit screen on emulated Pixel 7 → navigates to
  `/projects/spead-read.html` — **pass**.
- Touch-scroll not blocked: `html`/`body` computed `overflow: visible`,
  `touch-action: auto`; `html` carries `lenis lenis-scrolling`;
  `lenis@1.3.26` default `syncTouch = false` read from
  `node_modules/lenis/dist/lenis.mjs` — **pass** (Lenis observes momentum
  scroll, does not hijack touch).
- iOS autoplay shape: `build-lot.ts:494-496` sets `muted`/`loop`/`playsInline`;
  `lot-scene.ts:448,481` pauses the previous clip before playing the next —
  **pass**.
- No screen/wagon overlap at 390px, so DT16's finding holds — **pass**.
- Mean ms/frame over a 120-frame scripted scrub: desktop 1440x900 DPR1 **57.7**
  (p95 123.5); phone 390x844 DPR3 **41.4** (p95 78.9); same + 4x CPU throttle
  **41.7**; phone DPR1 **40.5**. See Open flags for why this bounds nothing.
- Transfer weight: **0.95 MB** to first paint (0.71 MB posters); clips total
  **6.4 MB** on disk across the 20-screen drive.

Post-change, against the rebuilt container:

- `docker compose build && docker compose up -d --force-recreate` — **pass**.
- `/`, `/theater/`, `/assets/css/styles.css` all **200**.
- Served stylesheet: `hero__cta--theater` occurrences inside the 767px block
  **0**, inside the `prefers-reduced-motion` block **1** — **pass**.
- Emulated Pixel 7 on the container: CTA visible, tap navigates to `/theater/` —
  **pass**.
- Pre-commit hook (`prettier --check` on staged CSS) — **pass**.

Post-change, against `https://evanleon.com`:

- Live stylesheet byte-identical to the local post-edit file (20,249 bytes,
  single hide rule at line 1007) — **pass**.
- Emulated Pixel 7, `reducedMotion: no-preference`: CTA present, visible,
  `display: block` — **pass**.
- Same with `reducedMotion: reduce`: `display: none` — **pass** (expected; the
  surviving rule).
- Real iPhone Safari and iPhone Chrome, by Evan — **pass**.

Not run: `pnpm -C theater test`, `pnpm -C theater test:e2e`. No theater source
was touched, so neither suite covers the change; the site CSS has no suite.

## Blockers

None. One false alarm: Evan reported the CTA missing on his phone, which was his
Chrome cache holding the pre-change stylesheet — Cloudflare serves
`assets/css/styles.css` with `cache-control: max-age=14400`, so a phone that
loaded the site before the deploy holds the old CSS for up to four hours. Cleared
on its own.

## Open flags

- **Posters are desktop screenshots.** At a 300px-wide narrow screen a full
  desktop UI is illegible. This is the one real design gap mobile exposes, it is
  content rather than engine, and it is unaddressed. Phone-shaped crops would be
  20 projects of work — the only part of this subject that could become
  roadmap-shaped.
- **The frame-cost numbers bound nothing about a phone.** They are software
  rasterization on a desktop CPU. Their only honest use is the shape they show —
  cost tracking composited screen area, unmoved by 4x CPU throttling, which is
  DT11's signature for the ground layer's raster scale being pinned rather than
  tracking DPR. Real-device *smoothness* over a full 23,000px drive, and battery
  and thermal behaviour, remain unmeasured; Evan's pass confirmed it renders and
  works, not that it holds 60fps.
- **iPhone Chrome is not a second engine.** iOS requires WebKit, so both of
  Evan's confirmations are the same renderer in two shells. Android Chrome
  (Blink) on real hardware is still unconfirmed — expected fine, since the
  emulated Blink cases were the ones measured here.
- **The reduced-motion hide survives deliberately.** `.hero__cta--theater` is
  still `display: none` under `prefers-reduced-motion: reduce`
  (`assets/css/styles.css:1007`), because the theater *is* the animation and no
  narrow layout changes that. Anyone with Reduce Motion on will not see the
  button — which is the intended behaviour, and also the second thing to check
  before believing a "the button is missing" report.
- **RESOLVED — `f468b08` reaching `origin/main` was Evan pushing it by hand.**
  Flagged during the session because no `git push` ran here, there is no
  `.github/workflows`, and the only hooks under `.githooks/` are git-lfs, yet
  `evanleon.com` was serving the change within minutes. Evan confirmed he pushed.
  No automation is involved and this repo still deploys by an explicit human push;
  nothing to change.

## Rules-index candidates

- **Draft:** A capability gate written for a subject that later changes must be
  re-checked against the subject, not the gate's stated reason. DT7 hid the
  theater CTA on phones when no one had looked at the theater on a phone; DT5 had
  already built the narrow lot, and DT13–DT16 then maintained it — four phases of
  work on a layout that no site visitor could reach. Nothing errors, no test
  fails (the narrow block has its own e2e coverage and passes), and the loss is
  invisible because the gate makes the broken-looking case unreachable too. The
  tell is a `display: none` whose comment names a *judgement* about the hidden
  thing rather than a *property* of it.

  Worth weighing against the index's own bar before adding: the failure story is
  real and cost four phases, but the rule is closer to a review habit than to an
  engine invariant, and the index deliberately holds only ten. Recommend Evan
  rules on it rather than a session adding it unilaterally.

## Meta-prompt / skill / doc updates

- NO-CHANGE: `theater/skills/rules-index/SKILL.md` — loaded per CLAUDE.md before
  theater work. `SDS-004` and `SDS-010` framed the frame-cost question correctly
  and `SDS-009`'s scoping was checked against the narrow block; served as
  written, and nothing this session did touched an invariant.
- NO-CHANGE: `docs/meta-prompts/roadmap/roadmap-meta-prompt.md` — read in full to
  decide whether this warranted a roadmap. Its guidance was sound and correctly
  led *away* from itself: the scope was unknown until the device pass ran, which
  is exactly the shape its Part 1/Part 2 structure is not for. No defect found.
- NO-CHANGE: `.claude/skills/rebuild-restart/SKILL.md` — followed exactly. The
  `--force-recreate` warning and the "poll `/` until 200 rather than concluding
  failure" note both earned their place; the first poll after recreate did return
  non-200.
- NO-CHANGE: `docs/roadmaps/drive-in-theater-roadmap.md` § DT7 — deliberately not
  edited. The phase is a shipped historical record and describes what DT7 did;
  reversing its CTA decision is recorded by `f468b08` and this log, not by
  rewriting the phase.

## Next steps

- Decide the poster question: leave desktop screenshots as-is on phones, or
  commission phone-shaped crops for the 20 projects. Only the second is
  roadmap-shaped.
- Rule on the rules-index candidate above.
- Optional: open the theater on an Android phone to close the Blink-on-real-
  hardware gap.

## Pointers

- `docs/roadmaps/drive-in-theater-roadmap.md` — DT5 (narrow layout), DT7 (the
  CTA hide reversed here), DT10 (delivery).
- `docs/roadmaps/drive-in-theme-roadmap.md` — DT11 (ground-plane raster cost,
  the measurement this session's frame numbers are read against), DT16.
- `theater/src/styles/global.css:986` — the narrow block this session validated.
