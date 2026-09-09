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

## Commits
portfolio_site:

- `9eec25a` — `fix(about): correct portrait shoulders, neck and head axis`
- `<this commit>` — `docs(session): record the about-portrait shoulder and neck correction`

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
- Prettier pre-commit hook — ran on commit; no staged `.html`/`.css`/`.js`, so no-op.
  `core.hooksPath=.githooks` and `node_modules/.bin/prettier` both confirmed present.

## Blockers
None.

## Open flags
- `images/evan-about.png` is 2.0 MB for an element rendered at 174 px in a circular
  crop (`.about__photo-ring` is 180 px with 3 px padding). Roughly 30× the pixels
  needed even at 2× DPR. Pre-existing, out of scope for this fix, not addressed.
- The portrait is synthetic and has now been through five successive generative edit
  passes. Each pass compounds drift, and the measured head-geometry wander across this
  run's four tries (width 0.375–0.442 against an original 0.392) is that compounding
  visible. A sixth corrective edit is likely to cost more than a single fresh
  generation from the reference photograph.
- The residual shoulder mismatch of 0.064 at the 20 % inset is a slightly taller hood
  lobe on the viewer's left. Accepted deliberately (see Accomplished); invisible at
  render size, and the alternative traded it for a visible head-scale regression.

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
  wholesale. Next action: decide whether to split the asset-agnostic generation loop
  from the sprite-only treatment stage behind a per-asset contract.
- NO-CHANGE: `rebuild-restart` — followed end to end including the `--force-recreate`
  requirement and the poll-until-200 window; served as written.
- NO-CHANGE: `writing-session-logs` — template and fold-back triage served as written.
- NO-CHANGE: `CLAUDE.md` § theater rules index — its own carve-out correctly scoped this
  session out of loading the index; served as written.

## Next steps
None required. If the portrait still reads wrong, prefer one fresh generation from
IMG_3366 over a sixth corrective edit (see Open flags).

## Pointers
- Run prompt: `docs/planning/about-portrait/2026-09-09-portrait-shoulders-prompt.md`
- Run log (all four tries, exact prompts sent, every rejection reason):
  `docs/planning/about-portrait/2026-09-09-portrait-shoulders-runlog.md`
- Portrait geometry inspector: `docs/planning/about-portrait/inspect.mjs`
- Prior portrait session, source of the neck overcorrection:
  `docs/session-logs/2026-09-09-14-48-codex-about-portrait.md`
