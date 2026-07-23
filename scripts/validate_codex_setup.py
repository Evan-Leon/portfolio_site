#!/usr/bin/env python3
"""Deterministic validator for this repo's Codex setup.

Standard-library only (no third-party YAML). Verifies that the native Codex
skill adapters under `.agents/skills/` correctly wrap the canonical skills.

REPO-SPECIFIC NOTE: portfolio_site keeps its canonical skills under
`.claude/skills/<name>/SKILL.md` (NOT a top-level `skills/`). Wrappers therefore
reference `../../../.claude/skills/<name>/SKILL.md`. This validator resolves
canonical skills at that location.

Run from the repository root:

    python3 scripts/validate_codex_setup.py

Exits 0 on success, nonzero on any validation failure. Needs no network.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
AGENTS_MD = REPO_ROOT / "AGENTS.md"
WRAPPERS_DIR = REPO_ROOT / ".agents" / "skills"
CANONICAL_DIR = REPO_ROOT / ".claude" / "skills"

# Thinness thresholds (see prepare-codex.md §1).
MAX_WRAPPER_LINES = 30
MAX_WRAPPER_BYTE_FRACTION = 0.25

# Expected high-value skills: only fail if a canonical source EXISTS but is not
# wrapped. None of these have canonical sources in portfolio_site, so this check
# is vacuously satisfied here — it stays for parity with the meta-prompt.
EXPECTED_HIGH_VALUE = ("rules-index", "backend", "frontend", "phase-status")

errors: list[str] = []
notes: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def parse_frontmatter(text: str):
    """Parse the constrained adapter frontmatter with the standard library only.

    Returns (fields_dict, error_or_None). Valid frontmatter = opening `---` on
    the first line, a closing `---`, and single-line non-empty scalar fields.
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, "missing opening '---' delimiter"
    close_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            close_idx = i
            break
    if close_idx is None:
        return None, "missing closing '---' delimiter"
    fields: dict[str, str] = {}
    for raw in lines[1:close_idx]:
        if not raw.strip():
            continue
        if ":" not in raw:
            return None, f"frontmatter line is not a 'key: value' scalar: {raw!r}"
        key, _, value = raw.partition(":")
        key = key.strip()
        value = value.strip()
        # strip matching surrounding quotes
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1].strip()
        fields[key] = value
    return fields, None


def references_canonical(body: str, name: str) -> bool:
    """True if the wrapper body points at the canonical .claude/skills path."""
    needle = f".claude/skills/{name}/SKILL.md"
    return needle in body


def main() -> int:
    # 1. root AGENTS.md exists
    if not AGENTS_MD.is_file():
        err("AGENTS.md is missing at the repository root")

    # 2. .agents/skills/ exists
    if not WRAPPERS_DIR.is_dir():
        err(".agents/skills/ directory is missing")
        _summary([])
        return 1

    wrapper_dirs = sorted(p for p in WRAPPERS_DIR.iterdir() if p.is_dir())
    if not wrapper_dirs:
        err(".agents/skills/ contains no wrapper skills")

    seen_names: dict[str, Path] = {}
    validated = 0

    for wdir in wrapper_dirs:
        dir_name = wdir.name
        skill_md = wdir / "SKILL.md"
        if not skill_md.is_file():
            err(f"[{dir_name}] missing SKILL.md")
            continue

        text = skill_md.read_text(encoding="utf-8")
        fields, ferr = parse_frontmatter(text)
        if ferr:
            err(f"[{dir_name}] invalid frontmatter: {ferr}")
            continue

        name = fields.get("name", "")
        desc = fields.get("description", "")
        if not name:
            err(f"[{dir_name}] frontmatter 'name' is missing or empty")
        if not desc:
            err(f"[{dir_name}] frontmatter 'description' is missing or empty")

        # name matches directory
        if name and name != dir_name:
            err(f"[{dir_name}] frontmatter name '{name}' != directory name")

        # duplicate detection
        if name:
            if name in seen_names:
                err(f"[{dir_name}] duplicate skill name '{name}' "
                    f"(also {seen_names[name].name})")
            else:
                seen_names[name] = wdir

        # canonical reference resolves
        canonical = CANONICAL_DIR / dir_name / "SKILL.md"
        if not references_canonical(text, dir_name):
            err(f"[{dir_name}] wrapper does not reference "
                f".claude/skills/{dir_name}/SKILL.md")
        if not canonical.is_file():
            err(f"[{dir_name}] canonical skill missing: "
                f".claude/skills/{dir_name}/SKILL.md")
            continue

        # thinness
        canonical_bytes = canonical.stat().st_size
        wrapper_bytes = skill_md.stat().st_size
        wrapper_lines = len(text.splitlines())
        if text.strip() == canonical.read_text(encoding="utf-8").strip():
            err(f"[{dir_name}] wrapper is identical to the canonical body")
        if wrapper_lines > MAX_WRAPPER_LINES:
            err(f"[{dir_name}] wrapper has {wrapper_lines} lines "
                f"(> {MAX_WRAPPER_LINES})")
        limit = canonical_bytes * MAX_WRAPPER_BYTE_FRACTION
        if wrapper_bytes >= limit:
            err(f"[{dir_name}] wrapper is {wrapper_bytes} B "
                f"(>= 25% of canonical {canonical_bytes} B = {limit:.0f} B)")

        validated += 1

    # expected high-value skills present in canonical but not wrapped
    for hv in EXPECTED_HIGH_VALUE:
        canonical = CANONICAL_DIR / hv / "SKILL.md"
        if canonical.is_file() and hv not in seen_names:
            err(f"expected high-value skill '{hv}' has a canonical source "
                f"but no wrapper under .agents/skills/")

    # documented validation commands/scripts that are statically checkable
    if AGENTS_MD.is_file():
        agents_text = AGENTS_MD.read_text(encoding="utf-8")
        documented_paths = [
            "scripts/validate_codex_setup.py",
            ".githooks/pre-commit",
        ]
        for rel in documented_paths:
            if rel in agents_text and not (REPO_ROOT / rel).exists():
                err(f"AGENTS.md references '{rel}' but it does not exist")

    _summary(sorted(seen_names))
    return 1 if errors else 0


def _summary(validated_names: list[str]) -> None:
    if errors:
        print("Codex setup validation FAILED:")
        for e in errors:
            print(f"  - {e}")
        print(f"\n{len(errors)} error(s); "
              f"{len(validated_names)} wrapper(s) validated.")
    else:
        print("Codex setup validation PASSED.")
        print("  root AGENTS.md: present")
        print(f"  wrappers validated: {len(validated_names)}")
        for name in validated_names:
            print(f"    - {name}  ->  .claude/skills/{name}/SKILL.md")


if __name__ == "__main__":
    sys.exit(main())
