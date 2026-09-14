-- Selftest declaration with the delete order WRONG (parents before children): the ON DELETE CASCADE
-- from item removes the demo children first, so deleting child must report 0 != 2 and abort (G9).
DO $$ BEGIN
  PERFORM pg_temp.gate_g1('database is showcase_gate_selftest', (current_database() = 'showcase_gate_selftest')::int, 1, 1);
END $$;

INSERT INTO gate_scope (tbl, pkcol, ids, expected, del_order) VALUES
  ('item',    'id', ARRAY(SELECT id::text FROM item WHERE owner_id = 2),   2, 10),
  ('child',   'id', ARRAY(SELECT id::text FROM child WHERE note = 'demo'), 2, 20),
  ('owner_t', 'id', ARRAY(SELECT id::text FROM owner_t WHERE id = 2),      1, 30);
INSERT INTO gate_parent VALUES ('shared_parent');
INSERT INTO gate_fk_allow VALUES
  ('child', 'item_id', 'item', 'c'), ('item', 'owner_id', 'owner_t', 'a'), ('watcher', 'item_id', 'item', 'n');
INSERT INTO gate_trigger_allow VALUES ('child', 'child_noop', '5c90ecbd1e54323c7792af3f46c27ff49eadbee21ae91c50c45a0c116dd69173');
