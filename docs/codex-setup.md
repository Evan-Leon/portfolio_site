# Codex setup — portfolio_site

Codex and Claude Code read the same skills and the same guide. `AGENTS.md` is the one guide
(Codex reads it natively; Claude Code reads it through the `@AGENTS.md` line in `CLAUDE.md`).

## Default Codex working directory

Launch Codex from the repository root, `/home/evan/EVOsystem/portfolio_site`. Every documented
command (`pnpm …`, `python3 scripts/…`, `docker compose …`) assumes it. There is a single root
`AGENTS.md` and no nested one.

## Skill layout (D6)

`skills/<name>/SKILL.md` is the one real copy of each repo skill. `.claude/skills/<name>` (Claude
Code) and `.agents/skills/<name>` (Codex) are relative symlinks to `../../skills/<name>`; both
harnesses follow them. Edit a skill only through `skills/<name>/`.

The theater's rules index is protected and stays in place: `theater/skills/rules-index/` is linked
as `theater-rules-index` from both discovery directories.

| Skill | Use it for |
|---|---|
| `adding-project-screenshots` | `images/<slug>/` files and their two swiper references |
| `rebuild-restart` | rebuilding the nginx image and recreating the container so a change is served |
| `treating-art-sprites` | creating, regenerating or editing a theater sprite in `theater/public/art/` |
| `theater-rules-index` | the vendored engine's `SDS-*` law; load it before touching `theater/` |

The shared EVOsystem skills (`writing-session-logs`, `sweeping-session-logs`, `writing-tests` and
the rest) are installed at user level for both harnesses (`~/.claude/skills/`, `~/.agents/skills/`),
so this repo keeps no stub or adapter for them. If one is not invocable, read
`../infra/skills/<name>/SKILL.md`. A cloud task without the sibling `infra` checkout does not have
them; the repo's own skills above are self-contained.

## Setup-validation command

```bash
python3 scripts/validate_codex_setup.py   # or: pnpm validate:codex
```

Standard library only, no network. It checks that every entry under `.claude/skills/` and
`.agents/skills/` is a relative symlink resolving to `skills/<same name>` (or the protected
in-place index), that each target's frontmatter has a single-line `name` equal to the discovery
name and a non-empty `description`, that every skill is linked for both harnesses, and that the
statically checkable paths `AGENTS.md` documents exist. Exit 0 on success.

## Confirming skills in Codex

The validator checks structure only; it cannot prove Codex listed a skill. `/skills` is TUI-only,
so the scriptable check is a read-only activation run:

```bash
codex exec -s read-only -C /home/evan/EVOsystem/portfolio_site '<the test prompt below>'
```

```
Use $adding-project-screenshots and $rebuild-restart.

Do not modify files.

Summarize the screenshot-sync workflow loaded for this repository (the two
swiper reference points that must match images/<slug>/), and state the exact
rebuild command $rebuild-restart specifies. For each, name the canonical file
from which it was loaded.
```

Expected: the answer cites `skills/adding-project-screenshots/SKILL.md` (the `index.html`
card-swiper and the `projects/<slug>.html` project-swiper) and `skills/rebuild-restart/SKILL.md`
(`docker compose build && docker compose up -d --force-recreate`).

## Delivery

- **Local commit**: the pre-commit hook (`.githooks/pre-commit`, enabled with
  `git config core.hooksPath .githooks`) runs Prettier `--check` over staged `.html`/`.css`/`.js`.
  Run `pnpm format` first. Markdown is out of scope by design.
- **No commit**: still run `python3 scripts/validate_codex_setup.py` and `pnpm format:check`.
