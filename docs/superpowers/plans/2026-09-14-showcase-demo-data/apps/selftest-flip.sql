-- Selftest declaration with the delete order WRONG (parents before children): the ON DELETE CASCADE
-- from item removes the demo children first, so deleting child must report 0 != 2 and abort (G9).
DO $$ BEGIN
  IF current_database() <> 'showcase_gate_selftest' THEN
    RAISE EXCEPTION 'GATE FAIL G1 database: connected to %, expected showcase_gate_selftest', current_database();
  END IF;
END $$;

INSERT INTO gate_scope (tbl, pkcol, ids, expected, del_order) VALUES
  ('item',    'id', ARRAY(SELECT id::text FROM item WHERE owner_id = 2),   2, 10),
  ('child',   'id', ARRAY(SELECT id::text FROM child WHERE note = 'demo'), 2, 20),
  ('owner_t', 'id', ARRAY(SELECT id::text FROM owner_t WHERE id = 2),      1, 30);
INSERT INTO gate_parent VALUES ('shared_parent');
INSERT INTO gate_fk_allow VALUES
  ('child', 'item_id', 'item'), ('item', 'owner_id', 'owner_t'), ('watcher', 'item_id', 'item');
