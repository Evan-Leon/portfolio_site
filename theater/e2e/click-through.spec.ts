/*
 * A screen is a link, and clicking it lands on the project it names.
 *
 * The lot is eight `<a>` elements inside a perspective world, and every part of
 * that sentence is somewhere this can break silently: a screen rebuilt as a
 * `<div>` with a handler, a `transform` that leaves the element's hit area
 * somewhere other than where it is drawn, an `href` built from the theater's
 * `BASE_URL` and therefore pointing at `/theater/projects/…`. None of those
 * produce an error — they produce a lot that looks right and goes nowhere, or
 * goes somewhere wrong.
 *
 * WHY ALL EIGHT AND NOT A REPRESENTATIVE ONE
 * ------------------------------------------
 * The screens are built from one loop over `src/projects.ts`, so a wrong `href`
 * on screen 4 alone is not a plausible code failure — but a wrong *entry* on
 * screen 4 alone is exactly what a hand-maintained list produces, and it is
 * invisible until someone clicks it. Eight parameterised tests cost about eight
 * seconds and are the only thing standing between a typo'd slug and a live 404.
 *
 * THE ASSERTION IS THE LANDED PAGE, NOT THE URL ALONE
 * ---------------------------------------------------
 * A URL matching `project.href` proves only that the DOM agrees with the module
 * this spec imported its expectations from — the two would agree just as
 * happily on a slug that resolves to nothing. The `<title>` is the independent
 * witness: it comes from a hand-written `projects/<slug>.html` that knows
 * nothing about this list, so it can only match if the page is really there and
 * really is the project the screen named (`EVO-UNI-018`).
 */
import { expect, test } from "@playwright/test";

import { projects } from "../src/projects";
import {
  CHROME,
  CHROME_LOGO,
  LOT_SCENE,
  openPage,
  SCREEN,
  screenLocator,
  scrollToSceneProgress,
  scrollToScreen,
} from "./helpers/app";

for (const [i, project] of projects.entries()) {
  test(`screen ${i} goes to ${project.slug}`, async ({ page }) => {
    await openPage(page);

    /* Drive to it first: a screen the camera has not reached is a few pixels
     * wide near the vanishing point, and clicking it would be testing
     * Playwright's tolerance for tiny targets rather than the link. */
    await scrollToScreen(page, i);

    await screenLocator(page, i).click();

    await page.waitForURL(`**${project.href}`);
    expect(new URL(page.url()).pathname).toBe(project.href);
    await expect(page).toHaveTitle(new RegExp(escapeForRegExp(project.name)));
  });
}

/** `Nom Nom's` and `The Classic` are literals, not patterns. */
function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/*
 * THE HEADER IS NOT A CLICK TRAP.
 *
 * The tests above drive to each screen's band middle and click its centre, which
 * is the middle of the frame — nowhere near the fixed header. So for the whole
 * life of this suite a `position: fixed` bar across the top of the viewport
 * could, and did, swallow every click in its own 58 pixels: a project screen
 * whose top reached under it was simply not clickable there, and nothing was
 * looking (reported from the served page by Evan, 2026-09-09; DT13's sun made it
 * visible by being blurred in the same strip).
 *
 * WHY THIS READS THE HIT-TEST STACK AND NOT A BOUNDING BOX
 * -------------------------------------------------------
 * A screen is a 3D-transformed, yawed quad, so its `getBoundingClientRect` is an
 * axis-aligned box strictly larger than the shape the browser hit-tests — points
 * inside the box are routinely outside the screen. Picking a point from the box
 * and asserting the screen owns it therefore fails for reasons that have nothing
 * to do with the header (it did, on the first draft of this test). So the browser
 * is asked instead: `elementsFromPoint` returns the whole stack at a point, and
 * an element with `pointer-events: none` is absent from it. The claim is exactly
 * "wherever a screen is under the bar, the bar is not on top of it".
 *
 * Two viewports, because how far up the frame a screen reaches depends on the
 * viewport height, and a scan across the drive, because which progress puts a
 * screen under the bar depends on both.
 */
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 620 },
]) {
  test(`the header does not swallow clicks at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openPage(page);

    const covered: {
      progress: number;
      screen: string;
      topmost: string;
      trapped: boolean;
    }[] = [];

    for (const band of [0, 1, 2, 3]) {
      for (const offset of [0.35, 0.6, 0.85]) {
        const progress =
          (band + offset) / (projects.length + 1) < 1
            ? (band + offset) / (projects.length + 1)
            : 0.99;
        await scrollToSceneProgress(page, LOT_SCENE, progress);

        covered.push(
          ...(await page.evaluate(
            ({ chrome, screen, progress }) => {
              const bar = document
                .querySelector(chrome)!
                .getBoundingClientRect();
              const y = bar.height / 2;
              const hits: {
                progress: number;
                screen: string;
                topmost: string;
                trapped: boolean;
              }[] = [];

              for (let x = 12; x < innerWidth; x += 12) {
                const stack = document.elementsFromPoint(x, y);
                const owner = stack
                  .map((element) => element.closest<HTMLElement>(screen))
                  .find(Boolean);
                if (!owner) continue;

                const top = stack[0];
                hits.push({
                  progress,
                  screen: owner.dataset.screenIndex ?? "?",
                  topmost: top ? top.className || top.tagName : "nothing",
                  /* The strip and the progress bar are decoration and must never
                   * be on top of anything. The LOGO may be: it is a real link,
                   * and a control covering what is behind it is what controls
                   * do — it is only the chrome's non-interactive parts that have
                   * no business intercepting a click. */
                  trapped: Boolean(
                    top?.classList.contains("sds-chrome") ||
                    top?.classList.contains("sds-chrome__bar"),
                  ),
                });
              }
              return hits;
            },
            { chrome: CHROME, screen: SCREEN, progress },
          )),
        );
      }
    }

    /* The test is only meaningful if a screen actually reached under the bar
     * somewhere in that scan — an empty list would pass for a page with no lot
     * at all (`EVO-UNI-118`). */
    expect(covered.length).toBeGreaterThan(0);

    for (const hit of covered) {
      expect(
        hit.trapped,
        `at progress ${hit.progress}, screen ${hit.screen} is under ${hit.topmost}`,
      ).toBe(false);
    }
  });
}

test("the header's own link still receives a real click", async ({ page }) => {
  /*
   * The other half of the fix above. `.sds-chrome` opts out of hit-testing so it
   * cannot swallow a screen's clicks, and the logo opts back in — a pairing that
   * fails silently in the direction nothing else covers: `keyboard.spec.ts`
   * proves the logo is *focusable* and in tab order, which stays true even when
   * an inherited `pointer-events: none` has made it unclickable with a mouse.
   *
   * WHY THIS DOES NOT FOLLOW THE NAVIGATION
   * ---------------------------------------
   * The logo's `href` is `/`, the portfolio's homepage — which exists under
   * nginx and does NOT under the `vite preview` server this suite runs against,
   * where `base` is `/theater/` and `/` is a 302 straight back to it. Asserting
   * the landing page would be asserting a property of the test server. What is
   * being tested is narrower and is the thing the change can break: that a real
   * mouse click, hit-tested by the browser through the header's
   * `pointer-events: none`, arrives at the link. The default is prevented so the
   * page does not navigate away mid-assertion.
   */
  await openPage(page);

  await page.locator(CHROME_LOGO).evaluate((logo) => {
    logo.addEventListener("click", (event) => {
      event.preventDefault();
      (event.currentTarget as HTMLElement).dataset.clicked = "yes";
    });
  });

  await page.locator(CHROME_LOGO).click();

  await expect(page.locator(CHROME_LOGO)).toHaveAttribute(
    "data-clicked",
    "yes",
  );
});
