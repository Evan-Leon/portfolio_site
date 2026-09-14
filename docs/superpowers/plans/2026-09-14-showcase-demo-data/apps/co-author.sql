-- co-author (database co_author): demo user 2 "demo@example.com" and story 7 "The Lighthouse at Kestrel Point".
DO $$ BEGIN
  IF current_database() <> 'co_author' THEN
    RAISE EXCEPTION 'GATE FAIL G1 database: connected to %, expected co_author', current_database();
  END IF;
  IF (SELECT max(name) FROM django_migrations WHERE app NOT IN ('admin','auth','contenttypes','sessions')) <> '0013_alter_blacklistedtoken_options_and_more' THEN
    RAISE EXCEPTION 'GATE FAIL G1 schema head changed';
  END IF;
  IF (SELECT count(*) FROM auth_user WHERE id = 2 AND email = 'demo@example.com') <> 1 THEN
    RAISE EXCEPTION 'GATE FAIL G1 anchor: auth_user 2 is not demo@example.com';
  END IF;
  IF (SELECT count(*) FROM stories_story WHERE id = 7 AND owner_id = 2 AND title = 'The Lighthouse at Kestrel Point') <> 1 THEN
    RAISE EXCEPTION 'GATE FAIL G1 anchor: story 7 is not the demo story owned by user 2';
  END IF;
END $$;

CREATE TEMP TABLE d_char  AS SELECT id FROM characters_character       WHERE story_id = 7;
CREATE TEMP TABLE d_set   AS SELECT id FROM settings_places_setting    WHERE story_id = 7;
CREATE TEMP TABLE d_event AS SELECT id FROM events_event               WHERE story_id = 7;
CREATE TEMP TABLE d_rel   AS SELECT id FROM relationships_relationship WHERE story_id = 7;
CREATE TEMP TABLE d_oq    AS SELECT id FROM open_questions_openquestion WHERE story_id = 7;
CREATE TEMP TABLE d_beat  AS SELECT id FROM beats_beat                 WHERE story_id = 7;

INSERT INTO gate_scope (tbl, pkcol, ids, expected, del_order) VALUES
  ('token_blacklist_blacklistedtoken', 'id', ARRAY(SELECT id::text FROM token_blacklist_blacklistedtoken
      WHERE token_id IN (SELECT id FROM token_blacklist_outstandingtoken WHERE user_id = 2)), 0, 10),
  ('token_blacklist_outstandingtoken', 'id', ARRAY(SELECT id::text FROM token_blacklist_outstandingtoken WHERE user_id = 2), 16, 20),
  ('beat_drafts_beatdraft', 'id', ARRAY(SELECT id::text FROM beat_drafts_beatdraft WHERE beat_id IN (SELECT id FROM d_beat)), 3, 30),
  ('beats_beat_characters', 'id', ARRAY(SELECT id::text FROM beats_beat_characters
      WHERE beat_id IN (SELECT id FROM d_beat) OR character_id IN (SELECT id FROM d_char)), 14, 40),
  ('beats_beat_events', 'id', ARRAY(SELECT id::text FROM beats_beat_events
      WHERE beat_id IN (SELECT id FROM d_beat) OR event_id IN (SELECT id FROM d_event)), 6, 50),
  ('events_event_characters', 'id', ARRAY(SELECT id::text FROM events_event_characters
      WHERE event_id IN (SELECT id FROM d_event) OR character_id IN (SELECT id FROM d_char)), 15, 60),
  ('open_questions_openquestion_linked_characters', 'id', ARRAY(SELECT id::text FROM open_questions_openquestion_linked_characters
      WHERE openquestion_id IN (SELECT id FROM d_oq) OR character_id IN (SELECT id FROM d_char)), 7, 70),
  ('open_questions_openquestion_linked_events', 'id', ARRAY(SELECT id::text FROM open_questions_openquestion_linked_events
      WHERE openquestion_id IN (SELECT id FROM d_oq) OR event_id IN (SELECT id FROM d_event)), 4, 80),
  ('open_questions_openquestion_linked_relationships', 'id', ARRAY(SELECT id::text FROM open_questions_openquestion_linked_relationships
      WHERE openquestion_id IN (SELECT id FROM d_oq) OR relationship_id IN (SELECT id FROM d_rel)), 0, 90),
  ('open_questions_openquestion_linked_settings', 'id', ARRAY(SELECT id::text FROM open_questions_openquestion_linked_settings
      WHERE openquestion_id IN (SELECT id FROM d_oq) OR setting_id IN (SELECT id FROM d_set)), 0, 100),
  ('beats_beat', 'id', ARRAY(SELECT id::text FROM d_beat), 5, 110),
  ('open_questions_openquestion', 'id', ARRAY(SELECT id::text FROM d_oq), 4, 120),
  ('relationships_relationship', 'id', ARRAY(SELECT id::text FROM d_rel), 3, 130),
  ('events_event', 'id', ARRAY(SELECT id::text FROM d_event), 6, 140),
  ('characters_character', 'id', ARRAY(SELECT id::text FROM d_char), 5, 150),
  ('settings_places_setting', 'id', ARRAY(SELECT id::text FROM d_set), 4, 160),
  ('stories_story', 'id', ARRAY(SELECT id::text FROM stories_story WHERE owner_id = 2), 1, 170),
  ('auth_user_groups', 'id', ARRAY(SELECT id::text FROM auth_user_groups WHERE user_id = 2), 0, 180),
  ('auth_user_user_permissions', 'id', ARRAY(SELECT id::text FROM auth_user_user_permissions WHERE user_id = 2), 0, 190),
  ('django_admin_log', 'id', ARRAY(SELECT id::text FROM django_admin_log WHERE user_id = 2), 0, 200),
  ('auth_user', 'id', ARRAY(SELECT id::text FROM auth_user WHERE id = 2), 1, 210);

INSERT INTO gate_fk_allow (conrelid, col, confrelid) VALUES
  ('auth_user_groups', 'user_id', 'auth_user'),
  ('auth_user_user_permissions', 'user_id', 'auth_user'),
  ('beat_drafts_beatdraft', 'beat_id', 'beats_beat'),
  ('beat_drafts_draftrequest', 'beat_id', 'beats_beat'),
  ('beat_proposals_beatproposalrequest', 'story_id', 'stories_story'),
  ('beats_beat', 'setting_id', 'settings_places_setting'),
  ('beats_beat', 'story_id', 'stories_story'),
  ('beats_beat_characters', 'beat_id', 'beats_beat'),
  ('beats_beat_characters', 'character_id', 'characters_character'),
  ('beats_beat_events', 'beat_id', 'beats_beat'),
  ('beats_beat_events', 'event_id', 'events_event'),
  ('characters_character', 'story_id', 'stories_story'),
  ('django_admin_log', 'user_id', 'auth_user'),
  ('element_generations_elementgenerationrequest', 'character_id', 'characters_character'),
  ('element_generations_elementgenerationrequest', 'event_id', 'events_event'),
  ('element_generations_elementgenerationrequest', 'open_question_id', 'open_questions_openquestion'),
  ('element_generations_elementgenerationrequest', 'relationship_id', 'relationships_relationship'),
  ('element_generations_elementgenerationrequest', 'setting_id', 'settings_places_setting'),
  ('element_generations_elementgenerationrequest', 'story_id', 'stories_story'),
  ('element_proposals_elementproposalrequest', 'story_id', 'stories_story'),
  ('events_event', 'setting_id', 'settings_places_setting'),
  ('events_event', 'story_id', 'stories_story'),
  ('events_event_characters', 'character_id', 'characters_character'),
  ('events_event_characters', 'event_id', 'events_event'),
  ('open_questions_openquestion', 'story_id', 'stories_story'),
  ('open_questions_openquestion_linked_characters', 'character_id', 'characters_character'),
  ('open_questions_openquestion_linked_characters', 'openquestion_id', 'open_questions_openquestion'),
  ('open_questions_openquestion_linked_events', 'event_id', 'events_event'),
  ('open_questions_openquestion_linked_events', 'openquestion_id', 'open_questions_openquestion'),
  ('open_questions_openquestion_linked_relationships', 'openquestion_id', 'open_questions_openquestion'),
  ('open_questions_openquestion_linked_relationships', 'relationship_id', 'relationships_relationship'),
  ('open_questions_openquestion_linked_settings', 'openquestion_id', 'open_questions_openquestion'),
  ('open_questions_openquestion_linked_settings', 'setting_id', 'settings_places_setting'),
  ('relationships_relationship', 'character_a_id', 'characters_character'),
  ('relationships_relationship', 'character_b_id', 'characters_character'),
  ('relationships_relationship', 'story_id', 'stories_story'),
  ('research_requests_researchrequest', 'story_id', 'stories_story'),
  ('research_requests_researchrequest', 'subject_character_id', 'characters_character'),
  ('research_requests_researchrequest', 'subject_event_id', 'events_event'),
  ('research_requests_researchrequest', 'subject_setting_id', 'settings_places_setting'),
  ('settings_places_setting', 'story_id', 'stories_story'),
  ('stories_story', 'owner_id', 'auth_user'),
  ('timeline_timelinedivider', 'story_id', 'stories_story'),
  ('timeline_timelineorderingrequest', 'story_id', 'stories_story'),
  ('token_blacklist_blacklistedtoken', 'token_id', 'token_blacklist_outstandingtoken'),
  ('token_blacklist_outstandingtoken', 'user_id', 'auth_user');

INSERT INTO gate_extra VALUES
  ('outstanding tokens with no user (SET NULL residue)', (SELECT count(*) FROM token_blacklist_outstandingtoken WHERE user_id IS NULL), 0);
