-- the-classic (local Supabase, database postgres): demo auth user 921fafc9-…, tournament dddddddd-…, its course,
-- and (decision D6, Evan 2026-09-14) the demo user's 5 rows in auth.audit_log_entries.
DO $$ BEGIN
  PERFORM pg_temp.gate_g1('database is a Supabase postgres',
    (current_database() = 'postgres' AND EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth'))::int, 1, 1);
  PERFORM pg_temp.gate_pin('public migration manifest',
    pg_temp.gate_sha((SELECT string_agg(version, ',' ORDER BY version) FROM supabase_migrations.schema_migrations)),
    '77be81c87aeebd032c3b0da0ea3aa432e43feb299fd7c2e5405ed07b6759af65');
  PERFORM pg_temp.gate_pin('auth (GoTrue) migration manifest',
    pg_temp.gate_sha((SELECT string_agg(version, ',' ORDER BY version) FROM auth.schema_migrations)),
    'c75b49fd13a77a9fa43bc21fe458be4e4bac48096cf510d8618172524c2fd65c');
  PERFORM pg_temp.gate_g1('auth user 921fafc9 is demo@example.com',
    (SELECT count(*) FROM auth.users WHERE id = '921fafc9-d77f-4b55-b57e-7422f39c30f3' AND email = 'demo@example.com'), 1, 0);
  PERFORM pg_temp.gate_g1('demo tournament organized by the demo user',
    (SELECT count(*) FROM public.tournaments
      WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' AND organizer_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 1, 0);
END $$;

INSERT INTO gate_scope (tbl, pkcol, ids, expected, del_order) VALUES
  ('auth.audit_log_entries', 'id', ARRAY(SELECT id::text FROM auth.audit_log_entries
      WHERE payload->>'actor_id' = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 5, 5),
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

-- deltype pinned from pg_constraint (c = CASCADE, n = SET NULL, r = RESTRICT). The explicit child-first order means
-- no cascade or SET NULL fires on a row outside the scope; the survivor hashes prove it.
INSERT INTO gate_fk_allow (conrelid, col, confrelid, deltype) VALUES
  ('auth.identities', 'user_id', 'auth.users', 'c'),
  ('auth.mfa_amr_claims', 'session_id', 'auth.sessions', 'c'),
  ('auth.mfa_challenges', 'factor_id', 'auth.mfa_factors', 'c'),
  ('auth.mfa_factors', 'user_id', 'auth.users', 'c'),
  ('auth.oauth_authorizations', 'user_id', 'auth.users', 'c'),
  ('auth.oauth_consents', 'user_id', 'auth.users', 'c'),
  ('auth.one_time_tokens', 'user_id', 'auth.users', 'c'),
  ('auth.refresh_tokens', 'session_id', 'auth.sessions', 'c'),
  ('auth.sessions', 'user_id', 'auth.users', 'c'),
  ('auth.webauthn_challenges', 'user_id', 'auth.users', 'c'),
  ('auth.webauthn_credentials', 'user_id', 'auth.users', 'c'),
  ('public.accolades', 'entered_by', 'public.profiles', 'r'),
  ('public.accolades', 'foursome_id', 'public.foursomes', 'c'),
  ('public.accolades', 'tournament_id', 'public.tournaments', 'c'),
  ('public.chat_messages', 'score_id', 'public.scores', 'n'),
  ('public.chat_messages', 'sender_id', 'public.profiles', 'n'),
  ('public.chat_messages', 'tournament_id', 'public.tournaments', 'c'),
  ('public.chat_reads', 'tournament_id', 'public.tournaments', 'c'),
  ('public.chat_reads', 'user_id', 'public.profiles', 'c'),
  ('public.course_holes', 'course_id', 'public.courses', 'c'),
  ('public.courses', 'created_by', 'public.profiles', 'c'),
  ('public.foursomes', 'tournament_id', 'public.tournaments', 'c'),
  ('public.player_scores', 'score_id', 'public.scores', 'c'),
  ('public.player_scores', 'tournament_player_id', 'public.tournament_players', 'r'),
  ('public.profiles', 'id', 'auth.users', 'c'),
  ('public.scores', 'drive_used_by', 'public.tournament_players', 'n'),
  ('public.scores', 'entered_by', 'public.profiles', 'r'),
  ('public.scores', 'foursome_id', 'public.foursomes', 'r'),
  ('public.scores', 'tournament_id', 'public.tournaments', 'c'),
  ('public.tournament_chirp_settings', 'tournament_id', 'public.tournaments', 'c'),
  ('public.tournament_players', 'claim_requested_by', 'public.profiles', 'n'),
  ('public.tournament_players', 'foursome_id', 'public.foursomes', 'r'),
  ('public.tournament_players', 'player_id', 'public.profiles', 'n'),
  ('public.tournament_players', 'tournament_id', 'public.tournaments', 'c'),
  ('public.tournaments', 'course_id', 'public.courses', 'n'),
  ('public.tournaments', 'organizer_id', 'public.profiles', 'c');

-- Reviewed 2026-09-14 (pg_get_functiondef); digests pin trigger definition + function body. On this delete's path
-- only chat_messages_deny_delete fires, and it raises only for current_role = 'authenticated'; the gate runs as
-- postgres, so it returns OLD. The UPDATE triggers cannot fire: every ON DELETE SET NULL into scores /
-- tournament_players / chat_messages targets rows this gate deletes earlier, and no statement here updates.
-- compute_team_score_trigger is AFTER INSERT/UPDATE on player_scores, and the demo scope has 0 player_scores.
-- tgtype and tgenabled pinned from pg_trigger (11 = ROW BEFORE DELETE, 17 = ROW AFTER UPDATE, 19 = ROW BEFORE UPDATE,
-- 21 = ROW AFTER INSERT|UPDATE, 23 = ROW BEFORE INSERT|UPDATE; 'O' = enabled in origin mode).
INSERT INTO gate_trigger_allow (tbl, tgname, tgtype, tgenabled, digest) VALUES
  ('public.chat_messages', 'chat_messages_deny_delete_trigger', 11, 'O', 'c439466c9d16842d4259a3c8b9e2e07dae653954267f35531bca5ca424e010f6'),
  ('public.foursomes', 'auto_complete_tournament_trigger', 17, 'O', '2947ba7c012857adea4af067435c4e4d89e34209c28d3723b7da977184a6ec74'),
  ('public.player_scores', 'compute_team_score_trigger', 21, 'O', '4995fe3277f3f681fbc21edcfe9cddea38dc9321eb43cba40569a9ef73e5a996'),
  ('public.profiles', 'enforce_no_self_role_change', 19, 'O', '5cd82bffe0b121c2da704a01f6f2a63524fe978e56df94daf023c5a58135df10'),
  ('public.scores', 'validate_score_trigger', 23, 'O', '71d075f313a8dcd127572c338c5d04544ac249fc9b61400b70fa121f36d92ba9'),
  ('public.tournament_players', 'trg_enforce_foursome_capacity_update', 19, 'O', '73c32368cdc8309994a584d4810d0696ac44c1dbc4411365a07a9762848ae8d1'),
  ('public.tournaments', 'trg_validate_status_transition', 19, 'O', '0735f76fb486aeadaf43489f146b316d8ddcbd32c5aaef1d851d36151fd6b297');

INSERT INTO gate_extra (label, n, expected, post_expected) VALUES
  ('demo course id starts d0000000-', (SELECT count(*) FROM public.courses
     WHERE created_by = '921fafc9-d77f-4b55-b57e-7422f39c30f3' AND id::text LIKE 'd0000000-%'), 1, 0),
  ('storage objects owned by demo user', (SELECT count(*) FROM storage.objects
     WHERE owner = '921fafc9-d77f-4b55-b57e-7422f39c30f3' OR owner_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 0, 0),
  ('auth.flow_state rows for demo user (non-FK)', (SELECT count(*) FROM auth.flow_state
     WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 0, 0),
  ('refresh tokens whose user_id and session disagree', (SELECT count(*) FROM auth.refresh_tokens r
     WHERE (r.user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3')
        <> (r.session_id IN (SELECT id FROM auth.sessions WHERE user_id = '921fafc9-d77f-4b55-b57e-7422f39c30f3'))), 0, 0),
  ('other tournaments on the demo course', (SELECT count(*) FROM public.tournaments
     WHERE course_id IN (SELECT id FROM public.courses WHERE created_by = '921fafc9-d77f-4b55-b57e-7422f39c30f3')
       AND id <> 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 0, 0),
  ('audit rows mentioning the demo user without being its own (non-FK)', (SELECT count(*) FROM auth.audit_log_entries
     WHERE (payload::text ~ '921fafc9-d77f-4b55-b57e-7422f39c30f3' OR payload::text ~* 'demo@example\.com')
       AND payload->>'actor_id' IS DISTINCT FROM '921fafc9-d77f-4b55-b57e-7422f39c30f3'), 0, 0),
  ('identities or users still carrying demo@example.com (non-FK)', (SELECT count(*) FROM auth.identities WHERE email = 'demo@example.com')
     + (SELECT count(*) FROM auth.users WHERE email = 'demo@example.com'), 2, 0);
