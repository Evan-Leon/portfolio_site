/*
 * The GSAP adapter — a caller-built timeline scrubbed by absolute progress.
 *
 * This is the open-ended one. The frame sequence and the Lottie adapter each
 * play back a file; this plays back whatever the collaborator writes. The
 * adapter supplies a container, a GSAP instance and the four lifecycle methods,
 * and gets out of the way — `build` returns a timeline and nothing here
 * constrains what is on it.
 *
 * `timeline.progress(value, true)` — AND THE SECOND ARGUMENT IS NOT OPTIONAL
 * -------------------------------------------------------------------------
 * `progress(value)` fires the timeline's callbacks as it moves. Scrubbing to the
 * end therefore fires `onUpdate` and `onComplete`, and a visitor oscillating
 * around the end of a scene — which is what the bottom of a scroll does — fires
 * `onComplete` again on every pass. The second argument is `suppressEvents`;
 * passing `true` makes the seek a pure render, which is the only thing a
 * scroll-driven timeline should ever do.
 *
 * WHY THE TIMELINE IS PAUSED, AND WHY THE ADAPTER PAUSES IT AGAIN
 * --------------------------------------------------------------
 * An unpaused timeline is advanced by GSAP's own ticker, so it has a clock of
 * its own competing with the scroll position. The result is not a crash: the
 * animation drifts away from the scroll and snaps back on every seek. `build`
 * is documented to create the timeline with `{ paused: true }`, and this file
 * calls `pause()` on whatever it gets back anyway — a defensive line, because
 * the failure is subtle enough that catching it in review is unreliable.
 *
 * WHY `ctx` CARRIES GSAP
 * ----------------------
 * `gsap` is imported dynamically inside `load()`, so a page with no GSAP scene
 * never downloads it. That only holds if nothing else imports it statically —
 * and the scene registry, which calls `gsapTimeline(build)`, is reached from the
 * application entry. A `build` function that reached for its own top-level
 * `import { gsap } from 'gsap'` would pull the library into the entry chunk and
 * quietly undo the split for every visitor, with no error and no failing test.
 * So the instance is handed in. `ctx` is a superset of the `{ container }` the
 * roadmap specifies: a `build` written against the narrower type is still
 * assignable, so nothing that ignores `ctx.gsap` needs changing.
 *
 * WHY `destroy()` MAY PUT GSAP'S TICKER TO SLEEP
 * ----------------------------------------------
 * Importing `gsap` wakes its ticker (`_windowExists() && _wake()` at the bottom
 * of `gsap-core.js`), which starts a `requestAnimationFrame` loop that
 * re-requests itself forever. GSAP sleeps it on its own only at the next garbage
 * collection frame, `autoSleep` — 120 frames — later. The engine destroys and
 * rebuilds an adapter every time a scene crosses its unload margin, so a live
 * rAF loop left behind by a scene nobody is looking at is a real leak, and the
 * conformance kit reports it as one. This adapter refcounts its own timelines
 * and sleeps the ticker when the last of them goes; the next timeline built
 * wakes it again, which GSAP does for itself. Nothing here sleeps a ticker while
 * another GSAP scene is still mounted.
 *
 * NO ASSETS MANIFEST
 * ------------------
 * `gsapTimeline()` deliberately attaches none. A timeline animates elements that
 * already exist, so there is nothing for the loader to warm — and
 * `AdapterFactory.assets` is optional precisely so an adapter with nothing to
 * declare says nothing rather than declaring an empty list.
 */
import { clamp01 } from "../engine/progress";
import type { AdapterFactory, AnimationAdapter } from "./types";

/** Class on the element this adapter hands to `build` as its container. */
export const GSAP_CONTAINER_CLASS = "sds-gsap";

/*
 * GSAP's types, reached through a type-only `import()` query.
 *
 * This is erased at compile time — it is not a static import and does not affect
 * what the bundler puts in the entry chunk. Spelling the timeline type as the
 * return of `gsap.timeline` rather than as the global `gsap.core.Timeline`
 * avoids depending on GSAP's global namespace declaration being in the program,
 * which it is only when something imports the package.
 */
type GsapStatic = typeof import("gsap").gsap;

/** GSAP's timeline, the type `build` returns. */
export type GsapTimeline = ReturnType<GsapStatic["timeline"]>;

/** What `build` is handed. */
export interface GsapTimelineContext {
  /**
   * The element to animate inside. Create whatever the timeline needs here —
   * an adapter never touches the DOM outside the container it was given
   * (`SDS-002`), and scoping GSAP selectors to this element is what keeps two
   * copies of the same scene from animating each other's nodes.
   */
  container: HTMLElement;
  /**
   * The GSAP instance, already loaded. Use this rather than importing `gsap` in
   * the file that writes the `build` function — see the header for what a
   * static import costs.
   */
  gsap: GsapStatic;
}

/** Builds the timeline this adapter scrubs. */
export type GsapTimelineBuilder = (ctx: GsapTimelineContext) => GsapTimeline;

/** What the adapter is currently showing. */
export interface GsapTimelineSnapshot {
  /** The clamped progress the last `seek` was given. */
  progress: number;
  /** The timeline's own progress, or `null` before it is built. */
  timelineProgress: number | null;
  /** Is the timeline built? Until it is, `seek` records progress and replays it. */
  ready: boolean;
  /** Did `build` throw? A failed scene renders nothing and still resolves. */
  failed: boolean;
  /** The size the last `resize` reported, in CSS pixels. */
  width: number;
  height: number;
}

/**
 * The GSAP adapter's public shape.
 *
 * `snapshot()` is not part of {@link AnimationAdapter} — it is this adapter's
 * answer to the conformance kit's `observe` seam (`SDS-003`). It reads the
 * timeline's own progress back, so the kit's idempotence and order-independence
 * checks see what GSAP actually rendered rather than what it was asked for.
 */
export interface GsapTimelineAdapter extends AnimationAdapter {
  snapshot(): GsapTimelineSnapshot;
}

/**
 * Build a factory for a GSAP timeline.
 *
 * ```ts
 * {
 *   id: 'reveal',
 *   vh: 300,
 *   adapter: gsapTimeline(({ container, gsap }) => {
 *     const card = document.createElement('div')
 *     container.append(card)
 *
 *     const timeline = gsap.timeline({ paused: true })
 *     timeline.to(card, { rotate: 180, duration: 1 })
 *     return timeline
 *   }),
 * }
 * ```
 *
 * The timeline's **absolute durations do not matter** — the adapter drives it by
 * progress, so a two-second timeline and a ten-second one scrub identically.
 * What matters is the proportion each tween occupies, which is how a timeline is
 * choreographed anyway.
 *
 * Note the single call — `gsapTimeline(…)`, never `() => gsapTimeline(…)`. The
 * extra wrapper produces a factory that ignores its container.
 */
export function gsapTimeline(build: GsapTimelineBuilder): AdapterFactory {
  // No `assets` manifest: there is nothing to warm. See the header.
  return (container: HTMLElement): AnimationAdapter =>
    new GsapTimelineScene(container, build);
}

/**
 * How many timelines this module has live.
 *
 * Module-level, so it counts across every scene rather than per adapter — the
 * ticker is a single global and sleeping it while another scene is mounted would
 * stop that scene's own animations.
 */
let liveTimelines = 0;

class GsapTimelineScene implements GsapTimelineAdapter {
  readonly #root: HTMLElement;
  readonly #build: GsapTimelineBuilder;

  #gsap: GsapStatic | null = null;
  #timeline: GsapTimeline | null = null;
  #failed = false;

  /** The last progress `seek` was given — replayed once the timeline exists. */
  #progress = 0;

  /* Cached in `resize`, never measured in `seek` (`SDS-004`). */
  #width = 0;
  #height = 0;

  /** Set by `destroy`, so a late `seek` or `resize` is a no-op, not a throw. */
  #destroyed = false;

  constructor(container: HTMLElement, build: GsapTimelineBuilder) {
    this.#build = build;

    this.#root = document.createElement("div");
    this.#root.className = GSAP_CONTAINER_CLASS;
    // The animation carries no information a screen reader can use; the page's
    // meaning is in the HTML sections around it (see index.html).
    this.#root.setAttribute("aria-hidden", "true");
    this.#root.style.cssText = [
      "display:block",
      "width:100%",
      "height:100%",
    ].join(";");

    container.append(this.#root);
  }

  /**
   * Import GSAP and build the timeline.
   *
   * Nothing is declared to the asset loader — there is nothing to fetch beyond
   * the library itself, and the library is not a page asset. Progress is
   * reported as the two states this actually has.
   */
  async load(onProgress: (fraction: number) => void): Promise<void> {
    onProgress(0);

    let gsap: GsapStatic;
    try {
      gsap = (await import("gsap")).gsap;
    } catch (error) {
      console.warn("[sds] gsap failed to load:", error);
      this.#failed = true;
      onProgress(1);
      return;
    }

    if (this.#destroyed) {
      onProgress(1);
      return;
    }

    this.#gsap = gsap;

    try {
      this.#timeline = this.#build({ container: this.#root, gsap });
      liveTimelines += 1;
    } catch (error) {
      // Resolve rather than reject: a broken scene must not stop the page
      // revealing (`SDS-006`). The console names the scene that failed.
      console.warn("[sds] the gsap timeline builder threw:", error);
      this.#failed = true;
      onProgress(1);
      return;
    }

    /* Defensive, and cheap. A timeline built without `{ paused: true }` is
     * advanced by GSAP's ticker, which is a second clock fighting the scroll
     * position — see the header. */
    this.#timeline.pause();

    // The engine's epsilon guard will not re-seek an unchanged progress, so a
    // scene held still while GSAP loads would otherwise stay at whatever the
    // builder left on screen until the visitor scrolled.
    this.#render();

    onProgress(1);
  }

  seek(progress: number): void {
    if (this.#destroyed) return;

    this.#progress = clamp01(progress);
    this.#render();
  }

  resize(width: number, height: number): void {
    if (this.#destroyed) return;

    /* Cached, and nothing more. The timeline is built once and its tweens hold
     * whatever values GSAP resolved at build time, so a timeline that has to
     * survive a resize should animate in relative units (`%`, `vw`) or be
     * written against `gsap.matchMedia`. Rebuilding it here would discard the
     * scene's state mid-scroll. */
    this.#width = width;
    this.#height = height;
  }

  destroy(): void {
    this.#destroyed = true;

    if (this.#timeline) {
      this.#timeline.kill();
      this.#timeline = null;
      liveTimelines = Math.max(0, liveTimelines - 1);
    }

    // The ticker is global, so it is only safe to stop once no scene this module
    // built is still on the page. GSAP wakes it again on the next timeline.
    if (liveTimelines === 0) this.#gsap?.ticker.sleep();
    this.#gsap = null;

    this.#root.remove();
  }

  snapshot(): GsapTimelineSnapshot {
    return {
      progress: this.#progress,
      timelineProgress: this.#timeline ? this.#timeline.progress() : null,
      ready: this.#timeline !== null,
      failed: this.#failed,
      width: this.#width,
      height: this.#height,
    };
  }

  /** Push the held progress at the timeline, if there is one to push it at. */
  #render(): void {
    // `true` is `suppressEvents`, and it is required — see the header.
    this.#timeline?.progress(this.#progress, true);
  }
}
