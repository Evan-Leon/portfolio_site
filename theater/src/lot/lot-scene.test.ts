import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { projects } from "../projects";
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
