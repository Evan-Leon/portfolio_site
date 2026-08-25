/*
 * Progress mathematics.
 *
 * Every function here is pure: same arguments, same result, no module-level
 * state and no caching. That is what `SDS-001` rests on — the rAF loop feeds
 * these a non-monotonic series of scroll positions, and anything remembered
 * between calls would drift the first time a visitor scrolls up.
 *
 * No DOM. These take numbers a `ScrollSource` and a layout measurement already
 * produced.
 */

/**
 * Constrain a number to the 0..1 range an adapter's `seek` accepts.
 *
 * Infinities clamp to their boundary rather than escaping into an adapter,
 * where `Infinity` typically indexes a frame array out of range and renders
 * nothing.
 */
export function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * A scene's **raw, unclamped** progress at a given scroll position.
 *
 * - `sceneTop` — distance from the top of the document to the top of the
 *   scene's spacer, in CSS pixels.
 * - `sceneLength` — the scene's **pinned duration** in CSS pixels: the height
 *   of its element minus one viewport height. A 300vh scene on a 1000px
 *   viewport is 3000px tall and therefore 2000px long.
 *
 * The result is deliberately not clamped. `-0.25` and `1.5` are meaningful
 * values — they are how `sceneLifecycle` tells "a quarter of a length before
 * this scene" from "half a length after it", and clamping here would collapse
 * both into `0` and `1` and make mount thresholds impossible. Clamp with
 * {@link clamp01} at the point of handing progress to an adapter, not here.
 *
 * A scene with no pinned duration returns `0`. That case is real: an element
 * exactly one viewport tall measures as zero length, and a shorter one measures
 * as negative. Dividing by either produces `Infinity`, `NaN`, or progress that
 * runs backwards — all of which reach the page as a scene frozen on one frame,
 * with no error anywhere.
 */
export function sceneProgress(
  scrollY: number,
  sceneTop: number,
  sceneLength: number,
): number {
  // Written as `!(x > 0)` rather than `x <= 0` so a `NaN` length — an
  // unmeasured element — takes the guard instead of falling through it.
  if (!(sceneLength > 0)) return 0;

  return (scrollY - sceneTop) / sceneLength;
}

/**
 * Snap progress to the nearest of `steps + 1` evenly spaced keyframes.
 *
 * `quantiseProgress(p, 4)` returns one of `0`, `0.25`, `0.5`, `0.75`, `1`. This
 * is the whole of the reduced-motion path (SD7): a scene under
 * `prefers-reduced-motion: reduce` is seeked with these values as the scroll
 * crosses the midpoints between them, so it steps through a handful of states
 * instead of scrubbing continuously.
 *
 * **Quantising the value, not branching the renderer**, is the point. An adapter
 * never learns which mode it is in — it receives the same `seek(progress)` it
 * always did, from the same call site — so `SDS-001` still holds and there is no
 * second rendering path to keep working. Snapping to the *nearest* keyframe
 * rather than the one below also keeps the mapping symmetric: scrolling up
 * produces the same states in reverse, at the same positions.
 *
 * A `steps` below 1 passes progress through untouched. That is a guard rather
 * than a feature: `steps` of `0` would divide by zero and deliver `NaN` to an
 * adapter, which typically indexes a frame array out of range and draws nothing,
 * with no error anywhere.
 */
export function quantiseProgress(progress: number, steps: number): number {
  if (!(steps >= 1)) return progress;

  return Math.round(progress * steps) / steps;
}
