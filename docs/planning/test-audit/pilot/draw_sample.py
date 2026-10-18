"""Draw the pilot sample (adapted from chud's TA1 draw_sample.py for portfolio_site;
the adaptation follows jourNOW's (2026-10-16)).

Test *functions*, not parametrize rows. Backend functions are stratified by the
domain that owns their file in `domain-map.tsv` and allocated `--backend` by
largest remainder over each domain's *eligible* function count, with a floor of
`--floor` per domain (paid for by the largest pools). Frontend functions (the
`FE` domain) contribute `--frontend`. Controls are shuffled in.

portfolio_site adaptations (test-audit STEP 2.4):
  - controls and every `--exclude` item leave the pools BEFORE counts and the
    allocation are computed (chud counted first, so a small domain holding a
    control could be overdrawn);
  - each domain's allocation, and the floor, is capped at its eligible pool;
    any shortfall goes to the largest remaining pools;
  - domain labels come from domain-map.tsv (no TA2-TA10 parsing; plain sort),
    whose test-file paths are repo-relative (`theater/src/...`);
  - portfolio_site has no pytest suite (HAS_BE=0): BE_PREFIX is empty and the
    backend input is an empty collect file, so every item is a Vitest test
    (`theater/src/<file>.test.ts > <full name>`);
  - `--domain-map` and `--repo-root` exist for the synthetic selftests.

Usage (from the repo root):
  python3 draw_sample.py --seed 20261018 --backend-collect <collect-only -q output>
      --frontend-list <vitest list --json> --controls <file> --out <items.txt>
      [--exclude <earlier items.txt> ...] [--backend N --frontend N --floor N]
"""

from __future__ import annotations

import argparse
import json
import random
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
BE_PREFIX = ""  # no backend suite in portfolio_site (HAS_BE=0)
FE_LABEL = "FE"


def backend_functions(collect: Path) -> set[str]:
    out = set()
    for line in collect.read_text().splitlines():
        if "::" in line and not line.startswith(" "):
            out.add(BE_PREFIX + line.strip().split("[", 1)[0])
    return out


def frontend_functions(listing: Path, root: Path) -> set[str]:
    out = set()
    for row in json.loads(listing.read_text()):
        rel = Path(row["file"]).resolve().relative_to(root).as_posix()
        out.add(f"{rel} > {row['name']}")
    return out


def allocate(eligible: dict[str, int], total: int, floor: int) -> dict[str, int]:
    """Largest remainder over eligible counts; floor and every quota capped at the pool."""
    total = min(total, sum(eligible.values()))
    alloc = {k: 0 for k in eligible}
    if total <= 0:
        return alloc
    whole = sum(eligible.values())
    quotas = {k: total * v / whole for k, v in eligible.items()}
    alloc = {k: min(int(q), eligible[k]) for k, q in quotas.items()}
    for k in sorted(quotas, key=lambda k: (-(quotas[k] - int(quotas[k])), k)):
        if sum(alloc.values()) >= total:
            break
        if alloc[k] < eligible[k]:
            alloc[k] += 1
    # floor, capped at each pool, paid for by the largest allocations above their own floor
    want = {k: min(floor, eligible[k]) for k in eligible}
    while any(alloc[k] < want[k] for k in alloc):
        low = min((k for k in alloc if alloc[k] < want[k]), key=lambda k: (alloc[k], k))
        donors = [k for k in alloc if alloc[k] > want[k]]
        if not donors:
            break
        high = max(donors, key=lambda k: (alloc[k], k))
        alloc[low] += 1
        alloc[high] -= 1
    # any shortfall (a capped pool) goes to the largest remaining pools
    while sum(alloc.values()) < total:
        room = [k for k in alloc if alloc[k] < eligible[k]]
        if not room:
            break
        k = max(room, key=lambda k: (eligible[k] - alloc[k], k))
        alloc[k] += 1
    return alloc


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, required=True)
    ap.add_argument("--backend-collect", type=Path, required=True)
    ap.add_argument("--frontend-list", type=Path, required=True)
    ap.add_argument("--controls", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--exclude", type=Path, action="append", default=[])
    ap.add_argument("--backend", type=int, default=120)
    ap.add_argument("--frontend", type=int, default=20)
    ap.add_argument("--floor", type=int, default=8)
    ap.add_argument("--domain-map", type=Path, default=HERE.parent / "domain-map.tsv")
    ap.add_argument("--repo-root", type=Path, default=REPO)
    a = ap.parse_args()

    controls = [c.strip() for c in a.controls.read_text().splitlines() if c.strip()]
    excluded = set(controls)
    for path in a.exclude:
        excluded |= {c.strip() for c in path.read_text().splitlines() if c.strip()}

    domain_of = {}
    for line in a.domain_map.read_text().splitlines():
        if not line.strip():
            continue
        domain, rel, _ = line.split("\t")
        domain_of[rel] = domain
    all_be = backend_functions(a.backend_collect)
    all_fe = frontend_functions(a.frontend_list, a.repo_root.resolve())
    pools: dict[str, list[str]] = defaultdict(list)
    for fn in all_be:
        pools[domain_of[fn.split("::", 1)[0]]].append(fn)
    counts_note = {k: len(v) for k, v in sorted(pools.items())}
    if all_fe:
        counts_note[FE_LABEL] = len(all_fe)
    # remove controls and exclusions BEFORE counting eligible pools and allocating
    for k in pools:
        pools[k] = sorted(set(pools[k]) - excluded)
    fe = sorted(all_fe - excluded)
    eligible = {k: len(v) for k, v in pools.items()}

    rng = random.Random(a.seed)
    alloc = allocate(eligible, a.backend, a.floor) if a.backend else {}
    sample: list[str] = []
    for domain in sorted(alloc):
        sample += rng.sample(pools[domain], alloc[domain])
    n_fe = min(a.frontend, len(fe))
    if n_fe:
        sample += rng.sample(fe, n_fe)
    items = sample + controls
    rng.shuffle(items)
    a.out.write_text("\n".join(items) + "\n")
    print("function counts:", counts_note)
    print("eligible:", dict(sorted(eligible.items())) | {FE_LABEL: len(fe)})
    print("allocation:", dict(sorted(alloc.items())) | {FE_LABEL: n_fe})
    print(f"items: {len(items)} ({len(sample)} sampled + {len(controls)} controls)")


if __name__ == "__main__":
    main()
