-- RevenueAudit AI — post-migration verification
--
-- Read-only. Paste into the Supabase SQL Editor *after* applying
-- `migrations/0001_init.sql` and run each section, or the whole file at once.
--
-- Every section returns rows. An empty result means something is missing:
-- `tables` and `rls` must each return 5 rows, `policies` 11, `indexes` 3,
-- `trigger` 1, and `types` 6.

-- ---------------------------------------------------------------------------
-- 1. Tables (expect 5 rows)
-- ---------------------------------------------------------------------------
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'audits', 'audit_pages', 'audit_findings', 'ai_analyses')
order by c.relname;

-- ---------------------------------------------------------------------------
-- 2. Row Level Security (expect 5 rows, both flags true)
-- ---------------------------------------------------------------------------
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'audits', 'audit_pages', 'audit_findings', 'ai_analyses')
order by c.relname;

-- ---------------------------------------------------------------------------
-- 3. Policies (expect 11 rows)
-- ---------------------------------------------------------------------------
select
  tablename as table_name,
  policyname as policy_name,
  cmd as command,
  qual is not null as has_using_clause,
  with_check is not null as has_with_check_clause
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- 4. auth.users -> profiles trigger (expect 1 row, enabled = t)
-- ---------------------------------------------------------------------------
select
  t.tgname as trigger_name,
  c.relname as on_table,
  t.tgenabled <> 'D' as enabled,
  p.proname as function_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where t.tgname = 'on_auth_user_created'
  and c.relname = 'users'
  and n.nspname = 'auth';

-- ---------------------------------------------------------------------------
-- 5. Indexes created by the migration (expect 3 rows)
-- ---------------------------------------------------------------------------
select
  tablename as table_name,
  indexname as index_name,
  indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'audits_user_created_idx',
    'audit_pages_audit_idx',
    'audit_findings_audit_idx'
  )
order by indexname;

-- ---------------------------------------------------------------------------
-- 6. Enum types (expect 6 rows)
-- ---------------------------------------------------------------------------
select t.typname as type_name, e.enumlabel
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where n.nspname = 'public'
  and t.typname in (
    'audit_status',
    'audit_severity',
    'audit_category',
    'audit_impact',
    'audit_effort',
    'ai_status'
  )
order by t.typname, e.enumsortorder;

-- ---------------------------------------------------------------------------
-- 7. Trigger functions (expect 2 rows)
-- ---------------------------------------------------------------------------
select p.proname as function_name, p.prosecdef as is_security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('handle_new_user', 'set_updated_at')
order by p.proname;

-- ---------------------------------------------------------------------------
-- 8. service_role grants (expect 5 rows)
-- ---------------------------------------------------------------------------
-- The API authenticates with the service-role key, which assumes the
-- service_role Postgres role. A role that bypasses RLS still needs a GRANT, so
-- if these are missing every read and write fails with
-- `42501 permission denied for table ...` even though the tables exist.
select
  c.relname as table_name,
  has_table_privilege('service_role', c.oid, 'SELECT') as can_select,
  has_table_privilege('service_role', c.oid, 'INSERT') as can_insert,
  has_table_privilege('service_role', c.oid, 'UPDATE') as can_update,
  has_table_privilege('service_role', c.oid, 'DELETE') as can_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'audits', 'audit_pages', 'audit_findings', 'ai_analyses')
order by c.relname;

-- ---------------------------------------------------------------------------
-- Credit foundation (apply 0003 first; expect 3 rows)
-- ---------------------------------------------------------------------------
-- This section is empty until `migrations/0003_credit_foundation.sql` has been
-- applied. An empty result here is expected before that migration and means
-- "credits not deployed", not a fault.
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('credit_accounts', 'credit_ledger', 'usage_records')
order by c.relname;

-- Credit RLS (expect 3 rows, both flags true; empty before 0003)
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('credit_accounts', 'credit_ledger', 'usage_records')
order by c.relname;

-- Credit RPCs (expect 2 rows, both SECURITY DEFINER; empty before 0003).
-- These are the only functions that may move credits, and they must be
-- executable by service_role only — never by anon or authenticated.
select p.proname as function_name, p.prosecdef as is_security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('spend_credits', 'refund_credits')
order by p.proname;

-- RPC execute grants (expect 2 rows: service_role yes, authenticated no;
-- empty before 0003). Any `authenticated_can_execute = true` row here is a
-- privilege-escalation defect: a browser could move credits directly.
select
  p.proname as function_name,
  has_function_privilege('service_role', p.oid, 'execute') as service_role_can_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('spend_credits', 'refund_credits')
order by p.proname;