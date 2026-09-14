-- co-author (database co_author): demo user 2 "demo@example.com" and story 7 "The Lighthouse at Kestrel Point".
DO $$ BEGIN
  PERFORM pg_temp.gate_g1('database is co_author', (current_database() = 'co_author')::int, 1, 1);
  PERFORM pg_temp.gate_pin('django migration manifest',
    pg_temp.gate_sha((SELECT string_agg(app || '.' || name, ',' ORDER BY app, name) FROM django_migrations)),
    '117d407112a46d5037c4f19d990cd7a82a85bc61aff27226d39094e429da3797');
  PERFORM pg_temp.gate_g1('auth_user 2 is demo@example.com', (SELECT count(*) FROM auth_user WHERE id = 2 AND email = 'demo@example.com'), 1, 0);
  PERFORM pg_temp.gate_g1('story 7 is the demo story owned by user 2',
    (SELECT count(*) FROM stories_story WHERE id = 7 AND owner_id = 2 AND title = 'The Lighthouse at Kestrel Point'), 1, 0);
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

-- deltype: Django enforces on_delete in Python (SimpleJWT's SET_NULL included), so every constraint is NO ACTION ('a').
INSERT INTO gate_fk_allow (conrelid, col, confrelid, deltype) VALUES
  ('auth_user_groups', 'user_id', 'auth_user', 'a'),
  ('auth_user_user_permissions', 'user_id', 'auth_user', 'a'),
  ('beat_drafts_beatdraft', 'beat_id', 'beats_beat', 'a'),
  ('beat_drafts_draftrequest', 'beat_id', 'beats_beat', 'a'),
  ('beat_proposals_beatproposalrequest', 'story_id', 'stories_story', 'a'),
  ('beats_beat', 'setting_id', 'settings_places_setting', 'a'),
  ('beats_beat', 'story_id', 'stories_story', 'a'),
  ('beats_beat_characters', 'beat_id', 'beats_beat', 'a'),
  ('beats_beat_characters', 'character_id', 'characters_character', 'a'),
  ('beats_beat_events', 'beat_id', 'beats_beat', 'a'),
  ('beats_beat_events', 'event_id', 'events_event', 'a'),
  ('characters_character', 'story_id', 'stories_story', 'a'),
  ('django_admin_log', 'user_id', 'auth_user', 'a'),
  ('element_generations_elementgenerationrequest', 'character_id', 'characters_character', 'a'),
  ('element_generations_elementgenerationrequest', 'event_id', 'events_event', 'a'),
  ('element_generations_elementgenerationrequest', 'open_question_id', 'open_questions_openquestion', 'a'),
  ('element_generations_elementgenerationrequest', 'relationship_id', 'relationships_relationship', 'a'),
  ('element_generations_elementgenerationrequest', 'setting_id', 'settings_places_setting', 'a'),
  ('element_generations_elementgenerationrequest', 'story_id', 'stories_story', 'a'),
  ('element_proposals_elementproposalrequest', 'story_id', 'stories_story', 'a'),
  ('events_event', 'setting_id', 'settings_places_setting', 'a'),
  ('events_event', 'story_id', 'stories_story', 'a'),
  ('events_event_characters', 'character_id', 'characters_character', 'a'),
  ('events_event_characters', 'event_id', 'events_event', 'a'),
  ('open_questions_openquestion', 'story_id', 'stories_story', 'a'),
  ('open_questions_openquestion_linked_characters', 'character_id', 'characters_character', 'a'),
  ('open_questions_openquestion_linked_characters', 'openquestion_id', 'open_questions_openquestion', 'a'),
  ('open_questions_openquestion_linked_events', 'event_id', 'events_event', 'a'),
  ('open_questions_openquestion_linked_events', 'openquestion_id', 'open_questions_openquestion', 'a'),
  ('open_questions_openquestion_linked_relationships', 'openquestion_id', 'open_questions_openquestion', 'a'),
  ('open_questions_openquestion_linked_relationships', 'relationship_id', 'relationships_relationship', 'a'),
  ('open_questions_openquestion_linked_settings', 'openquestion_id', 'open_questions_openquestion', 'a'),
  ('open_questions_openquestion_linked_settings', 'setting_id', 'settings_places_setting', 'a'),
  ('relationships_relationship', 'character_a_id', 'characters_character', 'a'),
  ('relationships_relationship', 'character_b_id', 'characters_character', 'a'),
  ('relationships_relationship', 'story_id', 'stories_story', 'a'),
  ('research_requests_researchrequest', 'story_id', 'stories_story', 'a'),
  ('research_requests_researchrequest', 'subject_character_id', 'characters_character', 'a'),
  ('research_requests_researchrequest', 'subject_event_id', 'events_event', 'a'),
  ('research_requests_researchrequest', 'subject_setting_id', 'settings_places_setting', 'a'),
  ('settings_places_setting', 'story_id', 'stories_story', 'a'),
  ('stories_story', 'owner_id', 'auth_user', 'a'),
  ('timeline_timelinedivider', 'story_id', 'stories_story', 'a'),
  ('timeline_timelineorderingrequest', 'story_id', 'stories_story', 'a'),
  ('token_blacklist_blacklistedtoken', 'token_id', 'token_blacklist_outstandingtoken', 'a'),
  ('token_blacklist_outstandingtoken', 'user_id', 'auth_user', 'a');

INSERT INTO gate_extra (label, n, expected, post_expected) VALUES
  ('outstanding tokens with no user (SET NULL residue)', (SELECT count(*) FROM token_blacklist_outstandingtoken WHERE user_id IS NULL), 0, 0),
  ('stories owned by user 2', (SELECT count(*) FROM stories_story WHERE owner_id = 2), 1, 0),
  ('other stories titled like the demo story', (SELECT count(*) FROM stories_story WHERE id <> 7 AND title ILIKE '%Kestrel Point%'), 0, 0);
