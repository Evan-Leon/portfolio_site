/*
 * Playwright configuration — end-to-end tests only.
 *
 * `testDir: 'e2e'` is the other half of the Vitest boundary declared in
 * vite.config.ts (EVO-TOOL-005). Vitest never collects from here; Playwright
 * never collects from `src/`. Each runner owns exactly one directory.
 *
 * No specs exist yet — SD10 writes them, and SD12 adds the CI job that runs
 * them. Running `pnpm test:e2e` today reports an empty suite, which is the
 * honest answer.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",

  /*
   * EVO-TOOL-082: `trace: 'on-first-retry'` — Playwright's usual default and
   * the value most examples show — writes nothing when retries are 0, because
   * there is no retry to trigger it. This config does not retry, so the trace
   * is keyed on failure instead; otherwise the debugging artefact SD10 expects
   * to rely on is simply never produced.
   *
   * The spelling matters: the rule's prose says "on-first-failure", but the
   * value Playwright actually accepts is `retain-on-first-failure` (see
   * `TraceMode` in playwright/types/test.d.ts). `on-first-failure` is a type
   * error.
   */
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-first-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  /*
   * e2e runs against a real production build, not the dev server — the dev
   * server serves unbundled modules and would not exercise what actually
   * ships.
   */
  webServer: {
    command: `pnpm build && pnpm preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,

    /*
     * `false`, not the usual `!process.env.CI`. Reuse is unsafe here
     * specifically because the command above BUILDS: reusing a server started
     * an hour ago skips the build entirely, so the suite silently tests a
     * stale `dist/` and reports on code that is no longer in the tree. A fresh
     * build costs well under a second.
     *
     * `--strictPort` is the other half — without it Vite would quietly pick
     * the next free port when 4173 is taken and the tests would run against
     * whatever is on it.
     */
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
