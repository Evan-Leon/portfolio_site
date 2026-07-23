# Codex setup — portfolio_site

This repository is set up to be used reliably with **Codex** while keeping its
existing **Claude Code** workflow intact. Codex reads native skill adapters under
`.agents/skills/`; those adapters are thin wrappers that point at the canonical
skill bodies, which stay the single source of truth.

## Default Codex working directory

Launch Codex from the **repository root**:

```
/home/evan/EVOsystem/portfolio_site
```

All documented commands (`pnpm …`, `python3 scripts/…`, `docker compose …`) and
all wrapper relative paths assume the repo root as the working directory. This
holds for both Windows-hosted WSL checkouts and ordinary Linux/cloud checkouts.

## Effective `AGENTS.md` chain

There is a single root `AGENTS.md`. No nested `AGENTS.md` files exist, because no
subtree has materially different commands or conventions — this is a single-root
static site. The effective chain for any path in the repo is:

```
AGENTS.md   (repository root)
```

## Why `.claude/skills/` remains canonical

Unlike the prepare-codex default (a top-level `skills/`), this repository keeps
its canonical skills under:

```
.claude/skills/<name>/SKILL.md
```

These files are shared, authoritative skill instructions used by Claude Code and
referenced by Codex. **Do not** copy their contents elsewhere or duplicate them
into `.agents/skills/`.

## How the `.agents/skills/` wrappers work

Each Codex wrapper lives at `.agents/skills/<name>/SKILL.md` and:

- has minimal YAML frontmatter (`name`, `description`);
- has a `name` matching its directory;
- directs Codex to read the canonical `.claude/skills/<name>/SKILL.md` **in full**
  and treats that file as the source of truth;
- resolves the canonical file via the relative path
  `../../../.claude/skills/<name>/SKILL.md` (three levels up from the wrapper to
  the repo root, then into `.claude/skills/`);
- tells Codex to resolve any repo paths the canonical skill names from the repo
  root;
- contains **no** copied rule catalog or canonical body.

## Available `$skill` invocations

- `$adding-project-screenshots` — adding, updating, or troubleshooting project
  screenshots: keeping `images/<slug>/` files in sync with the two swiper
  references (homepage card in `index.html`, detail page in
  `projects/<slug>.html`).
- `$rebuild-restart` — rebuild the nginx image and recreate the container on
  `evo-net` after changing any served file (`index.html`, `projects/*.html`,
  `assets/`, `images/`, `404.html`), the `Dockerfile`, `nginx.conf`, or
  `docker-compose.yml`.

## Canonical skills intentionally NOT exposed to Codex

- **`writing-session-logs`** and **`sweeping-session-logs`** — excluded on
  purpose. Reasons:
  1. They govern **workflow/session discipline** (write a session log at the end
     of every *agent session*; periodically roll logs up into digests), not
     coding-agent implementation, review, testing, or delivery guidance.
  2. In this repo they are **stubs**: their body only says "read
     `../infra/skills/<name>/SKILL.md`", i.e. the canonical content lives in a
     **sibling `infra` repo**, not in this repository. A thin Codex adapter would
     have to route through a two-hop chain that depends on that sibling repo
     being checked out — not guaranteed for a Codex cloud task — and it would
     break the "canonical skill resolves within this repo" model the validator
     enforces.

  The one thing a Codex session must do mechanically before committing —
  formatting — is already enforced by the tool-agnostic pre-commit hook and
  documented in `AGENTS.md`, independent of these skills.

The prepare-codex "expected high-value" skills (`rules-index`, `backend`,
`frontend`, `phase-status`) do **not** exist in this repository and were not
invented. Their absence is expected for a static portfolio site.

## Setup-validation command

Dependency-free, standard-library-only Python validator:

```bash
python3 scripts/validate_codex_setup.py
# or, via the package script:
pnpm validate:codex
```

It verifies: root `AGENTS.md` exists; `.agents/skills/` exists; each wrapper has
valid frontmatter with non-empty `name`/`description`; the name matches its
directory; the wrapper references an existing canonical
`.claude/skills/<name>/SKILL.md`; no duplicate skill names; wrappers are thin
adapters (≤ 30 lines and < 25% of the canonical byte length, not identical to
the canonical body); and that statically-checkable paths documented in
`AGENTS.md` exist. It prints a per-skill summary, exits `0` on success and
nonzero on failure, and needs no network access.

## Confirming skills manually with `/skills`

The validator checks structure only — it **cannot** prove that Codex displayed a
skill in `/skills`. Confirm that separately:

1. Launch a fresh Codex session from `/home/evan/EVOsystem/portfolio_site`.
2. Run `/skills`.
3. Confirm both `adding-project-screenshots` and `rebuild-restart` appear.
4. If a skill does not appear, restart Codex once and check again.

## Read-only skill activation test

Run this in a fresh Codex session to confirm a wrapper activates and loads its
canonical body (no files are modified):

```
Use $adding-project-screenshots and $rebuild-restart.

Do not modify files.

Summarize the screenshot-sync workflow loaded for this repository (the two
swiper reference points that must match images/<slug>/), and state the exact
rebuild command $rebuild-restart specifies. For each, name the canonical file
from which it was loaded.
```

Expected: the answer cites `.claude/skills/adding-project-screenshots/SKILL.md`
(two references: `index.html` card-swiper and `projects/<slug>.html`
project-swiper) and `.claude/skills/rebuild-restart/SKILL.md`
(`docker compose build && docker compose up -d --force-recreate`).

## Delivery: local commit vs. no-commit vs. cloud task

- **Local commit** — the checked-in pre-commit hook (`.githooks/pre-commit`,
  enabled via `git config core.hooksPath .githooks`) runs Prettier `--check`
  over staged `.html`/`.css`/`.js`. Run `pnpm format` first so the hook is a
  formality. There is no test suite. Markdown/docs are out of scope by design.
- **No-commit** — make and validate changes without committing (e.g. review-only
  or when the tree is intentionally left dirty for the user). Still run
  `python3 scripts/validate_codex_setup.py` and `pnpm format:check` to leave the
  tree clean.
- **Cloud task** — the sibling `infra` repo is not guaranteed to be present, so
  do not rely on the session-log stubs' `../infra/...` chain. The Codex setup
  here is self-contained within this repository.

## Claude-specific instructions Codex wrappers intentionally ignore

The canonical skills are written for Claude Code. Codex wrappers deliberately do
**not** reproduce Claude-only invocation/session mechanics (invoking Claude's
Skill tool, clearing a Claude session, the CLAUDE.md session-log mandate). Codex
should apply the **domain/engineering** content of each canonical skill and skip
those Claude-only mechanics.
