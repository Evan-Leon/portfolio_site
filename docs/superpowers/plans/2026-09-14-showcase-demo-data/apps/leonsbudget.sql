-- LeonsBudget (database leons_budget): showcase demo user 3 "demo@example.com", household 3, institution 9.
DO $$ BEGIN
  PERFORM pg_temp.gate_g1('database is leons_budget', (current_database() = 'leons_budget')::int, 1, 1);
  PERFORM pg_temp.gate_pin('django migration manifest',
    pg_temp.gate_sha((SELECT string_agg(app || '.' || name, ',' ORDER BY app, name) FROM django_migrations)),
    'f32dbe04a938624afb8a88e69a770f684ed692f31553d9270c686ae2196388ae');
  PERFORM pg_temp.gate_g1('auth_user 3 is demo@example.com', (SELECT count(*) FROM auth_user WHERE id = 3 AND email = 'demo@example.com'), 1, 0);
  PERFORM pg_temp.gate_g1('household 3 is "Demo Household"', (SELECT count(*) FROM accounts_household WHERE id = 3 AND name = 'Demo Household'), 1, 0);
  PERFORM pg_temp.gate_g1('institution 9 is "Northwind Bank"', (SELECT count(*) FROM accounts_institution WHERE id = 9 AND name = 'Northwind Bank'), 1, 0);
END $$;

INSERT INTO gate_scope (tbl, pkcol, ids, expected, del_order) VALUES
  ('categorization_categoryoverride', 'id', ARRAY(
      SELECT o.id::text FROM categorization_categoryoverride o
      WHERE o.overridden_by_id = 3
         OR o.transaction_id IN (SELECT t.id FROM transactions_transaction t
                                 JOIN accounts_bankaccount a ON a.id = t.account_id WHERE a.household_id = 3)), 0, 10),
  ('categorization_categoryrule', 'id', ARRAY(
      SELECT id::text FROM categorization_categoryrule WHERE household_id = 3 OR created_by_id = 3), 0, 20),
  ('transactions_transaction', 'id', ARRAY(
      SELECT t.id::text FROM transactions_transaction t
      JOIN accounts_bankaccount a ON a.id = t.account_id WHERE a.household_id = 3), 71, 30),
  ('transactions_importbatch', 'id', ARRAY(
      SELECT b.id::text FROM transactions_importbatch b
      WHERE b.uploaded_by_id = 3
         OR b.account_id IN (SELECT id FROM accounts_bankaccount WHERE household_id = 3)), 0, 40),
  ('budgets_budgetline', 'id', ARRAY(
      SELECT l.id::text FROM budgets_budgetline l
      JOIN budgets_monthlybudget m ON m.id = l.budget_id WHERE m.household_id = 3), 44, 50),
  ('budgets_monthlybudget', 'id', ARRAY(SELECT id::text FROM budgets_monthlybudget WHERE household_id = 3), 4, 60),
  ('accounts_bankaccount', 'id', ARRAY(SELECT id::text FROM accounts_bankaccount WHERE household_id = 3), 2, 70),
  ('accounts_institution', 'id', ARRAY(SELECT id::text FROM accounts_institution WHERE id = 9), 1, 80),
  ('accounts_householdmember', 'id', ARRAY(
      SELECT id::text FROM accounts_householdmember WHERE household_id = 3 OR user_id = 3), 1, 90),
  ('accounts_household', 'id', ARRAY(SELECT id::text FROM accounts_household WHERE id = 3), 1, 100),
  ('auth_user_groups', 'id', ARRAY(SELECT id::text FROM auth_user_groups WHERE user_id = 3), 0, 110),
  ('auth_user_user_permissions', 'id', ARRAY(SELECT id::text FROM auth_user_user_permissions WHERE user_id = 3), 0, 120),
  ('django_admin_log', 'id', ARRAY(SELECT id::text FROM django_admin_log WHERE user_id = 3), 0, 130),
  ('auth_user', 'id', ARRAY(SELECT id::text FROM auth_user WHERE id = 3), 1, 140);

INSERT INTO gate_parent VALUES ('categorization_category');

-- deltype: Django enforces on_delete in Python, so every constraint here is NO ACTION ('a') in the database.
INSERT INTO gate_fk_allow (conrelid, col, confrelid, deltype) VALUES
  ('accounts_bankaccount', 'household_id', 'accounts_household', 'a'),
  ('accounts_bankaccount', 'institution_id', 'accounts_institution', 'a'),
  ('accounts_householdmember', 'household_id', 'accounts_household', 'a'),
  ('accounts_householdmember', 'user_id', 'auth_user', 'a'),
  ('auth_user_groups', 'user_id', 'auth_user', 'a'),
  ('auth_user_user_permissions', 'user_id', 'auth_user', 'a'),
  ('budgets_budgetline', 'budget_id', 'budgets_monthlybudget', 'a'),
  ('budgets_monthlybudget', 'household_id', 'accounts_household', 'a'),
  ('categorization_categoryoverride', 'overridden_by_id', 'auth_user', 'a'),
  ('categorization_categoryoverride', 'transaction_id', 'transactions_transaction', 'a'),
  ('categorization_categoryrule', 'created_by_id', 'auth_user', 'a'),
  ('categorization_categoryrule', 'household_id', 'accounts_household', 'a'),
  ('django_admin_log', 'user_id', 'auth_user', 'a'),
  ('transactions_importbatch', 'account_id', 'accounts_bankaccount', 'a'),
  ('transactions_importbatch', 'uploaded_by_id', 'auth_user', 'a'),
  ('transactions_transaction', 'account_id', 'accounts_bankaccount', 'a'),
  ('transactions_transaction', 'batch_id', 'transactions_importbatch', 'a');

INSERT INTO gate_extra (label, n, expected, post_expected) VALUES
  ('user 3 belongs to no other household',
   (SELECT count(*) FROM accounts_householdmember WHERE user_id = 3 AND household_id <> 3), 0, 0),
  ('household 3 has no member other than user 3',
   (SELECT count(*) FROM accounts_householdmember WHERE household_id = 3 AND user_id <> 3), 0, 0),
  ('distinct retained categories referenced by demo budget lines',
   (SELECT count(DISTINCT l.category_id) FROM budgets_budgetline l
    JOIN budgets_monthlybudget m ON m.id = l.budget_id WHERE m.household_id = 3), 11, 0),
  ('distinct retained categories referenced by demo transactions',
   (SELECT count(DISTINCT t.category_id) FROM transactions_transaction t
    JOIN accounts_bankaccount a ON a.id = t.account_id WHERE a.household_id = 3), 11, 0),
  ('any account at institution 9', (SELECT count(*) FROM accounts_bankaccount WHERE institution_id = 9), 2, 0);
