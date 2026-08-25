/*
 * The adapter conformance kit — the executable form of `SDS-003`.
 *
 * WHY THIS IS PRODUCTION CODE AND NOT A TEST FILE
 * -----------------------------------------------
 * The collaborator imports it from his own test files, months from now, in a
 * repository nobody here owns. A module under a test-only glob could not be
 * shipped to him. So it lives in `src/adapters/`, is re-exported from
 * `src/index.ts`, and is allowed to import from 'vitest' — which is also why
 * `src/main.ts` must never reach it, directly or transitively: that import path
 * would drag the whole test runner into `dist/` and into SD11's single-file Wix
 * bundle.
 *
 * TWO LAYERS, AND THE SPLIT IS LOAD-BEARING
 * -----------------------------------------
 * `checkAdapterContract` is the pure async core: it runs every check and
 * RESOLVES a list of findings. `adapterContract` is the thin Vitest wrapper
 * that asserts the list is empty.
 *
 * The split exists so the kit's own failure mode is testable. There is no
 * supported way to invoke a nested `describe`/`it` tree in the middle of a test
 * and capture its failures, so with only the wrapper, "prove the gate rejects a
 * broken adapter" could not be written as anything but a vacuous assertion. With
 * the core, `adapter-contract.test.ts` feeds it deliberately broken fixtures and
 * asserts exactly which checks fire.
 *
 * IT IS ASYNC BECAUSE `load()` IS
 * -------------------------------
 * A synchronous checker structurally cannot reach the asynchronous half of the
 * interface: behaviour after loading settles, teardown following a real
 * completed load, handles registered *during* loading, or the load-failure path.
 * All four would go unexercised while the suite reported green.
 *
 * WHAT IT CANNOT SEE, AND WHAT IT DOES ABOUT THAT
 * -----------------------------------------------
 * The kit cannot look inside a canvas, a Lottie renderer or a GSAP timeline. So
 * idempotence and order-independence — the two checks `SDS-001` exists for — are
 * evaluated against whatever the caller's `observe` callback returns: the
 * canvas draw target, `anim.currentFrame`, `timeline.progress()`. Each adapter's
 * own test supplies it.
 *
 * Without an observer those two checks cannot run, and the kit says so by
 * emitting a violation-shaped note rather than passing silently. That means
 * `checkAdapterContract(factory)` with no observer never resolves `[]`. It is
 * meant to: a green contract badge you can earn without letting the kit see any
 * state would be worth nothing.
 *
 * Note also what is deliberately NOT how observation works: the kit never diffs
 * a canvas mock's call history. Drawing the same frame twice legitimately
 * produces two identical calls, so that technique fails correct adapters.
 *
 * LIMITS WORTH KNOWING BEFORE YOU TRUST A GREEN RUN
 * -------------------------------------------------
 *  - It instruments `requestAnimationFrame`, the timer functions and
 *    `EventTarget.prototype.addEventListener` globally for the duration of a
 *    check, so two checks must not run concurrently. Vitest runs tests within a
 *    file sequentially, which is the case that matters.
 *  - A `load()` that never settles hangs the checker. That surfaces as Vitest's
 *    own per-test timeout, which is a clear enough failure that a second timeout
 *    mechanism here would only add a timer to get wrong.
 *  - It runs in jsdom, which has no layout engine. Nothing here can tell you the
 *    animation looks right — only that it is scrubbable, reversible and clean.
 *    Pixels are SD10's Playwright suite.
 */
import { describe, expect, it } from "vitest";
import type { AdapterFactory, AnimationAdapter } from "./types";

/** One thing an adapter does that the contract forbids. */
export interface ContractViolation {
  /** Stable check name — one of {@link CONTRACT_CHECKS}'s values. */
  check: string;
  /** What happened, in enough detail to act on without re-running. */
  detail: string;
}

/**
 * Reads an adapter's observable state.
 *
 * Return a plain, comparable snapshot — numbers, strings, or an object of them.
 * Not a live DOM node: two different canvases both serialize to `{}`, so an
 * observer that returns one makes every state look identical and every check
 * pass. The kit rejects that rather than accepting it.
 */
export type ObserveState = (adapter: AnimationAdapter) => unknown;

/** Options for the Vitest wrapper. */
export interface AdapterContractOptions {
  /** Name shown in the test output. Defaults to `'adapter'`. */
  name?: string;
  /** How to read the adapter's visual state. Without it the visual checks are reported unverified. */
  observe?: ObserveState;
}

/**
 * The canonical check names.
 *
 * Import these rather than writing the strings by hand (`EVO-UNI-057`) — a
 * typo'd literal in a test silently matches nothing.
 */
export const CONTRACT_CHECKS = {
  construction: "construction",
  loadResolves: "load-resolves",
  seekBoundaries: "seek-boundaries",
  seekOutOfRange: "seek-out-of-range",
  seekIdempotent: "seek-idempotent",
  seekOrderIndependent: "seek-order-independent",
  resizeBeforeLoad: "resize-before-load",
  resize: "resize",
  resizeAfterDestroy: "resize-after-destroy",
  destroy: "destroy",
  cleanupAnimationFrames: "cleanup-animation-frames",
  cleanupTimers: "cleanup-timers",
  cleanupListeners: "cleanup-listeners",
  containerContainment: "container-containment",
  visualStateUnverified: "visual-state-unverified",
  observeThrew: "observe-threw",
  observeNotComparable: "observe-not-comparable",
  observeNotDiscriminating: "observe-not-discriminating",
} as const;

/* Progress used for the idempotence check. Deliberately not a boundary, not a
 * round fraction, and not one of the order-independence points — an adapter
 * that special-cases 0, 0.5 or 1 must not be able to pass by coincidence. */
const IDEMPOTENCE_PROGRESS = 0.42;

/* The three points order-independence is pinned at, and the sweep that visits
 * them forwards and then backwards. The reverse half is the half that matters:
 * it is what backwards scrubbing does, and what a delta-accumulating adapter
 * gets wrong. */
const ORDER_POINTS = [0, 0.5, 1] as const;
const ORDER_SWEEP = [0, 0.5, 1, 0.5, 0] as const;

/** Values outside 0..1 an adapter must tolerate by clamping. */
const OUT_OF_RANGE = [-0.1, 1.1] as const;

/** Sizes handed to `resize`, chosen only to be distinguishable from each other. */
const SIZE_WHILE_LOADING = { width: 1024, height: 768 } as const;
const SIZE_AFTER_LOAD = { width: 800, height: 600 } as const;
const SIZE_AFTER_DESTROY = { width: 640, height: 480 } as const;

const REQUIRED_METHODS = ["load", "seek", "resize", "destroy"] as const;

/**
 * Run every contract check against `factory` and resolve the findings.
 *
 * Resolves `[]` for a conforming adapter **when an observer is supplied**.
 * Without one it always resolves at least the `visual-state-unverified` note;
 * see the module header for why that is deliberate.
 *
 * ```ts
 * const violations = await checkAdapterContract(
 *   placeholder('Product'),
 *   (adapter) => (adapter as FrameSequenceAdapter).drawnFrame,
 * )
 * ```
 *
 * The checker mounts adapters into throwaway containers under `document.body`
 * and removes them again, restoring every global it patched — including
 * cancelling handles a broken adapter left running, so one failing adapter
 * cannot degrade the rest of the run.
 */
export async function checkAdapterContract(
  factory: AdapterFactory,
  observe?: ObserveState,
): Promise<ContractViolation[]> {
  const violations: ContractViolation[] = [];

  const usable = await runLifecycleChecks(factory, violations);
  // An adapter that could not be constructed has no observable state to check
  // and no lifecycle to reason about — reporting anything further would be
  // noise on top of the one finding that matters.
  if (!usable) return violations;

  if (observe) await runStateChecks(factory, observe, violations);
  else {
    violations.push({
      check: CONTRACT_CHECKS.visualStateUnverified,
      detail:
        "Idempotence and order-independence were NOT verified: no `observe` callback was " +
        "supplied, so the kit had no way to read this adapter's visual state. Pass " +
        "`observe` — for example `(adapter) => (adapter as MyAdapter).currentFrame` — to " +
        "check the two properties SDS-001 exists for.",
    });
  }

  return violations;
}

/**
 * The Vitest wrapper. Call it at the top level of an adapter's test file.
 *
 * ```ts
 * adapterContract(placeholder('Intro'), {
 *   name: 'placeholder',
 *   observe: (adapter) => (adapter as PlaceholderAdapter).snapshot(),
 * })
 * ```
 */
export function adapterContract(
  factory: AdapterFactory,
  options: AdapterContractOptions = {},
): void {
  const name = options.name ?? "adapter";

  describe(`adapter contract — ${name}`, () => {
    it("has no contract violations", async () => {
      const violations = await checkAdapterContract(factory, options.observe);

      // Asserted as formatted text rather than `toEqual([])` so a failure prints
      // every finding's detail instead of an object diff.
      expect(formatViolations(violations)).toBe("");
    });
  });
}

function formatViolations(violations: readonly ContractViolation[]): string {
  return violations
    .map((violation) => `[${violation.check}] ${violation.detail}`)
    .join("\n");
}

/* ------------------------------------------------------------------ *
 * The lifecycle trial
 *
 * One adapter, taken through construct → load → seek → destroy with the
 * environment instrumented, covering every check that does not need to see
 * visual state. Returns false when the adapter could not be constructed.
 * ------------------------------------------------------------------ */

async function runLifecycleChecks(
  factory: AdapterFactory,
  violations: ContractViolation[],
): Promise<boolean> {
  const container = createContainer();
  const outsideBefore = nodesOutside(container);
  const instruments = instrument();

  try {
    let adapter: AnimationAdapter;
    try {
      adapter = factory(container);
    } catch (error) {
      violations.push({
        check: CONTRACT_CHECKS.construction,
        detail: `factory(container) threw ${describeError(error)}`,
      });
      return false;
    }

    const missing = REQUIRED_METHODS.filter(
      (method) =>
        typeof (adapter as unknown as Record<string, unknown>)[method] !==
        "function",
    );
    if (missing.length > 0) {
      violations.push({
        check: CONTRACT_CHECKS.construction,
        detail: `the object returned by factory(container) is missing ${missing.join(", ")}`,
      });
      return false;
    }

    /* --- load, with a resize landing while it is still pending --- */

    let loading: Promise<void> | undefined;
    try {
      loading = Promise.resolve(adapter.load(() => {}));
    } catch (error) {
      violations.push({
        check: CONTRACT_CHECKS.loadResolves,
        detail: `load(onProgress) threw synchronously: ${describeError(error)}`,
      });
    }

    attempt(violations, CONTRACT_CHECKS.resizeBeforeLoad, [
      [
        `resize(${SIZE_WHILE_LOADING.width}, ${SIZE_WHILE_LOADING.height}) while load() was still pending`,
        () =>
          adapter.resize(SIZE_WHILE_LOADING.width, SIZE_WHILE_LOADING.height),
      ],
    ]);

    if (loading) {
      try {
        await loading;
      } catch (error) {
        violations.push({
          check: CONTRACT_CHECKS.loadResolves,
          detail:
            `load(onProgress) rejected with ${describeError(error)}. A failed asset must settle ` +
            "as unsuccessful and resolve — the page has to reveal either way (SDS-006).",
        });
      }
    }

    /* --- the seek contract --- */

    attempt(violations, CONTRACT_CHECKS.resize, [
      [
        `resize(${SIZE_AFTER_LOAD.width}, ${SIZE_AFTER_LOAD.height}) after load() resolved`,
        () => adapter.resize(SIZE_AFTER_LOAD.width, SIZE_AFTER_LOAD.height),
      ],
    ]);

    attempt(
      violations,
      CONTRACT_CHECKS.seekBoundaries,
      [0, 1].map(
        (progress) =>
          [`seek(${progress})`, () => adapter.seek(progress)] as const,
      ),
    );

    attempt(
      violations,
      CONTRACT_CHECKS.seekOutOfRange,
      OUT_OF_RANGE.map(
        (progress) =>
          [`seek(${progress})`, () => adapter.seek(progress)] as const,
      ),
    );

    /* --- SDS-002: nothing outside the container --- */

    const escaped = new Set(added(outsideBefore, nodesOutside(container)));

    /* --- teardown --- */

    attempt(violations, CONTRACT_CHECKS.destroy, [
      ["destroy()", () => adapter.destroy()],
    ]);

    for (const node of added(outsideBefore, nodesOutside(container)))
      escaped.add(node);

    if (escaped.size > 0) {
      violations.push({
        check: CONTRACT_CHECKS.containerContainment,
        detail:
          `added ${plural(escaped.size, "node")} outside the container it was given ` +
          `(${[...escaped].map(describeNode).join(", ")}). An adapter never touches the DOM ` +
          "outside its own container (SDS-002).",
      });
    }

    // The engine removes a scene's container when it unmounts, so do that before
    // judging what is still live: a listener on a node the adapter is discarding
    // is unreachable, while one on `window` or `document` is a real leak.
    container.remove();

    attempt(violations, CONTRACT_CHECKS.resizeAfterDestroy, [
      [
        `resize(${SIZE_AFTER_DESTROY.width}, ${SIZE_AFTER_DESTROY.height}) after destroy()`,
        () =>
          adapter.resize(SIZE_AFTER_DESTROY.width, SIZE_AFTER_DESTROY.height),
      ],
    ]);

    reportLeaks(instruments.outstanding(), violations);

    return true;
  } finally {
    instruments.restore();
    container.remove();
  }
}

function reportLeaks(
  leaks: OutstandingWork,
  violations: ContractViolation[],
): void {
  if (leaks.animationFrames > 0) {
    violations.push({
      check: CONTRACT_CHECKS.cleanupAnimationFrames,
      detail:
        `destroy() left ${plural(leaks.animationFrames, "animation frame request")} outstanding. ` +
        "Keep the handle from requestAnimationFrame and cancelAnimationFrame it in destroy().",
    });
  }

  if (leaks.timeouts > 0 || leaks.intervals > 0) {
    violations.push({
      check: CONTRACT_CHECKS.cleanupTimers,
      detail:
        `destroy() left ${plural(leaks.timeouts, "timeout")} and ` +
        `${plural(leaks.intervals, "interval")} outstanding.`,
    });
  }

  if (leaks.listeners.length > 0) {
    violations.push({
      check: CONTRACT_CHECKS.cleanupListeners,
      detail:
        `destroy() left ${plural(leaks.listeners.length, "event listener")} registered on a ` +
        `target that outlives the scene: ` +
        `${leaks.listeners.map((entry) => `'${entry.type}' on ${describeTarget(entry.target)}`).join(", ")}.`,
    });
  }
}

/* ------------------------------------------------------------------ *
 * The state trials — SDS-001
 *
 * Each trial gets its OWN adapter instance, so a check cannot pass because a
 * previous check happened to leave the adapter in the right state.
 * ------------------------------------------------------------------ */

async function runStateChecks(
  factory: AdapterFactory,
  observe: ObserveState,
  violations: ContractViolation[],
): Promise<void> {
  // The first observer failure ends the state checks. Reporting it once, rather
  // than once per trial, keeps the finding readable — and every later trial
  // would fail for the same reason anyway.
  let observerFailure: ContractViolation | null = null;

  /** Seek each progress in turn on a fresh adapter; observe after each. */
  const sample = async (
    progresses: readonly number[],
  ): Promise<string[] | null> => {
    if (observerFailure) return null;

    const trial = await mountTrial(factory);
    // A construction, load or resize failure here was already reported by the
    // lifecycle trial. Staying silent avoids duplicating it.
    if (!trial) return null;

    const states: string[] = [];
    try {
      for (const progress of progresses) {
        try {
          trial.adapter.seek(progress);
        } catch {
          return null; // already reported as seek-boundaries / seek-out-of-range
        }

        const observation = readState(trial.adapter, observe);
        if (!observation.ok) {
          observerFailure = observation.violation;
          return null;
        }
        states.push(observation.state);
      }
    } finally {
      trial.release();
    }

    return states;
  };

  /* --- idempotence: twice must equal once --- */

  const once = await sample([IDEMPOTENCE_PROGRESS]);
  const twice = await sample([IDEMPOTENCE_PROGRESS, IDEMPOTENCE_PROGRESS]);

  if (once && twice && last(once) !== last(twice)) {
    violations.push({
      check: CONTRACT_CHECKS.seekIdempotent,
      detail:
        `seek(${IDEMPOTENCE_PROGRESS}) twice left a different observed state than ` +
        `seek(${IDEMPOTENCE_PROGRESS}) once — once: ${last(once)}, twice: ${last(twice)}. ` +
        "seek must be absolute: the same progress always produces the same frame (SDS-001).",
    });
  }

  /* --- order independence: the sweep must match the isolated seeks --- */

  const isolated = new Map<number, string>();
  for (const progress of ORDER_POINTS) {
    const states = await sample([progress]);
    if (!states) break;
    isolated.set(progress, last(states));
  }

  const swept =
    isolated.size === ORDER_POINTS.length ? await sample(ORDER_SWEEP) : null;

  if (swept) {
    const mismatches = ORDER_SWEEP.map((progress, step) => ({
      progress,
      step,
      expected: isolated.get(progress),
      actual: swept[step],
    })).filter((entry) => entry.expected !== entry.actual);

    if (mismatches.length > 0) {
      violations.push({
        check: CONTRACT_CHECKS.seekOrderIndependent,
        detail:
          `seeking ${ORDER_SWEEP.join(" → ")} did not reproduce the state each of those values ` +
          `produces on its own: ` +
          `${mismatches
            .map(
              (entry) =>
                `at step ${entry.step} (progress ${entry.progress}) expected ${entry.expected}, got ${entry.actual}`,
            )
            .join("; ")}. ` +
          "This is what breaks backwards scrubbing, and it is what an adapter that accumulates " +
          "across seeks gets wrong (SDS-001).",
      });
    }
  }

  if (observerFailure) {
    violations.push(observerFailure);
    return;
  }

  /* --- the observer's own honesty: does it distinguish anything? --- */

  const distinct = new Set(isolated.values());
  if (isolated.size === ORDER_POINTS.length && distinct.size === 1) {
    violations.push({
      check: CONTRACT_CHECKS.observeNotDiscriminating,
      detail:
        `observe(adapter) returned the same state (${[...distinct][0]}) at progress ` +
        `${ORDER_POINTS.join(", ")}. Every idempotence and order-independence check would pass ` +
        "against it whatever the adapter does, so it verifies nothing (EVO-UNI-018). Return " +
        "something that actually changes as the animation scrubs.",
    });
  }
}

interface MountedTrial {
  adapter: AnimationAdapter;
  release(): void;
}

/** Construct, size and load an adapter over a throwaway container. */
async function mountTrial(
  factory: AdapterFactory,
): Promise<MountedTrial | null> {
  const container = createContainer();

  try {
    const adapter = factory(container);
    const loading = Promise.resolve(adapter.load(() => {}));
    adapter.resize(SIZE_WHILE_LOADING.width, SIZE_WHILE_LOADING.height);
    await loading;

    return {
      adapter,
      release: () => {
        try {
          adapter.destroy();
        } catch {
          // Reported by the lifecycle trial; nothing to add here.
        }
        container.remove();
      },
    };
  } catch {
    container.remove();
    return null;
  }
}

type Observation =
  { ok: true; state: string } | { ok: false; violation: ContractViolation };

function readState(
  adapter: AnimationAdapter,
  observe: ObserveState,
): Observation {
  let raw: unknown;
  try {
    raw = observe(adapter);
  } catch (error) {
    return {
      ok: false,
      violation: {
        check: CONTRACT_CHECKS.observeThrew,
        detail: `observe(adapter) threw ${describeError(error)}`,
      },
    };
  }

  try {
    return {
      ok: true,
      state: JSON.stringify(raw, stateReplacer) ?? "undefined",
    };
  } catch (error) {
    return {
      ok: false,
      violation: {
        check: CONTRACT_CHECKS.observeNotComparable,
        detail:
          `observe(adapter) returned a value the kit cannot compare: ` +
          `${error instanceof NotComparable ? error.message : describeError(error)}. ` +
          "Return a plain snapshot — numbers, strings, or an object of them.",
      },
    };
  }
}

/** Thrown out of the JSON replacer for values that would compare falsely equal. */
class NotComparable extends Error {}

function stateReplacer(_key: string, value: unknown): unknown {
  // A DOM node serializes to `{}`, so two entirely different canvases would
  // compare equal and every state check would pass vacuously.
  if (value instanceof Node) {
    return neverComparable(
      `a live DOM node (<${value.nodeName.toLowerCase()}>)`,
    );
  }
  if (typeof value === "function") return neverComparable("a function");
  if (typeof value === "number" && !Number.isFinite(value))
    return String(value);
  if (typeof value === "bigint") return `${value}n`;
  return value;
}

function neverComparable(what: string): never {
  throw new NotComparable(what);
}

/* ------------------------------------------------------------------ *
 * Instrumentation
 *
 * Patches the four ways an adapter can leave work running, counts what it
 * registered, and restores everything afterwards. Global for the duration of a
 * check, so two checks must not overlap.
 * ------------------------------------------------------------------ */

interface ListenerRecord {
  target: EventTarget;
  type: string;
  callback: EventListenerOrEventListenerObject | null;
  capture: boolean;
  signal: AbortSignal | undefined;
}

interface OutstandingWork {
  animationFrames: number;
  timeouts: number;
  intervals: number;
  listeners: ListenerRecord[];
}

interface Instruments {
  outstanding(): OutstandingWork;
  restore(): void;
}

type AddListener = typeof EventTarget.prototype.addEventListener;
type RemoveListener = typeof EventTarget.prototype.removeEventListener;

/**
 * `window` in jsdom is not an `EventTarget` instance and carries its own
 * `addEventListener`, so patching the prototype alone misses every listener an
 * adapter puts on `window` — which is the most common leak there is. Both entry
 * points are patched, unless they are the same function (a browser-like
 * environment), where patching twice would double-count.
 */
const windowTarget = globalThis as unknown as {
  addEventListener: AddListener;
  removeEventListener: RemoveListener;
};

function instrument(): Instruments {
  const realRequestAnimationFrame = globalThis.requestAnimationFrame;
  const realCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  const realSetInterval = globalThis.setInterval;
  const realClearInterval = globalThis.clearInterval;
  const realAddEventListener = EventTarget.prototype.addEventListener;
  const realRemoveEventListener = EventTarget.prototype.removeEventListener;
  const realWindowAddEventListener = windowTarget.addEventListener;
  const realWindowRemoveEventListener = windowTarget.removeEventListener;
  const windowHasOwnListenerApi =
    realWindowAddEventListener !== realAddEventListener;

  const frames = new Set<number>();
  const timeouts = new Set<number>();
  const intervals = new Set<number>();
  const listeners: ListenerRecord[] = [];

  /*
   * Host APIs schedule timers of their own. jsdom in particular drives
   * `requestAnimationFrame` from a `setInterval` it arms lazily on the first
   * request — which the patch below would otherwise attribute to the adapter and
   * report as a leaked interval alongside the rAF handle. Anything scheduled
   * while a real host call is on the stack is the host's, not the adapter's.
   */
  let insideHostCall = 0;
  const shielded = <T>(run: () => T): T => {
    insideHostCall += 1;
    try {
      return run();
    } finally {
      insideHostCall -= 1;
    }
  };

  const recordListener = (
    target: EventTarget,
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void => {
    listeners.push({
      target,
      type,
      callback,
      capture: capturePhase(options),
      signal:
        typeof options === "object" && options !== null
          ? options.signal
          : undefined,
    });
  };

  const forgetListener = (
    target: EventTarget,
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void => {
    const capture = capturePhase(options);
    const index = listeners.findIndex(
      (entry) =>
        entry.target === target &&
        entry.type === type &&
        entry.callback === callback &&
        entry.capture === capture,
    );
    if (index >= 0) listeners.splice(index, 1);
  };

  globalThis.requestAnimationFrame = (
    callback: FrameRequestCallback,
  ): number => {
    const handle = shielded(() =>
      realRequestAnimationFrame((time) => {
        // A frame that has already run is not outstanding. A callback that
        // re-requests inside itself registers the new handle, which is exactly
        // how a never-cancelled rAF loop stays visible here.
        frames.delete(handle);
        callback(time);
      }),
    );
    frames.add(handle);
    return handle;
  };

  globalThis.cancelAnimationFrame = (handle: number): void => {
    frames.delete(handle);
    shielded(() => realCancelAnimationFrame(handle));
  };

  globalThis.setTimeout = ((
    handler: TimerHandler,
    timeout?: number,
    ...args: unknown[]
  ) => {
    if (insideHostCall > 0) return realSetTimeout(handler, timeout, ...args);

    let id = -1;
    id = realSetTimeout(
      ((...called: unknown[]) => {
        timeouts.delete(id);
        if (typeof handler === "function")
          (handler as (...a: unknown[]) => void)(...called);
      }) as TimerHandler,
      timeout,
      ...args,
    );
    timeouts.add(id);
    return id;
  }) as typeof globalThis.setTimeout;

  /*
   * The handle is forgotten whenever one was passed at all — deliberately NOT
   * behind a `typeof id === 'number'` check.
   *
   * `lib.dom` types `setTimeout` as returning a `number`, and under Vitest's
   * jsdom environment it is Node's `setTimeout`, which returns a `Timeout`
   * OBJECT. A `typeof` guard therefore compiles cleanly, matches nothing at
   * runtime, and silently removes no handle from the set — so every timer an
   * adapter armed AND CLEARED was still reported as outstanding. Found in SD8,
   * where the frame-sequence adapter loads through the asset loader's per-asset
   * stall timers and a correct adapter was accused of leaking one timeout per
   * frame. The set holds whatever the host returned, so deleting that same value
   * is right for both shapes.
   */
  globalThis.clearTimeout = ((id?: number): void => {
    if (id !== undefined) timeouts.delete(id);
    realClearTimeout(id);
  }) as typeof globalThis.clearTimeout;

  globalThis.setInterval = ((
    handler: TimerHandler,
    timeout?: number,
    ...args: unknown[]
  ) => {
    const id = realSetInterval(handler, timeout, ...args);
    if (insideHostCall === 0) intervals.add(id);
    return id;
  }) as typeof globalThis.setInterval;

  /** Same handle-shape trap as `clearTimeout` above. */
  globalThis.clearInterval = ((id?: number): void => {
    if (id !== undefined) intervals.delete(id);
    realClearInterval(id);
  }) as typeof globalThis.clearInterval;

  EventTarget.prototype.addEventListener = function (
    this: EventTarget,
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    recordListener(this, type, callback, options);
    realAddEventListener.call(this, type, callback, options);
  };

  EventTarget.prototype.removeEventListener = function (
    this: EventTarget,
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    forgetListener(this, type, callback, options);
    realRemoveEventListener.call(this, type, callback, options);
  };

  if (windowHasOwnListenerApi) {
    windowTarget.addEventListener = function (
      this: EventTarget,
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      recordListener(this, type, callback, options);
      realWindowAddEventListener.call(this, type, callback, options);
    };

    windowTarget.removeEventListener = function (
      this: EventTarget,
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ): void {
      forgetListener(this, type, callback, options);
      realWindowRemoveEventListener.call(this, type, callback, options);
    };
  }

  return {
    outstanding: (): OutstandingWork => ({
      animationFrames: frames.size,
      timeouts: timeouts.size,
      intervals: intervals.size,
      // A listener on a node the adapter discarded is unreachable, and one
      // removed through an aborted AbortSignal is already gone — neither is a
      // leak, and reporting them would fail correct adapters.
      listeners: listeners.filter(
        (entry) =>
          entry.signal?.aborted !== true && targetOutlivesScene(entry.target),
      ),
    }),

    restore: (): void => {
      globalThis.requestAnimationFrame = realRequestAnimationFrame;
      globalThis.cancelAnimationFrame = realCancelAnimationFrame;
      globalThis.setTimeout = realSetTimeout;
      globalThis.clearTimeout = realClearTimeout;
      globalThis.setInterval = realSetInterval;
      globalThis.clearInterval = realClearInterval;
      EventTarget.prototype.addEventListener = realAddEventListener;
      EventTarget.prototype.removeEventListener = realRemoveEventListener;
      if (windowHasOwnListenerApi) {
        windowTarget.addEventListener = realWindowAddEventListener;
        windowTarget.removeEventListener = realWindowRemoveEventListener;
      }

      // Clean up after the adapter under test. It has already been reported; a
      // rAF loop left spinning would slow every later test in the file, and a
      // stray window listener would show up in someone else's run.
      for (const handle of frames) realCancelAnimationFrame(handle);
      for (const id of timeouts) realClearTimeout(id);
      for (const id of intervals) realClearInterval(id);
      for (const entry of listeners) {
        const remove =
          windowHasOwnListenerApi && (entry.target as unknown) === globalThis
            ? realWindowRemoveEventListener
            : realRemoveEventListener;
        remove.call(entry.target, entry.type, entry.callback, {
          capture: entry.capture,
        });
      }
    },
  };
}

function capturePhase(options?: boolean | EventListenerOptions): boolean {
  if (typeof options === "boolean") return options;
  return options?.capture ?? false;
}

function targetOutlivesScene(target: EventTarget): boolean {
  if (target instanceof Node) return target.isConnected;
  return true;
}

/* ------------------------------------------------------------------ *
 * Small shared helpers
 * ------------------------------------------------------------------ */

/** Run each labelled step; record the first that throws under `check` and stop. */
function attempt(
  violations: ContractViolation[],
  check: string,
  steps: readonly (readonly [string, () => void])[],
): void {
  for (const [what, run] of steps) {
    try {
      run();
    } catch (error) {
      violations.push({
        check,
        detail: `${what} threw ${describeError(error)}`,
      });
      return;
    }
  }
}

function createContainer(): HTMLElement {
  const container = document.createElement("div");
  container.setAttribute("data-sds-adapter-contract", "");
  document.body.append(container);
  return container;
}

/** Every node in the document except the container's own subtree. */
function nodesOutside(container: Node): Set<Node> {
  const found = new Set<Node>();

  const walk = (node: Node): void => {
    if (node === container) return;
    found.add(node);
    node.childNodes.forEach(walk);
  };

  walk(document);
  return found;
}

function added(before: ReadonlySet<Node>, after: ReadonlySet<Node>): Node[] {
  return [...after].filter((node) => !before.has(node));
}

function describeNode(node: Node): string {
  const parent = node.parentNode;
  return parent ? `${node.nodeName} in ${parent.nodeName}` : node.nodeName;
}

function describeTarget(target: EventTarget): string {
  if (target instanceof Node) return target.nodeName;
  return target.constructor.name;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return `a non-Error value: ${String(error)}`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function last(states: readonly string[]): string {
  return states[states.length - 1] ?? "nothing";
}
