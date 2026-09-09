/*
 * Reloading starts the drive over.
 *
 * The lot has no state of its own to lose: scroll position *is* the camera, so
 * whatever the browser puts back on a reload is the frame the visitor gets. The
 * default is to put back where they were, which means a refresh two thirds of
 * the way down hands someone the middle of a camera move with the approach
 * already behind them.
 *
 * WHY `scrollY` AND THE READOUT, NOT ONE OR THE OTHER
 * ---------------------------------------------------
 * `scrollY === 0` alone would pass on a page whose frame loop never started —
 * a build that threw during `start()` sits at the top too. The chrome's
 * percentage is written by the engine's `persistentLayer` every frame, so
 * reading `0%` off it is the page's own evidence that it is both at the
 * beginning *and* running (`EVO-UNI-017`).
 *
 * WHY THE BACK BUTTON IS IN THIS SPEC TOO
 * ----------------------------------------
 * `scrollRestoration = 'manual'` is set on the session, not on the load, so a
 * visitor who leaves the theater and comes back gets the beginning as well.
 * That is the intent and not a side effect — arriving mid-drive is the same
 * disorientation however the visitor got there — so it is pinned here rather
 * than left as behaviour nobody wrote down.
 *
 * WHY THE FRAGMENT CASE IS HERE
 * ------------------------------
 * The reset is a page-load default, not a policy, and the one thing that has to
 * override it is a visitor who asked for somewhere specific. `#exit` is the
 * skip link's target, so a reset that ignored the fragment would break the
 * page's keyboard escape hatch — and it would break it silently, since the
 * link would still be there and still be focusable.
 */
import { expect, test } from "@playwright/test";

import {
  APP_URL,
  EXIT_SECTION,
  PROGRESS_READOUT,
  openPage,
  scrollToScreen,
  waitForReveal,
  waitForScrollSettled,
} from "./helpers/app";

/** Far enough in that a restored position is unmistakable, and not the end. */
const MID_DRIVE_SCREEN = 4;

/** The page's own scroll position, after the engine has run a frame at it. */
async function scrollY(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

test("reloading mid-drive comes back at the beginning", async ({ page }) => {
  await openPage(page);
  await scrollToScreen(page, MID_DRIVE_SCREEN);

  /* The precondition, asserted rather than assumed: if the scroll above did
   * nothing, every assertion after the reload would pass on a page that had
   * never moved. */
  expect(await scrollY(page)).toBeGreaterThan(0);

  await page.reload();
  await waitForReveal(page);
  await waitForScrollSettled(page);

  expect(await scrollY(page)).toBe(0);
  await expect(page.locator(PROGRESS_READOUT)).toHaveText("0%");
});

test("coming back to the theater starts the drive over", async ({ page }) => {
  await openPage(page);
  await scrollToScreen(page, MID_DRIVE_SCREEN);
  expect(await scrollY(page)).toBeGreaterThan(0);

  /* `about:blank` rather than a page on the site: what is under test is the
   * theater's own entry, and any real second page would drag its own scripts
   * and its own load timing into a spec that has nothing to say about them. */
  await page.goto("about:blank");
  await page.goBack();
  await waitForReveal(page);
  await waitForScrollSettled(page);

  expect(await scrollY(page)).toBe(0);
  await expect(page.locator(PROGRESS_READOUT)).toHaveText("0%");
});

test("a fragment still wins over the reset", async ({ page }) => {
  await page.goto(`${APP_URL}#exit`);
  await waitForReveal(page);
  await waitForScrollSettled(page);

  /* Where the fragment points, not merely "not the top": the exit section is
   * the last thing on the page, so anywhere above it is a page that scrolled
   * somewhere of its own choosing. */
  await expect(page.locator(EXIT_SECTION)).toBeInViewport();
  expect(await scrollY(page)).toBeGreaterThan(0);
});
