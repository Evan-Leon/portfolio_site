---
date: 2026-08-25
agent: codex
type: phase-execution
phases: [DT4]
repos: [portfolio_site]
---

## Accomplished

Phase DT4 is complete. Every lot screen now owns a muted looping inline video with its poster as fallback, and the DTF `GO` path keeps each MP4 source attached with `preload="none"`. Playback follows the absolute active-screen band under SDS-001, repeated seeks do not restart it, failed video/source candidates are removed and marked `data-clip="missing"`, and teardown pauses and detaches every remaining candidate. The SDS-006 streaming departure is recorded at video construction. The final no-clips nginx image was rebuilt and force-recreated.

## Commits

- `cdc8fc0` — `feat(dt4): screens play their clip while active, fall back to the poster when missing`
- Session-log commit: this commit.

## Uncommitted work left behind

- Pre-existing untracked `images/chunk-norris/` remains untouched and excluded from both commits.

## Verification

- Initial focused Vitest run — failed: clip listeners were wired before the inner adapter built the DOM, and the pre-DT4 listener expectation omitted the first `null → 0` activation. Corrected by wiring after inner load and updating the fixture/expectation.
- Focused Vitest rerun — pass: 21 files / 287 tests, including `lot-scene.test.ts`, `lot-scene.contract.test.ts`, and `build-lot.test.ts`.
- First full gate — stopped at TypeScript TS2683 for untyped `this` in the media spies; corrected with `this: HTMLMediaElement`.
- `pnpm -C theater typecheck && pnpm -C theater lint && pnpm -C theater test` — pass; 21 files / 287 tests.
- DT4 structural greps — pass: SDS-006 departure comment present, `preload="none"` present, and neither controls nor autoplay is enabled.
- `pnpm -C theater build` — pass; production bundle emitted.
- `pnpm format:check`, `git diff --check`, and `python3 scripts/validate_codex_setup.py` — pass.
- Initial Docker rebuild and forced recreation — pass. First combined post-rebuild probe was blocked by Docker-socket sandbox permissions; approved rerun passed with the container Up, `/theater/` 200, and the absent clip 404.
- Synthetic `images/nom-noms/demo.mp4` generation — pass (960×600, 30 fps, four seconds, H.264). First sandboxed rebuild was blocked by read-only Buildx state; approved rebuild passed. Immediate route probe hit the documented Traefik window with 502; retry settled at 200.
- First Playwright probe — failed before navigation because Chromium rejects a manually overridden `Host` header. Second probe reached the theater but failed on an invalid unquoted attribute selector. Corrected browser probe — pass: Nom Nom's current time advanced while active, paused after passing, advanced again driving backward, the next absent clip set `data-clip="missing"`, all eight posters remained, no page errors occurred, and the only console error was the expected MP4 404.
- Synthetic clip deletion — pass; `git status` showed no `images/nom-noms/` change. Final approved Docker rebuild/forced recreation passed; `/theater/` returned 200 and `/images/nom-noms/demo.mp4` returned 404.
- Pre-commit hook — pass.

## Blockers

None.

## Open flags

None.

## Rules-index candidates

None.

## Meta-prompt / skill / doc updates

None. The DT4 phase, theater rules index, rebuild skill, and session-log skill were precise enough to execute the phase and verify both missing-clip and real-clip paths.

## Next steps

- Execute DT5 when requested: reduced-motion video suppression, keyboard focus driving, and narrow-screen behavior.

## Pointers

- `docs/roadmaps/drive-in-theater-roadmap.md` § Phase DT4 and Decision records.
- `theater/skills/rules-index/SKILL.md` — SDS-001, SDS-003, and the recorded SDS-006 departure are load-bearing.
- `.claude/skills/rebuild-restart/SKILL.md`.
- `.claude/skills/writing-session-logs/SKILL.md`.
