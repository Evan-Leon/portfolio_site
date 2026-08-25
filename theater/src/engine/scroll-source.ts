/*
 * The scroll seam.
 *
 * `SDS-005`: scroll position is read once per frame, through a `ScrollSource`,
 * and nowhere else. This file is the ONLY place in the codebase permitted to
 * touch `window.scrollY`, `window.innerHeight`, or
 * `document.documentElement.scrollHeight` — a grep for `window.` under
 * `src/engine/` should hit this file and nothing else.
 *
 * That restriction is what makes the rest of the engine testable: every other
 * module takes numbers, so the whole progress and lifecycle layer can be proven
 * correct in milliseconds against `createFakeScrollSource`, with no browser and
 * no layout.
 */

/**
 * The three measurements the engine needs from its environment, each read
 * fresh. Implementations must not cache — the rAF loop calls these once per
 * frame and expects the current position.
 */
export interface ScrollSource {
  /** Distance in CSS pixels from the top of the document to the top of the viewport. */
  scrollY(): number;

  /** Height of the viewport in CSS pixels. */
  viewportHeight(): number;

  /**
   * Height of the **whole document** in CSS pixels — `scrollHeight`, not the
   * scrollable range.
   *
   * This convention is load-bearing and SD5 and SD7 both depend on it. Global
   * page progress is therefore:
   *
   * ```ts
   * const range = source.documentHeight() - source.viewportHeight()
   * const globalProgress = range > 0 ? source.scrollY() / range : 0
   * ```
   *
   * The zero guard is not optional: a document that fits in one viewport has no
   * range, and dividing by it yields `Infinity` or `NaN`.
   *
   * Returning the range from here instead would halve nothing and break nothing
   * visibly — it would simply make every global progress value wrong, with no
   * error and no failing test, which is why the convention is stated at the
   * interface rather than left to each caller.
   */
  documentHeight(): number;
}

/**
 * The real source, reading the live browser.
 *
 * Constructing it reads nothing; each call reads the property at that moment.
 */
export function createWindowScrollSource(): ScrollSource {
  return {
    scrollY: () => window.scrollY,
    viewportHeight: () => window.innerHeight,
    documentHeight: () => document.documentElement.scrollHeight,
  };
}

/** What a fake source can be initialised or updated with. */
export interface FakeScrollSourceInit {
  scrollY?: number;
  viewportHeight?: number;
  documentHeight?: number;
}

/** A `ScrollSource` a test can move. */
export type FakeScrollSource = ScrollSource & {
  /** Update the named measurements; anything omitted keeps its current value. */
  set(next: FakeScrollSourceInit): void;
};

/**
 * Defaults: the top of a ten-viewport document on a 800px viewport, so a source
 * built with no arguments has a scrollable range (7200px) rather than the
 * degenerate zero-range document that every division here has to guard against.
 * A test that cares about these numbers should pass them explicitly.
 */
const FAKE_DEFAULTS = {
  scrollY: 0,
  viewportHeight: 800,
  documentHeight: 8000,
} as const;

/**
 * The testing source: a plain object whose three values a test sets directly.
 *
 * ```ts
 * const source = createFakeScrollSource({ viewportHeight: 1000, documentHeight: 9000 })
 * source.set({ scrollY: 2000 })
 * ```
 */
export function createFakeScrollSource(
  init: FakeScrollSourceInit = {},
): FakeScrollSource {
  const state = { ...FAKE_DEFAULTS, ...stripUndefined(init) };

  return {
    scrollY: () => state.scrollY,
    viewportHeight: () => state.viewportHeight,
    documentHeight: () => state.documentHeight,
    set(next: FakeScrollSourceInit): void {
      Object.assign(state, stripUndefined(next));
    },
  };
}

/**
 * Drop keys whose value is `undefined`.
 *
 * A spread merges an explicit `{ scrollY: undefined }` over the default and
 * leaves `undefined` behind, which then propagates into progress arithmetic as
 * `NaN`. Callers write that shape without thinking about it — passing an
 * optional variable straight through — so the guard belongs here rather than in
 * every call site.
 */
function stripUndefined(init: FakeScrollSourceInit): FakeScrollSourceInit {
  const defined: FakeScrollSourceInit = {};
  if (init.scrollY !== undefined) defined.scrollY = init.scrollY;
  if (init.viewportHeight !== undefined)
    defined.viewportHeight = init.viewportHeight;
  if (init.documentHeight !== undefined)
    defined.documentHeight = init.documentHeight;
  return defined;
}
