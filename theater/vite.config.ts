/*
 * One Vite config owns both the production build and Vitest. The narrow
 * .test.ts-only include and omitted passWithNoTests are deliberate departures
 * recorded in skills/rules-index/SKILL.md.
 */
import { defineConfig } from "vitest/config";
import { siteAssets } from "./vite-site-assets.ts";

export default defineConfig({
  base: "/theater/",
  plugins: [siteAssets()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
