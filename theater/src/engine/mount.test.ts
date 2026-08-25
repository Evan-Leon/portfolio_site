import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { placeholder } from "../adapters/placeholder";
import type { Host, PinStrategy } from "../host/types";
import type { SceneDef } from "../scenes/types";
import { installFakeLayout, type FakeLayout } from "./fake-layout";
import {
  mountScenes,
  SCENE_CLASS,
  SCENE_PIN_CLASS,
  SCENE_SLOT_ATTRIBUTE,
} from "./mount";
import { createFakeScrollSource, type FakeScrollSource } from "./scroll-source";

const scenes: SceneDef[] = [
  { id: "intro", vh: 300, adapter: placeholder("Intro") },
  { id: "product", vh: 500, adapter: placeholder("Product") },
];

let source: FakeScrollSource;
let layout: FakeLayout;
let root: HTMLElement;

function hostWith(pinStrategy: PinStrategy): Host {
  return {
    mountRoot: () => root,
    scrollSource: () => source,
    pinStrategy,
    injectStyles: () => {},
  };
}

beforeEach(() => {
  source = createFakeScrollSource({
    viewportHeight: 800,
    documentHeight: 9000,
  });
  layout = installFakeLayout(source);
  root = document.createElement("div");
  document.body.append(root);
});

afterEach(() => {
  layout.restore();
  document.body.replaceChildren();
});

describe("mountScenes", () => {
  it("builds one spacer per scene, in registry order, under the host mount root", () => {
    mountScenes(hostWith("sticky"), scenes);

    const spacers = [...root.querySelectorAll<HTMLElement>(`.${SCENE_CLASS}`)];
    expect(spacers.map((spacer) => spacer.dataset.scene)).toEqual([
      "intro",
      "product",
    ]);
  });

  it("sizes each spacer from its own vh, so retiming a beat is a one-number edit", () => {
    const mounted = mountScenes(hostWith("sticky"), scenes);

    expect(mounted.map((scene) => scene.spacer.style.height)).toEqual([
      "300vh",
      "500vh",
    ]);
  });

  it("gives each spacer one pinned container, which is what the adapter is handed", () => {
    const [intro] = mountScenes(hostWith("sticky"), scenes);

    expect(intro?.pin.parentElement).toBe(intro?.spacer);
    expect(intro?.pin.className).toBe(
      `${SCENE_PIN_CLASS} ${SCENE_PIN_CLASS}--sticky`,
    );
  });

  it("pins with the strategy the host declares, not a hardcoded one", () => {
    const [intro] = mountScenes(hostWith("fixed"), scenes);

    expect(intro?.pin.className).toBe(
      `${SCENE_PIN_CLASS} ${SCENE_PIN_CLASS}--fixed`,
    );
  });

  it("caches a document-relative top, recovered from a scroll-relative rect", () => {
    layout.set("intro", { top: 800, height: 2400 });
    source.set({ scrollY: 1500 });

    const [intro] = mountScenes(hostWith("sticky"), scenes);

    expect(intro?.metrics.top).toBe(800);
  });

  it("caches pinned duration as the spacer height minus one viewport", () => {
    layout.set("intro", { top: 800, height: 2400 });

    const [intro] = mountScenes(hostWith("sticky"), scenes);

    // 300vh on an 800px viewport is 2400px tall; one viewport is pinned.
    expect(intro?.metrics.length).toBe(1600);
  });

  it("caches the pinned container size, which is not the viewport size", () => {
    layout.set("intro", {
      top: 800,
      height: 2400,
      pinWidth: 640,
      pinHeight: 360,
    });

    const [intro] = mountScenes(hostWith("sticky"), scenes);

    expect(intro?.pinSize).toEqual({ width: 640, height: 360 });
  });

  it("refreshes every cached number when re-measured after a viewport change", () => {
    layout.set("intro", { top: 800, height: 2400 });
    const [intro] = mountScenes(hostWith("sticky"), scenes);

    layout.set("intro", {
      top: 600,
      height: 3000,
      pinWidth: 375,
      pinHeight: 1000,
    });
    source.set({ viewportHeight: 1000 });
    intro?.measure(source.scrollY(), source.viewportHeight());

    expect(intro?.metrics).toEqual({ top: 600, length: 2000 });
    expect(intro?.pinSize).toEqual({ width: 375, height: 1000 });
  });

  it("puts a scene where the page slots it, between the content sections", () => {
    // The SD7 shape: real HTML sections in the document, with an empty slot
    // element marking where each scene belongs.
    root.innerHTML = `
      <section id="hero"></section>
      <div ${SCENE_SLOT_ATTRIBUTE}="intro"></div>
      <section id="copy"></section>
      <div ${SCENE_SLOT_ATTRIBUTE}="product"></div>
      <section id="closing"></section>
    `;

    mountScenes(hostWith("sticky"), scenes);

    expect(
      [...root.children].map((el) => el.getAttribute("data-scene") ?? el.id),
    ).toEqual(["hero", "intro", "copy", "product", "closing"]);
    // The slot is replaced, not filled: no leftover wrapper around the spacer.
    expect(root.querySelector(`[${SCENE_SLOT_ATTRIBUTE}]`)).toBeNull();
  });

  it("appends a scene the page declares no slot for, leaving the slotted ones in place", () => {
    root.innerHTML = `
      <section id="hero"></section>
      <div ${SCENE_SLOT_ATTRIBUTE}="product"></div>
      <section id="closing"></section>
    `;

    mountScenes(hostWith("sticky"), scenes);

    expect(
      [...root.children].map((el) => el.getAttribute("data-scene") ?? el.id),
    ).toEqual(["hero", "product", "closing", "intro"]);
  });

  it("warns about a slot no scene in the registry claims", () => {
    // The page shell and the registry disagreeing is otherwise silent: an empty
    // div stays where the scene should be, and the scene lands at the very end.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    root.innerHTML = `<div ${SCENE_SLOT_ATTRIBUTE}="outro"></div>`;

    try {
      mountScenes(hostWith("sticky"), scenes);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain('"outro"');
    } finally {
      warn.mockRestore();
    }
  });

  it("removes its spacer from the page, taking the pinned container with it", () => {
    const [intro, product] = mountScenes(hostWith("sticky"), scenes);

    intro?.remove();

    expect(root.querySelector(`.${SCENE_CLASS}`)).toBe(product?.spacer);
    expect(intro?.pin.isConnected).toBe(false);
  });
});
