/*
 * The lot's arithmetic, against literal expected values.
 *
 * Every number below is written out — `-2400`, `3600`, `1 / 9` — rather than
 * recomputed from `SPACING` and friends. A test that says
 * `expect(screenPlacement(2).z).toBe(-(2 + 1) * SPACING)` restates the
 * implementation and passes for every value the constant could ever take
 * (`EVO-UNI-109`); these fail the moment the composition moves, which is the
 * point, because the approved wireframe was drawn against exactly these
 * numbers.
 *
 * `count` is 8 throughout — the real drive — so the band boundaries here are the
 * ones the page actually has.
 */
import { describe, expect, it } from "vitest";

import {
  activeScreen,
  GROUND_LINE,
  lotZ,
  OFFSET,
  screenPlacement,
  screenProgress,
  SPACING,
  VH_PER_SCREEN,
  YAW_DEG,
} from "./geometry";

/** The eight projects the real lot has. */
const COUNT = 8;

/*
 * The drive is nine spacings long: one per screen, plus the one past the last
 * screen that lets it go dark before the exit beat. So `1 / 9` is the first
 * handover and `8 / 9` is the moment the lot goes empty — written as ninths
 * here because that is what they are, independently of what `SPACING` is.
 */
const HANDOVER_0_TO_1 = 1 / 9;
const LAST_SCREEN_GOES_DARK = 8 / 9;
const A_HAIR = 1e-6;

describe("the lot's constants", () => {
  it("are the composition the wireframe was approved against", () => {
    expect({ SPACING, OFFSET, YAW_DEG, GROUND_LINE, VH_PER_SCREEN }).toEqual({
      SPACING: 800,
      OFFSET: 480,
      YAW_DEG: 18,
      GROUND_LINE: 0.58,
      VH_PER_SCREEN: 120,
    });
  });

  it("give the registry the scene length DT2 reserved", () => {
    expect(100 + VH_PER_SCREEN * COUNT).toBe(1060);
  });
});

describe("screenPlacement", () => {
  it("puts screen 0 on the left, one spacing in, turned toward the lane", () => {
    expect(screenPlacement(0)).toEqual({ x: -480, z: -800, yaw: 18 });
  });

  it("alternates sides and yaw with each screen", () => {
    expect(screenPlacement(1)).toEqual({ x: 480, z: -1600, yaw: -18 });
    expect(screenPlacement(2)).toEqual({ x: -480, z: -2400, yaw: 18 });
  });

  it("places the last screen eight spacings in, on the right", () => {
    expect(screenPlacement(7)).toEqual({ x: 480, z: -6400, yaw: -18 });
  });
});

describe("lotZ", () => {
  it("starts at the gate and ends one spacing past the last screen", () => {
    expect(lotZ(0, COUNT)).toBe(0);
    expect(lotZ(0.5, COUNT)).toBe(3600);
    expect(lotZ(1, COUNT)).toBe(7200);
  });

  it("clamps rather than driving out of the lot", () => {
    expect(lotZ(-0.5, COUNT)).toBe(0);
    expect(lotZ(1.5, COUNT)).toBe(7200);
  });

  it("draws level with screen i at i spacings", () => {
    // The property the bands are built on, stated once: at the start of screen
    // 3's band the camera has driven exactly 3 × 800 into the lot.
    expect(lotZ(3 / 9, COUNT)).toBeCloseTo(2400, 9);
  });
});

describe("activeScreen", () => {
  it("lights the first screen at the gate", () => {
    expect(activeScreen(0, COUNT)).toBe(0);
  });

  it("hands over from screen 0 to screen 1 at exactly one ninth", () => {
    expect(activeScreen(HANDOVER_0_TO_1 - A_HAIR, COUNT)).toBe(0);
    expect(activeScreen(HANDOVER_0_TO_1, COUNT)).toBe(1);
  });

  it("goes dark when the last screen's band ends, and stays dark", () => {
    expect(activeScreen(LAST_SCREEN_GOES_DARK - A_HAIR, COUNT)).toBe(7);
    expect(activeScreen(LAST_SCREEN_GOES_DARK, COUNT)).toBe(null);
    expect(activeScreen(1, COUNT)).toBe(null);
  });

  it("clamps out-of-range progress rather than indexing past the lot", () => {
    expect(activeScreen(-0.5, COUNT)).toBe(0);
    expect(activeScreen(1.5, COUNT)).toBe(null);
  });

  it("lights exactly one screen per band, in order, across the whole drive", () => {
    const midBand = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((band) => (band + 0.5) / 9);

    expect(midBand.map((progress) => activeScreen(progress, COUNT))).toEqual([
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      null,
    ]);
  });
});

describe("screenProgress", () => {
  it("is the progress each screen's band begins at", () => {
    expect(screenProgress(0, COUNT)).toBe(0);
    expect(screenProgress(1, COUNT)).toBe(HANDOVER_0_TO_1);
    expect(screenProgress(3, COUNT)).toBe(1 / 3);
    expect(screenProgress(7, COUNT)).toBe(7 / 9);
  });

  it("agrees with activeScreen — the two are one boundary described twice", () => {
    for (const i of [0, 1, 2, 3, 4, 5, 6, 7]) {
      expect(activeScreen(screenProgress(i, COUNT), COUNT)).toBe(i);
    }
  });
});
