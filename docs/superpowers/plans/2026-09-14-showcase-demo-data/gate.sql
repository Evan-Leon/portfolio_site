-- gate.sql — fail-closed demo-data deletion gate for PostgreSQL (13+).
--
-- Creates ONLY session-temporary objects (TEMP tables, pg_temp functions); it never creates,
-- alters or writes a persistent object. An app declaration file (apps/<app>.sql) is concatenated
-- after this file and fills the five temp tables. The runner (gate-run.sh) wraps both in a
-- transaction that ends in ROLLBACK for every phase except `execute`.
--
-- Every failure raises an exception whose message starts with "GATE FAIL <check>" so callers can
-- match the diagnostic, not just a non-zero exit.

CREATE TEMP TABLE gate_scope (
  tbl       regclass PRIMARY KEY,      -- table holding demo rows to delete
  pkcol     text     NOT NULL,         -- its single-column primary key
  ids       text[]   NOT NULL,         -- demo ids, resolved from anchors by the declaration
  expected  int      NOT NULL,         -- exact count from the approved manifest
  del_order int      NOT NULL UNIQUE   -- delete order, children first
);
CREATE TEMP TABLE gate_parent (tbl regclass PRIMARY KEY);              -- retained shared parents scope rows may point at
CREATE TEMP TABLE gate_fk_allow (conrelid regclass, col text, confrelid regclass,
                                 PRIMARY KEY (conrelid, col, confrelid)); -- every FK that references a scope table
CREATE TEMP TABLE gate_extra (label text PRIMARY KEY, n bigint NOT NULL, expected bigint NOT NULL); -- non-FK checks
CREATE TEMP TABLE gate_trigger_allow (tbl regclass, tgname text, PRIMARY KEY (tbl, tgname));      -- reviewed DELETE/UPDATE triggers

-- All foreign keys in the database, first key column only; nkeys > 1 flags composite keys.
CREATE FUNCTION pg_temp.gate_fk_list()
RETURNS TABLE (conrelid regclass, col text, confrelid regclass, refcol text, nkeys int)
LANGUAGE sql STABLE AS $$
  SELECT c.conrelid::regclass, a.attname::text, c.confrelid::regclass, fa.attname::text, cardinality(c.conkey)
  FROM pg_constraint c
  JOIN pg_attribute a  ON a.attrelid  = c.conrelid  AND a.attnum  = c.conkey[1]
  JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = c.confkey[1]
  WHERE c.contype = 'f'
$$;

-- G2 closure, G3 counts + extra checks, G4 inbound, G5 outbound (allowlist + cross-scope).
CREATE FUNCTION pg_temp.gate_preflight() RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  r record; s record; p record; n bigint; found_s boolean;
BEGIN
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

  -- G2: every FK referencing a scope table is single-column, targets the scope key, and is allowlisted;
  --     every allowlisted FK still exists.
  FOR r IN SELECT f.* FROM pg_temp.gate_fk_list() f WHERE f.confrelid IN (SELECT tbl FROM gate_scope) LOOP
    SELECT * INTO p FROM gate_scope WHERE tbl = r.confrelid;
    IF r.nkeys <> 1 THEN
      RAISE EXCEPTION 'GATE FAIL G2 composite FK: %.% -> %', r.conrelid, r.col, r.confrelid;
    END IF;
    IF r.refcol <> p.pkcol THEN
      RAISE EXCEPTION 'GATE FAIL G2 FK %.% references %.% which is not the scope key %', r.conrelid, r.col, r.confrelid, r.refcol, p.pkcol;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM gate_fk_allow a
                   WHERE a.conrelid = r.conrelid AND a.col = r.col AND a.confrelid = r.confrelid) THEN
      RAISE EXCEPTION 'GATE FAIL G2 unlisted FK: %.% -> %', r.conrelid, r.col, r.confrelid;
    END IF;
  END LOOP;
  FOR r IN SELECT a.* FROM gate_fk_allow a
           WHERE NOT EXISTS (SELECT 1 FROM pg_temp.gate_fk_list() f
                             WHERE f.conrelid = a.conrelid AND f.col = a.col AND f.confrelid = a.confrelid) LOOP
    RAISE EXCEPTION 'GATE FAIL G2 allowlisted FK not in schema: %.% -> %', r.conrelid, r.col, r.confrelid;
  END LOOP;

  -- G2 triggers/rules: a DELETE- or UPDATE-firing trigger (or any rewrite rule) on a scope table, a table that
  --     references one, or a retained parent could change rows the survivor hash does not cover. Each trigger must
  --     be reviewed and allowlisted by name (the rehearsal then proves its effect); any rule is a stop.
  FOR r IN
    SELECT t.tgrelid::regclass AS tbl, t.tgname::text AS tgname
    FROM pg_trigger t
    WHERE NOT t.tgisinternal
      AND (t.tgtype & 24) <> 0   -- TRIGGER_TYPE_DELETE (8) | TRIGGER_TYPE_UPDATE (16)
      AND t.tgrelid IN (
        SELECT tbl FROM gate_scope
        UNION SELECT f.conrelid FROM pg_temp.gate_fk_list() f WHERE f.confrelid IN (SELECT tbl FROM gate_scope)
        UNION SELECT tbl FROM gate_parent)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM gate_trigger_allow a WHERE a.tbl = r.tbl AND a.tgname = r.tgname) THEN
      RAISE EXCEPTION 'GATE FAIL G2 unlisted trigger: % on %', r.tgname, r.tbl;
    END IF;
  END LOOP;
  FOR r IN
    SELECT c.oid::regclass AS tbl, rw.rulename::text AS rulename
    FROM pg_rewrite rw JOIN pg_class c ON c.oid = rw.ev_class
    WHERE rw.rulename <> '_RETURN'
      AND c.oid IN (
        SELECT tbl FROM gate_scope
        UNION SELECT f.conrelid FROM pg_temp.gate_fk_list() f WHERE f.confrelid IN (SELECT tbl FROM gate_scope)
        UNION SELECT tbl FROM gate_parent)
  LOOP
    RAISE EXCEPTION 'GATE FAIL G2 rewrite rule: % on %', r.rulename, r.tbl;
  END LOOP;
  FOR r IN SELECT a.* FROM gate_trigger_allow a
           WHERE NOT EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgrelid = a.tbl AND t.tgname = a.tgname AND NOT t.tgisinternal) LOOP
    RAISE EXCEPTION 'GATE FAIL G2 allowlisted trigger not in schema: % on %', r.tgname, r.tbl;
  END LOOP;

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

-- md5 + count of one table, excluding the given ids when pkcol is not null.
CREATE FUNCTION pg_temp.gate_hash(t regclass, pkcol text, ids text[]) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE n bigint; h text;
BEGIN
  IF pkcol IS NULL THEN
    EXECUTE format('SELECT count(*), md5(coalesce(string_agg(x::text, E''\n'' ORDER BY x::text), '''')) FROM %s x', t)
      INTO n, h;
  ELSE
    EXECUTE format('SELECT count(*), md5(coalesce(string_agg(x::text, E''\n'' ORDER BY x::text), '''')) FROM %s x WHERE NOT (x.%I::text = ANY($1))', t, pkcol)
      INTO n, h USING ids;
  END IF;
  RETURN jsonb_build_object('n', n, 'md5', h);
END $$;

-- G6: survivors of every scope table, every table referencing a scope table, every retained parent.
CREATE FUNCTION pg_temp.gate_snapshot() RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE t regclass; s record; out jsonb := '{}'::jsonb;
BEGIN
  FOR t IN
    SELECT x FROM (
      SELECT tbl AS x FROM gate_scope
      UNION SELECT f.conrelid FROM pg_temp.gate_fk_list() f WHERE f.confrelid IN (SELECT tbl FROM gate_scope)
      UNION SELECT tbl FROM gate_parent
    ) u ORDER BY x::text
  LOOP
    SELECT * INTO s FROM gate_scope WHERE tbl = t;
    IF FOUND THEN
      out := out || jsonb_build_object(t::text, pg_temp.gate_hash(t, s.pkcol, s.ids));
    ELSE
      out := out || jsonb_build_object(t::text, pg_temp.gate_hash(t, NULL, NULL));
    END IF;
  END LOOP;
  RETURN out;
END $$;

-- Order-independent digest of the exact scope id sets.
CREATE FUNCTION pg_temp.gate_scope_digest() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT md5(coalesce(string_agg(tbl::text || ':' || array_to_string(ARRAY(SELECT unnest(ids) ORDER BY 1), ','),
                                 E'\n' ORDER BY tbl::text), ''))
  FROM gate_scope
$$;

-- Key column + exact ids per scope table (small; passed back to the post-check).
CREATE FUNCTION pg_temp.gate_scope_ids() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(jsonb_object_agg(tbl::text, jsonb_build_object('pkcol', pkcol, 'ids', to_jsonb(ids))), '{}'::jsonb)
  FROM gate_scope
$$;

-- Full export of every scope row, with its key column and id list (evidence; never passed on a command line).
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

-- G10 post-check (no declaration loaded): frozen ids are gone, survivors unchanged.
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
