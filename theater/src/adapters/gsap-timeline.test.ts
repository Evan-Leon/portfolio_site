/*
 * The GSAP adapter's own behaviour, with `gsap` mocked.
 *
 * The conformance kit is NOT here — it lives in `gsap-timeline.contract.test.ts`,
 * because `vi.mock` is file-scoped and `SDS-003` is only worth anything when the
 * kit runs against the real library. That split matters more here than for any
 * other adapter: the thing most likely to fail the kit is GSAP's own ticker,
 * which a mock does not have.
 *
 * The "not imported until `load()`" assertion is in
 * `dynamic-import-boundary.test.ts` for the mechanical reason recorded there.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GSAP_CONTAINER_CLASS, gsapTimeline } from "./gsap-timeline";
import type {
  GsapTimeline,
  GsapTimelineAdapter,
  GsapTimelineContext,
} from "./gsap-timeline";

/* ------------------------------------------------------------------ *
 * The fake gsap
 * ------------------------------------------------------------------ */

const mock = vi.hoisted(() => {
  class FakeTimeline {
    paused = false;
    killed = false;
    /** Every `progress(value, suppressEvents)` call, in order. */
    readonly seeks: { value: number; suppressEvents: boolean | undefined }[] =
      [];

    #progress = 0;

    progress(value?: number, suppressEvents?: boolean): number | FakeTimeline {
      if (value === undefined) return this.#progress;
      this.#progress = value;
      this.seeks.push({ value, suppressEvents });
      return this;
    }

    pause(): FakeTimeline {
      this.paused = true;
      return this;
    }

    kill(): FakeTimeline {
      this.killed = true;
      return this;
    }
  }

  const state = {
    timelines: [] as FakeTimeline[],
    /** `gsap.ticker.sleep()` calls — the rAF loop importing gsap starts. */
    sleeps: 0,
    /** Every `{ paused }` config a timeline was created with. */
    configs: [] as ({ paused?: boolean } | undefined)[],

    reset(): void {
      state.timelines = [];
      state.sleeps = 0;
      state.configs = [];
    },

    createModule(): { gsap: unknown } {
      return {
        gsap: {
          timeline(vars?: { paused?: boolean }) {
            state.configs.push(vars);
            const timeline = new FakeTimeline();
            if (vars?.paused === true) timeline.paused = true;
            state.timelines.push(timeline);
            return timeline;
          },
          ticker: {
            sleep() {
              state.sleeps += 1;
            },
          },
        },
      };
    },
  };

  return state;
});

vi.mock("gsap", () => mock.createModule());

/** The timeline the fake gsap most recently built, or a failing assertion. */
function lastTimeline(): (typeof mock.timelines)[number] {
  const timeline = mock.timelines[mock.timelines.length - 1];
  if (!timeline) throw new Error("The builder never created a timeline");
  return timeline;
}

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

/*
 * Every adapter a test mounts, destroyed in `afterEach`.
 *
 * The module refcounts its live timelines to decide when it may sleep GSAP's
 * ticker, and that counter is module-level by design — so a test that leaves an
 * adapter mounted holds the count above zero for every test after it
 * (`EVO-UNI-044`). `destroy()` is idempotent, so a test that tears down
 * explicitly can still be listed here.
 */
let mounted: GsapTimelineAdapter[];

beforeEach(() => {
  mock.reset();
  mounted = [];
  // The adapter logs a builder that threw and a gsap that failed to import.
  // Both are deliberate below; silenced so the run does not print expected noise.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  for (const adapter of mounted) adapter.destroy();
  vi.restoreAllMocks();
});

interface Mounted {
  adapter: GsapTimelineAdapter;
  container: HTMLElement;
  /** The context the builder was handed, or `null` if it was never called. */
  context: GsapTimelineContext | null;
}

/** The ordinary builder: one paused timeline over the container it is given. */
function buildPaused(ctx: GsapTimelineContext): GsapTimeline {
  return ctx.gsap.timeline({ paused: true });
}

/** Build an adapter over a throwaway container and await its load. */
async function mount(
  build: (ctx: GsapTimelineContext) => GsapTimeline = buildPaused,
): Promise<Mounted> {
  const container = document.createElement("div");
  document.body.append(container);

  let context: GsapTimelineContext | null = null;
  const adapter = gsapTimeline((ctx) => {
    context = ctx;
    return build(ctx);
  })(container) as GsapTimelineAdapter;
  mounted.push(adapter);

  await adapter.load(() => {});

  return { adapter, container, context };
}

/* ------------------------------------------------------------------ *
 * SDS-001 — progress drives the timeline absolutely
 * ------------------------------------------------------------------ */

describe("gsapTimeline — progress", () => {
  it("passes the progress straight through, with suppressEvents", async () => {
    const { adapter } = await mount();
    const timeline = lastTimeline();

    adapter.seek(0);
    adapter.seek(0.25);
    adapter.seek(1);

    expect(timeline.seeks.slice(-3)).toEqual([
      { value: 0, suppressEvents: true },
      { value: 0.25, suppressEvents: true },
      { value: 1, suppressEvents: true },
    ]);
  });

  it("always suppresses events, so scrubbing the end does not re-fire onComplete", async () => {
    const { adapter } = await mount();
    const timeline = lastTimeline();

    // What a visitor at the bottom of a scene does: oscillate across progress 1.
    for (const progress of [0.98, 1, 0.99, 1, 1]) adapter.seek(progress);

    expect(timeline.seeks.every((call) => call.suppressEvents === true)).toBe(
      true,
    );
  });

  it("clamps progress outside 0..1", async () => {
    const { adapter } = await mount();
    const timeline = lastTimeline();

    adapter.seek(-0.5);
    expect(timeline.seeks[timeline.seeks.length - 1]?.value).toBe(0);

    adapter.seek(1.5);
    expect(timeline.seeks[timeline.seeks.length - 1]?.value).toBe(1);
  });

  it("sets the same progress twice for the same input (SDS-001)", async () => {
    const { adapter } = await mount();
    const timeline = lastTimeline();

    adapter.seek(0.42);
    adapter.seek(0.42);

    const [first, second] = timeline.seeks.slice(-2);
    expect(second).toEqual(first);
  });

  it("replays the progress it was given before gsap finished loading", async () => {
    const container = document.createElement("div");
    const adapter = gsapTimeline(buildPaused)(container) as GsapTimelineAdapter;
    mounted.push(adapter);

    const loading = adapter.load(() => {});
    adapter.seek(0.75);
    expect(adapter.snapshot().ready).toBe(false);

    await loading;

    // The engine's epsilon guard will not re-seek an unchanged progress, so a
    // scene held still while gsap loads has to catch up by itself.
    expect(lastTimeline().seeks).toEqual([
      { value: 0.75, suppressEvents: true },
    ]);
    adapter.destroy();
  });

  it("never reads layout inside seek (SDS-004)", async () => {
    const { adapter } = await mount();

    const measure = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    for (let step = 0; step <= 20; step += 1) adapter.seek(step / 20);

    expect(measure).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ *
 * The timeline is never allowed its own clock
 * ------------------------------------------------------------------ */

describe("gsapTimeline — the timeline is paused", () => {
  it("pauses a timeline the builder forgot to create paused", async () => {
    const { adapter } = await mount((ctx) => ctx.gsap.timeline());

    expect(mock.configs).toEqual([undefined]);
    expect(lastTimeline().paused).toBe(true);
    adapter.destroy();
  });

  it("leaves a correctly built timeline paused", async () => {
    const { adapter } = await mount();

    expect(lastTimeline().paused).toBe(true);
    adapter.destroy();
  });
});

/* ------------------------------------------------------------------ *
 * The builder's context
 * ------------------------------------------------------------------ */

describe("gsapTimeline — the builder context", () => {
  it("hands the builder the adapter’s own element, not the scene container (SDS-002)", async () => {
    const { adapter, container, context } = await mount();

    const root = container.querySelector(`.${GSAP_CONTAINER_CLASS}`);
    expect(root).not.toBe(null);
    expect(context?.container).toBe(root);
    adapter.destroy();
  });

  it("hands the builder gsap, so no scene file needs a static import", async () => {
    const { adapter, context } = await mount();

    expect(typeof context?.gsap.timeline).toBe("function");
    adapter.destroy();
  });

  it("declares no assets — there is nothing to warm", () => {
    expect(gsapTimeline(buildPaused).assets).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ *
 * Failure — SDS-006, "the page always reveals"
 * ------------------------------------------------------------------ */

describe("gsapTimeline — failure", () => {
  it("resolves rather than rejecting when the builder throws", async () => {
    const container = document.createElement("div");
    const adapter = gsapTimeline(() => {
      throw new Error("bad timeline");
    })(container) as GsapTimelineAdapter;

    await expect(adapter.load(() => {})).resolves.toBeUndefined();

    expect(adapter.snapshot().failed).toBe(true);
    expect(adapter.snapshot().ready).toBe(false);
  });

  it("tolerates a seek and a resize after a failed build", async () => {
    const container = document.createElement("div");
    const adapter = gsapTimeline(() => {
      throw new Error("bad timeline");
    })(container) as GsapTimelineAdapter;
    await adapter.load(() => {});

    expect(() => {
      adapter.resize(800, 600);
      adapter.seek(0.5);
    }).not.toThrow();
  });

  it("reports progress that ends at 1", async () => {
    const container = document.createElement("div");
    const adapter = gsapTimeline(buildPaused)(container) as GsapTimelineAdapter;
    mounted.push(adapter);

    const reported: number[] = [];
    await adapter.load((fraction) => reported.push(fraction));

    expect(reported[reported.length - 1]).toBe(1);
    expect(reported).toEqual([...reported].sort((a, b) => a - b));
    adapter.destroy();
  });

  it("does not build a timeline when destroy() lands before gsap arrives", async () => {
    const container = document.createElement("div");
    const adapter = gsapTimeline(buildPaused)(container) as GsapTimelineAdapter;
    mounted.push(adapter);

    const loading = adapter.load(() => {});
    adapter.destroy();

    await expect(loading).resolves.toBeUndefined();
    expect(mock.timelines).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * Sizing and teardown
 * ------------------------------------------------------------------ */

describe("gsapTimeline — resize", () => {
  it("caches the dimensions it was handed", async () => {
    const { adapter } = await mount();

    adapter.resize(1024, 768);

    expect(adapter.snapshot().width).toBe(1024);
    expect(adapter.snapshot().height).toBe(768);
    adapter.destroy();
  });
});

describe("gsapTimeline — destroy", () => {
  it("calls the timeline's own kill() and removes its element", async () => {
    const { adapter, container } = await mount();
    const timeline = lastTimeline();

    adapter.destroy();

    expect(timeline.killed).toBe(true);
    expect(container.querySelector(`.${GSAP_CONTAINER_CLASS}`)).toBe(null);
  });

  it("sleeps the ticker once the last timeline is gone", async () => {
    const first = await mount();
    const second = await mount();

    first.adapter.destroy();
    // The other scene is still mounted; sleeping now would stop its animations.
    expect(mock.sleeps).toBe(0);

    second.adapter.destroy();
    expect(mock.sleeps).toBe(1);
  });

  it("ignores a seek or resize that arrives after destroy", async () => {
    const { adapter } = await mount();
    const timeline = lastTimeline();
    adapter.destroy();

    const before = timeline.seeks.length;
    expect(() => {
      adapter.resize(640, 480);
      adapter.seek(0.5);
    }).not.toThrow();
    expect(timeline.seeks).toHaveLength(before);
  });
});
