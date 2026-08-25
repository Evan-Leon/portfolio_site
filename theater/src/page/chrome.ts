/*
 * The page chrome: the scroll progress bar, its readout, and the
 * persistent-layer indicator.
 *
 * All three show the same number — **global page progress**, 0 at the top of the
 * document and 1 at the bottom — and all three are driven by the engine's
 * `persistentLayer` callback. That is the whole design: `SDS-005` says scroll is
 * read once per frame through `ScrollSource`, so nothing here listens to the
 * window. A second `scroll` listener would be the obvious way to write this,
 * would look correct, and would drift a frame behind the scenes it sits above.
 *
 * The elements themselves live in `index.html` (see the `data-sds-*` attributes
 * below) rather than being built here. Under Wix, SD11 mounts into a shadow root
 * with no such markup; `createPageChrome` is the standalone page's wiring, and
 * an SD11 entry that wants chrome supplies its own.
 */
import { clamp01 } from "../engine/progress";

/** The bar across the top of the viewport. Scaled, never resized — see below. */
export const PROGRESS_BAR_ATTRIBUTE = "data-sds-progress-bar";

/** The percentage printed in the top chrome. */
export const PROGRESS_PERCENT_ATTRIBUTE = "data-sds-progress-percent";

/** The persistent-layer indicator, the element that spans scene boundaries. */
export const PERSISTENT_ATTRIBUTE = "data-sds-persistent";

/**
 * Wire the chrome inside `scope` and return the engine's `persistentLayer`.
 *
 * ```ts
 * createEngine({ host, scenes, persistentLayer: createPageChrome(mount) })
 * ```
 *
 * Throws if the page shell is missing an element this drives. A silent no-op
 * would leave a progress bar that never moves and no way to tell that from a
 * scroll bug, which is the more expensive failure by far.
 */
export function createPageChrome(
  scope: ParentNode,
): (progress: number) => void {
  const bar = required(scope, PROGRESS_BAR_ATTRIBUTE);
  const readout = required(scope, PROGRESS_PERCENT_ATTRIBUTE);
  const persistent = required(scope, PERSISTENT_ATTRIBUTE);

  /** `-1` matches no percentage, so the first frame always renders. */
  let lastPercent = -1;

  return function renderPageProgress(progress: number): void {
    const value = clamp01(progress);

    /*
     * `transform: scaleX`, where the approved wireframe's stand-in script sets
     * `width`. Same picture, and this runs sixty times a second: a width change
     * is a layout change, while a transform is composited. The bar is full-width
     * with `transform-origin: 0 50%` in `global.css`, so `scaleX(0.4)` is 40%.
     */
    bar.style.transform = `scaleX(${value})`;

    /*
     * Text is a different matter: it can only change 101 times across the whole
     * page, so it is written when the rounded value actually changes rather than
     * every frame. Writing identical text would dirty layout for nothing.
     */
    const percent = Math.round(value * 100);
    if (percent === lastPercent) return;

    lastPercent = percent;
    readout.textContent = `${percent}%`;
    persistent.textContent = `${percent}%`;
  };
}

function required(scope: ParentNode, attribute: string): HTMLElement {
  const element = scope.querySelector<HTMLElement>(`[${attribute}]`);

  if (!element) {
    throw new Error(
      `Expected an element with [${attribute}] in the page shell`,
    );
  }

  return element;
}
