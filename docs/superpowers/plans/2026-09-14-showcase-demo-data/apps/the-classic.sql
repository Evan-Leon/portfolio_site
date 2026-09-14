-- the-classic (local Supabase, database postgres): demo auth user 921fafc9-…, tournament dddddddd-…, its course.
DO $$ BEGIN
  IF current_database() <> 'postgres' OR NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    RAISE EXCEPTION 'GATE FAIL G1 database: % is not a Supabase postgres database', current_database();
  END IF;
  IF (SELECT max(version) FROM supabase_migrations.schema_migrations) <> '20260725110612' THEN
    RAISE EXCEPTION 'GATE FAIL G1 schema head changed';
  END IF;
  IF (SELECT count(*) FROM auth.users WHERE id = '921fafc9-d77f-4b55-b57e-7422f39c30f3' AND email = 'demo@example.com') <> 1 THEN
    RAISE EXCEPTION 'GATE FAIL G1 anchor: auth user 921fafc9 is not demo@example.com';
  END IF;
  IF (SELECT count(*) FROM public.tournaments
      WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' AND organizer_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3') <> 1 THEN
    RAISE EXCEPTION 'GATE FAIL G1 anchor: demo tournament is missing or not organized by the demo user';
  END IF;
END $$;

INSERT INTO gate_scope (tbl, pkcol, ids, expected, del_order) VALUES
  ('auth.mfa_amr_claims', 'id', ARRAY(SELECT id::text FROM auth.mfa_amr_claims WHERE session_id IN
      (SELECT id FROM auth.sessions WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3')), 4, 10),
  ('auth.refresh_tokens', 'id', ARRAY(SELECT id::text FROM auth.refresh_tokens
      WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'
         OR session_id IN (SELECT id FROM auth.sessions WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3')), 4, 20),
  ('auth.sessions', 'id', ARRAY(SELECT id::text FROM auth.sessions WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 4, 30),
  ('auth.mfa_challenges', 'id', ARRAY(SELECT id::text FROM auth.mfa_challenges WHERE factor_id IN
      (SELECT id FROM auth.mfa_factors WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3')), 0, 40),
  ('auth.mfa_factors', 'id', ARRAY(SELECT id::text FROM auth.mfa_factors WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 0, 50),
  ('auth.one_time_tokens', 'id', ARRAY(SELECT id::text FROM auth.one_time_tokens WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 0, 60),
  ('auth.oauth_authorizations', 'id', ARRAY(SELECT id::text FROM auth.oauth_authorizations WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 0, 70),
  ('auth.oauth_consents', 'id', ARRAY(SELECT id::text FROM auth.oauth_consents WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 0, 80),
  ('auth.webauthn_challenges', 'id', ARRAY(SELECT id::text FROM auth.webauthn_challenges WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 0, 90),
  ('auth.webauthn_credentials', 'id', ARRAY(SELECT id::text FROM auth.webauthn_credentials WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 0, 100),
  ('auth.identities', 'id', ARRAY(SELECT id::text FROM auth.identities WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 1, 110),
  ('public.player_scores', 'id', ARRAY(SELECT id::text FROM public.player_scores
      WHERE score_id IN (SELECT id FROM public.scores WHERE tournament_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd')
         OR tournament_player_id IN (SELECT id FROM public.tournament_players WHERE tournament_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd')), 0, 120),
  ('public.chat_messages', 'id', ARRAY(SELECT id::text FROM public.chat_messages WHERE tournament_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 6, 130),
  ('public.accolades', 'id', ARRAY(SELECT id::text FROM public.accolades WHERE tournament_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 6, 140),
  ('public.scores', 'id', ARRAY(SELECT id::text FROM public.scores WHERE tournament_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 37, 150),
  ('public.tournament_players', 'id', ARRAY(SELECT id::text FROM public.tournament_players WHERE tournament_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 12, 160),
  ('public.foursomes', 'id', ARRAY(SELECT id::text FROM public.foursomes WHERE tournament_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 3, 170),
  ('public.tournaments', 'id', ARRAY(SELECT id::text FROM public.tournaments WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 1, 180),
  ('public.course_holes', 'id', ARRAY(SELECT id::text FROM public.course_holes WHERE course_id IN
      (SELECT id FROM public.courses WHERE created_by = '921fafc9-d77f-4b55-b57e-7422f39c30f3')), 18, 190),
  ('public.courses', 'id', ARRAY(SELECT id::text FROM public.courses WHERE created_by = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 1, 200),
  ('public.profiles', 'id', ARRAY(SELECT id::text FROM public.profiles WHERE id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 1, 210),
  ('auth.users', 'id', ARRAY(SELECT id::text FROM auth.users WHERE id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 1, 220);

INSERT INTO gate_fk_allow (conrelid, col, confrelid) VALUES
  ('auth.identities', 'user_id', 'auth.users'),
  ('auth.mfa_amr_claims', 'session_id', 'auth.sessions'),
  ('auth.mfa_challenges', 'factor_id', 'auth.mfa_factors'),
  ('auth.mfa_factors', 'user_id', 'auth.users'),
  ('auth.oauth_authorizations', 'user_id', 'auth.users'),
  ('auth.oauth_consents', 'user_id', 'auth.users'),
  ('auth.one_time_tokens', 'user_id', 'auth.users'),
  ('auth.refresh_tokens', 'session_id', 'auth.sessions'),
  ('auth.sessions', 'user_id', 'auth.users'),
  ('auth.webauthn_challenges', 'user_id', 'auth.users'),
  ('auth.webauthn_credentials', 'user_id', 'auth.users'),
  ('public.accolades', 'entered_by', 'public.profiles'),
  ('public.accolades', 'foursome_id', 'public.foursomes'),
  ('public.accolades', 'tournament_id', 'public.tournaments'),
  ('public.chat_messages', 'score_id', 'public.scores'),
  ('public.chat_messages', 'sender_id', 'public.profiles'),
  ('public.chat_messages', 'tournament_id', 'public.tournaments'),
  ('public.chat_reads', 'tournament_id', 'public.tournaments'),
  ('public.chat_reads', 'user_id', 'public.profiles'),
  ('public.course_holes', 'course_id', 'public.courses'),
  ('public.courses', 'created_by', 'public.profiles'),
  ('public.foursomes', 'tournament_id', 'public.tournaments'),
  ('public.player_scores', 'score_id', 'public.scores'),
  ('public.player_scores', 'tournament_player_id', 'public.tournament_players'),
  ('public.profiles', 'id', 'auth.users'),
  ('public.scores', 'drive_used_by', 'public.tournament_players'),
  ('public.scores', 'entered_by', 'public.profiles'),
  ('public.scores', 'foursome_id', 'public.foursomes'),
  ('public.scores', 'tournament_id', 'public.tournaments'),
  ('public.tournament_chirp_settings', 'tournament_id', 'public.tournaments'),
  ('public.tournament_players', 'claim_requested_by', 'public.profiles'),
  ('public.tournament_players', 'foursome_id', 'public.foursomes'),
  ('public.tournament_players', 'player_id', 'public.profiles'),
  ('public.tournament_players', 'tournament_id', 'public.tournaments'),
  ('public.tournaments', 'course_id', 'public.courses'),
  ('public.tournaments', 'organizer_id', 'public.profiles');

-- Reviewed 2026-09-14 with pg_get_functiondef. On this delete's path only chat_messages_deny_delete fires, and it
-- raises only for current_role = 'authenticated'; the gate runs as postgres, so it returns OLD. The UPDATE triggers
-- cannot fire: every ON DELETE SET NULL into scores / tournament_players / chat_messages targets rows this gate
-- deletes earlier (del_order), and no statement here updates. The rehearsal proves both.
INSERT INTO gate_trigger_allow (tbl, tgname) VALUES
  ('public.chat_messages', 'chat_messages_deny_delete_trigger'),
  ('public.foursomes', 'auto_complete_tournament_trigger'),
  ('public.player_scores', 'compute_team_score_trigger'),   -- AFTER INSERT/UPDATE only; the demo scope has 0 player_scores
  ('public.profiles', 'enforce_no_self_role_change'),
  ('public.scores', 'validate_score_trigger'),
  ('public.tournament_players', 'trg_enforce_foursome_capacity_update'),
  ('public.tournaments', 'trg_validate_status_transition');

INSERT INTO gate_extra VALUES
  ('demo course id starts d0000000-', (SELECT count(*) FROM public.courses
     WHERE created_by = '921fafc9-d77f-4b55-b57e-7422f39c30f3' AND id::text LIKE 'd0000000-%'), 1),
  ('storage objects owned by demo user', (SELECT count(*) FROM storage.objects
     WHERE owner = '921fafc9-d77f-4b55-b57e-7422f39c30f3' OR owner_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 0),
  ('auth.flow_state rows for demo user (non-FK)', (SELECT count(*) FROM auth.flow_state
     WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 0),
  ('refresh tokens whose user_id and session disagree', (SELECT count(*) FROM auth.refresh_tokens r
     WHERE (r.user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3')
        <> (r.session_id IN (SELECT id FROM auth.sessions WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'))), 0),
  ('other tournaments on the demo course', (SELECT count(*) FROM public.tournaments
     WHERE course_id IN (SELECT id FROM public.courses WHERE created_by = '921fafc9-d77f-4b55-b57e-7422f39c30f3')
       AND id <> 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 0);
