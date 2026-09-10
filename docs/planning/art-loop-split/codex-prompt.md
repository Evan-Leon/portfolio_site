# Adversarial review — art generation-loop / sprite-contract split

You are an adversarial reviewer. The repository is `/home/evan/EVOsystem/portfolio_site`
(your working directory). The change under review is the single commit **c430c27**
(`git show c430c27`, and `git diff c430c27~1 c430c27`). Nothing else is in scope.

## What the change is meant to do

`scripts/art/` drives generated-image changes through Codex. The commit splits it into:
1. an **asset-agnostic generation loop** (`scripts/art/new-run.sh` + shared deps) that
   scaffolds a scratch workspace, re-encodes the target/refs to PNG, seeds a prompt, and
   prints a detached `codex exec` launch line — knowing nothing about the asset; and
2. a **contract** (`scripts/art/contracts/sprite/`) holding everything sprite-specific: a
   `manifest.sh` declaring `CONTRACT_TOOLS` + `CONTRACT_PROMPT`, the prompt template, the
   treatment tools (`key/fit/measure/treat.mjs`), the repo-side browser check (`check.mjs`),
   and a README.

`new-run.sh <contract> <run-name> <target.png> [refs...]` sources the contract's manifest,
copies its `CONTRACT_TOOLS` + shared `node_modules`/`package.json` into the workspace, and
seeds `prompt.md` from `CONTRACT_PROMPT`. Sprite behaviour is supposed to be **byte-identical**
— only the file locations and the new `sprite` argument change.

## The claim to falsify

**The split preserves sprite behaviour exactly, leaves no broken path or stale reference, and
the loop is genuinely asset-agnostic (no sprite-specific coupling left in `new-run.sh`).**

## Lenses (each is a place a refactor like this breaks silently)

1. **Path anchors.** `contracts/sprite/check.mjs` resolves the repo root via `import.meta.url`
   + `..` segments to find `theater/`'s Playwright and `docs/spikes/art-check.html`. Is the
   depth correct now that it moved two levels down? Run it and prove it, don't eyeball.
   `treat.mjs` runs `key/fit/measure.mjs` as siblings — still correct? `import sharp` — does it
   still resolve both in the scratch workspace and repo-side from the new location?
2. **`new-run.sh` correctness under `set -euo pipefail`.** Unbound-variable traps, the
   `CONTRACT_TOOLS` array handling, the `refs` default (`（none）`), `sed` substitution when a
   ref name or path contains a `|` or `&`, the manifest `source` (what if a manifest is missing
   a variable, or names a tool that doesn't exist — are those caught?). Try to make it emit a
   broken workspace or a wrong launch line.
3. **Behaviour preservation.** Scaffold a run (`ART_RUN_ROOT` set to a scratch dir so you don't
   touch `/tmp` conventions), and confirm the workspace holds exactly the four workspace tools
   (NOT `check.mjs`), a `prompt.md` with no `@@` placeholders left, and the deps. Round-trip
   `car.png` and `tree-1.png` through `treat.mjs` from the new location and confirm PASS.
   Confirm `measure.mjs` still dispatches by output basename. Confirm the guards (no args /
   unknown contract / dup run-name) exit non-zero.
4. **Stale references.** Grep the whole repo (excluding `node_modules`, `docs/session-logs`,
   `archive/session-logs`) for any surviving reference to the OLD paths
   (`scripts/art/key.mjs`, `scripts/art/treat.mjs`, `scripts/art/check.mjs`,
   `scripts/art/PROMPT-TEMPLATE.md`, etc.) in docs, the skill, `package.json`, `AGENTS.md`.
   A doc that still tells a reader to run a moved file is a real finding.
5. **The contract abstraction.** Is there sprite-specific knowledge still hiding in the loop
   (basenames, `car`/`tree`, the sprite gate) that would make a second contract awkward? Is the
   `CONTRACT_TOOLS` / `CONTRACT_PROMPT` interface enough for the portrait case the README
   describes, or is something the loop needs still assumed rather than declared?
6. **The docs.** Do the two READMEs and the skill (`.claude` + `.agents` copies) describe the
   commands that now actually work? Try the exact command lines they print.

## Output discipline (non-negotiable)

- **Create `/home/evan/EVOsystem/portfolio_site/docs/planning/art-loop-split/codex-review.md`
  as your FIRST action, and append to it as you go** — one entry per finding the moment it is
  confirmed, and a `CHECKED, no defect: <lens>` line for each lens you clear. If you run out of
  budget, the substance must already be on disk. This is the deliverable.
- Each finding: severity (CRITICAL / MAJOR / MINOR), the file:line, what breaks, the concrete
  repro, and the fix. Distinguish a real behaviour break from a nit.
- End the file with a one-paragraph judgement: does the claim hold?
- **Do not modify any tracked file.** The only file you may write is `codex-review.md` (and
  throwaway scratch under your own `ART_RUN_ROOT`/tmp). Running the repo's node/pnpm tools is
  expected; they write only gitignored `cards/`/`node_modules`.

Confirm the model banner and network access before trusting any probe. Begin.
