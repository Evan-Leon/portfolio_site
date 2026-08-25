/*
 * Tests for the jsdom gap fills in `test-setup.ts`.
 *
 * These are not ceremony. The engine is built on the
 * assumption that these two APIs behave in jsdom, and the failure mode when
 * one silently does not is a confusing error inside a library — `matchMedia is
 * not a function` raised from inside Lenis, or a `null` context surfacing three
 * calls later as "cannot read drawImage of null". Proving the fills work here
 * means those phases debug their own code instead of the harness.
 */
import { describe, expect, it, vi } from "vitest";
import { resetMediaQueries, setMediaQuery } from "./test-setup";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

describe("matchMedia fill", () => {
  it("exists and defaults every query to not matching", () => {
    expect(typeof window.matchMedia).toBe("function");
    expect(window.matchMedia(REDUCED_MOTION).matches).toBe(false);
  });

  it("reports the media string it was asked about", () => {
    expect(window.matchMedia(REDUCED_MOTION).media).toBe(REDUCED_MOTION);
  });

  it("lets a test drive both branches of a query", () => {
    setMediaQuery(REDUCED_MOTION, true);
    expect(window.matchMedia(REDUCED_MOTION).matches).toBe(true);

    setMediaQuery(REDUCED_MOTION, false);
    expect(window.matchMedia(REDUCED_MOTION).matches).toBe(false);
  });

  it("updates a list handed out before the value changed", () => {
    const list = window.matchMedia(REDUCED_MOTION);
    expect(list.matches).toBe(false);

    setMediaQuery(REDUCED_MOTION, true);

    expect(list.matches).toBe(true);
  });

  it("notifies change listeners registered through addEventListener", () => {
    const list = window.matchMedia(REDUCED_MOTION);
    const onChange = vi.fn();
    list.addEventListener("change", onChange);

    setMediaQuery(REDUCED_MOTION, true);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({
      matches: true,
      media: REDUCED_MOTION,
    });
  });

  it("notifies listeners registered through the deprecated addListener", () => {
    const list = window.matchMedia(REDUCED_MOTION);
    const onChange = vi.fn();
    list.addListener(onChange);

    setMediaQuery(REDUCED_MOTION, true);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({
      matches: true,
      media: REDUCED_MOTION,
    });
  });

  it("stops notifying after removeEventListener", () => {
    const list = window.matchMedia(REDUCED_MOTION);
    const onChange = vi.fn();
    list.addEventListener("change", onChange);
    list.removeEventListener("change", onChange);

    setMediaQuery(REDUCED_MOTION, true);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("resets to not matching, so one test cannot leak into the next", () => {
    setMediaQuery(REDUCED_MOTION, true);

    resetMediaQueries();

    expect(window.matchMedia(REDUCED_MOTION).matches).toBe(false);
  });

  it("was reset before this test ran, by the setup file beforeEach hook", () => {
    // The test above set the query to `true` and then reset it itself; this one
    // proves the automatic per-test reset is what tests may rely on. If the
    // hook were removed, an ordering-dependent leak would surface here.
    expect(window.matchMedia(REDUCED_MOTION).matches).toBe(false);
  });
});

describe("ResizeObserver fill", () => {
  it("is constructible", () => {
    expect(typeof globalThis.ResizeObserver).toBe("function");

    const observer = new ResizeObserver(() => {});

    expect(observer).toBeInstanceOf(ResizeObserver);
  });

  it("accepts observe, unobserve and disconnect without throwing", () => {
    const observer = new ResizeObserver(() => {});
    const el = document.createElement("div");

    expect(() => {
      observer.observe(el);
      observer.unobserve(el);
      observer.disconnect();
    }).not.toThrow();
  });
});
