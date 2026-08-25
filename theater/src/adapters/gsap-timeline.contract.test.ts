/*
 * `SDS-003` for the GSAP adapter, against the REAL `gsap`.
 *
 * Separate from `gsap-timeline.test.ts` because `vi.mock` is file-scoped, and
 * here that split earns its keep more than anywhere else in the project: the
 * only part of this adapter at real risk of failing the conformance kit is
 * GSAP's ticker, and a mocked `gsap` does not have one.
 *
 * THE TICKER IS THE WHOLE REASON THIS FILE EXISTS
 * -----------------------------------------------
 * `gsap-core.js` ends with `_windowExists() && _wake()`, so importing the
 * library starts a `requestAnimationFrame` loop that re-requests itself on every
 * tick. GSAP stops it on its own only at the next garbage-collection frame,
 * `autoSleep` (120 frames) later. The engine destroys an adapter every time a
 * scene passes its unload margin, so without the adapter's own `ticker.sleep()`
 * that loop outlives every scene that ever mounted. Measured in SD9: with the
 * sleep removed, the kit reports `cleanup-animation-frames` with one handle
 * outstanding.
 *
 * WHY GSAP IS WOKEN BEFORE THE KIT RUNS, AND WHY THAT IS NOT CHEATING
 * ------------------------------------------------------------------
 * The kit patches `requestAnimationFrame` and `addEventListener` globally for
 * the duration of a check and attributes everything it catches to the adapter.
 * GSAP's *library initialisation* runs once per module registry and registers
 * nine window listeners of its own (`focus`, `keydown`, `mouseover`, …) that no
 * adapter can remove without breaking every other GSAP user on the page. Letting
 * that land inside the instrumented window would report a one-time library cost
 * as a per-scene leak — the same reason the kit already shields jsdom's own
 * timers behind `insideHostCall`. The `beforeAll` below makes the warm-up
 * deliberate; without it this file's result depends on which test ran first,
 * which is not a property worth having.
 *
 * The ticker is a different matter and is NOT excused this way: it is cancelled
 * and re-armed per mount, so `cancels the ticker's animation frame` below drives
 * it from a known-asleep state and asserts the handle is gone after `destroy()`.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { adapterContract } from "./adapter-contract";
import { gsapTimeline } from "./gsap-timeline";
import type { GsapTimelineAdapter, GsapTimelineContext } from "./gsap-timeline";

/**
 * The timeline every trial here scrubs: two tweens over one element, so
 * progress 0, 0.5 and 1 are three visibly different states.
 *
 * Deliberately ordinary GSAP — the adapter is supposed to constrain nothing
 * about what a collaborator animates, and a builder that needed adapter-specific
 * ceremony would be evidence it does.
 */
function buildDemoTimeline({ container, gsap }: GsapTimelineContext) {
  const box = document.createElement("div");
  container.append(box);

  const timeline = gsap.timeline({ paused: true });
  timeline.to(box, { opacity: 0.5, duration: 1 });
  timeline.to(box, { opacity: 1, x: 100, duration: 1 });

  return timeline;
}

/*
 * Run GSAP's one-time initialisation before the conformance kit starts
 * instrumenting. See the header for why this is deliberate rather than
 * convenient.
 */
beforeAll(async () => {
  await import("gsap");
});

describe("gsapTimeline — the real library", () => {
  it("cancels the ticker's animation frame when the last scene is destroyed", async () => {
    const { gsap } = await import("gsap");
    // A known starting point: whatever an earlier test left the ticker doing,
    // it is asleep now, so every handle counted below is one this mount armed.
    gsap.ticker.sleep();

    const outstanding = new Set<number>();
    const realRequest = globalThis.requestAnimationFrame;
    const realCancel = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = (
      callback: FrameRequestCallback,
    ): number => {
      const handle = realRequest(callback);
      outstanding.add(handle);
      return handle;
    };
    globalThis.cancelAnimationFrame = (handle: number): void => {
      outstanding.delete(handle);
      realCancel(handle);
    };

    try {
      const container = document.createElement("div");
      document.body.append(container);
      const adapter = gsapTimeline(buildDemoTimeline)(
        container,
      ) as GsapTimelineAdapter;

      await adapter.load(() => {});

      // Building a timeline wakes the ticker, which is GSAP's business — the
      // adapter's business is that nothing is still armed afterwards.
      expect(outstanding.size).toBeGreaterThan(0);

      adapter.destroy();

      expect([...outstanding]).toEqual([]);
      container.remove();
    } finally {
      globalThis.requestAnimationFrame = realRequest;
      globalThis.cancelAnimationFrame = realCancel;
    }
  });

  it("scrubs a real timeline, so the contract run below is not measuring a failed build", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const adapter = gsapTimeline(buildDemoTimeline)(
      container,
    ) as GsapTimelineAdapter;

    await adapter.load(() => {});

    expect(adapter.snapshot().failed).toBe(false);
    expect(adapter.snapshot().ready).toBe(true);

    adapter.seek(0);
    expect(adapter.snapshot().timelineProgress).toBe(0);
    adapter.seek(0.5);
    expect(adapter.snapshot().timelineProgress).toBe(0.5);
    adapter.seek(1);
    expect(adapter.snapshot().timelineProgress).toBe(1);

    // Backwards, which is what a delta-accumulating adapter gets wrong.
    adapter.seek(0.25);
    expect(adapter.snapshot().timelineProgress).toBe(0.25);

    adapter.destroy();
    expect(container.children).toHaveLength(0);
  });

  it("does not fire onComplete when the visitor scrubs across the end", async () => {
    const container = document.createElement("div");
    document.body.append(container);

    let completions = 0;
    let updates = 0;
    const adapter = gsapTimeline((ctx) => {
      const box = document.createElement("div");
      ctx.container.append(box);

      const timeline = ctx.gsap.timeline({
        paused: true,
        onComplete: () => {
          completions += 1;
        },
        onUpdate: () => {
          updates += 1;
        },
      });
      timeline.to(box, { opacity: 0, duration: 1 });
      return timeline;
    })(container) as GsapTimelineAdapter;

    await adapter.load(() => {});

    // Oscillating around the end of a scene is ordinary scrolling. Without
    // `suppressEvents` this fires onComplete on every pass.
    for (const progress of [0.98, 1, 0.99, 1, 1, 0.97]) adapter.seek(progress);

    expect(completions).toBe(0);
    expect(updates).toBe(0);

    adapter.destroy();
  });
});

adapterContract(gsapTimeline(buildDemoTimeline), {
  name: "gsapTimeline",
  observe: (adapter) => (adapter as GsapTimelineAdapter).snapshot(),
});
