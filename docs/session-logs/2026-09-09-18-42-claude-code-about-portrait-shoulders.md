---
date: 2026-09-09
agent: claude-code
type: feature
mode: attended
phases: []
repos: [portfolio_site]
---

## Accomplished
Corrected three anatomy defects in the About Me portrait (`images/evan-about.png`)
and shipped the result: asymmetric shoulders, an absent neck, and a head whose axis
did not match the torso's. Diagnosed each numerically before regenerating —
the shoulder mismatch measured 0.11 of image height at the 30% inset (0.550 viewer-left
against 0.660 viewer-right), and the missing neck traced to an overcorrection in the
2026-09-09 portrait session, which asked to "reduce the overly large exposed neck area"
and overshot into no neck at all.

Ran the edit through Codex (`gpt-6-astra`) as a localized edit over the existing
portrait, with IMG_3366 governing only real neck/shoulder anatomy and hoodie drape.
Four tries; accepted try 2. Shoulder mismatch is now 0.012 / 0.064 / 0.039 at the
10 / 20 / 30 % insets, a neck column with jaw shadow is present, and the head sits
square on it. `EVOsystem` chest lettering, face, background, lighting and square
framing all preserved.

Ruled against try 3 explicitly: it reached a better shoulder symmetry (0.027 at the
20 % inset) but paid for it by shrinking the head ~4 % and shifting it down (head
width 0.375 against the original 0.392), which risks reintroducing the pasted-on-head
look this portrait's history shows was the earlier complaint. Try 2 holds original
head geometry to within 0.002 on every measured axis. Try 4 regressed on both axes
and was discarded.

Attempted and abandoned: a lossless PNG re-encode at maximum effort, to avoid shipping
a file larger than the one replaced. It came out 36 % larger (2.74 MB against 2.01 MB),
so the generator's bytes were committed untouched.

**Second phase, after the shipped correction was still wrong on the eye.** Evan judged the
neck still too wide and proposed starting over rather than editing again — the same
conclusion this log's Open flags had already reached from the measured head-geometry wander.
Changed the *source* instead of the prompt: the portrait is now built from IMG_3366, a real
photograph, with the person carried across and only the surroundings altered (room and grey
squaring-margins replaced with the site's blurred warm interior; the child's hand, forearm
and sleeve removed and the hoodie shoulder continued through; `PUMA` chest lettering
replaced with `EVOsystem`). His neck width, shoulder line, head tilt and the camera's low
viewpoint are now photographic and therefore no longer things a generator can get wrong.

Four tries; Evan chose try 1 on sight from all four served side by side (copied into
`images/` as untracked `_tmp-*` files, served over the rebuilt container so he could compare
them in a browser, then removed). Installed and rebuilt. `greyFrac` 0.0152 against the
target's 0.3393, so the squaring margins are painted out.

**Third phase, on request:** cleared this log's own oversized-asset flag. The portrait is now
a 600 px WebP at 32 KB in place of a 1254 px PNG at 1.9 MB — a 61× reduction for an element
rendered at 174 px — with `index.html`'s single reference updated and the PNG dropped rather
than left baked into the nginx image. WebP over a smaller PNG because the subject is
photographic (PNG at 522 px still cost 124 KB, JPEG 34 KB, WebP 25 KB) and transparency was
never in play: the circle is CSS and the image is opaque RGB.

Two things deliberately not claimed: the image tool is generative and reconstructs rather
than compositing, so the result is **photo-derived, not photo-exact** — the run's agent
rejected all four tries on exactly that ground (its reasoning is in the realphoto runlog),
and the ruling to accept try 1 was Evan's. And the neck could not be measured numerically:
a skin-run width detector was written and then discarded because the beard breaks contiguous
skin runs, making its head-width figures (127–185 px on 1254 px images) obviously wrong. The
neck judgement in this phase is visual only, and was Evan's.

## Commits
portfolio_site:

- `9eec25a` — `fix(about): correct portrait shoulders, neck and head axis` (superseded by
  `b426795`; the measured correction landed but the result was still wrong on the eye)
- `3fffc36` — `docs(session): record the about-portrait shoulder and neck correction`
- `b426795` — `feat(about): replace the synthetic portrait with the real photograph`
- `4bf3dc1` — `docs(session): the portrait is now the real photograph`
- `baa2323` — `perf(about): serve the portrait at render size as WebP, 1.9 MB -> 32 KB`
- `<this commit>` — `docs(session): close the oversized-portrait flag`

## Uncommitted work left behind
None.

## Verification
- `node inspect.mjs` on all four tries and on the installed file — pass; final
  shoulder pairs `0.012 / 0.064 / 0.039`, `square: true`, `hasAlpha: false`, 1254×1254.
- Head-geometry measurement (skin bbox width / height / centre-y) across original and
  all four tries — pass; accepted try within 0.002 of original on every axis.
- Visual inspection of every try at full frame, at the 174 px circular crop the page
  actually renders, and as before/after crops of the neck, face and chest lettering — pass.
- `sha256sum` source against installed file — pass, identical.
- `docker compose build && docker compose up -d --force-recreate` — pass.
- Served-bytes check: `curl` of `/images/evan-about.png` sha256 against the committed
  file — pass, identical.
- HTTP checks for `/`, `/images/evan-about.png`, `/assets/css/styles.css`,
  `/images/favicon.png` — pass, all 200.
- `fold_back_audit.py` over `docs/session-logs/` — pass; `pending=0 needs_decision=0`,
  one pre-existing `APPLIED_NO_COMMIT` (memory files, not repo-tracked) left as found.
- Second phase — `node inspect.mjs` on all four real-photo tries: pass; `greyFrac`
  0.0152 / 0.0014 / 0.0054 / 0.0052 against the target's 0.3393, all under the 0.02 gate,
  all `square: true` / `hasAlpha: false` / 1254×1254.
- Second phase — visual verification that skin texture survived rather than being smoothed:
  pores, forehead crease, the mole and individual beard hairs all present at 1:1. Pass.
- Second phase — `sha256sum` of the installed file against the run's `raw/portrait-try1.png`:
  pass, identical.
- Second phase — `docker compose build && up -d --force-recreate` (twice: once to serve the
  four candidates for review, once after installing the choice) — pass both times.
- Second phase — served-bytes check on `/images/evan-about.png` against the committed file:
  pass, identical. Core paths `/`, portrait, stylesheet, favicon: 200.
- Second phase — confirmed the five `_tmp-*` review files are gone from the served image
  (404 on each `_tmp-candidate-N.png`) and absent from the working tree. Pass.
- Discarded as unreliable: a neck-width/head-width ratio measurement. The beard breaks
  contiguous skin runs, so its head widths were plainly wrong; conclusions were not drawn
  from it. Recorded here because a discarded measurement is a verification result.
- Third phase — format/size comparison at 522 px and 600 px across PNG / WebP / JPEG, and a
  side-by-side of the 1.9 MB PNG against the 32 KB WebP at real 2× render size inside the
  circular crop: pass, visually indistinguishable.
- Third phase — reference sweep for `evan-about` across `.html/.css/.js/.ts/.tsx/.json/.conf/
  Dockerfile*` before deleting the PNG: exactly one hit (`index.html:189`), now updated.
- Third phase — `docker compose build && up -d --force-recreate`, then: `/` and
  `/images/evan-about.webp` 200 with `Content-Type: image/webp` and `Content-Length: 32588`;
  `/images/evan-about.png` 404 as intended; the served homepage references
  `images/evan-about.webp`; served WebP sha256 identical to the committed source. All pass.
- Prettier pre-commit hook — no-op on the image-only commits (no staged `.html`/`.css`/`.js`);
  fired and passed on `baa2323`, which staged `index.html`.
  `core.hooksPath=.githooks` and `node_modules/.bin/prettier` both confirmed present.

## Blockers
None.

## Open flags
- RESOLVED in the third phase — the oversized asset. Was 1.9 MB of PNG for an element
  rendered at 174 px; now a 600 px WebP at 32 KB (`baa2323`), a 61× reduction, verified
  indistinguishable at real 2× render size inside the circular crop.
- RESOLVED in the second phase — the flag that the portrait was synthetic and a sixth
  corrective edit would cost more than starting from the photograph. That is what happened:
  `b426795` replaces it with a photograph-derived portrait, and the compounding-drift
  problem is gone with it.
- RESOLVED in the second phase — the residual 0.064 shoulder mismatch. Moot; that image is
  no longer served.
- The portrait is photo-derived, not photo-exact: the image tool reconstructs rather than
  compositing real pixels. Verified the texture is genuinely photographic and not smoothed,
  but a future session should not describe this file as "the untouched photograph."
- The source photograph is a selfie, so a slightly low camera angle and a real head tilt
  come with it. Accepted knowingly by Evan when choosing this route over a fresh synthetic
  generation; they read naturally precisely because they are real.

## Rules-index candidates
None. The theater's rules index governs `theater/` and this session touched only
`images/`, `docs/` and the Docker rebuild.

## Meta-prompt / skill / doc updates
- PENDING (decided-by: human): defer — `treating-art-sprites`' run loop (scratch
  workspace, runlog-first prompt, detached launch, monitored capped tries) generalized
  cleanly to a non-theater asset, but its treatment stage did not: `key`/`fit`/`measure`
  encode a transparent-background sprite contract sized by output basename, and
  `fit.mjs` exits 3 on a source with no real alpha, which an opaque portrait always is.
  This session stripped those four tools from the workspace and substituted a
  portrait-specific `inspect.mjs`, and rewrote `PROMPT-TEMPLATE.md`'s sprite framing
  wholesale. This then happened a **second** time in the same session for the real-photo
  run, which needed its own different gate again (a `greyFrac` unpainted-margin check
  rather than a shoulder-symmetry one), so the pattern is now twice-evidenced across two
  unrelated non-sprite assets. Next action: decide whether to split the asset-agnostic
  generation loop from the sprite-only treatment stage behind a per-asset contract that
  supplies its own inspector and gate.
- NO-CHANGE: `rebuild-restart` — followed end to end including the `--force-recreate`
  requirement and the poll-until-200 window; served as written.
- NO-CHANGE: `writing-session-logs` — template and fold-back triage served as written.
- NO-CHANGE: `CLAUDE.md` § theater rules index — its own carve-out correctly scoped this
  session out of loading the index; served as written.

## Next steps
None. All flags this session raised are closed except the two honest caveats recorded under
Open flags, which are statements of fact about the asset rather than open work.

## Pointers
- Run prompt: `docs/planning/about-portrait/2026-09-09-portrait-shoulders-prompt.md`
- Run log (all four tries, exact prompts sent, every rejection reason):
  `docs/planning/about-portrait/2026-09-09-portrait-shoulders-runlog.md`
- Portrait geometry inspector: `docs/planning/about-portrait/inspect.mjs`
- Real-photo run prompt: `docs/planning/about-portrait/2026-09-09-realphoto-prompt.md`
- Real-photo runlog (four tries, every rejection reason, and the agent's formal
  non-acceptance): `docs/planning/about-portrait/2026-09-09-realphoto-runlog.md`
- Real-photo run inspector (greyFrac gate):
  `docs/planning/about-portrait/inspect-realphoto.mjs`
- Prior portrait session, source of the neck overcorrection:
  `docs/session-logs/2026-09-09-14-48-codex-about-portrait.md`
