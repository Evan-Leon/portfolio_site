/*
 * The sky the page decides to be, in a real browser.
 *
 * This is the one spec that navigates *unpinned*. Every other spec goes through
 * `openPage`, which appends `?period=night` so the composition it asserts about
 * cannot change with the hour (`PINNED_PERIOD` in `helpers/app.ts`). The pin is
 * only trustworthy if the two things underneath it are true — that an explicit
 * `?period=` really does win, and that without one the page really does read
 * the clock — so both are asserted here, and here only.
 *
 * WHY THE CLOCK IS INSTALLED BEFORE `goto`
 * ----------------------------------------
 * `installPeriod` runs at module evaluation, in the same task as the first
 * paint. `page.clock.install` after navigation would replace the clock some
 * time after that read had already happened, so the assertion would be about
 * the runner's real hour with a fake clock sitting unused beside it. Same
 * ordering rule `reduced-motion.spec.ts` follows for `emulateMedia`.
 *
 * WHY EVERY ASSERTION POLLS
 * -------------------------
 * `expect.poll`, never a `waitForTimeout` (`EVO-TOOL-071`). The attribute is
 * written by the entry module, so on a cold navigation it exists before the
 * document is interactive — but the `visibilitychange` tests below assert on a
 * value written by a listener, and a fixed wait sized on this machine is the
 * classic way to produce a suite that only passes on this machine.
 *
 * Nothing here asserts about how the page *looks*. `data-period` styles nothing
 * yet; DT13 adds the sky and the assertions that read it.
 */
import { expect, test } from "@playwright/test";

import { PERIODS } from "../src/page/period";
import { APP_PATH, periodAttribute, waitForReveal } from "./helpers/app";

/* Local time, not UTC: `getPeriod` reads `date.getHours()`, which is the
 * visitor's own clock, and a `Z`-suffixed literal would name a different hour
 * on every runner timezone. */
const AN_EVENING = "2026-09-08T18:30:00";
const THE_SMALL_HOURS = "2026-09-09T03:00:00";
const JUST_BEFORE_EIGHT = "2026-09-08T19:59:30";
const JUST_AFTER_EIGHT = "2026-09-08T20:00:30";

for (const period of PERIODS) {
  test(`?period=${period} puts the page in ${period}`, async ({ page }) => {
    await page.goto(`${APP_PATH}?period=${period}`);
    await waitForReveal(page);

    await expect.poll(() => periodAttribute(page)).toBe(period);
  });
}

test("an unrecognised ?period= falls back to the clock", async ({ page }) => {
  await page.clock.install({ time: new Date(AN_EVENING) });
  await page.goto(`${APP_PATH}?period=bogus`);
  await waitForReveal(page);

  /* Not `night`, and not blank: a typo in the URL shows the visitor the real
   * time of day rather than a page stuck in whatever the fallback happened to
   * be. 18:30 is the middle of the sunset band. */
  await expect.poll(() => periodAttribute(page)).toBe("sunset");
});

test("with no ?period= at all the page reads the clock", async ({ page }) => {
  await page.clock.install({ time: new Date(THE_SMALL_HOURS) });
  await page.goto(APP_PATH);
  await waitForReveal(page);

  await expect.poll(() => periodAttribute(page)).toBe("night");
});

test("a tab left open across a band boundary catches up", async ({ page }) => {
  await page.clock.install({ time: new Date(JUST_BEFORE_EIGHT) });
  await page.goto(APP_PATH);
  await waitForReveal(page);
  await expect.poll(() => periodAttribute(page)).toBe("sunset");

  /*
   * The clock moves thirty seconds past 20:00 and the tab is brought back. The
   * page has been open the whole time — nothing re-navigates — so the only
   * thing that can move the attribute is the `visibilitychange` listener.
   */
  await page.clock.setFixedTime(new Date(JUST_AFTER_EIGHT));
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );

  await expect.poll(() => periodAttribute(page)).toBe("evening");
});

test("an overridden page never catches up", async ({ page }) => {
  await page.clock.install({ time: new Date(JUST_BEFORE_EIGHT) });
  await page.goto(`${APP_PATH}?period=sunset`);
  await waitForReveal(page);

  /*
   * The same steps as the test above, and the point of the pin: a spec that
   * asked for a period keeps it even though the clock has crossed a boundary
   * under it. Without this, `?period=night` would be a starting position rather
   * than a pin and every long-running spec would be back to racing the hour.
   */
  await page.clock.setFixedTime(new Date(JUST_AFTER_EIGHT));
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );

  await expect.poll(() => periodAttribute(page)).toBe("sunset");
});
