/*
 * Integration tests for the rAF driver.
 *
 * Everything here runs the real engine against a real (jsdom) DOM, a fake
 * scroll source, and a fake layout — the two seams that exist so this file can
 * assert exact `seek` arguments at exact scroll positions without a browser.
 *
 * Frames are driven by hand rather than by a timer. `requestAnimationFrame` is
 * stubbed to capture the pending callback, so `tick()` runs exactly one frame
 * and nothing runs on its own. Fake timers are used only for the debounced
 * resize, and are cleaned up in `afterEach` (`EVO-FE-057`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdapterFactory, AnimationAdapter } from "../adapters/types";
import type { Host } from "../host/types";
import type { SceneDef } from "../scenes/types";
import {
  createEngine,
  REDUCED_MOTION_QUERY,
  REDUCED_MOTION_STEPS,
  RESIZE_DEBOUNCE_MS,
  SEEK_EPSILON,
  type EngineOptions,
} from "./engine";
import { ENGINE_STYLES } from "./engine-styles";
import { installFakeLayout, type FakeLayout } from "./fake-layout";
import { SCENE_CLASS, SCENE_PIN_CLASS } from "./mount";
import {
  createFakeScrollSource,
  type FakeScrollSource,
  type ScrollSource,
} from "./scroll-source";
import { setMediaQuery } from "../test-setup";

/* ------------------------------------------------------------------ *
 * The page under test
 * ------------------------------------------------------------------ */

const VIEWPORT_HEIGHT = 800;
/** 8800 − 800 = a scrollable range of exactly 8000, so global progress is round. */
const DOCUMENT_HEIGHT = 8800;

/** `intro` is 300vh: 2400px tall on this viewport, so 1600px of pinned duration. */
const INTRO_LAYOUT = { top: 800, height: 2400, pinWidth: 640, pinHeight: 360 };

/**
 * Scroll positions derived from `INTRO_LAYOUT`, named for what they mean.
 *
 * Note what `mountsAt` no longer means. `withPinVisibility` mounts a scene by
 * the time its pin can be seen, and on this geometry — a 300vh scene, so a
 * length of exactly two viewports — that happens at raw −0.5, which is scrollY
 * 0. The scene is therefore already mounted by the time any of these positions
 * is reached; `mountsAt` is now just "somewhere inside the leading margin".
 */
const INTRO = {
  /** raw −0.25, the declared preload margin. */
  mountsAt: 400,
  /** raw −0.5: the pin's top edge reaches the bottom of the viewport. */
  pinVisibleAt: 0,
  /** raw 0. */
  startsAt: 800,
  /** raw 0.25. */
  quarter: 1200,
  /** raw 1. */
  endsAt: 2400,
  /** raw 1.5, the unload margin: the adapter is destroyed here. */
  unmountsAt: 3200,
};

/* ------------------------------------------------------------------ *
 * A recording adapter
 * ------------------------------------------------------------------ */

interface AdapterLog {
  /** The container each construction was handed, newest last. */
  containers: HTMLElement[];
  /** Every adapter built for this scene, newest last. */
  instances: InstanceLog[];
}

interface InstanceLog {
  seeks: number[];
  resizes: Array<{ width: number; height: number }>;
  loads: number;
  destroys: number;
}

function recordingAdapter(): { factory: AdapterFactory; log: AdapterLog } {
  const log: AdapterLog = { containers: [], instances: [] };

  const factory: AdapterFactory = (
    container: HTMLElement,
  ): AnimationAdapter => {
    const instance: InstanceLog = {
      seeks: [],
      resizes: [],
      loads: 0,
      destroys: 0,
    };
    log.containers.push(container);
    log.instances.push(instance);

    return {
      load: (): Promise<void> => {
        instance.loads += 1;
        return Promise.resolve();
      },
      seek: (progress: number): void => {
        instance.seeks.push(progress);
      },
      resize: (width: number, height: number): void => {
        instance.resizes.push({ width, height });
      },
      destroy: (): void => {
        instance.destroys += 1;
      },
    };
  };

  return { factory, log };
}

/** The newest adapter built for a scene — the one currently on the page. */
function current(log: AdapterLog): InstanceLog {
  const instance = log.instances.at(-1);
  if (!instance) throw new Error("No adapter has been constructed yet");
  return instance;
}

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

let source: FakeScrollSource;
let layout: FakeLayout;
let root: HTMLElement;
let injected: string[];
let pendingFrame: FrameRequestCallback | null;
let scrollReads: number;

/**
 * Fake only the timers the debounce uses.
 *
 * Vitest's default `toFake` list includes `requestAnimationFrame`, which would
 * replace the stub below and leave `tick()` with nothing to run — the symptom
 * is a scene that never mounts, several assertions away from the cause.
 */
function useDebounceTimers(): void {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
}

/** Run exactly one frame, if one is scheduled. */
function tick(time = 0): void {
  const frame = pendingFrame;
  pendingFrame = null;
  frame?.(time);
}

/**
 * Scroll `intro` from its first pixel to its last, one frame per step.
 *
 * 32px of a 1600px pinned duration is 0.02 of progress, so the sweep visits 51
 * positions and every one of them clears `SEEK_EPSILON` — which is what makes
 * "only the keyframes arrived" a real assertion rather than a side effect of the
 * guard.
 */
function sweepIntro(): void {
  for (let scrollY = INTRO.startsAt; scrollY <= INTRO.endsAt; scrollY += 32) {
    source.set({ scrollY });
    tick();
  }
}

function hostWith(overrides: Partial<Host> = {}): Host {
  const counting: ScrollSource = {
    scrollY: () => {
      scrollReads += 1;
      return source.scrollY();
    },
    viewportHeight: () => source.viewportHeight(),
    documentHeight: () => source.documentHeight(),
  };

  return {
    mountRoot: () => root,
    scrollSource: () => counting,
    pinStrategy: "sticky",
    injectStyles: (css: string) => {
      injected.push(css);
    },
    ...overrides,
  };
}

/** Build and start an engine over one recording scene, and return both. */
function startEngine(options: Partial<EngineOptions> = {}): {
  engine: ReturnType<typeof createEngine>;
  log: AdapterLog;
} {
  const { factory, log } = recordingAdapter();
  const scenes: SceneDef[] = options.scenes ?? [
    { id: "intro", vh: 300, adapter: factory },
  ];

  const engine = createEngine({
    host: hostWith(),
    lenis: false,
    ...options,
    scenes,
  });
  engine.start();

  return { engine, log };
}

beforeEach(() => {
  source = createFakeScrollSource({
    scrollY: 0,
    viewportHeight: VIEWPORT_HEIGHT,
    documentHeight: DOCUMENT_HEIGHT,
  });
  layout = installFakeLayout(source);
  layout.set("intro", INTRO_LAYOUT);

  root = document.createElement("div");
  document.body.append(root);

  injected = [];
  pendingFrame = null;
  scrollReads = 0;

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
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  layout.restore();
  document.body.replaceChildren();
  document.documentElement.className = "";
});

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */

describe("createEngine — startup", () => {
  it("injects the engine geometry through the host, not a stylesheet import", () => {
    startEngine();

    expect(injected).toEqual([ENGINE_STYLES]);
  });

  it("mounts a spacer and a pinned container for every scene", () => {
    const { factory } = recordingAdapter();
    startEngine({
      scenes: [
        { id: "intro", vh: 300, adapter: factory },
        { id: "product", vh: 500, adapter: factory },
      ],
    });

    expect(
      [...root.querySelectorAll<HTMLElement>(`.${SCENE_CLASS}`)].map(
        (el) => el.dataset.scene,
      ),
    ).toEqual(["intro", "product"]);
  });

  it("starts a frame loop that keeps rescheduling itself", () => {
    startEngine();

    expect(pendingFrame).not.toBeNull();
    tick();
    expect(pendingFrame).not.toBeNull();
  });
});

describe("createEngine — scrubbing", () => {
  it("seeks the scene with its own local progress at a given scroll position", () => {
    const { log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();

    // (1200 − 800) / 1600 = 0.25
    expect(current(log).seeks).toEqual([0.25]);
  });

  it("clamps to 1 at the end of the scene rather than running past it", () => {
    const { log } = startEngine();

    source.set({ scrollY: INTRO.endsAt });
    tick();

    expect(current(log).seeks).toEqual([1]);
  });

  it("scrubs backwards through the same values it scrubbed forwards", () => {
    const { log } = startEngine();

    for (const scrollY of [
      INTRO.quarter,
      2000,
      INTRO.quarter,
      INTRO.startsAt,
    ]) {
      source.set({ scrollY });
      tick();
    }

    expect(current(log).seeks).toEqual([0.25, 0.75, 0.25, 0]);
  });

  it("reads scroll exactly once per frame, however many scenes are mounted", () => {
    const { factory } = recordingAdapter();
    layout.set("product", { top: 3200, height: 4000 });
    startEngine({
      scenes: [
        { id: "intro", vh: 300, adapter: factory },
        { id: "product", vh: 500, adapter: factory },
      ],
    });

    scrollReads = 0;
    source.set({ scrollY: INTRO.quarter });
    tick();

    expect(scrollReads).toBe(1);
  });

  it("hands the adapter the pinned container and nothing wider", () => {
    const { log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();

    const container = log.containers[0];
    expect(container?.className).toBe(
      `${SCENE_PIN_CLASS} ${SCENE_PIN_CLASS}--sticky`,
    );
    expect(container?.parentElement?.dataset.scene).toBe("intro");
  });
});

describe("createEngine — the epsilon guard", () => {
  it("does not re-seek a scene whose scroll position has not moved", () => {
    const { log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();
    tick();
    tick();

    expect(current(log).seeks).toEqual([0.25]);
  });

  it("suppresses a progress change smaller than SEEK_EPSILON", () => {
    const { log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();
    // 0.1px over a 1600px scene is 6.25e-5 of progress — below the threshold.
    source.set({ scrollY: INTRO.quarter + 0.1 });
    tick();

    expect(current(log).seeks).toEqual([0.25]);
  });

  it("seeks again once the change exceeds SEEK_EPSILON", () => {
    const { log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();
    // 0.4px over 1600px is 2.5e-4 of progress — above the threshold.
    source.set({ scrollY: INTRO.quarter + 0.4 });
    tick();

    expect(current(log).seeks[0]).toBe(0.25);
    expect(current(log).seeks[1]).toBeCloseTo(0.25025, 12);
    expect(SEEK_EPSILON).toBe(1e-4);
  });
});

describe("createEngine — scene lifecycle", () => {
  /*
   * A scene further down the page than the shared fixture, because the fixture
   * has no unmounted region to test: `INTRO_LAYOUT` puts the spacer top exactly
   * one viewport down, so its pin is already at the bottom edge of the screen at
   * scrollY 0 and the scene is legitimately mounted from the first frame.
   *
   * Numbers on this geometry: top 3000, length 1600, viewport 800. The pin's top
   * edge reaches the viewport bottom at 3000 − 800 = 2200, which is raw −0.5.
   */
  const FAR_LAYOUT = { ...INTRO_LAYOUT, top: 3000 };
  const FAR_PIN_VISIBLE_AT = 2200;

  it("leaves a scene unmounted while its pin is off screen", () => {
    layout.set("intro", FAR_LAYOUT);
    const { log } = startEngine();

    source.set({ scrollY: FAR_PIN_VISIBLE_AT - 1 });
    tick();

    expect(log.instances).toHaveLength(0);
  });

  it("mounts a scene the moment its pin can be seen, ahead of the declared margin", () => {
    /*
     * The regression this guards. The declared preload of 0.25 is 400px on this
     * scene, which would build the adapter at scrollY 2600 — 400px *after* the
     * pin was already on screen, leaving an empty panel that then popped into
     * frame 0. Visibility is the binding constraint here and `withPinVisibility`
     * is what makes it so.
     */
    layout.set("intro", FAR_LAYOUT);
    const { log } = startEngine();

    source.set({ scrollY: FAR_PIN_VISIBLE_AT });
    tick();

    expect(log.instances).toHaveLength(1);
    // Mounted *and* drawn: a pin on screen must never be an empty box.
    expect(current(log).seeks).toEqual([0]);
  });

  it("constructs and loads the adapter at the preload margin, on its first frame", () => {
    const { log } = startEngine();

    source.set({ scrollY: INTRO.mountsAt });
    tick();

    expect(log.instances).toHaveLength(1);
    expect(current(log).loads).toBe(1);
    // Seeked to its first frame rather than left blank: a mounted scene always
    // shows the frame its scroll position implies, and here that is 0.
    expect(current(log).seeks).toEqual([0]);
  });

  it("holds frame 0 across the preload margin instead of scrubbing through it", () => {
    const { log } = startEngine();

    source.set({ scrollY: INTRO.mountsAt });
    tick();
    source.set({ scrollY: INTRO.mountsAt + 200 });
    tick();
    source.set({ scrollY: INTRO.startsAt - 1 });
    tick();

    // Raw progress runs -0.25 → -0.000625 here. All of it clamps to 0, so the
    // epsilon guard leaves exactly one seek: the margin is not a scrub band.
    expect(current(log).seeks).toEqual([0]);
  });

  it("resizes the adapter on mount with the pinned container size, not the viewport", () => {
    const { log } = startEngine();

    source.set({ scrollY: INTRO.mountsAt });
    tick();

    expect(current(log).resizes).toEqual([{ width: 640, height: 360 }]);
  });

  it("settles a scene jumped past onto its final frame", () => {
    // The failure this prevents: a jump — a flung trackpad, a fragment link, a
    // restored scroll position — skips the rest of the active band, and the
    // scene is left holding whichever frame it last drew while a sliver of it
    // is still on screen above the fold.
    const { log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();
    // raw 1.25: past the end, inside the unload margin, still on the page.
    source.set({ scrollY: 2800 });
    tick();

    expect(current(log).seeks).toEqual([0.25, 1]);
  });

  it("settles a scene that mounts straight into its trailing margin", () => {
    // No previous frame to be stale — this is a deep-linked or restored load,
    // where the scene has never been seeked at all and 0 would be as wrong as
    // any other stale value.
    const { log } = startEngine();

    source.set({ scrollY: 2800 });
    tick();

    expect(current(log).seeks).toEqual([1]);
  });

  it("holds the final frame across the unload margin, seeking it only once", () => {
    const { log } = startEngine();

    source.set({ scrollY: 2800 });
    tick();
    source.set({ scrollY: 3000 });
    tick();
    source.set({ scrollY: INTRO.unmountsAt - 1 });
    tick();

    expect(current(log).seeks).toEqual([1]);
  });

  it("resumes scrubbing on the same adapter when the visitor scrolls back in", () => {
    const { log } = startEngine();

    source.set({ scrollY: 2800 });
    tick();
    source.set({ scrollY: INTRO.quarter });
    tick();

    expect(current(log).seeks).toEqual([1, 0.25]);
    // Never left the margins, so nothing was rebuilt.
    expect(log.instances).toHaveLength(1);
  });

  it("keeps a scrolled-past scene warm until it reaches its unload margin", () => {
    const { log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();
    source.set({ scrollY: INTRO.unmountsAt - 1 });
    tick();

    expect(current(log).destroys).toBe(0);
  });

  it("destroys the adapter and removes nothing from the page past the unload margin", () => {
    const { log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();
    source.set({ scrollY: INTRO.unmountsAt });
    tick();

    expect(current(log).destroys).toBe(1);
    // The spacer stays: it is what gives the page its scroll length.
    expect(root.querySelector(`.${SCENE_CLASS}`)).not.toBeNull();
  });

  it("builds a fresh adapter for a scene that is scrolled past and returned to", () => {
    const { log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();
    source.set({ scrollY: INTRO.unmountsAt });
    tick();
    source.set({ scrollY: INTRO.quarter });
    tick();

    expect(log.instances).toHaveLength(2);
    expect(log.instances[0]?.seeks).toEqual([0.25]);
    expect(current(log).seeks).toEqual([0.25]);
    expect(current(log).loads).toBe(1);
  });

  it("mounts and unmounts scenes independently of each other", () => {
    const intro = recordingAdapter();
    const product = recordingAdapter();
    layout.set("product", {
      top: 3200,
      height: 4000,
      pinWidth: 640,
      pinHeight: 360,
    });
    startEngine({
      scenes: [
        { id: "intro", vh: 300, adapter: intro.factory },
        { id: "product", vh: 500, adapter: product.factory },
      ],
    });

    source.set({ scrollY: INTRO.quarter });
    tick();

    expect(current(intro.log).seeks).toEqual([0.25]);
    expect(product.log.instances).toHaveLength(0);
  });
});

describe("createEngine — reduced motion", () => {
  it("seeks only quantised keyframes, each exactly once, across a full sweep", () => {
    setMediaQuery(REDUCED_MOTION_QUERY, true);
    const { log } = startEngine();

    sweepIntro();

    expect(current(log).seeks).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(REDUCED_MOTION_STEPS).toBe(4);
  });

  it("scrubs continuously with the preference off — the same sweep, unquantised", () => {
    // The control for the test above (`EVO-UNI-061`): without it, an engine that
    // quantised unconditionally — or one that never seeked at all — would look
    // identical from the reduced-motion side.
    const { log } = startEngine();

    sweepIntro();

    expect(current(log).seeks).toHaveLength(51);
    expect(current(log).seeks.slice(0, 3)).toEqual([0, 0.02, 0.04]);
  });

  it("honours a preference turned on after the engine started", () => {
    // `matches` is read once per frame rather than captured at construction,
    // for the same reason Lenis re-reads its own: the preference can change
    // mid-session, and nothing here needs re-instantiating when it does.
    const { log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();
    setMediaQuery(REDUCED_MOTION_QUERY, true);
    // raw 0.3125 quantises to 0.25 — already seeked, so the guard suppresses it.
    source.set({ scrollY: 1300 });
    tick();
    // raw 0.4375 quantises to 0.5, which is a state change and does arrive.
    source.set({ scrollY: 1500 });
    tick();

    expect(current(log).seeks).toEqual([0.25, 0.5]);
  });

  it("still steps every scene on the page, not just the first", () => {
    const intro = recordingAdapter();
    const product = recordingAdapter();
    layout.set("product", {
      top: 3200,
      height: 4000,
      pinWidth: 640,
      pinHeight: 360,
    });
    setMediaQuery(REDUCED_MOTION_QUERY, true);
    startEngine({
      scenes: [
        { id: "intro", vh: 300, adapter: intro.factory },
        { id: "product", vh: 500, adapter: product.factory },
      ],
    });

    // 3200 is `intro`'s unload margin and `product`'s start; 4000 is a quarter
    // of `product`'s 3200px pinned duration.
    source.set({ scrollY: 3200 });
    tick();
    source.set({ scrollY: 4000 });
    tick();

    expect(current(product.log).seeks).toEqual([0, 0.25]);
  });
});

describe("createEngine — the persistent layer", () => {
  it("receives global page progress, not scene progress", () => {
    const progress: number[] = [];
    startEngine({ persistentLayer: (value) => progress.push(value) });

    source.set({ scrollY: INTRO.quarter });
    tick();

    // 1200 / (8800 − 800) = 0.15 globally, where the scene is at 0.25.
    expect(progress.at(-1)).toBe(0.15);
  });

  it("reports 0 rather than NaN for a document that fits in one viewport", () => {
    const progress: number[] = [];
    source.set({ documentHeight: VIEWPORT_HEIGHT });
    startEngine({ persistentLayer: (value) => progress.push(value) });

    tick();

    expect(progress.at(-1)).toBe(0);
  });
});

describe("createEngine — resize", () => {
  it("re-measures and re-seeks after a debounced window resize", () => {
    useDebounceTimers();
    const { log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();

    // A taller viewport shortens the pinned duration: 2400 − 1000 = 1400.
    layout.set("intro", { ...INTRO_LAYOUT, pinWidth: 375, pinHeight: 1000 });
    source.set({ viewportHeight: 1000 });
    dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS);
    tick();

    expect(current(log).resizes.at(-1)).toEqual({ width: 375, height: 1000 });
    // (1200 − 800) / 1400 = 0.2857142857142857
    expect(current(log).seeks.at(-1)).toBeCloseTo(0.2857142857, 10);
  });

  it("measures once for a burst of resize events", () => {
    useDebounceTimers();
    const { log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();
    const before = current(log).resizes.length;

    for (let i = 0; i < 5; i += 1) dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS);

    expect(current(log).resizes).toHaveLength(before + 1);
  });
});

describe("createEngine — stop and destroy", () => {
  it("stops seeking after stop(), and resumes after start()", () => {
    const { engine, log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();
    engine.stop();

    source.set({ scrollY: INTRO.endsAt });
    tick();
    expect(current(log).seeks).toEqual([0.25]);

    engine.start();
    tick();
    expect(current(log).seeks).toEqual([0.25, 1]);
  });

  it("destroys every live adapter and removes the scenes from the page", () => {
    const { engine, log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();
    engine.destroy();

    expect(current(log).destroys).toBe(1);
    expect(root.querySelector(`.${SCENE_CLASS}`)).toBeNull();
    expect(pendingFrame).toBeNull();
  });

  it("stops listening for resize after destroy()", () => {
    useDebounceTimers();
    const { engine, log } = startEngine();

    source.set({ scrollY: INTRO.quarter });
    tick();
    const destroyed = current(log);
    engine.destroy();

    dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS);

    expect(destroyed.resizes).toHaveLength(1);
  });
});

describe("createEngine — Lenis", () => {
  it("runs Lenis by default, and tears it down on destroy", () => {
    const { engine } = startEngine({ lenis: undefined });

    expect(document.documentElement.classList.contains("lenis")).toBe(true);

    engine.destroy();
    expect(document.documentElement.classList.contains("lenis")).toBe(false);
  });

  it("leaves Lenis out entirely when the option is off", () => {
    startEngine({ lenis: false });

    expect(document.documentElement.classList.contains("lenis")).toBe(false);
  });

  it("keeps scrubbing under prefers-reduced-motion — Lenis drops smoothing, not scroll", () => {
    setMediaQuery(REDUCED_MOTION_QUERY, true);
    const { log } = startEngine({ lenis: undefined });

    expect(document.documentElement.classList.contains("lenis")).toBe(true);

    source.set({ scrollY: INTRO.quarter });
    tick();

    expect(current(log).seeks).toEqual([0.25]);
  });
});
