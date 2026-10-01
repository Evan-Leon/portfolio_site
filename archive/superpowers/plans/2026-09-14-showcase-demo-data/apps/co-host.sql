-- co-host (database co_host): demo channel ch_b11b31a0d9ae "The Long Fuse" and everything under it.
-- Its one piece of CHUD residue (a source-bundle artifact) is removed by the separate co-host-chud declaration.
DO $$ BEGIN
  PERFORM pg_temp.gate_g1('database is co_host', (current_database() = 'co_host')::int, 1, 1);
  PERFORM pg_temp.gate_pin('migration manifest',
    pg_temp.gate_sha((SELECT string_agg(version::text, ',' ORDER BY version) FROM schema_migrations)),
    '6d5a6b5fed2559e966a4b198903fa4718bffb88c043c89f926224ab75ba919a0');
  PERFORM pg_temp.gate_g1('channel ch_b11b31a0d9ae is "The Long Fuse"',
    (SELECT count(*) FROM channels WHERE id = 'ch_b11b31a0d9ae' AND name = 'The Long Fuse'), 1, 0);
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

INSERT INTO gate_fk_allow (conrelid, col, confrelid, deltype) VALUES
  ('beat_sheet_versions', 'episode_id', 'episodes', 'a'),
  ('bible_amendments', 'channel_id', 'channels', 'a'),
  ('character_bible_versions', 'channel_id', 'channels', 'a'),
  ('character_bibles', 'channel_id', 'channels', 'a'),
  ('chud_jobs', 'channel_id', 'channels', 'a'),
  ('chud_jobs', 'episode_id', 'episodes', 'a'),
  ('episodes', 'channel_id', 'channels', 'a'),
  ('episodes', 'premise_id', 'premises', 'a'),
  ('premises', 'channel_id', 'channels', 'a'),
  ('reviews', 'episode_id', 'episodes', 'a'),
  ('script_versions', 'episode_id', 'episodes', 'a'),
  ('show_bible_versions', 'channel_id', 'channels', 'a'),
  ('show_bibles', 'channel_id', 'channels', 'a'),
  ('table_reads', 'episode_id', 'episodes', 'a'),
  ('timeline_events', 'episode_id', 'episodes', 'a');

INSERT INTO gate_extra (label, n, expected, post_expected) VALUES
  ('demo episode ids are exactly the two recorded', (SELECT count(*) FROM episodes
     WHERE channel_id = 'ch_b11b31a0d9ae' AND id IN ('ep_a78a3f018922', 'ep_df1c614c159e')), 2, 0),
  ('bible amendments elsewhere citing a demo episode (non-FK)', (SELECT count(*) FROM bible_amendments
     WHERE source_episode_id IN ('ep_a78a3f018922', 'ep_df1c614c159e') AND channel_id <> 'ch_b11b31a0d9ae'), 0, 0),
  ('channels total (1 demo + 6 real)', (SELECT count(*) FROM channels), 7, 6),
  ('the demo chud job job_fba52731d285', (SELECT count(*) FROM chud_jobs WHERE id = 'job_fba52731d285'), 1, 0),
  ('rows anywhere else naming the demo show (non-FK)',
   (SELECT count(*) FROM channels t WHERE id <> 'ch_b11b31a0d9ae' AND row_to_json(t)::text ~* '(the long fuse|great molasses flood|year without a summer)')
   + (SELECT count(*) FROM episodes t WHERE channel_id <> 'ch_b11b31a0d9ae' AND row_to_json(t)::text ~* '(the long fuse|great molasses flood|year without a summer)'), 0, 0);
