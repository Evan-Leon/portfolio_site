# Put a real photograph of a man onto a new background, unchanged

You are editing a **real photograph of a real person** into an "About Me" portrait for a
personal portfolio website. Your working directory is a scratch folder (not a git repo)
that already contains every file you need. You have an image-generation tool with image
editing — use it.

**This is not a game sprite.** If you know a `treat.mjs` / `key.mjs` / `fit.mjs` pipeline
from other runs in this project: it is deliberately not here and does not apply. The output
is an **opaque RGB photograph**, not a transparent sprite.

## The single most important instruction

**The man in image 1 is a real photograph and his body is already correct. Do not redraw,
reshape, retouch, slim, smooth, beautify, straighten or "improve" any part of him.**

A previous attempt at this portrait was fully synthetic, and it was rejected three times for
exactly this: a neck too wide, then too narrow, shoulders of unequal length, a head at the
wrong angle. Those problems are impossible here **only if you leave his pixels alone.** His
neck width, his shoulder line, his head tilt and the camera's slightly low angle are all real
and all correct. If you find yourself adjusting his anatomy, you have made the mistake this
run exists to avoid.

You are changing **what is around and on** him, never **him**.

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
| `ref/edit-target.png` | **the edit target** — 2430×2430 opaque RGB. A real photograph of the man, already cropped and positioned. The **flat mid-grey bands down the left and right edges are empty canvas**, not part of the photo — they exist to make the frame square and must be painted with background. |
| `ref/evan-about.png` | the **current website portrait**. It governs **only two things**: (a) the background to paint, and (b) the chest lettering's style and wording. It governs NOTHING about the man — it is an older synthetic image whose anatomy is wrong, which is why it is being replaced. Do not copy its face, neck, shoulders, head angle or body. |
| `inspect.mjs` | reports geometry; run it on every try (see below). It reports only. |

`sharp` is installed if you want to inspect a file with `node -e`. **Do not use it to alter
pixels.** Every pixel change comes from the image tool.

## Orientation

Image 1 is a front view: the man faces the viewer. His own **right** is the **viewer's LEFT**;
his own **left** is the **viewer's RIGHT**. Everything below is named **from the viewer's
side**.

## What must change — 4 things, none of them him

### 1. Replace the entire background

Everything behind and beside the man is replaced. That means **both**:

- the real room he was photographed in — the white ceiling, the walls, the white window
  blinds on the viewer's left, the doorway, the wall calendar, the daylight through the
  far window; **and**
- the **flat mid-grey vertical bands** down the left and right edges of the canvas.

Replace all of it with the background from `ref/evan-about.png`: a **soft, heavily
out-of-focus warm interior** — a pale neutral wall, a **green plant on the viewer's LEFT**, a
**dark picture frame on the viewer's RIGHT**, and a horizontal shelf line. Match its blur
depth, its warm colour temperature and its brightness. The background must be continuous and
seamless from edge to edge: **no flat grey may remain anywhere**, no visible seam or panel
where the grey bands were, and no repeated or mirrored copy of the plant or frame.

### 2. Remove the baby's hand and forearm

At the **viewer's RIGHT**, a small child's **hand and forearm** rest on the man's shoulder,
with the child's fingers holding the hoodie's drawstring. There is also a pale sleeve behind
it at the frame edge. **Remove all of it** — the hand, the fingers, the forearm and the
sleeve. No second person anywhere in the output.

In its place, continue the man's **own black hoodie shoulder** naturally: the same fabric,
the same fold direction, the same lighting. The drawstring the child was holding now simply
**hangs straight down under its own weight**, ending in its metal aglet.

### 3. Chest lettering: `PUMA` becomes `EVOsystem`

The hoodie in image 1 carries **`PUMA`** across the chest in tonal embossed lettering, near
the bottom of the frame. Remove it completely — no ghost of it, no partial letters.

In its place put exactly:

```
EVOsystem
```

**Case-sensitive**: capital `E`, capital `V`, capital `O`, then lowercase `s`, `y`, `s`, `t`,
`e`, `m` — nine characters, one word, no space. Centred horizontally on the chest. Use the
**same understated dark-charcoal tone-on-tone embossed treatment** that `ref/evan-about.png`
uses — low contrast, dark grey on black, following the fabric's folds and perspective. It
must sit fully within the frame with a little margin below it. A drawstring may pass in front
of it.

### 4. Blend the light, without touching his face

The man was photographed in cooler daylight; the new background is warmer and softer. Adjust
only the **overall colour temperature and the edge lighting** so he sits believably in the new
room — a soft, realistic contact/rim relationship between his shoulders and the background,
consistent shadow direction. This is a grade, not a repaint: **his facial features, skin
texture, pores, beard hairs, eyes and expression must survive pixel-for-pixel.**

## What must NOT change

- **Every part of the man**, exactly as photographed in image 1: the shape and width of his
  **neck**; his **shoulder line**, its slope and its width; the **angle and tilt of his
  head**; the camera's slightly low viewpoint; his face, its proportions, his eyes, eyebrows,
  nose, open smile and visible upper teeth, laugh lines, skin texture and colour; his dark
  swept-up hair, including the loose strands at the edges; his full dark beard with its grey
  flecks.
- **His black hoodie** — its cut, the hood's bunched fold behind his neck, its collar height,
  its folds and creases, its drawstrings and their metal aglets. Only the chest lettering
  changes, and only the baby's hand is removed from it.
- **His position, scale and framing** in the square canvas — his head stays exactly where it
  is, at exactly its current size.
- **Photographic realism.** The output is a photograph. Not an illustration, not a render,
  not a stylised or AI-looking portrait, not an oil painting.

Do not add stickers, decals, badges, extra text, logos, jewellery, glasses, hands, people,
objects or furniture. Four changes, nothing else.

## Per-try loop — max 4 tries

1. Send the edit prompt with **both** images attached, naming them in the prompt as image 1
   (`ref/edit-target.png`, the real photograph and edit target) and image 2
   (`ref/evan-about.png`, the background and lettering reference only). State the use case as
   `precise-object-edit` and say plainly that the person must be preserved unchanged and only
   the background, the child's hand and the chest lettering may change.
2. Copy the tool's output bytes **untouched** into `raw/portrait-try<N>.png` before anything
   else. The tool writes to a path of its own under `~/.codex/generated_images/…`; copy from
   there. If it returns bytes inline, write them to that file. If you cannot get a PNG onto
   disk at all, write `TOOL-LIMIT: <exactly what happened>` in the runlog and stop.
3. Run `node inspect.mjs raw/portrait-try<N>.png` and paste the full JSON line into the
   runlog.
   - **`greyFrac` is the gate.** The edit target starts at `0.3393` — that is the unpainted
     grey margin. In an accepted result `greyFrac` must be **below `0.02`**. Anything higher
     means grey canvas was left unpainted: that is a rejection, retry.
   - The output must be `square: true` and `hasAlpha: false`. Exact pixel dimensions do not
     matter; the orchestrator resizes.
   - **`shoulderPairs_informational` is NOT a gate in this run.** The subject is a real
     photograph, so genuine left/right differences are correct and must be preserved. Do not
     try to make these numbers symmetric. Making them match would mean you altered his body,
     which is the one thing this run forbids.
4. **A clean `inspect.mjs` line is not acceptance.** Open the result and look at it. Reject it
   unless all of:
   - The background is the soft blurred warm interior, edge to edge, with the plant on the
     viewer's left and the dark frame on the viewer's right. No grey band, no seam, no
     duplicated plant or frame.
   - No child's hand, fingers, forearm or sleeve anywhere. The hoodie shoulder is continuous
     and the freed drawstring hangs naturally with its aglet.
   - The chest reads exactly `EVOsystem`, spelled character by character, tone-on-tone. No
     trace of `PUMA`.
   - **He is unchanged**: same neck width, same shoulder line, same head tilt, same face and
     beard, same hoodie, same position and scale. Compare against image 1 directly and say in
     the runlog that you did.
   - It still looks like a photograph.

   Log the specific reason for every rejection, then try again with the prompt tightened
   against that failure.

**The likeliest failure is the tool "helpfully" regenerating the man** — straightening his
head, narrowing or widening his neck, evening out his shoulders, or smoothing his skin into
an AI-looking face. Guard him explicitly in every retry prompt. The second likeliest is grey
margin surviving at the extreme left or right edge, or the background being rebuilt as a
sharp room instead of a soft blur. The third is the `EVOsystem` lettering coming back
misspelled, restyled, or with `PUMA` ghosting under it.

If after 4 tries something is still wrong but everything else is right, keep the best attempt
as `out/portrait.png`, and say clearly in the runlog and your final message which acceptance
criteria it fails, so a human can rule on it.

## When you are done

Copy the accepted try to `out/portrait.png` and leave `runlog.md` complete. Do not touch
anything outside this directory. In your final message: the try count, the final
`inspect.mjs` JSON line, and an explicit list of which acceptance criteria the result meets
and which (if any) it does not.
