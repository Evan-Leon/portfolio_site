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

## Driving a change through Codex

`treat.mjs` is step 3 of a longer loop. To *change* a sprite (a new plate, a different
outfit) rather than just treat one you already have, use the `treating-art-sprites` skill —
it covers scaffolding the run, writing the prompt, launching Codex detached, and
integrating the result. Start here:

```bash
./new-run.sh <run-name> ../../theater/public/art/car.png <reference> [<reference> ...]
```

That builds a scratch workspace **outside every repo** with these tools, the edit target and
each reference re-encoded to plain PNG, and a `prompt.md` seeded from `PROMPT-TEMPLATE.md`.
It prints the exact `codex exec` line; it deliberately does not launch anything, because the
prompt is the part that decides whether the run is worth spending.

Codex never writes into the repo. The treated sprite is copied back by hand, after the
browser check, by someone who looked at it.

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
- **`key.mjs` exits 3 unless its backdrop palette explains ≥98% of the border ring.** It is
  a *studio-backdrop* cutter, not a background remover. A photographic background has
  hundreds of colours and no handful of centres covers it, so it still refuses. When it does
  refuse it prints the unexplained pixels' colours and which edges they sit on, because the
  honest answer is often "that is the subject" — see `--flat` below.
- **`key.mjs` fills from the border, never globally.** A global colour key would also
  delete matching pixels inside the subject (tinted glass, a shadow under a bumper). A
  fill can only reach what is genuinely connected to the outside.

## The backdrop palette, and the checkerboard

The backdrop is a **palette**, not a single colour: the border ring is clustered greedily
(≤4 centres), and distance is measured to those centres *and to the segments between them*,
because a blend of two backdrop colours is still backdrop.

This exists because of the second failure mode generators have. Asked for transparency, the
tool will paint an opaque **grey-and-white checkerboard** — a picture of transparency
(2026-09-09 plate run, tries 1 and 2). One flat colour cannot describe it.

**A checkerboard is keyable but not safely pocketable.** Its two colours are the same colours
as the wagon's chrome — roof rack, window trim, the cream border on the wood panel, the plate
surround. Every one of those is an enclosed region matching the backdrop palette, so opening
pockets punched holes clean through them (verified over magenta: the rack all but vanished).
Requiring a pocket to contain *both* palette entries does not help, because chrome is shaded
and contains both. **The colours genuinely overlap, and no test on colour alone separates
them** — so pockets are off for a patterned backdrop unless `--pockets` is passed explicitly.

The practical consequence: a checkerboard source keys at the border but keeps its enclosed
backdrop (the roof-rack slot stays filled). **Get a better source instead.** Ask the
generator for a flat solid magenta backdrop — `rgb(255,0,255)` appears nowhere in the
artwork — which keys perfectly and pockets safely. That is what tries 3 and 4 delivered.

## Knobs (`key.mjs`), and the two judgement calls

`--tol 26` backdrop, `--soft 60` subject, `--band 4` max feather depth, `--floor 8` alpha
snap, `--pockets 200` minimum enclosed-pocket size, `--flat 0.98` required border coverage.

**`--flat` is the other judgement call.** The 98% default assumes the subject is inset from
the frame. A car whose roof rack runs to the top edge and whose tyres run to the bottom puts
real subject in the border ring, and no backdrop palette will ever explain it — the 2026-09-09
generations sat at 87–89%. The refusal prints the unexplained pixels' colours and edges so
you can tell the two cases apart: near-black and tan on the top and bottom edges only, and
nothing on the left or right, is a subject touching the frame, not a background. Lower
`--flat` for that, and **look at the result**. Do not lower it to get past a real background.

`--pockets` is the first judgement call.

### Spill, and why `--soft` is source-dependent

`--edge 3` suppresses leftover backdrop colour on the **opaque** rim. Despilling the
partial-alpha pixels alone is not enough: a thin bright feature picks up backdrop colour
across a band wider than the alpha ramp, so pixels end up fully opaque and still tinted.
The 2026-09-09 wagon shipped a visible magenta fringe along the whole roof rack this way
(4629 opaque magenta-cast px). The suppression removes the component of a rim pixel's chroma
that points along the *backdrop's* chroma — a contaminated chrome highlight loses its magenta
and keeps its brightness; tan body against a slate backdrop projects negative and is
untouched. The narrow band is the safety property: interior colours that *would* project
positive (red tail lights against magenta) are never in it — verified, their pixel count and
mean colour are identical at every `--edge` from 3 to 14.

**`--soft` depends on how far the backdrop sits from the subject's colours.** A backdrop near
them (slate, `rgb(77,106,113)`) needs the narrow default — widen it and it eats subject. A
strongly chromatic one (magenta) blends toward the subject across a much longer path, so
half-blended pixels land far outside `--soft 60` and survive as tinted subject. The magenta
wagon needed `--soft 180`. Its actual command, for reproduction:

```bash
node treat.mjs raw/car-try3.png ../../theater/public/art/car.png -- \
  --flat 0.85 --soft 180 --edge 8
```

That took residual spill from 4629 px to 280 (0.031% of visible pixels). **Pockets** are backdrop the subject completely
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
