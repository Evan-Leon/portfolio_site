#!/usr/bin/env python3
"""Validate portfolio_site's skill layout for Claude Code and Codex (D6).

Standard-library only. `skills/<name>/` is the one real copy of each skill;
`.claude/skills/<name>` and `.agents/skills/<name>` are relative symlinks to
`../../skills/<name>`. The one exception is the protected theater rules index
(D11), which keeps its bytes in place and is linked as `theater-rules-index`
to `../../theater/skills/rules-index`. This script checks that:

- every discovery entry under `.claude/skills/` and `.agents/skills/` is a
  symlink, its target is relative, and it resolves exactly to
  `skills/<same name>` (or the protected in-place directory);
- each target holds a SKILL.md whose frontmatter has a single-line `name`
  equal to the discovery name and a non-empty single-line `description`;
- every skill under `skills/`, and the protected index, is linked for both
  harnesses;
- the paths AGENTS.md documents that are statically checkable exist.

It proves structure only. It cannot prove that Codex displayed a skill in
`/skills`; that remains a manual check (see docs/codex-setup.md).

Run from the repository root:

    python3 scripts/validate_codex_setup.py

Exit 0 on success, nonzero on any failure. No network, no third-party deps.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
AGENTS_MD = REPO_ROOT / "AGENTS.md"
CANONICAL_DIR = REPO_ROOT / "skills"
DISCOVERY_DIRS = [REPO_ROOT / ".claude" / "skills", REPO_ROOT / ".agents" / "skills"]

# Protected skills linked in place (D11): discovery name -> repo-relative directory.
PROTECTED_IN_PLACE = {"theater-rules-index": "theater/skills/rules-index"}

# Paths AGENTS.md documents that are statically checkable.
DOCUMENTED_PATHS = ["scripts/validate_codex_setup.py", ".githooks/pre-commit"]

errors: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def parse_frontmatter(text: str) -> dict[str, str] | None:
    """Single-line scalars between `---` delimiters. Not general-purpose YAML.

    A folded or literal block (`>` / `|`) or an indented continuation line
    makes the field multi-line, which is recorded as an empty value.
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    close = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if close is None:
        return None
    fields: dict[str, str] = {}
    last = None
    for raw in lines[1:close]:
        if not raw.strip():
            continue
        if raw[:1] in (" ", "\t"):
            if last is not None:
                fields[last] = ""  # continuation: not a single-line scalar
            continue
        if ":" not in raw:
            return None
        key, _, value = raw.partition(":")
        value = value.strip()
        if value in (">", "|", ">-", "|-"):
            value = ""
        fields[key.strip()] = value.strip('"').strip("'")
        last = key.strip()
    return fields


def expected_dirs() -> dict[str, str]:
    """Discovery name -> repo-relative directory every discovery entry must resolve to."""
    out: dict[str, str] = {}
    if CANONICAL_DIR.is_dir():
        for p in sorted(CANONICAL_DIR.iterdir()):
            if p.is_dir() and (p / "SKILL.md").is_file():
                out[p.name] = f"skills/{p.name}"
    out.update(PROTECTED_IN_PLACE)
    return out


def validate_entry(entry: Path, expected: dict[str, str]) -> None:
    name = entry.name
    where = entry.relative_to(REPO_ROOT)
    want = expected.get(name, f"skills/{name}")
    if not entry.is_symlink():
        fail(f"[{where}] is not a symlink (D6: link to ../../{want})")
        return
    target = os.readlink(entry)
    if os.path.isabs(target):
        fail(f"[{where}] symlink target {target} is absolute, not relative")
        return
    resolved = (entry.parent / target).resolve()
    if resolved != (REPO_ROOT / want).resolve():
        fail(f"[{where}] resolves to {os.path.relpath(resolved, REPO_ROOT)}, expected {want}")
        return
    skill_md = resolved / "SKILL.md"
    if not skill_md.is_file():
        fail(f"[{where}] target {want} has no SKILL.md")
        return
    fields = parse_frontmatter(skill_md.read_text(encoding="utf-8"))
    if fields is None:
        fail(f"[{want}] missing or malformed YAML frontmatter")
        return
    if not fields.get("name"):
        fail(f"[{want}] frontmatter `name` is empty, missing or not single-line")
    elif fields["name"] != name:
        fail(f"[{want}] frontmatter name `{fields['name']}` != discovery name `{name}`")
    if not fields.get("description"):
        fail(f"[{want}] frontmatter `description` is empty, missing or not single-line")


def main() -> int:
    if not AGENTS_MD.is_file():
        fail("root AGENTS.md is missing")

    expected = expected_dirs()
    if not any(v.startswith("skills/") for v in expected.values()):
        fail("skills/ contains no skills")

    for ddir in DISCOVERY_DIRS:
        rel = ddir.relative_to(REPO_ROOT)
        if not ddir.is_dir():
            fail(f"{rel}/ directory is missing")
            continue
        entries = sorted(ddir.iterdir())
        for entry in entries:
            validate_entry(entry, expected)
        present = {e.name for e in entries}
        for name, want in expected.items():
            if name not in present:
                fail(f"[{want}] is not linked from {rel}/ as {name}")

    if AGENTS_MD.is_file():
        agents_text = AGENTS_MD.read_text(encoding="utf-8")
        for rel in DOCUMENTED_PATHS:
            if rel in agents_text and not (REPO_ROOT / rel).exists():
                fail(f"AGENTS.md references '{rel}' but it does not exist")

    _report(expected)
    return 1 if errors else 0


def _report(expected: dict[str, str]) -> None:
    if errors:
        print("Codex setup validation FAILED:\n")
        for err in errors:
            print(f"  - {err}")
        print(f"\n{len(errors)} error(s).")
        return
    print("Codex setup validation PASSED.")
    print(f"  skills ({len(expected)}):")
    for name, want in expected.items():
        print(f"    - {name}  ->  {want}")
    print("  every discovery entry is a relative link to its skill, linked for both harnesses.")
    print("  note: /skills discovery in Codex is a separate manual check.")


if __name__ == "__main__":
    sys.exit(main())
