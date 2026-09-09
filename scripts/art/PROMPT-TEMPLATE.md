# <what this run changes, in one line>

<!--
TEMPLATE — fill in every <angle-bracket> and delete these comments before launching.
The shape below is not arbitrary. Each section is here because leaving it out cost a
run: DT14 (four sprites from scratch), the 2026-09-09 portrait/car edits, and the
plate-and-ring edit. Cut a section only if you know which failure it was preventing.
-->

You are editing one existing art sprite for a scroll-driven drive-in theater page. Your
working directory is a scratch folder (not a git repo) that already contains every file
and tool you need. You have an image-generation tool with image editing — use it.

## FIRST, before anything else

Create `runlog.md` in the working directory. **It is the deliverable.** Append to it the
moment anything happens: every generation attempt (try number, the exact prompt you sent,
which reference images you attached, where the tool wrote the bytes), every `treat.mjs`
result (paste the JSON line), every decision and every rejection with its reason. Your
final chat message is only a copy of the runlog's summary. If the run is cut off, the
runlog must already tell the whole story.

<!-- Runlog-first is load-bearing: a run that dies on quota or moderation still leaves the
     substance behind. Do not soften it to "keep notes". -->

## The files here

| path | what it is |
| --- | --- |
| `@@TARGET@@` | **the edit target** — 1600×900 RGBA, transparent background |
| @@REFS@@ | style reference(s) — say below what each one is for, and for what it is NOT |
| `treat.mjs` | the post-processing pipeline; run it on every try (see below) |
| `key.mjs` `fit.mjs` `measure.mjs` | the stages `treat.mjs` runs — do not modify or call directly |

`sharp` is installed if you want to inspect a file with `node -e`. **Do not use it to alter
pixels.** There is a `check.mjs` in the repo that needs a browser; it is not here, do not
look for it — the orchestrator runs the browser check afterwards.

## What must change — <N> things, all small and local

<!-- Number them. State each as an OUTCOME plus the constraint that keeps it local.
     Name positions from the VIEWER's side and disambiguate anything mirror-flipped: the
     wagon is a rear view, so a person facing the viewer has their left hand on the
     viewer's right. Getting this wrong is the single easiest way to waste a run. -->

### 1. <thing>

<what it becomes; which reference governs it; where it sits; how big>

<!-- For TEXT: give the exact string, spelled out character by character, say it is
     case-sensitive, and name what must NOT be carried over from the reference photo
     (its own text, stickers, numbers). Text is the likeliest thing to come back wrong. -->

<!-- For a SMALL element: say what reading survives downscaling. A ring at sprite scale is
     ~10px — "a rose-gold band with a visible turquoise stripe" is actionable, a faithful
     description of three inlays is not. -->

## What must NOT change

Everything else, exactly as it is in `@@TARGET@@`:

- <the person: face, likeness, expression, hair, beard, clothing, pose, finger count>
- <the vehicle: view, position, scale, paint, panels, chrome, lights, wheels, perspective>
- the 1600×900 landscape composition and the framing
- **the transparent background.** Output PNG with a real alpha channel and nothing behind
  the car — no ground, no shadow, no scene, no colour backdrop.

**Real alpha, not a picture of transparency.** Do not draw a grey-and-white checkerboard
behind the subject — that is an opaque image of a transparency pattern and it is rejected.
If the tool genuinely cannot emit an alpha channel, put a **single perfectly uniform flat
solid colour** behind the subject instead (magenta `rgb(255,0,255)` is ideal — it appears
nowhere in the artwork), covering every gap including openings in the roof rack and under
the car, with no texture, shading, gradient or shadow. `key.mjs` cuts a flat colour off
cleanly and refuses a checkerboard.

Do not add stickers, decals, badges, text, logos, people, objects or a setting.
<N> edits, nothing else.

## Per-try loop — max 4 tries

1. Send the edit prompt with the reference images attached, naming them in the prompt as
   image 1 (the edit target), image 2 (…), image 3 (…). State the use case as
   `precise-object-edit` and say plainly that the rest of the image must be preserved
   unchanged.
2. Copy the tool's output bytes **untouched** into `raw/<stem>-try<N>.png` before anything
   else. The tool writes to a path of its own under `~/.codex/generated_images/…`; copy
   from there. If it returns bytes inline, write them to that file. If you cannot get a
   PNG onto disk at all, write `TOOL-LIMIT: <exactly what happened>` in the runlog and stop.
3. Run `node treat.mjs raw/<stem>-try<N>.png out/<stem>.png` — one command, it runs
   key → fit → measure and writes the output **only if all three pass**. Paste its full
   output into the runlog.
   - `key.mjs` cuts a flat backdrop off if the generator painted one. It **refuses (exit 3)
     unless the backdrop is provably flat.** If it refuses, that is a bad generation:
     regenerate asking harder for a transparent background, or failing that a single flat
     solid colour behind the subject. Never key, threshold or paint a background out yourself.
   - `measure.mjs` prints one JSON line and fails anything but `PASS`: exact dimensions, all
     four corner alphas 0, transparent fraction 15–85 %, bbox width ≥ 960 (car), bbox height
     ≥ 55 % of canvas, bottom within tolerance, centre within tolerance, file ≤ 400 KB, and a
     **WARN** if ≥ 30 % of opaque pixels are near-white/grey. `WARN` is not acceptance.
4. **A PASS is not acceptance.** Inspect the result yourself and reject it unless all of:
   - <one bullet per thing that had to change, stated so it can be checked by looking>
   - <one bullet per thing most likely to drift — face, finger count, text spelling>
   - no added background, shadow, text or objects
   Log the specific reason for every rejection, then try again with the prompt tightened
   against that failure.

<!-- Name the expected failure mode explicitly; it measurably tightens the retries. -->
<expected failure mode> is the likeliest thing to go wrong. If after 4 tries <that> is still
wrong but everything else is right, keep the best attempt in `out/<stem>.png`, and say
clearly in the runlog and your final message which criteria it fails so a human can rule on it.

## When you are done

Leave `out/<stem>.png` as the accepted result and `runlog.md` complete. Do not touch anything
outside this directory. In your final message: the try count, the final `measure.mjs` JSON
line, and an explicit list of which acceptance criteria the result meets and which (if any)
it does not.
