---
date: 2026-09-09
agent: claude-code
type: feature
mode: attended
phases: [DT9]
repos: [portfolio_site, docs]
---

## Accomplished
- The three publicly hosted non-EVOsystem projects now have demo clips on their theater screens: Media Cloud Web Tools (screen 17, 10.00 s / 917 KB), Media Cloud Vitals (screen 18, 9.20 s / 391 KB), ShowRunner Digest (screen 19, 10.00 s / 928 KB). All three were captured by Playwright against the live public sites, one Opus sub-agent per site in parallel, orchestrated from this portfolio_site session (Fable stays orchestrator per the no-Fable-subagents rule). Pages, posters and theater registrations already existed, so this was clip-only: STEPs 5–6 of the showcase prompt were no-ops.
- Media Cloud sign-in was done off camera in a throwaway context with Evan's credentials supplied in the prompt; no password field is in any frame and the header shows only a generic avatar.
- The host had no CJK font, which painted a Korean headline in Vitals' live feed as tofu on the first take. Installed Malgun Gothic, Microsoft YaHei, Yu Gothic and SimSun from the Windows font dir into `~/.local/share/fonts` and re-took. This is a host-level fix that benefits every future capture.
- ShowRunner Digest is a fixed 1390 px layout whose OPTIONS/POWER knobs sit past x=1280, so it was recorded at 1440×900 (same 1.6 aspect, no crop). The bottom quarter of each frame is the site's own `130vh` frame background; on the theater screen it merges with the dark frame.
- The showcase meta-prompt was updated so this path is repeatable (docs repo): intro narrowed to spead-read as the one remaining hand recording, a second Coverage table for public-URL projects, CJK fonts in STEP 0, a "Remote sites" paragraph in STEP 2, runlog and changelog rows.
- Evan then asked for spead-read too. It is a Chrome extension (Plasmo, MV3), so a fourth Opus sub-agent loaded the prebuilt unpacked build from the app repo into headless Chromium (`channel: 'chromium'`, `--load-extension`; headless worked first time, and there is no xvfb here), opened Wikipedia's "Speed reading" article, selected the two lead paragraphs, replayed the background worker's own `toggle-speed-read` message from the service worker, played at 200 WPM and dragged the slider to 400. Screen 4, 10.00 s / 383 KB, three takes. **DT9 is complete: every one of the 20 screens has a clip.**
- The last clip broke one e2e test: `active-screen.spec.ts` proved the poster fallback by driving to spead-read as its no-clip fixture. The test now 404s that one clip through `page.route`, which raises the same `error` event a missing file does; the fallback code in `lot-scene.ts` is untouched.
- Attempted and not done: nothing.

## Commits
- portfolio_site: `c45cafd` feat(dt9): media-cloud-web-tools, media-cloud-vitals and showrunner-digest demo clips
- portfolio_site: `bc57241` docs(session): remote trio demo clips captured and shipped (this log, first version)
- portfolio_site: `16cb608` feat(dt9): spead-read demo clip; fallback e2e manufactures its missing clip
- docs: `f433a29` docs(portfolio-showcase): remote-site capture path, CJK fonts, three non-EVOsystem clips
- docs: `ac5dca1` docs(portfolio-showcase): spead-read captured as an extension; DT9 hand recording retired

## Uncommitted work left behind
None.

## Verification
- `curl` on all three public URLs before dispatch: 200 each — pass.
- ffprobe on each demo.mp4: `h264,960,600,yuv420p`, 0 audio streams, durations 10.00 / 9.20 / 10.00 s, sizes 917139 / 391468 / 927687 bytes — all within the EVO-UNI-024 convention — pass.
- Contact sheet and last frame of every clip inspected by the orchestrator (not only the sub-agent): no login screens, no spinners, no tofu after the font fix, no third-party personal data — pass.
- `docker compose build && docker compose up -d --force-recreate`, then curl of `/projects/<slug>.html`, `/images/<slug>/01.png`, `/images/<slug>/demo.mp4` for all three slugs plus `/theater/`: 10/10 200 with correct content types and byte sizes — pass.
- `cd theater && pnpm test:e2e`: 57 passed — pass.
- Lit-screen probe (STEP 7's `theater-check.mjs`) for screens 17, 18, 19: `lit '1'`, `clip null`, `videoSrc` ending in the slug's demo.mp4, `playing true` for all three — pass.
- `fold_back_audit.py` over `docs/session-logs/`: 0 pending, 0 needs_decision; one pre-existing `APPLIED_NO_COMMIT` finding on the 2026-09-08 theme-roadmap log about memory files (not committable by design) — noted, not mine.
- spead-read: ffprobe `h264,960,600,yuv420p`, 0 audio, 10.00 s, 382891 bytes — pass. Rebuilt; curl of page, poster, clip, `/theater/`: 4/4 200 — pass. Lit-screen probe screen 4: lit, videoSrc = spead-read demo.mp4, playing — pass.
- `pnpm test:e2e` after placing spead-read: **56/57, "a screen with no clip falls back to its poster" FAILED** (no clipless screen left). After the `page.route` fix: `playwright test e2e/active-screen.spec.ts` exit 0, 3/3; full `pnpm test:e2e` exit 0, 57/57 — pass. `prettier --check` on the spec exit 0; `pnpm typecheck` clean — pass.
- Skipped: unit tests (`pnpm test`) — no `src/` TypeScript changed; the only code edit is an e2e spec, which the e2e run covers.

## Blockers
None.

## Open flags
- Media Cloud's live data carries its own encoding bug: a Swedish headline renders as mojibake ("pÃ¥") in Vitals' final frame, and the page has a "systeem" typo in its hero copy. Both are upstream content, visible but small; not ours to fix.
- Media Cloud Web Tools' results view overflows 1280 px by 22 px (Highcharts). Not visible in any frame.
- ShowRunner's frame is three-quarters content, one-quarter site background, and its poster (hand-taken, 2056×1071) is a tighter 1.92 crop; the pairing is allowed by the prompt but is the least tight of the twenty screens. A hand recording at the site's natural footprint would look better if Evan ever wants to spend the time.
- Sample stories in the Web Tools clip are random per query; this take included two US-politics headlines about renewable energy. Public news, but re-take if that reads as editorial.
- Media Cloud sign-in used Evan's real account credentials, given in the prompt. They live in the sub-agent transcript under the harness's task dir; nothing was written to the repo or memory.
- Spead Read's clip shows the article body with a blue text-selection highlight behind the modal for the whole run (that is where its 71 words come from). Evan's hand-taken poster has the same selection, so the pairing matches, but it is a stylistic choice a re-take could drop by using full-page extraction (3128 words, opens on a bare "A" — worse).
- The poster-fallback e2e now depends on `page.route` intercepting a `<video>` media request in Chromium; it passed 3/3 and 57/57 here, but Chromium has historically had edge cases with intercepted range requests. If it ever flakes, that is the place to look.
- The e2e spec's header still describes nom-noms' synthetic `testsrc2` clip as the with-clip fixture; that path is dead in practice (every clip is real) but harmless, left as is.

## Rules-index candidates
None.

## Meta-prompt / skill / doc updates
- APPLIED: intro's "still need DT9's hand recording" narrowed to spead-read; second Coverage table (Public URL) with the three remote projects ticked; CJK font install alongside the emoji block in STEP 0; "Remote sites" paragraph at the top of STEP 2 (public origin, session starts in portfolio_site, live-DOM selectors, warm slow queries and preload large assets off camera, 1440×900 for fixed-width sites, one sub-agent per site); runlog row; changelog receipt → `docs/meta-prompts/portfolio-showcase/portfolio-showcase{,-runlog,-changelog}.md` (see Commits: docs `f433a29`)
- APPLIED: spead-read ticked in the second Coverage table; intro retires DT9 hand recording; STEP 2 gains "Browser extensions" (persistent context + `--load-extension`, trigger via the service worker's own message, one page per context) and "the last clip lands on a test" (manufacture a missing-clip fixture with `page.route`, never by leaving a screen clipless); runlog and changelog rows → same three files (see Commits: docs `ac5dca1`)
- NO-CHANGE: `rebuild-restart` skill — rebuild, `--force-recreate`, and the 200-poll served as written, twice
- NO-CHANGE: showcase prompt STEP 3 (encode) and STEP 7 (verify) — the recipes ran verbatim against remote-captured raws and the existing container

## Next steps
- Push portfolio_site `main` when Evan wants the clips live (DT10 deploy is his call).
- Optional: re-take ShowRunner at a tighter framing if the empty lower band bothers Evan on the big screen.

## Pointers
- Showcase meta-prompt: `/home/evan/EVOsystem/docs/meta-prompts/portfolio-showcase/portfolio-showcase.md` (Coverage second table; STEP 0 fonts; STEP 2 "Remote sites")
- Runlog row 2026-09-09 and changelog row 2026-09-09 in the same directory
- Drive-in roadmap DT9: `docs/roadmaps/drive-in-theater-roadmap.md` — its DT9 row still reads `[MANUAL]`; the roadmap changelog was not edited this session (roadmap edits are their own convention), so the next roadmap touch should mark DT9 done citing `c45cafd` + `16cb608`
