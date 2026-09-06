/*
 * The registry is only useful if it points at files that exist and agrees with
 * the page's hand-written fallback. Both are things a unit test can check
 * against the repository itself, and both have already been wrong once:
 *
 *  - Until 2026-08-25 `images/el-blackjack/01.png` was a 68-byte 1×1 PNG
 *    placeholder. It decoded successfully, so the asset loader counted it as
 *    loaded and the ring reached 100% over what was, on screen, a blank screen.
 *    A test for *existence* passes on that file — which is why the poster check
 *    below reads the PNG's declared dimensions out of its IHDR header. A
 *    placeholder is "valid but wrong" (`EVO-UNI-053`), and only the pixels
 *    distinguish it.
 *  - The exit-beat `<ul>` in `index.html` is written by hand, because it is
 *    what a visitor with no JavaScript gets instead of the lot. Nothing at
 *    runtime reads both it and this registry, so a project added to one and not
 *    the other diverges in silence.
 *
 * Paths are resolved from this file's own location rather than the working
 * directory: Vitest's cwd is the theater workspace today, and a test that
 * silently depends on that breaks the day it is run from the repository root.
 *
 * Node's own types are not in this project — the dependency policy keeps
 * @types/node out of a browser workspace — so the `fs` import carries the same
 * `@ts-expect-error` that `vite-site-assets.ts` does, and `import.meta.dirname`
 * is cast at the one place it is read.
 *
 * The obvious alternative to that cast, `new URL('../index.html',
 * import.meta.url)`, is not available here at all: Vite rewrites that exact
 * expression into an *asset* URL, so what reaches Node is a served path with no
 * `file:` scheme and the file fails to import before a single test runs.
 */
// @ts-expect-error -- dependency policy excludes @types/node from this browser project.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { projects } from "./projects";

/** `theater/src/` — the directory this file is in. See the header. */
const HERE = (import.meta as ImportMeta & { dirname: string }).dirname;

/** `theater/index.html` — the page whose exit list must agree with this list. */
const THEATER_INDEX = `${HERE}/../index.html`;

/** The repository root, two levels up from `theater/src/`. */
const REPO_ROOT = `${HERE}/../../`;

/**
 * The smallest poster that is a real screenshot rather than a placeholder.
 *
 * Stated as a landscape bound and its portrait transpose, because two of the
 * eight (`classic-golf`, `el-blackjack`) are phone-shaped captures. Both are
 * hardcoded here rather than imported from anywhere: a guard that imports the
 * number it is guarding passes for every value of it (`EVO-UNI-109`).
 */
const MIN_LANDSCAPE = { width: 640, height: 400 };
const MIN_PORTRAIT = { width: 400, height: 640 };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width and height as the PNG's IHDR chunk declares them. */
function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);

  /* 8-byte signature, then the IHDR chunk: 4 bytes of length, 4 of type, then
   * the width and height as big-endian 32-bit integers. */
  for (const [index, byte] of PNG_SIGNATURE.entries()) {
    if (bytes[index] !== byte) throw new Error(`${path} is not a PNG`);
  }
  if (bytes.toString("latin1", 12, 16) !== "IHDR") {
    throw new Error(`${path} does not start with an IHDR chunk`);
  }

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

/** Every `href` in `index.html`'s exit-beat list, in document order. */
function exitListHrefs(): string[] {
  const html = readFileSync(THEATER_INDEX, "utf8");

  const list = /class="sds-exit-list"[\s\S]*?<\/ul>/.exec(html)?.[0];
  if (!list) throw new Error("index.html has no .sds-exit-list <ul>");

  /* Whitespace-tolerant on purpose: Prettier wraps the longer entries onto
   * their own lines, so a pattern anchored on the literal `<li><a href="`
   * matches only the five short ones — and a check that silently extracts a
   * subset compares two lists that were never both complete (`EVO-UNI-118`). */
  return [...list.matchAll(/<li>\s*<a\s+href="([^"]+)"/g)].map(
    (match) => match[1] as string,
  );
}

describe("projects — the registry itself", () => {
  it("lists sixteen projects with unique slugs", () => {
    expect(projects).toHaveLength(16);
    expect(new Set(projects.map((project) => project.slug)).size).toBe(16);
  });

  it("derives every path from the slug, site-absolutely", () => {
    for (const project of projects) {
      expect(project.href).toBe(`/projects/${project.slug}.html`);
      expect(project.poster).toBe(`/images/${project.slug}/01.png`);
      expect(project.clip).toBe(`/images/${project.slug}/demo.mp4`);
    }
  });

  it("names every project", () => {
    for (const project of projects) expect(project.name).not.toBe("");
  });
});

describe("projects — the files they point at", () => {
  it.each(projects.map((project) => [project.slug, project] as const))(
    "%s has a project page",
    (_slug, project) => {
      expect(existsSync(`${REPO_ROOT}${project.href.slice(1)}`)).toBe(true);
    },
  );

  it.each(projects.map((project) => [project.slug, project] as const))(
    "%s has a poster that is a real screenshot, not a placeholder",
    (_slug, project) => {
      const { width, height } = pngSize(
        `${REPO_ROOT}${project.poster.slice(1)}`,
      );

      const landscape =
        width >= MIN_LANDSCAPE.width && height >= MIN_LANDSCAPE.height;
      const portrait =
        width >= MIN_PORTRAIT.width && height >= MIN_PORTRAIT.height;

      expect(
        landscape || portrait,
        `${project.slug}: the poster is ${width}×${height} — too small to be a real screenshot`,
      ).toBe(true);
    },
  );
});

describe("projects — agreement with the no-JS exit list", () => {
  it("matches index.html's exit list, href for href and in order", () => {
    const hrefs = exitListHrefs();

    // Both sides asserted complete before they are compared: two brittle
    // extractions that each return nothing would otherwise agree perfectly.
    expect(hrefs).toHaveLength(16);
    expect(projects).toHaveLength(16);

    expect(hrefs).toEqual([
      "/projects/budget-app.html",
      "/projects/nom-noms.html",
      "/projects/el-blackjack.html",
      "/projects/classic-golf.html",
      "/projects/spead-read.html",
      "/projects/chunk-norris.html",
      "/projects/app-dash.html",
      "/projects/prompt-heus.html",
      "/projects/voice-trainer.html",
      "/projects/chudios.html",
      "/projects/chud.html",
      "/projects/co-host.html",
      "/projects/mind-palace.html",
      "/projects/media-cloud-web-tools.html",
      "/projects/media-cloud-vitals.html",
      "/projects/showrunner-digest.html",
    ]);
    expect(projects.map((project) => project.href)).toEqual(hrefs);
  });
});
