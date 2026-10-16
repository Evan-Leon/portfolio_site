# portfolio_site ledger (skills audit, batch 6)

One row per scanned skill, guide section and memory file, judged against the rubric
(`infra/skills/writing-agent-guides/SKILL.md`; § numbers are its sections). Pre-run `HEAD` `710474b`.
Obligation `Y` marks a review, STOP, safety, incident-born or never/always line (§ 1). A moved or
reworded obligation names, under Pointer, the line it leaves in AGENTS.md (or the other home it now
lives in: a skill or a memory topic file, grepped there). No obligation is cut. A kept obligation that
stays where it was has an empty Pointer.

Before this run AGENTS.md (113 lines) and CLAUDE.md (59 lines) shared their opening, the session-log
section and the Before-committing section byte for byte. Only in AGENTS.md: the site description, the
layout, the commands, the dependency policy and the Codex Skills section. Only in CLAUDE.md: the
theater rules-index section (its own row below; it moves to AGENTS.md, so it is not lost).

## Skills

| Item | Kind | Verdict | Reason | Obligation | Pointer |
|---|---|---|---|---|---|
| `.claude/skills/adding-project-screenshots` | skill | update | moves to `skills/adding-project-screenshots` (D6, linked for both harnesses); the deferred adapter line folded verbatim (5a); metadata repair: description into `<what>. Use when` form (§ 5) | N | |
| `.claude/skills/rebuild-restart` | skill | update | moves to `skills/rebuild-restart` (D6); metadata repair: description into `<what>. Use when` form (§ 5); the `--force-recreate` incident note kept | Y | |
| `.claude/skills/treating-art-sprites` | skill | update | moves to `skills/treating-art-sprites` (D6); metadata repair: description into `<what>. Use when` form under 300 characters, every trigger kept (§ 5); gains the two lessons of the archived `tree-sprite-run-unfinished` memory (dark-subject backdrop, `--pockets 4`) | Y | |
| `.claude/skills/sweeping-session-logs` | skill | archive | user level (D6): legacy pointer stub, the user-level install replaces it | N | |
| `.claude/skills/writing-session-logs` | skill | archive | user level (D6): legacy pointer stub, the user-level install replaces it | N | |
| `.claude/skills/writing-tests` | skill | archive | user level (D6): legacy pointer stub, the user-level install replaces it | N | |
| `.agents/skills/adding-project-screenshots` | skill | archive | Codex adapter replaced by the D6 link to `skills/adding-project-screenshots`; its repo-content line folded (5a, `local-folds.json`), its path line obsolete (shared `adapter-folds.json`) | N | |
| `.agents/skills/rebuild-restart` | skill | archive | Codex adapter replaced by the D6 link to `skills/rebuild-restart`; every line obsolete in the shared `adapter-folds.json` (restates the canonical skill) | N | |
| `.agents/skills/treating-art-sprites` | skill | archive | Codex adapter replaced by the D6 link to `skills/treating-art-sprites`; every line obsolete in the shared `adapter-folds.json` (the never-commit-raw and exit-3 lines restate the canonical skill, which keeps them; AGENTS.md's layout bullet keeps the never-line) | Y | never commit one as the image tool returned it |
| `theater/skills/rules-index` | skill | keep | protected (D11): bytes unchanged, linked in place as `theater-rules-index` for both harnesses; its "load first at every session start" wording is protected, and AGENTS.md says how to read it | Y | |

## Guide sections

| Item | Kind | Verdict | Reason | Obligation | Pointer |
|---|---|---|---|---|---|
| `AGENTS.md` › `# portfolio_site — agent instructions` H1 | guide | update | becomes `# portfolio_site`, a first paragraph and `## Stack` (§ 4, app card) | N | |
| `AGENTS.md` › CONTRACT line | guide | keep | every session needs it; wording kept | Y | Read [`../infra/CONTRACT.md`](../infra/CONTRACT.md) first. |
| `AGENTS.md` › writing-tests line (with stub path) | guide | update | stub path dropped: the skill is user level now (D6); gets an explicit when-to-read clause and the user-level fallback line (SA4b-GATE) | Y | When writing or changing tests (theater Vitest or Playwright): the `writing-tests` skill (mostly what to avoid). |
| `AGENTS.md` › Working with Evan | guide | keep | Evan's standing preferences, every session | Y | If my request is ambiguous, ask one clarifying question before doing anything. |
| `AGENTS.md` › site description paragraph ("Static personal portfolio site … no application test suite") | guide | update | becomes the first paragraph and `## Stack` bullets (§ 4); "no application test suite" kept as the site-has-no-tests fact (the theater has its own suite) | N | |
| `AGENTS.md` › Repository layout & source of truth | guide | update | layout bullets kept; the `.claude/skills/<name>/SKILL.md` "canonical" bullet rewritten to D6 (`skills/<name>/`, linked from both discovery directories); `docs/codex-setup.md` pointer kept | Y | `theater/dist/` is a generated build artefact and is never committed. |
| `AGENTS.md` › layout bullet: never commit a raw generated sprite | guide | keep | incident-born (2026-09-09 raw `car.png` served a grey slab); stays in the layout bullet | Y | never commit one as the image tool returned it |
| `AGENTS.md` › "The checked-in source files are authoritative. Inspect existing patterns …" | guide | keep | repo-specific instruction (check an adjacent page and `images/<slug>/` before a parallel structure); shortened | N | |
| `AGENTS.md` › Setup & verification commands | guide | update | commands kept; comment prose trimmed (§ 2.1); host-tests line added (no bind mounts, so EVO-TOOL-050 does not apply); the theater test-runner gotchas from the archived roadmap memory added beside them | Y | Every theater check runs on the host |
| `AGENTS.md` › Dependency policy | guide | keep | never-lines (no runtime deps for the static site, stdlib-only validator, never weaken the format check or hook); reworded | Y | Do not weaken or bypass the format check or the pre-commit hook to make a task pass. |
| `AGENTS.md` › Session logs | guide | update | reworded (§ 1 worked example 2); "it's a stub pointing at the shared copy" dropped (D6, user level) | Y | At the end of every session, including pure Q&A: write a session log in `docs/session-logs/` with the `writing-session-logs` skill. |
| `AGENTS.md` › Before committing | guide | update | tightened; hook install, first-clone dev dep, don't-"fix"-the-binary-back, docs out of scope, and the `--no-verify` never-line kept | Y | Never bypass the hook with `--no-verify` unless it is a genuine emergency. |
| `AGENTS.md` › Codex Skills | guide | update | becomes `## Skills` under D6: one list of the repo's skills for both harnesses (adds `treating-art-sprites` and `theater-rules-index`); "session-log skills intentionally not exposed as Codex wrappers" cut as superseded status (§ 2.3: they are user level for both harnesses now); validator line kept | N | |
| `CLAUDE.md` › H1 | guide | update | CLAUDE.md becomes the `@AGENTS.md` pointer (D13, § 4) | N | |
| `CLAUDE.md` › CONTRACT line | guide | merge | duplicate of AGENTS.md's; loads once through the import | Y | Read [`../infra/CONTRACT.md`](../infra/CONTRACT.md) first. |
| `CLAUDE.md` › writing-tests line | guide | merge | duplicate of AGENTS.md's (reworded there) | Y | When writing or changing tests (theater Vitest or Playwright): the `writing-tests` skill (mostly what to avoid). |
| `CLAUDE.md` › Working with Evan | guide | merge | duplicate of AGENTS.md's | Y | If my request is ambiguous, ask one clarifying question before doing anything. |
| `CLAUDE.md` › The theater's rules index | guide | move-to-skill | only in CLAUDE.md, so Codex never saw it; moved to AGENTS.md as `## The theater's rules index` (load before touching `theater/`, cite SDS IDs, read the frontmatter's "session start" as before theater work, `EVO-*` IDs in theater comments do not resolve here) | Y | Before touching anything under `theater/`: load the `theater-rules-index` skill |
| `CLAUDE.md` › Session logs | guide | merge | duplicate of AGENTS.md's | Y | At the end of every session, including pure Q&A: write a session log in `docs/session-logs/` with the `writing-session-logs` skill. |
| `CLAUDE.md` › Before committing | guide | merge | duplicate of AGENTS.md's | Y | Never bypass the hook with `--no-verify` unless it is a genuine emergency. |

## Memory entries

| Item | Kind | Verdict | Reason | Obligation | Pointer |
|---|---|---|---|---|---|
| `MEMORY.md` | memory | update | rewritten as one line per kept entry, at most 150 characters (§ 6) | N | |
| `codex-spec-review-before-roadmap.md` | memory | keep | Evan's feedback: adversarial on the spec before Part 2, incremental `findings.md`, verify findings before folding; in no guide. Stale bullet: its `gpt-5.6-sol` model line is superseded by `route.py decide` (the file says the router picks since 2026-10-11) and by `treating-art-sprites`' `gpt-6.1-sol`; the router wins | Y | |
| `codex-image-generation.md` | memory | update | reference facts on Codex image generation, partly duplicated by `treating-art-sprites`; kept for the measured quirks. Its skill path updated to `skills/treating-art-sprites/` (STEP 5 moved it); stale fact: `scripts/art/PROMPT-TEMPLATE.md` is now `scripts/art/contracts/sprite/PROMPT-TEMPLATE.md` (corrected) | Y | |
| `drive-in-theater-roadmap.md` | memory | archive | finished status (§ 2.3): both theater roadmaps are complete and archived in the repo (`710474b`); its standing decisions and never-lines move to the new `theater-standing-facts.md` topic file, and its two test-runner gotchas to AGENTS.md | Y | theater-standing-facts.md |
| `tree-sprite-run-unfinished.md` | memory | archive | finished status (§ 2.3): the `/tmp/art-run-trees-realistic` workspace is gone and the lot has moved on (`cafbc21`); its two lessons move to the `treating-art-sprites` skill | Y | needs a backdrop that is never black or dark |
| `evanleon-cloudflare-cache.md` | memory | keep | incident-born check (served file first, then cache) for "my change isn't live"; in no guide | Y | |
| `theater-standing-facts.md` (new) | memory | keep | created from `drive-in-theater-roadmap.md`: the decisions not to re-litigate, DT11's `GO` is a ruling not a measurement, the mobile reversal, never store Media Cloud credentials, never leave a screen clipless, the measured gotchas | Y | |

## CONSUMER lines

`apply` printed 81 `CONSUMER` lines (`apply.out`). Disposition by class:

| Class | Lines | Files | Disposition |
|---|---|---|---|
| Live guide in this repo | 2 | `AGENTS.md:5`, `CLAUDE.md:5` (the writing-tests stub path) | rewritten in STEP 7 (stub path dropped; CLAUDE.md is the pointer); owned |
| Live doc in this repo | 4 | `docs/codex-setup.md:135,136,155,157` (plus its other `.claude/skills` and adapter prose, no CONSUMER line) | rewritten to the D6 layout; owned |
| Live skill or script in this repo | 0 | `scripts/validate_codex_setup.py` named the old layout by path segments, no CONSUMER line | rewritten to D6 in STEP 6 (R-VAL); owned |
| Protected rules-index (D11) | 0 | `theater/skills/rules-index` names no moved path | bytes unchanged |
| History | 67 | `archive/roadmaps/*` (39), `archive/session-logs/**` (26), `archive/superpowers/specs/2026-08-25-drive-in-theater-design.md` (1), `docs/session-logs/daily/2026-09-09.md` (1) | left |
| Another repo or memory | 8 | infra `docs/planning/skills-audit/inventory.md:1159-1162`, `docs/receipts/skills-audit/install-dryrun.txt:79-81`; co-author memory `archive/storyboard-prespec-effort.md:19` | left; Human triage |

No group directory was vacated (the skills lived directly under `.claude/skills/`), so there was no
`rmdir`. No moved skill reaches the repo by `__dirname`/`__file__`; `treating-art-sprites`' only `../`
path (`../../theater/public/art/car.png`) is relative to `cd scripts/art`, unaffected by the move.
`.gitignore`'s `!.claude/skills/` negation still admits the links and was left as it is.
`git diff --quiet -- theater/skills/rules-index` succeeds.
