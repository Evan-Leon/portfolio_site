#!/usr/bin/env bash
# chudios-files.sh — two-phase removal of the three showcase demo recordings from the chudios volume.
#
#   chudios-files.sh check        G1 target + mount; exactly the 3 files with the recorded size + sha256; no quarantine dir
#   chudios-files.sh quarantine   check, then mv the 3 files into <root>/.showcase-quarantine/ (same volume) and verify
#   chudios-files.sh restore      move them back (used when the database execute did NOT succeed) and verify
#   chudios-files.sh purge        delete the quarantined files and the quarantine dir (only after the database COMMIT)
#   chudios-files.sh post         the 3 files are absent from <root> and no quarantine dir exists
#
# Files are named exactly; there are no globs. Exit 0 = passed; anything else = STOP under D4.
# Selftest overrides: GATE_FILES_ROOT (must be under /tmp), GATE_FILES_MANIFEST (lines: "name size sha256").
set -uo pipefail

C=chudios-backend-1
PROJ=chudios
VOLUME=chudios_chudios-recordings
ROOT="${GATE_FILES_ROOT:-/data/recordings}"
Q="$ROOT/.showcase-quarantine"
EVID="${GATE_EVIDENCE_DIR:-/home/evan/showcase-pending/_teardown-evidence}"
phase="${1:?usage: chudios-files.sh <phase>}"

MANIFEST="${GATE_FILES_MANIFEST:-}"
if [ -z "$MANIFEST" ]; then
  MANIFEST=$'demo-sn-ep09.m4a 230111 d200074dfa14656036b7257f0c8bd8e4da432844480290d59e9c0f4d96026a53\ndemo-sn-ep11.m4a 246791 603de3b526139c4d5b100d59b3d6abfdd842c5e7bcd39c53ab541e7e00915569\ndemo-sn-ep12.m4a 286386 fbf950e422c591d2f5791a09043ac834cbf4b216a74a710e00656355c07d02d1'
fi

OUT="$EVID/chudios"
mkdir -p "$OUT" && chmod 700 "$EVID" "$OUT"
LOG="$OUT/files-$phase.log"
echo "target: container=$C root=$ROOT" > "$LOG"
fail() { echo "GATE FAIL $*" | tee -a "$LOG" >&2; echo "STOP chudios files $phase — see $LOG" >&2; exit 1; }
inc()  { docker exec "$C" sh -c "$1" 2>>"$LOG"; }

got="$(docker inspect -f '{{.State.Running}} {{index .Config.Labels "com.docker.compose.project"}}' "$C" 2>/dev/null)"
[ "$got" = "true $PROJ" ] || fail "G1 target: container $C reports '$got', expected 'true $PROJ'"
if [ -n "${GATE_FILES_ROOT:-}" ]; then
  case "$ROOT" in /tmp/*) ;; *) fail "G1 selftest root must be under /tmp, got $ROOT" ;; esac
else
  mount="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data/recordings"}}{{.Name}}{{end}}{{end}}' "$C")"
  [ "$mount" = "$VOLUME" ] || fail "G1 mount: /data/recordings is '$mount', expected volume $VOLUME"
fi

verify_in() {  # verify_in <dir>: every manifest file is present there with the exact size and sha256
  local dir="$1" name size sha got_size got_sha
  while read -r name size sha; do
    got_size="$(inc "stat -c %s '$dir/$name'")" || fail "missing $dir/$name"
    got_sha="$(inc "sha256sum '$dir/$name'" | cut -d' ' -f1)"
    echo "$dir/$name size=$got_size sha=$got_sha" >> "$LOG"
    [ "$got_size" = "$size" ] && [ "$got_sha" = "$sha" ] || fail "G3 $dir/$name size/sha differ from the manifest"
  done <<< "$MANIFEST"
}

absent_in() {  # absent_in <dir>: no manifest file exists there
  local dir="$1" name _
  while read -r name _; do
    inc "test ! -e '$dir/$name'" || fail "G10 $dir/$name still exists"
  done <<< "$MANIFEST"
}

case "$phase" in
  check)
    inc "test ! -e '$Q'" || fail "quarantine dir $Q already exists"
    verify_in "$ROOT" ;;
  quarantine)
    inc "test ! -e '$Q'" || fail "quarantine dir $Q already exists"
    verify_in "$ROOT"
    inc "mkdir '$Q'" || fail "mkdir $Q failed"
    while read -r name _; do inc "mv '$ROOT/$name' '$Q/$name'" || fail "mv $name failed — run restore"; done <<< "$MANIFEST"
    verify_in "$Q"; absent_in "$ROOT" ;;
  restore)
    verify_in "$Q"
    while read -r name _; do inc "test ! -e '$ROOT/$name'" || fail "$ROOT/$name exists; refusing to overwrite"; done <<< "$MANIFEST"
    while read -r name _; do inc "mv '$Q/$name' '$ROOT/$name'" || fail "mv back $name failed"; done <<< "$MANIFEST"
    inc "rmdir '$Q'" || fail "rmdir $Q failed (unexpected files inside?)"
    verify_in "$ROOT" ;;
  purge)
    verify_in "$Q"
    while read -r name _; do inc "rm '$Q/$name'" || fail "rm $name failed"; done <<< "$MANIFEST"
    inc "rmdir '$Q'" || fail "rmdir $Q failed (unexpected files inside?)"
    absent_in "$ROOT" ;;
  post)
    inc "test ! -e '$Q'" || fail "G10 quarantine dir still exists"
    absent_in "$ROOT" ;;
  *) echo "GATE FAIL unknown phase: $phase" >&2; exit 2 ;;
esac

echo "PASS chudios files $phase (log: $LOG)"
