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
import { openPage, screenLocator, scrollToScreen } from "./helpers/app";

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
