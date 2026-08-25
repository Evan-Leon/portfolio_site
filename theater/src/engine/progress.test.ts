import { describe, expect, it } from "vitest";
import { clamp01, quantiseProgress, sceneProgress } from "./progress";

/*
 * Every expected number here is written as a literal, not derived from the
 * function under test (EVO-UNI-018). A test asserting `0 <= p && p <= 1` would
 * pass against a function that always returns 0.5.
 *
 * The scene used throughout: a 300vh scene on a 1000px viewport. Its element is
 * 3000px tall, so its pinned duration — `sceneLength` — is 3000 - 1000 = 2000px,
 * and it begins at `sceneTop` 1000.
 */
const SCENE_TOP = 1000;
const SCENE_LENGTH = 2000;

describe("clamp01", () => {
  it("passes through values already inside 0..1", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.25)).toBe(0.25);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });

  it("clamps below 0 and above 1 to the boundary itself", () => {
    expect(clamp01(-0.25)).toBe(0);
    expect(clamp01(-1000)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(1000)).toBe(1);
  });

  it("clamps infinities rather than passing them to an adapter", () => {
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(1);
    expect(clamp01(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe("sceneProgress", () => {
  it("is 0 at the scene start", () => {
    expect(sceneProgress(1000, SCENE_TOP, SCENE_LENGTH)).toBe(0);
  });

  it("is 0.5 at the scene midpoint", () => {
    expect(sceneProgress(2000, SCENE_TOP, SCENE_LENGTH)).toBe(0.5);
  });

  it("is 1 at the scene end", () => {
    expect(sceneProgress(3000, SCENE_TOP, SCENE_LENGTH)).toBe(1);
  });

  it("is a quarter through at a quarter of the pinned duration", () => {
    expect(sceneProgress(1500, SCENE_TOP, SCENE_LENGTH)).toBe(0.25);
  });

  it("returns negative raw progress before the scene starts", () => {
    // Unclamped on purpose: -0.25 is what tells the lifecycle this scene is
    // exactly one preload margin away. A clamped 0 would be indistinguishable
    // from "at the start".
    expect(sceneProgress(500, SCENE_TOP, SCENE_LENGTH)).toBe(-0.25);
    expect(sceneProgress(0, SCENE_TOP, SCENE_LENGTH)).toBe(-0.5);
  });

  it("returns raw progress above 1 after the scene ends", () => {
    expect(sceneProgress(4000, SCENE_TOP, SCENE_LENGTH)).toBe(1.5);
  });

  it("is 0 for a zero-length scene rather than NaN or Infinity", () => {
    // A scene whose element is exactly one viewport tall has no pinned
    // duration. `(scrollY - top) / 0` is Infinity, or NaN when scrollY equals
    // top — either one reaches an adapter as a frozen or blank scene.
    expect(sceneProgress(1500, SCENE_TOP, 0)).toBe(0);
    expect(sceneProgress(1000, SCENE_TOP, 0)).toBe(0);
    expect(sceneProgress(0, SCENE_TOP, 0)).toBe(0);
  });

  it("is 0 for a negative-length scene", () => {
    // An element shorter than the viewport measures as a negative duration.
    // Dividing by it would run progress backwards.
    expect(sceneProgress(1500, SCENE_TOP, -400)).toBe(0);
  });

  it("is a pure function of its arguments — SDS-001", () => {
    // Same input, same output, no matter what came before it. The engine calls
    // this from a rAF loop with a non-monotonic series; anything accumulated
    // here would drift the first time a visitor scrolls up.
    expect(sceneProgress(2000, SCENE_TOP, SCENE_LENGTH)).toBe(0.5);
    expect(sceneProgress(3000, SCENE_TOP, SCENE_LENGTH)).toBe(1);
    expect(sceneProgress(2000, SCENE_TOP, SCENE_LENGTH)).toBe(0.5);
    expect(sceneProgress(1000, SCENE_TOP, SCENE_LENGTH)).toBe(0);
    expect(sceneProgress(2000, SCENE_TOP, SCENE_LENGTH)).toBe(0.5);
  });

  it("scales with the scene length, so a longer scene advances more slowly", () => {
    // Same 500px of scrolling, two scene lengths.
    expect(sceneProgress(1500, SCENE_TOP, 1000)).toBe(0.5);
    expect(sceneProgress(1500, SCENE_TOP, 5000)).toBe(0.1);
  });
});

describe("quantiseProgress", () => {
  it("returns the keyframe values themselves unchanged", () => {
    // Quarters are exactly representable, so these are `toBe`, not `toBeCloseTo`
    // — a keyframe that came back as 0.7500000000000001 would seek twice.
    expect(quantiseProgress(0, 4)).toBe(0);
    expect(quantiseProgress(0.25, 4)).toBe(0.25);
    expect(quantiseProgress(0.5, 4)).toBe(0.5);
    expect(quantiseProgress(0.75, 4)).toBe(0.75);
    expect(quantiseProgress(1, 4)).toBe(1);
  });

  it("snaps to the nearest keyframe, switching at the midpoint between two", () => {
    expect(quantiseProgress(0.124, 4)).toBe(0);
    expect(quantiseProgress(0.125, 4)).toBe(0.25);
    expect(quantiseProgress(0.374, 4)).toBe(0.25);
    expect(quantiseProgress(0.375, 4)).toBe(0.5);
    expect(quantiseProgress(0.99, 4)).toBe(1);
  });

  it("honours a different step count", () => {
    expect(quantiseProgress(0.4, 2)).toBe(0.5);
    expect(quantiseProgress(0.2, 1)).toBe(0);
    expect(quantiseProgress(0.6, 1)).toBe(1);
  });

  it("is a pure function of its arguments — SDS-001", () => {
    // The point of quantising rather than stepping: the same progress produces
    // the same keyframe whichever direction the visitor arrived from, so a
    // reduced-motion scene scrubs backwards exactly as it scrubbed forwards.
    expect(quantiseProgress(0.6, 4)).toBe(0.5);
    expect(quantiseProgress(0.9, 4)).toBe(1);
    expect(quantiseProgress(0.6, 4)).toBe(0.5);
    expect(quantiseProgress(0.1, 4)).toBe(0);
    expect(quantiseProgress(0.6, 4)).toBe(0.5);
  });

  it("passes progress through untouched for a step count below 1", () => {
    // A guard, not a feature: zero steps would divide by zero and hand an
    // adapter NaN, which indexes a frame array as `undefined` and draws nothing.
    expect(quantiseProgress(0.37, 0)).toBe(0.37);
    expect(quantiseProgress(0.37, -4)).toBe(0.37);
    expect(quantiseProgress(0.37, Number.NaN)).toBe(0.37);
  });
});
