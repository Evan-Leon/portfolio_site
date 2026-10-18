"""Synthetic selftests for portfolio_site's adapted draw_sample.py (test-audit STEP 2.4)."""
import json, subprocess, sys, tempfile
from pathlib import Path

DRAW = Path(sys.argv[1]); PY = sys.argv[2]
fails = 0

def case(name, be, fe, controls, backend, frontend, floor, exclude_round1=None, seed=20261018):
    global fails
    with tempfile.TemporaryDirectory() as t:
        t = Path(t)
        coll = t / "collect.txt"; dm = t / "domain-map.tsv"
        coll.write_text("".join(f"{f}::{n}\n" for f, ns in be.items() for n in ns[1]) + f"\n{sum(len(v[1]) for v in be.values())} tests collected\n")
        dm.write_text("".join(f"{d}\t{f}\t{len(ns)}\n" for f, (d, ns) in be.items()) + "".join(f"FE\t{f}\t{len(ns)}\n" for f, ns in fe.items()))
        lst = t / "list.json"
        lst.write_text(json.dumps([{"name": n, "file": str(t / f)} for f, ns in fe.items() for n in ns]))
        ctl = t / "controls.txt"; ctl.write_text("\n".join(controls) + "\n")
        out = t / "items.txt"
        args = [PY, str(DRAW), "--seed", str(seed), "--backend-collect", str(coll), "--frontend-list", str(lst),
                "--controls", str(ctl), "--out", str(out), "--backend", str(backend), "--frontend", str(frontend),
                "--floor", str(floor), "--domain-map", str(dm), "--repo-root", str(t)]
        if exclude_round1 is not None:
            ex = t / "round1-items.txt"; ex.write_text("\n".join(exclude_round1) + "\n"); args += ["--exclude", str(ex)]
        r = subprocess.run(args, capture_output=True, text=True)
        items = [l for l in out.read_text().splitlines() if l.strip()] if out.exists() else []
        sampled = [i for i in items if i not in set(controls)]
        ok = (r.returncode == 0 and len(items) == len(sampled) + len(controls)
              and len(set(items)) == len(items) and len(sampled) == backend + frontend
              and not (exclude_round1 and set(sampled) & set(exclude_round1)))
        fails += not ok
        print(f"== {name}: exit={r.returncode} items={len(items)} sampled={len(sampled)} controls={len(controls)} "
              f"requested={backend}+{frontend} -> {'ok' if ok else 'BAD'}")
        print(r.stdout.strip()); print(r.stderr.strip()) if r.stderr.strip() else None
        return items

fn = lambda p, n: [f"test_{p}_{i}" for i in range(n)]
# 1. a suite under 200: every eligible function drawn
be1 = {"tests/test_a.py": ("A", fn("a", 20)), "tests/test_b.py": ("B", fn("b", 12)), "tests/test_c.py": ("C", fn("c", 8))}
fe1 = {"theater/src/X.test.tsx": [f"X case {i}" for i in range(20)]}
c1 = ["tests/test_a.py::test_a_0", "tests/test_c.py::test_c_1", "theater/src/X.test.tsx > X case 3"]
case("suite under 200 (all eligible)", be1, fe1, c1, 38, 19, 8)
# 2. a skewed domain: one domain of 3 functions holding a control
be2 = {"tests/test_big.py": ("BIG", fn("big", 100)), "tests/test_small.py": ("SMALL", fn("small", 3)), "tests/test_mid.py": ("MID", fn("mid", 30))}
c2 = ["tests/test_small.py::test_small_0"]
case("skewed domain (3 functions, one control, floor 8)", be2, {}, c2, 60, 0, 8)
# 3. backend only
case("backend-only suite", be1, {}, ["tests/test_b.py::test_b_2"], 39, 0, 8)
# 4. frontend only
fe4 = {"theater/src/Y.test.tsx": [f"Y {i}" for i in range(15)], "theater/src/Z.test.ts": [f"Z {i}" for i in range(10)]}
case("frontend-only suite", {}, fe4, ["theater/src/Z.test.ts > Z 1"], 0, 24, 1)
# 5. a 30-item holdout with round 1 excluded
be5 = {"tests/test_a.py": ("A", fn("a", 60)), "tests/test_b.py": ("B", fn("b", 40))}
fe5 = {"theater/src/X.test.tsx": [f"X case {i}" for i in range(40)]}
r1 = case("holdout setup: round 1", be5, fe5, ["tests/test_a.py::test_a_0"], 50, 20, 8)
c5 = ["tests/test_a.py::test_a_59", "tests/test_b.py::test_b_39", "theater/src/X.test.tsx > X case 39",
      "tests/test_b.py::test_b_38", "theater/src/X.test.tsx > X case 38"]
pool5 = [f"{f}::{n}" for f, (_, ns) in be5.items() for n in ns] + [f"{f} > {n}" for f, ns in fe5.items() for n in ns]
c5 = [c for c in reversed(pool5) if c not in r1][:5]
case("30-item holdout, round 1 excluded", be5, fe5, c5, 21, 9, 4, exclude_round1=r1, seed=20261019)
print(f"draw-selftest: {'all cases ok' if not fails else f'{fails} BAD'}")
sys.exit(1 if fails else 0)
