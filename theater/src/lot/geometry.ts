/*
 * Where the screens stand, how far the camera has driven, and which screen is
 * the one ahead.
 *
 * Pure arithmetic, no DOM. Everything the lot looks like at a given scroll
 * position is a function of `progress` alone, computed here — which is what
 * makes `SDS-001` cheap to hold: `build-lot.ts` turns these numbers into a GSAP
 * timeline that GSAP itself scrubs absolutely, and `lot-scene.ts` reads them
 * back for its snapshot. Nothing accumulates anywhere.
 *
 * THE CONSTANTS LIVE HERE AND ONLY HERE (`EVO-UNI-057`)
 * -----------------------------------------------------
 * `SPACING`, `OFFSET`, `YAW_DEG`, `GROUND_LINE`, `VH_PER_SCREEN`, `GROUND_LEAD`
 * and `GROUND_SQUASH` are the composition, and four different files want
 * them: the timeline, the CSS-facing placement, the scene registry's `vh`, and
 * the tests. A second copy of `800` anywhere is correct on the day it is written
 * and drifts the first time the lot is retimed, with no type error and no
 * failing test.
 *
 * THE WIREFRAME'S NUMBERS ARE NOT THESE NUMBERS, AND THAT IS NOT A BUG
 * --------------------------------------------------------------------
 * `docs/wireframes/theater.html` places screen 0 at `translateZ(-600px)`, not
 * `-800px`. The wireframe is a static picture of one frame — the one its header
 * describes as "just past the gate" — so every screen in it carries a depicted
 * `lotZ` of about 200px folded into its transform. The formulas below are the
 * source of truth; the wireframe is the composition they have to reproduce once
 * the world is translated.
 *
 * WHY THE CAMERA ENDS ONE SPACING PAST THE LAST SCREEN
 * ----------------------------------------------------
 * `lotZ(1, count)` is `SPACING * (count + 1)`, not `SPACING * count`. The last
 * screen's band has to end somewhere the visitor can still see it going dark;
 * ending the drive level with it would leave the eighth screen lit at the exit
 * beat, which reads as the page having stopped rather than the drive having
 * finished.
 */
import { clamp01 } from "../engine/progress";

/** Distance between one screen and the next, in CSS pixels of world Z. */
export const SPACING = 800;

/** How far off the lane each screen sits, alternating side by side. */
export const OFFSET = 480;

/** How far a screen turns to face the lane, in degrees. */
export const YAW_DEG = 18;

/**
 * Where the ground meets the sky, as a fraction of the stage's height.
 *
 * Consumed by the CSS (`.sds-lot__ground` sits at this fraction from the top,
 * and every screen's bottom rests on it), exported so the number has one home.
 */
export const GROUND_LINE = 0.58;

/**
 * Scroll length each screen gets, in `vh`.
 *
 * The scene's total is `100 + VH_PER_SCREEN * projects.length` — one viewport
 * for the pin itself plus this much scrolling per screen. At 120 a screen takes
 * a little over a viewport of scrolling to approach and pass, which is the
 * pacing the design spec settled on.
 */
export const VH_PER_SCREEN = 120;

/** Where one screen stands in the world, before the camera moves. */
export interface ScreenPlacement {
  /** Horizontal offset from the lane's centre. Negative is left. */
  x: number;
  /** Depth. Always negative: the screens are ahead of the gate. */
  z: number;
  /** Rotation about the vertical axis, in degrees, turning it toward the lane. */
  yaw: number;
}

/**
 * Place screen `i`.
 *
 * Screen 0 is on the left and each one after it alternates, so the drive is a
 * slalom rather than a corridor. The yaw turns each screen back toward the lane,
 * which is what stops the far ones from reading as edge-on slivers.
 */
export function screenPlacement(i: number): ScreenPlacement {
  const onTheLeft = i % 2 === 0;

  return {
    x: onTheLeft ? -OFFSET : OFFSET,
    z: -(i + 1) * SPACING,
    yaw: onTheLeft ? YAW_DEG : -YAW_DEG,
  };
}

/**
 * How far the camera has driven into the lot at `progress`.
 *
 * Measured forward from the gate in the same CSS pixels as {@link SPACING}, so
 * `lotZ === SPACING * i` is exactly the moment the camera draws level with
 * screen `i`. The world element is translated by this, which is the one tween
 * the whole drive is made of.
 */
export function lotZ(progress: number, count: number): number {
  return clamp01(progress) * SPACING * (count + 1);
}

/**
 * Rounds a band boundary that binary floating point puts a hair below itself.
 *
 * The bands are meant to meet exactly: {@link screenProgress}`(3, 8)` is the
 * progress at which screen 3 lights, so `activeScreen` must answer `3` there
 * and not `2`. It does not, without this. `3 / 9` is `0.3333333333333333`,
 * which is *less* than one third, so multiplying it back out gives
 * `2.9999999999999996` and `Math.floor` hands back the previous screen — the
 * screen behind the one DT5 just scrolled to.
 *
 * A billionth of the drive is about a hundred-thousandth of a CSS pixel of
 * world Z, so nothing visible moves; what changes is that the boundary is now
 * defined at the exact progress the inverse reports.
 */
const BAND_EPSILON = 1e-9;

/**
 * The screen the camera is currently approaching, or `null` between the last
 * one and the exit.
 *
 * The bands are contiguous and disjoint by construction — screen `i` owns
 * `[i · SPACING, (i + 1) · SPACING)` of {@link lotZ} — so exactly one screen is
 * lit at a time and the handover happens at a single point. The last screen
 * goes dark at exactly `lotZ === count · SPACING`, and nothing is lit for the
 * final spacing of the drive.
 *
 * Computed from progress directly rather than by dividing `lotZ` back down by
 * `SPACING`: the two are the same quantity, and the round trip through pixels
 * only adds a second rounding for {@link BAND_EPSILON} to absorb.
 */
export function activeScreen(progress: number, count: number): number | null {
  const i = Math.floor(clamp01(progress) * (count + 1) + BAND_EPSILON);

  return i >= 0 && i < count ? i : null;
}

/**
 * The progress at which screen `i`'s band begins.
 *
 * The inverse of {@link activeScreen}'s lower bound, and the position the
 * timeline's lit tween is placed at. DT5 uses it to scroll a focused screen's
 * band into view.
 */
export function screenProgress(i: number, count: number): number {
  return (i * SPACING) / (SPACING * (count + 1));
}

/**
 * How far in front of the camera the ground plane's near edge starts.
 *
 * One spacing, so the plane is already under the visitor at progress 0 rather
 * than beginning at the camera's own depth. Consumed by the CSS as
 * `--sds-ground-lead`, written onto the stage by `lot/build-lot.ts` — CSS
 * cannot import a constant, so the value is pushed rather than restated
 * (`EVO-UNI-057`).
 */
export const GROUND_LEAD = SPACING;

/**
 * How deep the asphalt has to be for the lot to have a horizon at every
 * progress.
 *
 * The camera drives {@link lotZ}`(1, count)` forward, so a plane that only
 * covers the lot itself slides out from under the far half of the drive: the
 * old fixed `4800px` plane ended *behind the camera* about a third of the way
 * down an eight-screen lot, and the viewport painted sky where the asphalt
 * should be. Invisible at night, because the sky's low stop and the far asphalt
 * are the same colour; glaring the moment a daylight sky lands (which is what
 * this phase is).
 *
 * Five spacings of margin: one for {@link GROUND_LEAD} in front of the camera,
 * four past the end of the drive so the far edge is still receding toward the
 * vanishing point when the camera stops.
 */
export function groundDepth(count: number): number {
  return lotZ(1, count) + 5 * SPACING;
}

/**
 * How much shallower than the lot the ground plane is DRAWN.
 *
 * The plane is laid out `groundDepth(count) / GROUND_SQUASH` pixels deep and
 * `scaleY(GROUND_SQUASH)`d back out, so it still spans the whole lot in world Z
 * while costing a quarter of the texture. Every length the plane paints along
 * its depth axis — the dash period, the parking rows — is divided by the same
 * number in the stylesheet, so the world geometry is identical at any value of
 * this constant and only the texel budget changes.
 *
 * WHY, AND WHAT WAS MEASURED
 * --------------------------
 * DT11 found the whole scene blinking during scroll once the ground got deep
 * enough: `groundDepth(20)` is 20800px against a `MAX_TEXTURE_SIZE` of 8192, and
 * the page reached ~145 Mpx of composited texture. Capping the depth fixed it
 * and was not available to us — the depth is what this phase exists to fix.
 *
 * Sectioning the plane into pieces under the texture limit was the other
 * candidate, and measuring it ruled it out: N abutting planes cost exactly what
 * one plane costs, because the total rastered AREA is unchanged. Against a
 * scripted scrub in headless Chromium (2026-09-09, 1440x900, `?period=afternoon`,
 * mean ms/frame over 120 scrubbed frames, twenty projects), `groundDepth(20)`
 * measured 137.9 as three abutting 4000x6934 planes and 134.0 as one 4000x20800
 * plane — the same number. Squashing the same depth instead: 86 at squash 2, 51
 * at 4, 34 at 8. Near-linear in area, and flat with respect to how the area is
 * divided up.
 *
 * 4 IS THE LARGEST SQUASH THE ROAD MARKINGS SURVIVE, and that is what picks it
 * rather than the shape of the curve. The thinnest thing the plane paints along
 * its depth axis is the 4px parking-row hairline, which becomes one texel at
 * squash 4, two-thirds of one at 6 and half of one at 8 — below a texel it
 * starts dropping out, and squash 6 and 8 measurably wash the rows and the
 * near dash's edges out against squash 4.
 *
 * What that buys, for the twenty projects `projects.ts` actually holds: 4000x5200
 * CSS pixels instead of 4000x20800, and 20.8 Mpx against the 19.2 Mpx of the
 * 4000x4800 plane it replaces — very slightly MORE texture, for two and a half
 * times the depth. (The frame cost is higher than that ratio suggests, because
 * the point of the phase is that the ground now reaches the horizon and
 * therefore covers roughly twice as many *screen* pixels. That part is the
 * feature.)
 *
 * THE CAP IS IN CSS PIXELS AND THE HARDWARE LIMIT IS IN DEVICE TEXELS
 * ------------------------------------------------------------------
 * {@link GROUND_RASTER_MAX} and the tests that enforce it compare CSS pixels
 * against a `MAX_TEXTURE_SIZE` of 8192, and those are only the same unit at
 * `devicePixelRatio` 1. IF Chromium's raster scale tracks DPR, a 5200px plane is
 * 10400 device texels on a 2x display — back over the limit, and back in DT11's
 * bug. That "if" is the open question, and it is open in the useful direction:
 *
 *   - Emulating DPR 2 in headless is real (a 400x300 viewport screenshots at
 *     800x600), and the ground's MARGINAL frame cost — the page with it, minus
 *     the page without it — is unchanged: 33.8ms at DPR 1 against 32.4ms at
 *     DPR 2, where a raster scale that tracked DPR would cost about four times
 *     as much. The same measurement is sharply sensitive to the CSS size (14.2ms
 *     at squash 8). That is consistent with Chromium pinning the raster scale for
 *     this layer, which is what it does for a subtree under an animating
 *     `will-change: transform` — `.sds-lot__world` is exactly that.
 *   - It is NOT decisive: headless exposes no `LayerTree`, so the layer's real
 *     texture size was never read, and the symptom is invisible in SwiftShader.
 *
 * If it ever needs settling, browser zoom is a real DPR change on real hardware
 * (Ctrl+= raises `devicePixelRatio`); the blink is the answer, not arithmetic.
 * Note that both bounds scale together: the texture rule wants
 * `k >= depth * dpr / 8000` and the one-texel rule wants `k <= 4 * dpr`, so
 * `k = 4 * dpr` satisfies both at any density and pins the plane at a constant
 * 5200 device texels. Making the squash DPR-aware is therefore a small, correct
 * change if a high-density display is ever shown to be affected.
 * **Until then, do not restate "one untiled layer" without qualifying the
 * display.**
 *
 * The other bound is the lot's size: at squash 4 the ground crosses
 * {@link GROUND_RASTER_MAX} at 35 projects. `geometry.test.ts` asserts that
 * against `projects.length` itself, so the thirty-fifth project fails the suite
 * rather than shipping a tiled plane.
 *
 * CONFIRMED ON REAL HARDWARE (Evan, 2026-09-09). Overriding this constant live
 * from the console — `document.querySelector('.sds-lot').style.setProperty(
 * '--sds-ground-squash', '1')` — restores the unsquashed 20800px plane, and the
 * scene blinks during scroll exactly as DT11 recorded, with a second symptom
 * DT11 did not name: **scrubbing backwards, the road falls away**. Back at 4 it
 * is clean. 6 and 8 were tried and make no visible difference, so 4 stands — it
 * is the value that keeps the parking rows sharpest (see above).
 *
 * That console override is the diagnostic to reach for if this ever regresses:
 * it needs no rebuild, and squash 1 is the known-bad shape to compare against.
 * Headless Chromium cannot substitute — it rasterises through SwiftShader and
 * reproduces neither symptom at any value.
 */
export const GROUND_SQUASH = 4;

/**
 * The largest single dimension a composited layer may have, in CSS pixels.
 *
 * NOT a design number — `MAX_TEXTURE_SIZE` on the hardware this page is
 * reviewed on is 8192, and a layer past it is tiled. 8000 leaves headroom for a
 * driver that reports the limit and then applies it to a slightly smaller
 * allocation. {@link GROUND_SQUASH} exists to keep the ground under it; the test
 * that ties the two together is in `geometry.test.ts`.
 *
 * Measured in CSS pixels, which equals device texels only at `devicePixelRatio`
 * 1 — see the note under {@link GROUND_SQUASH}. The guard is therefore a guard
 * against the lot growing, and not yet a guarantee about high-density displays.
 */
export const GROUND_RASTER_MAX = 8000;
