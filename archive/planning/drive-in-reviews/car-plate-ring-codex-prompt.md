# Two localized edits to the drive-in theater's station wagon sprite

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

## The files here

| path | what it is |
|---|---|
| `ref/car-current.png` | **the edit target** — 1600×900 RGBA, transparent background |
| `ref/ct-plate.png` | photo of a vintage Connecticut licence plate — style reference for the plate only |
| `ref/ring.png` | photo of a wedding ring — style reference for the ring only |
| `treat.mjs` | the post-processing pipeline; run it on every try (see below) |
| `key.mjs` `fit.mjs` `measure.mjs` | the stages `treat.mjs` runs — do not modify or call directly |

`sharp` is installed if you want to inspect a file with `node -e`. **Do not use it to alter
pixels.** There is a `check.mjs` in the repo that needs a browser; it is not here, do not
look for it — the orchestrator runs the browser check afterwards.

## What must change — exactly two things, both small and local

### 1. The licence plate

The blank white plate in the chrome surround on the rear bumper becomes a **vintage
Connecticut plate in the style of `ref/ct-plate.png`**. Image 2 is the authoritative style
reference and the look must read as that same plate:

- **deep saturated navy-blue** plate face, the exact blue of the reference
- **embossed, raised, stamped cream/off-white lettering** — dimensional, catching light on
  the top edge of each letter and shadowed underneath, never flat printed type
- the reference's **condensed bold vintage plate typeface**, with its slightly rounded
  stamped letterforms
- **thin raised cream border** running around the plate edge
- gently aged: softly worn paint on the letter faces, subtle patina, a little chipping —
  the same 1970s-plate wear as the reference, not a factory-new plate

Copy that entire treatment. **Only the text content changes**, and it changes to
**exactly TWO lines — not three.** The reference photo has three (CONSTITUTION STATE /
VO·9463 / CONNECTICUT); this plate has two:

| line | text | size |
|---|---|---|
| top | `Evan Leon` | small — exactly where the reference reads CONSTITUTION STATE |
| bottom | `EVOsystem` | **large** — the main plate text, filling the rest of the plate |

There is **no third line**. Do not carry over `CONNECTICUT`, `VO·9463`, the AUG 1980
registration sticker, a state name, a slogan, or any other text from the reference photo —
the bottom of the plate below `EVOsystem` is plain blue.

Both strings are **exact and case-sensitive**. `EVOsystem` is capital E, capital V,
capital O, then lowercase s-y-s-t-e-m — one word, no space, no hyphen. `Evan Leon` is
capital E, capital L, rest lowercase. Do not reword, abbreviate, translate or "correct"
either one.

The plate is only about 200×105 px in the finished 1600×900 image, so **legibility of
`EVOsystem` is the priority** — with only two lines it should be large and dominant, with
`Evan Leon` small and tight against the top edge. Keep the plate inside its existing chrome
surround at its existing position and size; do not enlarge the plate or move the bumper.

### 2. The wedding ring

The man in the rear window has one hand raised waving (on the viewer's left, his right
hand) and his other hand resting on the chrome window sill (**on the viewer's right — this
is his LEFT hand**). Add a wedding ring to the **ring finger of the resting left hand
only**. Not the waving hand.

Style it after `ref/ring.png`: a **domed rose-gold / warm copper band with inlay stripes
running around it — dark koa wood, a turquoise stripe, and a cream-white antler stripe**.
Render it in the same warm cartoon illustration style as the rest of the drawing, not a
photograph pasted on. It is a very small element, so favour the reading that survives:
a warm rose-gold band with a visible **turquoise** stripe is what identifies it. One ring,
on one finger, correctly wrapped around the finger in perspective.

## What must NOT change

Everything else, exactly as it is in `ref/car-current.png`:

- the man's face, likeness, expression, hair, beard, black EVOsystem hoodie, pose, both
  arms, and the number and shape of his fingers
- the car in every respect: rear view, position, scale, tan paint, wood-grain tailgate
  panel, chrome roof rack, chrome bumper, red vertical tail lights, exhaust tip, wheels
  and tyres, rear window shape, perspective
- the 1600×900 landscape composition and the framing
- **the transparent background.** Output PNG with a real alpha channel and nothing behind
  the car — no ground, no shadow, no scene, no colour backdrop.

Do not add bumper stickers, decals, badges, text, logos, people, objects or a setting.
Two edits, nothing else.

## Per-try loop — max 4 tries

1. Send the edit prompt with all three reference images attached, naming them in the
   prompt as image 1 (the edit target), image 2 (plate reference), image 3 (ring
   reference). State the use case as `precise-object-edit` and say plainly that the rest
   of the image must be preserved unchanged.
2. Copy the tool's output bytes **untouched** into `raw/car-try<N>.png` before anything
   else. The tool writes to a path of its own under `~/.codex/generated_images/…`; copy
   from there. If it returns bytes inline, write them to that file. If you cannot get a
   PNG onto disk at all, write `TOOL-LIMIT: <exactly what happened>` in the runlog and stop.
3. Run `node treat.mjs raw/car-try<N>.png out/car.png` — one command, it runs
   key → fit → measure and writes `out/car.png` **only if all three pass**. Paste its full
   output into the runlog.
   - `key.mjs` cuts a flat backdrop off if the generator painted one. It **refuses (exit 3)
     unless the backdrop is provably flat.** If it refuses, that is a bad generation:
     regenerate asking harder for a transparent background, or failing that a single flat
     solid colour behind the car. Never key, threshold or paint a background out yourself.
   - `measure.mjs` prints one JSON line and fails anything but `PASS`: exact 1600×900, all
     four corner alphas 0, transparent fraction 15–85 %, bbox width ≥ 960, bbox height
     ≥ 55 % of canvas, bottom within 45 px, centre within 80 px, file ≤ 400 KB, and a
     **WARN** if ≥ 30 % of opaque pixels are near-white/grey. `WARN` is not acceptance.
4. **A PASS is not acceptance.** Inspect the result yourself and reject it unless all of:
   - the plate reads `EVOsystem` large and legible with `Evan Leon` small above it,
     spelled exactly right, **two lines only and no third line**
   - the plate reads as the vintage Connecticut plate in image 2: navy blue face, raised
     embossed cream lettering with its highlight-and-shadow relief, thin raised cream
     border, gently worn — not flat printed text on a blue rectangle
   - a rose-gold ring with a turquoise stripe is on the ring finger of the resting hand
     (viewer's right), and the waving hand has no ring
   - his face and likeness are unchanged and still recognisably the same man
   - the hands still have five natural fingers each
   - the car, wood panel, chrome and wheels are unchanged
   - no stickers, no added text, no background, no shadow
   Log the specific reason for every rejection, then try again with the prompt tightened
   against that failure.

Text rendering is the likeliest thing to go wrong — misspellings, dropped letters, wrong
case on `EVOsystem`. Check the spelling character by character before accepting. If after
4 tries the plate text is still wrong but everything else is right, keep the best attempt
in `out/car.png`, and say clearly in the runlog and your final message which criteria it
fails so a human can rule on it.

## When you are done

Leave `out/car.png` as the accepted result and `runlog.md` complete. Do not touch anything
outside this directory. In your final message: the try count, the final `measure.mjs` JSON
line, and an explicit list of which acceptance criteria the result meets and which (if any)
it does not.
