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
 * `count` is 8 in the band arithmetic below — a worked example, NOT the registry.
 * `projects.ts` holds twenty; eight is the size the bands were designed and
 * approved against, and writing them as ninths keeps the boundaries readable.
 * Nothing about `activeScreen` or `screenProgress` is size-specific, so the
 * example proves the arithmetic. The one place the real count matters is the
 * ground's texture budget, and that test imports `projects` rather than a
 * literal — see "the ground the GPU actually rasterises".
 */
import { describe, expect, it } from "vitest";

import { projects } from "../projects";
import {
  activeScreen,
  GROUND_LEAD,
  GROUND_LINE,
  GROUND_RASTER_MAX,
  GROUND_SQUASH,
  groundDepth,
  lotZ,
  OFFSET,
  screenPlacement,
  screenProgress,
  SPACING,
  VH_PER_SCREEN,
  YAW_DEG,
} from "./geometry";

/** The eight-screen drive the band arithmetic was designed against. */
const COUNT = 8;

/** Twenty — which is both DT11's `lot20` probe and, today, the real registry. */
const A_BIG_LOT = 20;

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

  it("starts the asphalt one spacing in front of the camera", () => {
    // 800, written out: `expect(GROUND_LEAD).toBe(SPACING)` restates the
    // implementation and passes for every value SPACING could take
    // (`EVO-UNI-109`).
    expect(GROUND_LEAD).toBe(800);
  });

  it("draws the ground a quarter as deep as the lot it covers", () => {
    // Written out rather than derived. Changing this changes how the road's
    // dashes are sized in the stylesheet as well, so it is worth a test that
    // notices someone moving it (`EVO-UNI-109`).
    expect(GROUND_SQUASH).toBe(4);
    expect(GROUND_RASTER_MAX).toBe(8000);
    // `MAX_TEXTURE_SIZE` is 8192 on the hardware this page is reviewed on, and
    // the limit has to be under it, not at it.
    expect(GROUND_RASTER_MAX).toBeLessThan(8192);
  });

  it("give the registry the scene length DT2 reserved", () => {
    expect(100 + VH_PER_SCREEN * COUNT).toBe(1060);
  });
});

describe("groundDepth", () => {
  it("covers the eight-screen drive with margin at both ends", () => {
    // 11200 = the 7200 the camera drives, plus five spacings: one of lead in
    // front of it and four past the last screen. Written out, not recomputed
    // (`EVO-UNI-109`).
    expect(groundDepth(COUNT)).toBe(11200);
  });

  it("grows with the lot — a twenty-screen lot needs 20800px of asphalt", () => {
    expect(groundDepth(A_BIG_LOT)).toBe(20800);
  });

  it("outreaches the drive by more than the lead at either end", () => {
    // The property the number exists for: the far edge is still ahead of the
    // camera when the drive stops, so the lot never paints sky at ground level.
    expect(groundDepth(COUNT) - lotZ(1, COUNT)).toBeGreaterThan(GROUND_LEAD);
  });
});

describe("the ground the GPU actually rasterises", () => {
  /*
   * The invariant DT11 bought with a day of measurement: no single composited
   * layer over the texture limit. It is stated as a RELATIONSHIP between the two
   * constants rather than as a literal pixel count, because that is what it is —
   * pinning `2800` here would keep passing if `GROUND_SQUASH` and `groundDepth`
   * both moved and the layer went back over the limit (`EVO-UNI-110`).
   *
   * IN CSS PIXELS, which is the same unit as the hardware's texel limit only at
   * `devicePixelRatio` 1. These assertions therefore catch the lot GROWING past
   * the cap; they do not certify a 2x display, where the raster may be twice
   * these numbers. See the note on `GROUND_SQUASH`.
   */
  it("stays inside the texture limit at the eight-screen design size", () => {
    expect(groundDepth(COUNT) / GROUND_SQUASH).toBeLessThanOrEqual(
      GROUND_RASTER_MAX,
    );
  });

  it("stays inside it at twenty screens, DT11's `lot20`", () => {
    expect(groundDepth(A_BIG_LOT) / GROUND_SQUASH).toBeLessThanOrEqual(
      GROUND_RASTER_MAX,
    );
  });

  it("stays inside it for the lot `projects.ts` ACTUALLY holds", () => {
    /*
     * The one assertion here bound to the registry rather than to a literal, and
     * the only one that can stop a tiled plane from shipping. The examples above
     * are design sizes; this is production. At squash 4 the ground crosses
     * `GROUND_RASTER_MAX` at 35 projects, so without this the thirty-fifth
     * project would ship the exact defect DT11 measured, silently, with every
     * other test green (`EVO-UNI-110`).
     */
    expect(groundDepth(projects.length) / GROUND_SQUASH).toBeLessThanOrEqual(
      GROUND_RASTER_MAX,
    );
  });

  it("names the size the ground is today, so a change to it is visible", () => {
    // Twenty projects, 20800px of world Z, 5200px of texture. Written out: a
    // reader comparing this against the 4800px plane the phase removed should
    // see that the squash bought two and a half times the DEPTH for roughly the
    // same texture, not that it made the plane smaller.
    expect(projects.length).toBe(20);
    expect(groundDepth(projects.length)).toBe(20800);
    expect(groundDepth(projects.length) / GROUND_SQUASH).toBe(5200);
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
