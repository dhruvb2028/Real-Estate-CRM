-- =============================================================
-- EstateFlow CRM — 0006: explicit role grants
--
-- The schema must not depend on whatever default privileges a particular
-- Supabase project happens to have configured. Granting explicitly makes the
-- migration set self-sufficient, so a fresh client project behaves identically
-- every time.
--
-- Deliberately tighter than Supabase's defaults:
--   authenticated → full DML; Row Level Security restricts rows to their org
--   service_role  → full DML; used by trusted server paths (lead webhook,
--                   call bridge, provisioning) and bypasses RLS by design
--   anon          → NO table access whatsoever. The public property share page
--                   reads through the get_public_property() security-definer
--                   function only, so anonymous visitors can never touch a
--                   table even if a policy were misconfigured later.
-- =============================================================

grant usage on schema public to postgres, anon, authenticated, service_role;

-- ---------- existing objects ----------
grant all on all tables in schema public to postgres, authenticated, service_role;
grant all on all sequences in schema public to postgres, authenticated, service_role;
grant execute on all functions in schema public to postgres, authenticated, service_role;

-- ---------- future objects ----------
alter default privileges in schema public
  grant all on tables to postgres, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to postgres, authenticated, service_role;

-- ---------- anonymous access ----------
-- Revoke anything inherited, then re-grant only the public share entry point.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

grant execute on function get_public_property(text) to anon;
