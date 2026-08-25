/*
 * The conformance kit's own test suite — the one that proves the gate works.
 *
 * A suite that has never been observed failing is not known to work, and this
 * kit is the artifact the whole handoff rests on: months from now, in a
 * repository nobody here owns, it is what tells the collaborator whether the
 * animation he just wrote is safe to scrub backwards. So every check it makes
 * gets a deliberately broken fixture here, and every fixture is asserted to
 * produce that check and no other (`EVO-UNI-061`).
 *
 * The fixtures are built by one `flawed()` factory taking a set of flaws, so
 * the adapter under test is identical in every respect but the one being
 * probed. That is what makes `toEqual([...])` on the violation names — rather
 * than `toContain` — an honest assertion: a check that fired for the wrong
 * reason shows up as an extra name.
 */
import { afterEach, describe, expect, it } from "vitest";
import { CONTRACT_CHECKS, checkAdapterContract } from "./adapter-contract";
import type { ContractViolation } from "./adapter-contract";
import { placeholder } from "./placeholder";
import type { PlaceholderAdapter } from "./placeholder";
import type { AdapterFactory, AnimationAdapter } from "./types";
import { clamp01 } from "../engine/progress";

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

interface Flaws {
  /** `load()` rejects instead of settling as unsuccessful. */
  rejectLoad?: boolean;
  /** `seek` eases toward its target instead of jumping to it — accumulates. */
  smoothSeek?: boolean;
  /** `seek` ignores any progress that is not ahead of where it already is. */
  forwardOnlySeek?: boolean;
  /** `seek(0)` and `seek(1)` throw. */
  throwAtBoundaries?: boolean;
  /** `seek(-0.1)` and `seek(1.1)` throw instead of clamping. */
  throwOutOfRange?: boolean;
  /** `resize` throws until `load` has settled. */
  throwOnResizeBeforeLoad?: boolean;
  /** `resize` throws in the ordinary loaded, not-yet-destroyed state. */
  throwOnResize?: boolean;
  /** `resize` throws once `destroy` has run. */
  throwOnResizeAfterDestroy?: boolean;
  /** `destroy` throws. */
  throwOnDestroy?: boolean;
  /** Starts a rAF loop and never cancels it. */
  leakAnimationFrame?: boolean;
  /** Starts a long `setTimeout` and never clears it. */
  leakTimer?: boolean;
  /** Starts a `setInterval` and never clears it. */
  leakInterval?: boolean;
  /** Starts a timeout and an interval and clears BOTH in `destroy` — conforming. */
  cleanedTimers?: boolean;
  /** Adds a `window` listener and never removes it. */
  leakListener?: boolean;
  /** Appends a node outside the container it was handed (`SDS-002`). */
  escapeContainer?: boolean;
  /** Same, but tidies the stray away in `destroy` — visible only before teardown. */
  escapeContainerTransiently?: boolean;
  /** The factory itself throws. */
  failConstruction?: boolean;
}

/** A fixture adapter, plus the readout the kit's `observe` seam reads. */
interface FlawedAdapter extends AnimationAdapter {
  snapshot(): string;
}

const observeFlawed = (adapter: AnimationAdapter): unknown =>
  (adapter as FlawedAdapter).snapshot();

function flawed(flaws: Flaws): AdapterFactory {
  return (container: HTMLElement): AnimationAdapter => {
    if (flaws.failConstruction) throw new Error("no rendering context");
    return new Flawed(container, flaws);
  };
}

class Flawed implements FlawedAdapter {
  readonly #readout: HTMLElement;
  readonly #flaws: Flaws;
  #stray: HTMLElement | undefined;
  #timeout: ReturnType<typeof setTimeout> | undefined;
  #interval: ReturnType<typeof setInterval> | undefined;
  #value = 0;
  #loaded = false;
  #destroyed = false;

  constructor(container: HTMLElement, flaws: Flaws) {
    this.#flaws = flaws;
    this.#readout = document.createElement("div");
    container.append(this.#readout);
    this.#render();

    if (flaws.escapeContainer || flaws.escapeContainerTransiently) {
      this.#stray = document.createElement("aside");
      document.body.append(this.#stray);
    }
    if (flaws.leakAnimationFrame) {
      const tick = (): void => {
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    if (flaws.leakTimer) setTimeout(() => {}, 60_000);
    if (flaws.leakInterval) setInterval(() => {}, 1_000);
    if (flaws.cleanedTimers) {
      this.#timeout = setTimeout(() => {}, 60_000);
      this.#interval = setInterval(() => {}, 1_000);
    }
    if (flaws.leakListener) window.addEventListener("resize", () => {});
  }

  async load(onProgress: (fraction: number) => void): Promise<void> {
    if (this.#flaws.rejectLoad) throw new Error("assets unavailable");
    // Yield once, so `resize` called while this promise is pending genuinely
    // observes the not-yet-loaded state.
    await Promise.resolve();
    this.#loaded = true;
    onProgress(1);
  }

  seek(progress: number): void {
    if (this.#flaws.throwAtBoundaries && (progress === 0 || progress === 1)) {
      throw new RangeError(`boundary progress ${progress} not handled`);
    }
    if (this.#flaws.throwOutOfRange && (progress < 0 || progress > 1)) {
      throw new RangeError(`progress ${progress} out of range`);
    }

    // A "nothing to redraw" guard that only admits forward motion. Invisible
    // scrolling down, and it is the exact shape of a real dirty-check bug.
    if (this.#flaws.forwardOnlySeek && progress <= this.#value) return;

    this.#value = this.#flaws.smoothSeek
      ? this.#value + (progress - this.#value) * 0.5
      : clamp01(progress);
    this.#render();
  }

  resize(width: number, height: number): void {
    if (this.#flaws.throwOnResizeBeforeLoad && !this.#loaded) {
      throw new Error("resize before load");
    }
    if (this.#flaws.throwOnResizeAfterDestroy && this.#destroyed) {
      throw new Error("resize after destroy");
    }
    if (this.#flaws.throwOnResize && this.#loaded && !this.#destroyed) {
      throw new Error("cannot measure");
    }
    void width;
    void height;
  }

  destroy(): void {
    this.#destroyed = true;
    this.#readout.remove();
    if (this.#timeout !== undefined) clearTimeout(this.#timeout);
    if (this.#interval !== undefined) clearInterval(this.#interval);
    if (this.#flaws.escapeContainerTransiently) this.#stray?.remove();
    if (this.#flaws.throwOnDestroy) throw new Error("renderer already gone");
  }

  snapshot(): string {
    return this.#readout.textContent ?? "";
  }

  #render(): void {
    this.#readout.textContent = this.#value.toFixed(4);
  }
}

/** A conforming fixture, for the cases that need one that is not the placeholder. */
const sound = (): AdapterFactory => flawed({});

const observePlaceholder = (adapter: AnimationAdapter): unknown =>
  (adapter as PlaceholderAdapter).snapshot();

const names = (violations: readonly ContractViolation[]): string[] =>
  violations.map((violation) => violation.check);

afterEach(() => {
  // A fixture that deliberately escapes its container leaves a node behind;
  // nothing else in this file should inherit it (`EVO-UNI-044`).
  document.body.replaceChildren();
});

/* ------------------------------------------------------------------ *
 * The conforming case
 * ------------------------------------------------------------------ */

describe("checkAdapterContract, given a conforming adapter", () => {
  it("reports no violations", async () => {
    expect(
      await checkAdapterContract(placeholder("Intro"), observePlaceholder),
    ).toEqual([]);
  });

  it("reports no violations for a factory carrying an assets manifest", async () => {
    const factory = sound();
    factory.assets = [{ url: "/frames/0001.webp", kind: "image" }];

    expect(await checkAdapterContract(factory, observeFlawed)).toEqual([]);
  });

  it("leaves the document as it found it", async () => {
    await checkAdapterContract(placeholder("Intro"), observePlaceholder);

    expect(document.body.childNodes).toHaveLength(0);
  });

  it("accepts an adapter that arms timers and clears them in destroy", async () => {
    /*
     * The other direction of the timer accounting, and the one its own suite
     * never checked (`EVO-UNI-062`): every existing test proves the kit CATCHES
     * a leaked timer, and none proved it ACCEPTS a cleared one. It did not.
     *
     * Under Vitest's jsdom environment `setTimeout` is Node's and returns a
     * `Timeout` object, while the DOM lib types it as `number` — so the
     * instrumentation's `typeof id === 'number'` guard compiled cleanly and
     * matched nothing at runtime, and no cleared handle was ever removed from
     * the outstanding set. Found in SD8: the frame-sequence adapter loads through
     * the asset loader, whose stall timers are armed and cleared per asset, and a
     * correct adapter was reported as leaking one timeout per frame.
     */
    expect(
      await checkAdapterContract(
        flawed({ cleanedTimers: true }),
        observeFlawed,
      ),
    ).toEqual([]);
  });

  it("leaves the timing and listener APIs unpatched", async () => {
    const before = {
      requestAnimationFrame: globalThis.requestAnimationFrame,
      setTimeout: globalThis.setTimeout,
      addEventListener: EventTarget.prototype.addEventListener,
    };

    await checkAdapterContract(placeholder("Intro"), observePlaceholder);

    expect(globalThis.requestAnimationFrame).toBe(before.requestAnimationFrame);
    expect(globalThis.setTimeout).toBe(before.setTimeout);
    expect(EventTarget.prototype.addEventListener).toBe(
      before.addEventListener,
    );
  });
});

/* ------------------------------------------------------------------ *
 * SDS-001 — the checks the whole kit exists for
 * ------------------------------------------------------------------ */

describe("checkAdapterContract, given an adapter that accumulates across seeks", () => {
  it("reports it as neither idempotent nor order-independent", async () => {
    const violations = await checkAdapterContract(
      flawed({ smoothSeek: true }),
      observeFlawed,
    );

    expect(names(violations)).toEqual([
      CONTRACT_CHECKS.seekIdempotent,
      CONTRACT_CHECKS.seekOrderIndependent,
    ]);
  });

  it("names the progress value and both observed states in the idempotence detail", async () => {
    const violations = await checkAdapterContract(
      flawed({ smoothSeek: true }),
      observeFlawed,
    );
    const idempotence = violations.find(
      (v) => v.check === CONTRACT_CHECKS.seekIdempotent,
    );

    // Seeking 0.42 once from a fresh adapter eases halfway to 0.21; seeking it
    // twice eases halfway again, to 0.315. Those are the two numbers a person
    // reading the failure needs to see.
    expect(idempotence?.detail).toContain("0.42");
    expect(idempotence?.detail).toContain("0.2100");
    expect(idempotence?.detail).toContain("0.3150");
  });

  it("catches an adapter that only redraws going forwards, which idempotence alone cannot", async () => {
    // Scrubbing down produces exactly the right frames, and seeking the same
    // value twice is stable — so this passes every check but the reverse half
    // of the order-independence sweep. It is the case that half exists for.
    const violations = await checkAdapterContract(
      flawed({ forwardOnlySeek: true }),
      observeFlawed,
    );

    expect(names(violations)).toEqual([CONTRACT_CHECKS.seekOrderIndependent]);
    expect(violations[0]?.detail).toContain("at step 3 (progress 0.5)");
  });

  it("does not report success when no observer is supplied", async () => {
    const violations = await checkAdapterContract(flawed({ smoothSeek: true }));

    expect(names(violations)).toEqual([CONTRACT_CHECKS.visualStateUnverified]);
    expect(violations[0]?.detail).toContain("observe");
  });
});

/* ------------------------------------------------------------------ *
 * One deliberately broken fixture per remaining check
 *
 * These run WITHOUT an observer, so a single adapter instance is constructed
 * and a leaked rAF loop cannot outlive the check. The trailing
 * `visualStateUnverified` note is the kit being honest about what it skipped.
 * ------------------------------------------------------------------ */

describe("checkAdapterContract, given a specific defect", () => {
  const expectOnly = async (
    flaws: Flaws,
    check: string,
  ): Promise<ContractViolation> => {
    const violations = await checkAdapterContract(flawed(flaws));
    expect(names(violations)).toEqual([
      check,
      CONTRACT_CHECKS.visualStateUnverified,
    ]);
    return violations[0] as ContractViolation;
  };

  it("catches a factory that throws", async () => {
    const violations = await checkAdapterContract(
      flawed({ failConstruction: true }),
    );

    expect(names(violations)).toEqual([CONTRACT_CHECKS.construction]);
    expect(violations[0]?.detail).toContain("no rendering context");
  });

  it("catches a load that rejects instead of settling", async () => {
    const violation = await expectOnly(
      { rejectLoad: true },
      CONTRACT_CHECKS.loadResolves,
    );

    expect(violation.detail).toContain("assets unavailable");
  });

  it("catches a seek that throws at 0 or 1", async () => {
    const violation = await expectOnly(
      { throwAtBoundaries: true },
      CONTRACT_CHECKS.seekBoundaries,
    );

    expect(violation.detail).toContain("seek(0)");
  });

  it("catches a seek that throws outside 0..1 instead of clamping", async () => {
    const violation = await expectOnly(
      { throwOutOfRange: true },
      CONTRACT_CHECKS.seekOutOfRange,
    );

    expect(violation.detail).toContain("seek(-0.1)");
  });

  it("catches a resize that throws while load is still pending", async () => {
    await expectOnly(
      { throwOnResizeBeforeLoad: true },
      CONTRACT_CHECKS.resizeBeforeLoad,
    );
  });

  it("catches a resize that throws once loaded", async () => {
    const violation = await expectOnly(
      { throwOnResize: true },
      CONTRACT_CHECKS.resize,
    );

    expect(violation.detail).toContain("cannot measure");
  });

  it("catches a resize that throws after destroy", async () => {
    await expectOnly(
      { throwOnResizeAfterDestroy: true },
      CONTRACT_CHECKS.resizeAfterDestroy,
    );
  });

  it("catches a destroy that throws", async () => {
    const violation = await expectOnly(
      { throwOnDestroy: true },
      CONTRACT_CHECKS.destroy,
    );

    expect(violation.detail).toContain("renderer already gone");
  });

  it("catches an animation frame loop that survives destroy", async () => {
    await expectOnly(
      { leakAnimationFrame: true },
      CONTRACT_CHECKS.cleanupAnimationFrames,
    );
  });

  it("catches a timeout that survives destroy", async () => {
    const violation = await expectOnly(
      { leakTimer: true },
      CONTRACT_CHECKS.cleanupTimers,
    );

    expect(violation.detail).toContain("1 timeout");
  });

  it("catches an interval that survives destroy", async () => {
    const violation = await expectOnly(
      { leakInterval: true },
      CONTRACT_CHECKS.cleanupTimers,
    );

    expect(violation.detail).toContain("1 interval");
  });

  it("catches a window listener that survives destroy", async () => {
    const violation = await expectOnly(
      { leakListener: true },
      CONTRACT_CHECKS.cleanupListeners,
    );

    expect(violation.detail).toContain("resize");
  });

  it("catches a node appended outside the container", async () => {
    const violation = await expectOnly(
      { escapeContainer: true },
      CONTRACT_CHECKS.containerContainment,
    );

    expect(violation.detail).toContain("ASIDE");
  });

  it("catches a node appended outside the container even if destroy tidies it away", async () => {
    // The stray is gone by the time teardown finishes, so only the snapshot
    // taken while the adapter was live can see it.
    await expectOnly(
      { escapeContainerTransiently: true },
      CONTRACT_CHECKS.containerContainment,
    );
  });
});

/* ------------------------------------------------------------------ *
 * The observer seam's own failure modes
 * ------------------------------------------------------------------ */

describe("checkAdapterContract, given an unusable observer", () => {
  it("reports an observer that throws", async () => {
    const violations = await checkAdapterContract(sound(), () => {
      throw new Error("no renderer yet");
    });

    expect(names(violations)).toEqual([CONTRACT_CHECKS.observeThrew]);
    expect(violations[0]?.detail).toContain("no renderer yet");
  });

  it("reports an observer returning a DOM node rather than a snapshot of one", async () => {
    const violations = await checkAdapterContract(sound(), () =>
      document.createElement("canvas"),
    );

    expect(names(violations)).toEqual([CONTRACT_CHECKS.observeNotComparable]);
  });

  it("reports an observer that returns the same state at 0, 0.5 and 1", async () => {
    const violations = await checkAdapterContract(sound(), () => "ready");

    expect(names(violations)).toEqual([
      CONTRACT_CHECKS.observeNotDiscriminating,
    ]);
  });
});
