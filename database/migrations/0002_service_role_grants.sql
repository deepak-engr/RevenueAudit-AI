-- RevenueAudit AI — service_role grants (patch)
--
-- Why this file exists
-- -------------------
-- `0001_init.sql` originally granted privileges to `anon` and `authenticated`
-- but not to `service_role`. The tables were therefore created correctly, yet
-- every read and write from the API failed with:
--
--   42501 permission denied for table audits
--
-- A Postgres role that bypasses Row Level Security still requires an explicit
-- GRANT to reach a table, so `service_role` had no access even though it is the
-- role the API's service-role key assumes.
--
-- `0001_init.sql` now contains the correct grants. This file exists so a
-- database that was already migrated can be fixed by running one statement
-- group, instead of re-running the whole initial migration.
--
-- Apply with:  paste into the Supabase SQL editor, or `supabase db push`
--
-- Safety
-- ------
-- * Re-runnable. Grants are idempotent, and the table loop skips any table that
--   is not present, so this is safe to run more than once.
-- * Row Level Security is not touched. No `enable`/`force`/`disable` statement
--   appears here, and no policy is altered or removed.
-- * The `authenticated` RLS policies from `0001_init.sql` are untouched and
--   remain in force for every browser-facing request.

-- ---------------------------------------------------------------------------
-- Schema access
-- ---------------------------------------------------------------------------
-- Required before any object inside `public` can be reached, regardless of
-- per-table privileges.
grant usage on schema public to service_role;

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------
-- Only the four operations the audit repository actually performs, and only on
-- the five application tables. Naming them explicitly rather than granting ALL
-- keeps the role free of TRUNCATE, REFERENCES, and TRIGGER authority, and keeps
-- the grant limited to this schema's application tables.
do $$
declare
  target text;
begin
  foreach target in array array[
    'profiles',
    'audits',
    'audit_pages',
    'audit_findings',
    'ai_analyses'
  ] loop
    -- Skips a table that does not exist, so the file is safe to run before,
    -- after, or instead of 0001_init.sql without failing part-way.
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = target
    ) then
      execute format(
        'grant select, insert, update, delete on table public.%I to service_role',
        target
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Trigger functions
-- ---------------------------------------------------------------------------
-- `set_updated_at` and `handle_new_user` fire as table triggers. EXECUTE is
-- granted so they do not depend on the default PUBLIC execute privilege.
do $$
declare
  fn text;
begin
  foreach fn in array array['set_updated_at', 'handle_new_user'] loop
    if exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = fn
    ) then
      execute format('grant execute on function public.%I() to service_role', fn);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Future objects
-- ---------------------------------------------------------------------------
-- Prevents the same failure recurring when a later migration adds a table.
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- ---------------------------------------------------------------------------
-- PostgREST schema cache
-- ---------------------------------------------------------------------------
-- Privileges are not cached, but this keeps the reload behaviour consistent
-- with 0001_init.sql. A no-op when no PostgREST instance is listening.
notify pgrst, 'reload schema';