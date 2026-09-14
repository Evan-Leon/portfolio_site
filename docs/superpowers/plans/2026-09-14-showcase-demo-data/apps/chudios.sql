-- chudios (database chudios): the fictional "Signal & Noise" show — 6 content items with ids beginning dddddddd-.
-- The three demo .m4a files in the recordings volume are handled by the plan's file protocol, not here.
DO $$ BEGIN
  IF current_database() <> 'chudios' THEN
    RAISE EXCEPTION 'GATE FAIL G1 database: connected to %, expected chudios', current_database();
  END IF;
  IF (SELECT max(version) FROM schema_migrations) <> '0010_qc_script_diff.sql' THEN
    RAISE EXCEPTION 'GATE FAIL G1 schema head changed';
  END IF;
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

INSERT INTO gate_fk_allow (conrelid, col, confrelid) VALUES
  ('attempts', 'content_item_id', 'content_items'),
  ('clips', 'content_item_id', 'content_items'),
  ('content_items', 'current_attempt_id', 'attempts'),
  ('marketing_assets', 'content_item_id', 'content_items'),
  ('published_status', 'content_item_id', 'content_items'),
  ('qc_reports', 'attempt_id', 'attempts'),
  ('qc_reports', 'content_item_id', 'content_items'),
  ('qc_reports', 'stage_run_id', 'stage_runs'),
  ('stage_runs', 'attempt_id', 'attempts'),
  ('stage_runs', 'content_item_id', 'content_items'),
  ('transcripts', 'attempt_id', 'attempts'),
  ('transcripts', 'content_item_id', 'content_items');

INSERT INTO gate_extra VALUES
  ('content items total (6 demo + 8 real)', (SELECT count(*) FROM content_items), 14),
  ('non-demo rows naming a demo recording file (non-FK)',
   (SELECT count(*) FROM content_items t WHERE id NOT LIKE 'dddddddd-%' AND row_to_json(t)::text LIKE '%demo-sn-ep%')
   + (SELECT count(*) FROM attempts t WHERE content_item_id NOT LIKE 'dddddddd-%' AND row_to_json(t)::text LIKE '%demo-sn-ep%')
   + (SELECT count(*) FROM clips t WHERE content_item_id NOT LIKE 'dddddddd-%' AND row_to_json(t)::text LIKE '%demo-sn-ep%'), 0);
