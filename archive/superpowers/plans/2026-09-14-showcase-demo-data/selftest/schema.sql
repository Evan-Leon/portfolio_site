-- Fixture for gate selftest — runs ONLY in database showcase_gate_selftest.
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
CREATE TABLE shared_parent (id int PRIMARY KEY, label text NOT NULL);
CREATE TABLE forbidden_parent (id int PRIMARY KEY);
CREATE TABLE owner_t (id int PRIMARY KEY, email text NOT NULL);
CREATE TABLE item (id int PRIMARY KEY, owner_id int NOT NULL REFERENCES owner_t(id),
                   parent_id int REFERENCES shared_parent(id), note text NOT NULL);
CREATE TABLE child (id int PRIMARY KEY, item_id int NOT NULL REFERENCES item(id) ON DELETE CASCADE, note text NOT NULL);
CREATE TABLE watcher (id int PRIMARY KEY, item_id int REFERENCES item(id) ON DELETE SET NULL);
INSERT INTO shared_parent VALUES (1, 'shared one'), (2, 'shared two');
INSERT INTO forbidden_parent VALUES (5);
INSERT INTO owner_t VALUES (1, 'real@person.test'), (2, 'demo@example.com');
INSERT INTO item VALUES (10, 1, 1, 'real'), (20, 2, 1, 'demo'), (21, 2, 2, 'demo');
INSERT INTO child VALUES (100, 10, 'real'), (200, 20, 'demo'), (201, 21, 'demo');
INSERT INTO watcher VALUES (1000, 10);
