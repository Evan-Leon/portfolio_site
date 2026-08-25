/*
 * The driver: scroll in, `seek` out.
 *
 * This is the only stateful part of the engine. Everything it leans on is pure
 * (`progress.ts`, `scene.ts`) or measured elsewhere (`mount.ts`), so what is
 * left here is the loop, the lifecycle transitions, and the guards.
 *
 * WHAT THE FRAME PATH IS ALLOWED TO DO
 * ------------------------------------
 * Read scroll once through `ScrollSource` (`SDS-005`), do arithmetic on numbers
 * `mount.ts` already measured (`SDS-004`), and call `seek`. It measures nothing
 * itself, and the SD5 build log records the grep that proves it: no layout
 * property — no rect read, no offset, no client height — appears anywhere in
 * this file, and none should ever be added. Measurement belongs in `mount.ts`,
 * where it runs on mount and on resize instead of sixty times a second.
 *
 * A note on `scroll-source.ts`'s claim to be the only file under `src/engine/`
 * that touches the window: this file registers a `resize` listener and drives
 * `requestAnimationFrame`, both of which live on that same global object and
 * are written unprefixed here. The claim is about *measurement* — scroll
 * position, viewport height and document height are read only through
 * `ScrollSource`, and layout only through `mount.ts`.
 *
 * REDUCED MOTION IS ONE NUMBER, NOT A SECOND CODE PATH
 * -----------------------------------------------------
 * Under `prefers-reduced-motion: reduce` the progress handed to `seek` is
 * snapped to a handful of keyframes (`quantiseProgress`) and everything else —
 * the call site, the epsilon guard, the adapter — is untouched. An adapter never
 * learns which mode it is in, which is what keeps `SDS-001` true and keeps the
 * surface to test from doubling. Lenis handles the preference itself; see the
 * `lenis` option below.
 *
 * MEMORY IS BOUNDED BY LAZY CONSTRUCTION
 * --------------------------------------
 * An adapter is constructed when its scene reaches the preload margin and
 * destroyed when it passes the unload margin, so a page with fifty scenes holds
 * at most the two or three near the viewport. SD6 adds background *asset*
 * warming, which fetches bytes ahead of time into a shared cache — it must not
 * turn into eager adapter construction, which would void this property while
 * every test still passed.
 */
import Lenis from "lenis";

import type { AnimationAdapter } from "../adapters/types";
import type { Host } from "../host/types";
import { sharedAssetLoader } from "../loader/asset-loader";
import type { LoadingRing } from "../loader/loading-ring";
import type { SceneDef } from "../scenes/types";
import { ENGINE_STYLES } from "./engine-styles";
import { mountScenes, type MountedScene } from "./mount";
import { clamp01, quantiseProgress, sceneProgress } from "./progress";
import { DEFAULT_MARGINS, sceneLifecycle, withPinVisibility } from "./scene";
import type { ScrollSource } from "./scroll-source";

/**
 * How much a scene's progress must change before `seek` is called again.
 *
 * Roughly one frame of a 10,000-frame sequence, so it can never suppress a
 * change a visitor could see, and small enough that a stationary scroll
 * position still trips it — which is the case it exists for. A page held still
 * would otherwise re-seek every adapter sixty times a second, redrawing an
 * identical frame.
 *
 * Import this constant rather than writing `1e-4` (`EVO-UNI-057`).
 */
export const SEEK_EPSILON = 1e-4;

/**
 * How long resize events are collected before anything is re-measured.
 *
 * A drag-resize fires continuously and every re-measure is a forced layout, so
 * the numbers are refreshed once the drag settles. Exported so a test can wait
 * exactly this long rather than guessing (`EVO-UNI-057`).
 */
export const RESIZE_DEBOUNCE_MS = 150;

/**
 * The preference that switches scenes from scrubbing to stepping.
 *
 * Exported so a test sets the same string the engine listens for
 * (`EVO-UNI-057`) — a typo'd query in either place matches nothing, and a
 * reduced-motion test that silently exercises the continuous path reads as
 * coverage while proving the opposite (`EVO-UNI-061`).
 */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * How many intervals a reduced-motion scene is stepped through: `0`, `0.25`,
 * `0.5`, `0.75`, `1`.
 *
 * Few enough that the result reads as a slideshow of states rather than a
 * stutter of a continuous animation, which is what the preference asks for.
 * A scene needing its own step count is not a thing any phase specifies — the
 * page-wide number is deliberate, because a visitor who asked for less motion
 * asked it of the whole page.
 */
export const REDUCED_MOTION_STEPS = 4;

/**
 * Everything the engine needs to run.
 *
 * **A named interface on purpose.** SD6 extends it with the loading-ring
 * integration point, and a named type makes that extension visible to SD7,
 * SD10 and SD11 rather than a silent signature change.
 */
export interface EngineOptions {
  /** Where the engine runs: mount root, scroll source, pin strategy, styles. */
  host: Host;

  /** The page's scenes, in the order they appear. */
  scenes: SceneDef[];

  /**
   * Called every frame with **global page progress** — 0 at the top of the
   * document, 1 at the bottom — for elements that must span scene boundaries.
   * This is not scene progress, and it is the mitigation for the one real
   * weakness of a scene registry: continuous motion across a boundary.
   */
  persistentLayer?: (progress: number) => void;

  /**
   * The loading gate to hold the page behind until the eager adapters are ready
   * (SD6). Omit it and the page renders immediately, which is what every test
   * that is not about the gate wants.
   *
   * **This field is SD6 extending SD5's interface**, not a new call shape:
   * `createEngine({ host, scenes })` still means exactly what it did.
   *
   * The engine, not the ring, decides when to reveal — the ring is told. Only
   * adapters reporting `eager` are waited on; every other scene has its
   * *assets* warmed after the reveal (see `warmDeferredAssets`), never its
   * adapter constructed.
   */
  loadingRing?: LoadingRing;

  /**
   * Run Lenis for smooth scroll normalization. Defaults to `true`.
   *
   * Reduced motion is Lenis's own business: `respectReducedMotion` defaults to
   * `true` and its `isReducedMotion` getter is evaluated on read, so a
   * preference change mid-session is honoured without re-instantiating
   * anything (verified against `lenis@1.3.26`). Honouring the preference forces
   * `lerp` to `1` and makes programmatic scrolls instant — **the instance stays
   * constructed and scroll keeps working.** That is the correct reading of WCAG
   * 2.3.3, which explicitly allows scrolling the user controls; what has to go
   * is the smoothing, not the scroll. Do not hand-roll a force-disable on top.
   */
  lenis?: boolean;
}

/** The handle `createEngine` returns. */
export interface Engine {
  /** Mount the scenes (first call only) and run the frame loop. */
  start(): void;
  /** Halt the frame loop, leaving the page and its adapters as they are. */
  stop(): void;
  /** Halt, destroy every live adapter, and take the scenes off the page. */
  destroy(): void;
}

/** One scene's live state: its elements, its adapter if any, its last seek. */
interface SceneState {
  scene: MountedScene;
  adapter: AnimationAdapter | null;
  /** `null` means "never seeked", which must always seek — not a progress of 0. */
  lastSeek: number | null;
  /** The fraction this scene's adapter last reported from `load()`. */
  loadFraction: number;
  /** Settles when the current adapter's `load()` does. `null` while unmounted. */
  loaded: Promise<void> | null;
}

/**
 * Build the engine over a host and a scene registry.
 *
 * ```ts
 * const engine = createEngine({ host: standaloneHost(root), scenes })
 * engine.start()
 * ```
 */
export function createEngine(options: EngineOptions): Engine {
  const { host, scenes, persistentLayer, loadingRing } = options;
  const useLenis = options.lenis ?? true;

  const source: ScrollSource = host.scrollSource();

  /*
   * Held as a live `MediaQueryList` and read per frame rather than stored as a
   * boolean, so a preference changed mid-session is honoured with nothing
   * re-instantiated — the same property Lenis's `isReducedMotion` getter has,
   * and for the same reason. `matches` is a cached flag on the list; reading it
   * forces no style or layout work, so it is safe in the frame path.
   */
  const reducedMotion = matchMedia(REDUCED_MOTION_QUERY);

  let states: SceneState[] | null = null;
  let smoothScroll: Lenis | null = null;
  let frameId: number | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let revealed = loadingRing === undefined;
  /** Never let the ring run backwards when the loader's denominator grows. */
  let ringFraction = 0;
  /**
   * True from `start()` until the eager adapters have finished loading.
   *
   * While it is set, a scene the ring is waiting on is not unmounted even when
   * its scroll position says it should be — see `gateScene` for why one exists
   * outside its margin at all.
   */
  let gating = false;

  function start(): void {
    if (destroyed || frameId !== null) return;

    if (states === null) {
      host.injectStyles(ENGINE_STYLES);
      states = mountScenes(host, scenes).map((scene) => ({
        scene,
        adapter: null,
        lastSeek: null,
        loadFraction: 0,
        loaded: null,
      }));
      addEventListener("resize", onResize);
      /*
       * `autoRaf: false` because this file already owns a frame loop, and two
       * of them would read scroll at different points in the same frame.
       * Lenis's own stylesheet is deliberately not imported: none of its rules
       * apply to this configuration, and a CSS import here would land in the
       * document rather than SD11's shadow root (`SDS-009`).
       */
      if (useLenis) smoothScroll = new Lenis({ autoRaf: false });

      /*
       * The gate needs adapters before it can ask which of them are `eager`,
       * and `eager` is a property of the instance, not of the factory — so one
       * update pass runs here rather than waiting for the first frame. It
       * constructs exactly the adapters the first frame would have constructed
       * (those already inside their preload margin), plus the one `gateScene`
       * explains, so nothing else is built and memory stays bounded.
       */
      if (loadingRing) {
        gating = true;
        gateScene(states);
        updateAll();
        void reveal(loadingRing);
      }
    }

    frameId = requestAnimationFrame(frame);
  }

  function stop(): void {
    if (frameId === null) return;
    cancelAnimationFrame(frameId);
    frameId = null;
  }

  function destroy(): void {
    stop();
    destroyed = true;

    if (resizeTimer !== null) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }

    if (states !== null) {
      removeEventListener("resize", onResize);
      for (const state of states) {
        state.adapter?.destroy();
        state.scene.remove();
      }
      states = null;
    }

    smoothScroll?.destroy();
    smoothScroll = null;
  }

  function frame(time: number): void {
    frameId = null;

    // Before the scroll read, not after: Lenis moves the page during this call,
    // and reading first would drive every scene from last frame's position.
    smoothScroll?.raf(time);

    updateAll();

    frameId = requestAnimationFrame(frame);
  }

  /** One pass over every scene, from a single scroll read (`SDS-005`). */
  function updateAll(): void {
    const scrollY = source.scrollY();
    const viewportHeight = source.viewportHeight();
    // Once per frame, not once per scene: every scene on the page is in the
    // same motion mode, exactly as they all share one scroll read.
    const stepped = reducedMotion.matches;

    if (persistentLayer) {
      const range = source.documentHeight() - viewportHeight;
      persistentLayer(range > 0 ? clamp01(scrollY / range) : 0);
    }

    for (const state of states ?? [])
      update(state, scrollY, viewportHeight, stepped);
  }

  function update(
    state: SceneState,
    scrollY: number,
    viewportHeight: number,
    stepped: boolean,
  ): void {
    const { top, length } = state.scene.metrics;
    const raw = sceneProgress(scrollY, top, length);

    /*
     * `withPinVisibility` every frame rather than a value cached on the scene:
     * the ratio depends on the viewport height and the scene's length, both of
     * which change on resize, and a cached margin that missed a resize would
     * unmount a scene that is still on screen — silently, and only at some
     * window sizes. It is two comparisons and a divide on numbers `mount.ts`
     * already measured, so it reads no layout and `SDS-004` is untouched.
     */
    switch (
      sceneLifecycle(
        raw,
        withPinVisibility(DEFAULT_MARGINS, viewportHeight, length),
      )
    ) {
      case "unmounted":
        unmountScene(state);
        return;

      /*
       * The two mounted states share a body deliberately: **a mounted scene
       * always shows the frame its scroll position implies.** Inside its own
       * span that means scrubbing; in the margins, `clamp01` pins it to 0
       * before the scene and 1 after it, and the epsilon guard then suppresses
       * every later frame, so a margin costs exactly one seek and never
       * scrubs.
       *
       * Seeking only while `active` — which is what this did until the frame
       * after SD7 — leaves a scene holding whichever frame it last drew. A
       * jump that skips the rest of the active band (a flung trackpad, a
       * fragment link, a restored scroll position) therefore parks a stale
       * frame on the sliver still above the fold, and a scene that mounts
       * straight into its trailing margin has no frame at all. Both are
       * silent: nothing errors, and the scene is only a little bit wrong.
       */
      case "preloading":
      case "active": {
        mountScene(state, scrollY, viewportHeight);

        /*
         * The whole of the reduced-motion path: the value changes, the code
         * around it does not. The adapter is seeked from this one call site
         * with this one argument in both modes, so there is no second
         * rendering path to keep working and `SDS-001` is untouched — a
         * quantised progress is still absolute, still idempotent, and still
         * scrubs backwards through the states it scrubbed forwards.
         *
         * The epsilon guard below is what turns the snapped values into
         * discrete *steps*: consecutive frames landing on the same keyframe
         * differ by zero, so each keyframe reaches the adapter exactly once as
         * the scroll crosses it.
         */
        const progress = stepped
          ? quantiseProgress(clamp01(raw), REDUCED_MOTION_STEPS)
          : clamp01(raw);
        if (
          state.lastSeek !== null &&
          Math.abs(progress - state.lastSeek) <= SEEK_EPSILON
        )
          return;

        state.lastSeek = progress;
        state.adapter?.seek(progress);
        return;
      }
    }
  }

  /**
   * Construct, size and load this scene's adapter, unless one already exists.
   *
   * Returns the live adapter either way, so `gateScene` can read `eager` off the
   * instance it just built without a cast — `state.adapter` is narrowed to `null`
   * at its call site and TypeScript cannot see the assignment through here.
   */
  function mountScene(
    state: SceneState,
    scrollY: number,
    viewportHeight: number,
  ): AnimationAdapter {
    if (state.adapter) return state.adapter;

    /*
     * Re-measure first. Cached metrics were taken when the engine started, and
     * everything above this scene — images settling, fonts swapping, SD7's
     * content sections — has had the whole scroll down to move it since. This
     * is a layout read, but it happens on a mount transition rather than every
     * frame, which is what `SDS-004` is about.
     */
    state.scene.measure(scrollY, viewportHeight);

    const { def, pin, pinSize } = state.scene;
    const adapter = def.adapter(pin);
    state.adapter = adapter;
    state.lastSeek = null;
    state.loadFraction = 0;

    // The pinned container's size, never the viewport's: a host may embed the
    // experience at less than full width, which is the normal Wix case.
    adapter.resize(pinSize.width, pinSize.height);

    /*
     * An adapter is contractually required to resolve rather than reject, even
     * for a missing asset (`SDS-006`) — so a rejection here is a bug in the
     * adapter, not a page failure. Report it and carry on scrubbing whatever
     * the adapter managed to build.
     */
    state.loaded = adapter
      .load((fraction: number) => {
        state.loadFraction = clamp01(fraction);
        pushRingProgress();
      })
      .catch((error: unknown) => {
        console.error(`[sds] scene "${def.id}" rejected from load()`, error);
      })
      .then(() => {
        // Settled either way — a rejection was already reported, and the gate
        // must not keep waiting on an adapter that has stopped working.
        state.loadFraction = 1;
        pushRingProgress();
      });

    return adapter;
  }

  function unmountScene(state: SceneState): void {
    if (!state.adapter) return;

    /*
     * A scene the gate is waiting on stays mounted until the gate closes.
     * Without this, the scene `gateScene` deliberately mounted outside its
     * margin is destroyed by the very next update pass — which releases the
     * assets the ring is waiting for and empties `eagerStates()`, leaving the
     * reveal to fire on its minimum-visible floor with everything outstanding.
     */
    if (gating && state.adapter.eager === true) return;

    state.adapter.destroy();
    state.adapter = null;
    state.lastSeek = null;
    state.loaded = null;
    state.loadFraction = 0;
  }

  /* ---------------------------------------------------------------- *
   * The loading gate (SD6)
   * ---------------------------------------------------------------- */

  /**
   * Construct the first scene's adapter, wherever it sits on the page, so the
   * gate can ask whether it is `eager`.
   *
   * WHY THIS IS NOT REDUNDANT WITH `updateAll()`
   * -------------------------------------------
   * `eager` lives on the adapter *instance*, so the gate can only see a scene
   * whose adapter exists — and the update pass builds only the scenes already
   * inside their preload margin. Scene 1 usually is not one of them. The page
   * shell opens with a viewport of hero copy above the first scene, which in a
   * real browser at viewport 700px puts its spacer top at 700 with a scrub
   * length of 1400: raw progress −0.5, against a preload margin of 0.25.
   *
   * The failure that produces is silent in every direction. The registry says
   * `eager: true`, the adapter honours it, `eagerStates()` is empty because
   * nothing was built, `pushRingProgress` sees no eager scenes and reports 1, and
   * the ring dismisses on its minimum-visible floor with every byte still
   * outstanding. Nothing errors and no unit test notices, because a test that
   * places its eager scene at the top of the document — as every gate test did
   * before this — is inside the margin and gets its adapter for free.
   *
   * Scene 1 specifically, because that is the design spec's rule: the ring waits
   * on "the aggregate progress of assets marked `eager` — scene 1 only by
   * default". One extra construction at start-up, and the same one the visitor
   * meets first. A later scene marked `eager` is still waited on when the update
   * pass happens to have built it, and otherwise is not; gating on a scene five
   * screens down means watching a spinner for content nobody has reached, which
   * is the thing the flag exists to prevent.
   */
  function gateScene(mounted: SceneState[]): void {
    const first = mounted[0];
    if (!first || first.adapter) return;

    const adapter = mountScene(
      first,
      source.scrollY(),
      source.viewportHeight(),
    );

    /*
     * Not eager after all — so put it straight back. The alternative is holding
     * an adapter the gate has no interest in for the length of the reveal, on a
     * page whose first scene may be a long way off.
     */
    if (adapter.eager !== true) unmountScene(first);
  }

  /** The scenes whose adapter asked to be waited for. */
  function eagerStates(): SceneState[] {
    return (states ?? []).filter((state) => state.adapter?.eager === true);
  }

  /**
   * Move the ring.
   *
   * Two views of the same work, and the smaller one wins: the mean of what the
   * eager adapters report from `load()` (the fraction `AnimationAdapter`
   * documents), and the shared loader's own settled-over-total. Warming does not
   * start until after the reveal, so during the gate the loader holds nothing but
   * eager assets and the two describe the same bytes. Taking the minimum means
   * the ring can never sit at 100% with work outstanding — the one reading that
   * would make it a liar — while the monotonic guard keeps it from stepping
   * backwards as an adapter declares more assets and grows the denominator.
   */
  function pushRingProgress(): void {
    if (!loadingRing || revealed) return;

    const eager = eagerStates();
    const reported =
      eager.length === 0
        ? 1
        : eager.reduce((total, state) => total + state.loadFraction, 0) /
          eager.length;

    ringFraction = Math.max(
      ringFraction,
      Math.min(reported, sharedAssetLoader.progress()),
    );
    loadingRing.setProgress(ringFraction);
  }

  /** Hold the page until every eager adapter has loaded, then reveal it. */
  async function reveal(ring: LoadingRing): Promise<void> {
    const unsubscribe = sharedAssetLoader.onProgress(pushRingProgress);
    try {
      pushRingProgress();
      await Promise.all(eagerStates().map((state) => state.loaded));
    } finally {
      unsubscribe();
      /*
       * The hold ends here rather than after the fade: the loading is done, so
       * the ordinary lifecycle can have the scene back and memory is bounded
       * again from this moment. If the scene is off screen the next frame
       * unmounts it and releases its bytes — and `warmDeferredAssets` below then
       * re-declares them, so they come back from the HTTP cache and stay in the
       * loader for the mount that actually scrubs them.
       */
      gating = false;
    }

    if (destroyed) return;

    // Through `ringFraction`, not past it: a scene still loading behind the
    // gate can push again during the fade, and the monotonic guard is what
    // stops the ring dropping back off 100% as it goes.
    ringFraction = 1;
    ring.setProgress(ringFraction);

    const failures = sharedAssetLoader.failures();
    if (failures.length > 0) {
      ring.fail(
        `${failures.length} asset(s) settled without their bytes: ${failures.join(", ")}`,
      );
    }

    await ring.dismiss();
    if (destroyed) return;

    revealed = true;
    warmDeferredAssets();
  }

  /**
   * Fetch the bytes for the scenes the gate did not wait on.
   *
   * **Assets, not adapters.** The manifest comes off the factory
   * (`AdapterFactory.assets`) precisely so this can happen without constructing
   * anything — construction stays at the preload margin, which is what bounds
   * memory. "Warm by constructing every adapter after reveal" looks equivalent,
   * passes the same tests, and voids that property. A factory with no manifest
   * is simply not warmed, which is correct degradation rather than an error.
   */
  function warmDeferredAssets(): void {
    for (const state of states ?? []) {
      if (state.adapter?.eager === true) continue;
      for (const spec of state.scene.def.adapter.assets ?? [])
        void sharedAssetLoader.add(spec);
    }
  }

  function onResize(): void {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(remeasure, RESIZE_DEBOUNCE_MS);
  }

  function remeasure(): void {
    resizeTimer = null;

    const scrollY = source.scrollY();
    const viewportHeight = source.viewportHeight();

    for (const state of states ?? []) {
      state.scene.measure(scrollY, viewportHeight);
      state.adapter?.resize(
        state.scene.pinSize.width,
        state.scene.pinSize.height,
      );

      // Force the next frame to seek even at identical progress: the adapter
      // has just been resized and has to redraw at the new size.
      state.lastSeek = null;
    }
  }

  return { start, stop, destroy };
}
