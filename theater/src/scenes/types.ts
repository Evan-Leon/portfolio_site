/*
 * What a scene is, from the page's point of view.
 *
 * A page is an ordered list of these with ordinary HTML permitted between them.
 * `src/engine/scene.ts` owns the lifecycle a scene moves through; this file
 * owns the declaration a person writes by hand.
 *
 * It lives here rather than in `src/engine/` because it references
 * `AdapterFactory`, which is `HTMLElement`-typed — and the engine core is
 * deliberately DOM-free so its arithmetic can be tested without a browser.
 */
import type { AdapterFactory } from "../adapters/types";

/**
 * One scene in the page's registry.
 *
 * ```ts
 * export const scenes: SceneDef[] = [
 *   { id: 'intro', vh: 300, adapter: placeholder('Intro') },
 * ]
 * ```
 */
export interface SceneDef {
  /** Stable identifier. Used for the spacer's DOM id and in diagnostics. */
  id: string;

  /**
   * The scene's scroll length in CSS `vh` units, where `100` is exactly one
   * viewport height — so `vh: 300` scrolls for three screens, not three
   * hundred. It maps straight to the spacer's `height: {vh}vh`, which makes
   * retiming a beat a one-number edit.
   *
   * Note this is not the same number as the scene's *pinned duration*: an
   * element `vh: 300` tall has 200vh of scrolling once one viewport height is
   * subtracted for the pin. `sceneProgress` does that subtraction.
   */
  vh: number;

  /**
   * Builds the animation over this scene's pinned container.
   *
   * A **single-call factory**, not a thunk: write `adapter: placeholder('Intro')`,
   * never `adapter: () => placeholder('Intro')`. The engine calls it with the
   * container as its one argument, so the extra wrapper produces a factory that
   * ignores the container and a scene that renders nothing.
   */
  adapter: AdapterFactory;
}
