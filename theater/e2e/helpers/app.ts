/*
 * Driving the page: open it, scroll it, and know when it has stopped moving.
 *
 * WHY SCROLLING NEEDS A HELPER AT ALL
 * -----------------------------------
 * `window.scrollTo` returns before anything has been drawn. The engine reads
 * scroll once per frame inside its own `requestAnimationFrame` callback
 * (`SDS-005`), Lenis moves the page during that same callback, and the adapter
 * paints after both. A spec that scrolls and immediately samples is therefore
 * reading whatever the *previous* frame left behind.
 *
 * The obvious fix — `waitForTimeout(300)` — is the one that produces a suite
 * which passes on this machine and fails on a slower CI runner
 * (`EVO-TOOL-071`). So {@link scrollTo} waits for a *condition*: the scroll
 * position having stopped changing across consecutive animation frames, plus
 * two further frames so the engine's own callback has demonstrably run a full
 * pass at the settled position.
 *
 * Nothing here reaches into the engine. These helpers use the same hooks a
 * visitor's browser exposes — scroll position, element geometry, focus, the
 * computed transform, `video.paused` — so they test behaviour rather than
 * internals (`EVO-UNI-017`). Nothing is exposed on `window` for their benefit:
 * `LotAdapter.snapshot()` exists and is deliberately not reachable from here.
 *
 * WHY THE SELECTORS ARE IMPORTED AND NOT SPELLED OUT
 * --------------------------------------------------
 * `e2e/` is inside the theater's `tsconfig` `include`, so the class names,
 * attribute names and the custom property the timeline writes come from
 * `src/lot/build-lot.ts`, which is where they are decided. A re-typed
 * `'.sds-lot__world'` here is correct on the day it is written and silently
 * matches nothing the first time the class is renamed — a suite that passes
 * because every assertion is vacuous (`EVO-UNI-057`).
 */
import { expect, type Locator, type Page } from "@playwright/test";

import {
  LOT_WORLD_CLASS,
  SCREEN_CLASS,
  SCREEN_INDEX_ATTRIBUTE,
  SCREEN_LIT_PROPERTY,
  SCREEN_VIDEO_CLASS,
} from "../../src/lot/build-lot";
import { screenProgress } from "../../src/lot/geometry";
import {
  PERIOD_ATTRIBUTE,
  PERIOD_PARAM,
  type Period,
} from "../../src/page/period";
import { projects } from "../../src/projects";

/**
 * Where the theater is served, relative to the config's `baseURL`.
 *
 * Not `/`. Vite's `base` is `/theater/`, because the built app is copied into
 * the portfolio site's webroot under that path — so `/` is the site's own
 * homepage in production and a redirect under `vite preview`. Opening `/` here
 * would test whichever of those the current server happens to do.
 */
export const APP_PATH = "/theater/";

/**
 * The time of day every spec but `period.spec.ts` runs in.
 *
 * The page's sky follows the visitor's clock, so an unpinned suite asserts
 * about whatever hour the runner happens to start at — green all afternoon and
 * red on a nightly CI run, against code nobody changed. `night` rather than any
 * other period because it is the composition the lot was designed and approved
 * against.
 */
export const PINNED_PERIOD: Period = "night";

/**
 * Where specs actually navigate: the app, pinned to {@link PINNED_PERIOD}.
 *
 * `APP_PATH` stays exported and unpinned beside it — `nginx-parity.sh` asks the
 * real server for the bare path, and `period.spec.ts` navigates unpinned on
 * purpose to exercise the clock.
 */
export const APP_URL = `${APP_PATH}?${PERIOD_PARAM}=${PINNED_PERIOD}`;

/** The loading gate's root, from `LOADING_RING_CLASS` in src/loader/loading-ring.ts. */
export const LOADER = ".sds-loader";

/** The gate's percentage numeral. */
export const LOADER_PERCENT = ".sds-loader__percent";

/** Added by `dismiss()` when the reveal transition starts. */
export const LOADER_REVEALED_CLASS = "sds-loader--revealed";

/** The skip link, and the content section it jumps past the drive to. */
export const SKIP_LINK = ".sds-skip";
export const EXIT_SECTION = "#exit";

/**
 * The chrome's home link — the second thing Tab reaches, before the lot.
 *
 * Named because `keyboard.spec.ts` has to walk *through* it to get to the
 * screens, and a spec that tabbed a fixed number of times without saying what
 * it expected to pass would silently start asserting about the wrong element
 * the day another control joins the header.
 */
export const CHROME_LOGO = ".sds-chrome__logo";

/**
 * The exit beat's hand-written project list — the page a visitor with no
 * JavaScript sees instead of the lot, and the only copy of the drive order that
 * `src/projects.ts` does not generate.
 */
export const EXIT_LIST_LINK = ".sds-exit-list a";

/** The lot — the page's only scene — and its spacer, from `mount.ts`. */
export const LOT_SCENE = "lot";
export const LOT_SPACER = `[data-scene="${LOT_SCENE}"]`;

/** The element the drive translates; everything in the world is inside it. */
export const LOT_WORLD = `.${LOT_WORLD_CLASS}`;

/**
 * One screen. Spelled with the tag as well as the class because the whole
 * screen being a *link* is the claim `click-through.spec.ts` rests on: a screen
 * rebuilt as a `<div>` with a click handler would keep the class and stop being
 * reachable by keyboard, and `a.sds-screen` is what notices.
 */
export const SCREEN = `a.${SCREEN_CLASS}`;

/**
 * The chrome's percentage readout, driven by the engine's `persistentLayer`
 * every frame. Reads `0%` at the top of the document and `100%` at the bottom,
 * which makes it the page's own evidence that the frame loop is running and
 * following the scroll position.
 */
export const PROGRESS_READOUT = "[data-sds-progress-percent]";

/**
 * Generous, because these wait on a real build being served and a real browser
 * decoding real images. An undershot wait makes working code look broken
 * (`EVO-TOOL-071`); an overshot one costs nothing when the condition is met.
 */
const REVEAL_TIMEOUT_MS = 20_000;

/** Frames the scroll settle loop will wait before giving up (~3s at 60fps). */
const SETTLE_FRAME_BUDGET = 180;

/** Consecutive equal readings that count as "the page has stopped moving". */
const SETTLE_STABLE_FRAMES = 3;

/**
 * Open the page and wait until the loading gate has taken itself off the DOM.
 *
 * Detachment rather than invisibility: the ring removes its own element
 * `REVEAL_FADE_MS` after the transition starts, and that removal is the single
 * moment at which the page is unambiguously the visitor's.
 */
export async function openPage(page: Page): Promise<void> {
  await page.goto(APP_URL);
  await waitForReveal(page);
}

/** Wait for the gate to leave, on a page that was navigated to by hand. */
export async function waitForReveal(page: Page): Promise<void> {
  await expect(page.locator(LOADER)).toHaveCount(0, {
    timeout: REVEAL_TIMEOUT_MS,
  });
}

/**
 * The time of day the page currently believes it is, read off the root.
 *
 * `null` is a real answer and not an error: it is what a build with the period
 * engine removed returns, and a helper that threw there would fail the specs
 * with a stack trace instead of the value they are asserting about.
 */
export async function periodAttribute(page: Page): Promise<string | null> {
  return page.evaluate(
    (attribute) => document.documentElement.getAttribute(attribute),
    PERIOD_ATTRIBUTE,
  );
}

/** A scene's scroll span, in document pixels. */
export interface SceneScrollRange {
  /** Document-relative top of the scene's spacer — progress 0. */
  top: number;
  /**
   * The scene's scrubbing length: spacer height minus one viewport, matching
   * `SceneMetrics.length`. Progress 1 is `top + length`.
   */
  length: number;
}

/**
 * Measure where a scene scrubs, from the page rather than from the registry.
 *
 * Deriving this instead of hardcoding a pixel offset is what lets the same spec
 * body run at a desktop and a phone viewport — a `vh`-sized scene is a different
 * number of pixels in each, and a hardcoded one would silently scrub the wrong
 * part of the page at the second viewport rather than fail.
 */
export async function sceneScrollRange(
  page: Page,
  sceneId: string,
): Promise<SceneScrollRange> {
  const range = await page.evaluate((id) => {
    const spacer = document.querySelector<HTMLElement>(`[data-scene="${id}"]`);
    if (!spacer) return null;

    const rect = spacer.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      length: rect.height - window.innerHeight,
    };
  }, sceneId);

  if (!range)
    throw new Error(`No scene spacer on the page for id "${sceneId}"`);
  if (range.length <= 0) {
    throw new Error(
      `Scene "${sceneId}" has a scrub length of ${range.length}px, so there is nothing to scrub. ` +
        `Its spacer is not taller than the viewport.`,
    );
  }

  return range;
}

/**
 * Scroll so that `sceneId` sits at `progress` through its own scrub, and wait
 * for the page to settle. Returns the scroll position used.
 *
 * `top + progress * length` is the inverse of the engine's `sceneProgress`, so
 * progress 0 is the first frame of the scene and 1 is its last.
 */
export async function scrollToSceneProgress(
  page: Page,
  sceneId: string,
  progress: number,
): Promise<number> {
  const { top, length } = await sceneScrollRange(page, sceneId);
  const y = Math.round(top + progress * length);
  await scrollTo(page, y);
  return y;
}

/**
 * The progress halfway through screen `i`'s band.
 *
 * Stated as the midpoint between the two band boundaries the geometry already
 * defines rather than as `(i + 0.5) / 9`: the band width is
 * `1 / (count + 1)` today, and a spec carrying its own copy of that arithmetic
 * would keep passing while pointing at the wrong part of the drive the day the
 * lot is retimed (`EVO-UNI-057`).
 *
 * The middle, not the start, because the lighting is a ramp: screen `i` reaches
 * full brightness `LIT_IN_BANDS` into its band and starts dimming when the band
 * ends, so the midpoint is the one position where "screen `i` is lit and the
 * others are not" is unambiguously true.
 */
export function screenBandMiddle(i: number): number {
  const count = projects.length;
  return (screenProgress(i, count) + screenProgress(i + 1, count)) / 2;
}

/** Drive to the middle of screen `i`'s band and settle there. */
export async function scrollToScreen(page: Page, i: number): Promise<number> {
  return scrollToSceneProgress(page, LOT_SCENE, screenBandMiddle(i));
}

/**
 * Scroll to `y` and resolve once the page has stopped moving and the engine has
 * run at least one full frame at the settled position.
 *
 * Throws rather than continuing if the position never settles: a spec sampling
 * a still-moving page produces a confusing pixel mismatch, while this produces
 * the actual complaint.
 */
export async function scrollTo(page: Page, y: number): Promise<void> {
  await settle(page, y);
}

/**
 * Wait for a scroll *somebody else* started to finish — the keyboard's, in
 * practice: focusing a screen hands Lenis a target and returns immediately, so
 * a spec that reads `scrollY` on the next line reads the position it started
 * from.
 *
 * The same settle loop as {@link scrollTo} with nothing to scroll first, so the
 * two cannot drift apart in how long they are willing to wait or in what counts
 * as stopped (`EVO-UNI-057`).
 */
export async function waitForScrollSettled(page: Page): Promise<void> {
  await settle(page, null);
}

/** Optionally scroll, then wait for the page to stop moving. See above. */
async function settle(page: Page, target: number | null): Promise<void> {
  await page.evaluate(
    async ({ to, frameBudget, stableFrames }) => {
      const nextFrame = (): Promise<number> =>
        new Promise(requestAnimationFrame);

      if (to !== null) window.scrollTo(0, to);

      let previous = Number.NaN;
      let stable = 0;

      for (
        let frame = 0;
        frame < frameBudget && stable < stableFrames;
        frame += 1
      ) {
        await nextFrame();
        const current = Math.round(window.scrollY);
        stable = current === previous ? stable + 1 : 0;
        previous = current;
      }

      if (stable < stableFrames) {
        throw new Error(
          `Scroll never settled${to === null ? "" : ` at ${to}`}: still at ` +
            `${window.scrollY} after ${frameBudget} animation frames.`,
        );
      }

      /*
       * The engine registers its next `requestAnimationFrame` from inside its
       * own callback, so a callback registered here runs *after* the engine's
       * in the same frame. Two more frames therefore guarantee a complete
       * read-seek-paint pass has happened at the settled position.
       */
      await nextFrame();
      await nextFrame();
    },
    {
      to: target,
      frameBudget: SETTLE_FRAME_BUDGET,
      stableFrames: SETTLE_STABLE_FRAMES,
    },
  );
}

/** Scroll to the very bottom of the document and settle there. */
export async function scrollToDocumentEnd(page: Page): Promise<void> {
  const end = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  await scrollTo(page, Math.max(0, end));
}

/**
 * How far the camera has driven, read out of the world's **computed**
 * transform.
 *
 * The rendered matrix, not the inline string GSAP wrote and not a number
 * recomputed from `lotZ`: a drive tween aimed at the wrong element, or a
 * stylesheet rule that overrode the transform, produces a perfect inline value
 * and a world that never moves (`EVO-UNI-017`).
 *
 * A pure `translateZ(0)` can serialise as a 2D `matrix(...)`, which carries no
 * Z at all — that is a depth of 0, not a parse failure, so it is reported as 0
 * rather than thrown on.
 */
export async function worldZ(page: Page): Promise<number> {
  const transform = await worldTransform(page);
  return parseTranslateZ(transform);
}

/** The world's computed `transform`, verbatim — what {@link worldZ} parses. */
export async function worldTransform(page: Page): Promise<string> {
  const transform = await page
    .locator(LOT_WORLD)
    .evaluate((element) => getComputedStyle(element).transform);

  if (!transform) {
    throw new Error(`${LOT_WORLD} has no computed transform to read.`);
  }

  return transform;
}

/** The Z translation in a computed `matrix3d(...)`, or 0 for a 2D matrix. */
export function parseTranslateZ(transform: string): number {
  if (transform === "none") return 0;

  const matrix3d = /^matrix3d\((.+)\)$/.exec(transform);
  if (!matrix3d) {
    /* A 2D `matrix(a, b, c, d, e, f)` is a transform with no depth. */
    if (/^matrix\(/.test(transform)) return 0;
    throw new Error(`Not a CSS transform matrix: "${transform}"`);
  }

  const values = matrix3d[1]!.split(",").map((part) => Number(part.trim()));
  if (values.length !== 16 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`Unreadable matrix3d: "${transform}"`);
  }

  /* m43 — the fifteenth of the sixteen column-major entries. */
  return values[14]!;
}

/** Screen `i`, as a locator. */
export function screenLocator(page: Page, i: number): Locator {
  return page.locator(`${SCREEN}[${SCREEN_INDEX_ATTRIBUTE}="${i}"]`);
}

/**
 * How lit screen `i` is, 0 to 1, from its computed custom property.
 *
 * Computed rather than the inline string, for the same reason {@link worldZ}
 * reads the rendered matrix: the timeline writing a property the stylesheet
 * does not read is the failure this is meant to be able to see.
 */
export async function screenLit(page: Page, i: number): Promise<number> {
  return screenLocator(page, i).evaluate(
    (element, property) =>
      Number.parseFloat(getComputedStyle(element).getPropertyValue(property)) ||
      0,
    SCREEN_LIT_PROPERTY,
  );
}

/** Every screen's lit value, in drive order. */
export async function litScreens(page: Page): Promise<number[]> {
  return Promise.all(projects.map((_, i) => screenLit(page, i)));
}

/**
 * What screen `i`'s clip is doing.
 *
 * `missing` is a real state and not an error: a screen whose clip 404s has its
 * `<video>` removed and the surface falls back to the poster, which is what a
 * project with no demo reel looks like until DT9 films one (`EVO-UNI-053`).
 */
export type ClipState = "playing" | "paused" | "missing";

export async function clipState(page: Page, i: number): Promise<ClipState> {
  return screenLocator(page, i).evaluate((element, videoClass) => {
    const video = element.querySelector<HTMLVideoElement>(`.${videoClass}`);
    if (!video) return "missing" as const;
    return video.paused ? ("paused" as const) : ("playing" as const);
  }, SCREEN_VIDEO_CLASS);
}

/** Every screen's clip state, in drive order. */
export async function clipStates(page: Page): Promise<ClipState[]> {
  return Promise.all(projects.map((_, i) => clipState(page, i)));
}

/**
 * A CSS-ish description of whatever currently has focus, for asserting on.
 *
 * Returns the tag name plus class and id when present — enough to name the
 * element in a failure message without a spec having to evaluate its own
 * `document.activeElement` read every time.
 */
export async function focusedElementDescription(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!active) return "<none>";

    const tag = active.tagName.toLowerCase();
    const id = active.id ? `#${active.id}` : "";
    const classes = active.className
      ? `.${active.className.trim().split(/\s+/).join(".")}`
      : "";
    return `${tag}${id}${classes}`;
  });
}

/** Is `locator` the element that currently has focus? */
export async function isFocused(locator: Locator): Promise<boolean> {
  return locator.evaluate((element) => element === document.activeElement);
}
