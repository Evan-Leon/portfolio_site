#!/usr/bin/env bash
# selftest-files.sh — exercises chudios-files.sh against three generated files in a UNIQUE mktemp directory inside the
# chudios backend container (its ephemeral writable layer). Never touches /data/recordings, and removes only the
# directory it created. Exit 0 only if all cases pass.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
S="$HERE/chudios-files.sh"
C=chudios-backend-1
fails=0
export GATE_EVIDENCE_DIR="$(mktemp -d)"

T="$(docker exec "$C" mktemp -d /tmp/gate-files-selftest.XXXXXX)" || { echo "cannot create container temp dir" >&2; exit 2; }
case "$T" in /tmp/gate-files-selftest.??????) ;; *) echo "unexpected temp dir '$T'" >&2; exit 2 ;; esac
cleanup() { docker exec "$C" sh -c "rm -rf -- '$T'"; rm -rf "$GATE_EVIDENCE_DIR"; }
trap cleanup EXIT
export GATE_FILES_ROOT="$T"

setup() {
  docker exec "$C" sh -c "rm -rf -- '$T/.showcase-quarantine' '$T/f1.m4a' '$T/f2.m4a' '$T/f3.m4a' && printf a > '$T/f1.m4a' && printf bb > '$T/f2.m4a' && printf ccc > '$T/f3.m4a'"
  GATE_FILES_MANIFEST="$(docker exec "$C" sh -c "cd '$T' && for f in f1.m4a f2.m4a f3.m4a; do echo \"\$f \$(stat -c %s \$f) \$(sha256sum \$f | cut -d' ' -f1)\"; done")"
  export GATE_FILES_MANIFEST
}
check() {  # check <name> pass|stop <pattern> <phase> [crash-after]
  local out st
  out="$(GATE_FILES_CRASH_AFTER="${5:-}" "$S" "$4" 2>&1)"; st=$?
  if { [ "$2" = pass ] && [ $st -eq 0 ]; } || { [ "$2" = stop ] && [ $st -ne 0 ] && grep -qF "$3" <<< "$out$(cat "$GATE_EVIDENCE_DIR/chudios/files-$4.log" 2>/dev/null)"; }; then
    echo "ok   $1"
  else
    echo "FAIL $1 (exit $st)"; echo "$out" | tail -n 3; fails=$((fails + 1))
  fi
}
at() { docker exec "$C" sh -c "ls -A '$T' '$T/.showcase-quarantine' 2>/dev/null | tr '\n' ' '"; }

setup
check "check passes on exact files"                 pass "" check
check "quarantine moves them"                       pass "" quarantine
check "check refuses while quarantined"             stop "already exists" check
check "restore puts them back"                      pass "" restore
check "check passes again after restore"            pass "" check
docker exec "$C" sh -c "printf X >> '$T/f2.m4a'"
check "tampered file stops quarantine"              stop "size/sha differ" quarantine
setup
check "quarantine crashes after 2 operations"       stop "simulated crash" quarantine 2
check "quarantine resumes and completes"            pass "" quarantine
check "purge crashes after 1 deletion"              stop "simulated crash" purge 1
check "purge resumes and completes"                 pass "" purge
check "post confirms absence"                       pass "" post
setup
check "quarantine crashes after 3 operations"       stop "simulated crash" quarantine 3
check "restore reverses a partial quarantine"       pass "" restore
check "check passes after partial-quarantine restore" pass "" check
setup
check "quarantine (stray case)"                     pass "" quarantine
docker exec "$C" sh -c "printf s > '$T/.showcase-quarantine/stray.m4a'"
check "stray file in quarantine stops purge"        stop "stray file in quarantine" purge
docker exec "$C" sh -c "rm -f -- '$T/.showcase-quarantine/stray.m4a'"
docker exec "$C" sh -c "cp '$T/.showcase-quarantine/f1.m4a' '$T/f1.m4a'"
check "a file in both places stops purge"           stop "refusing to purge" purge
setup
check "post detects a file still present"           stop "still exists" post
GATE_FILES_ROOT=/data/recordings-not-tmp-oops check "non-selftest root refused" stop "must be /tmp/gate-files-selftest" check

echo "selftest-files: $fails failure(s)"
[ "$fails" -eq 0 ]
