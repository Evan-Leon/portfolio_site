#!/usr/bin/env bash
# mind-palace-gate.sh — fail-closed removal of the showcase demo Route from mind-palace's Neo4j. Rev 2.
#
#   mind-palace-gate.sh preflight   G1 target + exact counts/shape/degree checks (read-only session)
#   mind-palace-gate.sh freeze      preflight + export the route, entity degrees, a survivor hash and the route's
#                                   property fingerprint (never overwrites)
#   mind-palace-gate.sh rehearse    conditional delete inside :begin … :rollback, then prove nothing changed
#   mind-palace-gate.sh negative    rehearse with one entity name wrong; passes only if it deletes nothing
#   mind-palace-gate.sh execute     the conditional delete, auto-committed (needs rehearse.ok + negative.ok newer than the
#                                   freeze); it matches only when every route/step property still equals the freeze
#   mind-palace-gate.sh classify    read-only: PRE-STATE (route present) or COMMITTED (route gone) — state.txt
#   mind-palace-gate.sh post        route gone, HAS_STEP 1, Route 1, Entity 228, 4 degrees each -1, survivor hash unchanged
#
# Only the Route node and its own 4 HAS_STEP relationships are ever deleted. Entity nodes are never deleted.
# Exit 0 = phase passed. Any other exit = STOP under D4.
set -uo pipefail

EVID="${GATE_EVIDENCE_DIR:-/home/evan/showcase-pending/_teardown-evidence}"
OUT="$EVID/mind-palace"
C=mind-palace-neo4j-1
PROJ=mind-palace
NEO_PASS="${NEO4J_PASSWORD:-localdev}"   # the local dev password from mind-palace/docker-compose.yml
TIMEOUT="${GATE_TIMEOUT:-300}"
ROUTE=60c383d5-921e-443c-9430-b2242469fbe0
ROUTE_NAME='Collective Security'
phase="${1:?usage: mind-palace-gate.sh <phase>}"

got="$(timeout --foreground -k 10 30 docker inspect -f '{{.State.Running}} {{index .Config.Labels "com.docker.compose.project"}}' "$C" 2>/dev/null)"
[ "$got" = "true $PROJ" ] || { echo "GATE FAIL G1 target: container $C reports '$got', expected 'true $PROJ'" >&2; exit 2; }

mkdir -p "$OUT" && chmod 700 "$EVID" "$OUT"
if [ "${GATE_REVIEW:-0}" = 1 ]; then
  # Reviewer mode: read-only phases only; logs and classified state go to review/, never over the originals.
  case "$phase" in preflight|dry|classify|post) ;; *) echo "GATE FAIL review mode allows only preflight, dry, classify, post" >&2; exit 2 ;; esac
  STAMP="$(date -u +%Y%m%dT%H%M%S%NZ)"
  mkdir -p "$OUT/review" && chmod 700 "$OUT/review"
  LOG="$OUT/review/$phase-$STAMP.log"; STATE="$OUT/review/state-$STAMP.txt"
else
  LOG="$OUT/$phase.log"; STATE="$OUT/state.txt"
fi
echo "target: container=$C project=$PROJ route=$ROUTE" > "$LOG"

cy_read()  { timeout --foreground -k 10 "$TIMEOUT" docker exec -i "$C" cypher-shell -u neo4j -p "$NEO_PASS" --format plain --access-mode read; }
cy_write() { timeout --foreground -k 10 "$TIMEOUT" docker exec -i "$C" cypher-shell -u neo4j -p "$NEO_PASS" --format plain --access-mode write; }
fail() { echo "GATE FAIL $*" | tee -a "$LOG" >&2; echo "STOP mind-palace $phase — see $LOG" >&2; exit 1; }

value() {  # value <cypher returning exactly one column, one row>  -> prints the value
  local v
  v="$(printf '%s\n' "$1" | cy_read 2>>"$LOG" | tail -n +2)" || return 1
  [ "$(printf '%s\n' "$v" | wc -l)" -eq 1 ] || return 1
  printf '%s' "$v"
}

expect() {  # expect <label> <cypher> <expected value>
  local v
  v="$(value "$2")" || fail "G3 query failed: $1"
  echo "$1 = $v" >> "$LOG"
  [ "$v" = "$3" ] || fail "G3 $1: got $v, expected $3"
}

degrees() {
  printf '%s\n' "MATCH (:Route {id: '$ROUTE'})-[:HAS_STEP]->(e:Entity) RETURN e.name AS name, count{ (e)--() } AS degree ORDER BY name;" \
    | cy_read 2>>"$LOG"
}

survivor_hash() {
  { printf '%s\n' "MATCH (n) WHERE NOT (n:Route AND n.id = '$ROUTE') RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS props ORDER BY id;" | cy_read;
    printf '%s\n' "MATCH (a)-[x]->(b) WHERE NOT (a:Route AND a.id = '$ROUTE') RETURN elementId(x) AS id, type(x) AS type, elementId(a) AS from, elementId(b) AS to, properties(x) AS props ORDER BY id;" | cy_read;
  } 2>>"$LOG" | sha256sum | cut -d' ' -f1
}

# The route's canonical property fingerprint: every route property and every outbound relationship's type,
# target name and properties, keys sorted. Its printed value is a Cypher string literal (verified round-trip).
# Every key, value type and value is length-prefixed (valueType() distinguishes 1 from "1"), so no two different
# property sets can print the same fingerprint. This one string is both what G7 inspects and what the delete
# compares ($frozen_fp), so the reviewed content and the compared content cannot diverge.
FP_BODY="CALL (r) { UNWIND keys(r) AS k WITH k ORDER BY k RETURN reduce(s = '', p IN collect(toString(size(k)) + ':' + k + '|' + valueType(r[k]) + '|' + toString(size(toString(r[k]))) + ':' + toString(r[k]) + ';') | s + p) AS rf }
CALL (r) { MATCH (r)-[x]->(e) WITH x, e ORDER BY e.name, type(x)
  CALL (x) { UNWIND keys(x) AS k WITH k ORDER BY k RETURN reduce(s = '', p IN collect(toString(size(k)) + ':' + k + '|' + valueType(x[k]) + '|' + toString(size(toString(x[k]))) + ':' + toString(x[k]) + ';') | s + p) AS xf }
  RETURN reduce(s = '', p IN collect('REL ' + toString(size(type(x))) + ':' + type(x) + ' TO ' + toString(size(coalesce(e.name, ''))) + ':' + coalesce(e.name, '') + ' {' + toString(size(xf)) + ':' + xf + '}') | s + p + ' ') AS relf }"
FP_EXPR="'ROUTE {' + toString(size(rf)) + ':' + rf + '} ' + relf"
FP_MATCH="MATCH (r:Route {id: '$ROUTE'})
$FP_BODY"

fingerprint() {
  printf '%s\n' "$FP_MATCH
RETURN $FP_EXPR AS fp;" | cy_read 2>>"$LOG" | tail -n +2
}

delete_stmt() {  # $1 = the fourth entity name ("World War I" for real, anything else for the negative control)
  # Built with printf, never a heredoc: the frozen literal may contain characters a shell would expand.
  # The frozen fingerprint is bound as a Cypher parameter; cypher-shell printed it as a Cypher string literal at
  # freeze (round-trip verified), and :param evaluates that literal client-side.
  printf '%s\n' \
    ":param frozen_fp => $(cat "$OUT/fingerprint.txt")" \
    "MATCH (r:Route {id: '$ROUTE'})" \
    "WHERE r.name = '$ROUTE_NAME'" \
    "  AND count{ (r)<--() } = 0" \
    "  AND count{ (r)-->() } = 4" \
    "  AND count{ (r)-[:HAS_STEP]->(:Entity) } = 4" \
    "  AND all(n IN ['United Nations', 'World War II', 'League of Nations', '$1'] WHERE exists{ (r)-[:HAS_STEP]->(:Entity {name: n}) })" \
    "WITH r" \
    "$FP_BODY" \
    "WITH r, $FP_EXPR AS fp" \
    "WHERE fp = \$frozen_fp" \
    "WITH r, count{ (r)-->() } AS steps" \
    "DETACH DELETE r" \
    "RETURN steps AS deleted_steps;"
}

preflight() {
  expect "Route count"                "MATCH (r:Route) RETURN count(r);" 2
  expect "Entity count"               "MATCH (e:Entity) RETURN count(e);" 228
  expect "HAS_STEP count"             "MATCH ()-[h:HAS_STEP]->() RETURN count(h);" 5
  expect "demo route name"            "MATCH (r:Route {id: '$ROUTE'}) RETURN r.name;" "\"$ROUTE_NAME\""
  expect "demo route inbound rels"    "MATCH (r:Route {id: '$ROUTE'}) RETURN count{ (r)<--() };" 0
  expect "demo route outbound rels"   "MATCH (r:Route {id: '$ROUTE'}) RETURN count{ (r)-->() };" 4
  expect "demo route HAS_STEP->Entity" "MATCH (r:Route {id: '$ROUTE'}) RETURN count{ (r)-[:HAS_STEP]->(:Entity) };" 4
  expect "other route rels"           "MATCH (o:Route) WHERE o.id <> '$ROUTE' RETURN count{ (o)--() };" 1
  local d; d="$(degrees)" || fail "G3 degree query failed"
  echo "$d" >> "$LOG"
  local want=$'name, degree\n"League of Nations", 3\n"United Nations", 2\n"World War I", 9\n"World War II", 14'
  [ "$d" = "$want" ] || fail "G3 linked entity degrees differ from the manifest"
}

need_frozen() {
  for f in scope.txt degrees.txt snapshot.txt fingerprint.txt; do
    [ -s "$OUT/$f" ] || fail "frozen evidence missing: $OUT/$f (run freeze first)"
  done
}

unchanged() {  # $1 = label
  preflight
  [ "$(degrees)" = "$(cat "$OUT/degrees.txt")" ] || fail "G6 degrees changed ($1)"
  [ "$(survivor_hash)" = "$(cat "$OUT/snapshot.txt")" ] || fail "G6 survivor hash changed ($1)"
  [ "$(fingerprint)" = "$(cat "$OUT/fingerprint.txt")" ] || fail "G6 scope rows changed: route fingerprint differs ($1)"
}

classify() {
  local n
  n="$(value "MATCH (r:Route {id: '$ROUTE'}) RETURN count(r);")" || { echo UNKNOWN > "$STATE"; return 1; }
  case "$n" in
    1) echo PRE-STATE > "$STATE" ;;
    0) echo COMMITTED > "$STATE" ;;
    *) echo UNKNOWN > "$STATE"; return 1 ;;
  esac
  echo "state: $(cat "$STATE")" | tee -a "$LOG"
}

case "$phase" in
  preflight) preflight ;;

  freeze)
    for f in scope.txt degrees.txt snapshot.txt fingerprint.txt; do
      [ -e "$OUT/$f" ] && fail "freeze refuses to overwrite $OUT/$f"
    done
    preflight
    printf '%s\n' "MATCH (r:Route {id: '$ROUTE'}) OPTIONAL MATCH (r)-[x]->(e) RETURN properties(r) AS route, type(x) AS rel, properties(x) AS rel_props, e.name AS entity ORDER BY entity;" \
      | cy_read > "$OUT/scope.txt" 2>>"$LOG" || fail "freeze export failed"
    degrees > "$OUT/degrees.txt" || fail "freeze degrees failed"
    survivor_hash > "$OUT/snapshot.txt" || fail "freeze hash failed"
    fingerprint > "$OUT/fingerprint.txt" || fail "freeze fingerprint failed"
    [ "$(wc -l < "$OUT/fingerprint.txt")" -eq 1 ] || fail "freeze fingerprint is not one line"
    chmod 600 "$OUT/scope.txt" "$OUT/degrees.txt" "$OUT/snapshot.txt" "$OUT/fingerprint.txt" ;;

  rehearse|negative)
    need_frozen
    name='World War I'; [ "$phase" = negative ] && name='Not A Real Entity'
    out="$({ echo ':begin'; delete_stmt "$name";
             echo "MATCH (r:Route {id: '$ROUTE'}) RETURN count(r) AS remaining_in_tx;"; echo ':rollback'; } \
           | cy_write 2>>"$LOG")" || fail "transaction failed"
    echo "$out" >> "$LOG"
    if [ "$phase" = rehearse ]; then
      [ "$out" = $'deleted_steps\n4\nremaining_in_tx\n0' ] || fail "G9 rehearse: expected 4 steps deleted and 0 remaining inside the transaction"
    else
      [ "$out" = $'remaining_in_tx\n1' ] || fail "G9 negative control: the wrong-name delete must match nothing"
    fi
    unchanged "after rollback"
    touch "$OUT/$phase.ok" ;;

  execute)
    need_frozen
    [ -f "$OUT/state.txt" ] && [ "$(cat "$OUT/state.txt")" = COMMITTED ] && fail "execute refused: already classified COMMITTED"
    for m in rehearse.ok negative.ok; do
      [ "$OUT/$m" -nt "$OUT/snapshot.txt" ] || fail "execute requires $m newer than the freeze"
    done
    unchanged "before delete"
    out="$(delete_stmt 'World War I' | cy_write 2>>"$LOG")"; s=$?
    echo "$out (exit $s)" >> "$LOG"
    classify || fail "execute: commit state could not be classified"
    state="$(cat "$STATE")"
    if [ "$s" -ne 0 ] || [ "$out" != $'deleted_steps\n4' ] || [ "$state" != COMMITTED ]; then
      fail "G9 execute outcome: exit $s, output '$out', state $state (PRE-STATE means nothing was deleted)"
    fi ;;

  dry)   # read-only: the exact assembled delete statement with its DETACH DELETE line removed
    need_frozen
    for name in 'World War I' 'Not A Real Entity'; do
      out="$(delete_stmt "$name" | sed 's/^DETACH DELETE r$//' | cy_read 2>>"$LOG")" || fail "dry statement failed ($name)"
      echo "dry [$name]: $out" >> "$LOG"
      if [ "$name" = 'World War I' ]; then
        [ "$out" = $'deleted_steps\n4' ] || fail "G9 dry: the real statement does not match the frozen route"
      else
        [ -z "$out" ] || fail "G9 dry: the wrong-name statement matched"
      fi
    done ;;

  classify) need_frozen; classify || fail "classify failed" ;;

  post)
    need_frozen
    expect "Route count"    "MATCH (r:Route) RETURN count(r);" 1
    expect "Entity count"   "MATCH (e:Entity) RETURN count(e);" 228
    expect "HAS_STEP count" "MATCH ()-[h:HAS_STEP]->() RETURN count(h);" 1
    expect "demo route gone" "MATCH (r:Route {id: '$ROUTE'}) RETURN count(r);" 0
    expect "routes named Collective Security" "MATCH (r:Route) WHERE r.name = '$ROUTE_NAME' RETURN count(r);" 0
    for pair in "League of Nations:2" "United Nations:1" "World War I:8" "World War II:13"; do
      expect "degree ${pair%%:*}" "MATCH (e:Entity {name: '${pair%%:*}'}) RETURN count{ (e)--() };" "${pair##*:}"
    done
    [ "$(survivor_hash)" = "$(cat "$OUT/snapshot.txt")" ] || fail "G10 survivor hash changed" ;;

  *) echo "GATE FAIL unknown phase: $phase" >&2; exit 2 ;;
esac

echo "PASS mind-palace $phase (log: $LOG)"
