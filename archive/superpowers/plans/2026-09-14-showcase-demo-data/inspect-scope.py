#!/usr/bin/env python3
"""inspect-scope.py — G7 content-inspection aid for a frozen scope.json written by gate-run.sh freeze.

Prints every text value in every frozen scope row, at any depth (JSON/JSONB objects, arrays, and JSON documents
stored inside text fields), UNTRUNCATED, with its path. The reader then judges whether anything reads as real data
(a real person's name, a real email, prose that reads like Evan's own writing). Values under secret-looking keys are
masked and only their length is shown. Numbers, booleans and nulls are not printed.

Read-only: it reads one file and writes only to stdout. Exit 0 = printed; exit 3 = a table's row count differs from
its expected count or its frozen id count (a D4 stop).

Usage: inspect-scope.py /home/evan/showcase-pending/_teardown-evidence/<app>/scope.json
"""

import json
import sys

SECRET_PARTS = ("password", "token", "secret", "hash", "salt", "otp", "nonce", "encrypted", "recovery", "confirmation")
SECRET_EXACT = {"jti", "code", "code_challenge"}


def is_secret(key: str) -> bool:
    k = key.lower()
    return k in SECRET_EXACT or any(part in k for part in SECRET_PARTS)


def walk(value, path, out):
    if isinstance(value, dict):
        for key in sorted(value):
            child = f"{path}.{key}"
            if is_secret(key):
                out.append((child, f"<masked: {len(json.dumps(value[key]))} chars>"))
            else:
                walk(value[key], child, out)
    elif isinstance(value, list):
        for i, item in enumerate(value):
            walk(item, f"{path}[{i}]", out)
    elif isinstance(value, str):
        stripped = value.strip()
        if stripped[:1] in ("{", "["):
            try:
                walk(json.loads(stripped), f"{path}<json>", out)
                return
            except ValueError:
                pass
        out.append((path, value))


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    with open(sys.argv[1], encoding="utf-8") as fh:
        scope = json.load(fh)
    status = 0
    for table, entry in scope.items():
        rows, ids, expected = entry["rows"], entry["ids"], entry["expected"]
        flag = ""
        if not (len(rows) == len(ids) == expected):
            flag = "   <-- COUNT MISMATCH (D4 stop)"
            status = 3
        print(f"== {table}: expected {expected}, frozen ids {len(ids)}, rows {len(rows)}{flag}")
        for i, row in enumerate(rows, 1):
            out = []
            walk(row, "", out)
            print(f"-- {table} row {i}/{len(rows)} key={row.get(entry['pkcol'])}")
            for p, text in out:
                print(f"   {p} = {text}")
    return status


if __name__ == "__main__":
    sys.exit(main())
