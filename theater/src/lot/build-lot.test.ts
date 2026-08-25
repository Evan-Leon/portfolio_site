/*
 * The lot, driven: what the DOM looks like, and what the timeline writes into
 * it at each end of the drive and back again.
 *
 * Against the REAL `gsap`, like `adapters/gsap-timeline.contract.test.ts` — a
 * mocked timeline would make every assertion below a statement about the mock.
 * The whole point is that GSAP's own scrubbing reproduces a frame exactly on
 * the way back up (`SDS-001`), and only the real library can be wrong about
 * that. It has been: the unlit tween's `immediateRender` lit every screen the
 * visitor had not reached yet, which is why the reverse half of the sweep below
 * is written out rather than trusted.
 *
 * `Image` is faked (see `test-helpers/fake-image.ts`) because jsdom fetches
 * nothing: without it the eight posters settle only on the loader's 4-second
 * stall timeout, which against Vitest's 5-second default is a failing run.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { projects } from "../projects";
import { createFakeImages, type FakeImages } from "../test-helpers/fake-image";
import {
  GROUND_LINE_PROPERTY,
  LOT_CLASS,
  LOT_GROUND_CLASS,
  LOT_WORLD_CLASS,
  POSTER_STATE_ATTRIBUTE,
  SCREEN_CLASS,
  SCREEN_INDEX_ATTRIBUTE,
  SCREEN_MARQUEE_CLASS,
  SCREEN_POSTER_CLASS,
  SCREEN_SURFACE_CLASS,
  SCREEN_X_PROPERTY,
  SCREEN_YAW_PROPERTY,
  SCREEN_Z_PROPERTY,
} from "./build-lot";
import { SPACING } from "./geometry";
import { lotScene, type LotAdapter } from "./lot-scene";

/** A landscape screenshot, comfortably past `MIN_POSTER_PX`. */
const POSTER_SIZE = { width: 1280, height: 800 };

/*
 * The middle of a band, as a progress. The drive is nine bands — eight screens
 * and the empty spacing past the last one — so screen `i` is the one ahead
 * from `i / 9` to `(i + 1) / 9`, and its middle is where it is unambiguously
 * the lit one.
 */
/** How many screens the registry currently holds — never a literal here. */
const COUNT = projects.length;
const LAST = COUNT - 1;
const midBand = (i: number): number => (i + 0.5) / (COUNT + 1);
/** A `lit` snapshot with exactly screen `i` on (or none, for `null`). */
const litOnly = (i: number | null): number[] =>
  Array.from({ length: COUNT }, (_, k) => (k === i ? 1 : 0));

let fake: FakeImages;
let container: HTMLElement;
let adapter: LotAdapter;

/** Mount the lot and load it, with every poster arriving at a usable size. */
async function mountLot(
  autoSettle: (url: string) => { width: number; height: number } | null = () =>
    POSTER_SIZE,
): Promise<LotAdapter> {
  fake = createFakeImages({ autoSettle });
  vi.stubGlobal("Image", fake.Image);

  container = document.createElement("div");
  document.body.append(container);
  adapter = lotScene(projects)(container) as LotAdapter;
  await adapter.load(() => {});

  return adapter;
}

/**
 * The Z the world is currently translated to, as GSAP wrote it.
 *
 * GSAP collapses the transform to its 2D form (`translate(0, 0)`) when there is
 * no depth left to express, which is the same statement as `translateZ(0px)` —
 * so that spelling is read as zero rather than treated as unparseable.
 */
function worldZ(): number {
  const transform = adapter.snapshot().worldTransform;

  const match = /translate(?:3d\([^,]+,[^,]+,\s*|Z\()(-?[\d.]+)px/.exec(
    transform,
  );
  if (match) return Number.parseFloat(match[1] as string);
  if (/^translate\(0(px)?, 0(px)?\)$/.test(transform)) return 0;

  throw new Error(`No translated Z in ${JSON.stringify(transform)}`);
}

beforeEach(() => {
  // The loader logs every asset that settles without its bytes; the missing
  // poster test below is deliberately one of those.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  adapter.destroy();
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("buildLot — the DOM the lot is made of", () => {
  it("builds one linked screen per project, in drive order", async () => {
    await mountLot();

    const screens = [
      ...container.querySelectorAll<HTMLAnchorElement>(`.${SCREEN_CLASS}`),
    ];

    expect(screens).toHaveLength(COUNT);
    expect(screens.map((screen) => screen.getAttribute("href"))).toEqual(
      projects.map((project) => project.href),
    );
    expect(
      screens.map((screen) => screen.getAttribute(SCREEN_INDEX_ATTRIBUTE)),
    ).toEqual(projects.map((_, i) => String(i)));
  });

  it("names each link with its marquee, which is the only text in it", async () => {
    await mountLot();

    const screen = container.querySelector<HTMLAnchorElement>(
      `[${SCREEN_INDEX_ATTRIBUTE}="0"]`,
    );

    expect(screen?.querySelector(`.${SCREEN_MARQUEE_CLASS}`)?.textContent).toBe(
      "Leon's Budget",
    );
    expect(screen?.textContent).toBe("Leon's Budget");
  });

  it("places the screens where the geometry says, alternating sides", async () => {
    /*
     * Three custom properties rather than one `transform`, so the narrow
     * breakpoint in `styles/global.css` can restate x and yaw without knowing
     * the arithmetic. The stylesheet composes them — see `.sds-screen` there,
     * and the header of `build-lot.ts` for why.
     */
    await mountLot();

    const placements = [
      ...container.querySelectorAll<HTMLElement>(`.${SCREEN_CLASS}`),
    ].map((screen) => ({
      x: screen.style.getPropertyValue(SCREEN_X_PROPERTY),
      z: screen.style.getPropertyValue(SCREEN_Z_PROPERTY),
      yaw: screen.style.getPropertyValue(SCREEN_YAW_PROPERTY),
    }));

    expect(placements[0]).toEqual({ x: "-480px", z: "-800px", yaw: "18deg" });
    expect(placements[1]).toEqual({ x: "480px", z: "-1600px", yaw: "-18deg" });
    expect(placements[7]).toEqual({ x: "480px", z: "-6400px", yaw: "-18deg" });

    /*
     * And no screen carries an inline `transform` — not after construction and
     * not after scrubbing, which is the half that could regress without anyone
     * touching this file. The timeline tweens `--sds-screen-lit` on these same
     * elements; a tween that also wrote a transform (or a future one that did)
     * would outrank the narrow breakpoint's `!important` placement, because an
     * inline `transform` and a stylesheet `transform` are the same property and
     * the inline one wins. The lot would then keep its wide slalom on a phone,
     * silently, with every other test still green.
     */
    expect(placements).toHaveLength(COUNT);
    adapter.seek(midBand(3));
    adapter.seek(midBand(0));

    expect(
      [...container.querySelectorAll<HTMLElement>(`.${SCREEN_CLASS}`)].map(
        (screen) => screen.style.transform,
      ),
    ).toEqual(Array.from({ length: COUNT }, () => ""));
  });

  it("hands the stylesheet the horizon the placement was computed against", async () => {
    await mountLot();

    const stage = container.querySelector<HTMLElement>(`.${LOT_CLASS}`);

    expect(stage?.style.getPropertyValue(GROUND_LINE_PROPERTY)).toBe("58%");
    expect(container.querySelector(`.${LOT_GROUND_CLASS}`)).not.toBe(null);
  });

  it("exposes the links to assistive technology", async () => {
    await mountLot();

    // The GSAP adapter hides its root by default, which is right for a
    // decorative animation and would hide eight real links here.
    expect(
      container.querySelector(`.${LOT_WORLD_CLASS}`)?.closest("[aria-hidden]"),
    ).toBe(null);
  });
});

describe("buildLot — posters", () => {
  it("hangs the decoded element the loader resolved, marked ready", async () => {
    await mountLot();

    const surfaces = [
      ...container.querySelectorAll<HTMLElement>(`.${SCREEN_SURFACE_CLASS}`),
    ];

    expect(
      surfaces.map((surface) => surface.getAttribute(POSTER_STATE_ATTRIBUTE)),
    ).toEqual(Array.from({ length: COUNT }, () => "ready"));

    const poster = surfaces[0]?.querySelector<HTMLImageElement>(
      `.${SCREEN_POSTER_CLASS}`,
    );
    expect(poster?.src).toBe("/images/budget-app/01.png");
    expect(poster?.alt).toBe("");
    expect(adapter.snapshot().loadedPosters).toBe(COUNT);
  });

  it("still builds a screen when the poster 404s or is a placeholder", async () => {
    await mountLot((url) => {
      if (url === "/images/nom-noms/01.png") return null; // never arrives
      if (url === "/images/el-blackjack/01.png") return { width: 1, height: 1 }; // the placeholder that used to ship
      return POSTER_SIZE;
    });

    const surfaces = [
      ...container.querySelectorAll<HTMLElement>(`.${SCREEN_SURFACE_CLASS}`),
    ];

    expect(
      surfaces.map((surface) => surface.getAttribute(POSTER_STATE_ATTRIBUTE)),
    ).toEqual(
      projects.map((_, i) => (i === 1 || i === 2 ? "missing" : "ready")),
    );
    expect(adapter.snapshot().loadedPosters).toBe(COUNT - 2);

    // The screens are still there, still linked, still named — a hole in the
    // lot would read as a broken page (`EVO-UNI-053`).
    expect(container.querySelectorAll(`.${SCREEN_CLASS}`)).toHaveLength(COUNT);
    expect(
      container
        .querySelector(`[${SCREEN_INDEX_ATTRIBUTE}="1"]`)
        ?.querySelector(`.${SCREEN_MARQUEE_CLASS}`)?.textContent,
    ).toBe("Nom Nom's");
  });
});

describe("buildLot — the drive", () => {
  it("lights exactly the screen being approached, band by band", async () => {
    await mountLot();

    adapter.seek(midBand(0));
    expect(adapter.snapshot().lit).toEqual(litOnly(0));

    adapter.seek(midBand(3));
    expect(adapter.snapshot().lit).toEqual(litOnly(3));

    adapter.seek(midBand(LAST));
    expect(adapter.snapshot().lit).toEqual(litOnly(LAST));

    // Past the last screen the lot is dark, which is what makes the exit beat
    // read as the end of the drive rather than a stall.
    adapter.seek(1);
    expect(adapter.snapshot().lit).toEqual(litOnly(null));
    expect(adapter.snapshot().activeScreen).toBe(null);
  });

  it("drives forward and scrubs back to the identical frame", async () => {
    await mountLot();

    adapter.seek(midBand(0));
    const atScreen0 = adapter.snapshot();
    expect(worldZ()).toBe(0.5 * SPACING);

    adapter.seek(midBand(3));
    const atScreen3 = adapter.snapshot();
    expect(worldZ()).toBe(3.5 * SPACING);

    adapter.seek(midBand(LAST));
    expect(worldZ()).toBe((LAST + 0.5) * SPACING);

    /* The half that matters. A timeline that accumulated, or one whose tweens
     * write state outside their own window, comes back to a different frame —
     * and the numbers alone would not show it, which is why the comparison is
     * against the whole snapshot including the transform string GSAP wrote. */
    adapter.seek(midBand(3));
    expect(adapter.snapshot()).toEqual(atScreen3);

    adapter.seek(midBand(0));
    expect(adapter.snapshot()).toEqual(atScreen0);
  });

  it("moves the world monotonically forward across the drive", async () => {
    await mountLot();

    const seen: number[] = [];
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      adapter.seek(progress);
      seen.push(worldZ());
    }

    // The whole drive is `(COUNT + 1)` spacings long — one past the last screen.
    expect(seen).toEqual(
      [0, 0.25, 0.5, 0.75, 1].map((p) => p * SPACING * (COUNT + 1)),
    );
  });

  it("clamps rather than driving out of the lot", async () => {
    await mountLot();

    adapter.seek(1);
    const atTheEnd = adapter.snapshot();

    adapter.seek(1.4);
    expect(adapter.snapshot()).toEqual(atTheEnd);

    adapter.seek(0);
    const atTheGate = adapter.snapshot();

    adapter.seek(-0.4);
    expect(adapter.snapshot()).toEqual(atTheGate);
  });

  it("reports each band change once, with the screen it came from", async () => {
    fake = createFakeImages({ autoSettle: () => POSTER_SIZE });
    vi.stubGlobal("Image", fake.Image);
    container = document.createElement("div");
    document.body.append(container);

    const changes: [number | null, number | null][] = [];
    adapter = lotScene(projects, {
      onActiveScreenChange: (previous, next) => changes.push([previous, next]),
    })(container) as LotAdapter;
    await adapter.load(() => {});

    adapter.seek(midBand(0)); // first seek establishes screen 0
    adapter.seek(midBand(1));
    adapter.seek(midBand(1)); // the same band twice is not a change
    adapter.seek(midBand(3)); // skipping a band still reports one crossing
    adapter.seek(1);
    adapter.seek(midBand(3)); // and it reports going backwards too

    expect(changes).toEqual([
      [null, 0],
      [0, 1],
      [1, 3],
      [3, null],
      [null, 3],
    ]);
  });
});

describe("buildLot — teardown", () => {
  it("empties the container and lets the posters be fetched again", async () => {
    await mountLot();
    const firstPass = fake.all().length;

    adapter.destroy();

    expect(container.children).toHaveLength(0);

    // Released, not merely forgotten: a second mount re-declares them and the
    // loader builds new elements rather than handing back the freed ones.
    const second = lotScene(projects)(container) as LotAdapter;
    await second.load(() => {});
    expect(fake.all().length).toBe(firstPass * 2);

    adapter = second; // afterEach tears this one down
  });
});
