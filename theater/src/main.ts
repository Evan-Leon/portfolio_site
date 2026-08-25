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
import { createPageChrome } from "./page/chrome";
import { scenes } from "./scenes/registry";

const mount = document.querySelector<HTMLElement>("#app");

if (!mount) {
  throw new Error(
    'Expected an element with id "app" in index.html to mount into',
  );
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
createEngine({
  host: standaloneHost(mount),
  scenes,
  persistentLayer: createPageChrome(mount),
  loadingRing,
}).start();
