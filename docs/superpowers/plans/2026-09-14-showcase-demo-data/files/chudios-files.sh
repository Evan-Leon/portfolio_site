#!/usr/bin/env bash
# chudios-files.sh — two-phase, resumable removal of the three showcase demo recordings from the chudios volume. Rev 2.
#
#   chudios-files.sh check        G1 target + mount; exactly the 3 files with the recorded size + sha256; no quarantine dir
#   chudios-files.sh quarantine   move each file into <root>/.showcase-quarantine/ (same volume). Resumable: a file
#                                 already in quarantine (exact size + sha) is skipped.
#   chudios-files.sh restore      move each quarantined file back. Resumable: a file already back in <root> is skipped.
#                                 Used only when the database execute is classified PRE-STATE.
#   chudios-files.sh purge        delete each quarantined file. Resumable: a file already gone from both places is
#                                 skipped. Used only when the database execute is classified COMMITTED.
#   chudios-files.sh post         the 3 files are absent from <root> and no quarantine dir exists
#
# Each file must be in exactly one allowed place with its exact size + sha256; anything else (in both places, in
# neither when it must exist, a stray file in the quarantine dir) is a STOP. Files are named exactly; no globs.
# Exit 0 = passed; anything else = STOP under D4.
# Selftest-only overrides (all require GATE_FILES_ROOT under /tmp): GATE_FILES_ROOT, GATE_FILES_MANIFEST
# (lines "name size sha256"), GATE_FILES_CRASH_AFTER=N (exit after N file operations, to simulate a crash).
set -uo pipefail

C=chudios-backend-1
PROJ=chudios
VOLUME=chudios_chudios-recordings
ROOT="${GATE_FILES_ROOT:-/data/recordings}"
Q="$ROOT/.showcase-quarantine"
EVID="${GATE_EVIDENCE_DIR:-/home/evan/showcase-pending/_teardown-evidence}"
CRASH_AFTER="${GATE_FILES_CRASH_AFTER:-}"
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
inc()  { timeout --foreground -k 5 120 docker exec "$C" sh -c "$1" 2>>"$LOG"; }

got="$(timeout 30 docker inspect -f '{{.State.Running}} {{index .Config.Labels "com.docker.compose.project"}}' "$C" 2>/dev/null)"
[ "$got" = "true $PROJ" ] || fail "G1 target: container $C reports '$got', expected 'true $PROJ'"
if [ -n "${GATE_FILES_ROOT:-}" ]; then
  case "$ROOT" in /tmp/gate-files-selftest.*) ;; *) fail "G1 selftest root must be /tmp/gate-files-selftest.*, got $ROOT" ;; esac
else
  [ -z "$CRASH_AFTER" ] && [ -z "${GATE_FILES_MANIFEST:-}" ] || fail "G1 selftest overrides are refused against the real volume"
  mount="$(timeout 30 docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data/recordings"}}{{.Name}}{{end}}{{end}}' "$C")"
  [ "$mount" = "$VOLUME" ] || fail "G1 mount: /data/recordings is '$mount', expected volume $VOLUME"
fi

ops=0
op() {  # op <shell command> <label>: one file operation, counted for the selftest crash hook
  inc "$1" || fail "$2 failed"
  ops=$((ops + 1))
  echo "op $ops: $2" >> "$LOG"
  if [ -n "$CRASH_AFTER" ] && [ "$ops" -ge "$CRASH_AFTER" ]; then echo "simulated crash after $ops op(s)" >> "$LOG"; exit 9; fi
}

where() {  # where <name> <size> <sha> -> prints root | quarantine | both | none ; STOP on a wrong size/sha
  local name="$1" size="$2" sha="$3" r=0 q=0 dir got_size got_sha
  for dir in "$ROOT" "$Q"; do
    if inc "test -e '$dir/$name'"; then
      got_size="$(inc "stat -c %s '$dir/$name'")"; got_sha="$(inc "sha256sum '$dir/$name'" | cut -d' ' -f1)"
      echo "$dir/$name size=$got_size sha=$got_sha" >> "$LOG"
      [ "$got_size" = "$size" ] && [ "$got_sha" = "$sha" ] || fail "G3 $dir/$name size/sha differ from the manifest"
      [ "$dir" = "$ROOT" ] && r=1 || q=1
    fi
  done
  if [ $r -eq 1 ] && [ $q -eq 1 ]; then echo both; elif [ $r -eq 1 ]; then echo root; elif [ $q -eq 1 ]; then echo quarantine; else echo none; fi
}

no_strays() {  # the quarantine dir, if present, holds only manifest names
  inc "test -d '$Q'" || return 0
  local listed name
  listed="$(inc "ls -A '$Q'")"
  while read -r name; do
    [ -z "$name" ] && continue
    grep -q "^$name " <<< "$MANIFEST" || fail "stray file in quarantine: $name"
  done <<< "$listed"
}

case "$phase" in
  check)
    inc "test ! -e '$Q'" || fail "quarantine dir $Q already exists"
    while read -r name size sha; do
      [ "$(where "$name" "$size" "$sha")" = root ] || fail "G3 $name is not (only) in $ROOT"
    done <<< "$MANIFEST" ;;
  quarantine)
    no_strays
    inc "test -d '$Q'" || op "mkdir '$Q'" "mkdir quarantine"
    while read -r name size sha; do
      case "$(where "$name" "$size" "$sha")" in
        root)       op "mv '$ROOT/$name' '$Q/$name'" "quarantine $name" ;;
        quarantine) echo "$name already quarantined" >> "$LOG" ;;
        *)          fail "G3 $name must be in $ROOT or quarantine, found: $(where "$name" "$size" "$sha")" ;;
      esac
    done <<< "$MANIFEST"
    while read -r name size sha; do
      [ "$(where "$name" "$size" "$sha")" = quarantine ] || fail "G9 $name did not end in quarantine"
    done <<< "$MANIFEST" ;;
  restore)
    no_strays
    while read -r name size sha; do
      case "$(where "$name" "$size" "$sha")" in
        quarantine) op "mv '$Q/$name' '$ROOT/$name'" "restore $name" ;;
        root)       echo "$name already restored" >> "$LOG" ;;
        *)          fail "G3 $name must be in quarantine or $ROOT, found: $(where "$name" "$size" "$sha")" ;;
      esac
    done <<< "$MANIFEST"
    inc "test ! -d '$Q'" || op "rmdir '$Q'" "rmdir quarantine"
    while read -r name size sha; do
      [ "$(where "$name" "$size" "$sha")" = root ] || fail "G9 $name did not end in $ROOT"
    done <<< "$MANIFEST" ;;
  purge)
    no_strays
    while read -r name size sha; do
      case "$(where "$name" "$size" "$sha")" in
        quarantine) op "rm '$Q/$name'" "purge $name" ;;
        none)       echo "$name already purged" >> "$LOG" ;;
        *)          fail "G3 $name is in $ROOT — refusing to purge (was it restored?)" ;;
      esac
    done <<< "$MANIFEST"
    inc "test ! -d '$Q'" || op "rmdir '$Q'" "rmdir quarantine"
    while read -r name size sha; do
      [ "$(where "$name" "$size" "$sha")" = none ] || fail "G10 $name still exists"
    done <<< "$MANIFEST" ;;
  post)
    inc "test ! -e '$Q'" || fail "G10 quarantine dir still exists"
    while read -r name size sha; do
      [ "$(where "$name" "$size" "$sha")" = none ] || fail "G10 $name still exists"
    done <<< "$MANIFEST" ;;
  *) echo "GATE FAIL unknown phase: $phase" >&2; exit 2 ;;
esac

echo "PASS chudios files $phase (log: $LOG)"
