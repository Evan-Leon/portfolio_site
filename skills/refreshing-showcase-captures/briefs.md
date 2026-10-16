# Sub-agent briefs (used 2026-10-16 for six apps)

Each agent gets one of these by path plus its app block: repo, URL, scratch dir, the previous Coverage note, what changed, and (for capture) the approved flow, screenshot list and exclusions as literal strings. Scratch dirs go under the session scratchpad.

## Recon brief (Sonnet, read-only)


You are doing STEP 0.5 (recon) of the portfolio-showcase meta-prompt for ONE app whose UI changed
since its portfolio demo clip was recorded in early September 2026. Nobody films anything yet;
your output is evidence for a demo-flow proposal Evan will approve.

Read first, with the Read tool: /home/evan/EVOsystem/infra/meta-prompts/portfolio-showcase/portfolio-showcase.md
lines 197-326 (STEP 0 and STEP 0.5) and 591-710 (frame quality rules and capture traps).

### Hard limits
- READ-ONLY. Do not edit, create or commit anything in any git repo. Do not run docker compose
  build/up/restart/down. Do not write to any database or API.
- In every Playwright context, install a route guard before any navigation that ABORTS every
  non-GET request to the app (`ctx.route('**/*', r => r.request().method() === 'GET' ? r.continue() : r.abort())`),
  and set `serviceWorkers: 'block'`. Log any request you aborted.
- Playwright: import { chromium } from '/home/evan/EVOsystem/portfolio_site/theater/node_modules/@playwright/test/index.mjs'.
  Viewport 1280x800, deviceScaleFactor 1. Log console errors.
- Write scripts and PNGs only under your scratch dir (given below). Name PNGs `<nn>-<route-or-state>.png`.
- Do not use sub-agents.

### What to do
1. Confirm the app serves: curl the URL (200) and one of its API routes (2xx). If not, stop and report.
2. Read the app's router / nav components for the list of routes or states. Read the commit subjects
   below to know what is new.
3. Screenshot every top-level route (and, for id-parameterised routes, 2-3 candidate records chosen
   by querying the app's own GET API for richness). Wait for data, not just paint. Check overflow
   with `page.evaluate(() => [document.documentElement.scrollWidth, innerWidth])`. Find the real
   scroller if the window does not scroll.
4. LOOK at every PNG with the Read tool. Per route note: populated or empty, good hero or not,
   overflow, broken/erroring panels, anything that looks like personal data (real people's names
   other than Evan, emails, finances, private writing, secrets, internal session ids).

### Report (your final message; keep it under ~600 words)
- Serving status and anything broken.
- Per-route table: route | populated? | hero quality | overflow | data concerns | PNG path.
- PROPOSED FLOW: 2-4 clip beats (in-app clicks between them, ~10 s total) and which 1-5 beats are the
  screenshots (01 = hero shown in the card crop's top third). Prefer showing what is NEW.
- Whether the flow needs any write or seeded data (and why), or is fully read-only.
- Exclusions Evan might want (literal strings), and any frame you would keep out.
- Aborted non-GET requests seen during recon.

## Capture brief (Opus, STEPs 0-3)


You record a refreshed portfolio demo clip and screenshot set for ONE app whose UI was redesigned.
The demo flow below is approved by Evan. You do STEP 0 (preconditions, minus the portfolio_site
git-clean check — the orchestrator owns portfolio_site), STEP 2 (capture) and STEP 3 (encode,
contact sheet). The orchestrator does placement, rebuild and commit; you do NOT touch
/home/evan/EVOsystem/portfolio_site except reading it.

Read first, with the Read tool, all of: /home/evan/EVOsystem/infra/meta-prompts/portfolio-showcase/portfolio-showcase.md
(lines 61-113 decisions, 197-260 STEP 0, 429-770 STEPs 2-3). Follow STEP 2's template and traps and
STEP 3's encode exactly (960x600 H.264 yuv420p, no audio, +faststart, <=10 s, <=1.5 MB).
Recon evidence for this app (scripts, PNGs, selectors, scrollers) is in the recon dir named below —
reuse it.

### Hard limits
- READ-ONLY against the app. Install, before any navigation, a guard that ABORTS every non-GET request
  to the app (`ctx.route('**/*', r => r.request().method()==='GET' ? r.continue() : r.abort())`, then
  any response-filter routes registered AFTER it so they take precedence for their URLs). Keep
  `serviceWorkers: 'block'`. No seeding, no DB writes, no docker build/up/restart, no git writes in
  any repo. No sub-agents.
- Navigate with in-app clicks (or the app's own pushState) after the first goto — no goto mid-clip.
- Personal-data rule: nothing in any frame of the clip or screenshots may show the exclusions listed
  below. Exclusions are enforced by filtering API responses with ctx.route BEFORE first navigation
  (preserve response shape), or by choosing frames that never contain them. Verify against the
  contact sheet AND every screenshot by looking (Read tool). If a leak can't be prevented, drop the beat.
- Screenshot count: 3-5, named 01.png.. in the scratch dir; 01 is the hero (identifying UI in the top third).
- Work in your scratch dir only: S given below. `rm -f $S/*.webm $S/0?.png` before each take.

### Report (final message, <= 400 words)
Clip duration/size/ffprobe line, LEAD used, number of takes, screenshot list with one line each,
what the walk shows, every exclusion and how enforced, any aborted non-GET requests, any app bug
seen. Confirm you looked at every PNG and the contact sheet. Paths of demo.mp4, 0?.png, contact-sheet.png.
