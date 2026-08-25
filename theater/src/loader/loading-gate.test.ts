/*
 * Integration tests for the gate: engine + shared loader + ring, on a real
 * (jsdom) DOM.
 *
 * WHY THE MODULES ARE IMPORTED DYNAMICALLY
 * ----------------------------------------
 * `sharedAssetLoader` is a module-level singleton, which is the whole point of
 * it — an adapter has no handle on the engine, so a private loader per consumer
 * would make the ring's progress a lie (`SDS-006`). It also means its queue,
 * its counters and its failure list survive from one test to the next
 * (`EVO-UNI-044`). `vi.resetModules()` plus a fresh `import()` of both the
 * loader and the engine gives every test its own singleton, paired with an
 * engine that closes over that same one.
 *
 * `Image` is faked, because jsdom does not fetch: a real `img.src = …` here
 * never fires `load` or `error`, which is coincidentally the exact hang the
 * stall timeout exists for and would otherwise make every test in this file
 * look like it was testing that.
 *
 * Frames are driven by hand, as in `engine.test.ts`. Fake timers cover only the
 * stall timeout and the minimum-visible wait, and are cleaned up in `afterEach`
 * (`EVO-FE-057`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AdapterFactory,
  AnimationAdapter,
  AssetSpec,
} from "../adapters/types";
import { installFakeLayout, type FakeLayout } from "../engine/fake-layout";
import {
  createFakeScrollSource,
  type FakeScrollSource,
} from "../engine/scroll-source";
import type { Host } from "../host/types";
import type { SceneDef } from "../scenes/types";
import type { AssetLoader } from "./asset-loader";
import {
  createLoadingRing,
  LOADING_RING_CLASS,
  LOADING_RING_REVEALED_CLASS,
} from "./loading-ring";

const VIEWPORT_HEIGHT = 800;
const DOCUMENT_HEIGHT = 8800;
const MIN_VISIBLE_MS = 400;

/** `intro` sits at the top, so it is inside its preload margin at scroll 0. */
const INTRO_LAYOUT = { top: 0, height: 2400, pinWidth: 640, pinHeight: 360 };
/** `outro` is far enough down that nothing constructs it during the reveal. */
const OUTRO_LAYOUT = { top: 4000, height: 2400, pinWidth: 640, pinHeight: 360 };

/* ------------------------------------------------------------------ *
 * A controllable image (jsdom fetches nothing)
 * ------------------------------------------------------------------ */

/** Every image the loader has constructed in the current test, oldest first. */
let images: FakeImage[];

class FakeImage extends EventTarget {
  crossOrigin: string | null = null;
  src = "";

  constructor() {
    super();
    images.push(this);
  }
}

/**
 * Make the image the loader built for `url` report `error`.
 *
 * Reaches through the fake constructor rather than the loader, because the
 * loader deliberately exposes no handle on the element it is decoding.
 */
function failRequest(url: string): void {
  const image = images.find((candidate) => candidate.src === url);
  if (!image) throw new Error(`No image was requested for ${url}`);
  image.dispatchEvent(new Event("error"));
}

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

type LoaderModule = typeof import("./asset-loader");
type EngineModule = typeof import("../engine/engine");

let sharedAssetLoader: AssetLoader;
let createEngine: EngineModule["createEngine"];
let STALL_TIMEOUT_MS: LoaderModule["STALL_TIMEOUT_MS"];

let source: FakeScrollSource;
let layout: FakeLayout;
let root: HTMLElement;
let pendingFrame: FrameRequestCallback | null;

beforeEach(async () => {
  vi.resetModules();
  const loaderModule = await import("./asset-loader");
  const engineModule = await import("../engine/engine");
  sharedAssetLoader = loaderModule.sharedAssetLoader;
  STALL_TIMEOUT_MS = loaderModule.STALL_TIMEOUT_MS;
  createEngine = engineModule.createEngine;

  source = createFakeScrollSource({
    scrollY: 0,
    viewportHeight: VIEWPORT_HEIGHT,
    documentHeight: DOCUMENT_HEIGHT,
  });
  layout = installFakeLayout(source);
  layout.set("intro", INTRO_LAYOUT);
  layout.set("outro", OUTRO_LAYOUT);

  root = document.createElement("div");
  document.body.append(root);
  pendingFrame = null;
  images = [];

  /*
   * Fake only what the gate uses. Vitest's default `toFake` list includes
   * `requestAnimationFrame`, which would take over the stub below and leave
   * `tick()` with nothing to run — the symptom is a scene that never mounts,
   * several assertions away from the cause.
   */
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal(
    "requestAnimationFrame",
    (callback: FrameRequestCallback): number => {
      pendingFrame = callback;
      return 1;
    },
  );
  vi.stubGlobal("cancelAnimationFrame", (): void => {
    pendingFrame = null;
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  layout.restore();
  document.body.replaceChildren();
});

function hostWith(): Host {
  return {
    mountRoot: () => root,
    scrollSource: () => source,
    pinStrategy: "sticky",
    injectStyles: () => {},
  };
}

/** Run exactly one frame, if one is scheduled. */
function tick(): void {
  const frame = pendingFrame;
  pendingFrame = null;
  frame?.(0);
}

/** The gate element currently on the page, or `null` once it has been removed. */
function gate(): HTMLElement | null {
  return root.querySelector<HTMLElement>(`.${LOADING_RING_CLASS}`);
}

/** Has the gate actually let go of the page? */
function revealed(): boolean {
  const element = gate();
  return (
    element === null || element.classList.contains(LOADING_RING_REVEALED_CLASS)
  );
}

/**
 * An adapter that waits on `assets` through the shared loader and reports
 * nothing else — the shape every real adapter has (`SDS-006`).
 */
function loadingAdapter(options: {
  eager?: boolean;
  assets?: readonly AssetSpec[];
  onConstruct?: () => void;
}): AdapterFactory {
  const factory: AdapterFactory = (): AnimationAdapter => {
    options.onConstruct?.();
    return {
      eager: options.eager ?? false,
      load: async (): Promise<void> => {
        await Promise.all(
          (options.assets ?? []).map((spec) => sharedAssetLoader.add(spec)),
        );
      },
      seek: () => {},
      resize: () => {},
      destroy: () => {},
    };
  };
  factory.assets = options.assets;
  return factory;
}

function startGatedEngine(scenes: SceneDef[]): ReturnType<typeof createEngine> {
  const loadingRing = createLoadingRing(root, { minVisibleMs: MIN_VISIBLE_MS });
  const engine = createEngine({
    host: hostWith(),
    scenes,
    loadingRing,
    lenis: false,
  });
  engine.start();
  return engine;
}

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */

describe("the loading gate — the page always reveals", () => {
  it("reveals when an eager adapter waits on a request that never settles", async () => {
    const scenes: SceneDef[] = [
      {
        id: "intro",
        vh: 300,
        adapter: loadingAdapter({
          eager: true,
          assets: [{ url: "/hangs.png", kind: "image" }],
        }),
      },
    ];
    startGatedEngine(scenes);

    // Requested, and the fake image never calls back — a hung connection.
    expect(revealed()).toBe(false);
    await vi.advanceTimersByTimeAsync(STALL_TIMEOUT_MS - 1);
    expect(revealed()).toBe(false);

    await vi.advanceTimersByTimeAsync(1 + MIN_VISIBLE_MS);

    /*
     * Observable reveal state, deliberately — NOT `progress() === 1`. Progress
     * reaching 1 while the promise the reveal awaits stays pending is exactly
     * the failure this rules out: a ring sitting at 100% on a page that never
     * reveals.
     */
    expect(revealed()).toBe(true);
  });

  it("reveals when an eager asset 404s, with no timer involved", async () => {
    const scenes: SceneDef[] = [
      {
        id: "intro",
        vh: 300,
        adapter: loadingAdapter({
          eager: true,
          assets: [{ url: "/missing.png", kind: "image" }],
        }),
      },
    ];
    const startedAt = Date.now();
    startGatedEngine(scenes);

    // The failure is known immediately: the element the loader built for this
    // URL reports `error`, and that settles it as unsuccessful.
    failRequest("/missing.png");

    await vi.advanceTimersByTimeAsync(MIN_VISIBLE_MS);

    expect(revealed()).toBe(true);
    expect(sharedAssetLoader.failures()).toEqual(["/missing.png"]);
    // Held by the minimum-visible floor and nothing else: the common failure
    // case is well inside the stall timeout, which never entered into it.
    expect(Date.now() - startedAt).toBe(MIN_VISIBLE_MS);
    expect(MIN_VISIBLE_MS).toBeLessThan(STALL_TIMEOUT_MS);
  });

  it("does not wait on a scene that never asked to be waited for", async () => {
    const scenes: SceneDef[] = [
      {
        id: "intro",
        vh: 300,
        adapter: loadingAdapter({
          assets: [{ url: "/lazy.png", kind: "image" }],
        }),
      },
    ];
    startGatedEngine(scenes);

    // `/lazy.png` is still hanging, and the gate lets go anyway: nothing on
    // this page is eager.
    await vi.advanceTimersByTimeAsync(MIN_VISIBLE_MS);
    expect(revealed()).toBe(true);
  });

  it("waits for scene 1 even when it starts below its preload margin", async () => {
    /*
     * THE CASE THE REAL PAGE IS, AND THAT EVERY OTHER TEST IN THIS FILE MISSES.
     *
     * `INTRO_LAYOUT` puts scene 1 at the very top of the document, where it is
     * inside its preload margin at scroll 0 and the frame loop constructs it
     * unprompted. The actual page shell (SD7, and the approved wireframe) opens
     * with a full viewport of hero copy above scene 1 — measured in a real
     * browser at viewport 700px: spacer top 700, scrub length 1400, so raw
     * progress −0.5 against a preload margin of 0.25. Unmounted.
     *
     * `eager` is a property of the ADAPTER, so a scene whose adapter is never
     * constructed cannot report it, `eagerStates()` is empty, and the ring
     * dismisses on its minimum-visible floor with every frame still outstanding
     * — whatever the registry says. Verified in a real browser before the fix:
     * the ring's numeral went straight to `100%` under a 28kbps throttle.
     */
    layout.set("intro", { ...INTRO_LAYOUT, top: VIEWPORT_HEIGHT });
    const scenes: SceneDef[] = [
      {
        id: "intro",
        vh: 300,
        adapter: loadingAdapter({
          eager: true,
          assets: [{ url: "/below-the-fold.png", kind: "image" }],
        }),
      },
    ];
    startGatedEngine(scenes);

    // The asset was requested at all — the gate built scene 1 to ask.
    expect(images.map((image) => image.src)).toEqual(["/below-the-fold.png"]);

    // And the page is genuinely held on it: well past the minimum-visible floor,
    // with the request still in flight, nothing has been revealed.
    await vi.advanceTimersByTimeAsync(MIN_VISIBLE_MS + 1);
    expect(revealed()).toBe(false);

    failRequest("/below-the-fold.png");
    await vi.advanceTimersByTimeAsync(0);
    expect(revealed()).toBe(true);
  });

  it("holds the page for the minimum visible time even with nothing to load", async () => {
    const scenes: SceneDef[] = [
      { id: "intro", vh: 300, adapter: loadingAdapter({ eager: true }) },
    ];
    startGatedEngine(scenes);

    await vi.advanceTimersByTimeAsync(MIN_VISIBLE_MS - 1);
    expect(revealed()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(revealed()).toBe(true);
  });
});

describe("the loading gate — warming fetches bytes, not adapters", () => {
  it("warms a deferred scene from its manifest without constructing its adapter", async () => {
    const constructions: string[] = [];
    const outroAssets: readonly AssetSpec[] = [
      { url: "/outro-1.png", kind: "image" },
      { url: "/outro-2.png", kind: "image" },
    ];

    const added = vi.spyOn(sharedAssetLoader, "add");
    const scenes: SceneDef[] = [
      {
        id: "intro",
        vh: 300,
        adapter: loadingAdapter({
          eager: true,
          onConstruct: () => constructions.push("intro"),
        }),
      },
      {
        id: "outro",
        vh: 300,
        adapter: loadingAdapter({
          assets: outroAssets,
          onConstruct: () => constructions.push("outro"),
        }),
      },
    ];
    startGatedEngine(scenes);

    await vi.advanceTimersByTimeAsync(MIN_VISIBLE_MS);
    expect(revealed()).toBe(true);

    // Half one: memory stays bounded. `outro` is 4000px down the page, nowhere
    // near its preload margin, and warming must not have built it.
    expect(constructions).toEqual(["intro"]);

    // Half two: warming actually happened. Without this the first assertion
    // also passes when warming was silently skipped altogether.
    expect(added.mock.calls.map(([spec]) => spec)).toEqual(outroAssets);

    /*
     * And it is still lazy construction that builds it, at the preload margin.
     * `outro` is 2400px tall on an 800px viewport, so 1600px long; the margin
     * is raw −0.25, which is 400px above its top.
     */
    source.set({ scrollY: OUTRO_LAYOUT.top - 400 });
    tick();
    expect(constructions).toEqual(["intro", "outro"]);
  });

  it("does not warm a scene whose factory has no manifest", async () => {
    const added = vi.spyOn(sharedAssetLoader, "add");
    const scenes: SceneDef[] = [
      { id: "intro", vh: 300, adapter: loadingAdapter({ eager: true }) },
      { id: "outro", vh: 300, adapter: loadingAdapter({}) },
    ];
    startGatedEngine(scenes);

    await vi.advanceTimersByTimeAsync(MIN_VISIBLE_MS);

    // Correct degradation rather than an error: that scene simply is not warmed.
    expect(revealed()).toBe(true);
    expect(added).not.toHaveBeenCalled();
  });
});
