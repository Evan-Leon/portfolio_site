import { describe, expect, it } from "vitest";
import {
  createFakeScrollSource,
  createWindowScrollSource,
} from "./scroll-source";
import { sceneProgress } from "./progress";

/**
 * Replace one property with a fixed number and hand back the undo.
 *
 * jsdom has no layout engine, so `window.scrollY` never moves and
 * `documentElement.scrollHeight` is always 0 — the only way to test that the
 * window source reads the right three properties is to define them. The undo is
 * always called from a `finally` (EVO-UNI-058): a failed assertion must not
 * leave a stubbed `window` behind for the next test file.
 */
function override(target: object, key: string, value: number): () => void {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, {
    value,
    configurable: true,
    writable: true,
  });

  return () => {
    if (original) Object.defineProperty(target, key, original);
    else Reflect.deleteProperty(target, key);
  };
}

describe("createFakeScrollSource", () => {
  it("reports exactly what it was given", () => {
    const source = createFakeScrollSource({
      scrollY: 1234,
      viewportHeight: 900,
      documentHeight: 12000,
    });

    expect(source.scrollY()).toBe(1234);
    expect(source.viewportHeight()).toBe(900);
    expect(source.documentHeight()).toBe(12000);
  });

  it("fills unset fields with a document sitting at the top", () => {
    const source = createFakeScrollSource({});

    expect(source.scrollY()).toBe(0);
    expect(source.viewportHeight()).toBe(800);
    expect(source.documentHeight()).toBe(8000);
  });

  it("can be constructed with no argument at all", () => {
    const source = createFakeScrollSource();

    expect(source.scrollY()).toBe(0);
    expect(source.viewportHeight()).toBe(800);
    expect(source.documentHeight()).toBe(8000);
  });

  it("keeps a partially specified init from clobbering the other two", () => {
    const source = createFakeScrollSource({ viewportHeight: 1000 });

    expect(source.scrollY()).toBe(0);
    expect(source.viewportHeight()).toBe(1000);
    expect(source.documentHeight()).toBe(8000);
  });

  it("moves scroll position between assertions", () => {
    const source = createFakeScrollSource({
      scrollY: 0,
      viewportHeight: 1000,
      documentHeight: 9000,
    });

    source.set({ scrollY: 2500 });
    expect(source.scrollY()).toBe(2500);

    source.set({ scrollY: 400 });
    expect(source.scrollY()).toBe(400);
  });

  it("leaves fields `set` did not name untouched", () => {
    const source = createFakeScrollSource({
      scrollY: 10,
      viewportHeight: 1000,
      documentHeight: 9000,
    });

    source.set({ documentHeight: 20000 });

    expect(source.scrollY()).toBe(10);
    expect(source.viewportHeight()).toBe(1000);
    expect(source.documentHeight()).toBe(20000);
  });

  it("drives scene progress without a browser — the reason this seam exists", () => {
    // A 300vh scene starting at 1000px, on a 1000px viewport: 2000px of pinned
    // duration. This is what SD5's rAF loop does once per frame.
    const source = createFakeScrollSource({
      scrollY: 1000,
      viewportHeight: 1000,
      documentHeight: 9000,
    });
    const sceneTop = 1000;
    const sceneLength = 2000;

    expect(sceneProgress(source.scrollY(), sceneTop, sceneLength)).toBe(0);

    source.set({ scrollY: 2000 });
    expect(sceneProgress(source.scrollY(), sceneTop, sceneLength)).toBe(0.5);

    source.set({ scrollY: 3000 });
    expect(sceneProgress(source.scrollY(), sceneTop, sceneLength)).toBe(1);

    // Scrubbing back lands on the same number it left — SDS-001.
    source.set({ scrollY: 2000 });
    expect(sceneProgress(source.scrollY(), sceneTop, sceneLength)).toBe(0.5);
  });
});

describe("createWindowScrollSource", () => {
  it("reads the three window and document properties", () => {
    const undo = [
      override(window, "scrollY", 640),
      override(window, "innerHeight", 900),
      override(document.documentElement, "scrollHeight", 15000),
    ];

    try {
      const source = createWindowScrollSource();

      expect(source.scrollY()).toBe(640);
      expect(source.viewportHeight()).toBe(900);
      expect(source.documentHeight()).toBe(15000);
    } finally {
      for (const restore of undo) restore();
    }
  });

  it("reads live values rather than snapshotting them at construction", () => {
    // SDS-005: the rAF loop calls these once per frame and expects the current
    // position. A source that cached its numbers would freeze the whole page.
    const source = createWindowScrollSource();

    let undo = override(window, "scrollY", 100);
    try {
      expect(source.scrollY()).toBe(100);
    } finally {
      undo();
    }

    undo = override(window, "scrollY", 2200);
    try {
      expect(source.scrollY()).toBe(2200);
    } finally {
      undo();
    }
  });

  it("reports the full document height, not the scrollable range", () => {
    // The convention SD5 and SD7 depend on: global progress divides by
    // `documentHeight() - viewportHeight()`, so this must be the undivided
    // scrollHeight. Returning the range here would halve every global progress
    // value with nothing failing.
    const undo = [
      override(window, "innerHeight", 1000),
      override(document.documentElement, "scrollHeight", 9000),
    ];

    try {
      const source = createWindowScrollSource();

      expect(source.documentHeight()).toBe(9000);
      expect(source.documentHeight() - source.viewportHeight()).toBe(8000);
    } finally {
      for (const restore of undo) restore();
    }
  });
});
