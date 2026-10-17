-- RevenueAudit AI — revoke PUBLIC execute on credit RPCs (security patch)
--
-- Why this file exists
-- -------------------
-- `0003_credit_foundation.sql` grants EXECUTE on `spend_credits` and
-- `refund_credits` to `service_role`, but Postgres grants EXECUTE to PUBLIC on
-- every new function by default and nothing revoked that default. `anon` and
-- `authenticated` therefore inherited EXECUTE through PUBLIC, so any browser
-- session could call the SECURITY DEFINER RPCs directly and move credits for
-- any user id — the privilege-escalation defect `verify.sql` warns about.
--
-- This patch revokes that inherited access. `service_role` keeps its own
-- explicit grant from 0003, so the API is unaffected.
--
-- Apply with:  paste into the Supabase SQL editor, or `supabase db push`
--
-- Safety
-- ------
-- * Re-runnable. Revoking a grant that is absent is a no-op.
-- * ACL-only: touches no table, policy, RLS setting, function body, or data.
-- * No `notify pgrst` here: privileges are not part of the PostgREST schema
--   cache (same reasoning as `0002_service_role_grants.sql`).

revoke execute on function public.spend_credits(uuid, integer, text, text, text, uuid) from public, anon, authenticated;

revoke execute on function public.refund_credits(uuid, integer, text, text, text, uuid) from public, anon, authenticated;
