/*
 * The adapter seam.
 *
 * This is the interface an animation plugs into, and the reason this project
 * can be handed to someone else. The engine knows nothing about canvases,
 * Lottie JSON, or GSAP timelines — it knows four methods and a number between
 * 0 and 1. Everything specific to a format lives behind them.
 *
 * Nothing here has an implementation. `placeholder.ts` is the smallest complete
 * example; SD8 and SD9 add the frame-sequence, Lottie and GSAP adapters. All of
 * them, and anything the collaborator writes, are held to the same bar by
 * `adapter-contract.ts` (`SDS-003`).
 */

/**
 * One file the loading ring is waiting on.
 *
 * Declared here rather than in the loader because `AdapterFactory.assets`
 * needs it and the loader does not exist until SD6. **SD6 imports this
 * declaration; it must not re-declare it** (`EVO-UNI-057`) — a second copy is
 * correct on the day it is written and diverges silently afterwards.
 */
export interface AssetSpec {
  /** Where the bytes come from. Resolved relative to the page, as in a `src`. */
  url: string;
  /** How the loader should fetch and settle it. */
  kind: "image" | "json" | "binary";
}

/**
 * An animation the engine can scrub.
 *
 * The lifecycle is fixed: construct (via an {@link AdapterFactory}), `load`,
 * then any number of `seek` and `resize` calls in any order, then `destroy`.
 * The engine constructs an adapter when its scene reaches the preload margin
 * and destroys it past the unload margin, so all four of these run many times
 * over a page's life — see `src/engine/scene.ts`.
 */
export interface AnimationAdapter {
  /**
   * Fetch and prepare everything the animation needs.
   *
   * Call `onProgress` with a 0..1 fraction as bytes arrive; the loading ring
   * aggregates those numbers across every eager adapter. Reporting nothing is
   * legal for an adapter with no assets — resolve, and the ring stops waiting.
   *
   * **Resolve rather than reject on a failed asset.** The page must always
   * reveal, so a missing file settles as unsuccessful and the adapter renders
   * whatever it can (`SDS-006`). A rejection propagates into the reveal path
   * and is reported as a contract violation.
   */
  load(onProgress: (fraction: number) => void): Promise<void>;

  /**
   * Render the frame for `progress`, where 0 is the scene's first frame and 1
   * its last.
   *
   * **Absolute, never relative (`SDS-001`).** The same progress must always
   * produce the same frame, no matter what was seeked before it. The engine
   * calls this from a rAF loop with whatever the scroll position produces —
   * which is not a monotonic series. Scrolling up hands it a decreasing
   * sequence, a trackpad flick hands it the same value twice, and a scene
   * re-entering the viewport hands it a jump. An adapter that advances by a
   * delta looks right on the way down and drifts irreversibly on the way back
   * up, with no error anywhere.
   *
   * Values outside 0..1 must be tolerated, not trusted — clamp them. The
   * engine clamps too, but an adapter is also driven directly from tests and
   * from the collaborator's own code.
   *
   * **Never read layout here (`SDS-004`)** — no `getBoundingClientRect`, no
   * `offsetHeight`. Measure in `resize` and cache the numbers; this method runs
   * once per frame and a layout read there forces a synchronous reflow.
   */
  seek(progress: number): void;

  /**
   * The container's size changed. Re-measure and cache whatever `seek` needs.
   *
   * Must tolerate being called at any point in the lifecycle, including before
   * `load` resolves and after `destroy` — the engine's resize observer does not
   * know where the adapter is in its own sequence.
   */
  resize(width: number, height: number): void;

  /**
   * Release everything: rAF handles, timers, event listeners, decoded images.
   *
   * After this returns, nothing the adapter registered may still be able to
   * fire. The engine destroys and reconstructs adapters as scenes scroll in and
   * out of range, so a leak here is a leak per pass, not once.
   */
  destroy(): void;

  /**
   * Should the loading ring wait for this adapter before revealing the page?
   *
   * Defaults to false. Only the first scene is normally eager — gating on every
   * scene's assets means watching a spinner while the whole page downloads.
   */
  readonly eager?: boolean;
}

/**
 * Builds an adapter over a scene's pinned container.
 *
 * A **single-call** factory: `placeholder('Intro')` returns this, and the
 * engine calls it once with the container. A scene registry entry reads
 * `adapter: placeholder('Intro')` — never `adapter: () => placeholder('Intro')`.
 *
 * The optional `assets` manifest exists so the loader can warm a scene's bytes
 * **without constructing its adapter**. Asset URLs are otherwise known only
 * inside `load()`, which cannot run until the adapter exists — which is exactly
 * what warming has to avoid, because lazy construction is what bounds memory.
 * Vendored adapter factories attach it when they declare assets. A hand-written
 * adapter may leave it off: that scene simply is not warmed, which is correct
 * degradation rather than an error. Do not mirror these URLs onto `SceneDef` —
 * the helper already knows them and a second copy would drift.
 */
export interface AdapterFactory {
  (container: HTMLElement): AnimationAdapter;
  assets?: readonly AssetSpec[];
}
