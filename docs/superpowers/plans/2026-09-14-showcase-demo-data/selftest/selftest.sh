#!/usr/bin/env bash
# selftest.sh — proves every gate check fails with its specific diagnostic on a planted defect, and that the happy
# path deletes exactly the demo rows. Uses ONLY database showcase_gate_selftest, which it creates and drops.
# Each diagnostic is matched against the output and the log of the invocation that just ran, never older logs.
# Exit 0 only if every case behaves as expected.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$HERE/../gate-run.sh"
DBN=showcase_gate_selftest
WORK="$(mktemp -d)"
fails=0

pg()   { docker exec -i infra-postgres-1 psql -U postgres -X -q -At -v ON_ERROR_STOP=1 "$@"; }
sql()  { pg -d "$DBN" -c "$1"; }
NOOP_FN="CREATE FUNCTION noop_trg() RETURNS trigger LANGUAGE plpgsql AS \$\$ BEGIN RETURN OLD; END \$\$"
reset_db() {
  pg -d "$DBN" < "$HERE/schema.sql" > /dev/null
  sql "$NOOP_FN; CREATE TRIGGER child_noop BEFORE DELETE ON child FOR EACH ROW EXECUTE FUNCTION noop_trg()" > /dev/null
  sql "CREATE TABLE audit_note (id int PRIMARY KEY, note text NOT NULL)" > /dev/null   # non-FK table read only by gate_extra
}

if [ "$(pg -d postgres -c "SELECT count(*) FROM pg_database WHERE datname = '$DBN'")" != 0 ]; then
  echo "selftest: database $DBN already exists — refusing to touch it" >&2; exit 2
fi
pg -d postgres -c "CREATE DATABASE $DBN" || exit 2
trap 'pg -d postgres -c "DROP DATABASE IF EXISTS $DBN" >/dev/null 2>&1; rm -rf "$WORK"' EXIT

# check <name> pass|stop <pattern> <app> <phase>   — pattern: required in THIS invocation's output/log
check() {
  local name="$1" expect="$2" pattern="$3" app="$4" phase="$5"
  local out st log
  out="$("$GATE" "$app" "$phase" 2>&1)"; st=$?
  log="$(cat "$GATE_EVIDENCE_DIR/$app/$phase.log" 2>/dev/null)"
  if [ "$expect" = pass ] && [ $st -eq 0 ] && { [ -z "$pattern" ] || printf '%s\n%s' "$out" "$log" | grep -qF "$pattern"; }; then
    echo "ok   $name${pattern:+  ($pattern)}"
  elif [ "$expect" = stop ] && [ $st -ne 0 ] && printf '%s\n%s' "$out" "$log" | grep -qF "$pattern"; then
    echo "ok   $name  ($pattern)"
  else
    echo "FAIL $name: expected $expect${pattern:+ with '$pattern'}, got exit $st"; printf '%s\n' "$out" | tail -n 5
    fails=$((fails + 1))
  fi
}
fresh() { reset_db; export GATE_EVIDENCE_DIR="$WORK/$1"; mkdir -p "$GATE_EVIDENCE_DIR"; }
state() { cat "$GATE_EVIDENCE_DIR/selftest/state.txt" 2>/dev/null; }

fresh c01; check "preflight passes on a clean fixture"            pass "" selftest preflight
fresh c02; check "G1 wrong compose project"                        stop "GATE FAIL G1 target" selftest-badtarget preflight
fresh c03; check "G1 wrong database"                               stop "GATE FAIL G1 anchor" selftest-wrongdb preflight
fresh c04; sql "INSERT INTO watcher VALUES (1001, 20)" >/dev/null
           check "G4 outside row references a demo row"           stop "GATE FAIL G4 inbound" selftest preflight
fresh c05; sql "CREATE TABLE sneaky (id int PRIMARY KEY, owner_id int REFERENCES owner_t(id))" >/dev/null
           check "G2 unlisted FK into the scope"                   stop "GATE FAIL G2 unlisted FK" selftest preflight
fresh c06; sql "ALTER TABLE item ADD COLUMN fp int REFERENCES forbidden_parent(id); UPDATE item SET fp = 5 WHERE id = 20" >/dev/null
           check "G5 demo row points at a non-allowlisted parent" stop "GATE FAIL G5 outbound" selftest preflight
fresh c07; sql "UPDATE child SET item_id = 10 WHERE id = 201" >/dev/null
           check "G5 demo row points at a real row of a scope table" stop "GATE FAIL G5 cross-scope" selftest preflight
fresh c08; sql "UPDATE item SET note = 'real' WHERE id = 21" >/dev/null
           check "G3 extra check"                                  stop "GATE FAIL G3 extra check" selftest preflight
fresh c09; sql "INSERT INTO item VALUES (22, 2, 1, 'demo')" >/dev/null
           check "G3 count differs from manifest"                  stop "GATE FAIL G3 count" selftest preflight
fresh c15; sql "CREATE FUNCTION touch_parent() RETURNS trigger LANGUAGE plpgsql AS \$\$ BEGIN UPDATE shared_parent SET label = label || '!'; RETURN OLD; END \$\$; CREATE TRIGGER child_touch BEFORE DELETE ON child FOR EACH ROW EXECUTE FUNCTION touch_parent()" >/dev/null
           check "G2 unlisted DELETE trigger"                      stop "GATE FAIL G2 unlisted trigger" selftest preflight
fresh c16; sql "CREATE RULE item_noop AS ON DELETE TO item DO ALSO NOTHING" >/dev/null
           check "G2 rewrite rule on a scope table"                stop "GATE FAIL G2 rewrite rule" selftest preflight
fresh c18; sql "ALTER TABLE watcher DROP CONSTRAINT watcher_item_id_fkey, ADD CONSTRAINT watcher_item_id_fkey FOREIGN KEY (item_id) REFERENCES item(id) ON DELETE CASCADE" >/dev/null
           check "G2 FK delete rule changed"                       stop "GATE FAIL G2 FK delete rule" selftest preflight
fresh c19; sql "CREATE OR REPLACE FUNCTION noop_trg() RETURNS trigger LANGUAGE plpgsql AS \$\$ BEGIN UPDATE shared_parent SET label = 'x'; RETURN OLD; END \$\$" >/dev/null
           check "G2 allowlisted trigger's function changed"       stop "GATE FAIL G2 trigger definition changed" selftest preflight
fresh c10; check "freeze"                                           pass "" selftest freeze
           check "freeze refuses to overwrite"                     stop "refuses to overwrite" selftest freeze
           check "execute refuses without rehearse/negative"       stop "requires rehearse.ok" selftest execute
           check "classify before any delete"                      pass "GATE STATE PRE-STATE" selftest classify
           check "rehearse rolls back cleanly"                     pass "GATE ROLLED BACK" selftest rehearse
           [ "$(sql "SELECT count(*) FROM item WHERE owner_id = 2")" = 2 ] && echo "ok   rehearse left demo rows in place" \
             || { echo "FAIL rehearse changed data"; fails=$((fails + 1)); }
           check "negative control fails as designed"              pass "" selftest negative
           check "refreeze supersedes the freeze"                  pass "" selftest refreeze
           ls -d "$GATE_EVIDENCE_DIR"/selftest/superseded-* >/dev/null 2>&1 && [ ! -e "$GATE_EVIDENCE_DIR/selftest/rehearse.ok" ] \
             && echo "ok   refreeze moved the old freeze and markers aside" || { echo "FAIL refreeze bookkeeping"; fails=$((fails + 1)); }
fresh c11; check "freeze (survivor drift case)"                     pass "" selftest freeze
           sql "UPDATE shared_parent SET label = 'changed' WHERE id = 2" >/dev/null
           check "G6 survivor changed since freeze"                stop "GATE FAIL G6 survivors" selftest rehearse
fresh c17; check "freeze (scope-row drift case)"                    pass "" selftest freeze
           sql "UPDATE item SET parent_id = 2 WHERE id = 20" >/dev/null
           check "G6 scope row content changed since freeze"       stop "GATE FAIL G6 scope rows changed" selftest rehearse
fresh c12; check "freeze (digest case)"                             pass "" selftest freeze
           chmod 600 "$GATE_EVIDENCE_DIR/selftest/digest.txt"; echo "0000" > "$GATE_EVIDENCE_DIR/selftest/digest.txt"
           check "G9 scope digest mismatch"                        stop "GATE FAIL G9 scope digest" selftest rehearse
fresh c13; check "freeze (flip case)"                               pass "" selftest-flip freeze
           check "G9 cascade removed rows before their delete"     stop "GATE FAIL G9 delete" selftest-flip rehearse
fresh c21; check "freeze (mixed-state case)"                        pass "" selftest freeze
           sql "DELETE FROM child WHERE id = 201" >/dev/null
           check "classify detects a partial delete"               pass "GATE STATE MIXED" selftest classify
fresh c14; check "happy path: freeze"                               pass "" selftest freeze
           check "happy path: rehearse"                            pass "" selftest rehearse
           check "happy path: negative"                            pass "" selftest negative
           check "happy path: execute"                             pass "state: COMMITTED" selftest execute
           [ "$(state)" = COMMITTED ] && echo "ok   execute recorded state COMMITTED" || { echo "FAIL state was '$(state)'"; fails=$((fails + 1)); }
           check "happy path: post"                                pass "GATE POST OK" selftest post
           check "execute refuses a second run"                    stop "already classified COMMITTED" selftest execute
           check "refreeze refused after commit"                   stop "refreeze refused" selftest refreeze
           got="$(sql "SELECT (SELECT count(*) FROM owner_t WHERE id=2)||','||(SELECT count(*) FROM item WHERE owner_id=2)||','||(SELECT count(*) FROM child WHERE note='demo')||'|'||(SELECT string_agg(id::text, ',' ORDER BY id) FROM owner_t)||'|'||(SELECT string_agg(id::text, ',' ORDER BY id) FROM item)||'|'||(SELECT string_agg(id::text, ',' ORDER BY id) FROM child)||'|'||(SELECT item_id FROM watcher WHERE id=1000)||'|'||(SELECT count(*) FROM shared_parent)")"
           [ "$got" = "0,0,0|1|10|100|10|2" ] && echo "ok   only demo rows deleted ($got)" \
             || { echo "FAIL post-state was $got"; fails=$((fails + 1)); }
           sql "UPDATE shared_parent SET label = 'tampered' WHERE id = 1" >/dev/null
           check "G10 post detects survivor change"                stop "GATE FAIL G10 survivors" selftest post
fresh c20; check "freeze (post residue case)"                       pass "" selftest freeze
           check "rehearse (post residue case)"                    pass "" selftest rehearse
           check "negative (post residue case)"                    pass "" selftest negative
           check "execute (post residue case)"                     pass "" selftest execute
           sql "INSERT INTO child VALUES (300, 10, 'demo')" >/dev/null
           check "G10 post re-resolves the scope and finds new demo" stop "GATE FAIL G10 scope not empty" selftest post

fresh c24; sql "ALTER TABLE child DISABLE TRIGGER child_noop" >/dev/null
           check "G2 allowlisted trigger disabled"                 stop "GATE FAIL G2 trigger state changed" selftest preflight
fresh c25; sql "DROP TRIGGER child_noop ON child; CREATE TRIGGER child_noop BEFORE UPDATE ON child FOR EACH ROW EXECUTE FUNCTION noop_trg()" >/dev/null
           check "G2 allowlisted trigger re-pointed at another event" stop "GATE FAIL G2 trigger event mask changed" selftest preflight
fresh c26; check "freeze (post-only extra case)"                    pass "" selftest freeze
           check "rehearse (post-only extra case)"                 pass "" selftest rehearse
           check "negative (post-only extra case)"                 pass "" selftest negative
           check "execute (post-only extra case)"                  pass "" selftest execute
           sql "INSERT INTO audit_note VALUES (1, 'left over from demo@example.com')" >/dev/null
           check "G10 post catches a non-FK residue via its extra check" stop "GATE FAIL G10 extra check" selftest post
fresh c27; check "freeze (lost commit marker case)"                 pass "" selftest freeze
           check "rehearse (lost commit marker case)"              pass "" selftest rehearse
           check "negative (lost commit marker case)"              pass "" selftest negative
           export GATE_TEST_DROP_MARKER=1
           check "execute with a lost COMMIT marker is not a pass" stop "commit marker 0, state COMMITTED" selftest execute
           unset GATE_TEST_DROP_MARKER
           [ "$(state)" = COMMITTED ] && echo "ok   lost-marker execute still classified COMMITTED" \
             || { echo "FAIL lost-marker state was '$(state)'"; fails=$((fails + 1)); }
           check "post verifies the committed delete after a lost marker" pass "GATE POST OK" selftest post
fresh c28; check "freeze (review mode case)"                        pass "" selftest freeze
           # Top-level evidence FILES (name|size|mtime); the review/ directory is not a file, so it cannot affect this.
           listing() { find "$GATE_EVIDENCE_DIR/selftest" -maxdepth 1 -type f -printf '%f|%s|%T@\n' | sort; }
           before="$(listing)"
           GATE_REVIEW=1 "$GATE" selftest classify > /dev/null 2>&1; rc1=$?
           GATE_REVIEW=1 "$GATE" selftest rehearse > /dev/null 2>&1; rc2=$?
           after="$(listing)"
           if [ $rc1 -eq 0 ] && [ $rc2 -ne 0 ] && [ "$before" = "$after" ] \
              && [ ! -e "$GATE_EVIDENCE_DIR/selftest/state.txt" ] && ls "$GATE_EVIDENCE_DIR"/selftest/review/state-*.txt >/dev/null 2>&1; then
             echo "ok   review mode writes only under review/ and refuses write phases"
           else
             echo "FAIL review mode (classify rc $rc1, rehearse rc $rc2)"; fails=$((fails + 1))
             diff <(printf '%s\n' "$before") <(printf '%s\n' "$after") | sed 's/^/     /'
           fi

echo "selftest: $fails failure(s)"
[ "$fails" -eq 0 ]
