/*
 * The loading gate — variant A of `docs/wireframes/loading-screen.html`.
 *
 * A determinate SVG ring with a centred percentage numeral, plus the slow
 * counter-rotating sheen from the wireframe's main loader. The sheen is the only
 * thing that moves before assets report progress, which is what keeps a stalled
 * network looking alive rather than broken. Variants B and C in the wireframe
 * were not chosen; do not build them.
 *
 * The geometry, the `stroke-dasharray`/`stroke-dashoffset` technique and every
 * token below come from that wireframe, which links the same `tokens.css` this
 * file's CSS reads — so the approved design and the built ring cannot drift.
 *
 * WHAT THIS FILE DOES NOT DECIDE
 * ------------------------------
 * When to reveal. The ring is told: `setProgress`, maybe `fail`, then `dismiss`.
 * `engine.ts` owns the gating (which adapters are eager, what they are waiting
 * on), because that is where the scenes are.
 *
 * WHY THE CSS IS A STRING INJECTED INTO `root`
 * --------------------------------------------
 * Same reason as `engine-styles.ts`: an `import './loading-ring.css'` lands in
 * the document, and SD11 mounts the whole experience inside a shadow root that a
 * page-level stylesheet does not reach (`SDS-009`). `Host.injectStyles` is the
 * engine's version of this; the ring takes a root rather than a host, so it
 * appends its own `<style>` — which is correct in both targets, because a style
 * element inside a shadow root is scoped to it. {@link LOADING_RING_STYLES} is
 * exported for a host that would rather route it through `injectStyles` itself.
 *
 * There is no `:root` block here — the tokens are declared `:host, :root` in
 * `tokens.css` and this file only reads them.
 */
import { clamp01 } from "../engine/progress";

/** Class on the loader's own root, and the stem of its element class names. */
export const LOADING_RING_CLASS = "sds-loader";

/** Added when `dismiss()` starts the reveal transition. */
export const LOADING_RING_REVEALED_CLASS = `${LOADING_RING_CLASS}--revealed`;

/** Added by `fail()` under a dev build. Never added in a production build. */
export const LOADING_RING_FAILED_CLASS = `${LOADING_RING_CLASS}--failed`;

/** The ring's radius in its 120×120 viewBox, matching the wireframe. */
const RING_RADIUS = 54;

/** 2πr ≈ 339.29 — the wireframe's `stroke-dasharray`, computed rather than copied. */
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Percentage steps announced to assistive technology — never per frame. */
const ANNOUNCE_STEP_PERCENT = 25;

/**
 * What the label reads while loading, and after a failure under a dev build.
 *
 * The failure wording is deliberately absent from production: a visitor shown
 * "Continuing without some assets" learns nothing and trusts the page less,
 * while the person building it must not be able to miss a broken asset path.
 */
const LABEL_LOADING = "Loading";
const LABEL_DEGRADED = "Continuing without some assets";

/**
 * How long the reveal transition runs before the loader is taken off the page.
 *
 * Mirrors `--sds-duration-reveal` in `src/styles/tokens.css`. It is a JS number
 * because the removal is a `setTimeout`, and the same reasoning as
 * {@link LOADER_MIN_VISIBLE_FALLBACK_MS} applies: nothing load-bearing may
 * depend on a `getComputedStyle` read that returns `''` under Vitest and can
 * fail for real inside a shadow root. The loader is `pointer-events: none` for
 * the whole window, so an over-long value cannot block the page.
 */
export const REVEAL_FADE_MS = 900;

/**
 * Fallback for `--sds-loader-min-visible` when the token cannot be read.
 *
 * **Not zero, and that is the whole point.** Vitest stubs CSS imports, so
 * `getComputedStyle` returns `''` for a custom property declared in an external
 * stylesheet; inside SD11's shadow root the read can fail for real, in
 * production, silently. Falling back to `0` would turn an unreadable token into
 * a loader that flashes and vanishes — precisely the behaviour the token exists
 * to prevent, with no error and no failing test. `400` matches the token's
 * value in `src/styles/tokens.css`; change both together.
 *
 * (`EVO-UNI-030` is deliberately not cited: it governs hardcoded *colors* as
 * `var()` fallbacks. This is a JS parse fallback for a duration.)
 */
export const LOADER_MIN_VISIBLE_FALLBACK_MS = 400;

/** The loading gate, as the engine sees it. */
export interface LoadingRing {
  /** Move the indicator. Values outside 0..1 are clamped. */
  setProgress(fraction: number): void;

  /**
   * Some assets settled without their bytes.
   *
   * Under `import.meta.env.DEV` the ring turns `--sds-warn` and says so. In a
   * production build this only reaches the console — the reveal is silent.
   */
  fail(reason: string): void;

  /**
   * Reveal the page: wait out the remaining minimum-visible time, start the
   * transition, and resolve once the loader is out of the way. Idempotent.
   */
  dismiss(): Promise<void>;
}

/** Options for {@link createLoadingRing}. */
export interface LoadingRingOptions {
  /**
   * Minimum time the ring stays up, so a warm cache reads as a deliberate
   * reveal rather than a flash.
   *
   * **Both hosts pass this explicitly**, from `loaderMinVisibleMs()`. The
   * default below is a convenience, not a contract — see
   * {@link LOADER_MIN_VISIBLE_FALLBACK_MS} for why nothing may depend on the
   * token read succeeding.
   */
  minVisibleMs?: number;
}

/**
 * Parse a CSS time value into milliseconds.
 *
 * Exported because it is the testable half of {@link loaderMinVisibleMs}: a
 * test can prove `'400ms'`, `'0.4s'` and `''` are handled without stubbing
 * `getComputedStyle` and then asserting against its own stub.
 *
 * Returns `null` for anything it does not understand, so the caller decides the
 * fallback rather than receiving a silent `0`.
 */
export function parseCssMilliseconds(value: string): number | null {
  const raw = value.trim();
  if (raw === "") return null;

  const scale = raw.endsWith("ms") ? 1 : raw.endsWith("s") ? 1000 : null;
  if (scale === null) return null;

  const number = Number.parseFloat(raw);
  if (!Number.isFinite(number) || number < 0) return null;

  return number * scale;
}

/**
 * Read `--sds-loader-min-visible` off `root`, falling back to
 * {@link LOADER_MIN_VISIBLE_FALLBACK_MS}.
 *
 * A `ShadowRoot` is not an element, so the read goes through its `host` — which
 * is also the element `tokens.css`'s `:host` block styles (`SDS-009`).
 */
export function loaderMinVisibleMs(root: HTMLElement | ShadowRoot): number {
  const element = root instanceof HTMLElement ? root : root.host;
  const declared = getComputedStyle(element).getPropertyValue(
    "--sds-loader-min-visible",
  );
  return parseCssMilliseconds(declared) ?? LOADER_MIN_VISIBLE_FALLBACK_MS;
}

/**
 * Build the loading gate inside `root` and show it immediately.
 *
 * ```ts
 * const ring = createLoadingRing(mount, { minVisibleMs: loaderMinVisibleMs(mount) })
 * createEngine({ host, scenes, loadingRing: ring }).start()
 * ```
 */
export function createLoadingRing(
  root: HTMLElement | ShadowRoot,
  options: LoadingRingOptions = {},
): LoadingRing {
  const minVisibleMs = options.minVisibleMs ?? loaderMinVisibleMs(root);

  injectStyles(root);

  const container = document.createElement("div");
  container.className = LOADING_RING_CLASS;

  const inner = document.createElement("div");
  inner.className = `${LOADING_RING_CLASS}__inner`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", `${LOADING_RING_CLASS}__ring`);
  svg.setAttribute("width", "120");
  svg.setAttribute("height", "120");
  svg.setAttribute("viewBox", "0 0 120 120");
  // The numeral beside it carries the same information as text, so the graphic
  // is decorative to assistive technology.
  svg.setAttribute("aria-hidden", "true");

  const track = circle("track");
  const sheen = circle("sheen");
  const indicator = circle("indicator");
  indicator.setAttribute("stroke-dasharray", offsetFor(0));
  indicator.setAttribute("stroke-dashoffset", offsetFor(0));
  svg.append(track, sheen, indicator);

  const readout = document.createElement("div");
  readout.className = `${LOADING_RING_CLASS}__readout`;

  const percent = document.createElement("div");
  percent.className = `${LOADING_RING_CLASS}__percent`;
  percent.textContent = "0%";

  const label = document.createElement("div");
  label.className = `${LOADING_RING_CLASS}__label`;
  label.textContent = LABEL_LOADING;

  readout.append(percent, label);
  inner.append(svg, readout);

  /*
   * A separate, visually hidden live region — not `aria-live` on the numeral.
   * The numeral changes every frame, and a live region wrapping it would
   * announce every one of them.
   */
  const status = document.createElement("p");
  status.className = `${LOADING_RING_CLASS}__status`;
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.textContent = announcement(0);

  container.append(inner, status);
  root.append(container);

  const shownAt = Date.now();
  let announcedStep = 0;
  let dismissing: Promise<void> | null = null;

  function setProgress(fraction: number): void {
    const value = clamp01(fraction);
    const wholePercent = Math.round(value * 100);

    indicator.setAttribute("stroke-dashoffset", offsetFor(value));
    percent.textContent = `${wholePercent}%`;

    const step =
      Math.floor(wholePercent / ANNOUNCE_STEP_PERCENT) * ANNOUNCE_STEP_PERCENT;
    if (step > announcedStep) {
      announcedStep = step;
      status.textContent = announcement(step);
    }
  }

  function fail(reason: string): void {
    // Read at call time, not at module load: a test stubs it to exercise both
    // branches, and a value captured at import would freeze the first one.
    if (!import.meta.env.DEV) {
      console.warn(`[sds] ${reason}`);
      return;
    }

    console.warn(`[sds] loading gate degraded: ${reason}`);
    container.classList.add(LOADING_RING_FAILED_CLASS);
    label.textContent = LABEL_DEGRADED;
    status.textContent = LABEL_DEGRADED;
  }

  function dismiss(): Promise<void> {
    dismissing ??= runDismiss();
    return dismissing;
  }

  async function runDismiss(): Promise<void> {
    const remaining = minVisibleMs - (Date.now() - shownAt);
    if (remaining > 0) await delay(remaining);

    container.classList.add(LOADING_RING_REVEALED_CLASS);
    // The gate is over the moment the transition starts — it is
    // `pointer-events: none` from here — so the caller is not held for the fade.
    container.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      container.remove();
    }, REVEAL_FADE_MS);
  }

  return { setProgress, fail, dismiss };
}

/** One of the three concentric circles, all sharing the wireframe's geometry. */
function circle(role: "track" | "sheen" | "indicator"): SVGCircleElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  node.setAttribute("class", `${LOADING_RING_CLASS}__${role}`);
  node.setAttribute("cx", "60");
  node.setAttribute("cy", "60");
  node.setAttribute("r", String(RING_RADIUS));
  return node;
}

/**
 * The `stroke-dashoffset` for a 0..1 fraction: a full circumference of offset
 * hides the arc, none of it shows the whole ring.
 *
 * Two decimal places, which is what the wireframe's states are drawn at —
 * `339.29` at 0, `220.54` at 35%, `118.75` at 65%, `95.00` at 72%.
 */
function offsetFor(fraction: number): string {
  return (RING_CIRCUMFERENCE * (1 - fraction)).toFixed(2);
}

function announcement(wholePercent: number): string {
  return `${LABEL_LOADING} ${wholePercent}%`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Marks the `<style>` this module owns, so a second ring does not add another. */
const STYLE_MARKER = "data-sds-loading-ring";

function injectStyles(root: HTMLElement | ShadowRoot): void {
  if (root.querySelector(`style[${STYLE_MARKER}]`)) return;

  const style = document.createElement("style");
  style.setAttribute(STYLE_MARKER, "");
  style.textContent = LOADING_RING_STYLES;
  root.append(style);
}

/**
 * The gate's CSS, transcribed from the wireframe under `sds-loader-` names.
 *
 * The class names are namespaced because the standalone build shares a document
 * with whatever else is on the page; the wireframe's bare `.ring` and `.readout`
 * would be a collision waiting to happen.
 *
 * Every colour, space, size, duration and z-index is a token (`EVO-UNI-001`).
 * The three literals that are not — `stroke-width: 2`, the sheen's `2.4s` sweep,
 * and its `opacity` — are geometry and motion belonging to this one graphic,
 * carried over from the approved wireframe verbatim rather than re-invented.
 */
export const LOADING_RING_STYLES = `
.${LOADING_RING_CLASS} {
  position: fixed;
  inset: 0;
  z-index: var(--sds-z-loader);
  display: grid;
  place-items: center;
  background: var(--sds-loader-backdrop);
  color: var(--sds-text);
  font-family: var(--sds-font-sans);
  transition: opacity var(--sds-duration-reveal) var(--sds-ease-out);
}

.${LOADING_RING_REVEALED_CLASS} {
  opacity: 0;
  pointer-events: none;
}

.${LOADING_RING_CLASS}__inner {
  position: relative;
  display: grid;
  place-items: center;
  transition:
    opacity var(--sds-duration-reveal) var(--sds-ease-out),
    transform var(--sds-duration-reveal) var(--sds-ease-out);
}

.${LOADING_RING_REVEALED_CLASS} .${LOADING_RING_CLASS}__inner {
  opacity: 0;
  transform: scale(1.08);
}

.${LOADING_RING_CLASS}__ring {
  display: block;
  transform: rotate(-90deg);
}

.${LOADING_RING_CLASS}__track {
  fill: none;
  stroke: var(--sds-loader-track);
  stroke-width: 2;
}

.${LOADING_RING_CLASS}__indicator {
  fill: none;
  stroke: var(--sds-loader-indicator);
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke-dashoffset var(--sds-duration-fast) linear;
}

/* The only thing that moves before assets report progress, so a stalled
   network still looks alive. */
.${LOADING_RING_CLASS}__sheen {
  fill: none;
  stroke: var(--sds-accent-soft);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 20 319.29;
  opacity: 0.5;
  transform-origin: 60px 60px;
  animation: sds-loader-sweep 2.4s linear infinite;
}

@keyframes sds-loader-sweep {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .${LOADING_RING_CLASS}__sheen {
    animation: none;
    opacity: 0.25;
  }
}

.${LOADING_RING_CLASS}__readout {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: var(--sds-space-1);
  text-align: center;
}

.${LOADING_RING_CLASS}__percent {
  font-variant-numeric: tabular-nums;
  font-size: var(--sds-text-lead);
  font-weight: var(--sds-weight-medium);
  letter-spacing: var(--sds-tracking-tight);
}

.${LOADING_RING_CLASS}__label {
  font-size: var(--sds-text-micro);
  text-transform: uppercase;
  letter-spacing: var(--sds-tracking-wide);
  color: var(--sds-text-subtle);
}

.${LOADING_RING_FAILED_CLASS} .${LOADING_RING_CLASS}__indicator {
  stroke: var(--sds-warn);
}

.${LOADING_RING_FAILED_CLASS} .${LOADING_RING_CLASS}__label {
  color: var(--sds-warn);
  text-transform: none;
  letter-spacing: var(--sds-tracking-normal);
}

/* Announced, never seen. Not \`display: none\`, which removes it from the
   accessibility tree along with the announcement. */
.${LOADING_RING_CLASS}__status {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
`.trim();
