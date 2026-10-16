#!/usr/bin/env python3
"""List showcase apps whose UI has changed since their portfolio clip was captured.

Reads the app repo <-> portfolio slug pairs from the Coverage table of the
portfolio-showcase meta-prompt (infra), takes each slug's last capture time from
portfolio_site's git history of images/<slug>/demo.mp4, and measures the app
repo's UI-source churn since then. The numbers are evidence for a judgment, not
the judgment: read the commit subjects before calling an app stale.

Usage: python3 scripts/showcase/stale_captures.py [--threshold N] [--subjects K]
Standard library only.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

SITE = Path(__file__).resolve().parents[2]
EVO = SITE.parent
META_PROMPT = EVO / "infra/meta-prompts/portfolio-showcase/portfolio-showcase.md"

# What counts as UI source: markup, components and styles, minus tests, docs and
# archived planning trees (mind-palace's docs snapshots are 30k lines of HTML).
UI_PATHSPEC = [
    "*.tsx", "*.jsx", "*.svelte", "*.vue", "*.css", "*.scss", "*.html",
    "**/templates/**",
    ":(exclude)docs/**", ":(exclude)archive/**", ":(exclude).superpowers/**",
    ":(exclude)**/*.test.*", ":(exclude)**/*.spec.*", ":(exclude)**/tests/**",
    ":(exclude)**/e2e/**", ":(exclude)**/__tests__/**",
]


def git(repo: Path, *args: str) -> str:
    out = subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, text=True, check=False
    )
    return out.stdout.strip()


def coverage_rows() -> list[tuple[str, str]]:
    """(app repo dir, portfolio slug) from the first Coverage table."""
    text = META_PROMPT.read_text()
    lines = text.split("## Coverage", 1)[1].splitlines()
    start = next((i for i, l in enumerate(lines) if l.startswith("|")), len(lines))
    rows = []
    for line in lines[start:]:
        if not line.startswith("|"):
            break  # end of the first table; the second lists remote projects
        m = re.match(r"\|\s*([^|`]+?)\s*\|\s*`([^`]+)`\s*\|", line)
        if m:
            rows.append((m.group(1), m.group(2)))
    return rows


def capture_time(slug: str) -> str:
    return git(SITE, "log", "-1", "--format=%cI", "--", f"images/{slug}/demo.mp4")


def churn(repo: Path, since: str) -> tuple[int, int, int, list[str]]:
    """(commits, files, lines changed, newest subjects) in UI source since `since`."""
    base = git(repo, "rev-list", "-1", f"--before={since}", "HEAD")
    if not base:
        return 0, 0, 0, []
    stat = git(repo, "diff", "--shortstat", base, "HEAD", "--", *UI_PATHSPEC)
    nums = [int(n) for n in re.findall(r"(\d+) (?:file|insertion|deletion)", stat)]
    files = nums[0] if nums else 0
    lines = sum(nums[1:])
    log = git(repo, "log", f"{base}..HEAD", "--format=%cs %s", "--", *UI_PATHSPEC)
    subjects = [s for s in log.splitlines() if s]
    return len(subjects), files, lines, subjects


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--threshold", type=int, default=300,
                    help="UI lines changed at which an app is flagged (default 300)")
    ap.add_argument("--subjects", type=int, default=6,
                    help="commit subjects to print per flagged app (default 6)")
    args = ap.parse_args()

    if not META_PROMPT.exists():
        print(f"missing {META_PROMPT}", file=sys.stderr)
        return 2
    rows = coverage_rows()
    if not rows:
        print("no Coverage rows parsed from the meta-prompt", file=sys.stderr)
        return 2

    results = []
    for repo_name, slug in rows:
        repo = EVO / repo_name
        since = capture_time(slug)
        if not repo.is_dir() or not since:
            results.append((repo_name, slug, since or "never", None))
            continue
        results.append((repo_name, slug, since, churn(repo, since)))

    print(f"{'app repo':<18} {'slug':<15} {'captured':<11} {'commits':>7} "
          f"{'files':>5} {'lines':>6}  verdict")
    for repo_name, slug, since, c in results:
        day = since[:10]
        if c is None:
            print(f"{repo_name:<18} {slug:<15} {day:<11} {'-':>7} {'-':>5} {'-':>6}  "
                  "CHECK (no repo or no clip)")
            continue
        commits, files, lines, _ = c
        verdict = "STALE?" if lines >= args.threshold else "unchanged"
        print(f"{repo_name:<18} {slug:<15} {day:<11} {commits:>7} {files:>5} "
              f"{lines:>6}  {verdict}")

    for repo_name, slug, since, c in results:
        if c and c[2] >= args.threshold:
            print(f"\n{repo_name} ({slug}), UI commits since {since[:10]}:")
            for s in c[3][: args.subjects]:
                print(f"  {s}")
    print(f"\nchecked {datetime.now():%Y-%m-%d %H:%M}; threshold {args.threshold} "
          "UI lines. Remote projects (Media Cloud, ShowRunner, spead-read) are not "
          "in the Coverage table and are not checked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
