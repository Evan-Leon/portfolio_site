# Drive-In Theater roadmap — Part 3 review prompt (Codex handoff)

Filled from `/home/evan/EVOsystem/docs/meta-prompts/roadmap/roadmap-meta-prompt.md` Part 3
on 2026-08-25, after Part 2's two-agent evaluation was triaged and committed. The reviewed
revision is frozen at portfolio_site `647f093`; do not edit the roadmap until the review returns.

**Launch** (from any directory; the sandbox mode matters — `EVO-TOOL-105`):

```bash
mkdir -p /tmp/dt-part3 && awk '/^````/{f=!f;next} f' /home/evan/EVOsystem/portfolio_site/docs/planning/drive-in-reviews/drive-in-theater-part3-prompt.md \
  | codex exec -s workspace-write -c sandbox_workspace_write.network_access=true -C /tmp/dt-part3 --skip-git-repo-check -
```

Confirm the banner prints `(network access enabled)` before trusting any probe result.
Paste the response back into the writing session (or a fresh one pointed at this file).

````
Adversarial review of a roadmap. Do not edit any file in any repo — you are a
reviewer, not an implementer. Read-only probes against the running system are
encouraged. If your sandbox blocks a probe, say so explicitly and mark the related
finding as unverified, rather than reasoning from the documents as though you had
checked it.

TARGET
  Roadmap:  /home/evan/EVOsystem/portfolio_site/docs/roadmaps/drive-in-theater-roadmap.md @ 647f093
  Spec:     /home/evan/EVOsystem/portfolio_site/docs/superpowers/specs/2026-08-25-drive-in-theater-design.md @ 647f093
  Standard: /home/evan/EVOsystem/docs/meta-prompts/roadmap/roadmap-meta-prompt.md @ 079705f
  Consumers / cross-repo dependencies:
    /home/evan/EVOsystem/scroll-driven-skeleton @ 7e5d44a — the engine being VENDORED (copied) into portfolio_site/theater/ by phase DT0; read its src/, e2e/helpers/, vite/playwright/tsconfig configs and skills/rules-index/SKILL.md directly. It is not a runtime dependency after DT0.
    /home/evan/EVOsystem/infra/skills/rules-index/references/{universal,tooling,react-frontend}.md — the shared rule IDs the roadmap cites (EVO-UNI-*, EVO-TOOL-*, EVO-FE-*).
    Approved wireframes: portfolio_site/docs/wireframes/theater.html @ c9e55bd and index-hero-cta.html @ 959cdb9.
  Live services you can probe: the portfolio container on the evo-net Docker network, if it is up — `docker compose -f /home/evan/EVOsystem/portfolio_site/docker-compose.yml ps`; `curl -s -o /dev/null -w '%{http_code}' http://portfolio-site.localhost/` and `/projects/nom-noms.html` (Traefik routes *.localhost). The theater does not exist yet — `/theater/` is expected to 404 today.
  Known access limitations: you cannot run `docker compose build` or start containers (report those checks as unverified and reason from the Dockerfile text); you may copy scroll-driven-skeleton into /tmp/dt-part3 and run `npm ci`, `npm test`, `npx vite build`/`preview` there to simulate DT0's vendoring; no browser is available for DTF's measurement — treat its bands as text.

WHAT IT IS
Eleven phases, executed in ToC order, each phase prompt pasted into a FRESH Claude Code session with no memory of the others:
  DTF  — falsifier (spike): a throwaway HTML probe with eight CSS-3D-transformed <video> elements; Evan measures fps and hit-testing in real browsers and records GO / GO-REDUCED / NO-GO in the roadmap's decision table. Everything below waits on it.
  DT0  — pnpm workspace + theater/ Vite+TS scaffold; the skeleton's engine, gsapTimeline adapter, conformance kit, loader, host, chrome and their unit tests vendored in (lottie, frame-sequence, Wix dropped); a dev/preview middleware plugin serving /images/* and /projects/* from the repo root.
  DT1  — multi-stage Dockerfile (node:22-alpine build stage → existing nginx:alpine stage), theater/dist copied to /usr/share/nginx/html/theater; served at /theater/.
  DT2  — tokens re-valued to the portfolio palette; theater page shell (chrome, hero beat, one scene slot, exit beat with a no-JS <ul> of the eight project links, skip link).
  DT3  — projects.ts (8 entries), pure lot geometry (screenPlacement / lotZ / activeScreen / screenProgress), buildLot (CSS-3D lot inside the pinned container, one GSAP tween along Z plus per-screen lit keyframes), lotScene adapter wrapper (posters declared to sharedAssetLoader in load(), eager, snapshot() for the conformance kit), contract test.
  DT4  — <video muted loop playsinline preload="none"> per screen; play iff active (pure function of progress); <source> attached only while active under GO-REDUCED; error → poster fallback; unit test of the exact play/pause sequence forward and back.
  DT5  — EngineOptions.reducedMotionSteps (= projects.length + 1) and Engine.scrollToScene(sceneId, progress) added to the vendored engine; focusin on a screen drives the page to it; no play() under prefers-reduced-motion; narrow (<768px) single-file layout via custom properties.
  DT6  — six Playwright specs against `vite preview` at /theater/ (reveal, drive/reverse, active screen incl. a synthetic clip the spec creates and removes, click-through, reduced motion, keyboard), plus two deliberate breakages that must fail the named specs.
  DT7  — index.html hero gains "Enter the Drive-In" (primary), hidden <768px and under prefers-reduced-motion; placed last so the site never links to a half-built lot.
  DT8  — adding-project-demo-clips skill (canonical + Codex wrapper), ffmpeg recipe executed once against a synthetic source.
  DT9  — [MANUAL] Evan records and encodes eight clips to images/<slug>/demo.mp4, committing each as it lands.

PRIOR REVIEW — METHODS AND ACCESS (not conclusions)
Two cold agents already reviewed this document and their findings were fixed in place.
What they did and what they could reach:
  Agent A (code-truth lens, Claude Sonnet, no session context): read access to portfolio_site, scroll-driven-skeleton, the shared rules index and the wireframes; ran read-only shell probes; live-built a scratch copy of the skeleton with base:'/theater/' and ran vite preview; ran `docker run node:22-alpine` / `node:24-alpine` corepack probes; instructed to re-verify every path, line number, symbol, signature, rule ID and host-version claim, to run every verification command that can run today, and to hunt shadowed checks and over-broad matches. It spawned two sub-reviewers of its own with the same lens.
  Agent B (structure lens, Claude Sonnet, no session context): same read access; instructed to check template conformance, self-contained <context> blocks, cross-phase producer/consumer contracts (especially DT3→DT4→DT5→DT6 names, snapshot fields, attributes, custom properties, e2e selectors), dependency ordering, whether DTF's decision is actually consumed where phases claim to branch on it, verification decidability (checks that cannot fail), and the wireframe rule; and to execution-simulate DT0 and DT3 as an agent holding only that prompt.
  Before either ran, the writing session executed every runnable <verification> command against synthetic pass AND fail fixtures.
Those passes occurred; do not assume their conclusions were correct, and do not treat
any area as settled because it was looked at. Where re-checking is cheap, re-check.

DECISION RECORD
Decisions already made deliberately, with the reasoning behind each:
  1. Vendor the skeleton (copy) rather than submodule or npm-dependency — the skeleton repo is being handed to a collaborator; the portfolio must not track its future. Evidence: skeleton AGENTS.md "Project state" / transfer-checklist.
  2. pnpm, not the skeleton's npm — the skeleton's npm is a recorded departure (EVO-TOOL-002 row in its rules index) for the collaborator's benefit; portfolio_site already pins packageManager pnpm@11.15.1.
  3. Multi-stage Dockerfile rather than committing theater/dist — source is the only thing in git; a type error fails the image build (proven by DT1's deliberate-breakage check). Prod images reach the droplet via `docker compose pull` from ghcr.io (docker-compose.yml comment); who builds/pushes that image is unchanged by this roadmap and is NOT described in it.
  4. Rendering = DOM + CSS 3D driven by the vendored gsapTimeline adapter (approach A), not Blender frame sequences (B) or three.js (C) — real <a>/<video> elements give clickability, focus and native playback for free; no new dependency. Chosen by Evan after the trade-offs were presented.
  5. One continuous scene ("drive through the lot"), vh = 100 + 120 × 8, rather than one pinned scene per project — Evan's choice; scroll-back = reversing.
  6. Videos are deliberately OUTSIDE the asset loader (a recorded SDS-006 departure): a stream never "loads", preload="none" fetches nothing until activation, and gating the reveal on eight clips would be the spinner-forever case. Posters (which exist today) gate the reveal instead.
  7. No factory.assets manifest on the lot factory — the engine's warmDeferredAssets skips eager scenes and the lot is the sole, eager scene, so a manifest would never be read (found in Part 2, engine.ts read directly).
  8. DTF pre-registers three bands: GO (≥50 fps both browsers + click/Tab ok), GO-REDUCED (30–50 fps: DT4 attaches <source> only to the active screen), NO-GO (<30 or hit-test fails → stop; the fallback is a spec decision for Evan). The measurement is Evan's, in real browsers, recorded as a Manual Verification step, because no agent can read a DevTools frame-rate track.
  9. Short looping MP4 (≤10 s, 960×600, ≤1.5 MB) rather than GIFs or cross-faded PNGs — Evan's choice; GIFs at that size would be 5–20 MB each. No clip exists today (commit c23fbf4 removed the legacy GIFs), so every screen ships on its poster and DT9 is manual, last, and may lag.
  10. All eight projects with pages; images/chunk-norris/ (untracked, no page) excluded.
  11. Hero CTA hidden <768px and under prefers-reduced-motion by CSS only; a direct /theater/ visit still works (single-file layout, quantised motion) — "must work, not be beautiful".
  12. DT7 (the CTA) runs after DT6 so the homepage never links to an unfinished lot; DT8 depends on DT4 but sits after DT7 in the ToC.
  13. Geometry constants SPACING=800, OFFSET=480, YAW=18°, GROUND_LINE=58% are the source of truth; the wireframe's static z values (−600, −1400, …) are placement z + a depicted lotZ of 200 ("just past the gate"), stated in DT3 so tests use the formula.
  14. Engine additions in DT5 are named scrollToScene (not scrollToSceneProgress — the vendored e2e helper already exports that name) and reducedMotionSteps; both added to the vendored engine, not worked around in page code.
  15. DT6's active-screen spec creates a synthetic images/nom-noms/demo.mp4 in beforeAll if absent and removes it in afterAll — chosen over "assert only if the file exists", which would never prove real playback before DT9.
  16. Build stage pinned to node:22-alpine with corepack; the root packageManager pin makes that safe (EVO-TOOL-107).
A deliberate decision may still be a defect. Distinguish "I disagree with this choice"
from "this was an accidental omission", and say which you mean. Assess whether each
rationale is actually sufficient for the decision it is carrying.

YOUR LENSES, in priority order — the ones that bite for THIS roadmap are named; the
others (persistence, migrations, scarce hardware, cross-service contention) do not apply and should not be manufactured:

1. OMISSIONS. What must happen for this to work that no phase assigns to anyone? Specifically: (a) the production path — the roadmap proves the image builds locally, but how does the new multi-stage image reach ghcr.io and the droplet, and can a failed build on the droplet leave the live site down or serving a theater-less image? What does a half-executed DT1 (Dockerfile rewritten, build red) leave behind? (b) the pnpm-lock.yaml / node_modules churn at the repo root for a repo whose only dev dep was Prettier — anything that breaks the pre-commit hook or the Codex validator? (c) `vite preview` vs nginx: is there any URL shape (trailing slash, `/theater` without slash, hashed asset paths, the site-absolute `/images/` references) that works under the DT0 middleware and breaks under `nginx.conf`'s try_files, or vice versa, so DT6 passes and production 404s? (d) observability: when a clip 404s or a poster settles without bytes in production, what does a visitor see and what does Evan see?

2. EXECUTION SIMULATION. Walk DT0 and DT3 as the agent who has ONLY that phase prompt and the repo. Copy the skeleton into /tmp/dt-part3 and actually attempt DT0's vendoring far enough to run its unit suite with lottie/frame-sequence removed and base:'/theater/' set — report every point where you had to guess, what you guessed, and any test that cannot pass as prescribed. For DT3, draft geometry.ts and the lot-scene wrapper's load()/snapshot() in scratch against the real gsap-timeline.ts and adapter-contract.ts and say whether the conformance kit's checks (idempotence at 0.42, order-independence sweep, observeNotDiscriminating, containment, cleanup) can pass with the prescribed snapshot and the Image stub.

3. DECIDABILITY AND OUTCOME VALIDITY. (a) DTF: can it record GO for a lot that will still perform badly under the real engine? The probe drives translateZ from a plain scroll listener with <video autoplay>; production uses Lenis smoothing, a rAF engine seeking a GSAP timeline, filter: brightness() keyframes on eight surfaces, and at most one or two decoding videos — is the probe an easier path or a harder one than production, on each axis? Is "lowest sustained fps over 10 s of wheel scrolling" decidable and reproducible across Evan's two browsers, or will it stall in the 30–50 band? Does GO-REDUCED's mitigation (source attached only when active) actually address what a 30–50 fps reading would mean? (b) DT6's ## Done claims the suite "fails when the theater stops revealing, driving, reversing, lighting the right screen, linking, snapping under reduced motion, or answering the keyboard" — test each claim against the specs as prescribed (chromium only, computed matrix3d reads, synthetic clip): which of those failures would NOT be caught? (c) The loading gate: with posters eager and videos outside the loader, can the page reveal with the lot visibly wrong (dark screens, no marquee) while the ring reported 100%?

4. STRATEGIC RISK. The core assumption (transformed <video> performs and hit-tests) is measured first by DTF. Is there a second assumption the roadmap rests on that is only tested late — e.g. that filter: brightness() keyframes on 8 transformed surfaces are cheap, that Lenis + a 1060vh single scene feels drivable rather than sluggish, that eight videos' posters (existing 1280×800 PNGs, some >1 MB) load fast enough to keep the eager gate under a few seconds on a phone? If one is false, does the design discover it before DT3–DT6 are spent?

5. ANYTHING ELSE that would bite at execution time — including a phase whose ## Done asserts something its mechanism cannot deliver (DT5's "never a dead end for anyone"; DT4's "complete before any clip exists").

OUTPUT
A prioritized findings list, most severe first. For each: severity
(CRITICAL/MAJOR/MINOR), the phase and location, what is wrong and why it bites,
evidence (the command you ran and its real output, or the file and line you read),
whether the finding is VERIFIED or UNVERIFIED, and a concrete fix. If a claim checks
out, do not report it. If you find nothing major, say so plainly rather than padding
the list — that is a useful result. End with a one-paragraph judgement: would you
execute this roadmap as written?
````
