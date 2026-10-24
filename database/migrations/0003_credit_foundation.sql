-- RevenueAudit AI — credit foundation (Phase 2)
--
-- Adds the server-side credit primitives: an account balance, an append-only
-- ledger, per-audit usage records, and two atomic RPCs that move credits.
--
-- Design notes
-- ------------
-- * Append-only ledger: every movement is one `credit_ledger` row with a signed
--   `amount` (negative = spend, positive = refund) and the `balance_after` it
--   produced, so any balance can be reconstructed and audited.
-- * Idempotency: each movement carries an `idempotency_key`, unique per user.
--   Replaying a request returns the original result instead of charging again.
-- * Concurrency: `spend_credits` / `refund_credits` are SECURITY DEFINER
--   functions that take a row lock (`select ... for update`) on the account
--   within a single transaction, so two concurrent requests serialise and a
--   balance can never be overspent.
-- * No paid plans, payments, or AppSumo data are created here. Balances start
--   at 0; granting credits is a separate, explicitly-approved step.
-- * Enforcement is off by default in the API (`CREDITS_ENFORCED=false`), so
--   applying this migration does not change any existing behaviour by itself.
--
-- Apply with:  supabase db push        (or paste into the SQL editor)
--
-- Safety
-- ------
-- * Additive and re-runnable only. It creates new tables, indexes, functions,
--   and policies. It does NOT drop or alter any existing table, column, index,
--   or row, and it does not touch live customer data.
-- * RLS is enabled and forced on the three NEW tables only; existing tables and
--   their policies are untouched.

-- ---------------------------------------------------------------------------
-- credit_accounts — current balance per user (derived, guarded)
-- ---------------------------------------------------------------------------

create table if not exists public.credit_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists credit_accounts_set_updated_at on public.credit_accounts;
create trigger credit_accounts_set_updated_at
  before update on public.credit_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- credit_ledger — append-only movement history (never updated or deleted)
-- ---------------------------------------------------------------------------

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Signed: negative for a spend, positive for a refund.
  amount integer not null check (amount <> 0),
  -- Balance this movement produced, captured at write time for auditing.
  balance_after integer not null check (balance_after >= 0),
  reason text not null,
  -- Free-form origin, e.g. 'audit_request'. Informational only.
  reference_kind text,
  reference_id uuid,
  -- Unique per user so a replayed request never charges or refunds twice.
  idempotency_key text not null,
  created_at timestamptz not null default now()
);

-- Idempotency is enforced per user: the same key can be reused by different
-- users but never twice for the same user.
create unique index if not exists credit_ledger_user_idempotency_idx
  on public.credit_ledger (user_id, idempotency_key);

create index if not exists credit_ledger_user_created_idx
  on public.credit_ledger (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- usage_records — measured metering for one audit (Phase 1 output, persisted)
-- ---------------------------------------------------------------------------

create table if not exists public.usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Nullable: usage may be recorded before/without a stored audit.
  audit_id uuid references public.audits (id) on delete set null,
  -- The request idempotency key; shared with the credit charge that paid for
  -- it, so a charge and its usage can be correlated. Also makes the usage
  -- insert idempotent.
  idempotency_key text not null,
  pages_crawled integer not null default 0 check (pages_crawled >= 0),
  crawl_duration_ms integer not null default 0 check (crawl_duration_ms >= 0),
  crawl_status text not null check (crawl_status in ('success', 'partial', 'failed')),
  failure_count integer not null default 0 check (failure_count >= 0),
  ai_status text check (ai_status in ('success', 'failed', 'not_configured')),
  ai_model text,
  -- Measured token counts. Nullable = "not reported", never treated as zero.
  prompt_tokens integer check (prompt_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  total_tokens integer check (total_tokens >= 0),
  cached_tokens integer check (cached_tokens >= 0),
  -- Estimated, never measured or billed. NULL when no price was configured.
  estimated_cost_usd numeric(12, 6),
  cost_basis text not null check (cost_basis in ('estimated', 'unavailable')),
  created_at timestamptz not null default now(),
  -- One usage row per request key: re-recording is a no-op.
  unique (idempotency_key)
);

create index if not exists usage_records_user_created_idx
  on public.usage_records (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security (the three new tables only)
-- ---------------------------------------------------------------------------

alter table public.credit_accounts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.usage_records enable row level security;

alter table public.credit_accounts force row level security;
alter table public.credit_ledger force row level security;
alter table public.usage_records force row level security;

-- Users may read their own balance, ledger, and usage. There are deliberately
-- NO insert/update/delete policies for `authenticated`: credits only ever move
-- through the SECURITY DEFINER RPCs called by the server with its service-role
-- key, so a browser can never write balances even with a valid session.
drop policy if exists "credit_accounts_select_own" on public.credit_accounts;
create policy "credit_accounts_select_own" on public.credit_accounts
  for select using (auth.uid() = user_id);

drop policy if exists "credit_ledger_select_own" on public.credit_ledger;
create policy "credit_ledger_select_own" on public.credit_ledger
  for select using (auth.uid() = user_id);

drop policy if exists "usage_records_select_own" on public.usage_records;
create policy "usage_records_select_own" on public.usage_records
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Atomic credit movement RPCs
-- ---------------------------------------------------------------------------

-- Spends `p_amount` credits for a user, atomically.
--
-- Returns one row: result_status is 'applied' (charged), 'duplicate'
-- (idempotency key already used; nothing charged), or 'insufficient' (balance
-- too low; nothing charged), plus the resulting balance and ledger row id.
--
-- Ordering matters: the account row is locked FIRST, then idempotency is
-- checked, so concurrent requests serialise and a replay is detected under the
-- lock. The whole body runs in one PostgREST transaction.
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_reason text,
  p_reference_kind text default null,
  p_reference_id uuid default null
)
returns table (result_status text, resulting_balance integer, ledger_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_new integer;
  v_ledger uuid;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be a positive integer';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) = 0 then
    raise exception 'idempotency key is required';
  end if;

  -- Ensure a row exists so the lock below always has a target.
  insert into public.credit_accounts (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  -- Lock the account for this transaction: every concurrent spend for this
  -- user queues here, so the balance is checked and decremented atomically and
  -- can never go negative from overlapping requests.
  select c.balance into v_balance
    from public.credit_accounts c
   where c.user_id = p_user_id
     for update;

  -- Idempotency, checked under the lock so a concurrent replay is visible.
  select l.id into v_ledger
    from public.credit_ledger l
   where l.user_id = p_user_id
     and l.idempotency_key = p_idempotency_key;
  if found then
    return query select 'duplicate'::text, v_balance, v_ledger;
    return;
  end if;

  if v_balance < p_amount then
    return query select 'insufficient'::text, v_balance, null::uuid;
    return;
  end if;

  v_new := v_balance - p_amount;
  insert into public.credit_ledger (user_id, amount, balance_after, reason, reference_kind, reference_id, idempotency_key)
  values (p_user_id, -p_amount, v_new, p_reason, p_reference_kind, p_reference_id, p_idempotency_key)
  returning id into v_ledger;

  update public.credit_accounts
     set balance = v_new
   where user_id = p_user_id;

  return query select 'applied'::text, v_new, v_ledger;
end;
$$;

-- Refunds `p_amount` credits for a user, atomically. Same guarantees as
-- `spend_credits`; the amount is added and recorded as a positive ledger row.
-- The caller passes the exact original charge amount, and the derived
-- idempotency key makes a repeated refund a no-op.
create or replace function public.refund_credits(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_reason text,
  p_reference_kind text default null,
  p_reference_id uuid default null
)
returns table (result_status text, resulting_balance integer, ledger_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_new integer;
  v_ledger uuid;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be a positive integer';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) = 0 then
    raise exception 'idempotency key is required';
  end if;

  insert into public.credit_accounts (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select c.balance into v_balance
    from public.credit_accounts c
   where c.user_id = p_user_id
     for update;

  select l.id into v_ledger
    from public.credit_ledger l
   where l.user_id = p_user_id
     and l.idempotency_key = p_idempotency_key;
  if found then
    return query select 'duplicate'::text, v_balance, v_ledger;
    return;
  end if;

  v_new := v_balance + p_amount;
  insert into public.credit_ledger (user_id, amount, balance_after, reason, reference_kind, reference_id, idempotency_key)
  values (p_user_id, p_amount, v_new, p_reason, p_reference_kind, p_reference_id, p_idempotency_key)
  returning id into v_ledger;

  update public.credit_accounts
     set balance = v_new
   where user_id = p_user_id;

  return query select 'applied'::text, v_new, v_ledger;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

-- The API reads/writes credits only through its service-role key.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.credit_accounts to service_role;
grant select, insert, update, delete on table public.credit_ledger to service_role;
grant select, insert, update, delete on table public.usage_records to service_role;

-- Only the server (service_role) may execute the money-movement RPCs. They are
-- intentionally NOT granted to anon or authenticated.
grant execute on function public.spend_credits(uuid, integer, text, text, text, uuid) to service_role;
grant execute on function public.refund_credits(uuid, integer, text, text, text, uuid) to service_role;

-- Authenticated users may read their own rows (RLS narrows to owner). No write
-- grants: credits only move via the RPCs above.
grant select on table public.credit_accounts to authenticated;
grant select on table public.credit_ledger to authenticated;
grant select on table public.usage_records to authenticated;

-- Keep future objects reachable by service_role, matching 0001/0002.
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- ---------------------------------------------------------------------------
-- PostgREST schema cache
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';