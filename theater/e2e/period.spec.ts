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
 * WHAT THE LOOK ASSERTIONS ARE READING, AND WHY THEY ARE COMPUTED VALUES
 * ----------------------------------------------------------------------
 * `data-period` selects a block of tokens, and a token nothing reads is a token
 * that does not exist as far as a visitor is concerned. A check that asked the
 * root for `getPropertyValue('--sds-sky-top')` would pass just as happily
 * against a stylesheet in which no rule mentions it. So every assertion below
 * reads a CONSUMER — the stage's resolved `background-image`, the star layer's
 * `opacity`, a screen surface's resolved `filter` — which can only be right if
 * the whole chain from attribute to token to rule is wired (`EVO-UNI-017`).
 */
import { expect, test } from "@playwright/test";

import { projects } from "../src/projects";
import { PERIODS } from "../src/page/period";
import {
  APP_PATH,
  GROUND,
  LOT,
  periodAttribute,
  screenLocator,
  SCREEN_SURFACE,
  scrollToScreen,
  waitForReveal,
} from "./helpers/app";

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

/*
 * ---------------------------------------------------------------------------
 * WHAT THE PERIOD ACTUALLY CHANGES
 * ---------------------------------------------------------------------------
 * Two periods, at opposite ends of the range, asserted through four different
 * consumers — the stage's sky, the star layer's opacity, both ends of a screen's
 * brightness, and the ground's road. Afternoon and night rather than a sweep of
 * all six: the six
 * palettes are one mechanism transcribed six times, so a seventh assertion adds
 * a transcription check and no mechanism check, and the two ends are where the
 * roles are furthest apart (`--sds-star-alpha` 0 vs 1, `--sds-unlit-floor` 0.75
 * vs 0.35). The other four are reviewed against the wireframe by eye.
 */

/*
 * THE WHOLE GRADIENT, NOT THE TOP STOP.
 *
 * These are hand-written literals, deliberately not derived from `tokens.css` —
 * that independence is what makes them a witness rather than a restatement
 * (`EVO-UNI-207`). All three stops AND their positions, because a substring
 * check for the top colour alone is satisfied by a sky with its stops in the
 * wrong order: swapping `--sds-sky-top` and `--sds-sky-low` in the gradient
 * inverts the sky on screen and leaves a `toContain` assertion green (measured
 * 2026-09-09 — the check shipped that way for an afternoon before an adversarial
 * review built the mutation). `EVO-UNI-018`: assert the vector, not a member of
 * it.
 */
const AFTERNOON_SKY =
  "linear-gradient(rgb(59, 120, 200) 0%, rgb(142, 192, 234) 45%, rgb(216, 232, 244) 100%)";
const NIGHT_SKY =
  "linear-gradient(rgb(10, 5, 32) 0%, rgb(13, 16, 51) 45%, rgb(18, 10, 46) 100%)";

const LOOK = [
  { period: "afternoon", sky: AFTERNOON_SKY, stars: "0", floor: 0.75 },
  { period: "night", sky: NIGHT_SKY, stars: "1", floor: 0.35 },
] as const;

for (const { period, sky: expectedSky, stars, floor } of LOOK) {
  test(`${period} paints its own sky, stars and screen floor`, async ({
    page,
  }) => {
    await page.goto(`${APP_PATH}?period=${period}`);
    await waitForReveal(page);

    /* The stage's only background is the sky, so this is the whole of what the
     * period did to it — three stops and three positions, exactly. */
    const sky = await page
      .locator(LOT)
      .evaluate((element) => getComputedStyle(element).backgroundImage);
    expect(sky).toBe(expectedSky);

    /* The starfield is a pseudo-element, so it has no locator — but it does
     * have a computed style, and its opacity is the whole of what a period does
     * to it. */
    const starOpacity = await page
      .locator(LOT)
      .evaluate((element) => getComputedStyle(element, "::before").opacity);
    expect(starOpacity).toBe(stars);

    /*
     * And what the period does to the screens' lighting, at BOTH ends of the
     * interval — which is the whole of what `--sds-unlit-floor` means.
     *
     * Driven to the middle of screen 0's band, screen 0 is fully lit and screen
     * 1 is the nearest one the timeline is holding dark. The floor moves with
     * the period (0.35 at night, 0.75 at noon); full brightness does not, and is
     * 1 in every period by construction. Asserting only the dark one is not a
     * contract: a `filter` rewritten to `brightness(var(--sds-unlit-floor))`
     * leaves every screen permanently dim, and the floor assertion — plus the
     * whole of `active-screen.spec.ts`, which reads the timeline's property and
     * the video rather than this consumer — stays green (measured 2026-09-09,
     * by an adversarial review that built the mutation). `EVO-UNI-018`.
     */
    await scrollToScreen(page, 0);

    const [lit, unlit] = await Promise.all(
      [0, 1].map((i) =>
        screenLocator(page, i)
          .locator(SCREEN_SURFACE)
          .evaluate((element) => getComputedStyle(element).filter),
      ),
    );

    expect(lit).toBe("brightness(1)");
    expect(unlit).toBe(`brightness(${floor})`);
  });
}

/*
 * ---------------------------------------------------------------------------
 * THE ROAD, WHICH IS THE ONE THING THE PERIOD MUST *NOT* CHANGE
 * ---------------------------------------------------------------------------
 * Paint is paint at every hour: `--sds-road-line` and `--sds-road-edge` are
 * declared once in `tokens.css` and no `[data-period]` block restates them. The
 * asphalt under the markings does change, which is why this is asserted in both
 * periods rather than one — a road that only survived at night would look like a
 * working road to the pinned suite and vanish at noon.
 *
 * It is also the only assertion that reads the ground plane at all. The phase's
 * own `<verification>` greps `global.css` for `sds-road-line`, which proves the
 * token is spelled somewhere and nothing about whether a road is painted
 * (`EVO-UNI-017`).
 */
for (const period of ["afternoon", "night"] as const) {
  test(`the road is painted, and identically, in ${period}`, async ({
    page,
  }) => {
    await page.goto(`${APP_PATH}?period=${period}`);
    await waitForReveal(page);

    const road = await page.locator(GROUND).evaluate((element) => {
      const image = getComputedStyle(element).backgroundImage;

      /* Both colours come out of the SAME computed string, so neither can be
       * read from a token the stylesheet never consumed. `channels` is
       * format-agnostic on purpose — Chromium serialises the `color-mix()` as
       * `color(srgb 0.06 0.05 0.13)` and the asphalt stop as `rgb(20, 16, 43)`,
       * and this phase should not break when that spelling changes. */
      const channels = (colour: string | undefined): number[] =>
        (colour?.match(/[\d.]+/g) ?? [])
          .slice(0, 3)
          .map((n) =>
            colour!.startsWith("rgb") ? Number(n) / 255 : Number(n),
          );

      return {
        size: getComputedStyle(element).backgroundSize,
        image,
        /* the lane: the one gradient whose two stops are the same colour */
        lane: channels(
          /linear-gradient\((color\([^)]*\)|rgba?\([^)]*\)), \1\)/.exec(
            image,
          )?.[1],
        ),
        /* the apron: the asphalt fade's near stop */
        apron: channels(
          /linear-gradient\((rgb\([^)]*\)) 0%, rgb\([^)]*\) 70%\)/.exec(
            image,
          )?.[1],
        ),
      };
    });

    /*
     * Five layers, and the three road ones are the strips: a 14px centre line
     * and two 420px-wide lane layers, over the full-width parking rows and
     * asphalt (`auto`). Exact equality, not a substring — dropping a road layer
     * shortens this list, and a substring check would not notice.
     */
    expect(road.size).toBe("14px 100%, 420px 100%, 420px 100%, auto, auto");

    /*
     * The dash, with its stops. `35px` and `80px` are `140px` and `320px` of
     * world Z divided by `--sds-ground-squash` — written out rather than
     * computed from the constant, so this fails if the division is dropped on
     * one side of the cancellation and the road silently re-tiles at four times
     * the pitch (`EVO-UNI-109`).
     */
    expect(road.image).toContain(
      "rgb(232, 197, 71) 0px, rgb(232, 197, 71) 35px, " +
        "rgba(0, 0, 0, 0) 35px, rgba(0, 0, 0, 0) 80px",
    );

    /* And the 4px edge lines, which run ACROSS the plane and are therefore not
     * divided by anything. */
    expect(road.image).toContain(
      "rgba(240, 240, 255, 0.35) 0px, rgba(240, 240, 255, 0.35) 4px",
    );

    /*
     * THE PARKING ROW IS THE REASON `GROUND_SQUASH` IS 4 AND NOT 8, SO IT IS
     * PINNED AT THE ONE PLACE THAT NUMBER IS DECIDED.
     *
     * The squash is chosen so the thinnest thing the plane paints along its
     * depth axis survives: a 4px row at squash 4 is exactly one texel. Nothing
     * enforced that premise — widening the row's period from 780/784 to 780/782
     * yields a HALF-pixel line, which starts dropping out of the raster, and
     * every other assertion here still passed (measured 2026-09-09 by an
     * adversarial review). These are the computed stops: 195px of gap then 1px
     * of line. The `196 - 195 = 1` is the whole contract.
     */
    expect(road.image).toContain(
      "rgba(0, 0, 0, 0) 195px, color(srgb 0.941176 0.941176 1 / 0.05) 195px, " +
        "color(srgb 0.941176 0.941176 1 / 0.05) 196px",
    );

    /*
     * The lane itself is the one road layer with no literal to pin: it is
     * `color-mix(… var(--sds-asphalt) 78%, black)`, so it is a different colour
     * in every period by design. What does not change is why it is there — the
     * lane reads as a lane because it is DARKER than the apron either side of
     * it. Asserted as that relationship rather than as two more transcribed
     * colours: a `--sds-road-surface` "simplified" to `var(--sds-asphalt)` makes
     * the lane vanish while every layer, size and marking above still checks out.
     */
    expect(road.lane).toHaveLength(3);
    expect(road.apron).toHaveLength(3);
    for (const channel of [0, 1, 2]) {
      expect(road.lane[channel]).toBeLessThan(road.apron[channel]!);
    }
  });
}

/*
 * ---------------------------------------------------------------------------
 * THE PAGE A VISITOR ACTUALLY GETS AT 2PM
 * ---------------------------------------------------------------------------
 * Every other spec in the suite navigates with `?period=night`, and this phase
 * is the first time that pin hides something: the daylight palettes change the
 * ground, the star layer and every screen's brightness, and a suite that only
 * ever sees night would not notice a daytime lot that renders but cannot be
 * used. So one unpinned visit at an hour nobody pins, driving to a screen and
 * clicking it — the same journey `click-through.spec.ts` makes, in the palette
 * it never sees.
 */
test("a lot in daylight is still a lot you can drive up to and click", async ({
  page,
}) => {
  const project = projects[1]!;

  await page.clock.install({ time: new Date("2026-09-08T14:00:00") });
  await page.goto(APP_PATH);
  await waitForReveal(page);

  await expect.poll(() => periodAttribute(page)).toBe("afternoon");

  await scrollToScreen(page, 1);
  await screenLocator(page, 1).click();

  await page.waitForURL(`**${project.href}`);
  expect(new URL(page.url()).pathname).toBe(project.href);
});
