/*
 * Pre-warm: let the browser rasterise the lot behind the loading ring, so the
 * visitor's first scroll is not the moment it does.
 *
 * WHAT THIS FIXES, MEASURED
 * -------------------------
 * The lot's pin sits one viewport below the title, so at load nothing in it is
 * on screen and the browser rasterises none of it. The first time it scrolls
 * into view — the approach from the title to the lot — every tile of the
 * ground plane has to be painted at once, and the ground is the most expensive
 * surface on the page: eleven background layers over 4000x5200 CSS pixels.
 * Evan felt it as a laggy approach (2026-10-16); traced headed in WSLg Chromium
 * (1440x900, `?period=afternoon`, 30 wheel steps from the top, software GL) it
 * was 434ms of raster during the approach, ~390ms of it the ground's.
 * Holding the lot on screen for a few frames behind the opaque ring first, then
 * putting it back, took the approach to 77ms. The tiles survive the lot
 * leaving the viewport again; the browser keeps them.
 *
 * HOW, AND WHY HERE
 * -----------------
 * The pin is given the engine's own `--fixed` strategy class for the hold,
 * which states the same geometry the Wix host pins with — top of the viewport,
 * full width — so nothing here restates layout. Its spacer keeps its height,
 * so the page's scroll range and every scene's progress are unchanged while it
 * is held. The ring is above it (`--sds-z-loader`) and opaque, so the visitor
 * sees none of it.
 *
 * It wraps the ring rather than living in the engine or the lot: the engine is
 * vendored and knows nothing about what is expensive to paint, and the lot
 * adapter may not touch the pin, which is outside the container it was handed
 * (`SDS-002`). Revealing is the page's business, and this is the page.
 */
import { SCENE_PIN_CLASS } from "../engine/mount";
import type { LoadingRing } from "../loader/loading-ring";

/**
 * How many frames the lot is held on screen before the reveal.
 *
 * Enough for the compositor to see the layers as visible and schedule their
 * tiles; the raster itself carries on in the background once scheduled. Ten
 * frames is about 170ms at 60Hz, and it runs inside the ring's own
 * minimum-visible time on any load that reaches the reveal early.
 */
export const PREWARM_FRAMES = 10;

/** The class the hold gives each pin — the engine's fixed strategy. */
export const PREWARM_PIN_CLASS = `${SCENE_PIN_CLASS}--fixed`;

/**
 * Wrap `ring` so that `dismiss()` holds every pin in `root` on screen for
 * {@link PREWARM_FRAMES} frames first. Idempotent, as `dismiss()` must be.
 *
 * `nextFrame` is injected so tests can step the hold by hand.
 */
export function prewarmBeforeReveal(
  ring: LoadingRing,
  root: ParentNode,
  nextFrame: () => Promise<void> = animationFrame,
): LoadingRing {
  let dismissing: Promise<void> | null = null;

  async function holdThenDismiss(): Promise<void> {
    /* Only pins not already fixed: a host that pins with the fixed strategy
     * has nothing to warm, and removing its class afterwards would unpin it. */
    const pins = [
      ...root.querySelectorAll<HTMLElement>(`.${SCENE_PIN_CLASS}`),
    ].filter((pin) => !pin.classList.contains(PREWARM_PIN_CLASS));

    for (const pin of pins) pin.classList.add(PREWARM_PIN_CLASS);
    try {
      for (let i = 0; i < PREWARM_FRAMES; i += 1) await nextFrame();
    } finally {
      for (const pin of pins) pin.classList.remove(PREWARM_PIN_CLASS);
    }

    /* One more frame so the pins are back in place before the fade starts. */
    await nextFrame();
    await ring.dismiss();
  }

  return {
    setProgress: (fraction) => ring.setProgress(fraction),
    fail: (reason) => ring.fail(reason),
    dismiss: () => (dismissing ??= holdThenDismiss()),
  };
}

function animationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
