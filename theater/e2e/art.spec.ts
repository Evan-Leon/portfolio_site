/*
 * The sprites, read pixel by pixel off the origin that actually serves them.
 *
 * WHY THIS IS A BROWSER TEST AND NOT A NODE ONE
 * ---------------------------------------------
 * Two reasons, and they are the two rules this file exists under. First,
 * `EVO-TOOL-054`: some image tools draw a literal grey checkerboard into fully
 * opaque pixels to *represent* transparency, and neither the file's reported
 * colour type nor its dimensions say anything about that — only a per-pixel
 * alpha read does. Second, `EVO-TOOL-055`: headless Chromium can render a false
 * opaque backdrop behind a transparent PNG shown through a CSS-scaled `<img>`,
 * in both full-page and element screenshots, so a screenshot comparison would
 * disagree with the truth and lose. `drawImage` into a canvas and
 * `getImageData` is the path a compositing engine actually takes, and it is the
 * one answer worth trusting.
 *
 * WHY `openPage` FIRST
 * --------------------
 * `getImageData` on a canvas that has been drawn from a cross-origin image
 * throws a `SecurityError` — the canvas is tainted. Opening the app puts the
 * page on the same origin the sprites are served from, so the read is legal.
 * It also means these URLs are fetched exactly as the lot fetches them, through
 * the same server and the same `base`.
 *
 * WHAT IS ASSERTED, AND WHY EACH ONE
 * ----------------------------------
 * The canvas size, because the mask and the wagon are drawn at their intrinsic
 * size and a sprite of the wrong shape silently letterboxes. The four corner
 * alphas, because a sprite with a background is a rectangle in the lot. The
 * transparent fraction inside a band, because 0 % is an opaque plate and 100 %
 * is an empty file — both of which pass every other check here. The car's
 * subject width, because a correct wagon drawn small in a large canvas is a toy
 * on the road. The tree's subject bottom, because a silhouette floating above
 * its own canvas is a tree hovering over the lot: the sprite is anchored `center
 * bottom`, so the pixels have to reach the bottom edge.
 *
 * The SVG fallback set loads through this same `Image` path and rasterises at
 * its intrinsic size, which is why DT14's exported SVGs carry `width`/`height`.
 */
import { expect, test } from "@playwright/test";

import { artUrls } from "../src/lot/art";
import { APP_PATH, openPage } from "./helpers/app";

/** The URLs as the served app builds them — `/theater/art/<name>.<ext>`. */
const ART = artUrls(APP_PATH);

/** Below this the sprite is an opaque plate; above it, it is nearly empty. */
const TRANSPARENT_MIN = 0.15;
const TRANSPARENT_MAX = 0.85;

/** What one sprite has to be. See the header for why each number is here. */
interface ArtContract {
  name: string;
  url: string;
  width: number;
  height: number;
  /** The narrowest the wagon may be drawn inside its canvas. `null` for a tree:
   *  the composition constrains a silhouette's height and footing, not how wide
   *  its canopy spreads. */
  minSubjectWidth: number | null;
  /** Whether the subject must reach the canvas's bottom edge. */
  mustSitOnTheFloor: boolean;
}

const CONTRACTS: readonly ArtContract[] = [
  {
    name: "car",
    url: ART.car,
    width: 1600,
    height: 900,
    minSubjectWidth: 960,
    mustSitOnTheFloor: false,
  },
  ...ART.trees.map((url, k) => ({
    name: `tree-${k + 1}`,
    url,
    width: 800,
    height: 1200,
    minSubjectWidth: null,
    mustSitOnTheFloor: true,
  })),
];

/** How close to the bottom edge a tree's lowest pixel has to be. */
const FLOOR_FRACTION = 0.95;

for (const contract of CONTRACTS) {
  test(`${contract.name} is a real transparent sprite`, async ({ page }) => {
    await openPage(page);

    const measured = await page.evaluate(async (url) => {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error(`the browser could not load ${url}`));
        image.src = url;
      });

      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (width === 0 || height === 0) {
        throw new Error(`${url} decoded to a ${width}x${height} image`);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("no 2d context to draw the sprite into");

      /* At its intrinsic size — a scaled draw would resample the alpha and
       * make every threshold below a property of the scale factor. */
      context.drawImage(image, 0, 0, width, height);
      const { data } = context.getImageData(0, 0, width, height);

      const alpha = (x: number, y: number): number =>
        data[(y * width + x) * 4 + 3] ?? 0;

      let transparent = 0;
      let minX = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (alpha(x, y) === 0) {
            transparent += 1;
            continue;
          }
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }

      const hasSubject = maxX >= minX;

      return {
        width,
        height,
        corners: [
          alpha(0, 0),
          alpha(width - 1, 0),
          alpha(0, height - 1),
          alpha(width - 1, height - 1),
        ],
        transparentFraction: transparent / (width * height),
        subjectWidth: hasSubject ? maxX - minX + 1 : 0,
        subjectBottom: hasSubject ? maxY + 1 : 0,
      };
    }, contract.url);

    expect(
      { width: measured.width, height: measured.height },
      `${contract.url} is the wrong canvas`,
    ).toEqual({ width: contract.width, height: contract.height });

    expect(measured.corners, `${contract.name} has a background`).toEqual([
      0, 0, 0, 0,
    ]);

    expect(measured.transparentFraction).toBeGreaterThanOrEqual(
      TRANSPARENT_MIN,
    );
    expect(measured.transparentFraction).toBeLessThanOrEqual(TRANSPARENT_MAX);

    if (contract.minSubjectWidth !== null) {
      expect(measured.subjectWidth).toBeGreaterThanOrEqual(
        contract.minSubjectWidth,
      );
    }

    if (contract.mustSitOnTheFloor) {
      expect(measured.subjectBottom).toBeGreaterThanOrEqual(
        FLOOR_FRACTION * contract.height,
      );
    }
  });
}
