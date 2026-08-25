/*
 * `prefers-reduced-motion: reduce` — the drive still happens, and it happens in
 * ten steps instead of continuously.
 *
 * Both halves have to be asserted, because either alone passes while the
 * feature is broken. "The camera still reaches the end of the lot" is equally
 * true of a preference that was ignored entirely; "the positions repeat" is
 * true of a page whose world never moves at all. What pins it down is the exact
 * set of depths a sweep of the whole lot produces — ten, and specifically the
 * ten the geometry names.
 *
 * WHY TEN AND NOT THE ENGINE'S DEFAULT FOUR
 * -----------------------------------------
 * `main.ts` passes `reducedMotionSteps: projects.length + 1`, so the keyframes
 * land on band boundaries: one stop per screen, plus the exit. The engine's
 * default of four across a nine-band drive parks the camera *between* screens
 * at three of its five stops, which turns a request for less motion into a
 * slideshow of the gaps. `quantiseProgress` rounds to `k / steps`, so the
 * reachable depths are `lotZ(k / 9, 8)` for `k` in 0..9 — ten values, the last
 * of which is the end of the drive.
 *
 * WHY THE CLIPS ARE CHECKED HERE
 * ------------------------------
 * Quantising the drive does nothing to a `<video>`: it has its own clock, so a
 * lot that snapped the camera and still looped a clip in front of it would
 * honour the preference everywhere except the one place the motion is actually
 * continuous and unstoppable — which is the case WCAG 2.2.2 is about. Sampled
 * at every position rather than once, because the clip starts on a *band
 * crossing* and the sweep crosses all nine.
 *
 * `emulateMedia` is called before `goto`: the engine reads the preference
 * through a live `MediaQueryList` per frame, but the loading gate's own CSS
 * branches on it at first paint, and setting it afterwards would leave the
 * first part of the run in the wrong mode.
 */
import { expect, test } from "@playwright/test";

import { lotZ } from "../src/lot/geometry";
import { projects } from "../src/projects";
import {
  LOT_SCENE,
  clipStates,
  openPage,
  scrollToSceneProgress,
  worldZ,
} from "./helpers/app";

/**
 * Sample positions across the lot's whole scrub.
 *
 * Forty, so that every one of the ten keyframes is landed on by at least one
 * sample (the spacing is under half a keyframe's width) and so that several
 * samples share each keyframe — which is what makes the *distinct* count
 * meaningful. A sweep of ten would prove nothing about stepping: ten positions
 * producing ten depths is what continuous motion looks like too.
 */
const SAMPLES = 40;

/** `reducedMotionSteps` from `main.ts`, which is where the number is decided. */
const STEPS = projects.length + 1;

/** Two depths this close are the same keyframe, not two of them. */
const TOLERANCE_PX = 1;

test("the drive snaps to one keyframe per screen, and nothing plays", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Returning at all is the reveal assertion: the gate came off the DOM.
  await openPage(page);

  const depths: number[] = [];
  for (let sample = 0; sample < SAMPLES; sample += 1) {
    await scrollToSceneProgress(page, LOT_SCENE, sample / (SAMPLES - 1));
    depths.push(await worldZ(page));

    expect(
      await clipStates(page),
      `a clip was running at sample ${sample}`,
    ).not.toContain("playing");
  }

  const distinct = distinctWithin(depths, TOLERANCE_PX);
  const keyframes = Array.from({ length: STEPS + 1 }, (_, k) =>
    lotZ(k / STEPS, projects.length),
  );

  expect(distinct.length, `depths seen: ${depths.join(", ")}`).toBe(
    keyframes.length,
  );
  distinct.forEach((depth, k) => {
    expect(depth).toBeCloseTo(keyframes[k]!, 0);
  });
});

/** The sorted depths, with anything within `tolerance` of its predecessor folded in. */
function distinctWithin(values: number[], tolerance: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);

  return sorted.filter(
    (value, i) => i === 0 || value - sorted[i - 1]! > tolerance,
  );
}
