/*
 * The pre-warm hold, stepped a frame at a time.
 *
 * What it promises the page: the pins are on screen behind the ring for a fixed
 * number of frames, back in place before the ring is told to lift, and the
 * ring lifts exactly once. The raster saving itself cannot be observed from
 * jsdom — it is measured in `prewarm.ts`'s header.
 */
import { describe, expect, it, vi } from "vitest";

import { SCENE_PIN_CLASS } from "../engine/mount";
import type { LoadingRing } from "../loader/loading-ring";
import { prewarmBeforeReveal } from "./prewarm";

const STICKY = `${SCENE_PIN_CLASS}--sticky`;
const FIXED = `${SCENE_PIN_CLASS}--fixed`;

/** A frame source the test advances by hand. */
function manualFrames(): {
  next: () => Promise<void>;
  step: () => Promise<void>;
} {
  const pending: (() => void)[] = [];
  return {
    next: () => new Promise<void>((resolve) => pending.push(resolve)),
    step: async () => {
      pending.shift()?.();
      /* Let the awaiting loop run up to its next frame request. */
      for (let i = 0; i < 5; i += 1) await Promise.resolve();
    },
  };
}

function fakeRing(): LoadingRing & { dismiss: ReturnType<typeof vi.fn> } {
  return {
    setProgress: vi.fn(),
    fail: vi.fn(),
    dismiss: vi.fn(() => Promise.resolve()),
  };
}

function pin(...classes: string[]): HTMLElement {
  const element = document.createElement("div");
  element.classList.add(SCENE_PIN_CLASS, ...classes);
  return element;
}

describe("prewarmBeforeReveal", () => {
  it("holds the pin on screen for ten frames, then puts it back and lifts the ring", async () => {
    const root = document.createElement("div");
    const lot = pin(STICKY);
    root.append(lot);
    const ring = fakeRing();
    const frames = manualFrames();

    /* The hold starts synchronously, inside `dismiss()`. */
    const done = prewarmBeforeReveal(ring, root, frames.next).dismiss();

    for (let i = 0; i < 9; i += 1) {
      expect(lot.classList.contains(FIXED)).toBe(true);
      await frames.step();
    }
    expect(lot.classList.contains(FIXED)).toBe(true);
    expect(ring.dismiss).not.toHaveBeenCalled();

    await frames.step(); // the tenth frame ends the hold
    expect(lot.classList.contains(FIXED)).toBe(false);
    expect(lot.classList.contains(STICKY)).toBe(true);
    expect(ring.dismiss).not.toHaveBeenCalled();

    await frames.step(); // the settling frame
    await done;
    expect(ring.dismiss).toHaveBeenCalledTimes(1);
  });

  it("lifts the ring once however many times it is dismissed", async () => {
    const ring = fakeRing();
    const frames = manualFrames();
    const wrapped = prewarmBeforeReveal(
      ring,
      document.createElement("div"),
      frames.next,
    );

    const first = wrapped.dismiss();
    expect(wrapped.dismiss()).toBe(first);
    for (let i = 0; i < 12; i += 1) await frames.step();
    await first;

    expect(ring.dismiss).toHaveBeenCalledTimes(1);
  });

  it("leaves a pin the host already fixed alone", async () => {
    const root = document.createElement("div");
    const fixed = pin(FIXED);
    root.append(fixed);
    const frames = manualFrames();

    const done = prewarmBeforeReveal(fakeRing(), root, frames.next).dismiss();
    for (let i = 0; i < 12; i += 1) await frames.step();
    await done;

    expect(fixed.classList.contains(FIXED)).toBe(true);
  });

  it("passes progress and failures straight through", () => {
    const ring = fakeRing();
    const wrapped = prewarmBeforeReveal(ring, document.createElement("div"));

    wrapped.setProgress(0.4);
    wrapped.fail("two posters");

    expect(ring.setProgress).toHaveBeenCalledWith(0.4);
    expect(ring.fail).toHaveBeenCalledWith("two posters");
  });
});
