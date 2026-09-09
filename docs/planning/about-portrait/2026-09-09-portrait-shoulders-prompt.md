# Fix the shoulders, neck and head angle on a portrait photograph

You are editing one existing **portrait photograph** — a head-and-shoulders shot of a man
used as the "About Me" photo on a personal portfolio website. Your working directory is a
scratch folder (not a git repo) that already contains every file you need. You have an
image-generation tool with image editing — use it.

**This is not a game sprite.** If you know a `treat.mjs` / `key.mjs` / `fit.mjs` pipeline
from other runs in this project: it is deliberately not here, it does not apply, and you
must not look for it or recreate it. That pipeline enforces a transparent-background sprite
contract and would reject this image on principle. This portrait is **opaque RGB with a real
photographic background that must be preserved.**

## FIRST, before anything else

Create `runlog.md` in the working directory. **It is the deliverable.** Append to it the
moment anything happens: every generation attempt (try number, the exact prompt you sent,
which reference images you attached, where the tool wrote the bytes), every `inspect.mjs`
result (paste the JSON line), every decision and every rejection with its reason. Your final
chat message is only a copy of the runlog's summary. If the run is cut off, the runlog must
already tell the whole story.

## The files here

| path | what it is |
| --- | --- |
| `ref/edit-target.png` | **the edit target** — 1254×1254 opaque RGB. Everything not listed under "What must change" stays exactly as it is here. |
| `ref/img-3366.png` | **a real photograph of the same man**, taken from a low selfie angle. It governs **only** two things: (a) real human neck and shoulder anatomy for this specific person, and (b) how his black hoodie actually sits, drapes and folds. It governs NOTHING else — see "What must NOT be carried over from the reference". |
| `inspect.mjs` | reports geometry; run it on every try (see below). It reports only — a clean report is not acceptance. |

`sharp` is installed if you want to inspect a file with `node -e`. **Do not use it to alter
pixels.** Do not crop, resize, recolour or retouch anything by hand — every pixel change
comes from the image tool. The orchestrator resizes and encodes afterwards.

## Orientation — read this twice

The portrait is a **front view**: the man faces the viewer. So his own **right** shoulder is
on the **viewer's LEFT**, and his own **left** shoulder is on the **viewer's RIGHT**.
Below, every position is named **from the viewer's side**. Getting this mirrored is the
single easiest way to waste a run.

## What must change — 4 things

### 1. The shoulders are asymmetric — make them symmetric and square to the camera

In the edit target the two shoulders do not belong to the same body. Measured on the target,
the top edge of the black sweatshirt at 30 % in from the left frame edge sits at **0.550** of
the image height, while at the mirrored point 30 % in from the right edge it sits at
**0.660** — an 11 % of-image-height mismatch. At 20 % inset the mismatch is 9 %.

The **viewer's-left shoulder** is the wrong one: it runs too far out and rides too high and
too long, a broad sloping mass reaching the frame edge. The viewer's-right shoulder is
shorter and drops away lower.

It becomes: **both shoulders level, equal in length and equal in height, chest square to the
camera** — the torso facing the viewer straight on, the same way the face does. Mirror-equal
about the vertical centre line of the frame. Both shoulders exit the frame at the same height
on their respective sides. Shoulder width stays broad and natural for this man's build; do
not narrow him. Use `ref/img-3366.png` for what his actual shoulder slope and trapezius line
look like.

**Target to hit:** at 10 %, 20 % and 30 % in from each frame edge, the two shoulder heights
must be within **0.03** of image height of each other. `inspect.mjs` prints exactly this.

### 2. Give him a visible neck

In the edit target there is effectively no neck: the beard and jaw meet the hood collar
directly, so the head appears to sit straight down on the shoulder mass. Add the neck that
is missing — a visible column of neck between the underside of the jaw/beard and the
sweatshirt's collar opening, correctly proportioned and thick enough for this man's build
(he is a solidly built adult man with a full beard — not a slender neck).

`ref/img-3366.png` shows his real neck and jaw junction; match that anatomy. The neck reads
correctly only if the sternocleidomastoid line and the jaw's shadow are present — a smooth
featureless cylinder looks worse than no neck.

### 3. Correct the angle of the head on the neck

In the edit target the head is square and upright while the shoulder mass slopes strongly
toward the viewer's left, so the head and torso do not share an axis and the whole portrait
reads subtly wrong. With the shoulders now square to camera (item 1), the head must sit
**squarely and naturally on top of the new neck**, its vertical axis aligned with the torso's,
tilted no more than a few degrees. The head must look like it is attached to and supported by
the neck and shoulders below it — one continuous body.

### 4. The sweatshirt — fit and drape only

Take from `ref/img-3366.png` **only** how the black hoodie physically behaves:

- The hood gathers into a **compact bunch behind and around the neck**, not the oversized
  scarf-like collar the edit target currently shows. Reduce that bulk.
- Real fabric weight and texture: visible cotton-fleece surface, natural folds and creases,
  shoulder seams where a hoodie actually has them.
- The **drawstrings** hang with real weight from the hood's eyelets at the front of the
  collar, each ending in a **metal aglet** — not the weightless symmetric cords in the edit
  target.

The sweatshirt stays **black**, the same garment, the same colour.

**The chest text stays.** The edit target carries a tone-on-tone dark lettering across the
chest reading exactly:

```
EVOsystem
```

That string is **case-sensitive**: capital `E`, capital `V`, capital `O`, then lowercase
`s`, `y`, `s`, `t`, `e`, `m` — nine characters, one word, no space. It must survive this
edit unchanged in spelling, position (centred across the chest), size, and its subtle
tone-on-tone dark-grey-on-black treatment. If the shoulders change shape, the lettering
follows the new chest surface naturally, but its spelling never changes.

## What must NOT be carried over from the reference

`ref/img-3366.png` is a source of anatomy and fabric behaviour **only**. Do NOT bring across:

- **The `PUMA` logo on the reference hoodie's chest.** It must appear nowhere in the output.
  The chest reads `EVOsystem` and nothing else.
- **The baby's arm and hand** visible over the man's shoulder on the viewer's right of the
  reference. No second person, no arm, no hand in the output.
- **The reference's background** — its ceiling, walls, window blinds, doorway and wall
  calendar. None of it appears in the output.
- **The reference's camera angle.** It is a low selfie shot looking up, with the head tilted.
  The output keeps the edit target's straight-on, eye-level framing.
- The reference's lighting, colour cast, crop and aspect ratio.

## What must NOT change

Everything else, exactly as it is in `ref/edit-target.png`:

- **His face and likeness** — the same man, unmistakably: facial structure, skin tone and
  texture, eyes and their colour, eyebrows, nose, the open smile showing his upper teeth,
  the laugh lines, the dark hair with its swept-up volume, and the full dark beard with its
  grey flecks along the chin. Do not slim, smooth, retouch, beautify or de-age him.
- **The background** — the soft out-of-focus interior of the edit target: the pale wall, the
  green plant on the viewer's left, the dark picture frame on the viewer's right, the shelf.
  Same blur, same colours, same positions. Do not sharpen it or swap it.
- **The lighting** — soft, even, front-lit, same direction and colour temperature.
- **The framing** — square 1:1, head in the same place in the frame at the same scale, top of
  the hair the same distance from the top edge.
- Photographic realism throughout. This is a photograph, not an illustration, not a render,
  not a stylised portrait.

Do not add stickers, decals, badges, extra text, logos, jewellery, glasses, people, objects
or a setting. Four edits, nothing else.

## Per-try loop — max 4 tries

1. Send the edit prompt with **both** images attached, naming them in the prompt as image 1
   (`ref/edit-target.png`, the edit target) and image 2 (`ref/img-3366.png`, the anatomy and
   garment reference). State the use case as `precise-object-edit` and say plainly that the
   face, background, lighting and framing must be preserved unchanged.
2. Copy the tool's output bytes **untouched** into `raw/portrait-try<N>.png` before anything
   else. The tool writes to a path of its own under `~/.codex/generated_images/…`; copy from
   there. If it returns bytes inline, write them to that file. If you cannot get a PNG onto
   disk at all, write `TOOL-LIMIT: <exactly what happened>` in the runlog and stop.
3. Run `node inspect.mjs raw/portrait-try<N>.png` and paste the full JSON line into the
   runlog. It reports dimensions, whether the image is square, whether it carries alpha, and
   the three mirrored shoulder-height pairs with their deltas.
   - **It reports; it does not accept.** All three `delta` values should be ≤ `0.03`. A
     larger delta means item 1 did not land — that is a rejection, retry.
   - The output should be **square and opaque** (`square: true`, `hasAlpha: false`). Exact
     pixel dimensions do not matter; the orchestrator resizes. If it comes back
     non-square, say so in the runlog and retry asking explicitly for a square 1:1 image.
4. **A clean `inspect.mjs` line is not acceptance.** Open the result and look at it. Reject
   it unless all of:
   - Both shoulders are level, equal length and equal height, torso square to the camera.
   - A real, correctly proportioned neck is visible between jaw and collar.
   - The head sits squarely on that neck, sharing one axis with the torso.
   - The hood is a compact bunch, not an oversized scarf; drawstrings hang with weight and
     have metal aglets.
   - The chest reads exactly `EVOsystem`, spelled character by character, tone-on-tone.
   - It is unmistakably the same man as the edit target — face, beard, hair, smile, teeth.
   - The background is the edit target's blurred interior, unchanged.
   - No `PUMA`, no baby's arm, no added text, objects or people.

   Log the specific reason for every rejection, then try again with the prompt tightened
   against that failure.

**The likeliest thing to go wrong is the face drifting** — an edit this structural tempts the
tool to regenerate the whole person, and it comes back as a different, younger, smoother man.
Guard the face explicitly in every retry prompt. The second likeliest is the `EVOsystem`
lettering coming back misspelled, restyled, or replaced by the reference's `PUMA`.

If after 4 tries something is still wrong but everything else is right, keep the best attempt
as `out/portrait.png`, and say clearly in the runlog and your final message which acceptance
criteria it fails, so a human can rule on it.

## When you are done

Copy the accepted try to `out/portrait.png` and leave `runlog.md` complete. Do not touch
anything outside this directory. In your final message: the try count, the final
`inspect.mjs` JSON line, and an explicit list of which acceptance criteria the result meets
and which (if any) it does not.
