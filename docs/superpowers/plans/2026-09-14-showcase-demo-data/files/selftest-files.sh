#!/usr/bin/env bash
# selftest-files.sh — exercises chudios-files.sh against three generated files in /tmp INSIDE the chudios
# backend container (its ephemeral writable layer). Never touches /data/recordings. Exit 0 only if all pass.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
S="$HERE/chudios-files.sh"
C=chudios-backend-1
T=/tmp/gate-files-selftest
fails=0
export GATE_EVIDENCE_DIR="$(mktemp -d)"
export GATE_FILES_ROOT="$T"

setup() {
  docker exec "$C" sh -c "rm -rf '$T' && mkdir -p '$T' && printf a > '$T/f1.m4a' && printf bb > '$T/f2.m4a' && printf ccc > '$T/f3.m4a'"
  GATE_FILES_MANIFEST="$(docker exec "$C" sh -c "cd '$T' && for f in f1.m4a f2.m4a f3.m4a; do echo \"\$f \$(stat -c %s \$f) \$(sha256sum \$f | cut -d' ' -f1)\"; done")"
  export GATE_FILES_MANIFEST
}
check() {  # check <name> pass|stop <pattern> <phase>
  local out st
  out="$("$S" "$4" 2>&1)"; st=$?
  if { [ "$2" = pass ] && [ $st -eq 0 ]; } || { [ "$2" = stop ] && [ $st -ne 0 ] && grep -qF "$3" <<< "$out"; }; then
    echo "ok   $1"
  else
    echo "FAIL $1 (exit $st)"; echo "$out" | tail -n 3; fails=$((fails + 1))
  fi
}

setup
check "check passes on exact files"          pass "" check
check "quarantine moves them"                pass "" quarantine
check "check refuses while quarantined"      stop "already exists" check
check "restore puts them back"               pass "" restore
check "check passes again after restore"     pass "" check
docker exec "$C" sh -c "printf X >> '$T/f2.m4a'"
check "tampered file stops quarantine"       stop "size/sha differ" quarantine
setup
check "quarantine (purge path)"              pass "" quarantine
check "purge deletes quarantined files"      pass "" purge
check "post confirms absence"                pass "" post
setup
check "post detects a file still present"    stop "still exists" post
GATE_FILES_ROOT=/data/recordings-not-tmp-oops check "non-/tmp selftest root refused" stop "must be under /tmp" check

docker exec "$C" sh -c "rm -rf '$T'"
rm -rf "$GATE_EVIDENCE_DIR"
echo "selftest-files: $fails failure(s)"
[ "$fails" -eq 0 ]
