"""Pilot effort record (adapted from chud's TA1 yield_stats.py for portfolio_site: domain labels
from domain-map.tsv with repo-relative test paths, frontend label FE, plain sort): domain-weighted verdict shares and rater agreement (spec Core assumption).

Yield is recorded, never gated. Shares are over sampled *functions* (controls excluded), per
phase, then weighted by each phase's function count in the whole suite. Agreement is the
three-way retain / replace / remove class of rater A vs rater B over every item.

Usage: python3 yield_stats.py <round dir> <function-counts "FE=438">
"""

from __future__ import annotations

import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
VERDICTS = ["KEEP", "DEFER", "REWRITE", "MERGE", "RETIRE", "RETIRE-WITH-CODE"]
CLASS = {
    "KEEP": "retain",
    "DEFER": "retain",
    "REWRITE": "replace",
    "MERGE": "remove",
    "RETIRE": "remove",
    "RETIRE-WITH-CODE": "remove",
}


def rows(path: Path) -> dict[str, str]:
    out = {}
    for ln in path.read_text().splitlines()[1:]:
        if ln.strip() and not ln.startswith("#"):
            cells = ln.split("\t")
            out[cells[0]] = cells[1].strip()
    return out


def phase_map() -> dict[str, str]:
    m = {}
    for ln in (HERE.parent / "domain-map.tsv").read_text().splitlines():
        if not ln.strip():
            continue
        phase, rel, _ = ln.split("\t")
        m[rel] = phase  # repo-relative test path (theater/src/...)
    return m


def main() -> None:
    rnd = Path(sys.argv[1])
    counts = {k: int(v) for k, v in (kv.split("=") for kv in sys.argv[2].split(","))}
    controls = set(
        re.search(r"```controls\n(.*?)```", (rnd / "controls.md").read_text(), re.S)
        .group(1)
        .split("\n")
    ) - {""}
    adj = rows(rnd / "adjudication.tsv")
    ra, rb = rows(rnd / "rater-a.tsv"), rows(rnd / "rater-b.tsv")
    pm = phase_map()
    phase_of = lambda t: pm.get(t.split("::", 1)[0].split(" > ", 1)[0], "FE")  # noqa: E731

    for label, table in (("adjudicated", adj), ("rater A", ra), ("rater B", rb)):
        per = defaultdict(Counter)
        for t, v in table.items():
            if t not in controls:
                per[phase_of(t)][v] += 1
        whole = sum(counts[p] for p in per)
        weighted = Counter()
        for p, c in per.items():
            n = sum(c.values())
            for v, k in c.items():
                weighted[v] += counts[p] / whole * k / n
        print(f"## {label}: domain-weighted shares (functions, controls excluded)")
        print("| verdict | share |")
        print("|---|---|")
        for v in VERDICTS:
            print(f"| {v} | {weighted[v]:.1%} |")
        print()
        if label == "adjudicated":
            print("| phase | n | " + " | ".join(VERDICTS) + " |")
            print("|---|---|" + "---|" * len(VERDICTS))
            for p in sorted(per):
                c = per[p]
                print(
                    f"| {p} | {sum(c.values())} | "
                    + " | ".join(str(c[v]) for v in VERDICTS)
                    + " |"
                )
            print()

    both = [t for t in ra if t in rb]
    agree = sum(CLASS.get(ra[t]) == CLASS.get(rb[t]) for t in both)
    exact = sum(ra[t] == rb[t] for t in both)
    ca, cb = (
        Counter(CLASS.get(ra[t]) for t in both),
        Counter(CLASS.get(rb[t]) for t in both),
    )
    n = len(both)
    pe = sum(ca[k] * cb[k] for k in ("retain", "replace", "remove")) / (n * n)
    po = agree / n
    kappa = (po - pe) / (1 - pe) if pe < 1 else 1.0
    print("## Rater agreement (all items)")
    print(f"- items rated by both: {n}")
    print(
        f"- three-way retain/replace/remove agreement: {agree}/{n} = {po:.1%}; Cohen's kappa {kappa:.2f}"
    )
    print(f"- exact verdict agreement: {exact}/{n} = {exact / n:.1%}")
    matrix = Counter((CLASS.get(ra[t]), CLASS.get(rb[t])) for t in both)
    print("\n| A \\ B | retain | replace | remove |\n|---|---|---|---|")
    for a in ("retain", "replace", "remove"):
        print(
            f"| {a} | "
            + " | ".join(str(matrix[(a, b)]) for b in ("retain", "replace", "remove"))
            + " |"
        )


if __name__ == "__main__":
    main()
