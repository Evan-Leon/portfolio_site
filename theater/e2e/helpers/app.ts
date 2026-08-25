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
 * visitor's browser exposes — scroll position, element geometry, focus — so
 * they test behaviour rather than internals (`EVO-UNI-017`).
 */
import { expect, type Locator, type Page } from "@playwright/test";

/** The loading gate's root, from `LOADING_RING_CLASS` in src/loader/loading-ring.ts. */
export const LOADER = ".sds-loader";

/** The gate's percentage numeral. */
export const LOADER_PERCENT = ".sds-loader__percent";

/** Added by `dismiss()` when the reveal transition starts. */
export const LOADER_REVEALED_CLASS = "sds-loader--revealed";

/** The skip link, and the content section it jumps past the first scene to. */
export const SKIP_LINK = ".sds-skip";
export const CONTENT_SECTION = "#content";

/** Scene 1's spacer, from `SCENE_ID_ATTRIBUTE` in src/engine/mount.ts. */
export const FRAME_SEQUENCE_SCENE = "intro";
export const FRAME_SEQUENCE_SPACER = `[data-scene="${FRAME_SEQUENCE_SCENE}"]`;

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
  await page.goto("/");
  await expect(page.locator(LOADER)).toHaveCount(0, {
    timeout: REVEAL_TIMEOUT_MS,
  });
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
 * Scroll to `y` and resolve once the page has stopped moving and the engine has
 * run at least one full frame at the settled position.
 *
 * Throws rather than continuing if the position never settles: a spec sampling
 * a still-moving page produces a confusing pixel mismatch, while this produces
 * the actual complaint.
 */
export async function scrollTo(page: Page, y: number): Promise<void> {
  await page.evaluate(
    async ({ target, frameBudget, stableFrames }) => {
      const nextFrame = (): Promise<number> =>
        new Promise(requestAnimationFrame);

      window.scrollTo(0, target);

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
          `Scroll never settled at ${target}: still at ${window.scrollY} after ` +
            `${frameBudget} animation frames.`,
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
      target: y,
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
