/*
 * The lot as a scene: the GSAP adapter, wrapped in the eight posters it waits
 * for.
 *
 * `buildLot` owns the DOM and the choreography; this file owns everything that
 * is a *scene* — declaring assets, gating the reveal on them, degrading when
 * one is missing, and exposing the snapshot the conformance kit reads. The
 * inner adapter is `gsapTimeline(buildLot(projects))` and every lifecycle call
 * forwards to it, so there is exactly one timeline and one place that scrubs it
 * (`SDS-001`).
 *
 * WHY THE POSTERS GO THROUGH THE LOADER AND NOT INTO `src`
 * --------------------------------------------------------
 * `sharedAssetLoader.add()` is what makes the loading ring's number true
 * (`SDS-006`). Eight `<img src>` assignments in `buildLot` would fetch the same
 * bytes invisibly: the ring would reach 100% and dismiss over a lot of black
 * rectangles, and only on a slow connection. So the loader builds and decodes
 * the elements, and this file puts the ones that arrived into their surfaces.
 *
 * WHY A POSTER THAT LOADED CAN STILL BE WRONG
 * -------------------------------------------
 * Until 2026-08-25 `images/el-blackjack/01.png` was a 68-byte 1×1 placeholder.
 * It fetched, it decoded, and the loader counted it — correctly, by its own
 * rules — as loaded. On screen it was a blank screen behind a full ring. So a
 * poster is checked for *size* here as well as arrival: anything that decodes
 * smaller than {@link MIN_POSTER_PX} square is treated exactly like one that
 * never arrived, and the screen shows a dark surface with its marquee lit as
 * normal rather than a hole in the lot (`EVO-UNI-053`).
 *
 * WHY THERE IS NO `assets` MANIFEST ON THE FACTORY
 * ------------------------------------------------
 * `AdapterFactory.assets` exists so the engine can warm a scene's bytes without
 * constructing its adapter — and `warmDeferredAssets` skips every scene whose
 * adapter is `eager`. This one is eager and it is the page's only scene, so a
 * manifest here would never be read by anything. The posters gate the reveal
 * through `load()`, which is the path that actually runs.
 */
import type { AdapterFactory, AnimationAdapter } from "../adapters/types";
import { gsapTimeline } from "../adapters/gsap-timeline";
import type { GsapTimelineAdapter } from "../adapters/gsap-timeline";
import { REDUCED_MOTION_QUERY } from "../engine/engine";
import { clamp01 } from "../engine/progress";
import { sharedAssetLoader } from "../loader/asset-loader";
import type { TheaterProject } from "../projects";
import {
  buildLot,
  CLIP_STATE_ATTRIBUTE,
  LOT_WORLD_CLASS,
  POSTER_STATE_ATTRIBUTE,
  SCREEN_CLASS,
  SCREEN_INDEX_ATTRIBUTE,
  SCREEN_LIT_PROPERTY,
  SCREEN_POSTER_CLASS,
  SCREEN_SURFACE_CLASS,
  SCREEN_VIDEO_CLASS,
} from "./build-lot";
import { activeScreen, lotZ } from "./geometry";

/**
 * The smallest a decoded poster may be before it is treated as missing.
 *
 * 64 square is far below any real screenshot and far above the 1×1 placeholder
 * this exists to catch, so it needs no tuning to stay useful.
 */
export const MIN_POSTER_PX = 64;

/** What the lot is currently showing. */
export interface LotSnapshot {
  /** The clamped progress of the last `seek`. */
  progress: number;
  /** How far into the lot the camera has driven, in world pixels. */
  lotZ: number;
  /** The screen being approached, or `null` past the last one. */
  activeScreen: number | null;
  /** The inner timeline's own progress, or `null` before it is built. */
  timelineProgress: number | null;
  /** How many posters arrived and were big enough to use. */
  loadedPosters: number;
  /** The screen whose clip was last told to play, or `null`. */
  playing: number | null;
  /**
   * The world element's **inline** transform, exactly as GSAP wrote it.
   *
   * Read back from the DOM rather than recomputed, so the conformance kit sees
   * what was rendered rather than what was intended: a drive tween aimed at the
   * wrong element still produces perfect `lotZ` numbers, and only this catches
   * it. Not a layout read (`SDS-004`) — it is the inline style the timeline
   * itself set.
   */
  worldTransform: string;
  /**
   * Each screen's inline `--sds-screen-lit`, in drive order, to 2 decimals.
   *
   * Same reasoning: a misspelled custom property tweens something nothing
   * styles, and every pure number in this snapshot stays right while the lot
   * stays dark.
   */
  lit: number[];
}

/** The lot's public shape — {@link AnimationAdapter} plus the kit's observer. */
export interface LotAdapter extends AnimationAdapter {
  snapshot(): LotSnapshot;
}

/**
 * Called when the approached screen changes, with the screen that was active
 * and the one that now is (either may be `null` past the last screen).
 *
 * **This is DT4's seam.** The clip that plays on the active screen is a side
 * effect with a lifetime — start on entry, stop and rewind on exit — and it has
 * to hang off the one place that knows a band boundary was crossed. It is a
 * notification, never a source of visual state: everything the lot *looks* like
 * is still a pure function of progress, so a `seek` that skips several bands at
 * once (a jump, a reload part-way down) renders correctly whatever this does.
 */
export type ActiveScreenListener = (
  previous: number | null,
  next: number | null,
) => void;

/** Options for {@link lotScene}. */
export interface LotSceneOptions {
  /** See {@link ActiveScreenListener}. */
  onActiveScreenChange?: ActiveScreenListener;
}

/**
 * Build the lot scene's factory.
 *
 * ```ts
 * { id: 'lot', vh: 100 + VH_PER_SCREEN * projects.length, adapter: lotScene(projects) }
 * ```
 *
 * A single call, as every factory is — `adapter: lotScene(projects)`, never
 * `adapter: () => lotScene(projects)`.
 */
export function lotScene(
  projects: readonly TheaterProject[],
  options: LotSceneOptions = {},
): AdapterFactory {
  // No `assets` manifest, deliberately. See the header.
  return (container: HTMLElement): AnimationAdapter =>
    new LotScene(container, projects, options);
}

class LotScene implements LotAdapter {
  readonly eager = true;

  readonly #container: HTMLElement;
  readonly #projects: readonly TheaterProject[];
  readonly #options: LotSceneOptions;
  readonly #inner: GsapTimelineAdapter;

  #progress = 0;
  #active: number | null = null;
  #playing: number | null = null;
  #loadedPosters = 0;
  #clipsWired = false;
  #destroyed = false;

  constructor(
    container: HTMLElement,
    projects: readonly TheaterProject[],
    options: LotSceneOptions,
  ) {
    this.#container = container;
    this.#projects = projects;
    this.#options = options;
    this.#inner = gsapTimeline(buildLot(projects))(
      container,
    ) as GsapTimelineAdapter;
  }

  /**
   * Declare the posters, build the timeline, then hang the posters that arrived.
   *
   * Progress is the two halves combined — eight posters and the inner adapter's
   * own load — over their count, so the ring moves as the images land rather
   * than jumping from 0 to 1 when the last one does.
   *
   * Resolves however badly it goes. A poster that 404s settles as unsuccessful
   * inside the loader and arrives here as an element with no pixels; nothing on
   * this path rejects, because a rejection is the page never revealing
   * (`SDS-006`).
   */
  async load(onProgress: (fraction: number) => void): Promise<void> {
    onProgress(0);

    const units = this.#projects.length + 1;
    let settled = 0;
    let innerFraction = 0;
    const report = (): void => {
      if (this.#destroyed) return;
      onProgress(Math.min(1, (settled + innerFraction) / units));
    };

    /* Queued before the inner load, so the posters are already in flight while
     * GSAP's chunk downloads. */
    const posters = this.#projects.map(async (project, i) => {
      const image = await sharedAssetLoader.add({
        url: project.poster,
        kind: "image",
      });
      settled += 1;
      report();
      return { i, image, project };
    });

    await this.#inner.load((fraction) => {
      innerFraction = fraction;
      report();
    });
    if (!this.#destroyed && !this.#clipsWired) {
      this.#wireClipFallbacks();
      this.#clipsWired = true;

      /*
       * APPLY THE BAND THIS ADAPTER IS ALREADY ON, NOW THAT THERE IS SOMETHING
       * TO APPLY IT TO.
       *
       * The engine constructs an adapter and seeks it in the same update pass,
       * while this method is still awaiting the inner adapter's dynamic
       * `import('gsap')` — so the first seek arrives before `buildLot` has made
       * a single screen. It is not lost: `#active` records the band. But the
       * *effect* of that activation is a `play()` on an element that did not
       * exist, and every seek afterwards agrees the band is unchanged, so the
       * crossing never happens again and the clip is never started. Screen 0 is
       * the one this always hits, because the lot's clamped progress is 0 for
       * the whole approach — measured in Chromium, it played only when the
       * visitor drove past it and came back.
       *
       * `previous` is `null` rather than `#active` because these screens are
       * new elements with nothing playing on them; there is nothing to pause.
       * The listener in `#options` is deliberately not notified — no band was
       * crossed, and reporting one would invent a crossing.
       *
       * The inner adapter holds `#progress` across this same gap and re-applies
       * it here for the same reason; see `#render` in
       * `adapters/gsap-timeline.ts`.
       */
      this.#onActiveScreenChange(null, this.#active);
    }

    const arrived = await Promise.all(posters);
    if (!this.#destroyed) {
      for (const poster of arrived) {
        this.#placePoster(poster.i, poster.image, poster.project);
      }
    }

    onProgress(1);
  }

  /**
   * Render the frame for `progress`.
   *
   * Absolute and stateless (`SDS-001`): everything visible is the inner
   * timeline's, and the timeline is seeked to `progress` rather than advanced.
   * The band bookkeeping below decides only *when to tell someone*, never what
   * to draw — see {@link ActiveScreenListener}.
   *
   * No layout is read here (`SDS-004`); there is no measurement in this scene
   * at all, because the composition is in CSS pixels of a perspective world.
   */
  seek(progress: number): void {
    if (this.#destroyed) return;

    this.#progress = clamp01(progress);
    this.#inner.seek(this.#progress);

    const next = activeScreen(this.#progress, this.#projects.length);
    if (next !== this.#active) {
      const previous = this.#active;
      this.#active = next;
      this.#onActiveScreenChange(previous, next);
      this.#options.onActiveScreenChange?.(previous, next);
    }
  }

  resize(width: number, height: number): void {
    this.#inner.resize(width, height);
  }

  /**
   * Release the posters, then tear the timeline down.
   *
   * In that order: releasing settles anything still pending, so nothing the
   * loader is holding is left awaiting an adapter that has gone. The inner
   * adapter removes its own root, which takes the whole lot with it.
   */
  destroy(): void {
    this.#destroyed = true;

    for (const video of this.#videos()) {
      video.pause();
      video.removeAttribute("src");
      for (const source of video.querySelectorAll("source")) {
        source.removeAttribute("src");
      }
    }
    this.#playing = null;

    for (const project of this.#projects) {
      sharedAssetLoader.release(project.poster);
    }

    this.#inner.destroy();
  }

  snapshot(): LotSnapshot {
    const count = this.#projects.length;
    const world = this.#container.querySelector<HTMLElement>(
      `.${LOT_WORLD_CLASS}`,
    );
    const screens = this.#container.querySelectorAll<HTMLElement>(
      `.${SCREEN_CLASS}`,
    );

    return {
      progress: this.#progress,
      lotZ: lotZ(this.#progress, count),
      activeScreen: activeScreen(this.#progress, count),
      timelineProgress: this.#inner.snapshot().timelineProgress,
      loadedPosters: this.#loadedPosters,
      playing: this.#playing,
      worldTransform: world?.style.transform ?? "",
      lit: [...screens].map((screen) =>
        round2(screen.style.getPropertyValue(SCREEN_LIT_PROPERTY)),
      ),
    };
  }

  /** Set clip playback from the absolute active band, never by toggling. */
  #onActiveScreenChange(previous: number | null, next: number | null): void {
    if (previous !== null) this.#video(previous)?.pause();

    this.#playing = null;
    if (next === null) return;

    /*
     * Reduced motion: the poster holds and nothing plays.
     *
     * A looping clip is motion the visitor never asked to start and cannot
     * stop, which is the case WCAG 2.2.2 is about — and unlike the drive, it is
     * not something they are steering. Quantising the *drive* does nothing to
     * it: the clip has its own clock, so under `reducedMotionSteps` the camera
     * would sit still at a keyframe with a video looping in front of it, which
     * is the preference being honoured everywhere except the one place motion
     * is actually continuous.
     *
     * Read per activation rather than captured in the constructor, for the same
     * reason the engine reads its own per frame: the preference can change
     * mid-session, and a screen approached after the change must honour it with
     * nothing reconstructed. The query string is imported rather than written
     * out, because a typo matches nothing and reads as "reduced motion is off"
     * forever (`EVO-UNI-057`).
     *
     * The pause above is deliberately *not* inside this guard: turning the
     * preference on while a clip is playing has to stop that clip, and the next
     * band crossing is where that happens.
     */
    if (matchMedia(REDUCED_MOTION_QUERY).matches) return;

    const video = this.#video(next);
    if (!video) return;

    this.#playing = next;
    const attempt = video.play();
    attempt?.catch(() => {});
  }

  /** Remove a failed clip candidate so the poster remains the honest state. */
  #wireClipFallbacks(): void {
    this.#videos().forEach((video, i) => {
      const markMissing = (): void => {
        if (!video.isConnected) return;
        const screen = video.closest(`.${SCREEN_CLASS}`);
        video.pause();
        video.remove();
        screen?.setAttribute(CLIP_STATE_ATTRIBUTE, "missing");
        if (this.#playing === i) this.#playing = null;
      };

      video.addEventListener("error", markMissing, { once: true });
      video
        .querySelector("source")
        ?.addEventListener("error", markMissing, { once: true });
    });
  }

  #videos(): HTMLVideoElement[] {
    return [
      ...this.#container.querySelectorAll<HTMLVideoElement>(
        `.${SCREEN_VIDEO_CLASS}`,
      ),
    ];
  }

  #video(i: number): HTMLVideoElement | null {
    return (
      this.#container
        .querySelector(`[${SCREEN_INDEX_ATTRIBUTE}="${i}"]`)
        ?.querySelector<HTMLVideoElement>(`.${SCREEN_VIDEO_CLASS}`) ?? null
    );
  }

  /** Hang a decoded poster on its screen, or mark the surface as having none. */
  #placePoster(
    i: number,
    image: HTMLImageElement,
    project: TheaterProject,
  ): void {
    const surface = this.#container
      .querySelector(`[${SCREEN_INDEX_ATTRIBUTE}="${i}"]`)
      ?.querySelector(`.${SCREEN_SURFACE_CLASS}`);
    if (!surface) return;

    const usable =
      image.naturalWidth >= MIN_POSTER_PX &&
      image.naturalHeight >= MIN_POSTER_PX;

    if (!usable) {
      /* The loader already warned about a poster that never arrived. This is
       * the other case — bytes, a successful decode, and nothing worth showing
       * — which nothing else can see. */
      if (image.naturalWidth > 0) {
        console.warn(
          `[sds] ${project.poster} decoded ${image.naturalWidth}×${image.naturalHeight}, ` +
            `smaller than ${MIN_POSTER_PX}px — showing a dark screen instead`,
        );
      }
      surface.setAttribute(POSTER_STATE_ATTRIBUTE, "missing");
      return;
    }

    image.className = SCREEN_POSTER_CLASS;
    /* Decorative: the marquee beneath it already names the project, and it is
     * the link's accessible name. */
    image.alt = "";
    surface.append(image);
    surface.setAttribute(POSTER_STATE_ATTRIBUTE, "ready");
    this.#loadedPosters += 1;
  }
}

/** A tween's current value, to two decimals — enough to compare, not to jitter. */
function round2(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}
