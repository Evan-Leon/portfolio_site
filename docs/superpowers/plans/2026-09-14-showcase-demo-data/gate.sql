-- gate.sql — fail-closed demo-data deletion gate for PostgreSQL (13+). Rev 2.
--
-- Creates ONLY session-temporary objects (TEMP tables, pg_temp functions); it never creates,
-- alters or writes a persistent object. The runner (gate-run.sh) concatenates this file, then
-- `SET gate.mode = 'pre' | 'post'`, then an app declaration (apps/<app>.sql) that fills the five
-- temp tables. Every phase except `execute` ends in ROLLBACK.
--
-- Every failure raises an exception whose message starts with "GATE FAIL <check>" so callers can
-- match the diagnostic, not just a non-zero exit.

SET lock_timeout = '10s';
SET statement_timeout = '300s';
SET idle_in_transaction_session_timeout = '600s';

CREATE TEMP TABLE gate_scope (
  tbl       regclass PRIMARY KEY,      -- table holding demo rows to delete
  pkcol     text     NOT NULL,         -- its single-column primary key
  ids       text[]   NOT NULL,         -- demo ids, resolved from anchors by the declaration
  expected  int      NOT NULL,         -- exact count from the approved manifest (pre mode)
  del_order int      NOT NULL UNIQUE   -- delete order, children first
);
CREATE TEMP TABLE gate_parent (tbl regclass PRIMARY KEY);   -- retained shared parents scope rows may point at
CREATE TEMP TABLE gate_fk_allow (                            -- every FK that references a scope table
  conrelid regclass, col text, confrelid regclass,
  deltype "char" NOT NULL,                                   -- pinned pg_constraint.confdeltype (a r c n d)
  PRIMARY KEY (conrelid, col, confrelid));
CREATE TEMP TABLE gate_extra (                               -- non-FK checks
  label text PRIMARY KEY, n bigint NOT NULL,
  expected bigint NOT NULL,                                  -- value required before the delete
  post_expected bigint NOT NULL);                            -- value required after it (post mode)
CREATE TEMP TABLE gate_trigger_allow (                       -- reviewed DELETE/UPDATE triggers
  tbl regclass, tgname text,
  tgtype int NOT NULL,                                       -- pinned pg_trigger.tgtype (timing/level/event bits)
  tgenabled "char" NOT NULL,                                 -- pinned pg_trigger.tgenabled (O, D, R, A)
  digest text NOT NULL,                                      -- sha256(pg_get_triggerdef || '\n' || pg_get_functiondef)
  PRIMARY KEY (tbl, tgname));

CREATE FUNCTION pg_temp.gate_sha(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256(convert_to(coalesce(t, ''), 'UTF8')), 'hex')
$$;

CREATE FUNCTION pg_temp.gate_mode() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('gate.mode', true), ''), 'unset')
$$;

-- G1 helpers for declarations. gate_g1: a count that must equal `pre` in pre mode and `post` in post mode.
CREATE FUNCTION pg_temp.gate_g1(label text, n bigint, pre bigint, post bigint) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF pg_temp.gate_mode() NOT IN ('pre', 'post') THEN
    RAISE EXCEPTION 'GATE FAIL G1 mode: gate.mode is %, expected pre or post', pg_temp.gate_mode();
  END IF;
  IF n IS DISTINCT FROM (CASE pg_temp.gate_mode() WHEN 'pre' THEN pre ELSE post END) THEN
    RAISE EXCEPTION 'GATE FAIL G1 anchor "%": got % in % mode, expected %', label, n, pg_temp.gate_mode(),
                    CASE pg_temp.gate_mode() WHEN 'pre' THEN pre ELSE post END;
  END IF;
END $$;

CREATE FUNCTION pg_temp.gate_pin(label text, got text, want text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF got IS DISTINCT FROM want THEN
    RAISE EXCEPTION 'GATE FAIL G1 pin "%": got %, pinned %', label, got, want;
  END IF;
END $$;

-- All foreign keys in the database, first key column only; nkeys > 1 flags composite keys.
CREATE FUNCTION pg_temp.gate_fk_list()
RETURNS TABLE (conrelid regclass, col text, confrelid regclass, refcol text, nkeys int, deltype "char")
LANGUAGE sql STABLE AS $$
  SELECT c.conrelid::regclass, a.attname::text, c.confrelid::regclass, fa.attname::text, cardinality(c.conkey), c.confdeltype
  FROM pg_constraint c
  JOIN pg_attribute a  ON a.attrelid  = c.conrelid  AND a.attnum  = c.conkey[1]
  JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = c.confkey[1]
  WHERE c.contype = 'f'
$$;

-- Tables whose content the gate protects: scope tables, tables referencing them, retained parents.
CREATE FUNCTION pg_temp.gate_watched() RETURNS SETOF regclass LANGUAGE sql STABLE AS $$
  SELECT tbl FROM gate_scope
  UNION SELECT f.conrelid FROM pg_temp.gate_fk_list() f WHERE f.confrelid IN (SELECT tbl FROM gate_scope)
  UNION SELECT tbl FROM gate_parent
$$;

-- G2: FK closure with pinned delete rules; DELETE/UPDATE triggers pinned by definition digest; no rewrite rules.
CREATE FUNCTION pg_temp.gate_closure() RETURNS void LANGUAGE plpgsql AS $$
DECLARE r record; p record; a record; tg record;
BEGIN
  FOR r IN SELECT f.* FROM pg_temp.gate_fk_list() f WHERE f.confrelid IN (SELECT tbl FROM gate_scope) LOOP
    SELECT * INTO p FROM gate_scope WHERE tbl = r.confrelid;
    IF r.nkeys <> 1 THEN
      RAISE EXCEPTION 'GATE FAIL G2 composite FK: %.% -> %', r.conrelid, r.col, r.confrelid;
    END IF;
    IF r.refcol <> p.pkcol THEN
      RAISE EXCEPTION 'GATE FAIL G2 FK %.% references %.% which is not the scope key %', r.conrelid, r.col, r.confrelid, r.refcol, p.pkcol;
    END IF;
    SELECT * INTO a FROM gate_fk_allow x WHERE x.conrelid = r.conrelid AND x.col = r.col AND x.confrelid = r.confrelid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'GATE FAIL G2 unlisted FK: %.% -> %', r.conrelid, r.col, r.confrelid;
    END IF;
    IF a.deltype <> r.deltype THEN
      RAISE EXCEPTION 'GATE FAIL G2 FK delete rule: %.% -> % is %, pinned %', r.conrelid, r.col, r.confrelid, r.deltype, a.deltype;
    END IF;
  END LOOP;
  FOR r IN SELECT x.* FROM gate_fk_allow x
           WHERE NOT EXISTS (SELECT 1 FROM pg_temp.gate_fk_list() f
                             WHERE f.conrelid = x.conrelid AND f.col = x.col AND f.confrelid = x.confrelid) LOOP
    RAISE EXCEPTION 'GATE FAIL G2 allowlisted FK not in schema: %.% -> %', r.conrelid, r.col, r.confrelid;
  END LOOP;

  -- Every DELETE/UPDATE trigger on a watched table must be allowlisted...
  FOR r IN
    SELECT t.tgrelid::regclass AS tbl, t.tgname::text AS tgname
    FROM pg_trigger t
    WHERE NOT t.tgisinternal
      AND (t.tgtype & 24) <> 0   -- TRIGGER_TYPE_DELETE (8) | TRIGGER_TYPE_UPDATE (16)
      AND t.tgrelid IN (SELECT pg_temp.gate_watched())
  LOOP
    IF NOT EXISTS (SELECT 1 FROM gate_trigger_allow x WHERE x.tbl = r.tbl AND x.tgname = r.tgname) THEN
      RAISE EXCEPTION 'GATE FAIL G2 unlisted trigger: % on %', r.tgname, r.tbl;
    END IF;
  END LOOP;
  -- ...and every allowlisted trigger must still exist with its pinned event mask, enabled state and definition,
  -- whatever events it fires on now (a trigger re-pointed at another event, or disabled, is a stop).
  FOR a IN SELECT * FROM gate_trigger_allow ORDER BY tbl::text, tgname LOOP
    SELECT t.* INTO tg FROM pg_trigger t WHERE t.tgrelid = a.tbl AND t.tgname = a.tgname AND NOT t.tgisinternal;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'GATE FAIL G2 allowlisted trigger not in schema: % on %', a.tgname, a.tbl;
    END IF;
    IF tg.tgtype <> a.tgtype THEN
      RAISE EXCEPTION 'GATE FAIL G2 trigger event mask changed: % on % is %, pinned %', a.tgname, a.tbl, tg.tgtype, a.tgtype;
    END IF;
    IF tg.tgenabled <> a.tgenabled THEN
      RAISE EXCEPTION 'GATE FAIL G2 trigger state changed: % on % is %, pinned %', a.tgname, a.tbl, tg.tgenabled, a.tgenabled;
    END IF;
    IF pg_temp.gate_sha(pg_get_triggerdef(tg.oid) || E'\n' || pg_get_functiondef(tg.tgfoid)) <> a.digest THEN
      RAISE EXCEPTION 'GATE FAIL G2 trigger definition changed: % on %', a.tgname, a.tbl;
    END IF;
  END LOOP;
  FOR r IN
    SELECT c.oid::regclass AS tbl, rw.rulename::text AS rulename
    FROM pg_rewrite rw JOIN pg_class c ON c.oid = rw.ev_class
    WHERE rw.rulename <> '_RETURN' AND c.oid IN (SELECT pg_temp.gate_watched())
  LOOP
    RAISE EXCEPTION 'GATE FAIL G2 rewrite rule: % on %', r.rulename, r.tbl;
  END LOOP;
END $$;

-- Pre mode: G3 counts + extra checks, G2 closure, G4 inbound, G5 outbound (allowlist + cross-scope).
CREATE FUNCTION pg_temp.gate_preflight() RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  r record; s record; p record; n bigint; found_s boolean;
BEGIN
  IF pg_temp.gate_mode() <> 'pre' THEN
    RAISE EXCEPTION 'GATE FAIL G1 mode: preflight needs gate.mode pre, got %', pg_temp.gate_mode();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gate_scope) THEN
    RAISE EXCEPTION 'GATE FAIL G3 empty declaration: gate_scope has no tables';
  END IF;

  -- G3: every scope table resolves exactly the manifest count, no duplicates, all rows exist.
  FOR r IN SELECT * FROM gate_scope ORDER BY del_order LOOP
    IF cardinality(r.ids) <> r.expected THEN
      RAISE EXCEPTION 'GATE FAIL G3 count: % resolved % ids, expected %', r.tbl, cardinality(r.ids), r.expected;
    END IF;
    SELECT count(DISTINCT x) INTO n FROM unnest(r.ids) x;
    IF n <> cardinality(r.ids) THEN
      RAISE EXCEPTION 'GATE FAIL G3 duplicate ids in %', r.tbl;
    END IF;
    EXECUTE format('SELECT count(*) FROM %s WHERE %I::text = ANY($1)', r.tbl, r.pkcol) INTO n USING r.ids;
    IF n <> r.expected THEN
      RAISE EXCEPTION 'GATE FAIL G3 rows: % has % rows for its ids, expected %', r.tbl, n, r.expected;
    END IF;
  END LOOP;
  FOR r IN SELECT * FROM gate_extra ORDER BY label LOOP
    IF r.n IS DISTINCT FROM r.expected THEN
      RAISE EXCEPTION 'GATE FAIL G3 extra check "%": got %, expected %', r.label, r.n, r.expected;
    END IF;
  END LOOP;

  PERFORM pg_temp.gate_closure();

  -- G4: no row OUTSIDE the scope references a row INSIDE it.
  FOR r IN SELECT f.* FROM pg_temp.gate_fk_list() f WHERE f.confrelid IN (SELECT tbl FROM gate_scope) LOOP
    SELECT * INTO p FROM gate_scope WHERE tbl = r.confrelid;
    SELECT * INTO s FROM gate_scope WHERE tbl = r.conrelid;
    found_s := FOUND;
    IF found_s THEN
      EXECUTE format('SELECT count(*) FROM %s WHERE %I::text = ANY($1) AND NOT (%I::text = ANY($2))',
                     r.conrelid, r.col, s.pkcol) INTO n USING p.ids, s.ids;
    ELSE
      EXECUTE format('SELECT count(*) FROM %s WHERE %I::text = ANY($1)', r.conrelid, r.col) INTO n USING p.ids;
    END IF;
    IF n > 0 THEN
      RAISE EXCEPTION 'GATE FAIL G4 inbound: % row(s) outside the scope in %.% reference scope rows of %',
                      n, r.conrelid, r.col, r.confrelid;
    END IF;
  END LOOP;

  -- G5: scope rows point only at (a) allowlisted retained parents or (b) rows that are themselves in scope.
  FOR r IN SELECT f.* FROM pg_temp.gate_fk_list() f WHERE f.conrelid IN (SELECT tbl FROM gate_scope) LOOP
    SELECT * INTO s FROM gate_scope WHERE tbl = r.conrelid;
    IF r.nkeys <> 1 THEN
      EXECUTE format('SELECT count(*) FROM %s WHERE %I::text = ANY($1)', r.conrelid, s.pkcol) INTO n USING s.ids;
      IF n > 0 THEN
        RAISE EXCEPTION 'GATE FAIL G5 composite outbound FK from scope table %', r.conrelid;
      END IF;
      CONTINUE;
    END IF;
    SELECT * INTO p FROM gate_scope WHERE tbl = r.confrelid;
    IF FOUND THEN
      EXECUTE format('SELECT count(*) FROM %s WHERE %I::text = ANY($1) AND %I IS NOT NULL AND NOT (%I::text = ANY($2))',
                     r.conrelid, s.pkcol, r.col, r.col) INTO n USING s.ids, p.ids;
      IF n > 0 THEN
        RAISE EXCEPTION 'GATE FAIL G5 cross-scope: % scope row(s) in %.% reference a NON-scope row of %',
                        n, r.conrelid, r.col, r.confrelid;
      END IF;
    ELSE
      EXECUTE format('SELECT count(*) FROM %s WHERE %I::text = ANY($1) AND %I IS NOT NULL',
                     r.conrelid, s.pkcol, r.col) INTO n USING s.ids;
      IF n > 0 AND r.confrelid NOT IN (SELECT tbl FROM gate_parent) THEN
        RAISE EXCEPTION 'GATE FAIL G5 outbound: % scope row(s) in %.% reference non-allowlisted %',
                        n, r.conrelid, r.col, r.confrelid;
      END IF;
    END IF;
  END LOOP;

  RETURN 'GATE PREFLIGHT OK';
END $$;

-- Post mode: every scope selector now resolves nothing, every extra check equals its post value, closure intact.
CREATE FUNCTION pg_temp.gate_preflight_post() RETURNS text LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  IF pg_temp.gate_mode() <> 'post' THEN
    RAISE EXCEPTION 'GATE FAIL G1 mode: post-check needs gate.mode post, got %', pg_temp.gate_mode();
  END IF;
  FOR r IN SELECT * FROM gate_scope ORDER BY del_order LOOP
    IF cardinality(r.ids) <> 0 THEN
      RAISE EXCEPTION 'GATE FAIL G10 scope not empty: % still resolves % row(s)', r.tbl, cardinality(r.ids);
    END IF;
  END LOOP;
  FOR r IN SELECT * FROM gate_extra ORDER BY label LOOP
    IF r.n IS DISTINCT FROM r.post_expected THEN
      RAISE EXCEPTION 'GATE FAIL G10 extra check "%": got %, expected % after the delete', r.label, r.n, r.post_expected;
    END IF;
  END LOOP;
  PERFORM pg_temp.gate_closure();
  RETURN 'GATE POST SCOPE OK';
END $$;

-- sha256 + count of one table's rows, length-prefixed canonical JSON, excluding the given ids when pkcol is not null.
CREATE FUNCTION pg_temp.gate_hash(t regclass, pkcol text, ids text[]) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE n bigint; h text;
BEGIN
  IF pkcol IS NULL THEN
    EXECUTE format('SELECT count(*), coalesce(string_agg(length(j)::text || '':'' || j, '''' ORDER BY j), '''')
                    FROM (SELECT row_to_json(x)::text AS j FROM %s x) s', t) INTO n, h;
  ELSE
    EXECUTE format('SELECT count(*), coalesce(string_agg(length(j)::text || '':'' || j, '''' ORDER BY j), '''')
                    FROM (SELECT row_to_json(x)::text AS j FROM %s x WHERE NOT (x.%I::text = ANY($1))) s', t, pkcol)
      INTO n, h USING ids;
  END IF;
  RETURN jsonb_build_object('n', n, 'sha256', pg_temp.gate_sha(h));
END $$;

-- G6 survivors: every watched table minus the scope rows.
CREATE FUNCTION pg_temp.gate_snapshot() RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE t regclass; s record; out jsonb := '{}'::jsonb;
BEGIN
  FOR t IN SELECT x FROM pg_temp.gate_watched() x ORDER BY x::text LOOP
    SELECT * INTO s FROM gate_scope WHERE tbl = t;
    IF FOUND THEN
      out := out || jsonb_build_object(t::text, pg_temp.gate_hash(t, s.pkcol, s.ids));
    ELSE
      out := out || jsonb_build_object(t::text, pg_temp.gate_hash(t, NULL, NULL));
    END IF;
  END LOOP;
  RETURN out;
END $$;

-- Order-independent digest of the exact scope id sets; every table name and id is length-prefixed.
CREATE FUNCTION pg_temp.gate_scope_digest() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT pg_temp.gate_sha(string_agg(
           length(tbl::text)::text || ':' || tbl::text || '#' || cardinality(ids)::text || '#'
           || (SELECT coalesce(string_agg(length(i)::text || ':' || i, '' ORDER BY i), '') FROM unnest(ids) i),
           '' ORDER BY tbl::text))
  FROM gate_scope
$$;

-- Content digest of the scope rows themselves (what G7 inspected), length-prefixed, ordered by key.
CREATE FUNCTION pg_temp.gate_rows_digest() RETURNS text LANGUAGE plpgsql AS $$
DECLARE r record; part text; acc text := '';
BEGIN
  FOR r IN SELECT * FROM gate_scope ORDER BY tbl::text LOOP
    EXECUTE format('SELECT coalesce(string_agg(length(j)::text || '':'' || j, '''' ORDER BY k), '''')
                    FROM (SELECT x.%I::text AS k, row_to_json(x)::text AS j FROM %s x WHERE x.%I::text = ANY($1)) s',
                   r.pkcol, r.tbl, r.pkcol) INTO part USING r.ids;
    acc := acc || length(r.tbl::text)::text || ':' || r.tbl::text || length(part)::text || ':' || part;
  END LOOP;
  RETURN pg_temp.gate_sha(acc);
END $$;

-- Key column + exact ids per scope table (small; passed back to post and classify).
CREATE FUNCTION pg_temp.gate_scope_ids() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(jsonb_object_agg(tbl::text, jsonb_build_object('pkcol', pkcol, 'ids', to_jsonb(ids))), '{}'::jsonb)
  FROM gate_scope
$$;

-- Full export of every scope row (evidence for G7; never passed on a command line).
CREATE FUNCTION pg_temp.gate_export() RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE r record; rows jsonb; out jsonb := '{}'::jsonb;
BEGIN
  FOR r IN SELECT * FROM gate_scope ORDER BY del_order LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.%I::text), ''[]''::jsonb) FROM %s x WHERE x.%I::text = ANY($1)',
                   r.pkcol, r.tbl, r.pkcol) INTO rows USING r.ids;
    out := out || jsonb_build_object(r.tbl::text,
                    jsonb_build_object('pkcol', r.pkcol, 'ids', to_jsonb(r.ids), 'expected', r.expected, 'rows', rows));
  END LOOP;
  RETURN out;
END $$;

-- G9 lock: take row locks on every scope row before comparing and deleting (lock_timeout bounds the wait).
CREATE FUNCTION pg_temp.gate_lock() RETURNS text LANGUAGE plpgsql AS $$
DECLARE r record; n bigint;
BEGIN
  FOR r IN SELECT * FROM gate_scope ORDER BY del_order LOOP
    EXECUTE format('SELECT count(*) FROM (SELECT 1 FROM %s x WHERE x.%I::text = ANY($1) FOR UPDATE) s', r.tbl, r.pkcol)
      INTO n USING r.ids;
    IF n <> cardinality(r.ids) THEN
      RAISE EXCEPTION 'GATE FAIL G9 lock: % locked % of % scope rows', r.tbl, n, cardinality(r.ids);
    END IF;
  END LOOP;
  RETURN 'GATE LOCKED';
END $$;

CREATE FUNCTION pg_temp.gate_assert_rows(frozen text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE now_d text := pg_temp.gate_rows_digest();
BEGIN
  IF frozen IS DISTINCT FROM now_d THEN
    RAISE EXCEPTION 'GATE FAIL G6 scope rows changed since freeze: frozen %, now %', frozen, now_d;
  END IF;
  RETURN 'GATE SCOPE ROWS OK';
END $$;

CREATE FUNCTION pg_temp.gate_assert_digest(frozen text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE now_d text := pg_temp.gate_scope_digest();
BEGIN
  IF frozen IS DISTINCT FROM now_d THEN
    RAISE EXCEPTION 'GATE FAIL G9 scope digest: frozen %, in-transaction %', frozen, now_d;
  END IF;
  RETURN 'GATE DIGEST OK';
END $$;

-- Compares a frozen snapshot with the current one and names the first differing table.
CREATE FUNCTION pg_temp.gate_assert_snapshot(frozen text, label text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE f jsonb := frozen::jsonb; c jsonb := pg_temp.gate_snapshot(); k text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(f || c) ORDER BY 1 LOOP
    IF (f -> k) IS DISTINCT FROM (c -> k) THEN
      RAISE EXCEPTION 'GATE FAIL G6 survivors (%): table % frozen % now %', label, k, f -> k, c -> k;
    END IF;
  END LOOP;
  RETURN 'GATE SURVIVORS OK (' || label || ')';
END $$;

-- G9: delete children first by exact ids; every statement must remove exactly its expected rows.
CREATE FUNCTION pg_temp.gate_delete() RETURNS text LANGUAGE plpgsql AS $$
DECLARE r record; n bigint;
BEGIN
  FOR r IN SELECT * FROM gate_scope ORDER BY del_order LOOP
    EXECUTE format('DELETE FROM %s WHERE %I::text = ANY($1)', r.tbl, r.pkcol) USING r.ids;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> r.expected THEN
      RAISE EXCEPTION 'GATE FAIL G9 delete: % removed % rows, expected % (an earlier cascade or a concurrent change removed rows)',
                      r.tbl, n, r.expected;
    END IF;
  END LOOP;
  FOR r IN SELECT * FROM gate_scope LOOP
    EXECUTE format('SELECT count(*) FROM %s WHERE %I::text = ANY($1)', r.tbl, r.pkcol) INTO n USING r.ids;
    IF n <> 0 THEN
      RAISE EXCEPTION 'GATE FAIL G9 residue: % still has % scope rows', r.tbl, n;
    END IF;
  END LOOP;
  RETURN 'GATE DELETE OK';
END $$;

-- G10 survivors after the delete: frozen ids gone, every watched table's survivors identical to the freeze.
CREATE FUNCTION pg_temp.gate_post(scope_json text, frozen_snapshot text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE sc jsonb := scope_json::jsonb; f jsonb := frozen_snapshot::jsonb; k text; n bigint; cur jsonb; ids text[];
BEGIN
  FOR k IN SELECT jsonb_object_keys(sc) ORDER BY 1 LOOP
    ids := ARRAY(SELECT jsonb_array_elements_text(sc -> k -> 'ids'));
    EXECUTE format('SELECT count(*) FROM %s WHERE %I::text = ANY($1)', k::regclass, sc -> k ->> 'pkcol') INTO n USING ids;
    IF n <> 0 THEN
      RAISE EXCEPTION 'GATE FAIL G10 residue: % still has % frozen scope rows', k, n;
    END IF;
  END LOOP;
  FOR k IN SELECT jsonb_object_keys(f) ORDER BY 1 LOOP
    IF sc ? k THEN
      ids := ARRAY(SELECT jsonb_array_elements_text(sc -> k -> 'ids'));
      cur := pg_temp.gate_hash(k::regclass, sc -> k ->> 'pkcol', ids);
    ELSE
      cur := pg_temp.gate_hash(k::regclass, NULL, NULL);
    END IF;
    IF (f -> k) IS DISTINCT FROM cur THEN
      RAISE EXCEPTION 'GATE FAIL G10 survivors: table % frozen % now %', k, f -> k, cur;
    END IF;
  END LOOP;
  RETURN 'GATE POST OK';
END $$;

-- Read-only commit-state classifier for the frozen ids: PRE-STATE (all present), COMMITTED (none), MIXED.
CREATE FUNCTION pg_temp.gate_classify(scope_json text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE sc jsonb := scope_json::jsonb; k text; n bigint; ids text[]; total bigint := 0; present bigint := 0;
BEGIN
  FOR k IN SELECT jsonb_object_keys(sc) ORDER BY 1 LOOP
    ids := ARRAY(SELECT jsonb_array_elements_text(sc -> k -> 'ids'));
    total := total + cardinality(ids);
    EXECUTE format('SELECT count(*) FROM %s WHERE %I::text = ANY($1)', k::regclass, sc -> k ->> 'pkcol') INTO n USING ids;
    present := present + n;
  END LOOP;
  IF total = 0 THEN RETURN 'GATE STATE EMPTY'; END IF;
  IF present = total THEN RETURN 'GATE STATE PRE-STATE'; END IF;
  IF present = 0 THEN RETURN 'GATE STATE COMMITTED'; END IF;
  RETURN 'GATE STATE MIXED';
END $$;
