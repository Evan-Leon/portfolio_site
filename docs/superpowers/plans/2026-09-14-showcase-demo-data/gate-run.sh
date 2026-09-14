#!/usr/bin/env bash
# gate-run.sh — run the fail-closed demo-data gate for ONE Postgres app, one phase at a time. Rev 2.
#
#   gate-run.sh <app> preflight   G1-G5 inside a transaction that is always rolled back
#   gate-run.sh <app> freeze      preflight + ONE repeatable-read transaction writing scope.json, scope-ids.json,
#                                 snapshot.txt, digest.txt, rows-digest.txt (never overwrites)
#   gate-run.sh <app> refreeze    move the current freeze + .ok markers to superseded-<UTC>/, then freeze again
#                                 (refused once an execute has been classified COMMITTED)
#   gate-run.sh <app> rehearse    lock + compare + full delete inside a transaction that is ROLLED BACK; proves no change
#   gate-run.sh <app> negative    rehearse with one expected count off by one; passes only on "GATE FAIL G3 count"
#   gate-run.sh <app> execute     the delete, COMMITTED (needs rehearse.ok + negative.ok newer than the freeze), then
#                                 classifies the frozen ids and records state.txt; passes only when state is COMMITTED
#   gate-run.sh <app> classify    read-only: PRE-STATE (all frozen ids present), COMMITTED (none), MIXED — state.txt
#   gate-run.sh <app> post        post mode: every scope selector empty, extra checks at post values, closure intact,
#                                 frozen ids gone, survivors identical to the freeze
#
# Exit 0 = phase passed. Any other exit = STOP under D4: report the log; delete nothing further for this app.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVID="${GATE_EVIDENCE_DIR:-/home/evan/showcase-pending/_teardown-evidence}"
TIMEOUT="${GATE_TIMEOUT:-900}"
app="${1:?usage: gate-run.sh <app> <phase>}"
phase="${2:?usage: gate-run.sh <app> <phase>}"

DECL="$HERE/apps/$app.sql"
case "$app" in
  leonsbudget)        C=infra-postgres-1;        PROJ=infra;       DB=leons_budget ;;
  the-classic)        C=supabase_db_the-classic; PROJ=the-classic; DB=postgres ;;
  chudios)            C=infra-postgres-1;        PROJ=infra;       DB=chudios ;;
  co-host)            C=infra-postgres-1;        PROJ=infra;       DB=co_host ;;
  co-host-chud)       C=infra-postgres-1;        PROJ=infra;       DB=chud ;;
  co-author)          C=infra-postgres-1;        PROJ=infra;       DB=co_author ;;
  selftest)           C=infra-postgres-1;        PROJ=infra;       DB=showcase_gate_selftest ;;
  selftest-flip)      C=infra-postgres-1;        PROJ=infra;       DB=showcase_gate_selftest ;;
  selftest-badtarget) C=infra-postgres-1;        PROJ=not-infra;   DB=showcase_gate_selftest; DECL="$HERE/apps/selftest.sql" ;;
  selftest-wrongdb)   C=infra-postgres-1;        PROJ=infra;       DB=postgres;               DECL="$HERE/apps/selftest.sql" ;;
  *) echo "GATE FAIL G1 unknown app: $app" >&2; exit 2 ;;
esac
[ -f "$DECL" ] || { echo "GATE FAIL G1 missing declaration: $DECL" >&2; exit 2; }

# G1 (container half): the exact container must be running under the expected compose project.
got="$(timeout --foreground -k 10 30 docker inspect -f '{{.State.Running}} {{index .Config.Labels "com.docker.compose.project"}}' "$C" 2>/dev/null)"
if [ "$got" != "true $PROJ" ]; then
  echo "GATE FAIL G1 target: container $C reports '$got', expected 'true $PROJ'" >&2
  exit 2
fi

OUT="$EVID/$app"
mkdir -p "$OUT" && chmod 700 "$EVID" "$OUT"
if [ "${GATE_REVIEW:-0}" = 1 ]; then
  # Reviewer mode: read-only phases only. Logs and the classified state go to a separate review/ directory,
  # so the implementer's original logs, mtimes and state.txt are never overwritten.
  case "$phase" in preflight|classify|post) ;; *) echo "GATE FAIL review mode allows only preflight, classify, post" >&2; exit 2 ;; esac
  STAMP="$(date -u +%Y%m%dT%H%M%S%NZ)"
  mkdir -p "$OUT/review" && chmod 700 "$OUT/review"
  LOG="$OUT/review/$phase-$STAMP.log"; STATE="$OUT/review/state-$STAMP.txt"
else
  LOG="$OUT/$phase.log"; STATE="$OUT/state.txt"
fi
echo "target: container=$C project=$PROJ database=$DB declaration=$DECL" > "$LOG"
FROZEN=(scope.json scope-ids.json snapshot.txt digest.txt rows-digest.txt)

psql_run() { timeout --foreground -k 10 "$TIMEOUT" docker exec -i "$C" psql -U postgres -d "$DB" -X -q -At -v ON_ERROR_STOP=1 "$@"; }
run_sql()  { psql_run "$@" >> "$LOG" 2>&1; }

body() {  # $1 = gate mode (pre|post): gate library, mode, declaration
  cat "$HERE/gate.sql"
  echo "SET gate.mode = '$1';"
  cat "$DECL"
}

need_frozen() {
  for f in "${FROZEN[@]}"; do
    [ -s "$OUT/$f" ] || { echo "GATE FAIL frozen evidence missing: $OUT/$f (run freeze first)" | tee -a "$LOG" >&2; exit 2; }
  done
}

committed_already() { [ -f "$OUT/state.txt" ] && [ "$(cat "$OUT/state.txt")" = COMMITTED ]; }

frozen_vars() {
  printf '%s\0' -v "snap=$(cat "$OUT/snapshot.txt")" -v "digest=$(cat "$OUT/digest.txt")" -v "rows=$(cat "$OUT/rows-digest.txt")"
}

classify() {  # writes state.txt; prints the state; returns psql's status
  local line s
  line="$({ echo 'BEGIN;'; cat "$HERE/gate.sql"; echo "SELECT pg_temp.gate_classify(:'scope');"; echo 'ROLLBACK;'; } \
          | psql_run -v scope="$(cat "$OUT/scope-ids.json")" 2>>"$LOG")"
  s=$?
  echo "classify: $line (psql exit $s)" >> "$LOG"
  case "$line" in
    "GATE STATE PRE-STATE") echo PRE-STATE > "$STATE" ;;
    "GATE STATE COMMITTED") echo COMMITTED > "$STATE" ;;
    "GATE STATE MIXED")     echo MIXED > "$STATE" ;;
    *)                      echo UNKNOWN > "$STATE"; [ "$s" -eq 0 ] && s=1 ;;
  esac
  echo "state: $(cat "$STATE")" | tee -a "$LOG"
  return "$s"
}

do_freeze() {
  for f in "${FROZEN[@]}"; do
    [ -e "$OUT/$f" ] && { echo "GATE FAIL freeze refuses to overwrite $OUT/$f" | tee -a "$LOG" >&2; return 2; }
  done
  local tmp="$OUT/freeze.tmp" s
  { echo 'BEGIN ISOLATION LEVEL REPEATABLE READ;'; body pre
    echo 'SELECT pg_temp.gate_preflight();'
    echo "SELECT 'F1 ' || pg_temp.gate_export()::text;"
    echo "SELECT 'F2 ' || pg_temp.gate_scope_ids()::text;"
    echo "SELECT 'F3 ' || pg_temp.gate_snapshot()::text;"
    echo "SELECT 'F4 ' || pg_temp.gate_scope_digest();"
    echo "SELECT 'F5 ' || pg_temp.gate_rows_digest();"
    echo 'ROLLBACK;'; } | psql_run > "$tmp" 2>> "$LOG"
  s=$?
  if [ "$s" -ne 0 ] || [ "$(head -n1 "$tmp")" != "GATE PREFLIGHT OK" ] || [ "$(wc -l < "$tmp")" -ne 6 ]; then
    cat "$tmp" >> "$LOG"; rm -f "$tmp"; [ "$s" -eq 0 ] && s=1; return "$s"
  fi
  local i=1 f
  for f in "${FROZEN[@]}"; do
    grep "^F$i " "$tmp" | sed "s/^F$i //" > "$OUT/$f"
    [ "$(wc -l < "$OUT/$f")" -eq 1 ] || { echo "GATE FAIL freeze: $f is not exactly one line" >> "$LOG"; rm -f "$tmp"; return 1; }
    i=$((i + 1))
  done
  rm -f "$tmp"
  chmod 600 "${FROZEN[@]/#/$OUT/}"
  return 0
}

commit_marker() {  # selftest-only hook: GATE_TEST_DROP_MARKER=1 simulates losing the post-COMMIT marker
  if [ "${GATE_TEST_DROP_MARKER:-0}" = 1 ] && [ "${app#selftest}" != "$app" ]; then
    echo "SELECT 'GATE MARKER DROPPED (selftest hook)';"
  else
    echo "SELECT 'GATE COMMITTED';"
  fi
}

txn_body() {  # $1 = commit flag (0|1), $2 = negative-control increment (0|1)
  echo 'BEGIN ISOLATION LEVEL REPEATABLE READ;'
  body pre
  cat <<SQL
UPDATE gate_scope SET expected = expected + $2
 WHERE tbl = (SELECT tbl FROM gate_scope ORDER BY del_order LIMIT 1);
SELECT pg_temp.gate_preflight();
SELECT pg_temp.gate_lock();
SELECT pg_temp.gate_assert_rows(:'rows');
SELECT pg_temp.gate_assert_digest(:'digest');
SELECT pg_temp.gate_assert_snapshot(:'snap', 'before delete');
SELECT pg_temp.gate_delete();
SELECT pg_temp.gate_assert_snapshot(:'snap', 'after delete');
\if $1
COMMIT;
$(commit_marker)
\else
ROLLBACK;
SELECT 'GATE ROLLED BACK';
\endif
SQL
}

unchanged_since_freeze() {  # fresh transaction: preflight + scope rows + ids + survivors all equal the freeze
  local args=(); mapfile -d '' args < <(frozen_vars)
  { echo 'BEGIN ISOLATION LEVEL REPEATABLE READ;'; body pre
    echo 'SELECT pg_temp.gate_preflight();'
    echo "SELECT pg_temp.gate_assert_rows(:'rows');"
    echo "SELECT pg_temp.gate_assert_digest(:'digest');"
    echo "SELECT pg_temp.gate_assert_snapshot(:'snap', 'after rollback');"
    echo 'ROLLBACK;'; } | run_sql "${args[@]}"
}

case "$phase" in
  preflight)
    { echo 'BEGIN;'; body pre; echo 'SELECT pg_temp.gate_preflight();'; echo 'ROLLBACK;'; } | run_sql
    st=$? ;;

  freeze)
    do_freeze; st=$? ;;

  refreeze)
    if committed_already; then echo "GATE FAIL refreeze refused: execute was classified COMMITTED" | tee -a "$LOG" >&2; exit 2; fi
    sup="$OUT/superseded-$(date -u +%Y%m%dT%H%M%SZ)"
    mkdir -p "$sup" && chmod 700 "$sup"
    for f in "${FROZEN[@]}" rehearse.ok negative.ok state.txt; do [ -e "$OUT/$f" ] && mv "$OUT/$f" "$sup/"; done
    echo "superseded previous freeze into $sup" >> "$LOG"
    do_freeze; st=$? ;;

  rehearse|negative|execute)
    need_frozen
    commit=0; neg=0
    [ "$phase" = negative ] && neg=1
    if [ "$phase" = execute ]; then
      commit=1
      committed_already && { echo "GATE FAIL execute refused: already classified COMMITTED" | tee -a "$LOG" >&2; exit 2; }
      for m in rehearse.ok negative.ok; do
        [ "$OUT/$m" -nt "$OUT/digest.txt" ] || { echo "GATE FAIL execute requires $m newer than the freeze" | tee -a "$LOG" >&2; exit 2; }
      done
    fi
    args=(); mapfile -d '' args < <(frozen_vars)
    txn_body "$commit" "$neg" | run_sql "${args[@]}"
    st=$?
    if [ "$phase" = negative ]; then
      if [ "$st" -ne 0 ] && grep -q 'GATE FAIL G3 count' "$LOG"; then
        st=0
      else
        echo "GATE FAIL negative control did not fail with G3 count (psql exit $st)" >> "$LOG"; st=1
      fi
    fi
    if [ "$phase" = execute ]; then
      marker=0; grep -q '^GATE COMMITTED$' "$LOG" && marker=1
      classify; cs=$?
      state="$(cat "$STATE")"
      if [ "$st" -eq 0 ] && [ "$marker" -eq 1 ] && [ "$cs" -eq 0 ] && [ "$state" = COMMITTED ]; then
        st=0
      else
        echo "GATE FAIL execute outcome: psql exit $st, commit marker $marker, state $state" >> "$LOG"
        st=1
      fi
    elif [ "$st" -eq 0 ]; then
      unchanged_since_freeze; st=$?
      [ "$st" -eq 0 ] && touch "$OUT/$phase.ok"
    fi ;;

  classify)
    need_frozen
    classify; st=$? ;;

  post)
    need_frozen
    { echo 'BEGIN;'; body post
      echo 'SELECT pg_temp.gate_preflight_post();'
      echo "SELECT pg_temp.gate_post(:'scope', :'snap');"
      echo 'ROLLBACK;'; } | run_sql -v scope="$(cat "$OUT/scope-ids.json")" -v snap="$(cat "$OUT/snapshot.txt")"
    st=$? ;;

  *) echo "GATE FAIL unknown phase: $phase" >&2; exit 2 ;;
esac

if [ "$st" -eq 0 ]; then
  echo "PASS $app $phase (log: $LOG)"
else
  echo "STOP $app $phase — exit $st — see $LOG" >&2
  grep -m1 'GATE FAIL' "$LOG" >&2 || tail -n 5 "$LOG" >&2
  [ -f "$OUT/state.txt" ] && [ "$phase" = execute ] && echo "commit state: $(cat "$OUT/state.txt")" >&2
fi
exit "$st"
