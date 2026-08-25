/*
 * Vitest setup for the three jsdom gaps the vendored engine still depends on:
 * 1. window.matchMedia
 * 2. ResizeObserver
 * 3. HTMLMediaElement play/pause
 *
 * The frame-sequence adapter was not vendored, so no remaining source calls the
 * canvas API and no canvas mock is installed.
 */
import { beforeEach } from "vitest";

/* ------------------------------------------------------------------ *
 * matchMedia — a controllable fake
 * ------------------------------------------------------------------ */

/** What each query currently matches. Anything unset matches `false`. */
const matchesByQuery = new Map<string, boolean>();

/** Live lists handed out by `matchMedia`, so a change can notify them. */
const listsByQuery = new Map<string, Set<FakeMediaQueryList>>();

class FakeMediaQueryList extends EventTarget implements MediaQueryList {
  onchange:
    ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null = null;

  private readonly legacyListeners = new Set<
    (ev: MediaQueryListEvent) => unknown
  >();

  constructor(readonly media: string) {
    super();
  }

  get matches(): boolean {
    return matchesByQuery.get(this.media) ?? false;
  }

  /* The deprecated Safari-era API. Some libraries still call it, and a missing
   * method is a TypeError rather than a graceful degradation, so it is here. */
  addListener(
    callback:
      ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null,
  ): void {
    if (callback) this.legacyListeners.add(callback);
  }

  removeListener(
    callback:
      ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null,
  ): void {
    if (callback) this.legacyListeners.delete(callback);
  }

  /** Called by `setMediaQuery`; not part of the DOM API. */
  notify(): void {
    const event = new Event("change") as Event & {
      matches: boolean;
      media: string;
    };
    event.matches = this.matches;
    event.media = this.media;
    const mediaEvent = event as unknown as MediaQueryListEvent;

    this.onchange?.call(this, mediaEvent);
    for (const listener of this.legacyListeners)
      listener.call(this, mediaEvent);
    this.dispatchEvent(event);
  }
}

/**
 * Set what a media query matches, and notify anything already listening.
 *
 * ```ts
 * setMediaQuery('(prefers-reduced-motion: reduce)', true)
 * ```
 *
 * Reset automatically before every test, so one test's setting cannot leak into
 * the next (EVO-UNI-044).
 */
export function setMediaQuery(query: string, matches: boolean): void {
  matchesByQuery.set(query, matches);
  for (const list of listsByQuery.get(query) ?? []) list.notify();
}

/** Return every query to its default of not matching. */
export function resetMediaQueries(): void {
  const changed = [...matchesByQuery.keys()];
  matchesByQuery.clear();
  for (const query of changed) {
    for (const list of listsByQuery.get(query) ?? []) list.notify();
  }
}

function matchMediaFake(query: string): MediaQueryList {
  const list = new FakeMediaQueryList(query);
  const existing = listsByQuery.get(query);
  if (existing) existing.add(list);
  else listsByQuery.set(query, new Set([list]));
  return list;
}

window.matchMedia = matchMediaFake;

/* ------------------------------------------------------------------ *
 * ResizeObserver — constructible no-op
 * ------------------------------------------------------------------ */

/*
 * Deliberately does not fire. jsdom has no layout engine, so there is no real
 * size change for it to report; a fake that invented one would be asserting
 * against numbers jsdom made up. Its only job is to let Lenis (and anything
 * else reaching for it) construct.
 */
class FakeResizeObserver implements ResizeObserver {
  constructor(readonly callback: ResizeObserverCallback) {}
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = FakeResizeObserver;

/* ------------------------------------------------------------------ *
 * HTMLMediaElement — jsdom's methods only report "not implemented"
 * ------------------------------------------------------------------ */

/* Clips are driven by the lot adapter. A resolved play promise models the
 * browser path without sending every activation through jsdom's missing media
 * implementation (EVO-FE-064). Tests may spy on these shared mock methods. */
HTMLMediaElement.prototype.play = () => Promise.resolve();
HTMLMediaElement.prototype.pause = () => {};

/* ------------------------------------------------------------------ *
 * Per-test reset
 * ------------------------------------------------------------------ */

beforeEach(() => {
  resetMediaQueries();
});
