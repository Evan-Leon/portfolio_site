-- chudios (database chudios): the fictional "Signal & Noise" show — 6 content items with ids beginning dddddddd-.
-- The three demo .m4a files in the recordings volume are handled by files/chudios-files.sh, not here.
DO $$ BEGIN
  PERFORM pg_temp.gate_g1('database is chudios', (current_database() = 'chudios')::int, 1, 1);
  PERFORM pg_temp.gate_pin('migration manifest',
    pg_temp.gate_sha((SELECT string_agg(version::text, ',' ORDER BY version) FROM schema_migrations)),
    'd01f6b8da5446fb5d6d24591c7cc01aea2ecab56e37b3a65e9070906d369f1a6');
  PERFORM pg_temp.gate_g1('six demo content items (dddddddd- ids)', (SELECT count(*) FROM content_items WHERE id LIKE 'dddddddd-%'), 6, 0);
END $$;

CREATE TEMP TABLE demo_items AS SELECT id FROM content_items WHERE id LIKE 'dddddddd-%';
CREATE TEMP TABLE demo_attempts AS SELECT id FROM attempts WHERE content_item_id IN (SELECT id FROM demo_items);

INSERT INTO gate_scope (tbl, pkcol, ids, expected, del_order) VALUES
  ('qc_reports', 'id', ARRAY(SELECT id FROM qc_reports
      WHERE content_item_id IN (SELECT id FROM demo_items) OR attempt_id IN (SELECT id FROM demo_attempts)
         OR stage_run_id IN (SELECT id FROM stage_runs WHERE content_item_id IN (SELECT id FROM demo_items))), 1, 10),
  ('transcripts', 'id', ARRAY(SELECT id FROM transcripts
      WHERE content_item_id IN (SELECT id FROM demo_items) OR attempt_id IN (SELECT id FROM demo_attempts)), 2, 20),
  ('stage_runs', 'id', ARRAY(SELECT id FROM stage_runs
      WHERE content_item_id IN (SELECT id FROM demo_items) OR attempt_id IN (SELECT id FROM demo_attempts)), 8, 30),
  ('clips', 'id', ARRAY(SELECT id FROM clips WHERE content_item_id IN (SELECT id FROM demo_items)), 9, 40),
  ('marketing_assets', 'id', ARRAY(SELECT id FROM marketing_assets WHERE content_item_id IN (SELECT id FROM demo_items)), 7, 50),
  ('published_status', 'id', ARRAY(SELECT id FROM published_status WHERE content_item_id IN (SELECT id FROM demo_items)), 4, 60),
  ('attempts', 'id', ARRAY(SELECT id FROM demo_attempts), 6, 70),
  ('content_items', 'id', ARRAY(SELECT id FROM demo_items), 6, 80);

-- deltype pinned from pg_constraint: every child cascades from content_items/attempts/stage_runs, except
-- content_items.current_attempt_id, which is SET NULL. The gate deletes children first, so no cascade fires
-- (a cascade that did would fail G9 on the next statement's row count).
INSERT INTO gate_fk_allow (conrelid, col, confrelid, deltype) VALUES
  ('attempts', 'content_item_id', 'content_items', 'c'),
  ('clips', 'content_item_id', 'content_items', 'c'),
  ('content_items', 'current_attempt_id', 'attempts', 'n'),
  ('marketing_assets', 'content_item_id', 'content_items', 'c'),
  ('published_status', 'content_item_id', 'content_items', 'c'),
  ('qc_reports', 'attempt_id', 'attempts', 'c'),
  ('qc_reports', 'content_item_id', 'content_items', 'c'),
  ('qc_reports', 'stage_run_id', 'stage_runs', 'c'),
  ('stage_runs', 'attempt_id', 'attempts', 'c'),
  ('stage_runs', 'content_item_id', 'content_items', 'c'),
  ('transcripts', 'attempt_id', 'attempts', 'c'),
  ('transcripts', 'content_item_id', 'content_items', 'c');

INSERT INTO gate_extra (label, n, expected, post_expected) VALUES
  ('content items total (6 demo + 8 real)', (SELECT count(*) FROM content_items), 14, 8),
  ('non-demo rows naming a demo recording file (non-FK)',
   (SELECT count(*) FROM content_items t WHERE id NOT LIKE 'dddddddd-%' AND row_to_json(t)::text LIKE '%demo-sn-ep%')
   + (SELECT count(*) FROM attempts t WHERE content_item_id NOT LIKE 'dddddddd-%' AND row_to_json(t)::text LIKE '%demo-sn-ep%')
   + (SELECT count(*) FROM clips t WHERE content_item_id NOT LIKE 'dddddddd-%' AND row_to_json(t)::text LIKE '%demo-sn-ep%'), 0, 0),
  ('any row still naming a demo recording file (non-FK; 1 = yes)',
   ((SELECT count(*) FROM content_items t WHERE row_to_json(t)::text LIKE '%demo-sn-ep%')
    + (SELECT count(*) FROM attempts t WHERE row_to_json(t)::text LIKE '%demo-sn-ep%')
    + (SELECT count(*) FROM clips t WHERE row_to_json(t)::text LIKE '%demo-sn-ep%') > 0)::int, 1, 0);
