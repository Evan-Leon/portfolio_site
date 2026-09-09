/*
 * The names of the sprite files, and how to build their URLs.
 *
 * Pure, and deliberately free of every environment read — this module is
 * imported by unit tests under Vitest (where Vite's `BASE_URL` is `/`, not
 * `/theater/`) and by Playwright specs under a plain Node runner (where the
 * whole `env` object is `undefined` and reading through it throws). So the base
 * is a parameter, and **`lot-scene.ts` is the only file that supplies the real
 * one** — it is also the only file in `lot/` allowed to name the environment at
 * all, which a guard in DT15's verification enforces:
 *
 *   - production: the environment's base → `/theater/art/car.png`
 *   - unit tests: `artUrls('/')`
 *   - DT16's specs: `artUrls(APP_PATH)`
 *
 * WHY ONE EXTENSION FOR ALL FOUR
 * ------------------------------
 * DT14 either generated raster sprites or fell back to the SVG placeholders,
 * for the whole set at once — there is no mixed state, so a per-file extension
 * would be four ways to spell one decision. It went the raster way, so this is
 * `png`; the declaration is kept in exactly this form because DT16's parity
 * script greps it to know which files to expect on the served origin.
 *
 * WHY VITE SERVES THESE UNHASHED
 * ------------------------------
 * They live in `theater/public/art/`, which Vite copies into `dist/` verbatim
 * under `base: '/theater/'`. That is what makes the URL predictable enough to
 * construct here rather than import — an `import treeUrl from './tree-1.png'`
 * would be hashed, and the loader's URL and the CSS's `mask-image` would have
 * no way to agree on it without threading the import through both.
 */

/** Which format the sprite set was produced in. See the header. */
export type ArtExtension = "png" | "svg";

/**
 * The extension all four sprites share.
 *
 * Keep this declaration exactly as written — `ART_EXTENSION: ArtExtension =`
 * followed by the quoted literal. DT16's parity script reads the value out of
 * this file with a grep rather than importing it, because it runs against the
 * *served* origin and has no build to import from.
 */
export const ART_EXTENSION: ArtExtension = "png";

/** The basenames, without extension. Three trees, one per silhouette. */
export const ART_FILES = {
  car: "car",
  trees: ["tree-1", "tree-2", "tree-3"],
} as const;

/** The four sprite URLs, rooted at `base`. */
export interface ArtUrls {
  /** The visitor's wagon, drawn from behind. */
  car: string;
  /**
   * The three tree silhouettes, in variant order.
   *
   * A fixed-length tuple rather than an array, so `trees[3]` is a type error
   * and the `0 | 1 | 2` variant a placement carries indexes it exactly.
   */
  trees: readonly [string, string, string];
}

/**
 * Build the sprite URLs for a given base path.
 *
 * `base` is expected to end in a slash, which is the shape both Vite's
 * `BASE_URL` and the e2e helpers' `APP_PATH` already have.
 */
export function artUrls(base: string): ArtUrls {
  const url = (name: string): string => `${base}art/${name}.${ART_EXTENSION}`;

  return {
    car: url(ART_FILES.car),
    trees: [
      url(ART_FILES.trees[0]),
      url(ART_FILES.trees[1]),
      url(ART_FILES.trees[2]),
    ],
  };
}
