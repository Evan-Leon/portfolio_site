/*
 * The wheel's first smoothing stage, against a fake Lenis.
 *
 * The fake records what it is told and, for the glide test, runs Lenis's own
 * second stage on it (`damp` toward the target it was handed, at the lerp it
 * was handed) — so "the speed stays steady" is measured on the position the
 * page would actually be at, not on this module's half of the arithmetic.
 *
 * Expected values are literals worked by hand: one 60Hz frame at lerp 0.16
 * covers 1 - e^-0.16 = 14.79% of the remaining distance (`EVO-UNI-109`).
 */
import type { Scrolling, VirtualScrollData } from "lenis";
import { describe, expect, it } from "vitest";

import {
  damp,
  wheelSmoother,
  type SmoothScrollTarget,
} from "./wheel-smoothing";

const FRAME = 1 / 60;

class FakeLenis implements SmoothScrollTarget {
  targetScroll = 0;
  limit = 10_000;
  prefersReducedMotion = false;
  isScrolling: Scrolling = false;
  /** Where Lenis's own stage has the page. */
  position = 0;
  calls: { target: number; lerp: number; programmatic: false }[] = [];

  scrollTo(target: number, options: { programmatic: false; lerp: number }) {
    this.calls.push({ target, ...options });
    this.targetScroll = target;
  }

  /** Lenis's `raf`: its own stage, toward the last target it was handed. */
  raf(dt: number): void {
    const lerp = this.calls.at(-1)?.lerp ?? 0.1;
    this.position = damp(this.position, this.targetScroll, lerp * 60, dt);
  }
}

function wheelData(
  deltaY: number,
  init: { ctrlKey?: boolean } = {},
): VirtualScrollData {
  const event = new WheelEvent("wheel", {
    deltaY,
    cancelable: true,
    ...init,
  });
  return { deltaX: 0, deltaY, event };
}

function setup(): {
  lenis: FakeLenis;
  smoother: ReturnType<typeof wheelSmoother>;
} {
  const lenis = new FakeLenis();
  const smoother = wheelSmoother();
  smoother.attach(lenis);
  return { lenis, smoother };
}

describe("wheelSmoother — which events it claims", () => {
  it("claims a wheel click and stops the browser scrolling natively", () => {
    const { smoother } = setup();
    const data = wheelData(100);

    expect(smoother.onVirtualScroll(data)).toBe(false);
    expect(data.event.defaultPrevented).toBe(true);
  });

  it("leaves touch, ctrl+wheel zoom and reduced motion to Lenis", () => {
    const { lenis, smoother } = setup();
    const touch = {
      deltaX: 0,
      deltaY: 40,
      event: new Event("touchmove") as TouchEvent,
    };

    expect(smoother.onVirtualScroll(touch)).toBe(true);
    expect(smoother.onVirtualScroll(wheelData(100, { ctrlKey: true }))).toBe(
      true,
    );

    lenis.prefersReducedMotion = true;
    expect(smoother.onVirtualScroll(wheelData(100))).toBe(true);
  });

  it("leaves everything to Lenis before it is attached", () => {
    expect(wheelSmoother().onVirtualScroll(wheelData(100))).toBe(true);
  });
});

describe("wheelSmoother — the first stage", () => {
  it("eases toward a click rather than handing Lenis the whole of it", () => {
    const { lenis, smoother } = setup();
    smoother.onVirtualScroll(wheelData(100));

    smoother.frame(FRAME);
    expect(lenis.calls[0]?.target).toBeCloseTo(14.79, 2);
    expect(lenis.calls[0]?.lerp).toBe(0.16);
    expect(lenis.calls[0]?.programmatic).toBe(false);

    smoother.frame(FRAME);
    expect(lenis.calls[1]?.target).toBeCloseTo(27.39, 2);
  });

  it("arrives exactly at the goal, then stops steering", () => {
    const { lenis, smoother } = setup();
    smoother.onVirtualScroll(wheelData(100));

    for (let i = 0; i < 120; i += 1) smoother.frame(FRAME);
    const targets = lenis.calls.map((call) => call.target);

    expect(targets.at(-1)).toBe(100);
    expect(targets.every((t, i) => i === 0 || t >= (targets[i - 1] ?? 0))).toBe(
      true,
    );
    expect(targets.length).toBeLessThan(120);
  });

  it("starts a gesture from wherever Lenis is already heading", () => {
    const { lenis, smoother } = setup();
    lenis.targetScroll = 500;
    smoother.onVirtualScroll(wheelData(100));

    smoother.frame(FRAME);
    expect(lenis.calls[0]?.target).toBeCloseTo(514.79, 2);
  });

  it("never aims past the ends of the page", () => {
    const { lenis, smoother } = setup();
    lenis.limit = 50;
    smoother.onVirtualScroll(wheelData(100));
    for (let i = 0; i < 120; i += 1) smoother.frame(FRAME);
    expect(lenis.calls.at(-1)?.target).toBe(50);

    smoother.onVirtualScroll(wheelData(-400));
    for (let i = 0; i < 120; i += 1) smoother.frame(FRAME);
    expect(lenis.calls.at(-1)?.target).toBe(0);
  });

  it("lets go when the visitor scrolls by other means, or the page is driven", () => {
    const { lenis, smoother } = setup();
    smoother.onVirtualScroll(wheelData(100));
    smoother.frame(FRAME);

    lenis.isScrolling = "native";
    smoother.frame(FRAME);
    expect(lenis.calls).toHaveLength(1);

    lenis.isScrolling = false;
    smoother.onVirtualScroll(wheelData(100));
    smoother.cancel();
    smoother.frame(FRAME);
    expect(lenis.calls).toHaveLength(1);
  });

  it("jumps straight to the goal if reduced motion is turned on mid-glide", () => {
    const { lenis, smoother } = setup();
    smoother.onVirtualScroll(wheelData(100));
    smoother.frame(FRAME);

    lenis.prefersReducedMotion = true;
    smoother.frame(FRAME);
    expect(lenis.calls.at(-1)?.target).toBe(100);
  });
});

describe("wheelSmoother — what the page does", () => {
  it("glides at a steady speed through a run of notched-wheel clicks", () => {
    const { lenis, smoother } = setup();
    const speeds: number[] = [];

    /* 30 clicks of 100px, 70ms apart — a brisk notched wheel — at 60Hz. */
    let nextClick = 0;
    let clicks = 0;
    for (let t = 0; t < 3; t += FRAME) {
      if (clicks < 30 && t >= nextClick) {
        smoother.onVirtualScroll(wheelData(100));
        clicks += 1;
        nextClick += 0.07;
      }
      const before = lenis.position;
      smoother.frame(FRAME);
      lenis.raf(FRAME);
      /* Steady state only: past the run-up, before the last click. */
      if (t > 1.2 && t < 29 * 0.07) speeds.push(lenis.position - before);
    }

    /* One stage of Lenis's default lerp swings 1.50x click to click. */
    expect(Math.max(...speeds) / Math.min(...speeds)).toBeLessThan(1.2);
  });
});
