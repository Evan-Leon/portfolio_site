# Behavior check: portfolio_site (skills audit, batch 6)

Claude only (batch 6: `codex` list empty, R-CODEX-CAT). Opus, plan mode, Read/Grep/Glob only.
Before at `710474b` (`before-claude.md`), after at `4d2a24c` plus the uncommitted conversion
(`after-claude.md`). Every run exited 0. Remarks about the staged skill moves as foreign work are an
artifact of the test, not a regression.

| Prompt | Touches | Before | After | Verdict | Why |
|---|---|---|---|---|---|
| tail-lights (claude) | theater rules-index (section moved CLAUDE.md → AGENTS.md), tokens, rebuild-restart | globbed for and read `theater/skills/rules-index`; traced the tokens; proposed `docker compose up -d --build portfolio-site` to serve it | read the rules index, the new `theater-standing-facts` memory and `skills/rebuild-restart`; named `docker compose build && docker compose up -d --force-recreate` and checking the served CSS | better | the rules index still loads first, and serving now follows the skill's `--force-recreate` form instead of an ad-hoc `--build` |
| new-screenshots (claude) | adding-project-screenshots (moved, adapter line folded), rebuild-restart | found no new files; named the skill and both swipers; asked where the files went | read `skills/adding-project-screenshots/SKILL.md`; found no new files; both swipers, the force-recreate rebuild and the Cloudflare cache named | same | same conclusion and question; the moved skill was discovered and read |
| roof-box (claude) | treating-art-sprites (moved, tree lessons added), never commit raw, rules index | read the skill from `.claude/skills/`, the rules index and the prompt template; asked about size and look | read `skills/treating-art-sprites/SKILL.md`, the template, `fit.mjs`, the plate-ring prompt and the rules index; full loop plan with "never committed as it comes back", `--pockets` judged by eye | same | same route through the moved skill; plan is fuller but the obligations exercised are the same |
| commit-hurry (claude) | Before committing (hook, format, never `--no-verify`) | read the hook; refused `--no-verify` (cited CLAUDE.md); prettier `--write` then `commit --only` | read the hook; refused `--no-verify` ("the repo rules say not to bypass or weaken the hook"); prettier `--write` then `commit --only`; `pnpm install` if prettier missing | same | every Before-committing obligation held through the merged AGENTS.md |
| session-log (claude) | writing-session-logs (stub removed, user level) | read the repo stub, then infra's skill; drafted the Q&A log and `commit --only` | read infra's skill directly; drafted the log, the fold-back audit command and `commit --only` | same | the user-level skill was found without the stub; the session-log obligation held |
