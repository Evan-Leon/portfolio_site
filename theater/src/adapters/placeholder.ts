/*
 * The placeholder adapter — the smallest complete example of the seam.
 *
 * Two jobs, and they are worth keeping separate in your head:
 *
 *  1. It lets a page be wired up before any real animation exists. Scroll it
 *     and the numbers move, which demonstrates that scrubbing works end to end
 *     — including backwards — with nothing to download and nothing to decode.
 *  2. It is the reference an adapter author reads first. So it stays dependency
 *     free, holds no assets, and does every part of the contract the obvious
 *     way: absolute `seek`, measurements cached in `resize`, `destroy` that
 *     removes exactly what it added.
 *
 * All styling is inline and expressed in `--sds-*` tokens (`EVO-UNI-001`) so
 * this file needs no stylesheet of its own. That is a deliberate cost: a real
 * adapter should use a stylesheet. Here, "one file, no imports but the engine's
 * own clamp" is worth more than stylistic purity.
 *
 * Not to be confused with `src/placeholder.ts`, which is SD2's static page
 * element (`createPlaceholder`) and is replaced by the real page shell in SD7.
 */
import { clamp01 } from "../engine/progress";
import type { AdapterFactory, AnimationAdapter } from "./types";

/** Class on the adapter's own root, and the stem of its element class names. */
export const PLACEHOLDER_SCENE_CLASS = "sds-placeholder-scene";

/** What the placeholder is currently showing, read back off its own DOM. */
export interface PlaceholderSnapshot {
  /** The label the factory was given. */
  label: string;
  /** Progress as a whole percentage, e.g. `'42%'`. */
  percent: string;
  /** The progress bar's CSS width, e.g. `'42.00%'`. */
  barWidth: string;
  /** The size the last `resize` reported, e.g. `'1024 × 768'`, or `'—'`. */
  size: string;
}

/**
 * The placeholder's public shape.
 *
 * `snapshot()` is not part of {@link AnimationAdapter} — it is this adapter's
 * answer to the conformance kit's `observe` seam, which every adapter supplies
 * in its own way. It reads back off the rendered DOM rather than reporting
 * internal fields, so what it returns is what a visitor would see
 * (`EVO-UNI-017`).
 */
export interface PlaceholderAdapter extends AnimationAdapter {
  snapshot(): PlaceholderSnapshot;
}

/** Rendered in the size slot until a `resize` arrives. */
const NO_SIZE_YET = "—";

/**
 * Build a factory for a placeholder scene labelled `label`.
 *
 * ```ts
 * { id: 'intro', vh: 300, adapter: placeholder('Intro') }
 * ```
 *
 * Note the single call: the returned value *is* the factory the engine invokes
 * with the container. No `assets` manifest is attached, because there is
 * nothing to warm.
 */
export function placeholder(label: string): AdapterFactory {
  return (container: HTMLElement): AnimationAdapter =>
    new Placeholder(container, label);
}

class Placeholder implements PlaceholderAdapter {
  readonly #root: HTMLElement;
  readonly #label: HTMLElement;
  readonly #percent: HTMLElement;
  readonly #bar: HTMLElement;
  readonly #size: HTMLElement;

  /** Cached in `resize`, rendered by `seek`. Never measured here (`SDS-004`). */
  #width = 0;
  #height = 0;

  /** Set by `destroy`, so a late `seek` or `resize` is a no-op, not a throw. */
  #destroyed = false;

  constructor(container: HTMLElement, label: string) {
    this.#root = element("div", "");
    this.#root.style.cssText = [
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "justify-content:center",
      "gap:var(--sds-space-4)",
      "width:100%",
      "height:100%",
      "background:var(--sds-bg-raised)",
      "color:var(--sds-text)",
      "font-family:var(--sds-font-mono)",
    ].join(";");

    this.#label = element("div", "__label");
    this.#label.style.cssText = [
      "font-size:var(--sds-text-title)",
      "letter-spacing:var(--sds-tracking-wide)",
      "text-transform:uppercase",
    ].join(";");
    this.#label.textContent = label;

    this.#percent = element("div", "__percent");
    this.#percent.style.cssText = [
      "font-size:var(--sds-text-display)",
      "line-height:var(--sds-leading-tight)",
      "color:var(--sds-accent)",
    ].join(";");

    const track = element("div", "__track");
    track.style.cssText = [
      "width:60%",
      "height:var(--sds-space-2)",
      "background:var(--sds-bg-inset)",
      "border-radius:var(--sds-radius-full)",
      "overflow:hidden",
    ].join(";");

    this.#bar = element("div", "__bar");
    this.#bar.style.cssText = [
      "height:100%",
      "background:var(--sds-accent)",
    ].join(";");
    track.append(this.#bar);

    this.#size = element("div", "__size");
    this.#size.style.cssText = [
      "font-size:var(--sds-text-micro)",
      "color:var(--sds-text-subtle)",
    ].join(";");
    this.#size.textContent = NO_SIZE_YET;

    this.#root.append(this.#label, this.#percent, track, this.#size);
    container.append(this.#root);

    /*
     * Render frame zero immediately, so an adapter is never blank between
     * construction and its first `seek`.
     *
     * This used to be load-bearing against the engine: a scene mounted at its
     * preload margin was not seeked until it went active, so without this it
     * flashed empty. The engine now seeks every mounted scene to its clamped
     * progress, which covers that case properly and in the direction this
     * could not — a scene mounting *past* its end needs frame 1, not 0. Kept
     * because it still holds for an adapter driven directly, and because
     * "render something in the constructor" is the right habit to copy.
     */
    this.seek(0);
  }

  /** Nothing to fetch. Report complete and resolve, so the ring stops waiting. */
  load(onProgress: (fraction: number) => void): Promise<void> {
    onProgress(1);
    return Promise.resolve();
  }

  seek(progress: number): void {
    if (this.#destroyed) return;

    const fraction = clamp01(progress);
    this.#percent.textContent = `${Math.round(fraction * 100)}%`;
    this.#bar.style.width = `${(fraction * 100).toFixed(2)}%`;
  }

  resize(width: number, height: number): void {
    if (this.#destroyed) return;

    this.#width = width;
    this.#height = height;
    this.#size.textContent = `${this.#width} × ${this.#height}`;
  }

  destroy(): void {
    this.#destroyed = true;
    this.#root.remove();
  }

  snapshot(): PlaceholderSnapshot {
    return {
      label: this.#label.textContent ?? "",
      percent: this.#percent.textContent ?? "",
      barWidth: this.#bar.style.width,
      size: this.#size.textContent ?? "",
    };
  }
}

/** A `div` carrying the scene's block class plus an optional element suffix. */
function element(tag: "div", suffix: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = `${PLACEHOLDER_SCENE_CLASS}${suffix}`;
  return node;
}
