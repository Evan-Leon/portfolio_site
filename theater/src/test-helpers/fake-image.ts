/*
 * A controllable `Image`, shared by every test that goes through the asset
 * loader.
 *
 * WHY ANY TEST TOUCHING THE LOADER NEEDS ONE
 * ------------------------------------------
 * jsdom fetches nothing. A real `img.src = …` there never fires `load` and
 * never fires `error`, so an image queued through `sharedAssetLoader` settles
 * only when its 4-second stall timeout expires — which is coincidentally the
 * exact hang that timeout exists for, and against Vitest's 5-second default it
 * turns eight posters into a failed run rather than a slow one.
 *
 * WHY IT IS A REAL `<img>` ELEMENT AND NOT AN `EventTarget` SUBCLASS
 * ------------------------------------------------------------------
 * The conformance kit (`adapters/adapter-contract.ts`) reports a listener as
 * leaked unless its target is a `Node` that is no longer connected —
 * `targetOutlivesScene` returns `true` for anything that is not a `Node` at
 * all. The loader adds `load` and `error` listeners to every image it builds,
 * with `{ once: true }`, which the DOM removes internally without ever calling
 * `removeEventListener`. A plain `EventTarget` fake therefore leaves two
 * listeners on an unrecognisable target per image, and the lot's contract run
 * fails `cleanup-listeners` with sixteen findings that describe nothing real.
 * A detached `<img>` is a `Node`, is never connected, and is what the browser
 * actually hands the loader.
 *
 * `src` is overridden with an own accessor that stores the raw string. The
 * inherited one reflects through the `src` *attribute* and gives back an
 * absolute URL (`http://localhost:3000/a.png`), which no test wants to write
 * out — and `inFlight()` distinguishes "queued" from "requested" by whether
 * `src` was assigned at all.
 *
 * `naturalWidth`/`naturalHeight` are per-instance accessors because jsdom's are
 * read-only zeros. The lot reads them to tell a real screenshot from a
 * placeholder that decoded successfully (`EVO-UNI-053`), so a fake that could
 * not report a size could not exercise that path.
 *
 * There is deliberately no `decode()`: jsdom has none either, and the loader
 * capability-checks it, so its absence keeps a settle synchronous with the
 * event that caused it — several existing tests assert on the queue state
 * immediately after calling `succeed()`.
 */

/** The dimensions a settled image reports. */
export interface FakeImageSize {
  width: number;
  height: number;
}

/** One image the loader built, with the two outcomes under test control. */
export interface FakeImage extends HTMLImageElement {
  /** Fire `load`, reporting `size` as the decoded dimensions. */
  succeed(size?: FakeImageSize): void;
  /** Fire `error`, as a 404 or a decode failure would. */
  fail(): void;
}

/** How a registry of fakes behaves. */
export interface FakeImagesOptions {
  /**
   * Settle every request on its own, as soon as `src` is assigned.
   *
   * Return a size to succeed, or `null` to fail. Required wherever the test
   * cannot reach the images by hand — the conformance kit calls `load()`
   * itself, so nothing in the test body runs between the request and the await.
   *
   * Omit it for the manual mode: nothing settles until `succeed()`/`fail()` is
   * called, which is what a test about queueing and concurrency needs.
   */
  autoSettle?: (url: string) => FakeImageSize | null;

  /** What `succeed()` reports when given no size. Defaults to 1280 × 800. */
  defaultSize?: FakeImageSize;
}

/** The `Image` replacement plus the handles a test reaches it through. */
export interface FakeImages {
  /** Pass this to `vi.stubGlobal('Image', …)`. */
  readonly Image: new () => HTMLImageElement;
  /** Every image constructed so far, oldest first. */
  all(): readonly FakeImage[];
  /** Those whose `src` has been assigned — the requests actually in flight. */
  inFlight(): readonly FakeImage[];
  /** The image built for `url`, or a thrown error naming what was asked for. */
  for(url: string): FakeImage;
}

/** A landscape screenshot, comfortably past every "is this real" threshold. */
const DEFAULT_SIZE: FakeImageSize = { width: 1280, height: 800 };

/**
 * Build an isolated registry of fake images.
 *
 * One per test — the registry is the state, so a fresh call in `beforeEach` is
 * what keeps one test's images out of the next one's assertions
 * (`EVO-UNI-044`).
 *
 * ```ts
 * let fake: FakeImages
 *
 * beforeEach(() => {
 *   fake = createFakeImages({ autoSettle: () => ({ width: 1280, height: 800 }) })
 *   vi.stubGlobal('Image', fake.Image)
 * })
 * ```
 */
export function createFakeImages(options: FakeImagesOptions = {}): FakeImages {
  const { autoSettle, defaultSize = DEFAULT_SIZE } = options;
  const constructed: FakeImage[] = [];

  function build(): FakeImage {
    const image = document.createElement("img") as FakeImage;

    let src = "";
    let width = 0;
    let height = 0;

    Object.defineProperty(image, "src", {
      configurable: true,
      get: () => src,
      set: (value: string) => {
        src = value;
        /* A microtask, not synchronous: assigning `src` inside the loader's own
         * `startImage` must not settle the entry before `pump()` has finished
         * accounting for it. A real warm-cache image can fire during the
         * assignment, but nothing here is testing that. */
        if (autoSettle) {
          queueMicrotask(() => {
            const size = autoSettle(src);
            if (size) image.succeed(size);
            else image.fail();
          });
        }
      },
    });

    Object.defineProperty(image, "naturalWidth", {
      configurable: true,
      get: () => width,
    });
    Object.defineProperty(image, "naturalHeight", {
      configurable: true,
      get: () => height,
    });

    image.succeed = (size: FakeImageSize = defaultSize): void => {
      width = size.width;
      height = size.height;
      image.dispatchEvent(new Event("load"));
    };
    image.fail = (): void => {
      image.dispatchEvent(new Event("error"));
    };

    return image;
  }

  /*
   * A class expression so `new Image()` has a `[[Construct]]` to call — an
   * arrow function does not, and the failure is a "not a constructor" TypeError
   * from inside the loader rather than anything that names the fake
   * (`EVO-FE-150`). Returning an object from a constructor is what makes the
   * instance a real `<img>`.
   */
  const ImageConstructor = class {
    constructor() {
      const image = build();
      constructed.push(image);
      return image;
    }
  } as unknown as new () => HTMLImageElement;

  return {
    Image: ImageConstructor,

    all: () => constructed,

    inFlight: () => constructed.filter((image) => image.src !== ""),

    for: (url: string): FakeImage => {
      const image = constructed.find((candidate) => candidate.src === url);
      if (!image) {
        throw new Error(
          `No image was requested for ${url}. Requested: ` +
            `${constructed.map((candidate) => candidate.src || "(unsent)").join(", ") || "(none)"}`,
        );
      }
      return image;
    },
  };
}
