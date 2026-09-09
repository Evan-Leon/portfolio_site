---
name: treating-art-sprites
description: Use whenever a drive-in theater sprite in theater/public/art/ (car.png, tree-1..3.png) is generated, regenerated or replaced — the image tool returns off-size sprites on a painted backdrop, and they must be keyed, fitted and checked before they are committed. Also use when a sprite shows a grey/coloured rectangle or a halo in the theater.
---

# Treating a drive-in theater sprite

## When to use

Any time a file under `theater/public/art/` is about to change. **A generated PNG is
never committable as returned.** The generator has no size, background, or quality
option, so it reliably hands back a sprite that is off-size, oversized on disk, and
often painted onto a solid backdrop instead of carrying alpha. The theater composites
these over a night sky at eight times of day — a backdrop shows up as a slab.

This has already reached production once: on 2026-09-09 a regenerated `car.png` was
committed raw (1672×941, 1.4 MB, 0% transparent) and served a grey rectangle.

## The one rule

Run the treatment, then **look at the result**. Do not commit a sprite on its numbers.

```bash
pnpm -C scripts/art install --ignore-workspace   # once per clone; sharp is native
cd scripts/art
node treat.mjs <raw.png> ../../theater/public/art/car.png   # key -> fit -> measure
node check.mjs ../../theater/public/art/car.png             # the real checker page
```

`treat.mjs` writes the destination only if every stage passes, so a failed run leaves the
committed sprite untouched. `check.mjs` drives `docs/spikes/art-check.html` headlessly and
writes `./cards/<name>.card.png` — a strip of the sprite over white, black and all six
theater palettes. **Open that screenshot.** A backdrop or a halo is obvious there and
invisible in every metric printed above it. In DT14 a tree passed every structural check
with holes punched through its canopy.

## Full reference

`scripts/art/README.md` is the canonical source of truth: the contracts (`car*` is
1600×900, `tree*` is 800×1200, both chosen by output basename), every `key.mjs` knob, and
the reasoning behind each refusal. Read it before changing any of the scripts.

## Do not work around the refusals

- `fit.mjs` exits 3 on a source with **no real alpha**. That guard is what stops a
  photographic background being quietly keyed into a fringed sprite. Do not soften it.
- `key.mjs` exits 3 unless the border ring is **provably flat** (≥98% within tolerance of
  one colour). It cuts a studio backdrop, nothing else. If it refuses, regenerate the
  source with a transparent background — do not raise `--tol` until it gives in.
- `key.mjs` fills from the border rather than keying globally, so tinted glass and
  shadows inside the subject are structurally safe. Keep it that way.

The one genuine judgement call is `--pockets` (minimum size of an enclosed backdrop
region to open — the slot between the wagon's roof rack and its roof is one). `key.mjs`
prints what it opened and what it kept on every run; if a real hole is still filled,
lower `--pockets` and look again.

## After it passes

`theater/public/art/` is baked into the nginx image at build time, so the new sprite is
not served until a rebuild: use the `rebuild-restart` skill.
