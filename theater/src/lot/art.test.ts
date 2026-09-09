/*
 * The sprite URLs, against literal expected strings.
 *
 * Written out rather than rebuilt from `ART_FILES` and `ART_EXTENSION`
 * (`EVO-UNI-109`) — a test that interpolates the same constants the
 * implementation does passes for every base and every extension, including the
 * ones that 404. Both bases that actually occur are covered: `/` is what Vitest
 * reports for Vite's `BASE_URL`, and `/theater/` is what the built page runs
 * under.
 */
import { describe, expect, it } from "vitest";

import { ART_EXTENSION, ART_FILES, artUrls } from "./art";

describe("the art contract", () => {
  it("names four sprites — the wagon and three silhouettes", () => {
    expect(ART_FILES).toEqual({
      car: "car",
      trees: ["tree-1", "tree-2", "tree-3"],
    });
  });

  it("ships as PNG — DT14 generated raster sprites, not the SVG fallback", () => {
    expect(ART_EXTENSION).toBe("png");
  });
});

describe("artUrls", () => {
  it("builds the URLs Vitest sees, where the base is the site root", () => {
    expect(artUrls("/")).toEqual({
      car: "/art/car.png",
      trees: ["/art/tree-1.png", "/art/tree-2.png", "/art/tree-3.png"],
    });
  });

  it("builds the URLs the built page is served at", () => {
    expect(artUrls("/theater/")).toEqual({
      car: "/theater/art/car.png",
      trees: [
        "/theater/art/tree-1.png",
        "/theater/art/tree-2.png",
        "/theater/art/tree-3.png",
      ],
    });
  });

  it("orders the trees by variant, so a placement's variant indexes them", () => {
    const { trees } = artUrls("/");

    expect(trees[0]).toContain("tree-1");
    expect(trees[1]).toContain("tree-2");
    expect(trees[2]).toContain("tree-3");
  });
});
