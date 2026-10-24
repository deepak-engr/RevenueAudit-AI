-- RevenueAudit AI — initial schema
--
-- Creates the persistent audit data model in Supabase PostgreSQL.
--
-- Design notes
-- ------------
-- * Every table is owned by a Supabase Auth user via `auth.uid()`.
-- * Row Level Security is enabled on all five tables and every policy is
--   scoped to `auth.uid()`, so a user can never read or write another user's
--   data even if a query is malformed.
-- * Child rows (pages, findings, ai_analyses) inherit ownership from their
--   parent audit through an EXISTS subquery, which keeps a single source of
--   truth for the ownership rule.
-- * Scores are stored as smallint 0-100 because the deterministic engine only
--   ever produces integers in that range. A CHECK constraint enforces it.
--
-- Apply with:  supabase db push        (or paste into the SQL editor)
--
-- The file is re-runnable. `create type` and `create trigger` have no
-- `if not exists` form, so those statements are wrapped or preceded by a drop.
-- Re-running produces the same schema as running it once.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------

-- `create type` has no `if not exists` form, so an existing type is treated as
-- success. This never changes an enum that is already defined; it only lets the
-- migration be re-applied after a partial run.
do $$
begin
  create type public.audit_status as enum ('pending', 'running', 'completed', 'failed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.audit_severity as enum ('critical', 'high', 'medium', 'low');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.audit_category as enum ('SEO', 'Technical', 'Content', 'Links', 'Revenue');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.audit_impact as enum ('high', 'medium', 'low');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.audit_effort as enum ('low', 'medium', 'high');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ai_status as enum ('success', 'unavailable');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at honest
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audits
-- ---------------------------------------------------------------------------

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  website_url text not null,
  status public.audit_status not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  overall_score smallint check (overall_score between 0 and 100),
  seo_score smallint check (seo_score between 0 and 100),
  technical_score smallint check (technical_score between 0 and 100),
  content_score smallint check (content_score between 0 and 100),
  links_score smallint check (links_score between 0 and 100),
  revenue_score smallint check (revenue_score between 0 and 100),
  pages_crawled integer not null default 0 check (pages_crawled >= 0),
  findings_count integer not null default 0 check (findings_count >= 0),
  ai_status public.ai_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audits_user_created_idx on public.audits (user_id, created_at desc);

drop trigger if exists audits_set_updated_at on public.audits;
create trigger audits_set_updated_at
  before update on public.audits
  for each row execute function public.set_updated_at();
-- ---------------------------------------------------------------------------
-- audit_pages
-- ---------------------------------------------------------------------------

create table if not exists public.audit_pages (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  url text not null,
  final_url text,
  status_code integer,
  title text,
  meta_description text,
  h1_count integer not null default 0 check (h1_count >= 0),
  word_count integer not null default 0 check (word_count >= 0),
  canonical_url text,
  internal_links_count integer not null default 0 check (internal_links_count >= 0),
  external_links_count integer not null default 0 check (external_links_count >= 0),
  images_count integer not null default 0 check (images_count >= 0),
  images_missing_alt_count integer not null default 0 check (images_missing_alt_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists audit_pages_audit_idx on public.audit_pages (audit_id);

-- ---------------------------------------------------------------------------
-- audit_findings
-- ---------------------------------------------------------------------------

-- `issue_id` is the deterministic `<ruleId>#<sequence>` identifier. It is
-- denormalised here on purpose: the AI layer references findings by this id, so
-- stored audits can be re-explained without re-running the engine.
create table if not exists public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  page_id uuid references public.audit_pages (id) on delete set null,
  issue_id text not null,
  rule_id text not null,
  rule_version text not null,
  category public.audit_category not null,
  severity public.audit_severity not null,
  title text not null,
  description text not null,
  -- Structured, measured values copied verbatim from the crawler. Stored as
  -- jsonb so a finding's evidence is queryable and never silently stringified.
  evidence jsonb not null default '{}'::jsonb,
  impact public.audit_impact not null,
  effort public.audit_effort not null,
  recommendation text not null,
  affected_url text not null,
  created_at timestamptz not null default now(),
  unique (audit_id, issue_id)
);

create index if not exists audit_findings_audit_idx on public.audit_findings (audit_id);

-- ---------------------------------------------------------------------------
-- ai_analyses
-- ---------------------------------------------------------------------------

create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  status public.ai_status not null,
  summary text,
  quick_wins jsonb not null default '[]'::jsonb,
  medium_term_improvements jsonb not null default '[]'::jsonb,
  action_plan jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  -- One AI analysis per audit keeps the history unambiguous.
  unique (audit_id)
);
-- ---------------------------------------------------------------------------
-- Profile bootstrap
-- ---------------------------------------------------------------------------

-- Creates a profile row whenever an auth user is created, so the application
-- never has to backfill profiles manually after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.audits enable row level security;
alter table public.audit_pages enable row level security;
alter table public.audit_findings enable row level security;
alter table public.ai_analyses enable row level security;

-- Force RLS even for the table owner so a stray privileged session still
-- cannot bypass these policies by accident.
alter table public.profiles force row level security;
alter table public.audits force row level security;
alter table public.audit_pages force row level security;
alter table public.audit_findings force row level security;
alter table public.ai_analyses force row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- audits ---------------------------------------------------------------------
drop policy if exists "audits_select_own" on public.audits;
create policy "audits_select_own" on public.audits
  for select using (auth.uid() = user_id);

drop policy if exists "audits_insert_own" on public.audits;
create policy "audits_insert_own" on public.audits
  for insert with check (auth.uid() = user_id);

drop policy if exists "audits_update_own" on public.audits;
create policy "audits_update_own" on public.audits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "audits_delete_own" on public.audits;
create policy "audits_delete_own" on public.audits
  for delete using (auth.uid() = user_id);

-- audit_pages ----------------------------------------------------------------
-- Ownership is inherited from the parent audit.
drop policy if exists "audit_pages_select_own" on public.audit_pages;
create policy "audit_pages_select_own" on public.audit_pages
  for select using (
    exists (select 1 from public.audits a where a.id = audit_id and a.user_id = auth.uid())
  );

drop policy if exists "audit_pages_insert_own" on public.audit_pages;
create policy "audit_pages_insert_own" on public.audit_pages
  for insert with check (
    exists (select 1 from public.audits a where a.id = audit_id and a.user_id = auth.uid())
  );

-- audit_findings -------------------------------------------------------------
drop policy if exists "audit_findings_select_own" on public.audit_findings;
create policy "audit_findings_select_own" on public.audit_findings
  for select using (
    exists (select 1 from public.audits a where a.id = audit_id and a.user_id = auth.uid())
  );

drop policy if exists "audit_findings_insert_own" on public.audit_findings;
create policy "audit_findings_insert_own" on public.audit_findings
  for insert with check (
    exists (select 1 from public.audits a where a.id = audit_id and a.user_id = auth.uid())
  );

-- ai_analyses ----------------------------------------------------------------
drop policy if exists "ai_analyses_select_own" on public.ai_analyses;
create policy "ai_analyses_select_own" on public.ai_analyses
  for select using (
    exists (select 1 from public.audits a where a.id = audit_id and a.user_id = auth.uid())
  );

drop policy if exists "ai_analyses_insert_own" on public.ai_analyses;
create policy "ai_analyses_insert_own" on public.ai_analyses
  for insert with check (
    exists (select 1 from public.audits a where a.id = audit_id and a.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

-- service_role is the Postgres role behind the API's service-role key, and it is
-- what every read and write in the application runs as.
--
-- A role that bypasses RLS still needs an explicit GRANT. Without these the
-- tables exist and look correct in the dashboard, yet every request fails with
-- `42501 permission denied for table ...`.
--
-- The privileges are named explicitly rather than `ALL`, so the grant is exactly
-- the four operations the repository performs and carries no TRUNCATE,
-- REFERENCES, or TRIGGER authority it never needs. Schema USAGE is required
-- before any object in the schema can be reached at all.
--
-- This does not weaken the policies above. service_role is a server-side role
-- that only ever holds the admin key, and that key is never exposed to a
-- browser. `anon` and `authenticated` keep exactly the narrow grants below, and
-- both remain subject to the RLS policies defined above.
grant usage on schema public to service_role;

grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.audits to service_role;
grant select, insert, update, delete on table public.audit_pages to service_role;
grant select, insert, update, delete on table public.audit_findings to service_role;
grant select, insert, update, delete on table public.ai_analyses to service_role;

-- The trigger functions run under their owner, but EXECUTE is granted so the
-- functions are callable without relying on PUBLIC defaults.
grant execute on function public.set_updated_at() to service_role;
grant execute on function public.handle_new_user() to service_role;

-- The same access for anything created later in this schema, so a future
-- migration cannot silently reintroduce the same failure.
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- The anon/authenticated roles get only what RLS then narrows down.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.profiles to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- PostgREST schema cache
-- ---------------------------------------------------------------------------

-- PostgREST caches the table list, so a freshly created table can 404 until the
-- cache is told to reload. Supabase normally refreshes it automatically; this
-- makes the migration reliable when applied through the SQL editor, where the
-- automatic refresh is not guaranteed to have happened yet. It is a no-op when
-- no PostgREST instance is listening.
notify pgrst, 'reload schema';