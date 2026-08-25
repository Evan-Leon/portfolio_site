/*
 * Unit tests for the asset queue.
 *
 * `Image` is replaced with a controllable fake, because jsdom does not fetch
 * resources: a real `img.src = …` in this environment never fires `load` or
 * `error`, so every image test would hang on a promise nobody can settle. The
 * fake is a class rather than a `vi.fn()` — an arrow function has no
 * `[[Construct]]` and `new Image()` would throw "not a constructor"
 * (`EVO-FE-150`) — and globals are unstubbed in `afterEach`.
 *
 * `fetch` is stubbed too. No test here touches the network (`EVO-UNI-020`).
 *
 * Fake timers are used only by the stall-timeout tests and are cleaned up in
 * `afterEach` (`EVO-FE-057`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ASSET_UNAVAILABLE,
  createAssetLoader,
  DEFAULT_CONCURRENCY,
  STALL_TIMEOUT_MS,
} from "./asset-loader";

/* ------------------------------------------------------------------ *
 * A controllable image
 * ------------------------------------------------------------------ */

/** Every image the loader has constructed in the current test, oldest first. */
let images: FakeImage[];

class FakeImage extends EventTarget {
  crossOrigin: string | null = null;
  src = "";

  constructor() {
    super();
    images.push(this);
  }

  /** Requests that have actually been sent — the ones occupying a slot. */
  static inFlight(): FakeImage[] {
    return images.filter((image) => image.src !== "");
  }

  succeed(): void {
    this.dispatchEvent(new Event("load"));
  }

  fail(): void {
    this.dispatchEvent(new Event("error"));
  }
}

/** The image the loader built for `url`, or a failing assertion. */
function imageFor(url: string): FakeImage {
  const image = images.find((candidate) => candidate.src === url);
  if (!image) throw new Error(`No image was requested for ${url}`);
  return image;
}

/* ------------------------------------------------------------------ *
 * Harness
 * ------------------------------------------------------------------ */

/** Responses `fetch` should give, by URL. Anything unlisted rejects. */
let responses: Map<string, { ok: boolean; body: unknown }>;

beforeEach(() => {
  images = [];
  responses = new Map();

  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("fetch", (url: string): Promise<Response> => {
    const response = responses.get(url);
    if (!response)
      return Promise.reject(new Error(`Unstubbed request: ${url}`));

    return Promise.resolve({
      ok: response.ok,
      json: () => Promise.resolve(response.body),
      arrayBuffer: () => Promise.resolve(response.body),
    } as unknown as Response);
  });

  // The loader logs every URL that settles without its bytes, in every build.
  // Silenced here so a deliberate-failure test does not print a wall of noise.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */

describe("createAssetLoader — aggregate progress", () => {
  it("reports 1 before anything is queued, so an empty page never waits", () => {
    expect(createAssetLoader().progress()).toBe(1);
  });

  it("reports settled over total as each asset arrives", async () => {
    const loader = createAssetLoader();
    const urls = ["/a.png", "/b.png", "/c.png", "/d.png"];
    const pending = urls.map((url) => loader.add({ url, kind: "image" }));

    expect(loader.progress()).toBe(0);

    imageFor("/a.png").succeed();
    await pending[0];
    expect(loader.progress()).toBe(0.25);

    imageFor("/b.png").succeed();
    imageFor("/c.png").succeed();
    await Promise.all([pending[1], pending[2]]);
    expect(loader.progress()).toBe(0.75);

    imageFor("/d.png").succeed();
    await pending[3];
    expect(loader.progress()).toBe(1);
  });

  it("notifies subscribers of the new fraction, and stops after unsubscribe", async () => {
    const loader = createAssetLoader();
    const seen: number[] = [];
    const unsubscribe = loader.onProgress((fraction) => seen.push(fraction));

    const first = loader.add({ url: "/a.png", kind: "image" });
    const second = loader.add({ url: "/b.png", kind: "image" });

    imageFor("/a.png").succeed();
    await first;

    unsubscribe();
    imageFor("/b.png").succeed();
    await second;

    // Two adds (the denominator moved, so the fraction changed) then one
    // settle. The 1 after the second settle never arrives — nobody is
    // listening by then.
    expect(seen).toEqual([0, 0, 0.5]);
  });

  it("counts a URL added twice once, and hands back the same promise", async () => {
    const loader = createAssetLoader();
    const first = loader.add({ url: "/a.png", kind: "image" });
    const second = loader.add({ url: "/a.png", kind: "image" });

    expect(second).toBe(first);
    expect(FakeImage.inFlight()).toHaveLength(1);

    imageFor("/a.png").succeed();
    await first;
    expect(loader.progress()).toBe(1);
  });

  it("resolves an image with its decoded element", async () => {
    const loader = createAssetLoader();
    const pending = loader.add({ url: "/a.png", kind: "image" });

    const image = imageFor("/a.png");
    image.succeed();

    expect(await pending).toBe(image);
    // Untainted canvas reads depend on this being set before `src` (SD10).
    expect(image.crossOrigin).toBe("anonymous");
  });

  it("resolves a JSON asset with its parsed body", async () => {
    responses.set("/data.json", { ok: true, body: { frames: 12 } });

    const loader = createAssetLoader();
    expect(await loader.add({ url: "/data.json", kind: "json" })).toEqual({
      frames: 12,
    });
    expect(loader.progress()).toBe(1);
  });
});

describe("createAssetLoader — a failed asset settles rather than rejecting", () => {
  it("advances progress to completion when an image 404s", async () => {
    const loader = createAssetLoader();
    const good = loader.add({ url: "/a.png", kind: "image" });
    const bad = loader.add({ url: "/missing.png", kind: "image" });

    imageFor("/a.png").succeed();
    imageFor("/missing.png").fail();
    await Promise.all([good, bad]);

    // The whole point: the ring reaches 1 and dismisses, with no timer involved.
    expect(loader.progress()).toBe(1);
    expect(loader.failures()).toEqual(["/missing.png"]);
  });

  it("resolves the failed image with its element rather than rejecting", async () => {
    const loader = createAssetLoader();
    const pending = loader.add({ url: "/missing.png", kind: "image" });

    const image = imageFor("/missing.png");
    image.fail();

    expect(await pending).toBe(image);
  });

  it("resolves a failed JSON asset with the sentinel", async () => {
    responses.set("/data.json", { ok: false, body: null });

    const loader = createAssetLoader();
    expect(await loader.add({ url: "/data.json", kind: "json" })).toBe(
      ASSET_UNAVAILABLE,
    );
    expect(loader.progress()).toBe(1);
    expect(loader.failures()).toEqual(["/data.json"]);
  });

  it("logs every failed URL, in every build", async () => {
    const loader = createAssetLoader();
    const pending = loader.add({ url: "/missing.png", kind: "image" });
    imageFor("/missing.png").fail();
    await pending;

    expect(console.warn).toHaveBeenCalledWith(
      "[sds] asset settled without its bytes: /missing.png",
    );
  });
});

describe("createAssetLoader — the stall timeout is a separate mechanism", () => {
  it("settles a request that never resolves and never rejects", async () => {
    vi.useFakeTimers();

    const loader = createAssetLoader();
    let settled = false;
    const pending = loader
      .add({ url: "/hangs.png", kind: "image" })
      .then(() => {
        settled = true;
      });

    // The image was requested and simply never calls back.
    expect(FakeImage.inFlight()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(STALL_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    expect(loader.progress()).toBe(0);

    await vi.advanceTimersByTimeAsync(1);
    await pending;

    expect(settled).toBe(true);
    expect(loader.progress()).toBe(1);
    expect(loader.failures()).toEqual(["/hangs.png"]);
  });

  it("does not run the clock on an asset that is still waiting its turn", async () => {
    vi.useFakeTimers();

    const loader = createAssetLoader({ concurrency: 1 });
    const first = loader.add({ url: "/first.png", kind: "image" });
    const queued = loader.add({ url: "/queued.png", kind: "image" });

    // Four seconds pass while `/queued.png` has not been requested at all. Its
    // timeout must start when its request does, or a long queue behind a small
    // cap would time out for merely waiting.
    await vi.advanceTimersByTimeAsync(STALL_TIMEOUT_MS);
    await first;
    expect(loader.failures()).toEqual(["/first.png"]);

    expect(FakeImage.inFlight().map((image) => image.src)).toEqual([
      "/first.png",
      "/queued.png",
    ]);
    imageFor("/queued.png").succeed();
    await queued;

    expect(loader.failures()).toEqual(["/first.png"]);
    expect(loader.progress()).toBe(1);
  });

  it("leaves the timer alone once the asset has arrived", async () => {
    vi.useFakeTimers();

    const loader = createAssetLoader();
    const pending = loader.add({ url: "/a.png", kind: "image" });
    imageFor("/a.png").succeed();
    await pending;

    await vi.advanceTimersByTimeAsync(STALL_TIMEOUT_MS * 2);
    expect(loader.failures()).toEqual([]);
  });
});

describe("createAssetLoader — concurrency", () => {
  it("defaults to the named cap rather than an inline number", () => {
    expect(DEFAULT_CONCURRENCY).toBe(6);

    const loader = createAssetLoader();
    for (let index = 0; index < DEFAULT_CONCURRENCY + 3; index += 1) {
      void loader.add({ url: `/frame-${index}.png`, kind: "image" });
    }

    expect(FakeImage.inFlight()).toHaveLength(DEFAULT_CONCURRENCY);
  });

  it("never exceeds the cap, and starts the next asset as a slot frees", async () => {
    const loader = createAssetLoader({ concurrency: 2 });
    const pending = ["/a.png", "/b.png", "/c.png", "/d.png", "/e.png"].map(
      (url) => loader.add({ url, kind: "image" }),
    );

    expect(FakeImage.inFlight().map((image) => image.src)).toEqual([
      "/a.png",
      "/b.png",
    ]);

    imageFor("/a.png").succeed();
    await pending[0];
    expect(FakeImage.inFlight().map((image) => image.src)).toEqual([
      "/a.png",
      "/b.png",
      "/c.png",
    ]);

    // A failure frees its slot exactly like a success does.
    imageFor("/b.png").fail();
    await pending[1];
    expect(FakeImage.inFlight()).toHaveLength(4);

    imageFor("/c.png").succeed();
    imageFor("/d.png").succeed();
    await Promise.all([pending[2], pending[3]]);
    imageFor("/e.png").succeed();
    await pending[4];

    expect(loader.progress()).toBe(1);
    expect(images).toHaveLength(5);
  });
});

describe("createAssetLoader — settleAll", () => {
  it("resolves the pending add() promises, not merely the counter", async () => {
    const loader = createAssetLoader({ concurrency: 1 });
    const settled: string[] = [];
    const pending = ["/a.png", "/b.png", "/c.png"].map((url) =>
      loader.add({ url, kind: "image" }).then(() => settled.push(url)),
    );

    loader.settleAll();
    await Promise.all(pending);

    // Progress reaching 1 while these stayed pending is the exact failure this
    // rules out: a filled ring on a page that never reveals.
    expect(settled).toEqual(["/a.png", "/b.png", "/c.png"]);
    expect(loader.progress()).toBe(1);
    expect(loader.failures()).toEqual(["/a.png", "/b.png", "/c.png"]);
  });

  it("leaves an already-arrived asset alone", async () => {
    const loader = createAssetLoader();
    const pending = loader.add({ url: "/a.png", kind: "image" });
    const image = imageFor("/a.png");
    image.succeed();
    await pending;

    loader.settleAll();

    expect(loader.failures()).toEqual([]);
    expect(await pending).toBe(image);
  });
});

describe("createAssetLoader — release", () => {
  it("stops counting a released asset and lets a later add refetch it", async () => {
    const loader = createAssetLoader();
    const first = loader.add({ url: "/a.png", kind: "image" });
    imageFor("/a.png").succeed();
    await first;

    void loader.add({ url: "/b.png", kind: "image" });
    expect(loader.progress()).toBe(0.5);

    loader.release("/a.png");
    expect(loader.progress()).toBe(0);

    const again = loader.add({ url: "/a.png", kind: "image" });
    expect(again).not.toBe(first);
    expect(images.filter((image) => image.src === "/a.png")).toHaveLength(2);
  });

  it("settles a pending asset silently — a release is deliberate, not a failure", async () => {
    const loader = createAssetLoader();
    const pending = loader.add({ url: "/a.png", kind: "image" });

    loader.release("/a.png");
    await pending;

    expect(loader.failures()).toEqual([]);
    expect(console.warn).not.toHaveBeenCalled();
  });
});
