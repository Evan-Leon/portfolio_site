#!/usr/bin/env bash
# gate-run.sh — run the fail-closed demo-data gate for ONE Postgres app, one phase at a time.
#
#   gate-run.sh <app> preflight   checks G1-G5 inside a transaction that is always rolled back
#   gate-run.sh <app> freeze      preflight + write scope.json, scope-ids.json, snapshot.txt, digest.txt (never overwrites)
#   gate-run.sh <app> rehearse    full delete inside a transaction that is ROLLED BACK, then proves nothing changed
#   gate-run.sh <app> negative    rehearse with one expected count off by one; passes only if it fails with "GATE FAIL G3 count"
#   gate-run.sh <app> execute     full delete and COMMIT (requires rehearse.ok and negative.ok newer than the freeze)
#   gate-run.sh <app> post        G10: frozen ids are gone and survivors match the frozen snapshot
#
# Exit 0 = phase passed. Any other exit = STOP under D4: report the log; delete nothing further for this app.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVID="${GATE_EVIDENCE_DIR:-/home/evan/showcase-pending/_teardown-evidence}"
app="${1:?usage: gate-run.sh <app> <phase>}"
phase="${2:?usage: gate-run.sh <app> <phase>}"

DECL="$HERE/apps/$app.sql"
case "$app" in
  leonsbudget)        C=infra-postgres-1;        PROJ=infra;       DB=leons_budget ;;
  the-classic)        C=supabase_db_the-classic; PROJ=the-classic; DB=postgres ;;
  chudios)            C=infra-postgres-1;        PROJ=infra;       DB=chudios ;;
  co-host)            C=infra-postgres-1;        PROJ=infra;       DB=co_host ;;
  co-author)          C=infra-postgres-1;        PROJ=infra;       DB=co_author ;;
  selftest)           C=infra-postgres-1;        PROJ=infra;       DB=showcase_gate_selftest ;;
  selftest-flip)      C=infra-postgres-1;        PROJ=infra;       DB=showcase_gate_selftest ;;
  selftest-badtarget) C=infra-postgres-1;        PROJ=not-infra;   DB=showcase_gate_selftest; DECL="$HERE/apps/selftest.sql" ;;
  selftest-wrongdb)   C=infra-postgres-1;        PROJ=infra;       DB=postgres;               DECL="$HERE/apps/selftest.sql" ;;
  *) echo "GATE FAIL G1 unknown app: $app" >&2; exit 2 ;;
esac
[ -f "$DECL" ] || { echo "GATE FAIL G1 missing declaration: $DECL" >&2; exit 2; }

# G1 (container half): the exact container must be running under the expected compose project.
got="$(docker inspect -f '{{.State.Running}} {{index .Config.Labels "com.docker.compose.project"}}' "$C" 2>/dev/null)"
if [ "$got" != "true $PROJ" ]; then
  echo "GATE FAIL G1 target: container $C reports '$got', expected 'true $PROJ'" >&2
  exit 2
fi

OUT="$EVID/$app"
mkdir -p "$OUT" && chmod 700 "$EVID" "$OUT"
LOG="$OUT/$phase.log"
echo "target: container=$C project=$PROJ database=$DB declaration=$DECL" > "$LOG"

psql_run() { docker exec -i "$C" psql -U postgres -d "$DB" -X -q -At -v ON_ERROR_STOP=1 "$@"; }
run_sql()  { psql_run "$@" >> "$LOG" 2>&1; }

# co-host wrote through CHUD's API: its ids must appear nowhere in CHUD before anything runs (non-FK check).
if [ "$app" = co-host ]; then
  ids='ch_b11b31a0d9ae|ep_a78a3f018922|ep_df1c614c159e|job_fba52731d285'
  res="$(docker exec infra-postgres-1 psql -U postgres -d chud -X -q -At -v ON_ERROR_STOP=1 -c \
    "SELECT (SELECT count(*) FROM artifacts t WHERE row_to_json(t)::text ~ '$ids')
          + (SELECT count(*) FROM cohost_documents t WHERE row_to_json(t)::text ~ '$ids')
          + (SELECT count(*) FROM cohost_mirror_gaps t WHERE row_to_json(t)::text ~ '$ids')" 2>&1)"
  echo "chud residue for co-host demo ids: $res" >> "$LOG"
  if [ "$res" != 0 ]; then
    echo "GATE FAIL G2 non-FK: chud holds co-host demo ids ($res)" | tee -a "$LOG" >&2
    exit 2
  fi
fi

need_frozen() {
  for f in scope.json scope-ids.json snapshot.txt digest.txt; do
    [ -s "$OUT/$f" ] || { echo "GATE FAIL frozen evidence missing: $OUT/$f (run freeze first)" | tee -a "$LOG" >&2; exit 2; }
  done
}

decl_body() { cat "$HERE/gate.sql" "$DECL"; }

txn_body() {  # $1 = commit flag (0|1), $2 = negative-control increment (0|1)
  echo 'BEGIN;'
  decl_body
  cat <<SQL
UPDATE gate_scope SET expected = expected + $2
 WHERE tbl = (SELECT tbl FROM gate_scope ORDER BY del_order LIMIT 1);
SELECT pg_temp.gate_preflight();
SELECT pg_temp.gate_assert_digest(:'digest');
SELECT pg_temp.gate_assert_snapshot(:'snap', 'before delete');
SELECT pg_temp.gate_delete();
SELECT pg_temp.gate_assert_snapshot(:'snap', 'after delete');
\if $1
COMMIT;
SELECT 'GATE COMMITTED';
\else
ROLLBACK;
SELECT 'GATE ROLLED BACK';
\endif
SQL
}

case "$phase" in
  preflight)
    { echo 'BEGIN;'; decl_body; echo 'SELECT pg_temp.gate_preflight();'; echo 'ROLLBACK;'; } | run_sql
    st=$? ;;

  freeze)
    for f in scope.json scope-ids.json snapshot.txt digest.txt; do
      [ -e "$OUT/$f" ] && { echo "GATE FAIL freeze refuses to overwrite $OUT/$f" | tee -a "$LOG" >&2; exit 2; }
    done
    st=0
    for pair in "gate_export()::text=scope.json" "gate_scope_ids()::text=scope-ids.json" \
                "gate_snapshot()::text=snapshot.txt" "gate_scope_digest()=digest.txt"; do
      fn="${pair%%=*}"; file="${pair##*=}"
      { echo 'BEGIN;'; decl_body; echo 'SELECT pg_temp.gate_preflight();'; echo "SELECT pg_temp.$fn;"; echo 'ROLLBACK;'; } \
        | psql_run > "$OUT/$file.tmp" 2>> "$LOG"
      s=$?
      if [ "$s" -ne 0 ] || [ "$(head -n1 "$OUT/$file.tmp")" != "GATE PREFLIGHT OK" ]; then
        cat "$OUT/$file.tmp" >> "$LOG"; rm -f "$OUT/$file.tmp"
        st=1; [ "$s" -ne 0 ] && st=$s
        break
      fi
      tail -n +2 "$OUT/$file.tmp" > "$OUT/$file"; rm -f "$OUT/$file.tmp"
      if [ "$(wc -l < "$OUT/$file")" -ne 1 ]; then
        echo "GATE FAIL freeze: $file is not exactly one line" >> "$LOG"; st=1; break
      fi
    done
    if [ "$st" -eq 0 ]; then
      chmod 600 "$OUT/scope.json" "$OUT/scope-ids.json" "$OUT/snapshot.txt" "$OUT/digest.txt"
    else
      rm -f "$OUT/scope.json" "$OUT/scope-ids.json" "$OUT/snapshot.txt" "$OUT/digest.txt"
    fi ;;

  rehearse|negative|execute)
    need_frozen
    commit=0; neg=0
    [ "$phase" = negative ] && neg=1
    if [ "$phase" = execute ]; then
      commit=1
      for m in rehearse.ok negative.ok; do
        [ "$OUT/$m" -nt "$OUT/digest.txt" ] || { echo "GATE FAIL execute requires $m newer than the freeze" | tee -a "$LOG" >&2; exit 2; }
      done
    fi
    txn_body "$commit" "$neg" | run_sql -v snap="$(cat "$OUT/snapshot.txt")" -v digest="$(cat "$OUT/digest.txt")"
    st=$?
    if [ "$phase" = negative ]; then
      if [ "$st" -ne 0 ] && grep -q 'GATE FAIL G3 count' "$LOG"; then
        st=0
      else
        echo "GATE FAIL negative control did not fail with G3 count (psql exit $st)" >> "$LOG"; st=1
      fi
    fi
    if [ "$st" -eq 0 ] && [ "$phase" != execute ]; then
      { echo 'BEGIN;'; decl_body;
        echo 'SELECT pg_temp.gate_preflight();'
        echo "SELECT pg_temp.gate_assert_digest(:'digest');"
        echo "SELECT pg_temp.gate_assert_snapshot(:'snap', 'after rollback');"
        echo 'ROLLBACK;'; } | run_sql -v snap="$(cat "$OUT/snapshot.txt")" -v digest="$(cat "$OUT/digest.txt")"
      st=$?
    fi
    if [ "$st" -eq 0 ] && [ "$phase" = execute ] && ! grep -q '^GATE COMMITTED$' "$LOG"; then
      echo "GATE FAIL execute: no COMMIT marker" >> "$LOG"; st=1
    fi
    if [ "$st" -eq 0 ] && [ "$phase" != execute ]; then touch "$OUT/$phase.ok"; fi ;;

  post)
    need_frozen
    { echo 'BEGIN;'; cat "$HERE/gate.sql"; echo "SELECT pg_temp.gate_post(:'scope', :'snap');"; echo 'ROLLBACK;'; } \
      | run_sql -v scope="$(cat "$OUT/scope-ids.json")" -v snap="$(cat "$OUT/snapshot.txt")"
    st=$? ;;

  *) echo "GATE FAIL unknown phase: $phase" >&2; exit 2 ;;
esac

if [ "$st" -eq 0 ]; then
  echo "PASS $app $phase (log: $LOG)"
else
  echo "STOP $app $phase — exit $st — see $LOG" >&2
  grep -m1 'GATE FAIL' "$LOG" >&2 || tail -n 5 "$LOG" >&2
fi
exit "$st"
