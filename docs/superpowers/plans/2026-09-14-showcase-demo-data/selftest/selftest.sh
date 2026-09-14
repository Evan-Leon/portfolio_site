#!/usr/bin/env bash
# selftest.sh — proves every gate check fails with its specific diagnostic on a planted defect,
# and that the happy path deletes exactly the demo rows. Uses ONLY database showcase_gate_selftest,
# which it creates and drops. Exit 0 only if every case behaves as expected.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$HERE/../gate-run.sh"
DBN=showcase_gate_selftest
WORK="$(mktemp -d)"
fails=0

pg()   { docker exec -i infra-postgres-1 psql -U postgres -X -q -At -v ON_ERROR_STOP=1 "$@"; }
sql()  { pg -d "$DBN" -c "$1"; }
reset_db() { pg -d "$DBN" < "$HERE/schema.sql" > /dev/null; }

if [ "$(pg -d postgres -c "SELECT count(*) FROM pg_database WHERE datname = '$DBN'")" != 0 ]; then
  echo "selftest: database $DBN already exists — refusing to touch it" >&2; exit 2
fi
pg -d postgres -c "CREATE DATABASE $DBN" || exit 2

# expect: pass | stop ; pattern must appear in combined output when expect=stop
check() {
  local name="$1" expect="$2" pattern="$3"; shift 3
  local out st
  out="$("$@" 2>&1)"; st=$?
  local logs; logs="$(cat "$GATE_EVIDENCE_DIR"/*/*.log 2>/dev/null)"
  if [ "$expect" = pass ] && [ $st -eq 0 ]; then
    echo "ok   $name"
  elif [ "$expect" = stop ] && [ $st -ne 0 ] && printf '%s\n%s' "$out" "$logs" | grep -qF "$pattern"; then
    echo "ok   $name  ($pattern)"
  else
    echo "FAIL $name: expected $expect${pattern:+ with '$pattern'}, got exit $st"; printf '%s\n' "$out" | tail -n 5
    fails=$((fails + 1))
  fi
}
fresh() { reset_db; export GATE_EVIDENCE_DIR="$WORK/$1"; mkdir -p "$GATE_EVIDENCE_DIR"; }

fresh c01; check "preflight passes on a clean fixture"      pass "" "$GATE" selftest preflight
fresh c02; check "G1 wrong compose project"                  stop "GATE FAIL G1 target" "$GATE" selftest-badtarget preflight
fresh c03; check "G1 wrong database"                         stop "GATE FAIL G1 database" "$GATE" selftest-wrongdb preflight
fresh c04; sql "INSERT INTO watcher VALUES (1001, 20)" >/dev/null
           check "G4 outside row references a demo row"     stop "GATE FAIL G4 inbound" "$GATE" selftest preflight
fresh c05; sql "CREATE TABLE sneaky (id int PRIMARY KEY, owner_id int REFERENCES owner_t(id))" >/dev/null
           check "G2 unlisted FK into the scope"             stop "GATE FAIL G2 unlisted FK" "$GATE" selftest preflight
fresh c06; sql "ALTER TABLE item ADD COLUMN fp int REFERENCES forbidden_parent(id); UPDATE item SET fp = 5 WHERE id = 20" >/dev/null
           check "G5 demo row points at a non-allowlisted parent" stop "GATE FAIL G5 outbound" "$GATE" selftest preflight
fresh c07; sql "UPDATE child SET item_id = 10 WHERE id = 201" >/dev/null
           check "G5 demo row points at a real row of a scope table" stop "GATE FAIL G5 cross-scope" "$GATE" selftest preflight
fresh c08; sql "UPDATE item SET note = 'real' WHERE id = 21" >/dev/null
           check "G3 extra check"                            stop "GATE FAIL G3 extra check" "$GATE" selftest preflight
fresh c09; sql "INSERT INTO item VALUES (22, 2, 1, 'demo')" >/dev/null
           check "G3 count differs from manifest"            stop "GATE FAIL G3 count" "$GATE" selftest preflight
fresh c15; sql "CREATE FUNCTION touch_parent() RETURNS trigger LANGUAGE plpgsql AS \$\$ BEGIN UPDATE shared_parent SET label = label || '!'; RETURN OLD; END \$\$; CREATE TRIGGER child_touch BEFORE DELETE ON child FOR EACH ROW EXECUTE FUNCTION touch_parent()" >/dev/null
           check "G2 unlisted DELETE trigger"               stop "GATE FAIL G2 unlisted trigger" "$GATE" selftest preflight
fresh c16; sql "CREATE RULE item_noop AS ON DELETE TO item DO ALSO NOTHING" >/dev/null
           check "G2 rewrite rule on a scope table"         stop "GATE FAIL G2 rewrite rule" "$GATE" selftest preflight
fresh c10; check "freeze"                                     pass "" "$GATE" selftest freeze
           check "freeze refuses to overwrite"               stop "refuses to overwrite" "$GATE" selftest freeze
           check "execute refuses without rehearse/negative" stop "requires rehearse.ok" "$GATE" selftest execute
           check "rehearse rolls back cleanly"               pass "" "$GATE" selftest rehearse
           [ "$(sql "SELECT count(*) FROM item WHERE owner_id = 2")" = 2 ] && echo "ok   rehearse left demo rows in place" \
             || { echo "FAIL rehearse changed data"; fails=$((fails + 1)); }
           check "negative control fails as designed"        pass "" "$GATE" selftest negative
fresh c11; check "freeze (drift case)"                        pass "" "$GATE" selftest freeze
           sql "UPDATE shared_parent SET label = 'changed' WHERE id = 2" >/dev/null
           check "G6 survivor changed since freeze"          stop "GATE FAIL G6 survivors" "$GATE" selftest rehearse
fresh c12; check "freeze (digest case)"                       pass "" "$GATE" selftest freeze
           chmod 600 "$GATE_EVIDENCE_DIR/selftest/digest.txt"; echo "00000000000000000000000000000000" > "$GATE_EVIDENCE_DIR/selftest/digest.txt"
           check "G9 scope digest mismatch"                  stop "GATE FAIL G9 scope digest" "$GATE" selftest rehearse
fresh c13; check "freeze (flip case)"                         pass "" "$GATE" selftest-flip freeze
           check "G9 cascade removed rows before their delete" stop "GATE FAIL G9 delete" "$GATE" selftest-flip rehearse
fresh c14; check "happy path: freeze"                         pass "" "$GATE" selftest freeze
           check "happy path: rehearse"                      pass "" "$GATE" selftest rehearse
           check "happy path: negative"                      pass "" "$GATE" selftest negative
           check "happy path: execute"                       pass "" "$GATE" selftest execute
           check "happy path: post"                          pass "" "$GATE" selftest post
           got="$(sql "SELECT (SELECT count(*) FROM owner_t WHERE id=2)||','||(SELECT count(*) FROM item WHERE owner_id=2)||','||(SELECT count(*) FROM child WHERE note='demo')||'|'||(SELECT string_agg(id::text, ',' ORDER BY id) FROM owner_t)||'|'||(SELECT string_agg(id::text, ',' ORDER BY id) FROM item)||'|'||(SELECT string_agg(id::text, ',' ORDER BY id) FROM child)||'|'||(SELECT item_id FROM watcher WHERE id=1000)||'|'||(SELECT count(*) FROM shared_parent)")"
           [ "$got" = "0,0,0|1|10|100|10|2" ] && echo "ok   only demo rows deleted ($got)" \
             || { echo "FAIL post-state was $got"; fails=$((fails + 1)); }
           sql "UPDATE shared_parent SET label = 'tampered' WHERE id = 1" >/dev/null
           check "G10 post detects survivor change"          stop "GATE FAIL G10 survivors" "$GATE" selftest post

pg -d postgres -c "DROP DATABASE $DBN" >/dev/null && echo "dropped $DBN"
rm -rf "$WORK"
echo "selftest: $fails failure(s)"
[ "$fails" -eq 0 ]
