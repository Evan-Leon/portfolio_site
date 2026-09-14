-- co-host (database co_host): demo channel ch_b11b31a0d9ae "The Long Fuse" and everything under it.
DO $$ BEGIN
  IF current_database() <> 'co_host' THEN
    RAISE EXCEPTION 'GATE FAIL G1 database: connected to %, expected co_host', current_database();
  END IF;
  IF (SELECT max(version) FROM schema_migrations) <> '0007_handoff_reason_code.sql' THEN
    RAISE EXCEPTION 'GATE FAIL G1 schema head changed';
  END IF;
  IF (SELECT count(*) FROM channels WHERE id = 'ch_b11b31a0d9ae' AND name = 'The Long Fuse') <> 1 THEN
    RAISE EXCEPTION 'GATE FAIL G1 anchor: channel ch_b11b31a0d9ae is not "The Long Fuse"';
  END IF;
END $$;

CREATE TEMP TABLE demo_episodes AS SELECT id FROM episodes WHERE channel_id = 'ch_b11b31a0d9ae';

INSERT INTO gate_scope (tbl, pkcol, ids, expected, del_order) VALUES
  ('timeline_events', 'id', ARRAY(SELECT id FROM timeline_events WHERE episode_id IN (SELECT id FROM demo_episodes)), 7, 10),
  ('table_reads', 'id', ARRAY(SELECT id FROM table_reads WHERE episode_id IN (SELECT id FROM demo_episodes)), 1, 20),
  ('reviews', 'id', ARRAY(SELECT id FROM reviews WHERE episode_id IN (SELECT id FROM demo_episodes)), 0, 30),
  ('script_versions', 'id', ARRAY(SELECT id FROM script_versions WHERE episode_id IN (SELECT id FROM demo_episodes)), 2, 40),
  ('beat_sheet_versions', 'id', ARRAY(SELECT id FROM beat_sheet_versions WHERE episode_id IN (SELECT id FROM demo_episodes)), 2, 50),
  ('chud_jobs', 'id', ARRAY(SELECT id FROM chud_jobs
      WHERE channel_id = 'ch_b11b31a0d9ae' OR episode_id IN (SELECT id FROM demo_episodes)), 1, 60),
  ('episodes', 'id', ARRAY(SELECT id FROM demo_episodes), 2, 70),
  ('premises', 'id', ARRAY(SELECT id FROM premises WHERE channel_id = 'ch_b11b31a0d9ae'), 2, 80),
  ('bible_amendments', 'id', ARRAY(SELECT id FROM bible_amendments
      WHERE channel_id = 'ch_b11b31a0d9ae' OR source_episode_id IN (SELECT id FROM demo_episodes)), 0, 90),
  ('character_bible_versions', 'id', ARRAY(SELECT id FROM character_bible_versions WHERE channel_id = 'ch_b11b31a0d9ae'), 0, 100),
  ('character_bibles', 'channel_id', ARRAY(SELECT channel_id FROM character_bibles WHERE channel_id = 'ch_b11b31a0d9ae'), 0, 110),
  ('show_bible_versions', 'id', ARRAY(SELECT id FROM show_bible_versions WHERE channel_id = 'ch_b11b31a0d9ae'), 1, 120),
  ('show_bibles', 'channel_id', ARRAY(SELECT channel_id FROM show_bibles WHERE channel_id = 'ch_b11b31a0d9ae'), 1, 130),
  ('channels', 'id', ARRAY(SELECT id FROM channels WHERE id = 'ch_b11b31a0d9ae'), 1, 140);

INSERT INTO gate_fk_allow (conrelid, col, confrelid) VALUES
  ('beat_sheet_versions', 'episode_id', 'episodes'),
  ('bible_amendments', 'channel_id', 'channels'),
  ('character_bible_versions', 'channel_id', 'channels'),
  ('character_bibles', 'channel_id', 'channels'),
  ('chud_jobs', 'channel_id', 'channels'),
  ('chud_jobs', 'episode_id', 'episodes'),
  ('episodes', 'channel_id', 'channels'),
  ('episodes', 'premise_id', 'premises'),
  ('premises', 'channel_id', 'channels'),
  ('reviews', 'episode_id', 'episodes'),
  ('script_versions', 'episode_id', 'episodes'),
  ('show_bible_versions', 'channel_id', 'channels'),
  ('show_bibles', 'channel_id', 'channels'),
  ('table_reads', 'episode_id', 'episodes'),
  ('timeline_events', 'episode_id', 'episodes');

INSERT INTO gate_extra VALUES
  ('demo episode ids are exactly the two recorded', (SELECT count(*) FROM demo_episodes
     WHERE id IN ('ep_a78a3f018922', 'ep_df1c614c159e')), 2),
  ('bible amendments elsewhere citing a demo episode (non-FK)', (SELECT count(*) FROM bible_amendments
     WHERE source_episode_id IN (SELECT id FROM demo_episodes) AND channel_id <> 'ch_b11b31a0d9ae'), 0),
  ('channels total (1 demo + 6 real)', (SELECT count(*) FROM channels), 7),
  ('the only demo chud job is job_fba52731d285', (SELECT count(*) FROM chud_jobs
     WHERE (channel_id = 'ch_b11b31a0d9ae' OR episode_id IN (SELECT id FROM demo_episodes)) AND id = 'job_fba52731d285'), 1);
