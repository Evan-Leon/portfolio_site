-- Selftest declaration: demo = owner 2, its items, and children noted 'demo'.
DO $$ BEGIN
  IF current_database() <> 'showcase_gate_selftest' THEN
    RAISE EXCEPTION 'GATE FAIL G1 database: connected to %, expected showcase_gate_selftest', current_database();
  END IF;
  IF (SELECT count(*) FROM owner_t WHERE id = 2 AND email = 'demo@example.com') <> 1 THEN
    RAISE EXCEPTION 'GATE FAIL G1 anchor: owner 2 is not demo@example.com';
  END IF;
END $$;

INSERT INTO gate_scope (tbl, pkcol, ids, expected, del_order) VALUES
  ('child',   'id', ARRAY(SELECT id::text FROM child WHERE note = 'demo'), 2, 10),
  ('item',    'id', ARRAY(SELECT id::text FROM item WHERE owner_id = 2),   2, 20),
  ('owner_t', 'id', ARRAY(SELECT id::text FROM owner_t WHERE id = 2),      1, 30);
INSERT INTO gate_parent VALUES ('shared_parent');
INSERT INTO gate_fk_allow VALUES
  ('child', 'item_id', 'item'), ('item', 'owner_id', 'owner_t'), ('watcher', 'item_id', 'item');
INSERT INTO gate_extra VALUES
  ('demo owner has no non-demo items', (SELECT count(*) FROM item WHERE owner_id = 2 AND note <> 'demo'), 0);
