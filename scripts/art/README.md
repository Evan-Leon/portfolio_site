# Sprite treatment — `theater/public/art/`

The drive-in theater's sprites (`car.png`, `tree-1..3.png`) are **generated art**, but
what a generator returns is never what the theater can use. This directory is the
treatment that turns one into the other, and the checks that say whether it worked.

Introduced in DT14 as throwaway scratch scripts; recovered and made permanent on
2026-09-09 after a regenerated `car.png` was committed **raw** — 1672×941, 1.4 MB, zero
transparency, a solid slate backdrop — and shipped a grey rectangle into production.

## Why a sprite needs treating at all

The image tool has **no size, background, or quality option** — everything is asked for
in prose, and it obliges on style while ignoring the contract. Every generation so far
has come back off-size, oversized on disk, and (this time) with a painted backdrop
instead of alpha. The theater composites these over a night sky at eight times of day,
so a backdrop is not a cosmetic problem: it is a visible slab.

## Install (once, on demand)

Deliberately **not** a pnpm workspace package. `sharp` is a native binary, and nobody
editing the static site should have to build it to run Prettier:

```bash
pnpm -C scripts/art install --ignore-workspace
```

## Use

```bash
cd scripts/art
node treat.mjs <raw.png> ../../theater/public/art/car.png   # key -> fit -> measure
node check.mjs ../../theater/public/art/car.png             # the real checker page
```

Then **look at the card screenshot** `check.mjs` writes (`./cards/<name>.card.png`). It
renders the sprite over white, black, and all six theater palettes; a backdrop or a halo
is obvious there and invisible in every number above it.

`treat.mjs` writes the destination only if all three stages pass, so a half-treated
sprite can never be left sitting on disk looking committable.

## The pipeline

| step             | script        | what it does                                                       |
| ---------------- | ------------- | ------------------------------------------------------------------ |
| 1. key           | `key.mjs`     | cut a flat generated backdrop off, feather and despill the edge     |
| 2. fit           | `fit.mjs`     | trim, scale, centre, bottom-anchor onto the contract canvas, ≤400 KB |
| 3. measure       | `measure.mjs` | pure-node port of the checker's `judge()`; exit 1 unless PASS       |
| 4. check + LOOK  | `check.mjs`   | drives the real `docs/spikes/art-check.html` headlessly, screenshots |

### The contracts

Chosen by the **output basename** (`car*` / `tree*`) in all three scripts, so name the
output for what it is:

|          | canvas    | fill                | bbox width | bottom gap | off centre |
| -------- | --------- | ------------------- | ---------- | ---------- | ---------- |
| `car*`   | 1600×900  | 90% wide, width-led | ≥ 960 px   | ≤ 45 px    | ≤ 80 px    |
| `tree*`  | 800×1200  | 100% tall, height-led | —        | ≤ 60 px    | ≤ 64 px    |

## What refuses, and why you should not work around it

- **`fit.mjs` exits 3 on a source with no real alpha.** This is the guard that makes the
  whole pipeline safe: without it, a *photographic* background could be quietly keyed out
  into a sprite full of fringe. Do not soften it.
- **`key.mjs` exits 3 unless ≥98% of the border ring is within tolerance of one colour.**
  It is a *studio-backdrop* cutter, not a background remover. If it refuses, the answer is
  to regenerate the source with a transparent background, not to raise `--tol`.
- **`key.mjs` fills from the border, never globally.** A global colour key would also
  delete matching pixels inside the subject (tinted glass, a shadow under a bumper). A
  fill can only reach what is genuinely connected to the outside.

## Knobs (`key.mjs`), and the one judgement call

`--tol 26` backdrop, `--soft 60` subject, `--band 4` max feather depth, `--floor 8` alpha
snap, `--pockets 200` minimum enclosed-pocket size.

Only `--pockets` is a real judgement call. **Pockets** are backdrop the subject completely
surrounds — on the wagon, the slot between the roof rack and the roof. Left opaque, a
pocket is a slate bar floating inside the silhouette; opened by a global key, subject
detail goes with it. So pockets are taken as connected components and only large ones are
opened. On the wagon that split cleanly and by a wide margin:

- **opened** (3 components, 6688 px): the rack slot at 6094 px and its two leg gaps at 300
  and 294 px — all genuinely see-through
- **kept** (348 components, 1576 px, largest 79 px): 1px shading slivers along the chrome
  bumper that merely land near the backdrop colour — all genuinely subject

`key.mjs` prints both tallies every run. If a real hole is still filled, lower `--pockets`
and look again; do not reach for a lower `--tol`.

## Known behaviour worth remembering

- **The alpha floor exists because of a real bug.** DT14 left a sub-1% alpha fringe under
  the car; `fit.mjs` measured it, anchored to it, and then palette quantisation dropped it
  — leaving the car floating 31 px above the canvas bottom. Flooring alpha in `key.mjs`
  means the bbox `fit.mjs` sees is the bbox that survives.
- **A structural PASS is not acceptance.** In DT14 a tree passed every metric with holes
  punched through its canopy. Step 4 is not optional.
- **Treating changes framing.** The 2026-09-09 wagon lands bottom-gap 0 / dead-centre and
  fills the full 900 px height, where DT14's sat 31 px up and 835 px tall — the same
  contract, but ~7% larger in the lot. Expected; not a regression.
