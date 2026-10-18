"""Pilot safety decision: prints exactly PASS or REDUCED (adapted from chud's TA1 decide.py).

portfolio_site adaptation (test-audit STEP 2.4; follows jourNOW's of 2026-10-16): no gitlink.
Both repo keys are the repo root, and node-id paths (vitest `theater/src/... > name`; a pytest
`dir/tests/...::name` if one ever appears) and `dead:` paths resolve unchanged with
`git show <rev>:<path>` from the root; chud stripped a leading `backend/` because its backend was
a gitlinked repo. The selftest builds that plain-subdirectory layout, for a pytest-shaped and a
vitest-shaped (`theater/src/`) round.

It scores only the *frozen* adjudication. A round's `adjudication.tsv` must match the sha256
recorded in the message of the commit that added it (`adjudication sha256: <hex>`). A mismatch
means someone edited the frozen file, so the decider refuses (exit 2) instead of scoring. That
commit must also predate the commit that added the round's `controls.md`, and must not contain
it: the blind adjudicator was frozen before the custodian revealed the controls.

A round passes when both hold:
  1. **No control is lost.** A control is lost unless its adjudicated verdict is `KEEP`. A
     control missing from the adjudication is lost. (`MERGE`, `RETIRE`, `RETIRE-WITH-CODE` remove
     the node; `REWRITE` rewrites the assertions that make it a control; `DEFER` schedules its
     removal. Controls are must-keep nodes, so any of those loses one.)
  2. **Every adjudicated removal carries a valid proof.** For `RETIRE` and `MERGE`, the `proof`
     column holds one entry per obligation (` ; `-joined), each either
       `superset:<survivor target>|"<quoted assertion>"` — the survivor differs from the target,
       and the quote appears in the survivor's file at the round's recorded revision
       (whitespace runs collapsed, otherwise verbatim); or
       `not-live:AP-NN|<reason>` — a valid anti-pattern id and a non-empty reason.
     For `RETIRE-WITH-CODE`, at least one `dead:<path>[,<path>]|<reason>` entry naming files
     that exist at the recorded revision, with a non-empty reason.

Decision: PASS if round 1 passes, or round 1 fails and round 2 passes. Otherwise REDUCED.
A failing round 1 with no round 2 yet is REDUCED (the holdout has not run).

Usage (from anywhere):  python3 decide.py            # score the committed rounds
                        python3 decide.py --selftest  # synthetic cases, incl. the freeze check
                        python3 decide.py --explain   # per-round detail on stderr
"""

from __future__ import annotations

import hashlib
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REMOVALS = {"RETIRE", "MERGE", "RETIRE-WITH-CODE"}
VERDICTS = REMOVALS | {"KEEP", "REWRITE", "DEFER"}
AP_IDS = {f"AP-{n:02d}" for n in range(1, 27)}


class Refused(Exception):
    pass


def git(repo: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-C", str(repo), *args], check=True, capture_output=True, text=True
    ).stdout


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def adding_commit(repo: Path, path: Path) -> tuple[str, str]:
    """The commit that first added `path`, and its message."""
    rel = path.resolve().relative_to(
        Path(git(repo, "rev-parse", "--show-toplevel").strip())
    )
    out = git(repo, "log", "--diff-filter=A", "--format=%H%x00%B%x1e", "--", str(rel))
    entries = [e.strip() for e in out.split("\x1e") if e.strip()]
    if not entries:
        raise Refused(f"{rel} is not committed")
    commit, message = entries[-1].split("\x00", 1)
    return commit, message


def check_freeze(repo: Path, rnd: Path) -> None:
    adj, controls = rnd / "adjudication.tsv", rnd / "controls.md"
    commit, message = adding_commit(repo, adj)
    m = re.search(r"adjudication sha256: ([0-9a-f]{64})", message)
    if not m:
        raise Refused(f"{commit[:8]} records no adjudication sha256")
    if sha256(adj) != m.group(1):
        raise Refused(f"{adj} sha256 {sha256(adj)[:12]} != frozen {m.group(1)[:12]}")
    ccommit, _ = adding_commit(repo, controls)
    files = git(repo, "show", "--name-only", "--format=", commit).split()
    if any(f.endswith(f"{rnd.name}/controls.md") for f in files) or ccommit == commit:
        raise Refused("controls.md was committed together with the adjudication")
    if subprocess.run(
        ["git", "-C", str(repo), "merge-base", "--is-ancestor", commit, ccommit]
    ).returncode:
        raise Refused("controls.md was committed before the adjudication was frozen")


def read_controls(path: Path) -> list[str]:
    m = re.search(r"```controls\n(.*?)```", path.read_text(), re.S)
    if not m:
        raise Refused(f"{path} has no ```controls block")
    return [line.strip() for line in m.group(1).splitlines() if line.strip()]


def read_revisions(path: Path) -> dict[str, str]:
    return dict(
        line.split("=", 1) for line in path.read_text().splitlines() if "=" in line
    )


def read_adjudication(path: Path) -> dict[str, dict[str, str]]:
    lines = [ln for ln in path.read_text().splitlines() if ln.strip()]
    header = lines[0].split("\t")
    need = ["target", "verdict", "obligations", "survivor", "proof", "reason"]
    if header[: len(need)] != need:
        raise Refused(f"{path} header {header} != {need}")
    rows = {}
    for ln in lines[1:]:
        if ln.startswith("#"):
            continue
        cells = ln.split("\t")
        cells += [""] * (len(header) - len(cells))
        row = dict(zip(header, cells))
        rows[row["target"]] = row
    return rows


def file_of(target: str) -> tuple[str, str]:
    """(repo key, path in that repo) for a backend node id or a vitest `file > name`."""
    if "::" in target:
        return "backend", target.split("::", 1)[0]
    return "superproject", target.split(" > ", 1)[0]


def squash(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def proof_errors(row: dict[str, str], show) -> list[str]:
    verdict, target = row["verdict"], row["target"]
    entries = [e.strip() for e in row["proof"].split(" ; ") if e.strip()]
    if verdict == "RETIRE-WITH-CODE":
        dead = [e for e in entries if e.startswith("dead:")]
        if not dead:
            return ["RETIRE-WITH-CODE without a dead: entry"]
        errs = []
        for e in dead:
            paths, _, reason = e[len("dead:") :].partition("|")
            if not reason.strip():
                errs.append(f"dead entry without reason: {e[:60]}")
            for p in filter(None, (s.strip() for s in paths.split(","))):
                repo, rel = "superproject", p
                if show(repo, rel.rstrip("/")) is None:
                    errs.append(f"dead path not at revision: {p}")
        return errs
    obligations = [o for o in row["obligations"].split(" ; ") if o.strip()]
    if not obligations:
        return ["removal lists no obligations"]
    if len(entries) != len(obligations):
        return [f"{len(obligations)} obligations but {len(entries)} proofs"]
    errs = []
    for e in entries:
        kind, _, body = e.partition(":")
        if kind == "not-live":
            ap, _, reason = body.partition("|")
            if ap.strip() not in AP_IDS or not reason.strip():
                errs.append(f"bad not-live entry: {e[:60]}")
        elif kind == "superset":
            survivor, _, quote = body.partition("|")
            survivor, quote = survivor.strip(), quote.strip()
            if len(quote) >= 2 and quote[0] == quote[-1] == '"':
                quote = quote[1:-1]
            if not survivor or survivor == target or not quote.strip():
                errs.append(f"bad superset entry: {e[:60]}")
                continue
            text = show(*file_of(survivor))
            if text is None:
                errs.append(f"survivor file missing: {survivor}")
            elif squash(quote) not in squash(text):
                errs.append(f"quote not found in {file_of(survivor)[1]}: {quote[:50]}")
        else:
            errs.append(f"unknown proof form: {e[:60]}")
    return errs


def score_round(rnd: Path, repos: dict[str, Path], explain=False) -> bool:
    revs = read_revisions(rnd / "revisions.txt")
    controls = read_controls(rnd / "controls.md")
    rows = read_adjudication(rnd / "adjudication.tsv")
    cache: dict[tuple[str, str], str | None] = {}

    def show(repo: str, rel: str):
        key = (repo, rel)
        if key not in cache:
            rev = revs[f"{repo}_rev"]
            r = subprocess.run(
                ["git", "-C", str(repos[repo]), "show", f"{rev}:{rel}"],
                capture_output=True,
                text=True,
            )
            cache[key] = r.stdout if r.returncode == 0 else None
        return cache[key]

    bad_verdicts = [t for t, r in rows.items() if r["verdict"] not in VERDICTS]
    lost = [c for c in controls if rows.get(c, {}).get("verdict") != "KEEP"]
    invalid = {
        t: errs
        for t, r in rows.items()
        if r["verdict"] in REMOVALS and (errs := proof_errors(r, show))
    }
    ok = not lost and not invalid and not bad_verdicts
    if explain:
        print(
            f"[{rnd.name}] controls lost {len(lost)}/{len(controls)}: {lost}",
            file=sys.stderr,
        )
        removals = sum(r["verdict"] in REMOVALS for r in rows.values())
        print(
            f"[{rnd.name}] removals {removals}, invalid proofs {len(invalid)}",
            file=sys.stderr,
        )
        for t, errs in invalid.items():
            print(f"    {t}: {errs}", file=sys.stderr)
        if bad_verdicts:
            print(f"[{rnd.name}] unknown verdicts: {bad_verdicts}", file=sys.stderr)
        print(f"[{rnd.name}] {'pass' if ok else 'FAIL'}", file=sys.stderr)
    return ok


def decide(pilot: Path, repos: dict[str, Path], explain=False) -> str:
    r1, r2 = pilot / "round1", pilot / "round2"
    check_freeze(repos["superproject"], r1)
    if score_round(r1, repos, explain):
        return "PASS"
    if not (r2 / "adjudication.tsv").exists():
        return "REDUCED"
    check_freeze(repos["superproject"], r2)
    return "PASS" if score_round(r2, repos, explain) else "REDUCED"


# --------------------------------------------------------------------------- selftest


def selftest() -> None:
    """Synthetic rounds in a throwaway repo; every case must produce its expected result."""
    ok_adj = (
        "target\tverdict\tobligations\tsurvivor\tproof\treason\n"
        "backend/tests/test_s.py::test_ctl\tKEEP\tpins x\t-\t-\tmust-keep\n"
        "backend/tests/test_s.py::test_twin\tRETIRE\tadds one\tbackend/tests/test_s.py::test_add\t"
        'superset:backend/tests/test_s.py::test_add|"assert add(1, 2) == 3"\tAP-19\n'
        "# count 2\n"
    )
    lose_ctl = ok_adj.replace("test_ctl\tKEEP", "test_ctl\tRETIRE")
    bad_proof = ok_adj.replace("add(1, 2) == 3", "add(9, 9) == 18")
    controls = "# controls\n```controls\nbackend/tests/test_s.py::test_ctl\n```\n"
    dead_ok = ok_adj.replace(
        "# count 2\n",
        "backend/tests/test_s.py::test_harness\tRETIRE-WITH-CODE\truns harness\t-\t"
        "dead:backend/app/old_harness.py|only tests import it\tAP-02\n# count 3\n",
    )
    dead_missing = dead_ok.replace("backend/app/old_harness.py", "backend/app/no_such.py")
    # portfolio_site's real shape: vitest targets under theater/src/, quotes and dead: paths
    # resolved from the repo root at the recorded revision.
    fe_ok = (
        "target\tverdict\tobligations\tsurvivor\tproof\treason\n"
        "theater/src/a.test.ts > ctl\tKEEP\tpins x\t-\t-\tmust-keep\n"
        "theater/src/a.test.ts > twin\tRETIRE\tadds one\ttheater/src/a.test.ts > add\t"
        'superset:theater/src/a.test.ts > add|"expect(add(1, 2)).toBe(3);"\tAP-19\n'
        "theater/src/old.test.ts > harness\tRETIRE-WITH-CODE\truns harness\t-\t"
        "dead:theater/src/old.ts|only tests import it\tAP-02\n# count 3\n"
    )
    fe_bad_quote = fe_ok.replace("add(1, 2)).toBe(3)", "add(9, 9)).toBe(18)")
    fe_dead_missing = fe_ok.replace("dead:theater/src/old.ts", "dead:theater/src/no_such.ts")
    fe_controls = "# controls\n```controls\ntheater/src/a.test.ts > ctl\n```\n"

    def build(
        tmp: Path,
        r1: str,
        r2: str | None = None,
        restore_after=False,
        same_commit=False,
        ctl: str | None = None,
    ):
        # Plain-repo layout: one repo, the suites in subdirectories (`backend/`, `theater/src/`),
        # no gitlink.
        ctl_text = controls if ctl is None else ctl
        repo = tmp / "repo"
        repo.mkdir(parents=True)
        pilot = repo / "pilot"
        subprocess.run(["git", "init", "-q", str(repo)], check=True)
        git(repo, "config", "user.email", "t@t")
        git(repo, "config", "user.name", "t")
        (repo / "backend/tests").mkdir(parents=True)
        (repo / "backend/app").mkdir(parents=True)
        (repo / "backend/tests/test_s.py").write_text(
            "def test_add():\n    assert add(1, 2) == 3\n"
        )
        (repo / "backend/app/old_harness.py").write_text("def run():\n    return 1\n")
        (repo / "theater/src").mkdir(parents=True)
        (repo / "theater/src/a.test.ts").write_text(
            'it("add", () => {\n  expect(add(1, 2)).toBe(3);\n});\n'
        )
        (repo / "theater/src/old.ts").write_text("export const run = () => 1;\n")
        (repo / "seed").write_text("x")
        git(repo, "add", "-A")
        git(repo, "commit", "-qm", "seed")
        sp_rev = git(repo, "rev-parse", "HEAD").strip()
        be_rev = sp_rev
        for name, adj in (("round1", r1), ("round2", r2)):
            if adj is None:
                continue
            rnd = pilot / name
            rnd.mkdir(parents=True)
            (rnd / "adjudication.tsv").write_text(adj)
            (rnd / "revisions.txt").write_text(
                f"backend_rev={be_rev}\nsuperproject_rev={sp_rev}\n"
            )
            digest = sha256(rnd / "adjudication.tsv")
            if same_commit:
                (rnd / "controls.md").write_text(ctl_text)
            git(repo, "add", "-A")
            git(repo, "commit", "-qm", f"freeze\n\nadjudication sha256: {digest}")
            if not same_commit:
                (rnd / "controls.md").write_text(ctl_text)
                git(repo, "add", "-A")
                git(repo, "commit", "-qm", "controls")
        if restore_after:
            (pilot / "round1/adjudication.tsv").write_text(ok_adj)
            git(repo, "commit", "-qam", "later edit restoring the control")
        return pilot, {"superproject": repo, "backend": repo}

    cases = [
        ("clean round 1", dict(r1=ok_adj), "PASS"),
        ("plain subdirectory: superset quote and dead: path resolve", dict(r1=dead_ok), "PASS"),
        ("plain subdirectory: dead: path absent at revision", dict(r1=dead_missing), "REDUCED"),
        ("vitest theater/src: superset quote and dead: path resolve", dict(r1=fe_ok, ctl=fe_controls), "PASS"),
        ("vitest theater/src: quote absent from survivor", dict(r1=fe_bad_quote, ctl=fe_controls), "REDUCED"),
        ("vitest theater/src: dead: path absent at revision", dict(r1=fe_dead_missing, ctl=fe_controls), "REDUCED"),
        ("round 1 loses a control, no round 2", dict(r1=lose_ctl), "REDUCED"),
        ("round 1 invalid proof, no round 2", dict(r1=bad_proof), "REDUCED"),
        ("round 1 fails, round 2 passes", dict(r1=lose_ctl, r2=ok_adj), "PASS"),
        ("both rounds fail", dict(r1=lose_ctl, r2=lose_ctl), "REDUCED"),
        (
            "frozen loses a control, later edit restores it",
            dict(r1=lose_ctl, restore_after=True),
            "REFUSED",
        ),
        (
            "controls committed with the adjudication",
            dict(r1=ok_adj, same_commit=True),
            "REFUSED",
        ),
    ]
    failures = 0
    for name, kw, want in cases:
        with tempfile.TemporaryDirectory() as tmp:
            pilot, repos = build(Path(tmp), **kw)
            try:
                got = decide(pilot, repos)
            except Refused:
                got = "REFUSED"
        mark = "ok " if got == want else "BAD"
        failures += got != want
        print(f"{mark} {name}: {got} (want {want})", file=sys.stderr)
    # The frozen-loses-a-control case must also *score* REDUCED on its frozen bytes.
    with tempfile.TemporaryDirectory() as tmp:
        pilot, repos = build(Path(tmp), r1=lose_ctl)
        got = decide(pilot, repos)
        failures += got != "REDUCED"
        print(
            f"{'ok ' if got == 'REDUCED' else 'BAD'} frozen losing file scores {got}",
            file=sys.stderr,
        )
    if failures:
        sys.exit(f"selftest: {failures} case(s) wrong")
    print("selftest: all cases as expected", file=sys.stderr)


def main() -> None:
    if "--selftest" in sys.argv:
        selftest()
        return
    root = HERE.parents[3]
    repos = {"superproject": root, "backend": root}
    try:
        print(decide(HERE, repos, explain="--explain" in sys.argv))
    except Refused as exc:
        print(f"REFUSED: {exc}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
