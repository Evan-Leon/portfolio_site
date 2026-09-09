/*
 * The lot's scenery, in a real browser: the trees paint, and the wagon parked
 * across the bottom of the frame never takes a click meant for a screen.
 *
 * WHY NONE OF THIS CAN BE A UNIT TEST
 * -----------------------------------
 * DT15's Vitest suite asserts the DOM `buildLot` produces and the properties
 * `lot-scene.ts` writes onto it. Everything that decides whether a visitor sees
 * a tree or reaches a project happens after that, in a layout and paint engine
 * jsdom does not have: whether the stylesheet's `mask-image` resolved to a file
 * the server actually has, whether `visibility` computed to `visible`, whether
 * the three custom properties composed into the matrix the compositor uses, and
 * — the one with a live 404 behind it — which element the browser hands a click
 * at a point where a screen and the car overlap.
 *
 * WHY THE MASK IS ASSERTED PER VARIANT AND NOT ONCE
 * -------------------------------------------------
 * A tree with no mask is not a faint tree, it is a filled rectangle of tree
 * colour standing in the lot, which is why `data-mask` and `visibility` are
 * checked at all. But they are not enough, and a one-tree check is not either:
 * with tree 1's masks stripped after load, `count=88 ready=88 visible=88` all
 * still hold and tree 0's two URLs are still correct while tree 1 computes
 * `none` (measured 2026-09-08). So every tree is read, and each is asserted
 * against the URL its own `data-tree-variant` says it should carry — which
 * catches a lost mask and a mask applied to the wrong silhouette (`EVO-UNI-061`).
 *
 * WHY THE OVERLAP IS SCANNED FOR AND NOT COMPUTED
 * -----------------------------------------------
 * A screen's box and the car's do not overlap where a spec would naively look.
 * Screens are anchored with their bottom on the ground line and grow upward; at
 * the middle of its own lit band a screen's box ends some 200px above the car.
 * The two first meet only once the screen has *passed* the camera plane and is
 * exploding across the viewport, about one and a half bands after its band
 * starts — a position that depends on the viewport and on the lot's geometry,
 * so it is found by scanning rather than pinned to a number that would rot into
 * a test which passes by never overlapping anything (`EVO-UNI-118`).
 *
 * And at one of the two viewports they never meet at all: see {@link VIEWPORTS}
 * for the measurement and for what the desktop row proves instead.
 */
import { expect, test } from "@playwright/test";

import {
  CAR_STATE_ATTRIBUTE,
  LOT_CAR_CLASS,
  MASK_STATE_ATTRIBUTE,
  SCREEN_INDEX_ATTRIBUTE,
  TREE_CLASS,
  TREE_VARIANT_ATTRIBUTE,
} from "../src/lot/build-lot";
import { screenProgress } from "../src/lot/geometry";
import { treePlacements } from "../src/lot/scenery";
import { projects } from "../src/projects";
import {
  LOT_SCENE,
  openPage,
  SCREEN,
  scrollToSceneProgress,
} from "./helpers/app";

/** Every tree the composition asks for, at the count that actually ships. */
const PLACEMENTS = treePlacements(projects.length);

/** The first tree on the left of the lane — placement index 0. See `scenery.ts`. */
const FIRST_LEFT_TREE = `.${TREE_CLASS}.${TREE_CLASS}--left`;

/** The visitor's wagon. */
const CAR = `.${LOT_CAR_CLASS}`;

/*
 * The first left tree's placement, as three literals rather than as a read of
 * the module that produced them.
 *
 * `treePlacements` is imported above for the count, and a transform assertion
 * derived from it could not fail: change the arithmetic and the expectation
 * moves with the page (`EVO-UNI-207`). These are the numbers the composition
 * was approved at — `x = -(OFFSET + TREE_SETBACK)`, `z = -TREE_LEAD`, and the
 * jitter table's first scale — written out so that changing any of them is a
 * decision somebody has to come here and make.
 */
const FIRST_LEFT_TREE_X = -900;
const FIRST_LEFT_TREE_Z = -100;
const FIRST_LEFT_TREE_SCALE = 1.05;

/** Samples across the scanned span. See the header. */
const SCAN_STEPS = 40;

/**
 * The two viewports the proof runs at, and what each one can actually show.
 *
 * TWO VIEWPORTS, BECAUSE THE CASCADE DECIDES THIS AND NOT THE BASE RULE.
 * DT15's guard on the car's `pointer-events: none` reads the car's own rule
 * block; an `@media (min-width: 768px) { .sds-lot__car { pointer-events: auto } }`
 * leaves that block untouched, and a proof that only ever ran at phone width
 * would never see it. `click-through.spec.ts` does visit every screen at desktop
 * width, but at each screen's band *middle*, where the boxes are 200px apart —
 * so it cannot catch a desktop car stealing a click either.
 *
 * `overlaps` IS A MEASUREMENT, NOT A SWITCH. Measured 2026-09-09 across this
 * scan at both sizes:
 *
 *   - 390x720: screen 0's box first meets the wagon's at progress ~0.069, once
 *     the screen has passed the camera plane and is exploding across the frame.
 *     The narrow layout stacks the screens single-file down the middle of the
 *     lane, so a screen grows straight out over the wagon. The click is measured
 *     there, and it is the whole click proof.
 *   - 1440x900: it never does, and misses by about eight pixels. The wide layout
 *     puts screen 0 at `x = -OFFSET` with a yaw, so it flies off to the LEFT as
 *     it passes: the horizontal gap closes to zero at progress ~0.0605 while the
 *     vertical gap is still 8.3px, and by the time the vertical gap closes
 *     (~0.0619) the horizontal one has reopened to ~10px. The only boxes that do
 *     intersect at this size are the degenerate ones a screen projects once it is
 *     *behind* the camera (progress >= 0.0968, past the end of this scan), where
 *     `elementFromPoint` at the intersection returns nothing at all — there is no
 *     click there to steal.
 *
 * So the desktop row proves the cascade and the sweep, and states as a literal
 * that no screen ever reaches the wagon there (`EVO-UNI-018`). If the
 * composition ever moves so that one does, this row goes red and the desktop
 * click stops being unmeasurable — which is exactly when someone needs to look.
 */
const VIEWPORTS = [
  { width: 390, height: 720, overlaps: true },
  { width: 1440, height: 900, overlaps: false },
] as const;

/**
 * How close screen 0 has to come to the wagon for the scan to have swept it.
 *
 * The other half of `overlaps: false` (`EVO-UNI-118`): "no overlap" is equally
 * true of a page whose lot never loaded, so the desktop row also asserts the
 * screen really did pass through the wagon's neighbourhood. Forty pixels, with
 * the closest approach measured at 8.3 — loose enough that a few pixels of
 * retiming is not a failure, tight enough that a screen which never came near
 * is.
 */
const SWEEP_PX = 40;

test("every tree paints, with its own silhouette", async ({ page }) => {
  await openPage(page);

  /* A floor the page cannot move: with `treePlacements` stubbed to return
   * nothing, the count assertion below would compare 0 against 0 and pass
   * (`EVO-UNI-207`). Eighty-eight is what the twenty projects that ship
   * produce; the assertion is that there is a treeline at all. */
  expect(PLACEMENTS.length).toBeGreaterThan(0);

  const trees = page.locator(`.${TREE_CLASS}`);
  await expect(trees).toHaveCount(PLACEMENTS.length);

  /* The masks are set from inside `load()`, which the loading gate waits on
   * before it detaches — so `openPage` has already returned past them. Waiting
   * on the attribute anyway keeps the failure legible if that ordering ever
   * changes: a timeout naming `data-mask` rather than eighty-eight computed
   * `none`s (`EVO-TOOL-071`). */
  await expect(trees.first()).toHaveAttribute(MASK_STATE_ATTRIBUTE, "ready");

  const readings = await page.$$eval(
    `.${TREE_CLASS}`,
    (elements, { maskAttribute, variantAttribute }) =>
      elements.map((element, i) => {
        const style = getComputedStyle(element);
        return {
          i,
          variant: element.getAttribute(variantAttribute),
          mask: element.getAttribute(maskAttribute),
          visibility: style.visibility,
          maskImage: style.getPropertyValue("mask-image"),
          webkitMaskImage: style.getPropertyValue("-webkit-mask-image"),
        };
      }),
    {
      maskAttribute: MASK_STATE_ATTRIBUTE,
      variantAttribute: TREE_VARIANT_ATTRIBUTE,
    },
  );

  expect(readings.length).toBe(PLACEMENTS.length);

  const wrong = readings.filter((tree) => {
    /* The variant is 0-based and the files are 1-based; the trailing dot ends
     * the basename, so this reads the same whichever extension DT14 shipped. */
    const expected = `art/tree-${Number(tree.variant) + 1}.`;

    return (
      tree.mask !== "ready" ||
      tree.visibility !== "visible" ||
      !tree.maskImage.includes(expected) ||
      !tree.webkitMaskImage.includes(expected)
    );
  });

  expect(wrong, `trees that did not paint their own silhouette`).toEqual([]);
});

test("the first tree stands where the composition puts it", async ({
  page,
}) => {
  await openPage(page);

  /*
   * The rendered matrix, not the three inline custom properties — DT15's unit
   * tests already assert those, and they are correct in exactly the case this
   * is here to catch: a stylesheet that stopped composing them, or composed
   * them in an order that puts the tree somewhere else (`EVO-TOOL-183`).
   */
  const matrix = await page
    .locator(FIRST_LEFT_TREE)
    .first()
    .evaluate((tree) => {
      const { m11, m41, m43 } = new DOMMatrixReadOnly(
        getComputedStyle(tree).transform,
      );
      return { m11, m41, m43 };
    });

  expect(matrix.m41).toBeCloseTo(FIRST_LEFT_TREE_X, 3);
  expect(matrix.m43).toBeCloseTo(FIRST_LEFT_TREE_Z, 3);
  expect(matrix.m11).toBeCloseTo(FIRST_LEFT_TREE_SCALE, 3);
});

test("the wagon is drawn", async ({ page }) => {
  await openPage(page);

  const car = page.locator(CAR);
  await expect(car).toHaveAttribute(CAR_STATE_ATTRIBUTE, "ready");

  /* A box with real height, because the beam and the two tail-light glows are
   * positioned as percentages of it — a collapsed car puts them on the floor
   * with no other symptom. */
  const height = await car.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  expect(height).toBeGreaterThan(0);
});

for (const viewport of VIEWPORTS) {
  test(`the wagon does not take screen 0's click at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    /*
     * Forty-one settled scroll positions, each waiting on the page to stop
     * moving — about 24s at desktop width when the whole suite is competing for
     * the same software rasteriser, against a 30s default. The same allowance
     * `keyboard.spec.ts` and `active-screen.spec.ts` already take for their own
     * sweeps; nothing about what is asserted changes, it just needs room to
     * finish saying it.
     */
    test.slow();

    await page.setViewportSize(viewport);
    await openPage(page);

    /*
     * The *computed* value, which is what the cascade decided — a source grep
     * for `pointer-events: none` in the car's own rule block is equally true of
     * a stylesheet that overrides it forty lines later. This is the assertion
     * that makes the desktop row load-bearing.
     */
    const pointerEvents = await page
      .locator(CAR)
      .evaluate((element) => getComputedStyle(element).pointerEvents);
    expect(pointerEvents).toBe("none");

    const from = screenProgress(0, projects.length);
    const to = screenProgress(2, projects.length);

    let overlap: { x: number; y: number; progress: number } | null = null;
    let closest = Infinity;

    for (let step = 0; step <= SCAN_STEPS && !overlap; step += 1) {
      const progress = from + ((to - from) * step) / SCAN_STEPS;
      await scrollToSceneProgress(page, LOT_SCENE, progress);

      const sample = await page.evaluate(
        ({ screen, car }) => {
          const first = document.querySelector(screen)?.getBoundingClientRect();
          const second = document.querySelector(car)?.getBoundingClientRect();

          /* Throwing rather than reporting "no overlap": a missing car is a
           * page with nothing to steal a click, which would otherwise sail
           * through the desktop row as a pass (`EVO-UNI-118`). */
          if (!first) throw new Error(`no ${screen} on the page`);
          if (!second) throw new Error(`no ${car} on the page`);

          /* Positive on an axis means a gap; the boxes intersect only when
           * both are negative, so the larger of the two is the separation. */
          const separation = Math.max(
            Math.max(first.left, second.left) -
              Math.min(first.right, second.right),
            Math.max(first.top, second.top) -
              Math.min(first.bottom, second.bottom),
          );

          /* Clipped to the viewport as well as to each other: past the camera
           * plane a screen's box is far larger than the frame, and a centre
           * taken from the unclipped intersection can land off-screen, where
           * there is nothing to hit-test and nothing to click. */
          const left = Math.max(first.left, second.left, 0);
          const right = Math.min(first.right, second.right, innerWidth);
          const top = Math.max(first.top, second.top, 0);
          const bottom = Math.min(first.bottom, second.bottom, innerHeight);
          const visible = right > left && bottom > top;

          return {
            separation,
            point: visible
              ? { x: (left + right) / 2, y: (top + bottom) / 2 }
              : null,
          };
        },
        { screen: `${SCREEN}[${SCREEN_INDEX_ATTRIBUTE}="0"]`, car: CAR },
      );

      closest = Math.min(closest, sample.separation);
      if (sample.point) overlap = { ...sample.point, progress };
    }

    /*
     * The sweep really happened — screen 0 drove past the wagon rather than the
     * scan running against a lot that never built. Asserted at both viewports,
     * and it is the only thing standing between `overlaps: false` and a test
     * that passes on an empty page (`EVO-UNI-061`).
     */
    expect(
      closest,
      `screen 0's closest approach to the wagon between progress ${from} and ${to}`,
    ).toBeLessThan(SWEEP_PX);

    expect(
      overlap !== null,
      `screen 0 ${overlap ? "overlapped" : "never overlapped"} the wagon at ` +
        `${viewport.width}x${viewport.height}; closest approach ${closest.toFixed(1)}px`,
    ).toBe(viewport.overlaps);

    if (!overlap) return;

    const { x, y } = overlap;

    /* The browser's own answer to "whose click is this?" — an element with
     * `pointer-events: none` is simply not in the stack, so a car that opted
     * back in is returned here instead of the screen. */
    const owner = await page.evaluate(
      ({ point, screen, indexAttribute }) =>
        document
          .elementFromPoint(point.x, point.y)
          ?.closest(screen)
          ?.getAttribute(indexAttribute) ?? null,
      {
        point: { x, y },
        screen: SCREEN,
        indexAttribute: SCREEN_INDEX_ATTRIBUTE,
      },
    );
    expect(owner, `at ${x},${y} the click does not belong to screen 0`).toBe(
      "0",
    );

    await page.mouse.click(x, y);

    const href = projects[0]!.href;
    await page.waitForURL(`**${href}`);
    expect(new URL(page.url()).pathname).toBe(href);
  });
}
