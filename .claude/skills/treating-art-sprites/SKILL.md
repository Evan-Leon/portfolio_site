---
name: treating-art-sprites
description: Use whenever a drive-in theater sprite in theater/public/art/ (car.png, tree-1..3.png) is created, regenerated or edited — covers the whole loop: driving the change through Codex's image generator, treating what comes back (a generated PNG is never committable as returned), checking it, and integrating it into the served theater. Also use when a sprite shows a grey/coloured rectangle or a halo in the theater.
---

# Drive-in theater art: generate → treat → check → integrate

## When to use

Any time a file under `theater/public/art/` is about to change — a new sprite, or an edit
to an existing one ("put a licence plate on the wagon", "change the hoodie").

**A generated PNG is never committable as returned.** The generator has no size,
background, or quality option, so it reliably hands back a sprite that is off-size,
oversized on disk, and often painted onto a solid backdrop instead of carrying alpha. The
theater composites these over a night sky at eight times of day — a backdrop shows up as a
slab. This has already reached production once: on 2026-09-09 a regenerated `car.png` was
committed raw (1672×941, 1.4 MB, 0% transparent) and served a grey rectangle.

## Setup (once per clone)

```bash
pnpm -C scripts/art install --ignore-workspace   # sharp is native; deliberately not a workspace package
```

---

## 1. Scaffold the run

```bash
cd scripts/art
./new-run.sh <run-name> ../../theater/public/art/car.png <reference> [<reference> ...]
```

Creates a scratch workspace **outside every repo** holding the treatment tools and their
deps, the edit target and each reference re-encoded to plain PNG (the generator rejected a
JPEG carrying MPO metadata on the 2026-09-09 portrait run), and `prompt.md` from
`PROMPT-TEMPLATE.md`. It prints the workspace path and the exact launch line.

Codex never writes into the repo. The treated sprite is copied back by hand, after the
browser check, by someone who looked at it.

## 2. Write the prompt

Fill in `prompt.md`. The template's shape is not arbitrary — every section is there because
leaving it out cost a run. The parts that carry the most weight:

- **Runlog first.** "Create `runlog.md` before anything else; it is the deliverable." A run
  that dies on quota or moderation still leaves the substance behind.
- **Name positions from the viewer's side, and disambiguate anything mirror-flipped.** The
  wagon is a *rear* view, so the man facing the viewer has his **left hand on the viewer's
  right**. This is the easiest way to waste a run.
- **Exact strings for text, spelled out character by character**, marked case-sensitive,
  plus what must *not* be carried over from a reference photo (its own text, stickers,
  numbers). Text is the likeliest thing to come back wrong.
- **For a small element, say what reading survives downscaling.** A ring is ~10 px at sprite
  scale: "a rose-gold band with a visible turquoise stripe" is actionable; a faithful
  description of three inlays is not.
- **An explicit "what must NOT change" list** — face, likeness, finger count, the car, the
  canvas, the transparent background.
- **"Real alpha, not a picture of transparency."** Asked only for a transparent background,
  the generator will happily paint an opaque grey-and-white **checkerboard** (seen on the
  2026-09-09 plate run, try 1). Name it as rejected, and give a fallback: a single perfectly
  uniform flat colour — magenta `rgb(255,0,255)`, which appears nowhere in the artwork —
  covering every gap. `key.mjs` cuts a flat colour off cleanly and refuses a checkerboard.
- **The per-try loop**, capped at 4 tries, each ending in `node treat.mjs` and an eye check
  with named acceptance criteria. Tell it a `PASS` is not acceptance.

## 3. Launch detached and monitor

Runs exceed the Bash tool's 10-minute cap, so never run it in the foreground:

```bash
cd <workspace> && setsid nohup env -u NODE_OPTIONS codex exec \
  -s workspace-write -c sandbox_workspace_write.network_access=true \
  -c model=gpt-6-astra -c model_reasoning_effort=medium \
  -C "<workspace>" --skip-git-repo-check - < prompt.md > codex.log 2>&1 &
```

`gpt-6-astra` is Evan's approved model for **generation** (adversarial reviews stay on
`gpt-5.6-sol`). Confirm the banner says `model: gpt-6-astra` and `(network access enabled)`
— the config default runs reasoning effort `none`.

Then watch it with a Monitor whose filter covers failure, not just progress:

```
tail -f -n0 codex.log | grep -E --line-buffered \
  "^tokens used|treat: PASS|treat: .* exited|REFUSED|verdict|TOOL-LIMIT|moderation|rejected|^ERROR|error:|Traceback"
```

Do not `pkill -f "codex exec"` from a shell whose own command line contains that string —
it kills the shell too.

**Budget a spare try per asset for moderation.** The image tool false-positives on benign
prompts (a "tall narrow poplar" silhouette was refused as `[sexual]` in DT14); a reworded
retry passed.

## 4. Check it yourself, and LOOK

Codex cannot launch a browser in its sandbox, so the real checker is yours to run:

```bash
cd scripts/art
node check.mjs <workspace>/out/car.png
```

It drives `docs/spikes/art-check.html` headlessly and writes `./cards/<name>.card.png` — the
sprite over white, black and all six theater palettes. **Open that screenshot.** A backdrop
or a halo is obvious there and invisible in every metric printed above it; in DT14 a tree
passed every structural check with holes punched through its canopy.

Then read the runlog and check the change actually landed, character by character for any
text. Re-run one stage by hand if you need to (`node key.mjs`, `node fit.mjs`,
`node measure.mjs`); `scripts/art/README.md` documents each and its knobs.

## 5. Integrate

```bash
cp <workspace>/out/car.png theater/public/art/car.png
node scripts/art/check.mjs theater/public/art/*.png     # all four still pass
pnpm theater:typecheck && pnpm theater:test
docker compose build && docker compose up -d --force-recreate   # rebuild-restart skill
```

`theater/public/art/` is baked into the nginx image at build time, so nothing is served
until the rebuild. Verify the served bytes rather than trusting the build: `curl` the
sprite and confirm it is byte-identical to the committed source.

Commit the sprite together with whatever prompted the change, and keep the run's `prompt.md`
and `runlog.md` — copy them under `docs/planning/` when the run is worth citing later.

---

## Do not work around the refusals

- `fit.mjs` exits 3 on a source with **no real alpha**. That guard is what stops a
  photographic background being quietly keyed into a fringed sprite. Do not soften it.
- `key.mjs` exits 3 unless the border ring is **provably flat** (≥98% within tolerance of
  one colour). It cuts a studio backdrop, nothing else. If it refuses, regenerate the
  source with a transparent background — do not raise `--tol` until it gives in.
- `key.mjs` fills from the border rather than keying globally, so tinted glass and shadows
  inside the subject are structurally safe. Keep it that way.
- `treat.mjs` writes its destination only if all three stages pass, so a failed run leaves
  the committed sprite untouched.

The one genuine judgement call is `--pockets` (minimum size of an enclosed backdrop region
to open — the slot between the wagon's roof rack and its roof is one). `key.mjs` prints what
it opened and what it kept on every run; if a real hole is still filled, lower `--pockets`
and look again.

## Full reference

`scripts/art/README.md` — the contracts (`car*` is 1600×900, `tree*` is 800×1200, both
chosen by output basename), every knob, and the reasoning behind each refusal. Read it
before changing any of the scripts.
