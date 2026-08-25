/*
 * `SDS-003` for the lot, against the real `gsap` and the real asset loader.
 *
 * WHY `Image` IS STUBBED HERE AND THE CONTRACT RUN WOULD OTHERWISE HANG
 * ---------------------------------------------------------------------
 * The kit calls `load()` itself, several times over — once for the lifecycle
 * trial and once per state trial — and there is no point in between where a
 * test body could settle an image by hand. jsdom fetches nothing, so a real
 * `img.src = …` never fires `load` or `error` and each of the eight posters
 * settles only when the loader's 4-second stall timeout expires. Against
 * Vitest's 5-second default that is not a slow run, it is a failed one. The
 * fake settles every request on its own, at a size that passes the lot's
 * "is this a real screenshot" check.
 *
 * WHY THE FAKE IS A REAL `<img>` — see `test-helpers/fake-image.ts`. Short
 * version: the kit calls a listener leaked unless its target is a disconnected
 * `Node`, and the loader's `{ once: true }` handlers are never explicitly
 * removed.
 *
 * WHAT THE KIT CAN AND CANNOT SEE HERE
 * ------------------------------------
 * `observe` returns `snapshot()`, which includes the world's inline transform
 * and every screen's inline `--sds-screen-lit`. That is what makes the
 * order-independence check meaningful: those two are what GSAP actually wrote,
 * so a tween aimed at the wrong element or a misspelled custom property fails
 * the sweep instead of passing on the pure `lotZ` arithmetic alone.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { adapterContract } from "../adapters/adapter-contract";
import { projects } from "../projects";
import { createFakeImages, type FakeImages } from "../test-helpers/fake-image";
import { lotScene, type LotAdapter } from "./lot-scene";

/** Big enough to pass `MIN_POSTER_PX`, and shaped like the real screenshots. */
const POSTER_SIZE = { width: 1280, height: 800 };

let fake: FakeImages;

/*
 * GSAP's one-time library initialisation registers nine window listeners that
 * no adapter can remove. Running it before the kit starts instrumenting keeps
 * a per-module cost from being reported as a per-scene leak — the same
 * `beforeAll` the vendored GSAP contract test uses, and for the same reason.
 */
beforeAll(async () => {
  await import("gsap");
});

beforeEach(() => {
  fake = createFakeImages({ autoSettle: () => POSTER_SIZE });
  vi.stubGlobal("Image", fake.Image);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("lotScene — before the contract run", () => {
  it("declares every poster through the shared loader, and nothing else", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const adapter = lotScene(projects)(container) as LotAdapter;

    await adapter.load(() => {});

    expect(fake.inFlight().map((image) => image.src)).toEqual(
      projects.map((project) => project.poster),
    );
    expect(adapter.snapshot().loadedPosters).toBe(projects.length);

    adapter.destroy();
    container.remove();
  });

  it("is eager, so the ring waits for the posters before revealing", () => {
    const container = document.createElement("div");
    const adapter = lotScene(projects)(container);

    expect(adapter.eager).toBe(true);

    adapter.destroy();
  });

  it("carries no assets manifest — the engine never warms an eager scene", () => {
    expect(lotScene(projects).assets).toBeUndefined();
  });
});

adapterContract(lotScene(projects), {
  name: "lotScene",
  observe: (adapter) => (adapter as LotAdapter).snapshot(),
});
