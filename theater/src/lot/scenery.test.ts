/*
 * The treeline's arithmetic, against literal expected values.
 *
 * Every number below is written out — `-900`, `-100`, `940`, `-300` — rather
 * than recomputed from `OFFSET + TREE_SETBACK` and friends. A test that says
 * `expect(treePlacements(8)[0].x).toBe(-(OFFSET + TREE_SETBACK))` restates the
 * implementation and passes for every value those constants could ever take
 * (`EVO-UNI-109`); these fail the moment the treeline moves, which is the
 * point, because the approved wireframe was drawn against exactly these numbers.
 *
 * EVERY INDEX BELOW IS QUALIFIED BY THE CALL IT CAME FROM
 * ------------------------------------------------------
 * The left block's length depends on `count`, so an index means different
 * things in different lots and the two must never be mixed. In
 * `treePlacements(8)` the left block is 20 long, so `[20]` is the first tree on
 * the right; in `treePlacements(20)` it is 44 long, so `[20]` there is still a
 * left tree. Each expectation below therefore names its own call rather than
 * reusing a subject across counts.
 */
import { describe, expect, it } from "vitest";

import { lotZ } from "./geometry";
import {
  PAVED_HALF_WIDTH,
  TREE_JITTER,
  TREE_LEAD,
  TREE_SETBACK,
  TREE_SPACING,
  TREE_VARIANTS,
  treePlacements,
} from "./scenery";

/** The eight-screen drive the composition was designed and approved against. */
const COUNT = 8;

/** Twenty — which is both DT11's `lot20` probe and, today, the real registry. */
const A_BIG_LOT = 20;

describe("the treeline's constants", () => {
  it("are the composition the wireframe was approved against", () => {
    expect({
      TREE_SETBACK,
      TREE_SPACING,
      TREE_LEAD,
      TREE_VARIANTS,
    }).toEqual({
      TREE_SETBACK: 420,
      /* Half a screen spacing — DT11's `GO` density. `GO-REDUCED` would be 800,
       * and this assertion is what would catch the change going in silently. */
      TREE_SPACING: 400,
      TREE_LEAD: 100,
      TREE_VARIANTS: 3,
    });
  });

  it("varies over eight rows, so the line reads as irregular", () => {
    expect(TREE_JITTER).toEqual([
      { dx: 0, scale: 1.05, tint: 0 },
      { dx: 60, scale: 0.9, tint: 0.1 },
      { dx: 0, scale: 1.15, tint: 0.04 },
      { dx: 40, scale: 0.95, tint: 0.16 },
      { dx: 0, scale: 1.1, tint: 0.08 },
      { dx: 80, scale: 1.0, tint: 0 },
      { dx: 0, scale: 1.05, tint: 0.12 },
      { dx: 40, scale: 0.9, tint: 0.06 },
    ]);
  });

  it("does not let the shade track the size, so one variation is not two", () => {
    /* The table is walked cyclically and read at two different offsets by the
     * two sides, so its columns are only decorrelated if they are decorrelated
     * IN THE TABLE. Were `tint` to rise with `scale`, every big tree would also
     * be a pale one and the line would read as one axis of variation seen twice
     * — which is the thing the table exists to avoid (`EVO-UNI-207` would let a
     * check derived from the table itself pass either way, so this compares the
     * two orderings against each other). */
    const bySize = [...TREE_JITTER].sort((a, b) => a.scale - b.scale);
    const byShade = [...TREE_JITTER].sort((a, b) => a.tint - b.tint);

    expect(bySize).not.toEqual(byShade);
  });

  it("never lifts a tree past its own crown colour", () => {
    /* `tint` is a fraction spent inside `color-mix()`, and the one-directional
     * rule in `TreeJitter.tint` is what keeps `--sds-tree` the darkest a tree
     * can be at any hour. A row above 1 would be invalid CSS; a row below 0
     * would silently drop the whole gradient stop. */
    for (const row of TREE_JITTER) {
      expect(row.tint).toBeGreaterThanOrEqual(0);
      expect(row.tint).toBeLessThanOrEqual(1);
    }
  });
});

describe("the verge", () => {
  it("stops the paving inside the treeline, so no tree stands in asphalt", () => {
    /*
     * THE REASON `PAVED_HALF_WIDTH` LIVES IN THIS FILE. The stylesheet paints
     * the apron at twice it and the grass everywhere else, so this comparison
     * is the whole difference between a treeline in grass and eighty-eight
     * trees standing in tarmac — and CSS cannot make it.
     *
     * The bound is the NEAREST trunk, which is a jitter row with `dx: 0`; the
     * pushed-back rows only ever move a tree further into the grass.
     */
    const nearest = Math.min(
      ...treePlacements(A_BIG_LOT).map((tree) => Math.abs(tree.x)),
    );

    expect(PAVED_HALF_WIDTH).toBeLessThan(nearest);
    /* And by enough to read as a verge rather than as a kerb. */
    expect(nearest - PAVED_HALF_WIDTH).toBeGreaterThanOrEqual(120);
  });

  it("is the number the composition was approved at", () => {
    /* A literal, for the reason the file header gives: derived from
     * `OFFSET + TREE_SETBACK` it would pass for every value it could take. */
    expect(PAVED_HALF_WIDTH).toBe(750);
  });

  it("leaves the paving wider than the lane it carries", () => {
    /* The apron has to hold the 420px road and the parking either side of it.
     * Below this the grass would swallow the parking rows and the lot would
     * read as a country lane. */
    expect(PAVED_HALF_WIDTH * 2).toBeGreaterThan(420);
  });
});

describe("treePlacements", () => {
  it("lines both sides of an eight-screen lot with forty trees", () => {
    expect(treePlacements(COUNT)).toHaveLength(40);
  });

  it("grows with the lot — twenty screens take eighty-eight", () => {
    expect(treePlacements(A_BIG_LOT)).toHaveLength(88);
  });

  it("starts at the gate on the left, one tree ahead of the camera", () => {
    expect(treePlacements(COUNT)[0]).toEqual({
      side: "left",
      x: -900,
      z: -100,
      scale: 1.05,
      tint: 0,
      variant: 0,
    });
  });

  it("puts the right-hand line half a spacing out of phase with the left", () => {
    /* Index 20 of the EIGHT-screen lot: the left block is 20 long, so this is
     * the first tree on the right. Its depth is -300 rather than -100 — the
     * half-spacing offset — and it reads the jitter table three rows along, so
     * it is not the same width or size as the left tree beside it. */
    expect(treePlacements(COUNT)[20]).toEqual({
      side: "right",
      x: 940,
      z: -300,
      scale: 0.95,
      tint: 0.16,
      variant: 1,
    });
  });

  it("runs the left line one screen spacing past the end of the drive", () => {
    /* The last left tree of the EIGHT-screen lot. The drive ends at 7200 and
     * the line is allowed to 8000, so -7700 is the last one that fits and
     * -8100 would not. */
    expect(treePlacements(COUNT)[19]?.z).toBe(-7700);
    expect(lotZ(1, COUNT)).toBe(7200);
  });

  it("puts every left tree before every right tree", () => {
    const sides = treePlacements(COUNT).map((tree) => tree.side);
    const firstRight = sides.indexOf("right");

    expect(firstRight).toBe(20);
    expect(sides.slice(0, firstRight).every((side) => side === "left")).toBe(
      true,
    );
    expect(sides.slice(firstRight).every((side) => side === "right")).toBe(
      true,
    );
  });

  it("keeps every tree outside the lane and ahead of the gate", () => {
    for (const tree of treePlacements(A_BIG_LOT)) {
      expect(Math.abs(tree.x)).toBeGreaterThanOrEqual(900);
      expect(tree.z).toBeLessThan(0);
      expect(tree.variant).toBeGreaterThanOrEqual(0);
      expect(tree.variant).toBeLessThan(3);
    }
  });

  it("is the same lot every time it is asked — nothing here is random", () => {
    expect(treePlacements(COUNT)).toEqual(treePlacements(COUNT));
  });
});
