# `scripts/art/` — the Codex generation loop

Driving a generated-image change through Codex has two halves, and they are separated here:

1. **The generation loop** (this directory) — asset-agnostic. Scaffold a scratch workspace
   outside every repo, re-encode the edit target and references to clean PNGs, seed a prompt,
   and print the exact detached `codex exec` line. It knows nothing about what is being
   generated.
2. **A contract** (`contracts/<name>/`) — everything asset-specific: the prompt template, the
   treatment/inspection tools Codex runs on each try, and the gate that says accept or reject.

The split exists because the loop generalised cleanly to non-sprite assets (a portrait, a
real-photo portrait) but the sprite *treatment* did not — `key`/`fit`/`measure` encode a
transparent-background contract and `fit.mjs` refuses an opaque source, which every portrait
is. Rather than strip and re-substitute the tools each time, the loop now takes a contract.

## Layout

```
scripts/art/
  new-run.sh              the generation loop (scaffold a run)
  package.json            shared deps (sharp) — install with --ignore-workspace
  node_modules/           copied into each scratch workspace
  contracts/
    sprite/               the reference contract — theater/public/art/*.png
      manifest.sh         declares CONTRACT_TOOLS + CONTRACT_PROMPT
      PROMPT-TEMPLATE.md  the prompt seed (@@TARGET@@ / @@REFS@@ substituted)
      key.mjs fit.mjs measure.mjs treat.mjs   the workspace tools (Codex runs these)
      check.mjs           the repo-side browser check (a human runs this after)
      README.md           the sprite treatment in full — knobs, refusals, the checkerboard
```

## Install (once, on demand)

Deliberately **not** a pnpm workspace package. `sharp` is a native binary, and nobody
editing the static site should have to build it to run Prettier:

```bash
pnpm -C scripts/art install --ignore-workspace
```

## Run

```bash
cd scripts/art
./new-run.sh <contract> <run-name> <edit-target.png> [reference ...]
#   e.g. ./new-run.sh sprite plate-and-ring ../../theater/public/art/car.png ~/pics/CT-plate.jpg
```

It prints the workspace path and the `codex exec` line; it deliberately does **not** launch
anything, because the prompt is the part that decides whether the run is worth spending.
Codex never writes into the repo — the treated result is copied back by hand, after the
check, by someone who looked at it. For the whole loop (prompt-writing, launching detached,
monitoring, checking, integrating), use the `treating-art-sprites` skill.

## The contract interface

A contract is a directory under `contracts/` with a `manifest.sh` that `new-run.sh` sources:

| variable | meaning |
| --- | --- |
| `CONTRACT_TOOLS` | bash array of files, relative to the contract dir, copied into the scratch workspace so Codex can self-check every try in its sandbox. |
| `CONTRACT_PROMPT` | the prompt-template filename in the contract dir; seeded to `prompt.md` with `@@TARGET@@` and `@@REFS@@` substituted. |

Anything a contract's tools need at run time is either in `CONTRACT_TOOLS` (copied) or in the
shared `node_modules` (resolved by walking up). A tool that needs a real browser — the
sprite's `check.mjs` — stays out of `CONTRACT_TOOLS` and is run repo-side after the run,
because Codex's sandbox cannot launch one.

### Adding a contract

Copy `contracts/sprite/`'s shape: a `manifest.sh`, a prompt template, the tools whose gate
writes an accepted output only on a real PASS, and a `README.md` describing the gate and its
refusals. The gate is the load-bearing part — it is what stops a bad generation reaching the
tree. The sprite gate is `treat.mjs` (key → fit → measure), which refuses an opaque source; a
portrait contract would supply its own inspector instead (e.g. a `greyFrac` unpainted-margin
check, or a shoulder-symmetry measurement — the gates the 2026-09-09 portrait runs needed).
