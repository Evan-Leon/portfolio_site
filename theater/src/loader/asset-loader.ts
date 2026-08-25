/*
 * The asset queue the loading ring watches.
 *
 * `SDS-006` in one file: everything the page waits on is declared here, so the
 * ring's number is the truth. A bare `fetch()` or `new Image()` in an adapter is
 * invisible to this module, which is why the loader — not the adapter — owns
 * image construction and decoding. That split is also what makes the
 * concurrency cap mean anything: an adapter that built its own `Image` would
 * open a connection outside the queue.
 *
 * THE TWO FAILURE MECHANISMS ARE SEPARATE, AND MUST STAY SEPARATE
 * ---------------------------------------------------------------
 *  1. **A failed asset settles, it does not reject.** A 404 or a decode error is
 *     known immediately and counts toward aggregate progress as *settled,
 *     unsuccessful*. The ring therefore reaches 1 and dismisses on its own. No
 *     timer is involved in this path.
 *  2. **A 4-second stall timeout** ({@link STALL_TIMEOUT_MS}) is the separate
 *     safety net for a request that neither resolves nor rejects — a hung
 *     connection. It is armed when a request actually starts, not when it is
 *     queued, so a long queue behind a small concurrency cap cannot time out
 *     while it is merely waiting its turn.
 *
 * Merging them (a single timer that "handles failures") would break case 1: a
 * 404 on a fast connection would hold the ring for four seconds for no reason.
 *
 * WHY `add()` NEVER REJECTS
 * -------------------------
 * A rejection propagates into the reveal path and is exactly the "page spins
 * forever" outcome the failure policy exists to prevent. Every settle is a
 * resolve: an image resolves with its (possibly never-loaded) element, and a
 * JSON or binary asset that failed resolves with {@link ASSET_UNAVAILABLE}.
 * Callers that need to know whether the bytes actually arrived read
 * `failures()`, or — for an image — `naturalWidth === 0`.
 */
import type { AssetSpec } from "../adapters/types";

/**
 * How many requests may be in flight at once.
 *
 * Six is the per-host connection limit browsers have settled on for HTTP/1.1,
 * so a larger cap buys nothing on the connection the frame sequences will
 * actually arrive over, and a smaller one leaves it idle. Import this rather
 * than writing `6` (`EVO-UNI-057`).
 */
export const DEFAULT_CONCURRENCY = 6;

/**
 * How long a single in-flight request may hang before it is settled anyway.
 *
 * Four seconds, from the design spec. This is *not* the failure path — see the
 * header. It only covers a request that never calls back at all.
 */
export const STALL_TIMEOUT_MS = 4000;

/**
 * What a non-image asset resolves to when it settled without its bytes.
 *
 * A symbol rather than `null` or `undefined` so a consumer cannot mistake it
 * for "the server legitimately returned nothing". An image never resolves to
 * this: it resolves to the `HTMLImageElement`, whose `naturalWidth` is `0` when
 * the load failed, because {@link AssetLoader.add}'s image overload promises an
 * element and a sentinel there would be a type lie.
 */
export const ASSET_UNAVAILABLE = Symbol("sds.asset-unavailable");

/** The queue every asset on the page goes through. */
export interface AssetLoader {
  /**
   * Queue an image. The loader constructs the element, sets `crossOrigin`,
   * awaits `decode()` where the browser has it, and resolves the decoded
   * element.
   *
   * Adding the same URL twice returns the first call's promise — the bytes are
   * fetched once and counted once.
   */
  add(spec: AssetSpec & { kind: "image" }): Promise<HTMLImageElement>;
  /** Queue a JSON or binary asset. Resolves with the parsed body, or {@link ASSET_UNAVAILABLE}. */
  add(spec: AssetSpec): Promise<unknown>;

  /** Settled assets over total assets, in 0..1. `1` when nothing is queued. */
  progress(): number;

  /** Subscribe to progress changes. Returns the unsubscribe function. */
  onProgress(cb: (fraction: number) => void): () => void;

  /**
   * Stop waiting: settle every still-pending asset as unsuccessful.
   *
   * **This resolves the individual `add()` promises**, not merely the progress
   * counter. Advancing the counter alone would fill the ring while the promises
   * the reveal actually awaits stayed pending forever — a page stuck at 100%.
   */
  settleAll(): void;

  /**
   * Forget an asset: drop the loader's reference to its decoded bytes and stop
   * counting it. A pending one is settled first, silently, so nothing awaiting
   * it is left hanging. A later `add()` of the same URL fetches again.
   */
  release(url: string): void;

  /**
   * URLs that settled without their bytes, in the order they failed.
   *
   * Not in the reveal path — this is what turns "something failed" into the
   * ring's dev-only warning state and the console's list of broken paths.
   */
  failures(): readonly string[];
}

/** One queued asset and the deferred promise handed to its caller. */
interface Entry {
  readonly url: string;
  readonly kind: AssetSpec["kind"];
  readonly promise: Promise<unknown>;
  readonly resolve: (value: unknown) => void;
  /**
   * Constructed at queue time for an image, so `settleAll()` on an asset that
   * never started still has an `HTMLImageElement` to resolve with.
   */
  image: HTMLImageElement | null;
  abort: AbortController | null;
  stallTimer: ReturnType<typeof setTimeout> | null;
  /** In flight — the difference between "waiting its turn" and "occupying a slot". */
  started: boolean;
  settled: boolean;
}

/**
 * Build an independent loader.
 *
 * Application code wants {@link sharedAssetLoader}; this exists so a test — and
 * SD11's second host — can have a queue with its own counters and its own cap.
 */
export function createAssetLoader(
  options: { concurrency?: number } = {},
): AssetLoader {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;

  const entries = new Map<string, Entry>();
  const waiting: Entry[] = [];
  const listeners = new Set<(fraction: number) => void>();
  const failed: string[] = [];
  let inFlight = 0;

  function add(spec: AssetSpec & { kind: "image" }): Promise<HTMLImageElement>;
  function add(spec: AssetSpec): Promise<unknown>;
  function add(spec: AssetSpec): Promise<unknown> {
    const existing = entries.get(spec.url);
    if (existing) return existing.promise;

    let resolve: (value: unknown) => void = () => {};
    const promise = new Promise<unknown>((settleWith) => {
      resolve = settleWith;
    });

    const entry: Entry = {
      url: spec.url,
      kind: spec.kind,
      promise,
      resolve,
      image: spec.kind === "image" ? new Image() : null,
      abort: null,
      stallTimer: null,
      started: false,
      settled: false,
    };

    entries.set(entry.url, entry);
    waiting.push(entry);
    pump();

    // The denominator just grew, so the fraction changed even though nothing
    // finished. Without this the ring holds a stale number until the next
    // settle, which on a slow first asset is the whole load.
    notify();

    return promise;
  }

  /** Start as many queued requests as the cap allows. */
  function pump(): void {
    while (inFlight < concurrency && waiting.length > 0) {
      const entry = waiting.shift();
      if (!entry || entry.settled) continue;

      inFlight += 1;
      entry.started = true;
      entry.abort = new AbortController();
      entry.stallTimer = setTimeout(() => {
        settleUnsuccessfully(entry);
      }, STALL_TIMEOUT_MS);

      if (entry.kind === "image") startImage(entry);
      else void startFetch(entry);
    }
  }

  function startImage(entry: Entry): void {
    const image = entry.image;
    if (!image) return;

    /*
     * `anonymous` on every image, deliberately. SD8 draws these into a canvas
     * and SD10 reads pixels back off it; an image fetched without CORS taints
     * the canvas and turns `getImageData()` into a `SecurityError`. The cost is
     * that a cross-origin host with no `Access-Control-Allow-Origin` header
     * fails here instead of loading — which the design spec already requires of
     * the CDN the frame sequences are served from.
     */
    image.crossOrigin = "anonymous";

    // Listeners before `src`: a warm-cache image can fire `load` synchronously
    // during the assignment, and a listener added afterwards never hears it.
    image.addEventListener(
      "load",
      () => {
        void finishImage(entry, image);
      },
      { once: true },
    );
    image.addEventListener(
      "error",
      () => {
        settleUnsuccessfully(entry);
      },
      { once: true },
    );

    image.src = entry.url;
  }

  async function finishImage(
    entry: Entry,
    image: HTMLImageElement,
  ): Promise<void> {
    try {
      // Decoding here rather than on first draw keeps the jank off the frame
      // loop. Not every engine implements it, so it is a capability check.
      if (typeof image.decode === "function") await image.decode();
    } catch {
      settleUnsuccessfully(entry);
      return;
    }
    settle(entry, image);
  }

  async function startFetch(entry: Entry): Promise<void> {
    try {
      const response = await fetch(entry.url, {
        signal: entry.abort?.signal ?? null,
      });
      if (!response.ok) {
        settleUnsuccessfully(entry);
        return;
      }
      settle(
        entry,
        entry.kind === "json"
          ? await response.json()
          : await response.arrayBuffer(),
      );
    } catch {
      // Includes the abort a stall timeout fires, which has already settled the
      // entry — `settleUnsuccessfully` is idempotent, so this costs nothing.
      settleUnsuccessfully(entry);
    }
  }

  function settle(entry: Entry, value: unknown): void {
    if (entry.settled) return;
    entry.settled = true;

    if (entry.stallTimer !== null) {
      clearTimeout(entry.stallTimer);
      entry.stallTimer = null;
    }

    if (entry.started) {
      entry.started = false;
      inFlight -= 1;
      pump();
    }

    entry.resolve(value);
    notify();
  }

  function settleUnsuccessfully(entry: Entry): void {
    if (entry.settled) return;

    failed.push(entry.url);
    // Logged in every build. Under a dev build the ring says so as well; in
    // production the console is the only place a broken path shows up, and a
    // visitor is shown nothing.
    console.warn(`[sds] asset settled without its bytes: ${entry.url}`);

    entry.abort?.abort();
    settle(entry, entry.image ?? ASSET_UNAVAILABLE);
  }

  function notify(): void {
    const fraction = progress();
    for (const listener of listeners) listener(fraction);
  }

  function progress(): number {
    if (entries.size === 0) return 1;

    let settled = 0;
    for (const entry of entries.values()) if (entry.settled) settled += 1;
    return settled / entries.size;
  }

  return {
    add,

    progress,

    onProgress(cb: (fraction: number) => void): () => void {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },

    settleAll(): void {
      for (const entry of entries.values()) settleUnsuccessfully(entry);
    },

    release(url: string): void {
      const entry = entries.get(url);
      if (!entry) return;

      // Settled silently: a release is deliberate, not a failure, so it must
      // not end up in `failures()` and colour the ring.
      entry.abort?.abort();
      settle(entry, entry.image ?? ASSET_UNAVAILABLE);

      entry.image = null;
      entries.delete(url);
      notify();
    },

    failures(): readonly string[] {
      return failed;
    },
  };
}

/**
 * The loader the page uses.
 *
 * A module-level singleton on purpose. An adapter has no handle on the engine,
 * so without this it would build a private loader — `SDS-006` would read as
 * satisfied while the ring's progress silently excluded every frame image it
 * was supposed to be waiting for.
 */
export const sharedAssetLoader: AssetLoader = createAssetLoader();
