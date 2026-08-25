/*
 * Which screen is the one ahead — every band, driving down and driving back up
 * — and the clip that plays on it.
 *
 * Two claims, and the second is the one that has already broken once. Lighting
 * is a pure function of progress and would be hard to get directionally wrong.
 * *Playback* is not: it is a side effect with a lifetime, started and stopped
 * on band crossings, and DT4 shipped with a version of it that played screen 0
 * only if you drove past it and came back. So every band is visited in both
 * directions, and the clip is asserted to start, stop when the camera moves on,
 * and start *again* when the camera returns.
 *
 * THE CLIP THIS SPEC PLAYS IS ONE IT MAKES ITSELF
 * -----------------------------------------------
 * No project has a demo reel yet — DT9 films them — so there is nothing on disk
 * to prove playback with, and a spec that asserted only "the video element
 * exists" would pass against a lot that never plays anything. `beforeAll`
 * therefore renders three seconds of ffmpeg's `testsrc2` to
 * `images/nom-noms/demo.mp4` (960x600, H.264, no audio track) and `afterAll`
 * deletes it again — but **only if this run is what created it**. The day
 * `images/nom-noms/demo.mp4` is a real clip, this spec finds it already there,
 * leaves it entirely alone, and asserts against the real thing.
 *
 * `images/` is not gitignored, so a run that crashes between those two hooks
 * leaves an untracked 660KB `images/nom-noms/demo.mp4` behind. `git status`
 * shows it; delete it. It is never committed.
 *
 * WHY "SCREEN 0 IS NOT PLAYING" IS SPELLED AS A SET AND NOT AS `paused`
 * ---------------------------------------------------------------------
 * A screen whose clip 404s has its `<video>` *removed*, not paused — the poster
 * is then the honest state (`EVO-UNI-053`). Seven of the eight screens are in
 * that condition for as long as DT9 has not run, so "the neighbour's video is
 * paused" is a question about an element that does not exist. What is asserted
 * instead is the set of screens actually playing, which is the claim either
 * spelling was reaching for and stays true once the other seven clips land.
 */
// @ts-expect-error -- dependency policy excludes @types/node from this browser project.
import { execFileSync } from "node:child_process";
// @ts-expect-error -- dependency policy excludes @types/node from this browser project.
import { existsSync, rmSync } from "node:fs";
// @ts-expect-error -- dependency policy excludes @types/node from this browser project.
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  CLIP_STATE_ATTRIBUTE,
  SCREEN_POSTER_CLASS,
} from "../src/lot/build-lot";
import { projects } from "../src/projects";
import {
  clipStates,
  litScreens,
  openPage,
  screenLocator,
  scrollToScreen,
} from "./helpers/app";

/**
 * One worker for the whole file, because the file owns a file on disk.
 *
 * `fullyParallel` would otherwise split these three tests across workers, and
 * each worker runs its own `beforeAll`/`afterAll`: the first would create the
 * clip, the second would find it already there and conclude it belongs to the
 * repository, and the first would then delete it out from under a test still
 * driving past screen 2.
 */
test.describe.configure({ mode: "serial" });

/** The project the synthetic clip is rendered for, and one with no clip at all. */
const WITH_CLIP = projects.findIndex((project) => project.slug === "nom-noms");
const WITHOUT_CLIP = projects.findIndex(
  (project) => project.slug === "spead-read",
);

/**
 * The clip's path on disk, resolved from this file rather than from the
 * process's working directory — the suite is launched from the repository root
 * as well as from `theater/`, and only one of those makes a relative path mean
 * what it looks like.
 */
const CLIP_FILE = fileURLToPath(
  new URL(
    `../../images/${projects[WITH_CLIP]!.slug}/demo.mp4`,
    import.meta.url,
  ),
);

/** Did this run render the clip? Only then may it delete it. See the header. */
let clipIsOurs = false;

test.beforeAll(() => {
  if (existsSync(CLIP_FILE)) return;

  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=960x600:rate=30:duration=3",
      "-c:v",
      "libx264",
      /* Chromium refuses 4:4:4 H.264; 4:2:0 is the profile every browser
       * decodes, and a clip that will not decode is a clip that reports
       * `missing` and quietly turns this whole file green for the wrong
       * reason. */
      "-pix_fmt",
      "yuv420p",
      /* The screens are muted loops; an audio track would be dead weight. */
      "-an",
      "-y",
      CLIP_FILE,
    ],
    { stdio: "inherit" },
  );

  clipIsOurs = true;
});

test.afterAll(() => {
  if (clipIsOurs) rmSync(CLIP_FILE, { force: true });
});

/** The lit vector a working lot shows with screen `i` ahead of the camera. */
function onlyLit(i: number): number[] {
  return projects.map((_, index) => (index === i ? 1 : 0));
}

/** The screens whose clip is actually running, in drive order. */
async function playing(
  page: import("@playwright/test").Page,
): Promise<number[]> {
  const states = await clipStates(page);
  return states.flatMap((state, i) => (state === "playing" ? [i] : []));
}

test("exactly the approached screen is lit, in both directions", async ({
  page,
}) => {
  await openPage(page);

  const forward = [...projects.keys()];
  const backward = [...forward].reverse();

  for (const i of [...forward, ...backward]) {
    await scrollToScreen(page, i);

    /*
     * The whole vector, not just screen `i` (`EVO-UNI-018`). "Screen 4 is lit"
     * is equally true of a lot that lights every screen at once, which is the
     * exact failure `immediateRender: false` exists to prevent and the one a
     * per-screen assertion cannot see.
     */
    expect(await litScreens(page), `driving to screen ${i}`).toEqual(
      onlyLit(i),
    );
  }
});

test("the active screen's clip plays, stops, and plays again on the way back", async ({
  page,
}) => {
  await openPage(page);

  await scrollToScreen(page, WITH_CLIP);
  await expect
    .poll(() => playing(page), { message: "at the screen with a clip" })
    .toEqual([WITH_CLIP]);

  await scrollToScreen(page, WITH_CLIP + 1);
  await expect
    .poll(() => playing(page), { message: "one screen further on" })
    .toEqual([]);

  /*
   * The reverse crossing — the case DT4 shipped broken. Driving back into a
   * band has to re-activate it, and an implementation that only ever starts a
   * clip while going forwards passes every assertion above this line.
   */
  await scrollToScreen(page, WITH_CLIP);
  await expect
    .poll(() => playing(page), { message: "back at the screen with a clip" })
    .toEqual([WITH_CLIP]);
});

test("a screen with no clip falls back to its poster", async ({ page }) => {
  await openPage(page);

  /* The clip is only fetched when the screen is activated (`preload="none"`),
   * so the fallback cannot be observed until the camera has driven to it. */
  await scrollToScreen(page, WITHOUT_CLIP);

  const screen = screenLocator(page, WITHOUT_CLIP);
  await expect(screen).toHaveAttribute(CLIP_STATE_ATTRIBUTE, "missing");
  await expect(screen.locator(`.${SCREEN_POSTER_CLASS}`)).toBeVisible();
});
