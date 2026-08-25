/*
 * The placeholder adapter's own behaviour.
 *
 * The conformance kit (`adapter-contract.ts`) is run against this adapter at the
 * bottom of the file — that covers the generic properties every adapter shares.
 * The tests above it cover what is specific to THIS adapter: that the thing it
 * renders actually tracks progress, which is the whole reason it exists.
 */
import { describe, expect, it } from "vitest";
import { adapterContract } from "./adapter-contract";
import { placeholder, PLACEHOLDER_SCENE_CLASS } from "./placeholder";
import type { PlaceholderAdapter } from "./placeholder";
import type { AnimationAdapter } from "./types";

/** Build a mounted placeholder over a throwaway container. */
function mount(label = "Intro"): {
  adapter: PlaceholderAdapter;
  container: HTMLElement;
} {
  const container = document.createElement("div");
  const adapter = placeholder(label)(container) as PlaceholderAdapter;
  return { adapter, container };
}

describe("placeholder adapter", () => {
  it("renders the label it was given", () => {
    const { adapter } = mount("Product reveal");

    expect(adapter.snapshot().label).toBe("Product reveal");
  });

  it("renders progress as a whole percentage", () => {
    const { adapter } = mount();

    adapter.seek(0);
    expect(adapter.snapshot().percent).toBe("0%");

    adapter.seek(0.5);
    expect(adapter.snapshot().percent).toBe("50%");

    adapter.seek(1);
    expect(adapter.snapshot().percent).toBe("100%");
  });

  it("sizes the progress bar at finer resolution than the percentage readout", () => {
    const { adapter } = mount();

    // The bar keeps two decimals where the numeral rounds to whole percent, so
    // sub-percent scrubbing still moves something. Note the CSSOM normalizes a
    // trailing-zero value on the way back out — `25.00%` is stored as `25%` —
    // which is why these two expectations look inconsistent and are not.
    adapter.seek(0.4242);
    expect(adapter.snapshot().barWidth).toBe("42.42%");

    adapter.seek(0.25);
    expect(adapter.snapshot().barWidth).toBe("25%");
  });

  it("clamps progress outside 0..1 rather than throwing", () => {
    const { adapter } = mount();

    adapter.seek(-0.5);
    expect(adapter.snapshot().percent).toBe("0%");

    adapter.seek(1.5);
    expect(adapter.snapshot().percent).toBe("100%");
  });

  it("seeks absolutely — arriving at 0.2 from above matches arriving fresh", () => {
    const scrubbed = mount().adapter;
    scrubbed.seek(0.8);
    scrubbed.seek(0.2);

    const fresh = mount().adapter;
    fresh.seek(0.2);

    expect(scrubbed.snapshot()).toEqual(fresh.snapshot());
  });

  it("renders the size handed to resize, and nothing before one arrives", () => {
    const { adapter } = mount();

    expect(adapter.snapshot().size).toBe("—");

    adapter.resize(1024, 768);

    expect(adapter.snapshot().size).toBe("1024 × 768");
  });

  it("resolves load after reporting complete progress", async () => {
    const { adapter } = mount();
    const reports: number[] = [];

    await adapter.load((fraction) => reports.push(fraction));

    expect(reports).toEqual([1]);
  });

  it("mounts its own root into the container it was handed", () => {
    const { container } = mount();

    expect(container.children).toHaveLength(1);
    expect(container.children[0]?.className).toBe(PLACEHOLDER_SCENE_CLASS);
  });

  it("empties the container on destroy", () => {
    const { adapter, container } = mount();

    adapter.destroy();

    expect(container.children).toHaveLength(0);
  });
});

/*
 * SDS-003 — the gate every adapter passes before it ships. This is also the
 * worked example an adapter author copies: one call, and an `observe` that
 * reads whatever this adapter's visual state actually is.
 */
adapterContract(placeholder("Intro"), {
  name: "placeholder",
  observe: (adapter: AnimationAdapter) =>
    (adapter as PlaceholderAdapter).snapshot(),
});
