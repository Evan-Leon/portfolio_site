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
 * `SPACING`, `OFFSET`, `YAW_DEG`, `GROUND_LINE` and `VH_PER_SCREEN` are the
 * composition, and four different files want them: the timeline, the CSS-facing
 * placement, the scene registry's `vh`, and the tests. A second copy of `800`
 * anywhere is correct on the day it is written and drifts the first time the lot
 * is retimed, with no type error and no failing test.
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
