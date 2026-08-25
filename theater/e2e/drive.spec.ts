/*
 * The drive: scroll position as the camera's clock, and the same frame coming
 * back on the way up.
 *
 * The second test is `SDS-001` verified end to end, and it is the most valuable
 * case in this suite. Everything below it has a unit test — `lotZ` is pure, the
 * adapter contract kit exercises idempotence against a stub. What no unit test
 * can reach is whether the assembled system — Lenis smoothing the scroll, the
 * engine's epsilon guard, the scene's mount margins, GSAP's own timeline cache
 * — still puts the *identical* transform back on the world when the visitor
 * scrolls up. An adapter that advanced by a delta instead of seeking absolutely
 * would drift here and nowhere else.
 *
 * WHY THE COMPUTED TRANSFORM AND NOT `lotZ`
 * -----------------------------------------
 * `lotZ(progress, 8)` is arithmetic this spec could do itself, and comparing it
 * to itself would prove nothing. What is asserted instead is the matrix the
 * browser actually composited: a drive tween aimed at the wrong element, a
 * timeline that was never scrubbed, or a stylesheet rule that overrode the
 * transform all leave the arithmetic perfect and the lot motionless
 * (`EVO-UNI-017`).
 *
 * WHY THE POSITIONS ARE MEASURED AND NOT WRITTEN DOWN
 * ---------------------------------------------------
 * The lot's spacer is `1060vh`, so its scroll span is a different number of
 * pixels at every viewport height. The three stops below are stated as band
 * midpoints and turned into pixels from the spacer's own bounding box, which is
 * what lets the same body run at any viewport instead of quietly scrubbing the
 * wrong part of the page at a second one.
 */
import { expect, test } from "@playwright/test";

import {
  openPage,
  scrollToScreen,
  worldTransform,
  parseTranslateZ,
} from "./helpers/app";

/**
 * Three stops, one band apart at each step and none of them at a boundary.
 *
 * Screen 1 rather than screen 0 for the first: the camera is at `lotZ === 0`
 * for the whole of the approach to screen 0, so a first reading taken there
 * would be zero on a working page *and* on a frozen one, and the monotonic
 * assertion below would have nothing to say.
 */
const STOPS = [1, 4, 6];

test("driving forward moves the camera into the lot", async ({ page }) => {
  await openPage(page);

  const depths: number[] = [];
  for (const screenIndex of STOPS) {
    await scrollToScreen(page, screenIndex);
    depths.push(parseTranslateZ(await worldTransform(page)));
  }

  /* Strictly increasing, stop by stop — a single "last > first" would pass on a
   * world that jumped to the end and sat there. */
  expect(depths[0]).toBeLessThan(depths[1]!);
  expect(depths[1]).toBeLessThan(depths[2]!);

  /* And the camera is genuinely inside the lot rather than a hair off zero. */
  expect(depths[0]).toBeGreaterThan(0);
});

test("scrubbing back restores the identical matrix (SDS-001)", async ({
  page,
}) => {
  await openPage(page);

  await scrollToScreen(page, STOPS[0]!);
  const first = await worldTransform(page);

  /*
   * The world is 3D-transformed, so the browser serialises a `matrix3d`. Said
   * out loud because the equality below is a string comparison: a page that
   * degraded to a 2D `matrix(1, 0, 0, 1, 0, 0)` at both stops would satisfy
   * "the same transform came back" perfectly and mean the drive had stopped
   * happening at all.
   */
  expect(first).toMatch(/^matrix3d\(/);

  await scrollToScreen(page, STOPS[2]!);
  const away = await worldTransform(page);

  /* The guard that stops the real assertion from passing vacuously
   * (`EVO-UNI-018`): proving the camera moved is what makes proving it came
   * back mean something. */
  expect(away).not.toEqual(first);

  await scrollToScreen(page, STOPS[0]!);
  expect(await worldTransform(page)).toEqual(first);
});
