# Drive-In Theme DT13 — implementation review prompt (Codex adversarial)

DT13 (six time-of-day palettes, sun/moon orb, road markings, geometry-sized ground) was
implemented on 2026-09-09 with **one substantial departure from the roadmap's own
`<constraints>`**, which is the main thing this review exists to attack. The work is
uncommitted in the working tree at review time.

**Model:** `gpt-5.6-sol`, reasoning `high` — Evan's standing choice for adversarial runs.
Confirm the banner prints `model: gpt-5.6-sol`, `reasoning effort: high` and
`(network access enabled)` before trusting any probe result (`EVO-TOOL-105`).

**Launch** (from any directory):

```bash
mkdir -p /tmp/claude-1000/dt13-review && awk '/^````/{f=!f;next} f' /home/evan/EVOsystem/portfolio_site/docs/roadmaps/drive-in-theme-dt13-prompt.md \
  | codex exec -s workspace-write -c sandbox_workspace_write.network_access=true -c model=gpt-5.6-sol -c model_reasoning_effort=high -C /tmp/claude-1000/dt13-review --skip-git-repo-check - \
  | tee /tmp/claude-1000/dt13-review/review.md
```

````
Adversarial review of an IMPLEMENTATION (not a plan). Do not edit any file in
/home/evan/EVOsystem/portfolio_site; you are a reviewer, not an implementer. Read-only
probes against the repo and against the running container are encouraged; your working
directory is a scratch dir outside the repo and you may copy files into it. If your
sandbox blocks a probe, say so explicitly and mark the related finding UNVERIFIED rather
than reasoning from the source as though you had run it.

OUTPUT DISCIPLINE — READ THIS FIRST
FIRST ACTION, before any reading: create `findings.md` in your working directory with a
heading. APPEND each finding the moment you form it — severity (CRITICAL/MAJOR/MINOR),
file:line, what is wrong and why it bites, evidence (the command and its real output),
VERIFIED or UNVERIFIED, and a concrete fix. Never save findings for a final message; a
run that dies on a usage limit with an empty findings.md has produced nothing. Also
append a one-line "cleared:" note for each thing you checked and found sound, so the
next reader knows what was covered.

WHAT WAS BUILT
Repo: /home/evan/EVOsystem/portfolio_site (git repo, work is UNCOMMITTED — use
`git diff` and `git stash list` carefully; do NOT stash, checkout, or reset anything).
Phase spec: docs/roadmaps/drive-in-theme-roadmap.md, "## Phase DT13" (line ~563).
Approved wireframe: docs/wireframes/theater-drive-in-theme.html.
Touched: theater/src/lot/geometry.ts, geometry.test.ts, build-lot.ts, build-lot.test.ts,
theater/src/styles/tokens.css, global.css, theater/e2e/{period,keyboard,active-screen}.spec.ts,
theater/e2e/helpers/app.ts.

THE DEPARTURE, STATED PLAINLY SO YOU CAN ATTACK IT
The roadmap's `<constraints>` say the ground is one plane of `height: var(--sds-ground-depth)`
with the road as `.sds-lot__ground::after`. A DT11 measurement block at the top of the
phase overrides that: a plane that deep exceeds MAX_TEXTURE_SIZE and the whole scene
blinks during scroll on real hardware. The roadmap offered two unbuilt candidates —
SECTION the plane, or FOLD the road into the ground's background stack.

The implementer built the fold, MEASURED the sectioning and rejected it (N abutting planes
cost exactly what one plane costs, because the rastered AREA is unchanged), and instead
laid the plane out at `groundDepth(count) / GROUND_SQUASH` px and `scaleY(GROUND_SQUASH)`d
it back out — same world depth, a quarter of the texture. Every depth-direction length the
plane paints (the 140/320px dash period, the 780/784px parking rows) is divided by the same
constant so it cancels. `GROUND_SQUASH = 4` was chosen as the largest squash that keeps the
thinnest painted feature (the 4px parking-row hairline) at >= 1 texel.

ATTACK THESE, IN THIS ORDER

1. THE SQUASH ARITHMETIC. Is `translateZ(lead) rotateX(-90deg) scaleY(k)` on an element of
   height `depth/k` really equivalent, in world Z, to an unsquashed plane of height `depth`
   with the same origin? Derive it; do not take the comment's word. Check `transform-origin:
   50% 0` and the order of the three functions. Then check every cancellation: is EVERY
   depth-direction length in `.sds-lot__ground` divided by `--sds-ground-squash`, and is
   every ACROSS-the-plane length (14px strip, 420px lane, 4px edge lines) correctly NOT
   divided? A missed division is silent — the road just re-tiles at the wrong pitch.
   Prove it empirically if you can: serve the page and compare rendered geometry at
   `--sds-ground-squash` 1 vs 4 (override it with an injected style; the value reaches CSS
   as an inline custom property on `.sds-lot`).

2. THE TEXTURE-LIMIT CLAIM. `GROUND_RASTER_MAX = 8000` vs a stated MAX_TEXTURE_SIZE of
   8192. Does the invariant actually hold for the lot that ships, and is the test that
   checks it capable of failing? Does anything enforce it if someone adds projects? Is the
   claim "an eight-screen lot rasterises at 4000x2800, less than the 4000x4800 plane it
   replaces" true?

3. VACUOUS TESTS. The new cases in geometry.test.ts, build-lot.test.ts and period.spec.ts.
   For each, construct the mutation it should catch and check that it does. Particular
   suspicion: the `?period=` look assertions (do they read a CONSUMER or a declaration?),
   the `toContain(skyTop)` substring check, `brightness(0.75)`/`brightness(0.35)`, and the
   `::before` opacity read. Also: does anything at all assert the ROAD renders? The
   roadmap's `<verification>` only greps for `sds-road-line`.

4. THE TWO RAISED TIMEOUTS. `test.slow()` was added to keyboard.spec.ts and
   active-screen.spec.ts. Is that hiding a real regression rather than accommodating a
   legitimate one? Run the suite. Was anything else about those tests weakened?

5. TOKENS. tokens.css must have six `[data-period]` blocks, each with BOTH `:host([...])`
   and `:root[...]` (SDS-009 — a `:root`-only block silently matches nothing in the Wix
   shadow-root build). Check each block against the wireframe's values, value by value —
   this is a transcription and transcriptions have typos. Check that each block restates
   only what the wireframe restates, that `--sds-road-line`/`--sds-road-edge` are never
   restated, and that no `var(--token, #hex)` fallback was introduced (EVO-UNI-030).
   A new role `--sds-road-surface` was added that the roadmap did not ask for — judge it.

6. NIGHT PARITY. The roadmap requires night to render numerically identically to before
   the phase (sky gradient, asphalt, screen brightness, marquee). The implementer claims
   this was verified by probing computed styles on both builds. Re-verify independently —
   `git stash` is FORBIDDEN, so build HEAD into a separate directory (e.g. copy the repo to
   your scratch dir with `git worktree` or `git archive`) rather than mutating the checkout.

7. WIREFRAME FIDELITY (EVO-UNI-048). The built lot must carry what the wireframe shows for
   this phase: orb, star layer as its own opacity-carrying layer, road markings, ground to
   the horizon in every period. Trees, the car and the beam are DT15 and out of scope.
   Check the orb's DOM position and z-index, and that it does not move with the drive.

8. ANYTHING ELSE THAT BITES. Accessibility of the new orb element, the `.sds-lot::before`
   star layer's interaction with `pointer-events` and the click-through spec, the narrow
   (<=767px) layout, whether `transform-style: preserve-3d` was correctly dropped from the
   ground, and whether removing `.sds-lot__ground::after` broke anything that referenced it.

HOW TO RUN THINGS
  cd /home/evan/EVOsystem/portfolio_site
  pnpm format:check
  pnpm -C theater typecheck && pnpm -C theater lint && pnpm -C theater test
  cd theater && ./node_modules/.bin/playwright test        # builds + serves on :4173 itself
The container serves the CURRENT build at http://portfolio-site.localhost/theater/
(also http://localhost/theater/ with `-H 'Host: portfolio-site.localhost'`), and
`?period=<dawn|morning|afternoon|sunset|evening|night>` selects a palette. Port 4173 may be
occupied by a stale preview; check `ss -ltnp | grep 4173` before running Playwright.

Rules you are holding the work to: /home/evan/EVOsystem/infra/skills/rules-index/references/universal.md
and portfolio_site/theater/skills/rules-index/SKILL.md. Cite rule IDs where they apply.

Finish with a findings list ordered by severity and an explicit statement of what you
CLEARED. Being wrong about a real defect costs less than a polite pass on one.
````
