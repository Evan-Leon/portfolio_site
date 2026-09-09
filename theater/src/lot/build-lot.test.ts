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
  buildLot,
  CAR_STATE_ATTRIBUTE,
  GROUND_DEPTH_PROPERTY,
  GROUND_LEAD_PROPERTY,
  GROUND_LINE_PROPERTY,
  LOT_BEAM_CLASS,
  LOT_CAR_CLASS,
  LOT_CLASS,
  LOT_GROUND_CLASS,
  GROUND_SQUASH_PROPERTY,
  LOT_ORB_CLASS,
  LOT_WORLD_CLASS,
  MASK_STATE_ATTRIBUTE,
  POSTER_STATE_ATTRIBUTE,
  SCREEN_CLASS,
  SCREEN_INDEX_ATTRIBUTE,
  SCREEN_MARQUEE_CLASS,
  SCREEN_POSTER_CLASS,
  SCREEN_SURFACE_CLASS,
  SCREEN_X_PROPERTY,
  SCREEN_YAW_PROPERTY,
  SCREEN_Z_PROPERTY,
  TREE_CLASS,
  TREE_SCALE_PROPERTY,
  TREE_VARIANT_ATTRIBUTE,
  TREE_X_PROPERTY,
  TREE_Z_PROPERTY,
} from "./build-lot";
import { GROUND_SQUASH, groundDepth, SPACING } from "./geometry";
import { lotScene, type LotAdapter } from "./lot-scene";
import { treePlacements } from "./scenery";

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

  it("hands the stylesheet a ground that spans the whole drive", async () => {
    await mountLot();

    const stage = container.querySelector<HTMLElement>(`.${LOT_CLASS}`);

    /*
     * The two numbers the ground plane is built from. `--sds-ground-depth` is
     * asserted against `groundDepth(projects.length)` rather than the literal
     * `11200px` on purpose: the literal belongs in `geometry.test.ts`, which
     * pins the arithmetic, and this case is about the *handover* — that what
     * the stylesheet receives is what the geometry computed, for however many
     * projects the module holds (`EVO-UNI-130`).
     */
    expect(stage?.style.getPropertyValue(GROUND_LEAD_PROPERTY)).toBe("800px");
    expect(stage?.style.getPropertyValue(GROUND_DEPTH_PROPERTY)).toBe(
      `${groundDepth(projects.length)}px`,
    );

    /* Unitless, and it has to be: the stylesheet both DIVIDES lengths by it and
     * feeds it to `scaleY()`, and neither works with a `px` suffix. */
    expect(stage?.style.getPropertyValue(GROUND_SQUASH_PROPERTY)).toBe(
      String(GROUND_SQUASH),
    );
    expect(container.querySelectorAll(`.${LOT_GROUND_CLASS}`)).toHaveLength(1);
  });

  it("hangs one orb on the stage, outside the world the drive moves", async () => {
    await mountLot();

    const orbs = [
      ...container.querySelectorAll<HTMLElement>(`.${LOT_ORB_CLASS}`),
    ];

    /*
     * Exactly one, and not inside `.sds-lot__world`. The orb is the sun or the
     * moon: it is meant to be infinitely far away, and the world is the one
     * element the drive translates — an orb inside it would slide across the
     * sky as the visitor scrolls, which is the one thing a sun must not do.
     */
    expect(orbs).toHaveLength(1);
    expect(orbs[0]?.closest(`.${LOT_WORLD_CLASS}`)).toBe(null);
    expect(orbs[0]?.parentElement?.className).toBe(LOT_CLASS);
    expect(orbs[0]?.getAttribute("aria-hidden")).toBe("true");
  });

  it("lines the drive with trees, left side first then right", async () => {
    await mountLot();

    const trees = [
      ...container.querySelectorAll<HTMLElement>(`.${TREE_CLASS}`),
    ];
    const placements = treePlacements(COUNT);

    expect(trees).toHaveLength(placements.length);

    /* The DOM order IS the placement order — left block then right — which is
     * what lets a reader looking at DevTools predict which is which. */
    expect(trees.map((tree) => tree.className)).toEqual(
      placements.map(
        (placement) => `${TREE_CLASS} ${TREE_CLASS}--${placement.side}`,
      ),
    );
  });

  it("writes the first tree's placement as three inline properties", async () => {
    await mountLot();

    const first = container.querySelector<HTMLElement>(`.${TREE_CLASS}`);

    /* The literal placement, not `treePlacements(COUNT)[0]` recomputed — the
     * arithmetic is `scenery.test.ts`'s subject, and this is about the three
     * properties reaching the element with their units intact. The scale is
     * UNITLESS: `1.05px` would invalidate the whole `transform`, not just its
     * own component. */
    expect(first?.style.getPropertyValue(TREE_X_PROPERTY)).toBe("-900px");
    expect(first?.style.getPropertyValue(TREE_Z_PROPERTY)).toBe("-100px");
    expect(first?.style.getPropertyValue(TREE_SCALE_PROPERTY)).toBe("1.05");
    expect(first?.getAttribute(TREE_VARIANT_ATTRIBUTE)).toBe("0");
    expect(first?.getAttribute("aria-hidden")).toBe("true");
  });

  it("builds every tree inside the world, and masks none of them itself", async () => {
    /*
     * `buildLot` directly, not through the scene — the subject is what this
     * file alone produces, BEFORE `lot-scene.ts` has placed a single mask.
     * Going through `mountLot()` could not show it: `load()` resolves only
     * after the art has settled, so the pending state would already be gone.
     */
    const { gsap } = await import("gsap");
    const bare = document.createElement("div");
    document.body.append(bare);
    const timeline = buildLot(projects)({ container: bare, gsap });

    const trees = [...bare.querySelectorAll<HTMLElement>(`.${TREE_CLASS}`)];

    expect(trees.length).toBeGreaterThan(0);
    for (const tree of trees) {
      expect(tree.getAttribute(MASK_STATE_ATTRIBUTE)).toBe("pending");
      /* No `mask-image` from this file: a `url()` here would be a fetch the
       * asset loader never counted, and the ring would reach 100% with the
       * masks still arriving (`SDS-006`). */
      expect(tree.style.getPropertyValue("mask-image")).toBe("");
      expect(tree.closest(`.${LOT_WORLD_CLASS}`)).not.toBe(null);
    }

    /* And the wagon starts pending for the same reason. */
    expect(
      bare
        .querySelector(`.${LOT_CAR_CLASS}`)
        ?.getAttribute(CAR_STATE_ATTRIBUTE),
    ).toBe("pending");
    expect(bare.querySelector(`.${LOT_CAR_CLASS} img`)).toBeNull();

    timeline.kill();
    bare.remove();
  });

  it("parks the wagon and its beam on the stage, outside the world", async () => {
    await mountLot();

    const beam = container.querySelector<HTMLElement>(`.${LOT_BEAM_CLASS}`);
    const car = container.querySelector<HTMLElement>(`.${LOT_CAR_CLASS}`);

    /*
     * On the stage for the opposite reason the orb is: the orb must not move
     * because it is infinitely far away, the car must not move because it is
     * the vehicle the camera is sitting in. Inside the world it would recede at
     * the speed of the drive.
     */
    expect(car?.closest(`.${LOT_WORLD_CLASS}`)).toBe(null);
    expect(beam?.closest(`.${LOT_WORLD_CLASS}`)).toBe(null);
    expect(car?.parentElement?.className).toBe(LOT_CLASS);
    expect(beam?.parentElement?.className).toBe(LOT_CLASS);

    /* Beam immediately before car in source, so the sprite paints over the near
     * end of the trapezoid rather than the trapezoid over the bumper. */
    expect(beam?.nextElementSibling).toBe(car);

    expect(car?.getAttribute("aria-hidden")).toBe("true");
    expect(beam?.getAttribute("aria-hidden")).toBe("true");
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
