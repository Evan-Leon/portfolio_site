/*
 * Reaching the lot — and driving it — without a mouse.
 *
 * Two things have to be true and they break in different ways.
 *
 * The skip link is the ordinary one: a page whose first screens are a pinned,
 * scrubbed animation is exactly the page a keyboard visitor most needs a way
 * past, and the link only works if it is the *first* thing Tab reaches and if
 * following it moves **focus**, not merely the scroll position. The second half
 * is the one that breaks silently — a fragment link scrolls to its target
 * whether or not the target can hold focus, so if `#exit` lost its
 * `tabindex="-1"` the page would still jump to the right place and the next Tab
 * would drop the visitor back into the drive they just skipped.
 *
 * The second is specific to this page. The screens are real links inside a
 * pinned container, so they are already in the tab order — but focus alone
 * moves nothing, and the browser cannot scroll a pinned element into view
 * because it never leaves the viewport. Without `main.ts`'s `focusin`
 * handler, tabbing walks an invisible list of links somewhere down the
 * lane: focus is in the right place, the accessible name is announced, and the
 * visitor sees a static picture of a car park. Nothing errors. So each Tab is
 * asserted three ways — the right link has focus, the page actually moved, and
 * the screen that link belongs to is the lit one.
 *
 * WHY THE FIRST TWO TABS ARE NAMED
 * --------------------------------
 * Tab does not reach the lot first: the skip link comes before it and the
 * chrome's home link after that. Both are stated rather than tabbed past
 * silently, because "press Tab twice, then start asserting" is a spec that
 * quietly starts checking the wrong element the day a control joins the header.
 */
import { expect, test } from "@playwright/test";

import { projects } from "../src/projects";
import {
  CHROME_LOGO,
  EXIT_SECTION,
  SKIP_LINK,
  focusedElementDescription,
  isFocused,
  openPage,
  screenLit,
  screenLocator,
  waitForScrollSettled,
} from "./helpers/app";

test("the skip link is the first focusable element and moves focus past the drive", async ({
  page,
}) => {
  await openPage(page);

  // Focus starts on the body after load, so one Tab lands on whatever the page
  // offers first.
  await page.keyboard.press("Tab");

  const skip = page.locator(SKIP_LINK);
  expect(
    await isFocused(skip),
    `focus was on ${await focusedElementDescription(page)}`,
  ).toBe(true);

  // Visible only when focused — a skip link nobody can see is a skip link
  // nobody can use.
  await expect(skip).toBeVisible();
  await expect(skip).toHaveAttribute("href", EXIT_SECTION);

  await page.keyboard.press("Enter");

  const exit = page.locator(EXIT_SECTION);
  expect(
    await isFocused(exit),
    `focus was on ${await focusedElementDescription(page)}`,
  ).toBe(true);
});

test("tabbing past the header drives to each screen in turn", async ({
  page,
}) => {
  /*
   * The longest test in the suite, and legitimately so: one Tab press per
   * project — twenty of them — each handing Lenis a smooth scroll that has to
   * finish before the next assertion can read where the page landed. It has
   * always run at about 23s against
   * Playwright's 30s default, which left it no room — and DT13's ground plane,
   * which now reaches the horizon instead of stopping a third of the way down
   * the lot, costs about 4s more here (measured: 53ms/frame against 29ms, in a
   * headless SOFTWARE rasteriser, whose cost is the SCREEN pixels a frame
   * touches — and the ground now reaches the horizon instead of stopping a
   * third of the way down the lot, which is the feature). `test.slow` rather
   * than a bare `setTimeout` because it is the marker Playwright's own
   * reporting reads.
   */
  test.slow();

  await openPage(page);

  await page.keyboard.press("Tab");
  expect(
    await isFocused(page.locator(SKIP_LINK)),
    `focus was on ${await focusedElementDescription(page)}`,
  ).toBe(true);

  await page.keyboard.press("Tab");
  expect(
    await isFocused(page.locator(CHROME_LOGO)),
    `focus was on ${await focusedElementDescription(page)}`,
  ).toBe(true);

  let previousScrollY = await page.evaluate(() => window.scrollY);

  for (const i of projects.keys()) {
    await page.keyboard.press("Tab");

    /* The handler hands Lenis a target and returns, so the scroll is still
     * happening on the next line. Waiting for it to stop is the difference
     * between reading where the page is going and where it was
     * (`EVO-TOOL-071`). */
    await waitForScrollSettled(page);

    const screen = screenLocator(page, i);
    expect(
      await isFocused(screen),
      `after ${i + 1} tabs into the lot, focus was on ${await focusedElementDescription(page)}`,
    ).toBe(true);

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(
      scrollY,
      `Tab onto screen ${i} did not drive the page`,
    ).toBeGreaterThan(previousScrollY);
    previousScrollY = scrollY;

    /*
     * The assertion that makes the other two mean something: the page moved,
     * and it moved to *this* screen's band. A handler that drove to a fixed
     * position, or to `screenProgress` of the wrong index, satisfies both
     * "focus is right" and "the page moved" (`EVO-UNI-018`).
     */
    expect(await screenLit(page, i), `screen ${i} was not lit`).toBeCloseTo(
      1,
      2,
    );
  }
});
