#!/usr/bin/env bash
# mind-palace-gate.sh — fail-closed removal of the showcase demo Route from mind-palace's Neo4j.
#
#   mind-palace-gate.sh preflight   G1 target + exact counts/shape checks (read-only session)
#   mind-palace-gate.sh freeze      preflight + export the route, entity degrees and a survivor hash (never overwrites)
#   mind-palace-gate.sh rehearse    conditional delete inside :begin … :rollback, then prove nothing changed
#   mind-palace-gate.sh negative    rehearse with one entity name wrong; passes only if it deletes nothing
#   mind-palace-gate.sh execute     the conditional delete, auto-committed (requires rehearse.ok + negative.ok newer than the freeze)
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
ROUTE=60c383d5-921e-443c-9430-b2242469fbe0
ROUTE_NAME='Collective Security'
phase="${1:?usage: mind-palace-gate.sh <phase>}"

got="$(docker inspect -f '{{.State.Running}} {{index .Config.Labels "com.docker.compose.project"}}' "$C" 2>/dev/null)"
[ "$got" = "true $PROJ" ] || { echo "GATE FAIL G1 target: container $C reports '$got', expected 'true $PROJ'" >&2; exit 2; }

mkdir -p "$OUT" && chmod 700 "$EVID" "$OUT"
LOG="$OUT/$phase.log"
echo "target: container=$C project=$PROJ route=$ROUTE" > "$LOG"

cy_read()  { docker exec -i "$C" cypher-shell -u neo4j -p "$NEO_PASS" --format plain --access-mode read; }
cy_write() { docker exec -i "$C" cypher-shell -u neo4j -p "$NEO_PASS" --format plain --access-mode write; }
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

delete_stmt() {  # $1 = the fourth entity name ("World War I" for real, anything else for the negative control)
  cat <<CYPHER
MATCH (r:Route {id: '$ROUTE'})
WHERE r.name = '$ROUTE_NAME'
  AND count{ (r)<--() } = 0
  AND count{ (r)-->() } = 4
  AND count{ (r)-[:HAS_STEP]->(:Entity) } = 4
  AND all(n IN ['United Nations', 'World War II', 'League of Nations', '$1']
          WHERE exists{ (r)-[:HAS_STEP]->(:Entity {name: n}) })
WITH r, count{ (r)-->() } AS steps
DETACH DELETE r
RETURN steps AS deleted_steps;
CYPHER
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
  for f in scope.txt degrees.txt snapshot.txt; do
    [ -s "$OUT/$f" ] || fail "frozen evidence missing: $OUT/$f (run freeze first)"
  done
}

unchanged() {  # $1 = label
  preflight
  [ "$(degrees)" = "$(cat "$OUT/degrees.txt")" ] || fail "G6 degrees changed ($1)"
  [ "$(survivor_hash)" = "$(cat "$OUT/snapshot.txt")" ] || fail "G6 survivor hash changed ($1)"
}

case "$phase" in
  preflight) preflight ;;

  freeze)
    for f in scope.txt degrees.txt snapshot.txt; do
      [ -e "$OUT/$f" ] && fail "freeze refuses to overwrite $OUT/$f"
    done
    preflight
    printf '%s\n' "MATCH (r:Route {id: '$ROUTE'}) OPTIONAL MATCH (r)-[x]->(e) RETURN properties(r) AS route, type(x) AS rel, properties(x) AS rel_props, e.name AS entity ORDER BY entity;" \
      | cy_read > "$OUT/scope.txt" 2>>"$LOG" || fail "freeze export failed"
    degrees > "$OUT/degrees.txt" || fail "freeze degrees failed"
    survivor_hash > "$OUT/snapshot.txt" || fail "freeze hash failed"
    chmod 600 "$OUT/scope.txt" "$OUT/degrees.txt" "$OUT/snapshot.txt" ;;

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
    for m in rehearse.ok negative.ok; do
      [ "$OUT/$m" -nt "$OUT/snapshot.txt" ] || fail "execute requires $m newer than the freeze"
    done
    unchanged "before delete"
    out="$(delete_stmt 'World War I' | cy_write 2>>"$LOG")" || fail "delete statement failed"
    echo "$out" >> "$LOG"
    [ "$out" = $'deleted_steps\n4' ] || fail "G9 execute: the conditional delete did not report 4 steps (nothing was deleted if empty)" ;;

  post)
    need_frozen
    expect "Route count"    "MATCH (r:Route) RETURN count(r);" 1
    expect "Entity count"   "MATCH (e:Entity) RETURN count(e);" 228
    expect "HAS_STEP count" "MATCH ()-[h:HAS_STEP]->() RETURN count(h);" 1
    expect "demo route gone" "MATCH (r:Route {id: '$ROUTE'}) RETURN count(r);" 0
    for pair in "League of Nations:2" "United Nations:1" "World War I:8" "World War II:13"; do
      expect "degree ${pair%%:*}" "MATCH (e:Entity {name: '${pair%%:*}'}) RETURN count{ (e)--() };" "${pair##*:}"
    done
    [ "$(survivor_hash)" = "$(cat "$OUT/snapshot.txt")" ] || fail "G10 survivor hash changed" ;;

  *) echo "GATE FAIL unknown phase: $phase" >&2; exit 2 ;;
esac

echo "PASS mind-palace $phase (log: $LOG)"
