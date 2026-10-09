# DT14 — generate the four drive-in sprites (Codex, image generation)

You are generating four art sprites for a scroll-driven drive-in theater page. Your
working directory is a scratch folder (not a git repo) that already contains every
tool you need. You have an image-generation tool; use it. The reference photograph
of the car is attached to this prompt and also saved as `reference-wagon.jpg`.

## FIRST, before anything else

Create `runlog.md` in the working directory. It is the deliverable. Append to it the
moment anything happens: every generation attempt (stem, try number, the exact prompt
you sent, the tool's size/background options, where the tool put the bytes), every
`fit.mjs` and `measure.mjs` result (paste the JSON line), every decision. Your final
chat message is only a copy of the runlog's summary. If the run is cut off, the runlog
must already tell the whole story.

Finish one stem completely (generated, fitted, measured, logged) before starting the
next. Order: `tree-1`, `tree-2`, `tree-3`, then `car` last — the car is the hardest.

## What lands

| file | subject | canvas |
|---|---|---|
| `out/tree-1.png` | solid black silhouette, broad deciduous oak | 800×1200 |
| `out/tree-2.png` | solid black silhouette, conifer pine | 800×1200 |
| `out/tree-3.png` | solid black silhouette, tall narrow poplar | 800×1200 |
| `out/car.png` | rear view of a late-1970s wood-panelled American station wagon, kids waving out the open tailgate window | 1600×900 |

All four are PNGs with a **real alpha channel** (transparent background, not a drawn
checkerboard, not white, not a colour to key out).

## Tools in this directory (do not modify them)

- `node fit.mjs <raw.png> out/<stem>.png` — the only permitted post-processing. It
  trims transparent margins, scales the subject onto the contract canvas, centres it
  horizontally with its bottom edge on the canvas bottom, and writes a PNG under 400 KB.
  It **refuses (exit 3)** a source without real alpha. When it refuses, regenerate;
  never remove a background by keying, thresholding or painting.
- `node measure.mjs out/<stem>.png` — the structural acceptance check, a faithful port
  of the project's browser checker. Prints one JSON line; exit 0 only on `PASS`.
  Predicates: exact dimensions; all four corner alphas 0; transparent fraction 15–85 %;
  bbox width ≥ 960 px (car only); bbox height ≥ 55 % of canvas; bbox bottom within 5 %
  of the canvas bottom; bbox centre within 5 % (car) / 8 % (tree) of centre; file ≤ 400 KB;
  and a **WARN** when ≥ 30 % of the subject's opaque pixels are near-white/near-grey
  (the "baked checkerboard" tell). `WARN` is not acceptance — treat it as a failure.
- `sharp` is installed if you need to inspect a file (`node -e`), but do not use it to
  alter pixels. `check.mjs` needs a browser; do not run it, the orchestrator will.
- Save every raw generation untouched as `raw/<stem>-try<N>.png` before fitting it.
  If the image tool writes to a path of its own, copy from there; if it returns the
  bytes inline, write them to that file. If you cannot get the bytes onto disk as a
  PNG at all, write `TOOL-LIMIT: <exactly what happened>` in the runlog and stop.

## Generation rules (keep every constraint in every prompt you send)

Ask the tool for a **transparent background** (use its background/transparency option
if it has one, and say it in the prompt as well: "transparent background with a real
alpha channel, not a checkerboard"). Ask for the highest quality it offers. Ask for the
orientation nearest the contract: portrait for trees, landscape for the car; `fit.mjs`
handles the exact canvas.

**Trees — one generation per stem, prompt shape:**

> Solid pure-black silhouette of a single [broad deciduous oak / conifer pine / tall
> narrow poplar] tree, one trunk reaching the very bottom edge of the image, centred,
> no ground, no shadow, no other objects, no inner detail or highlights — a flat
> opaque black shape only. Transparent background with a real alpha channel, not a
> checkerboard. PNG.

The silhouette is used as a **mask** (only its alpha matters), so the interior must be
fully opaque — no grey, no gradients, no gaps inside the canopy meant as texture. The
trunk must be the lowest element and must touch the bottom of the subject; a canopy
that hangs below the trunk base is wrong. Make the three stems visibly different shapes.

**Car — prompt shape (adapt wording, keep every constraint):**

> Flat vector-style illustration, straight rear view of a late-1970s American full-size
> station wagon: tan body with wood-grain side panels and a wood-grain tailgate panel,
> chrome rear bumper, vertical tail-lights, roof rack. The tailgate window is rolled down
> and two or three kids in the rear-facing third-row seat look out the back toward the
> viewer, one waving. Centred, whole car visible including both rear wheels, no ground,
> no shadow, no text, no licence-plate lettering, no background. Transparent background
> with a real alpha channel, not a checkerboard. PNG.

Look at the attached reference photo for the proportions and the mood (kids waving from
the rear-facing seat through the open tailgate glass), but do not reproduce its licence
plate text or any lettering. The sprite ships at ~320 px wide, so the tail-lights, the
rear window and the kids must be bold, simple, high-contrast shapes — not fine detail.
Keep the roof and body **tan**, not white or pale grey; large near-white areas trip the
checker's WARN. Wheels and the body baseline must be the lowest elements (the sprite
sits on a road).

## Loop per stem

1. Generate → save `raw/<stem>-tryN.png` → log the prompt and options.
2. `node fit.mjs raw/<stem>-tryN.png out/<stem>.png` → log its output line.
3. `node measure.mjs out/<stem>.png` → log the JSON line.
4. Open/inspect the fitted image (view it) and confirm by eye: the subject is the one
   described; nothing but the subject is opaque (no halo, backdrop, ground, text);
   tree trunk reaches the bottom; car wheels on the bottom, tail-lights and rear window
   readable when you imagine it 320 px wide. Log what you saw in one or two lines.
5. If measure is not `PASS` or the eye check fails: change the prompt to address the
   specific failure (say which predicate) and go to 1. **At most 4 tries per stem.**
   After 4 failures leave the best try in `out/` and mark the stem `UNRESOLVED` in the
   runlog with the reason; move on to the next stem.

## Finish

Write `manifest.json`: `{ "<stem>": { "file": "out/<stem>.png", "try": N, "raw":
"raw/<stem>-tryN.png", "measure": <the JSON>, "status": "PASS" | "UNRESOLVED" } }` for
all four. End the runlog with a summary table (stem, tries, final verdict, one-line eye
check). Do not touch anything outside this directory.
