-- =============================================================
-- EstateFlow CRM — 0007: scope lead data to the owning agent
--
-- Until now every member of an organization could read every lead in it. The
-- UI showed an agent the whole pipeline, and — more seriously — an agent could
-- query the REST API directly with their own session and export the firm's
-- entire lead list. For a brokerage the lead list *is* the business, so this
-- closes that gap and makes the database enforce what the handover checklist
-- has always promised: "a Sales Agent only sees their own leads".
--
--   admin / sales_manager → the whole organization, unchanged
--   everyone else         → leads assigned to them, or that they created
--
-- Records hanging off a lead (calls, messages, follow-ups, shares, timeline
-- activity) follow the lead itself, otherwise the same data would still be
-- reachable one table over.
-- =============================================================

-- Security definer so the check itself is not filtered by leads' own policy,
-- which would recurse. Reads one row by primary key, so it stays cheap.
create or replace function can_see_lead(p_lead_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from leads l
    where l.id = p_lead_id
      and l.organization_id = get_user_org()
      and (
        is_org_manager()
        or l.assigned_agent_id = auth.uid()
        or l.created_by = auth.uid()
      )
  );
$$;

grant execute on function can_see_lead(uuid) to authenticated, service_role;

-- ---------- leads ----------
drop policy if exists leads_select on leads;
create policy leads_select on leads
  for select using (
    organization_id = get_user_org()
    and (
      is_org_manager()
      or assigned_agent_id = auth.uid()
      or created_by = auth.uid()
    )
  );

-- ---------- activities ----------
-- lead_id is nullable (property and system events); those stay org-visible.
drop policy if exists activities_select on activities;
create policy activities_select on activities
  for select using (
    organization_id = get_user_org()
    and (lead_id is null or can_see_lead(lead_id))
  );

-- ---------- calls ----------
-- An agent keeps sight of calls they personally handled even if the lead is
-- later reassigned — otherwise their own call history would vanish.
drop policy if exists calls_select on calls;
create policy calls_select on calls
  for select using (
    organization_id = get_user_org()
    and (can_see_lead(lead_id) or agent_id = auth.uid())
  );

-- ---------- messages ----------
drop policy if exists messages_select on messages;
create policy messages_select on messages
  for select using (
    organization_id = get_user_org()
    and (can_see_lead(lead_id) or sender_id = auth.uid())
  );

-- ---------- followups ----------
drop policy if exists followups_select on followups;
create policy followups_select on followups
  for select using (
    organization_id = get_user_org()
    and (can_see_lead(lead_id) or agent_id = auth.uid())
  );

-- ---------- lead_property_shares ----------
drop policy if exists shares_select on lead_property_shares;
create policy shares_select on lead_property_shares
  for select using (
    organization_id = get_user_org()
    and (can_see_lead(lead_id) or shared_by = auth.uid())
  );

-- Supports the assigned-agent branch of the policy on large pipelines.
create index if not exists leads_org_agent_idx
  on leads (organization_id, assigned_agent_id);
