# Drive-In Theme spec — Codex adversarial review prompt

Filled 2026-09-08 from the Part 3 pattern in
`/home/evan/EVOsystem/docs/meta-prompts/roadmap/roadmap-meta-prompt.md`, aimed at the
**spec** (Evan: "have codex adversarial the spec before writing the roadmap"; run
in-session on his per-instance approval). Reviewed revision frozen at portfolio_site
`f4cfda3`.

**Launch** (`EVO-TOOL-105`: workspace-write + network, from a scratch dir outside every repo):

```bash
mkdir -p /tmp/claude-1000/dt-theme-spec-review && awk '/^````/{f=!f;next} f' /home/evan/EVOsystem/portfolio_site/docs/planning/drive-in-reviews/drive-in-theme-spec-codex-prompt.md \
  | codex exec -s workspace-write -c sandbox_workspace_write.network_access=true -C /tmp/claude-1000/dt-theme-spec-review --skip-git-repo-check -
```

````
Adversarial review of a DESIGN SPEC that a phase roadmap will be written from. Do not
edit any file in any repo — you are a reviewer, not an implementer. Read-only probes and
scratch experiments are encouraged; your working directory is a scratch dir outside every
repo and you may copy files into it. If your sandbox blocks something, say so explicitly
and mark the related finding UNVERIFIED rather than reasoning as though you had checked.

TARGET
  Spec:       /home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-09-08-drive-in-theme-design.md @ f4cfda3
  Wireframe:  /home/evan/EVOsystem/portfolio_site/docs/wireframes/theater-drive-in-theme.html @ f4cfda3
              (open it in a browser if you can; it renders under Chromium via
              `pnpm -C /home/evan/EVOsystem/portfolio_site/theater exec playwright screenshot ...`
              — copy the theater dir to scratch first if node_modules writes are refused)
  Parent spec: /home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-08-25-drive-in-theater-design.md
  Parent roadmap (shipped, DTF/DT0–DT7 landed; read its Changelog and Decision records):
              /home/evan/EVOsystem/portfolio_site/docs/roadmaps/drive-in-theater-roadmap.md
  Standard the roadmap will be written to:
              /home/evan/EVOsystem/docs/meta-prompts/roadmap/roadmap-meta-prompt.md @ d5f5b5f
  The code the spec makes claims about (read it, do not trust the spec's description):
              /home/evan/EVOsystem/portfolio_site/theater/src/**  (esp. lot/geometry.ts, lot/build-lot.ts,
              lot/lot-scene.ts, styles/tokens.css, styles/global.css, main.ts, loader/asset-loader.ts,
              test-helpers/fake-image.ts, engine/engine-styles.ts)
              /home/evan/EVOsystem/portfolio_site/theater/e2e/**  (helpers/app.ts, every spec, nginx-parity.sh)
              /home/evan/EVOsystem/portfolio_site/theater/skills/rules-index/SKILL.md  (SDS-* law)
              /home/evan/EVOsystem/portfolio_site/docs/spikes/2026-08-25-transformed-video-probe.html (the DTF probe DT11 copies)
  Cross-repo reference: /home/evan/EVOsystem/jourNOW/frontend/src/utils/timePeriod.ts and
              /home/evan/EVOsystem/jourNOW/frontend/src/main.tsx (the time-of-day pattern being ported)
  Shared rules the spec cites: /home/evan/EVOsystem/infra/skills/rules-index/references/{universal,tooling,react-frontend}.md
  Live services: the portfolio container may be up — `curl -s -o /dev/null -w '%{http_code}' http://portfolio-site.localhost/theater/`.
              You can run the theater's unit suite from a scratch copy (`cp -r theater /tmp/... && pnpm install --offline` may
              or may not work; the repo root's node_modules is where pnpm put things — `pnpm -C <repo>/theater test` may
              succeed read-only). Report which you managed.
  Known limits: no browser fps measurement is possible for you — treat DT11's bands as text; you cannot generate images.

WHAT IT IS
A spec for a five-phase follow-up roadmap (DT11 falsifier spike; DT12 period engine;
DT13 sky/orb/lighting/ground tokens and CSS; DT14 MANUAL art generation by Evan; DT15
trees + car + specs) extending an already-shipped scroll-driven CSS-3D "drive-in" at
/theater/. Each roadmap phase will later be pasted into a FRESH Claude Code session with
no memory of the others, so every contract the spec states (function names, signatures,
custom-property names, attribute names, file paths, literal expected test values) will be
consumed literally. The spec's numbers (ground depth, tree counts, placements, palettes)
are what the phases will assert.

DECISION RECORD (made deliberately by Evan and the writing session; a deliberate decision
may still be a defect — say whether you disagree with the choice or found an accidental
omission, and whether the rationale carries the decision):
  1. The visitor's car is fixed to the viewport (stage-anchored), not in the 3D world; no parked cars.
  2. Six periods with jourNOW's exact hour bands; night is the base palette so today's look is unchanged.
  3. Generated raster sprites (PNG), trees used as CSS alpha masks recoloured per period; SVG placeholder fallback if no model yields real alpha.
  4. `?period=` query override only; no visible toggle; Playwright pins ?period=night on every navigation.
  5. Period re-evaluated only on visibilitychange (as jourNOW), never on a timer.
  6. Only the lot responds to the period; hero/exit beats keep the dark portfolio palette.
  7. Screens play clips in every period; daylight raises the unlit floor instead of switching screens off.
  8. The ground plane is re-sized from geometry (lead + depth custom properties) in DT13 because daylight exposes a pre-existing depth bug.
  9. DT11 is a falsifier run first (perf of ~88 masked planes + blurred glows; masks under preserve-3d); DT12/DT13 are not gated on it, DT15 is.
  10. Tree masks are applied from JS only after the asset loader has the bytes (SDS-006 nuance).
  11. Phase IDs continue the parent roadmap (DT11–DT15).

YOUR LENSES, in priority order:

1. CODE TRUTH. Every file path, symbol, signature, CSS selector, custom-property name,
   attribute, literal value and rule ID the spec cites — re-probe against the tree at
   f4cfda3. Especially: the ground-plane depth bug the spec asserts (is it real? compute
   it from global.css + geometry.ts; check what the lower viewport shows at progress 0
   and at progress 0.5 for 20 projects); the brightness formula; the claim that night is
   byte-identical; the literal test values (groundDepth(8)=11200, groundDepth(20)=20800,
   treePlacements(8) has 40 entries with the stated first entries, treePlacements(20) has
   88); the loader's `add`/`release` semantics and the FakeImages `autoSettle` claim;
   whether `page.clock` exists in the pinned Playwright version; whether Vite copies
   `public/` under `base: '/theater/'` the way the spec says; the e2e helpers' use of
   APP_PATH; whether `import.meta.env.BASE_URL` is usable in a module that Vitest also
   imports.

2. COMPOSABILITY AND FEASIBILITY. Does each phase produce exactly what the next
   consumes? Can a fresh agent holding only DT15's description build it without
   inventing something — draft the trickiest parts (mask application after load, the
   snapshot fields, the elementFromPoint spec) in your scratch dir and report every
   point where you had to guess. Is anything prescribed that the prescribed code cannot
   produce (e.g. `:root[data-period]` vs where the attribute is set; a mask on a
   3D-transformed element inside preserve-3d; a stage-anchored car inside a container
   the adapter owns under SDS-002; `translateZ(800px)` on a plane under
   `perspective: 900px` and `600px`)?

3. OUTCOME VALIDITY. DT11's bands: decidable as written? Can GO be reached while the
   real page is slow (does the probe reproduce the production path — Lenis-ticked rAF,
   GSAP scrub, the real brightness filters, the real number of decoders)? Can NO-GO be
   reached at all? Is the checker page's contract one that a diligent Evan could satisfy
   with a wrong file (a checkerboard with real alpha in the corners, say)? Does the
   `?period=night` pin hide a class of regression the suite used to catch?

4. OMISSIONS. What must happen for this to work that no phase owns? Consider: the
   Docker/nginx path for `/theater/art/*`; `.dockerignore`/`.prettierignore`/`.gitignore`
   effects on `theater/public/`; the loading ring gating on four more assets (progress
   arithmetic, failure policy); `destroy()`; the conformance kit's listener-leak and
   order-independence checks with the new elements; the narrow layout; reduced motion;
   the exit list / projects.test.ts; the nginx parity script; the pre-commit Prettier
   hook over new .ts/.css/.html files; the session-log rule; the `:host` (shadow-root)
   scoping of the period attribute.

5. STRATEGIC RISK. Is the core assumption the right one, and is DT11 the cheapest
   falsifier? Is anything measured only late that could be measured first? Is the art
   fallback actually reachable (does the checker's "download placeholders" get the
   wireframe SVGs into a shape `mask-image`/`<img>` will accept)?

OUTPUT
A prioritized findings list, most severe first. For each: severity
(CRITICAL/MAJOR/MINOR), the spec section, what is wrong and why it bites, evidence (the
command you ran and its real output, or the file and line you read), VERIFIED or
UNVERIFIED, and a concrete fix. If a claim checks out, do not report it. If you find
nothing major, say so plainly. End with a one-paragraph judgement: should a roadmap be
written from this spec as it stands?
````
