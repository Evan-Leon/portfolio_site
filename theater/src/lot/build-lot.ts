/*
 * The lot itself: eight screens standing in a 3D world, and the one timeline
 * that drives past them.
 *
 * This is a {@link GsapTimelineBuilder}, so it is handed a container and a GSAP
 * instance and hands back a paused timeline. `adapters/gsap-timeline.ts` scrubs
 * that timeline by absolute progress and nothing here ever runs per frame —
 * which is the whole of `SDS-001` for this scene. There is no `seek` in this
 * file to get wrong.
 *
 * WHAT THE TIMELINE IS, IN UNITS OF BANDS
 * ---------------------------------------
 * The timeline's absolute duration is meaningless (the adapter drives it by
 * progress), so it is built in the one unit that makes the choreography
 * readable: **one unit is one screen's band**. The drive is `count + 1` units
 * long — one per screen, plus the spacing past the last one — so screen `i`'s
 * band is exactly `[i, i + 1)` on the timeline's clock, and every position
 * below is a band number.
 *
 * Three tweens make the whole scene:
 *  - one on `.sds-lot__world`, translating Z from 0 to `lotZ(1, count)` across
 *    the entire timeline. That is the drive. Everything that looks like motion
 *    — screens growing, passing, receding — is perspective on this one tween.
 *  - per screen, a lit ramp starting where its band starts, over 15% of a band.
 *  - per screen, an unlit ramp starting where its band ends, over 5% of a band.
 *    Faster than the ramp up, because a screen dims as it goes past the camera
 *    and a slow fade there reads as a screen that is still trying to be looked
 *    at.
 *
 * WHY `fromTo` AND NOT `to`
 * -------------------------
 * A `to` tween records its start value lazily, the first time it renders — so a
 * timeline scrubbed backwards from the middle can capture a start value that
 * is itself mid-tween, and the scene never returns to the frame it had on the
 * way down. `fromTo` states both ends up front, which is the same absoluteness
 * `SDS-001` asks of `seek`.
 *
 * WHY BRIGHTNESS RIDES ON A CUSTOM PROPERTY
 * -----------------------------------------
 * The timeline animates one number per screen, `--sds-screen-lit`, from 0 to 1.
 * The CSS in `styles/global.css` decides what that number means — the surface's
 * `filter: brightness()`, the marquee's colour and glow — so the choreography
 * here stays a statement about *which screen is the one ahead* and the look
 * stays in the stylesheet. The alternative, toggling classes from callbacks,
 * cannot work at all here: the adapter scrubs with `suppressEvents`, so no
 * `onUpdate` ever fires.
 *
 * WHY PLACEMENT IS THREE CUSTOM PROPERTIES AND NOT A TRANSFORM
 * ------------------------------------------------------------
 * `screenPlacement(i)` is the source of truth for where a screen stands, and
 * this file is the only place that can apply it — the numbers are per-index, so
 * they cannot be written as a static rule. Writing them as an inline
 * `transform` made them unreachable from the stylesheet, which is fine until
 * the layout has to change at a breakpoint: the narrow lot lines the screens up
 * single-file down the lane, and a media query cannot rewrite one component of
 * a transform. So the arithmetic lands in `--sds-screen-x`, `--sds-screen-z` and
 * `--sds-screen-yaw`, the `transform` that reads them lives in
 * `styles/global.css`, and the breakpoint stays entirely in CSS — this file
 * never learns what 768px means.
 *
 * WHY THE POSTER ELEMENT IS NOT CREATED HERE
 * ------------------------------------------
 * A `<img src="…">` built in this file would be a fetch the asset loader knows
 * nothing about — the ring would reach 100% with eight images still arriving
 * (`SDS-006`). So a screen is built with an empty surface, and `lot-scene.ts`
 * puts the element the loader decoded into it. One fetch per poster, all of
 * them declared.
 */
import type {
  GsapTimeline,
  GsapTimelineBuilder,
  GsapTimelineContext,
} from "../adapters/gsap-timeline";
import type { TheaterProject } from "../projects";
import {
  GROUND_LEAD,
  GROUND_LINE,
  GROUND_SQUASH,
  groundDepth,
  lotZ,
  screenPlacement,
  screenProgress,
} from "./geometry";
import { treePlacements, type TreePlacement } from "./scenery";

/** The perspective stage. One viewport, the starfield, nothing 3D of its own. */
export const LOT_CLASS = "sds-lot";
/** The element the drive translates. Everything in the world is inside it. */
export const LOT_WORLD_CLASS = "sds-lot__world";
/** The asphalt plane the screens stand on. */
export const LOT_GROUND_CLASS = "sds-lot__ground";
/**
 * The sun or the moon, depending on the hour.
 *
 * On the *stage*, not in the world: it is meant to be infinitely far away, so
 * the one thing it must not do is move with the drive.
 */
export const LOT_ORB_CLASS = "sds-lot__orb";

/**
 * The visitor's own wagon, parked at the bottom of the frame.
 *
 * On the *stage* for the same reason the orb is, arrived at from the opposite
 * direction: the orb must not move because it is infinitely far away, and the
 * car must not move because it is the thing the camera is sitting in. Putting
 * it in the world would drive it away from the visitor at the speed of the
 * drive.
 */
export const LOT_CAR_CLASS = "sds-lot__car";
/** The decoded sprite `lot-scene.ts` hangs inside the car element. */
export const CAR_SPRITE_CLASS = "sds-lot__car-sprite";
/** The headlight trapezoid thrown on the road ahead. Behind the car. */
export const LOT_BEAM_CLASS = "sds-lot__beam";

/**
 * Whether the wagon got its sprite.
 *
 * `pending` until `load()` settles, then `ready` or `missing`. A missing sprite
 * still leaves the beam and the tail-light glows drawn in a box of real height
 * (`aspect-ratio` gives it one with no image in it), because the composition
 * without a car reads as a lot with its lights on, while a collapsed box reads
 * as a broken page (`EVO-UNI-053`).
 */
export const CAR_STATE_ATTRIBUTE = "data-car";

/** One tree plane in the world, masked to a silhouette. */
export const TREE_CLASS = "sds-tree";
/** Which of the three silhouettes this tree is, 0 to 2. */
export const TREE_VARIANT_ATTRIBUTE = "data-tree-variant";
/**
 * Whether this tree's silhouette arrived.
 *
 * `pending` until `load()` settles, then `ready` or `missing`. **The CSS keeps a
 * tree `visibility: hidden` unless this says `ready`** — a tree plane with no
 * mask is a filled 260×390 rectangle of tree colour, which is far worse than no
 * tree at all (`EVO-UNI-053`).
 */
export const MASK_STATE_ATTRIBUTE = "data-mask";

/**
 * Where a tree stands, as the three custom properties the stylesheet composes.
 *
 * Same reasoning as {@link SCREEN_X_PROPERTY}: the numbers are per-tree, so they
 * cannot live in a static rule, and the narrow layout has to be able to restate
 * `x` without knowing the arithmetic (`EVO-UNI-057`).
 */
export const TREE_X_PROPERTY = "--sds-tree-x";
export const TREE_Z_PROPERTY = "--sds-tree-z";
export const TREE_SCALE_PROPERTY = "--sds-tree-scale";

/** One screen — an `<a>`, because the whole thing is a link to the project. */
export const SCREEN_CLASS = "sds-screen";
export const SCREEN_SURFACE_CLASS = "sds-screen__surface";
export const SCREEN_POSTER_CLASS = "sds-screen__poster";
export const SCREEN_BASE_CLASS = "sds-screen__base";
export const SCREEN_POST_CLASS = "sds-screen__post";
/**
 * The sign under a screen: a dark frame carrying a lit crest over a white
 * readerboard, with a row of bulbs along its bottom edge.
 *
 * The crest is the project's name in lit letters — the theater's own title
 * board. The readerboard is the blurb in black push-in letters, which is where
 * the wrapping happens and why the frame is the screen's full width.
 */
export const SCREEN_MARQUEE_CLASS = "sds-screen__marquee";
export const SCREEN_CREST_CLASS = "sds-screen__crest";
export const SCREEN_BOARD_CLASS = "sds-screen__board";

/** Which screen this is, in drive order. Read back by `lot-scene.ts`. */
export const SCREEN_INDEX_ATTRIBUTE = "data-screen-index";

/**
 * How lit a screen is, 0 to 1. The timeline writes it; the stylesheet reads it.
 *
 * Named here rather than in the CSS because the tween, the snapshot and the
 * stylesheet all have to spell it identically, and a typo in any of them is
 * silent — the tween writes a property nobody styles, or the CSS reads one
 * nobody writes (`EVO-UNI-057`).
 */
export const SCREEN_LIT_PROPERTY = "--sds-screen-lit";

/**
 * Where a screen stands, as the three custom properties `styles/global.css`
 * composes into its `transform`. See the header.
 *
 * Named here for the same reason {@link SCREEN_LIT_PROPERTY} is: the writer and
 * the stylesheet have to spell them identically, and a mismatch is silent —
 * every screen falls back to `0px`/`0deg` and the whole lot stacks in the middle
 * of the lane at the camera's own depth (`EVO-UNI-057`).
 */
export const SCREEN_X_PROPERTY = "--sds-screen-x";
export const SCREEN_Z_PROPERTY = "--sds-screen-z";
export const SCREEN_YAW_PROPERTY = "--sds-screen-yaw";

/**
 * Whether the surface got its poster.
 *
 * `pending` until `load()` settles, then `ready` or `missing`. A missing poster
 * still renders a screen — dark surface, sign lit as normal — because a hole
 * in the lot reads as a broken page while a dark screen reads as a screen with
 * nothing showing (`EVO-UNI-053`).
 */
export const POSTER_STATE_ATTRIBUTE = "data-poster";
/** Whether the screen's clip is available or has fallen back to its poster. */
export const CLIP_STATE_ATTRIBUTE = "data-clip";
/** The muted loop layered over a screen's poster. */
export const SCREEN_VIDEO_CLASS = "sds-screen__video";

/**
 * Where the horizon is, as a percentage, written onto the stage element.
 *
 * The stylesheet needs the same number the placement arithmetic uses — the
 * ground plane starts at it, every screen's bottom rests on it, and the
 * vanishing point sits at its mirror. CSS cannot import {@link GROUND_LINE},
 * so the value is pushed the other way rather than written out twice
 * (`EVO-UNI-057`).
 */
export const GROUND_LINE_PROPERTY = "--sds-ground-line";

/**
 * How far in front of the camera the asphalt starts, and how deep it runs.
 *
 * Pushed onto the stage for the same reason {@link GROUND_LINE_PROPERTY} is:
 * the depth is a function of how many projects there are, so it cannot be a
 * literal in the stylesheet, and a second copy of the arithmetic in CSS would
 * drift the first time a project is added (`EVO-UNI-057`).
 */
export const GROUND_LEAD_PROPERTY = "--sds-ground-lead";
export const GROUND_DEPTH_PROPERTY = "--sds-ground-depth";

/**
 * How much shallower than the lot the plane is drawn before being scaled back.
 *
 * See {@link GROUND_SQUASH}. The stylesheet divides the plane's height AND every
 * length it paints along its depth axis by this, then `scaleY()`s by it — so the
 * number has to reach CSS rather than be spelled there, or the two halves of a
 * cancellation drift apart and the road's dashes silently change length
 * (`EVO-UNI-057`).
 */
export const GROUND_SQUASH_PROPERTY = "--sds-ground-squash";

/** How much of a band a screen takes to light up as the camera approaches. */
const LIT_IN_BANDS = 0.15;
/** And to go dark once the camera is past it. See the header. */
const LIT_OUT_BANDS = 0.05;

/**
 * Build the lot's DOM and the timeline that drives through it.
 *
 * ```ts
 * gsapTimeline(buildLot(projects))
 * ```
 *
 * A single call per adapter — the returned builder is what
 * {@link GsapTimelineBuilder} expects, and everything it creates lives inside
 * the container it is handed (`SDS-002`).
 */
export function buildLot(
  projects: readonly TheaterProject[],
): GsapTimelineBuilder {
  return ({ container, gsap }: GsapTimelineContext): GsapTimeline => {
    /*
     * The GSAP adapter marks its root `aria-hidden`, which is right for a
     * decorative animation and wrong for this one: the lot is one link per
     * project, and the crest is each link's accessible name.
     * Hiding them would leave a screen reader with the exit-beat list alone —
     * which does exist, but as the no-JS fallback, not as the accessible copy
     * of a control the page is showing.
     */
    container.removeAttribute("aria-hidden");

    const count = projects.length;

    const stage = element("div", LOT_CLASS);
    /* Rounded, because `0.58 * 100` is `57.99999999999999` in binary floating
     * point and a stylesheet value nobody can read is a stylesheet value nobody
     * will recognise when they go looking for the horizon. */
    stage.style.setProperty(
      GROUND_LINE_PROPERTY,
      `${Number((GROUND_LINE * 100).toFixed(4))}%`,
    );
    stage.style.setProperty(GROUND_LEAD_PROPERTY, `${GROUND_LEAD}px`);
    stage.style.setProperty(GROUND_DEPTH_PROPERTY, `${groundDepth(count)}px`);
    stage.style.setProperty(GROUND_SQUASH_PROPERTY, String(GROUND_SQUASH));

    const world = element("div", LOT_WORLD_CLASS);
    world.append(element("div", LOT_GROUND_CLASS));

    /*
     * The treeline: after the asphalt so it paints over it, before the screens
     * so a tree can never land on top of one. All three are in the same
     * `preserve-3d` world, so paint order is mostly the compositor's business —
     * but the trees stand well outside the lane and the screens well inside it,
     * and a source order that matches the depth order is one less thing to
     * reason about when a screen looks occluded.
     */
    world.append(...treePlacements(count).map(buildTree));

    const screens = projects.map((project, i) => buildScreen(project, i));
    world.append(...screens);
    stage.append(world);

    /*
     * After the world in the DOM and behind it in paint order — the orb carries
     * `z-index: 0` and the world `z-index: 1`, so the sky's furniture cannot
     * land on top of a screen. It is decorative and unlabelled, so it is hidden
     * from assistive technology on its own (the container's `aria-hidden` was
     * just removed above, and for good reason — the screens are links).
     */
    const orb = element("div", LOT_ORB_CLASS);
    orb.setAttribute("aria-hidden", "true");
    stage.append(orb);

    /*
     * The visitor's vehicle, on the stage rather than in the world. Beam first
     * so the car paints over it — the trapezoid starts on the road and runs
     * back under the bumper, and the sprite is what hides its near end.
     *
     * Both are decorative and unlabelled, so both are hidden from assistive
     * technology on their own: the container's `aria-hidden` was removed above
     * because the screens inside it are links, and that removal exposed
     * everything else on the stage along with them.
     *
     * NEITHER OPTS OUT OF HIT-TESTING HERE — the stylesheet does it, with
     * `pointer-events: none` on both rules. The stage itself does not opt out
     * (only `.sds-lot__world` does), so a car sitting across the bottom of the
     * frame at `z-index: 3` would otherwise swallow every click aimed at the
     * screen behind it. That is what DT16's click-through test falsifies.
     */
    const beam = element("div", LOT_BEAM_CLASS);
    beam.setAttribute("aria-hidden", "true");

    const car = element("div", LOT_CAR_CLASS);
    car.setAttribute("aria-hidden", "true");
    car.setAttribute(CAR_STATE_ATTRIBUTE, "pending");

    stage.append(beam, car);

    container.append(stage);

    /* One unit per band; `count + 1` bands in the drive. See the header. */
    const bands = count + 1;

    const timeline = gsap.timeline({
      paused: true,
      defaults: { ease: "none" },
    });

    timeline.fromTo(
      world,
      { z: 0 },
      { z: lotZ(1, count), duration: bands, ease: "none" },
      0,
    );

    screens.forEach((screen, i) => {
      /* Positions are stated in the geometry's own terms, so retiming the lot
       * moves the lighting with it rather than leaving two clocks to reconcile
       * (`EVO-UNI-057`). */
      const bandStart = screenProgress(i, count) * bands;
      const bandEnd = screenProgress(i + 1, count) * bands;

      timeline.fromTo(
        screen,
        { [SCREEN_LIT_PROPERTY]: 0 },
        { [SCREEN_LIT_PROPERTY]: 1, duration: LIT_IN_BANDS, ease: "none" },
        bandStart,
      );
      timeline.fromTo(
        screen,
        { [SCREEN_LIT_PROPERTY]: 1 },
        {
          [SCREEN_LIT_PROPERTY]: 0,
          duration: LIT_OUT_BANDS,
          ease: "none",
          /*
           * WITHOUT THIS THE LOT IS LIT BEFORE IT IS DRIVEN.
           *
           * A `fromTo` renders its `from` value at build time —
           * `immediateRender` defaults to true — which for this tween means
           * writing "fully lit" onto all eight screens the moment the timeline
           * exists. Every screen the visitor has not reached yet keeps it,
           * because a tween that has never rendered cannot have overwritten it:
           * seeking a fresh adapter to the middle of the drive lights screen 4
           * (correct) and screens 5, 6 and 7 (not). Scrubbing there from the end
           * instead renders those tweens and leaves them dark — the same
           * progress, two different frames, which is precisely the failure
           * `SDS-001` names. Caught by the conformance kit's
           * `seek-order-independent` check.
           *
           * The ramp *up* keeps its immediate render: its `from` is 0, which is
           * what an unreached screen should look like.
           */
          immediateRender: false,
        },
        bandEnd,
      );
    });

    return timeline;
  };
}

/**
 * One tree: an empty plane placed by three properties, masked once its
 * silhouette arrives.
 *
 * No `<img>` and no `mask-image` here — for the same reason there is no poster
 * element here. A `mask-image: url(...)` written at build time is a fetch the
 * asset loader knows nothing about, so the ring would reach 100% with eighty-
 * eight masks still arriving (`SDS-006`). `lot-scene.ts` sets the mask from the
 * URL the loader already resolved, which makes that a cache hit.
 *
 * Decorative, and there are dozens of them: `aria-hidden` on each rather than
 * one wrapper, because a wrapper would be another element in the `preserve-3d`
 * world and every level of nesting there is a chance to flatten it.
 */
function buildTree(placement: TreePlacement): HTMLElement {
  const tree = element(
    "span",
    `${TREE_CLASS} ${TREE_CLASS}--${placement.side}`,
  );
  tree.setAttribute("aria-hidden", "true");
  tree.setAttribute(TREE_VARIANT_ATTRIBUTE, String(placement.variant));
  tree.setAttribute(MASK_STATE_ATTRIBUTE, "pending");
  tree.style.setProperty(TREE_X_PROPERTY, `${placement.x}px`);
  tree.style.setProperty(TREE_Z_PROPERTY, `${placement.z}px`);
  /* Unitless — it is a `scale()` factor, and `1.05px` would make the whole
   * transform invalid rather than just that component. */
  tree.style.setProperty(TREE_SCALE_PROPERTY, String(placement.scale));

  return tree;
}

/** One screen: surface on top, the sign riding on two posts below it. */
function buildScreen(project: TheaterProject, i: number): HTMLAnchorElement {
  const { x, z, yaw } = screenPlacement(i);

  const screen = document.createElement("a");
  screen.className = SCREEN_CLASS;
  screen.href = project.href;
  screen.setAttribute(SCREEN_INDEX_ATTRIBUTE, String(i));
  /* Not a `transform` — see the header. The stylesheet composes these three. */
  screen.style.setProperty(SCREEN_X_PROPERTY, `${x}px`);
  screen.style.setProperty(SCREEN_Z_PROPERTY, `${z}px`);
  screen.style.setProperty(SCREEN_YAW_PROPERTY, `${yaw}deg`);
  /* The tween's `from` value is stated on the element as well, so a screen that
   * has never been rendered is dark rather than unstyled. */
  screen.style.setProperty(SCREEN_LIT_PROPERTY, "0");

  const surface = element("span", SCREEN_SURFACE_CLASS);
  surface.setAttribute(POSTER_STATE_ATTRIBUTE, "pending");

  /* Recorded SDS-006 departure: streaming clips are deliberately not declared
   * to the asset loader. A stream is never "loaded", preload="none" fetches
   * nothing before activation, and gating reveal on eight absent clips would
   * leave the loading ring spinning forever. DTF recorded GO, so every source
   * is present from construction and preload="none" supplies the deferral. */
  const video = document.createElement("video");
  video.className = SCREEN_VIDEO_CLASS;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  video.poster = project.poster;
  video.setAttribute("aria-hidden", "true");

  const source = document.createElement("source");
  source.src = project.clip;
  source.type = "video/mp4";
  video.append(source);
  surface.append(video);

  const base = element("span", SCREEN_BASE_CLASS);
  base.append(
    element("span", `${SCREEN_POST_CLASS} ${SCREEN_POST_CLASS}--l`),
    element("span", `${SCREEN_POST_CLASS} ${SCREEN_POST_CLASS}--r`),
  );

  /* The crest is the link's accessible name. The poster is decorative
   * (`alt=""`) and the readerboard is hidden from the accessibility tree just
   * below, so the crest is the only text the name is computed from — a link
   * announced as "Leon's Budget" rather than as its name followed by a
   * ninety-character sentence, twenty times down the lot. */
  const marquee = element("span", SCREEN_MARQUEE_CLASS);
  const crest = element("span", SCREEN_CREST_CLASS);
  crest.textContent = project.name;

  /* Hidden from the accessibility tree, not from the page: the blurb is the
   * project page's own meta description, so a screen reader that follows the
   * link is about to be told the same sentence by the page itself. Sighted
   * visitors read it off the board; nobody hears it twice. */
  const board = element("span", SCREEN_BOARD_CLASS);
  board.textContent = project.blurb;
  board.setAttribute("aria-hidden", "true");

  marquee.append(crest, board);
  base.append(marquee);

  screen.append(surface, base);
  return screen;
}

function element(tag: "div" | "span", className: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}
