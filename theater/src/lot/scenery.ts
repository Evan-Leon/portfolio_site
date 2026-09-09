/*
 * Where the trees stand.
 *
 * Pure arithmetic, no DOM, no environment reads — the same shape as
 * `geometry.ts`,
 * and for the same reason: `build-lot.ts` turns these numbers into elements and
 * the tests assert them as literals, so the composition has exactly one home.
 *
 * WHY A FIXED JITTER TABLE AND NOT A RANDOM NUMBER GENERATOR
 * ----------------------------------------------------------
 * A line of identically-spaced identical trees reads as wallpaper, so the trees
 * need variation — but `SDS-001` says a rebuilt scene is identical to the one
 * it replaced, and a random lot is a different lot every reload. Worse, it is a
 * different lot in every screenshot, which would make DT16's comparison against
 * the wireframe unfalsifiable. So the variation is a table of eight entries,
 * walked cyclically: the eye reads it as irregular over the four or five trees
 * it can see at once, and the arrangement is a pure function of the index.
 *
 * The right-hand side reads the table at an offset of three rather than sharing
 * the left's entry, so the two sides do not pair up into visible rungs — the
 * table's period is 8 and the sides are already half a spacing out of phase, so
 * without the offset every left tree would have a right tree of the same width
 * and scale a fixed distance ahead of it.
 *
 * WHY THE TREES ARE INSIDE THE WORLD AND THE CAR IS NOT
 * -----------------------------------------------------
 * Trees are scenery *in* the lot: they have a depth, the drive passes them, and
 * they take their motion from the same `translateZ` tween as the screens — this
 * module never animates anything, it just says where each one stands. The
 * visitor's car is the opposite (it is the camera's own vehicle, so it must not
 * move relative to the camera) and lives on the stage; see `build-lot.ts`.
 *
 * THE CONSTANTS LIVE HERE AND ONLY HERE (`EVO-UNI-057`)
 * -----------------------------------------------------
 * `TREE_SETBACK`, `TREE_SPACING`, `TREE_LEAD` and the jitter table are the
 * composition; the CSS receives every placement as a custom property rather
 * than restating any of them, exactly as the screens' placement does.
 */
import { lotZ, OFFSET, SPACING } from "./geometry";

/**
 * How far beyond the screens' own offset the treeline sits, in world pixels.
 *
 * Measured from the lane's centre the trees stand at `OFFSET + TREE_SETBACK`,
 * which puts them outside the screens rather than among them — a tree between
 * the camera and a screen would occlude the thing the page exists to show.
 */
export const TREE_SETBACK = 420;

/**
 * Distance between one tree and the next on the same side, in world Z.
 *
 * Half a screen spacing, so the treeline reads as continuous at the speed the
 * drive moves: at a full `SPACING` the gaps are wide enough that the eye tracks
 * individual trees going past instead of a passing wood.
 *
 * **This is the number DT11's decision selected.** `GO` ships the dense
 * treeline (`SPACING / 2`); the `GO-REDUCED` fallback is `SPACING`, which halves
 * the plane count. DT11's row records `GO` as a ruling rather than a
 * measurement (see the roadmap's decision table), so if DT16 finds the lot slow
 * this constant is the first thing to change and the only thing that has to.
 */
export const TREE_SPACING = SPACING / 2;

/** How far ahead of the gate the first tree stands, so the lot is lined at progress 0. */
export const TREE_LEAD = 100;

/**
 * How far the paving reaches from the lane's centre, in world pixels.
 *
 * Everything beyond this on the ground plane is the verge: grass, and the
 * wildflowers in it. `styles/global.css` paints the apron over a full-width
 * grass base rather than sizing two grass bands, so this one number is the
 * whole boundary — and it reaches the stylesheet as a property, like every
 * other length the composition owns (`EVO-UNI-057`).
 *
 * **It is here rather than in `geometry.ts` because of what constrains it.**
 * The paving has to stop INSIDE the treeline, or eighty-eight trees stand in
 * asphalt — so the number that matters is this one against
 * `OFFSET + TREE_SETBACK`, and both halves of that comparison now live in one
 * file where `scenery.test.ts` can assert it. 750 against the treeline's 900
 * leaves 150px of grass in front of the nearest trunk, which at the drive's
 * speed is about a wagon's width of verge — enough to read as a verge and not
 * so much that the lot stops looking like a lot.
 */
export const PAVED_HALF_WIDTH = 750;

/** How many silhouettes there are. One mask each; see `art.ts`. */
export const TREE_VARIANTS = 3;

/** One row of the jitter table: an outward nudge, a size and a shade. */
export interface TreeJitter {
  /** Extra setback, in world pixels. Always outward, never into the lane. */
  dx: number;
  /** Multiplier on the tree's drawn size. */
  scale: number;
  /**
   * How far this tree's fill is lifted toward its own crown colour, 0 to 1.
   *
   * A treeline of eighty-eight planes all filled with exactly `--sds-tree` is
   * one colour repeated, which the eye reads as a texture rather than as trees.
   * This is the third axis of variation, and it is ONE-DIRECTIONAL on purpose:
   * `--sds-tree` stays the darkest a tree can be — the shade the six palettes
   * were approved at — and a lifted tree reads as one standing in more light,
   * never as one lit from nowhere.
   *
   * A fraction here rather than a percentage because it is a placement number
   * like the other two; `build-lot.ts` is where it becomes a CSS percentage.
   */
  tint: number;
}

/** The table's first row, and the fallback `jitterAt` cannot actually reach. */
const FIRST_ROW: TreeJitter = { dx: 0, scale: 1.05, tint: 0 };

/**
 * The eight-entry variation the treeline is built from. See the header.
 *
 * `dx` is 0 on the even rows so the line has a readable edge to vary *from*;
 * the odd rows push a tree back and shrink or grow it, which is what breaks up
 * the silhouette. `tint` deliberately does NOT track `scale` — a table where the
 * big trees were also the pale ones would read as one variation seen twice, so
 * the two columns are shuffled against each other. Nothing here is tuned to a
 * particular count — the table is walked cyclically, so it is the same table for
 * eight projects or twenty.
 */
export const TREE_JITTER: readonly TreeJitter[] = [
  FIRST_ROW,
  { dx: 60, scale: 0.9, tint: 0.1 },
  { dx: 0, scale: 1.15, tint: 0.04 },
  { dx: 40, scale: 0.95, tint: 0.16 },
  { dx: 0, scale: 1.1, tint: 0.08 },
  { dx: 80, scale: 1.0, tint: 0 },
  { dx: 0, scale: 1.05, tint: 0.12 },
  { dx: 40, scale: 0.9, tint: 0.06 },
];

/**
 * Row `i` of the table, wrapping.
 *
 * The modulo cannot leave the table, but `noUncheckedIndexedAccess` cannot see
 * that, so the fallback is stated rather than asserted away — and it is the
 * first row, which is what the arithmetic would have returned anyway.
 */
function jitterAt(i: number): TreeJitter {
  return TREE_JITTER[i % TREE_JITTER.length] ?? FIRST_ROW;
}

/** Where one tree stands, before the camera moves. */
export interface TreePlacement {
  /** Which side of the lane it is on. */
  side: "left" | "right";
  /** Horizontal offset from the lane's centre. Negative is left. */
  x: number;
  /** Depth. Always negative: the trees are ahead of the gate. */
  z: number;
  /** Multiplier on its drawn size, from the jitter table. */
  scale: number;
  /** How far its fill is lifted toward its crown colour, 0 to 1. */
  tint: number;
  /** Which silhouette to mask it with, 0 to 2. */
  variant: 0 | 1 | 2;
}

/**
 * Line the drive with trees, for a lot of `count` screens.
 *
 * **Left side first, then the right** — the order is the DOM order, and it is
 * part of the contract rather than an implementation detail: `build-lot.test.ts`
 * asserts it, and a reader looking at the elements in DevTools should be able to
 * predict which is which. Within a side the trees run from the gate outward.
 *
 * The line runs one screen spacing past the end of the drive, so the far trees
 * are still receding toward the vanishing point when the camera stops — the
 * same margin the ground plane gets, and for the same reason: a treeline that
 * ends exactly where the drive does reads as the world running out.
 *
 * The two sides are half a tree spacing out of phase, which is what stops them
 * pairing into rungs across the lane.
 */
export function treePlacements(count: number): readonly TreePlacement[] {
  /* One spacing past the end of the drive. See above. */
  const far = -(lotZ(1, count) + SPACING);
  const placements: TreePlacement[] = [];

  for (let i = 0; ; i += 1) {
    const z = -(TREE_LEAD + i * TREE_SPACING);
    if (z < far) break;
    placements.push(place("left", i, z, jitterAt(i)));
  }

  for (let i = 0; ; i += 1) {
    const z = -(TREE_LEAD + TREE_SPACING / 2 + i * TREE_SPACING);
    if (z < far) break;
    placements.push(place("right", i, z, jitterAt(i + 3)));
  }

  return placements;
}

/** One tree, from its side, its index on that side, its depth and its jitter. */
function place(
  side: "left" | "right",
  i: number,
  z: number,
  jitter: TreeJitter,
): TreePlacement {
  const onTheRight = side === "right";

  return {
    side,
    x: (onTheRight ? 1 : -1) * (OFFSET + TREE_SETBACK + jitter.dx),
    z,
    scale: jitter.scale,
    tint: jitter.tint,
    /* Offset by one on the right so the two sides never show the same
     * silhouette at the same depth. */
    variant: ((i + (onTheRight ? 1 : 0)) % TREE_VARIANTS) as 0 | 1 | 2,
  };
}
