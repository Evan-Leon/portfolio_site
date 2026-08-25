import { afterEach, describe, expect, it } from "vitest";

import { standaloneHost } from "./standalone";

/** Every test mounts into a fresh root so nothing leaks between them (EVO-UNI-044). */
function freshRoot(): HTMLElement {
  const root = document.createElement("div");
  root.id = "app";
  document.body.append(root);
  return root;
}

afterEach(() => {
  document.body.replaceChildren();
  for (const style of document.head.querySelectorAll("style")) style.remove();
});

describe("standaloneHost", () => {
  it("mounts into the element it was given", () => {
    const root = freshRoot();

    expect(standaloneHost(root).mountRoot()).toBe(root);
  });

  it("pins with sticky, matching the approved page-shell wireframe", () => {
    expect(standaloneHost(freshRoot()).pinStrategy).toBe("sticky");
  });

  it("reads live scroll and viewport measurements from the window", () => {
    Object.defineProperty(window, "scrollY", {
      value: 250,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 900,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 4500,
      configurable: true,
    });

    const source = standaloneHost(freshRoot()).scrollSource();

    expect(source.scrollY()).toBe(250);
    expect(source.viewportHeight()).toBe(900);
    expect(source.documentHeight()).toBe(4500);
  });

  it("returns the same scroll source on every call", () => {
    const host = standaloneHost(freshRoot());

    expect(host.scrollSource()).toBe(host.scrollSource());
  });

  it("injects styles into the document head as a stylesheet", () => {
    standaloneHost(freshRoot()).injectStyles(
      ".sds-scene { position: relative; }",
    );

    const styles = [...document.head.querySelectorAll("style")];
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toBe(".sds-scene { position: relative; }");
  });

  it("injects the same CSS only once, so a restarted engine does not duplicate it", () => {
    const host = standaloneHost(freshRoot());

    host.injectStyles(".sds-scene { position: relative; }");
    host.injectStyles(".sds-scene { position: relative; }");
    host.injectStyles(".sds-scene__pin { position: sticky; }");

    const styles = [...document.head.querySelectorAll("style")];
    expect(styles.map((style) => style.textContent)).toEqual([
      ".sds-scene { position: relative; }",
      ".sds-scene__pin { position: sticky; }",
    ]);
  });
});
