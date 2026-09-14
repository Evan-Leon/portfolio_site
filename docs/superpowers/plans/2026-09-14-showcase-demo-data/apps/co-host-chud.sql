-- co-host's CHUD residue (database chud): the source-bundle artifact e6135781-… that co-host's failed demo
-- `energy_map` job (job_fba52731d285) ingested into CHUD on 2026-09-06 19:23:58 UTC before its workflow failed.
-- Decision D5 (Evan, 2026-09-14): delete it through this gate. Nothing else in chud is touched; conversation
-- 7206 stays (D2).
DO $$ BEGIN
  PERFORM pg_temp.gate_g1('database is chud', (current_database() = 'chud')::int, 1, 1);
  PERFORM pg_temp.gate_pin('artifacts column manifest',
    pg_temp.gate_sha((SELECT string_agg(column_name || ':' || data_type, ',' ORDER BY ordinal_position)
                      FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'artifacts')),
    'c4c9ae510724afdd93a003504e23df98144fb21f7b92df8266d4f985947e72b7');
  PERFORM pg_temp.gate_g1('artifact e6135781 is the co-host demo source bundle',
    (SELECT count(*) FROM artifacts
      WHERE id = 'e6135781-781a-436f-9af0-fb79136abd5b' AND type = 'source_bundle'
        AND created_at = '2026-09-06 19:23:58.926986+00'
        AND row_to_json(artifacts)::text ~* 'the long fuse'), 1, 0);
END $$;

INSERT INTO gate_scope (tbl, pkcol, ids, expected, del_order) VALUES
  ('artifacts', 'id', ARRAY(SELECT id FROM artifacts WHERE id = 'e6135781-781a-436f-9af0-fb79136abd5b'), 1, 10);

INSERT INTO gate_fk_allow (conrelid, col, confrelid, deltype) VALUES
  ('artifacts', 'parent_artifact_id', 'artifacts', 'a');

INSERT INTO gate_extra (label, n, expected, post_expected) VALUES
  ('artifacts naming the demo show or its ids', (SELECT count(*) FROM artifacts a
     WHERE row_to_json(a)::text ~* '(the long fuse|great molasses flood|year without a summer|ch_b11b31a0d9ae|ep_a78a3f018922|ep_df1c614c159e|job_fba52731d285)'), 1, 0),
  ('artifacts listing the demo artifact as an input (non-FK)', (SELECT count(*) FROM artifacts
     WHERE input_artifact_ids::text LIKE '%e6135781-781a-436f-9af0-fb79136abd5b%'), 0, 0),
  ('cohost_documents naming the demo show or its ids (non-FK)', (SELECT count(*) FROM cohost_documents t
     WHERE row_to_json(t)::text ~* '(the long fuse|great molasses flood|year without a summer|ch_b11b31a0d9ae|ep_a78a3f018922|ep_df1c614c159e)'), 0, 0),
  ('cohost_mirror_gaps naming the demo show or its ids (non-FK)', (SELECT count(*) FROM cohost_mirror_gaps t
     WHERE row_to_json(t)::text ~* '(the long fuse|great molasses flood|year without a summer|ch_b11b31a0d9ae|ep_a78a3f018922|ep_df1c614c159e)'), 0, 0),
  ('conversation 7206 still has its 8 messages (D2: untouched)', (SELECT count(*) FROM messages WHERE conversation_id = 7206), 8, 8);
