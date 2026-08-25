/*
 * The host seam.
 *
 * `AnimationAdapter` is where an animation plugs in; `Host` is where the whole
 * experience runs. Everything the engine needs from its environment — somewhere
 * to put elements, a way to read scroll, how pinning works, and how to get CSS
 * onto the page — arrives through this one interface, so the same engine drives
 * a static page (`standaloneHost`) and a Wix custom element inside a shadow root
 * (SD11) with no branch anywhere in `engine.ts`.
 */
import type { ScrollSource } from "../engine/scroll-source";

/**
 * How a scene's container stays put while its spacer scrolls past.
 *
 * - `'sticky'` — `position: sticky; top: 0`. Releases at the end of its
 *   containing block on its own, which is exactly the behaviour a scene wants
 *   and is what the approved `docs/wireframes/page-shell.html` uses. Broken by
 *   any ancestor with `overflow: hidden | auto | scroll`.
 * - `'fixed'` — `position: fixed`. Immune to the `overflow` ancestors that
 *   break sticky, but broken instead by any ancestor establishing a containing
 *   block (`transform`, `filter`, `contain`). It also never releases on its
 *   own; see the note in `engine-styles.ts`.
 *
 * Both failure modes are plausible in a page builder's generated DOM, which is
 * why SD0's probe measures which one works on the real page and SD11's host
 * selects accordingly. The standalone host is always `'sticky'`.
 */
export type PinStrategy = "fixed" | "sticky";

/** Where the engine runs. */
export interface Host {
  /**
   * The element (or shadow root) scene containers are appended to.
   *
   * The engine calls this once per `start()` and appends in registry order.
   */
  mountRoot(): HTMLElement | ShadowRoot;

  /**
   * How scroll position is read (`SDS-005`).
   *
   * Called once when the engine starts; implementations should return the same
   * source every time rather than building a new one per call.
   */
  scrollSource(): ScrollSource;

  /** Which pinning mechanism this host's DOM can actually support. */
  pinStrategy: PinStrategy;

  /**
   * Get a stylesheet onto the page.
   *
   * This exists because the engine's pin/spacer geometry cannot live in an
   * imported stylesheet: the Wix host mounts into a shadow root, which a
   * page-level stylesheet does not reach (`SDS-009`). The engine hands its
   * structural CSS to the host and the host decides where it lands — the
   * document head for a static page, `shadowRoot` for a custom element.
   *
   * Must be idempotent for identical CSS: `start()` after `stop()` injects the
   * same string again and must not accumulate stylesheets.
   */
  injectStyles(css: string): void;
}
