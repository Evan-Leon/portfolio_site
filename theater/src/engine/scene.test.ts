import { describe, expect, it } from "vitest";
import { DEFAULT_MARGINS, sceneLifecycle, withPinVisibility } from "./scene";
import type { SceneMargins } from "./scene";

/*
 * Margins are in raw-progress units, so with DEFAULT_MARGINS the boundaries sit
 * at exactly these four numbers:
 *
 *   raw:  -0.25        0                 1              1.5
 *         |            |                 |               |
 *  unmounted | preloading |    active     |  preloading  | unmounted
 *
 * Each test below names a boundary and asserts both sides of it. A test that
 * only sampled the middle of each band would pass against an off-by-one
 * comparison, which is the whole failure mode here.
 */

describe("DEFAULT_MARGINS", () => {
  it("preloads a quarter of a scene length early and unloads half a length late", () => {
    expect(DEFAULT_MARGINS).toEqual({ preload: 0.25, unload: 0.5 });
  });
});

describe("sceneLifecycle", () => {
  it("is unmounted further out than the preload margin", () => {
    expect(sceneLifecycle(-2, DEFAULT_MARGINS)).toBe("unmounted");
    expect(sceneLifecycle(-0.2501, DEFAULT_MARGINS)).toBe("unmounted");
  });

  it("starts preloading exactly at the preload margin", () => {
    expect(sceneLifecycle(-0.25, DEFAULT_MARGINS)).toBe("preloading");
  });

  it("stays preloading through the approach", () => {
    expect(sceneLifecycle(-0.1, DEFAULT_MARGINS)).toBe("preloading");
    expect(sceneLifecycle(-0.0001, DEFAULT_MARGINS)).toBe("preloading");
  });

  it("becomes active exactly at progress 0", () => {
    expect(sceneLifecycle(0, DEFAULT_MARGINS)).toBe("active");
  });

  it("stays active across the whole scene, including its last frame", () => {
    expect(sceneLifecycle(0.5, DEFAULT_MARGINS)).toBe("active");
    expect(sceneLifecycle(0.9999, DEFAULT_MARGINS)).toBe("active");
    expect(sceneLifecycle(1, DEFAULT_MARGINS)).toBe("active");
  });

  it("returns to preloading immediately past the scene end", () => {
    // Still mounted, no longer scrubbed: a visitor who scrolls back up finds
    // the scene warm instead of watching it rebuild.
    expect(sceneLifecycle(1.0001, DEFAULT_MARGINS)).toBe("preloading");
    expect(sceneLifecycle(1.4999, DEFAULT_MARGINS)).toBe("preloading");
  });

  it("unmounts exactly at the unload margin", () => {
    expect(sceneLifecycle(1.5, DEFAULT_MARGINS)).toBe("unmounted");
    expect(sceneLifecycle(3, DEFAULT_MARGINS)).toBe("unmounted");
  });

  it("honours custom margins rather than the defaults", () => {
    const wide: SceneMargins = { preload: 1, unload: 2 };

    expect(sceneLifecycle(-1.0001, wide)).toBe("unmounted");
    expect(sceneLifecycle(-1, wide)).toBe("preloading");
    expect(sceneLifecycle(0, wide)).toBe("active");
    expect(sceneLifecycle(1, wide)).toBe("active");
    expect(sceneLifecycle(2.9999, wide)).toBe("preloading");
    expect(sceneLifecycle(3, wide)).toBe("unmounted");
  });

  it("keeps the scene active at both endpoints even with zero margins", () => {
    // The degenerate case: zero margins collapse both preloading bands to
    // nothing, but progress 0 and progress 1 are real frames and must still be
    // drawn. Ordering the active check first is what guarantees it.
    const none: SceneMargins = { preload: 0, unload: 0 };

    expect(sceneLifecycle(-0.0001, none)).toBe("unmounted");
    expect(sceneLifecycle(0, none)).toBe("active");
    expect(sceneLifecycle(1, none)).toBe("active");
    expect(sceneLifecycle(1.0001, none)).toBe("unmounted");
  });

  it("is a pure function of its arguments — the same raw always maps to the same state", () => {
    expect(sceneLifecycle(0.5, DEFAULT_MARGINS)).toBe("active");
    expect(sceneLifecycle(2, DEFAULT_MARGINS)).toBe("unmounted");
    expect(sceneLifecycle(0.5, DEFAULT_MARGINS)).toBe("active");
  });
});

/*
 * The numbers below are the real page at a 720px viewport, because that is where
 * the failure was found: the three scenes are 300vh, 400vh and 300vh, giving
 * scrub lengths of 1440, 2160 and 1440 against a 720px viewport.
 *
 * Before `withPinVisibility` existed, `intro`'s pin entered the viewport at
 * scrollY 71 while its adapter was not built until scrollY 431 — 360px of
 * scrolling with an empty panel on screen. These tests are that measurement,
 * expressed in the raw-progress units the lifecycle actually uses.
 */
describe("withPinVisibility", () => {
  const VIEWPORT = 720;
  /** 300vh scene: 3 viewports tall, so 2 viewports of scrub. */
  const SHORT_SCENE_LENGTH = 1440;
  /** 400vh scene. */
  const LONG_SCENE_LENGTH = 2160;

  it("widens both margins to the point where the pin enters and leaves the viewport", () => {
    // 720 / 1440 = 0.5, which beats the declared preload of 0.25 and ties unload.
    expect(
      withPinVisibility(DEFAULT_MARGINS, VIEWPORT, SHORT_SCENE_LENGTH),
    ).toEqual({
      preload: 0.5,
      unload: 0.5,
    });
  });

  it("leaves a margin alone when it is already wider than visibility demands", () => {
    // 720 / 2160 = 0.333…, so the declared 0.5 unload already covers it and only
    // preload moves. Widening a margin that was deliberately set larger would
    // silently override the scene author.
    expect(
      withPinVisibility(DEFAULT_MARGINS, VIEWPORT, LONG_SCENE_LENGTH),
    ).toEqual({
      preload: 720 / 2160,
      unload: 0.5,
    });
  });

  it("mounts the scene no later than the first pixel of its pin being visible", () => {
    const margins = withPinVisibility(
      DEFAULT_MARGINS,
      VIEWPORT,
      SHORT_SCENE_LENGTH,
    );

    /* The pin's top edge reaches the bottom of the viewport at raw
     * `-viewport / length`. One frame earlier the scene may be unmounted; from
     * that point on it must not be. This is the assertion the bug would fail:
     * with the declared 0.25 preload, raw -0.5 was 'unmounted' while 229px of
     * empty pin sat on screen. */
    expect(sceneLifecycle(-0.5, margins)).toBe("preloading");
    expect(sceneLifecycle(-0.4, margins)).toBe("preloading");
    expect(sceneLifecycle(-0.5, DEFAULT_MARGINS)).toBe("unmounted");
  });

  it("keeps the scene mounted until the pin has left the top of the viewport", () => {
    // A 200vh scene: 1 viewport of scrub, so visibility demands a full 1.0 on
    // each side and the declared 0.5 unload would drop it while still on screen.
    const twoHundredVh = withPinVisibility(DEFAULT_MARGINS, VIEWPORT, VIEWPORT);

    expect(twoHundredVh).toEqual({ preload: 1, unload: 1 });
    expect(sceneLifecycle(1.9, twoHundredVh)).toBe("preloading");
    expect(sceneLifecycle(1.9, DEFAULT_MARGINS)).toBe("unmounted");
  });

  it("unmounts exactly when the pin clears the viewport, and not before", () => {
    const margins = withPinVisibility(
      DEFAULT_MARGINS,
      VIEWPORT,
      SHORT_SCENE_LENGTH,
    );

    // raw 1.5 is scrollY = top + length + viewport: the pin's bottom edge is
    // exactly at the viewport top, so zero pixels of it are visible.
    expect(sceneLifecycle(1.4999, margins)).toBe("preloading");
    expect(sceneLifecycle(1.5, margins)).toBe("unmounted");
  });

  it("returns the margins untouched for a scene that cannot scrub", () => {
    /* Zero or negative length means the spacer is not taller than the viewport.
     * Dividing would produce Infinity or NaN — and NaN compares false against
     * every bound, so the scene would report 'unmounted' at every scroll
     * position and never render at all. */
    expect(withPinVisibility(DEFAULT_MARGINS, VIEWPORT, 0)).toEqual(
      DEFAULT_MARGINS,
    );
    expect(withPinVisibility(DEFAULT_MARGINS, VIEWPORT, -100)).toEqual(
      DEFAULT_MARGINS,
    );
    expect(withPinVisibility(DEFAULT_MARGINS, 0, SHORT_SCENE_LENGTH)).toEqual(
      DEFAULT_MARGINS,
    );
    expect(
      withPinVisibility(DEFAULT_MARGINS, Number.NaN, SHORT_SCENE_LENGTH),
    ).toEqual(DEFAULT_MARGINS);
  });
});
