/*
 * The page opens: a gate that shows itself, dismisses itself, and eight screens
 * standing behind it.
 *
 * This is the suite's floor. Every other spec here scrolls the lot and reads
 * something out of it, and every one of them would fail in the same confusing
 * way — a locator that resolves to nothing — if the app simply never revealed.
 * So the reveal is asserted once, on its own, and the eight screens are counted
 * with it: the lot's whole content is `src/projects.ts`, and a lot that builds
 * seven screens, or eight in the wrong order, is a page that looks fine and is
 * showing the wrong portfolio.
 *
 * WHY THE EXIT LIST IS THE WITNESS AND NOT `projects.length`
 * ----------------------------------------------------------
 * This spec imports `src/projects.ts` to know what to expect, so "there are
 * `projects.length` screens" is a statement the lot cannot fail: delete an
 * entry and both sides of the comparison shrink together. The page carries an
 * independent copy of the same list — the hand-written `<ul class="sds-exit-list">`
 * in `index.html`, which is what a visitor with no JavaScript gets instead of
 * the lot — and that one is not imported from anywhere. Comparing the screens
 * to it is a check that can actually fail (`EVO-UNI-061`), and it fails in the
 * two ways that matter: a lot built from a drifted list, and a fallback list
 * that no longer matches the lot.
 *
 * WHY THE GATE IS OBSERVED IN THREE STATES AND NOT ONE
 * ----------------------------------------------------
 * "The loader eventually goes away" is also true of a loader that was never
 * added, and of one the browser tore down on an error. The three states —
 * attached, wearing the revealed class, gone — are the sequence a working gate
 * actually produces, and each is only reachable through the one before it.
 *
 * The middle state is observable because the ring holds for
 * `--sds-loader-min-visible` (400ms) and then takes `REVEAL_FADE_MS` (900ms) to
 * remove itself, so there is most of a second in which the class is on the DOM.
 * This is not a race the spec wins by being fast: Playwright's expectations
 * poll, and the assertion is against a condition rather than a moment
 * (`EVO-TOOL-071`).
 */
import { expect, test } from "@playwright/test";

import { projects } from "../src/projects";
import {
  APP_PATH,
  EXIT_LIST_LINK,
  LOADER,
  LOADER_REVEALED_CLASS,
  SCREEN,
  waitForReveal,
} from "./helpers/app";

test("the loading ring shows, reveals, and leaves", async ({ page }) => {
  /* Not `openPage` — that helper's whole job is to wait until the gate is gone,
   * which is the last of the three states this test is here to watch. */
  await page.goto(APP_PATH);

  const loader = page.locator(LOADER);
  await expect(loader).toBeVisible();
  await expect(loader).toHaveClass(new RegExp(LOADER_REVEALED_CLASS));

  await waitForReveal(page);
});

test("the lot holds one screen per project, in drive order", async ({
  page,
}) => {
  await page.goto(APP_PATH);
  await waitForReveal(page);

  const screens = page.locator(SCREEN);
  await expect(screens).toHaveCount(projects.length);

  /*
   * The hrefs by value and in order, not just the count (`EVO-UNI-018`). A lot
   * built from a reversed or deduplicated list has exactly eight screens and
   * sends every visitor to the wrong project page.
   *
   * `href` is compared as the resolved absolute URL because that is what the
   * DOM property gives back, and it is also what the click actually navigates
   * to — the attribute could be right while a `<base>` or a stray prefix sent
   * the navigation somewhere else.
   */
  const hrefs = await screens.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLAnchorElement).href),
  );

  expect(hrefs).toEqual(
    projects.map((project) => new URL(project.href, page.url()).href),
  );

  /* And the same eight, in the same order, as the page's own no-JavaScript
   * fallback — the half of this that does not come from the module above. */
  const exitList = page.locator(EXIT_LIST_LINK);
  await expect(exitList).toHaveCount(projects.length);
  expect(
    await exitList.evaluateAll((elements) =>
      elements.map((element) => (element as HTMLAnchorElement).href),
    ),
  ).toEqual(hrefs);
});
