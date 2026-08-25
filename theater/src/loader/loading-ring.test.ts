/*
 * Unit tests for the loading gate.
 *
 * `minVisibleMs` is passed explicitly everywhere below rather than left to the
 * ring's token read. Vitest stubs CSS imports, so `getComputedStyle` returns
 * `''` for a custom property declared in an external stylesheet — a test that
 * leaned on it would have to stub `getComputedStyle` and would then be asserting
 * against its own stub (`EVO-UNI-061`). The token read is covered directly, and
 * purely, by the `parseCssMilliseconds` tests.
 *
 * Fake timers drive the minimum-visible wait and the reveal transition, and are
 * cleaned up in `afterEach` (`EVO-FE-057`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLoadingRing,
  LOADER_MIN_VISIBLE_FALLBACK_MS,
  LOADING_RING_CLASS,
  LOADING_RING_FAILED_CLASS,
  LOADING_RING_REVEALED_CLASS,
  loaderMinVisibleMs,
  parseCssMilliseconds,
  REVEAL_FADE_MS,
} from "./loading-ring";

/** The wireframe's `--sds-loader-min-visible`, passed from the call site. */
const MIN_VISIBLE_MS = 400;

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement("div");
  document.body.append(root);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function build(minVisibleMs = MIN_VISIBLE_MS): {
  ring: ReturnType<typeof createLoadingRing>;
  element: HTMLElement;
} {
  const ring = createLoadingRing(root, { minVisibleMs });
  const element = root.querySelector<HTMLElement>(`.${LOADING_RING_CLASS}`);
  if (!element) throw new Error("The ring did not render");
  return { ring, element };
}

function query(element: HTMLElement, suffix: string): Element {
  const found = element.querySelector(`.${LOADING_RING_CLASS}__${suffix}`);
  if (!found)
    throw new Error(`No .${LOADING_RING_CLASS}__${suffix} in the ring`);
  return found;
}

/* ------------------------------------------------------------------ *
 * Structure — variant A of docs/wireframes/loading-screen.html
 * ------------------------------------------------------------------ */

describe("createLoadingRing — structure", () => {
  it("renders the track, the sheen, the indicator and the centred numeral", () => {
    const { element } = build();

    expect(query(element, "track").getAttribute("r")).toBe("54");
    expect(query(element, "sheen").getAttribute("r")).toBe("54");
    expect(query(element, "indicator").getAttribute("r")).toBe("54");
    expect(query(element, "percent").textContent).toBe("0%");
    expect(query(element, "label").textContent).toBe("Loading");
  });

  it("dashes the indicator by the full circumference, as the wireframe does", () => {
    const { element } = build();

    expect(query(element, "indicator").getAttribute("stroke-dasharray")).toBe(
      "339.29",
    );
  });

  it("hides the graphic from assistive technology and announces through a live region", () => {
    const { element } = build();

    expect(element.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );

    const status = query(element, "status");
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe("Loading 0%");
  });

  it("injects its stylesheet once, however many rings a root gets", () => {
    build();
    build();

    expect(root.querySelectorAll("style[data-sds-loading-ring]")).toHaveLength(
      1,
    );
  });
});

/* ------------------------------------------------------------------ *
 * setProgress
 * ------------------------------------------------------------------ */

describe("createLoadingRing — setProgress", () => {
  /** The offsets the wireframe's own state gallery is drawn at. */
  it.each([
    { fraction: 0, offset: "339.29", percent: "0%" },
    { fraction: 0.35, offset: "220.54", percent: "35%" },
    { fraction: 0.65, offset: "118.75", percent: "65%" },
    { fraction: 0.72, offset: "95.00", percent: "72%" },
    { fraction: 1, offset: "0.00", percent: "100%" },
  ])(
    "draws $percent at stroke-dashoffset $offset",
    ({ fraction, offset, percent }) => {
      const { ring, element } = build();

      ring.setProgress(fraction);

      expect(
        query(element, "indicator").getAttribute("stroke-dashoffset"),
      ).toBe(offset);
      expect(query(element, "percent").textContent).toBe(percent);
    },
  );

  it("clamps out-of-range values instead of drawing past either end", () => {
    const { ring, element } = build();

    ring.setProgress(1.4);
    expect(query(element, "indicator").getAttribute("stroke-dashoffset")).toBe(
      "0.00",
    );

    ring.setProgress(-0.3);
    expect(query(element, "indicator").getAttribute("stroke-dashoffset")).toBe(
      "339.29",
    );
  });

  it("announces at 25% steps, not on every frame", () => {
    const { ring, element } = build();
    const status = query(element, "status");

    for (const fraction of [0.05, 0.11, 0.18, 0.24]) ring.setProgress(fraction);
    expect(status.textContent).toBe("Loading 0%");
    // The numeral itself keeps up — it is the announcement that is rationed.
    expect(query(element, "percent").textContent).toBe("24%");

    ring.setProgress(0.25);
    expect(status.textContent).toBe("Loading 25%");

    for (const fraction of [0.3, 0.4, 0.49]) ring.setProgress(fraction);
    expect(status.textContent).toBe("Loading 25%");

    ring.setProgress(0.5);
    expect(status.textContent).toBe("Loading 50%");

    ring.setProgress(1);
    expect(status.textContent).toBe("Loading 100%");
  });
});

/* ------------------------------------------------------------------ *
 * fail — loud in development, silent in production
 * ------------------------------------------------------------------ */

describe("createLoadingRing — fail", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("turns the ring warn-coloured and says so under a dev build", () => {
    vi.stubEnv("DEV", true);
    const { ring, element } = build();

    ring.fail("2 asset(s) settled without their bytes: /a.png, /b.png");

    expect(element.classList.contains(LOADING_RING_FAILED_CLASS)).toBe(true);
    expect(query(element, "label").textContent).toBe(
      "Continuing without some assets",
    );
    expect(query(element, "status").textContent).toBe(
      "Continuing without some assets",
    );
    expect(console.warn).toHaveBeenCalledWith(
      "[sds] loading gate degraded: 2 asset(s) settled without their bytes: /a.png, /b.png",
    );
  });

  it("reveals silently in a production build, reporting only to the console", () => {
    vi.stubEnv("DEV", false);
    const { ring, element } = build();

    ring.fail("1 asset(s) settled without their bytes: /a.png");

    // A visitor shown "continuing without some assets" learns nothing and
    // trusts the page less; the console still carries the whole story.
    expect(element.classList.contains(LOADING_RING_FAILED_CLASS)).toBe(false);
    expect(query(element, "label").textContent).toBe("Loading");
    expect(console.warn).toHaveBeenCalledWith(
      "[sds] 1 asset(s) settled without their bytes: /a.png",
    );
  });
});

/* ------------------------------------------------------------------ *
 * dismiss
 * ------------------------------------------------------------------ */

describe("createLoadingRing — dismiss", () => {
  it("waits out the minimum visible time before starting the reveal", async () => {
    vi.useFakeTimers();
    const { ring, element } = build();

    let resolved = false;
    const dismissed = ring.dismiss().then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(MIN_VISIBLE_MS - 1);
    expect(resolved).toBe(false);
    expect(element.classList.contains(LOADING_RING_REVEALED_CLASS)).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await dismissed;

    expect(resolved).toBe(true);
    expect(element.classList.contains(LOADING_RING_REVEALED_CLASS)).toBe(true);
    expect(element.getAttribute("aria-hidden")).toBe("true");
  });

  it("reveals without waiting when the ring has already been up long enough", async () => {
    vi.useFakeTimers();
    const { ring, element } = build();

    await vi.advanceTimersByTimeAsync(MIN_VISIBLE_MS + 50);
    await ring.dismiss();

    expect(element.classList.contains(LOADING_RING_REVEALED_CLASS)).toBe(true);
  });

  it("takes the loader off the page once the reveal transition has run", async () => {
    vi.useFakeTimers();
    const { ring, element } = build();

    const dismissed = ring.dismiss();
    await vi.advanceTimersByTimeAsync(MIN_VISIBLE_MS);
    await dismissed;

    // Resolved, revealed, and still on the page: the caller is not held for
    // the fade, but the element is not yanked out from under it either.
    expect(element.isConnected).toBe(true);

    await vi.advanceTimersByTimeAsync(REVEAL_FADE_MS);
    expect(element.isConnected).toBe(false);
  });

  it("is idempotent — a second call returns the first promise", async () => {
    vi.useFakeTimers();
    const { ring, element } = build();

    const first = ring.dismiss();
    expect(ring.dismiss()).toBe(first);

    await vi.advanceTimersByTimeAsync(MIN_VISIBLE_MS);
    await first;

    expect(root.querySelectorAll(`.${LOADING_RING_CLASS}`)).toHaveLength(1);
    expect(element.classList.contains(LOADING_RING_REVEALED_CLASS)).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * The minimum-visible token
 * ------------------------------------------------------------------ */

describe("parseCssMilliseconds", () => {
  it.each([
    { value: "400ms", expected: 400 },
    { value: " 400ms ", expected: 400 },
    { value: "0.4s", expected: 400 },
    { value: "0ms", expected: 0 },
  ])("reads $value as $expected", ({ value, expected }) => {
    expect(parseCssMilliseconds(value)).toBe(expected);
  });

  it.each(["", "   ", "400", "fast", "-200ms"])(
    "returns null for %j",
    (value) => {
      expect(parseCssMilliseconds(value)).toBeNull();
    },
  );
});

describe("loaderMinVisibleMs", () => {
  it("falls back to the token value — never to 0 — when the read comes back empty", () => {
    // Exactly the case that matters: no stylesheet is loaded here, which is
    // also what a failed read inside SD11's shadow root looks like. Falling
    // back to 0 would give a loader that flashes and vanishes, with no error
    // and no failing test.
    expect(loaderMinVisibleMs(root)).toBe(LOADER_MIN_VISIBLE_FALLBACK_MS);
    expect(LOADER_MIN_VISIBLE_FALLBACK_MS).toBe(400);
  });
});
