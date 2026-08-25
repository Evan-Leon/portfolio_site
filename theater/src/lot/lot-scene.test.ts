import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REDUCED_MOTION_QUERY } from "../engine/engine";
import { projects } from "../projects";
import { setMediaQuery } from "../test-setup";
import { createFakeImages } from "../test-helpers/fake-image";
import {
  CLIP_STATE_ATTRIBUTE,
  SCREEN_CLASS,
  SCREEN_INDEX_ATTRIBUTE,
  SCREEN_VIDEO_CLASS,
} from "./build-lot";
import { screenProgress } from "./geometry";
import { lotScene, type LotAdapter } from "./lot-scene";

const THREE_PROJECTS = projects.slice(0, 3);
const midBand = (i: number): number =>
  (screenProgress(i, THREE_PROJECTS.length) +
    screenProgress(i + 1, THREE_PROJECTS.length)) /
  2;

let container: HTMLElement;
let adapter: LotAdapter;

function screenIndex(media: HTMLMediaElement): number {
  const value = media
    .closest(`.${SCREEN_CLASS}`)
    ?.getAttribute(SCREEN_INDEX_ATTRIBUTE);
  if (value === null || value === undefined) throw new Error("No screen index");
  return Number(value);
}

beforeEach(async () => {
  const fake = createFakeImages({
    autoSettle: () => ({ width: 1280, height: 800 }),
  });
  vi.stubGlobal("Image", fake.Image);
  container = document.createElement("div");
  document.body.append(container);
  adapter = lotScene(THREE_PROJECTS)(container) as LotAdapter;
  await adapter.load(() => {});
});

afterEach(() => {
  adapter.destroy();
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("lotScene — clip lifecycle", () => {
  it("plays exactly the active band forward and backward without restarting", () => {
    const calls: string[] = [];
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      calls.push(`play ${screenIndex(this)}`);
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      calls.push(`pause ${screenIndex(this)}`);
    });

    adapter.seek(midBand(0));
    adapter.seek(midBand(0));
    adapter.seek(midBand(1));
    adapter.seek(midBand(2));
    adapter.seek(midBand(1));
    adapter.seek(midBand(0));

    expect(calls).toEqual([
      "play 0",
      "pause 0",
      "play 1",
      "pause 1",
      "play 2",
      "pause 2",
      "play 1",
      "pause 1",
      "play 0",
    ]);
    expect(adapter.snapshot().playing).toBe(0);
  });

  it("removes a failed clip and leaves the poster screen explicitly marked", () => {
    adapter.seek(midBand(2));
    const screen = container.querySelector<HTMLElement>(
      `[${SCREEN_INDEX_ATTRIBUTE}="2"]`,
    );
    const video = screen?.querySelector<HTMLVideoElement>(
      `.${SCREEN_VIDEO_CLASS}`,
    );

    video?.dispatchEvent(new Event("error"));

    expect(screen?.getAttribute(CLIP_STATE_ATTRIBUTE)).toBe("missing");
    expect(screen?.querySelector("video")).toBe(null);
    expect(adapter.snapshot().playing).toBe(null);
  });

  it("also falls back when the last source candidate reports the error", () => {
    const screen = container.querySelector<HTMLElement>(
      `[${SCREEN_INDEX_ATTRIBUTE}="2"]`,
    );

    screen?.querySelector("source")?.dispatchEvent(new Event("error"));

    expect(screen?.getAttribute(CLIP_STATE_ATTRIBUTE)).toBe("missing");
    expect(screen?.querySelector("video")).toBe(null);
  });

  it("plays the band it was already on when its DOM finally appears", async () => {
    /*
     * THE ENGINE SEEKS THIS ADAPTER BEFORE ITS SCREENS EXIST.
     *
     * `mountScene` constructs the adapter, calls `load()`, and seeks it in the
     * same update pass — but `buildLot` runs inside the inner adapter's
     * `load()`, after `await import('gsap')`, so that first seek lands with an
     * empty container. It still records the band: `activeScreen(0, count)` is
     * `0`, so `#active` becomes 0 against a screen that does not exist and
     * nothing plays.
     *
     * Every seek after that agrees the band is 0, so no *change* is ever
     * observed and the clip is never started. Measured in a real Chromium
     * before the fix: driving in to screens 0, 1, 2 played 1 and 2 only, and
     * screen 0 played solely on the way back down.
     *
     * Every other test in this file awaits `load()` before its first `seek`,
     * which is precisely why none of them could see it. This one reproduces
     * the engine's real ordering instead.
     *
     * The fix mirrors the inner adapter, which already holds its `#progress`
     * across the same gap and re-applies it at the end of `load()` for the
     * same reason (see `#render` in `adapters/gsap-timeline.ts`).
     */
    const plays: number[] = [];
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      plays.push(screenIndex(this));
      return Promise.resolve();
    });

    const bands: string[] = [];
    const early = document.createElement("div");
    document.body.append(early);
    const engineOrder = lotScene(THREE_PROJECTS, {
      onActiveScreenChange: (previous, next) =>
        bands.push(`${previous}->${next}`),
    })(early) as LotAdapter;

    const loading = engineOrder.load(() => {});
    engineOrder.seek(0);
    expect(early.querySelector("video")).toBe(null);
    expect(plays).toEqual([]);

    await loading;

    expect(plays).toEqual([0]);
    expect(engineOrder.snapshot().playing).toBe(0);
    /* And exactly one band notification — the real one, from the seek. The
     * screens moved no bands while the DOM was being built, so reporting a
     * second `null->0` to the listener would be inventing a crossing that
     * never happened. */
    expect(bands).toEqual(["null->0"]);

    engineOrder.destroy();
    early.remove();
  });

  it("holds the poster under prefers-reduced-motion — pauses, never plays", () => {
    /*
     * A looping clip is motion the visitor never asked to start and cannot
     * stop. Quantising the drive does nothing about it: the clip has its own
     * clock, so a stepped camera would sit still at a keyframe with a video
     * running in front of it.
     *
     * The pause half matters as much as the play half. Turning the preference
     * on mid-drive has to stop whatever is already running, and the next band
     * crossing is where that happens — so screen 0 plays before the query is
     * set, and is paused by the crossing that declines to start screen 1.
     */
    const calls: string[] = [];
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      calls.push(`play ${screenIndex(this)}`);
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      calls.push(`pause ${screenIndex(this)}`);
    });

    adapter.seek(midBand(0));
    setMediaQuery(REDUCED_MOTION_QUERY, true);
    adapter.seek(midBand(1));
    adapter.seek(midBand(2));

    expect(calls).toEqual(["play 0", "pause 0", "pause 1"]);
    expect(adapter.snapshot().playing).toBe(null);
  });

  it("plays again once the preference is turned back off", () => {
    // Read per activation, not captured at construction (`EVO-UNI-061`): the
    // test above passes just as well against an adapter that never plays at
    // all, and only this one separates the two.
    setMediaQuery(REDUCED_MOTION_QUERY, true);
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");

    adapter.seek(midBand(0));
    expect(play).not.toHaveBeenCalled();

    setMediaQuery(REDUCED_MOTION_QUERY, false);
    adapter.seek(midBand(1));

    expect(play).toHaveBeenCalledTimes(1);
    expect(adapter.snapshot().playing).toBe(1);
  });

  it("pauses and detaches every remaining clip before teardown", () => {
    const videos = [
      ...container.querySelectorAll<HTMLVideoElement>(`.${SCREEN_VIDEO_CLASS}`),
    ];
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause");

    adapter.destroy();

    expect(pause).toHaveBeenCalledTimes(3);
    expect(videos.every((video) => !video.hasAttribute("src"))).toBe(true);
    expect(
      videos.every((video) =>
        [...video.querySelectorAll("source")].every(
          (source) => !source.hasAttribute("src"),
        ),
      ),
    ).toBe(true);
    expect(container.querySelector("video[src]")).toBe(null);
    expect(adapter.snapshot().playing).toBe(null);
  });
});
