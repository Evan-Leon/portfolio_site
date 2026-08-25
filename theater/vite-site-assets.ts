// @ts-expect-error -- dependency policy excludes @types/node from this browser project.
import { createReadStream, statSync } from "node:fs";
// @ts-expect-error -- dependency policy excludes @types/node from this browser project.
import { extname, join, normalize, resolve } from "node:path";
import type { Connect, Plugin } from "vite";

declare const process: { cwd(): string };

const REPO_ROOT = resolve(process.cwd(), "..");
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".html": "text/html; charset=utf-8",
};

function middleware(): Connect.NextHandleFunction {
  return (request, response, next) => {
    const requestUrl = (request as { url?: string }).url;
    const pathname = new URL(requestUrl ?? "/", "http://localhost").pathname;
    const prefix = pathname.startsWith("/images/")
      ? "/images/"
      : pathname.startsWith("/projects/")
        ? "/projects/"
        : null;

    if (!prefix) {
      next();
      return;
    }

    const root = join(REPO_ROOT, prefix.slice(1, -1));
    const relative = normalize(pathname.slice(prefix.length));
    const file = resolve(root, relative);

    if (
      relative.startsWith("..") ||
      !file.startsWith(`${root}/`) ||
      !CONTENT_TYPES[extname(file).toLowerCase()]
    ) {
      response.statusCode = 404;
      response.end("Not found");
      return;
    }

    try {
      if (!statSync(file).isFile()) throw new Error("Not a file");
      response.statusCode = 200;
      response.setHeader(
        "Content-Type",
        CONTENT_TYPES[extname(file).toLowerCase()]!,
      );
      createReadStream(file).pipe(response);
    } catch {
      response.statusCode = 404;
      response.end("Not found");
    }
  };
}

export function siteAssets(): Plugin {
  return {
    name: "portfolio-site-assets",
    configureServer(server) {
      server.middlewares.use(middleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware());
    },
  };
}
