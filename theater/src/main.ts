/*
 * Application entry point for the standalone build.
 *
 * A handful of lines of actual work: find the mount element, wrap it in a host,
 * wire the page chrome, build the engine over the scene registry, start it.
 * Everything interesting is behind `standaloneHost` and `createEngine`; SD11's
 * Wix entry differs from this file only in which host it constructs.
 *
 * `styles/global.css` is the page shell's stylesheet and imports `tokens.css`
 * itself — one canonical set of design tokens, shared with `docs/wireframes/` so
 * an approved wireframe and the built page cannot drift apart. The engine's own
 * pin/spacer geometry is *not* imported here: it is injected through the host at
 * `start()`, because a stylesheet import cannot reach SD11's shadow root
 * (`SDS-009`).
 *
 * The page structure itself is in `index.html`, not here. Content sections are
 * real HTML in document order, with `data-scene-slot` elements marking where the
 * registry's scenes go, so the text exists with JavaScript off.
 *
 * This file must never import `src/index.ts`'s conformance kit (SD4) — that
 * would pull `vitest` into the shipped bundle.
 */
import "./styles/global.css";
import { createEngine } from "./engine/engine";
import { standaloneHost } from "./host/standalone";
import { createLoadingRing, loaderMinVisibleMs } from "./loader/loading-ring";
import { SCREEN_CLASS, SCREEN_INDEX_ATTRIBUTE } from "./lot/build-lot";
import { screenProgress } from "./lot/geometry";
import { createPageChrome } from "./page/chrome";
import { installPeriod } from "./page/period";
import { projects } from "./projects";
import { scenes } from "./scenes/registry";

/**
 * The scene the lot is mounted as, as `scenes/registry.ts` names it.
 *
 * Spelled once here rather than inline below, because a typo is silent:
 * `scrollToScene` returns `false` for an id nothing carries, and a Tab key that
 * quietly does nothing is exactly the dead end this wiring exists to remove.
 */
const LOT_SCENE_ID = "lot";

/**
 * How far into a focused screen's band to drive, as a fraction of the whole
 * drive.
 *
 * `screenProgress(i, count)` is the progress at which screen `i` lights — the
 * *first* frame of its band, where `activeScreen` has only just handed over.
 * Landing exactly on a boundary leaves which screen is lit to the last bit of a
 * float, so the target is a hair inside the band instead. Small enough to stay
 * inside the narrowest band the lot can have (a band is `1 / (count + 1)` of
 * the drive, so 0.02 is a fifth of one at eight projects) and, under reduced
 * motion, small enough that `reducedMotionSteps: projects.length + 1` snaps it
 * straight back to the band start.
 */
const BAND_SETTLE = 0.02;

const mount = document.querySelector<HTMLElement>("#app");

if (!mount) {
  throw new Error(
    'Expected an element with id "app" in index.html to mount into',
  );
}

/*
 * The sky is decided before anything is built.
 *
 * `data-period` is what the token blocks branch on, and the loading ring is
 * painted out of those same tokens — so installing this after `createEngine`
 * would let the gate come up in one time of day and the page behind it lift on
 * another, a flash nobody can reproduce on a fast machine. The return value is
 * dropped on purpose: the standalone page never uninstalls, and the listener
 * lives exactly as long as the document does (`SDS-009` decides *which*
 * element — `document.documentElement` here, an embedded host's own element in
 * a shadow root).
 */
installPeriod(document.documentElement, { search: location.search });

/*
 * Every load starts at the top of the drive.
 *
 * The drive *is* the scroll position, so the browser's default
 * `scrollRestoration` — put them back where they were — hands a returning
 * visitor the middle of a camera move, with the approach they were meant to
 * arrive through already behind them. Nothing downstream can correct for it:
 * the engine is doing the right thing when it seeks to whatever the scroll
 * says (`SDS-005`), and this is the only place that knows a page *load*
 * happened at all.
 *
 * `manual` covers the back button as well as a refresh, deliberately — both
 * drop a visitor mid-drive, and it is the same disorientation either way.
 *
 * A fragment is the one thing that overrides it. `#exit` is where the skip
 * link goes, and a page that scrolled itself back to the top there would have
 * broken the accessibility affordance it went to the trouble of having.
 *
 * Before `createEngine` rather than after, so the gate's first update pass
 * mounts the scenes for the position the visitor is about to see instead of
 * one that is already being thrown away.
 *
 * Standalone only: SD11's Wix entry is a component inside someone else's
 * document, and resetting *their* scroll on load is not its business — the
 * same line `SDS-009` draws for styles.
 */
if (!location.hash) {
  history.scrollRestoration = "manual";
  scrollTo(0, 0);
}

/*
 * `minVisibleMs` is passed from here rather than left to the ring's default, and
 * SD11's Wix entry does the same. The token is still the source of truth — this
 * reads it — but the read happens at the host's call site, where a failure is
 * visible, instead of inside a component whose default would silently become
 * `getComputedStyle` returning `''` in a shadow root.
 */
const loadingRing = createLoadingRing(mount, {
  minVisibleMs: loaderMinVisibleMs(mount),
});

/*
 * The chrome is the `persistentLayer`, not a second scroll listener: the engine
 * already reads scroll once per frame and hands out global page progress, and a
 * listener of its own would run at a different point in the frame and drift
 * behind the scenes it sits above (`SDS-005`).
 */
const engine = createEngine({
  host: standaloneHost(mount),
  scenes,
  persistentLayer: createPageChrome(mount),
  loadingRing,
  /*
   * One keyframe per screen, plus the exit — not the engine's default of four.
   * Four keyframes across a nine-band drive parks the camera between screens
   * at three of its five stops, so a visitor who asked for less motion gets a
   * slideshow of the gaps rather than of the projects.
   */
  reducedMotionSteps: projects.length + 1,
});

engine.start();

/*
 * Tab drives.
 *
 * The screens are real links in the pinned container, so they are already in
 * the tab order — but focus alone moves nothing, and the browser cannot scroll
 * a pinned element into view because it never leaves the viewport. Without
 * this, tabbing walks an invisible list of links somewhere down the lane.
 *
 * It lives here rather than in the lot adapter on purpose: driving the *page*
 * is the page's business, and an adapter that owned a reference to the engine
 * could no longer be the thing that only touches its own container
 * (`SDS-002`). One delegated listener on the mount root, not eight — the
 * screens are built and destroyed with the scene, and a per-screen listener
 * would have to be rewired every time the adapter is reconstructed.
 */
mount.addEventListener("focusin", (event: FocusEvent) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const screen = target.closest(`.${SCREEN_CLASS}`);
  if (!screen) return;

  /*
   * A click focuses the link too, and the visitor who clicked a screen is
   * already looking at it — driving there would yank the page out from under
   * the click. `:focus-visible` is the browser's own answer to "did this focus
   * come from the keyboard", which is the question being asked.
   */
  if (!target.matches(":focus-visible")) return;

  /* `Number(null)` is 0, so an element wearing the class without the attribute
   * would drive to screen 1 rather than doing nothing — the kind of wrong that
   * looks like a working feature. */
  const index = screen.getAttribute(SCREEN_INDEX_ATTRIBUTE);
  if (index === null) return;

  const i = Number(index);
  if (!Number.isInteger(i)) return;

  engine.scrollToScene(
    LOT_SCENE_ID,
    screenProgress(i, projects.length) + BAND_SETTLE,
  );
});
