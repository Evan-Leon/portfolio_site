/*
 * The dynamic-import boundary: the animation library is fetched until an
 * adapter that needs it is actually loaded.
 *
 * WHY THIS IS ITS OWN FILE
 * ------------------------
 * The instrument is the `vi.mock` module factory, which runs the first time its
 * module is imported and never again. That makes it an exact answer to "has this
 * module been imported yet?" — and it makes the answer usable exactly once per
 * module per file. Any test that ran earlier and touched the same library would
 * leave the factory already-called, so the assertion would be about test order
 * rather than about the adapter (`EVO-UNI-061`). Each library is therefore
 * imported by one test here and nowhere else in the file.
 *
 * WHY NOT ASSERT ON THE BUILD OUTPUT INSTEAD
 * ------------------------------------------
 * Because the obvious version of that check cannot fail. Rollup names a chunk
 * after the resolved module's basename, and `gsap` resolves to `index.js`, so
 * grepping `dist/` filenames for "gsap" reports a false negative — while
 * grepping the manifest for the string "gsap" is satisfied by any path that
 * happens to contain it. The build-side check belongs in the SD9 build log,
 * against the manifest's `isDynamicEntry` flag; this file covers the source.
 *
 * WHAT WOULD BREAK IT
 * -------------------
 * A top-level `import { gsap } from 'gsap'` anywhere in the graph the entry
 * reaches — including in `src/scenes/registry.ts`, which is the tempting place
 * to put one when writing a `build` function. That is why the GSAP adapter hands
 * the instance to the builder instead (`GsapTimelineContext.gsap`).
 */
import { expect, it, vi } from "vitest";

import { gsapTimeline } from "./gsap-timeline";

const imports = vi.hoisted(() => ({ gsap: 0 }));

vi.mock("gsap", () => {
  imports.gsap += 1;

  return {
    gsap: {
      timeline: () => ({
        progress: () => 0,
        pause: () => {},
        kill: () => {},
      }),
      ticker: { sleep: () => {} },
    },
  };
});

it("does not import gsap until a GSAP adapter is loaded", async () => {
  const factory = gsapTimeline(({ gsap }) => gsap.timeline({ paused: true }));
  const adapter = factory(document.createElement("div"));

  expect(imports.gsap).toBe(0);

  await adapter.load(() => {});

  expect(imports.gsap).toBe(1);
  adapter.destroy();
});
