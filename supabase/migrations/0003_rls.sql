-- =============================================================
-- EstateFlow CRM — 0003: Row Level Security
-- Every table is org-scoped via get_user_org(); role-sensitive
-- writes gated by is_org_manager(). Anon access only through the
-- get_public_property() RPC — never direct table reads.
-- =============================================================

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table team_members enable row level security;
alter table lead_sources enable row level security;
alter table leads enable row level security;
alter table properties enable row level security;
alter table property_images enable row level security;
alter table property_documents enable row level security;
alter table lead_property_shares enable row level security;
alter table activities enable row level security;
alter table calls enable row level security;
alter table messages enable row level security;
alter table followups enable row level security;
alter table attendance enable row level security;
alter table social_posts enable row level security;
alter table tasks enable row level security;
alter table integration_settings enable row level security;
alter table notifications enable row level security;

-- ---------- organizations ----------
create policy org_select on organizations
  for select using (id = get_user_org());
create policy org_update on organizations
  for update using (id = get_user_org() and get_user_role() = 'admin');

-- ---------- profiles ----------
create policy profiles_select on profiles
  for select using (organization_id = get_user_org() or id = auth.uid());
create policy profiles_update_self on profiles
  for update using (id = auth.uid());
create policy profiles_update_admin on profiles
  for update using (organization_id = get_user_org() and get_user_role() = 'admin');

-- ---------- team_members (invites) ----------
create policy team_members_select on team_members
  for select using (organization_id = get_user_org());
create policy team_members_insert on team_members
  for insert with check (organization_id = get_user_org() and get_user_role() = 'admin');
create policy team_members_update on team_members
  for update using (organization_id = get_user_org() and get_user_role() = 'admin');
create policy team_members_delete on team_members
  for delete using (organization_id = get_user_org() and get_user_role() = 'admin');

-- ---------- lead_sources ----------
create policy lead_sources_select on lead_sources
  for select using (organization_id = get_user_org());
create policy lead_sources_write on lead_sources
  for all using (organization_id = get_user_org() and is_org_manager())
  with check (organization_id = get_user_org() and is_org_manager());

-- ---------- leads ----------
create policy leads_select on leads
  for select using (organization_id = get_user_org());
create policy leads_insert on leads
  for insert with check (organization_id = get_user_org());
create policy leads_update on leads
  for update using (
    organization_id = get_user_org()
    and (is_org_manager() or assigned_agent_id = auth.uid() or created_by = auth.uid())
  );
create policy leads_delete on leads
  for delete using (organization_id = get_user_org() and is_org_manager());

-- ---------- properties ----------
create policy properties_select on properties
  for select using (organization_id = get_user_org());
create policy properties_insert on properties
  for insert with check (organization_id = get_user_org());
create policy properties_update on properties
  for update using (organization_id = get_user_org());
create policy properties_delete on properties
  for delete using (organization_id = get_user_org() and is_org_manager());

-- ---------- property_images / property_documents ----------
create policy property_images_select on property_images
  for select using (organization_id = get_user_org());
create policy property_images_write on property_images
  for all using (organization_id = get_user_org())
  with check (organization_id = get_user_org());

create policy property_documents_select on property_documents
  for select using (organization_id = get_user_org());
create policy property_documents_write on property_documents
  for all using (organization_id = get_user_org())
  with check (organization_id = get_user_org());

-- ---------- lead_property_shares ----------
create policy shares_select on lead_property_shares
  for select using (organization_id = get_user_org());
create policy shares_insert on lead_property_shares
  for insert with check (organization_id = get_user_org());

-- ---------- activities ----------
create policy activities_select on activities
  for select using (organization_id = get_user_org());
create policy activities_insert on activities
  for insert with check (organization_id = get_user_org());

-- ---------- calls ----------
create policy calls_select on calls
  for select using (organization_id = get_user_org());
create policy calls_insert on calls
  for insert with check (organization_id = get_user_org());
create policy calls_update on calls
  for update using (organization_id = get_user_org());

-- ---------- messages ----------
create policy messages_select on messages
  for select using (organization_id = get_user_org());
create policy messages_insert on messages
  for insert with check (organization_id = get_user_org());
create policy messages_update on messages
  for update using (organization_id = get_user_org());

-- ---------- followups ----------
create policy followups_select on followups
  for select using (organization_id = get_user_org());
create policy followups_insert on followups
  for insert with check (organization_id = get_user_org());
create policy followups_update on followups
  for update using (
    organization_id = get_user_org()
    and (is_org_manager() or agent_id = auth.uid())
  );
create policy followups_delete on followups
  for delete using (organization_id = get_user_org() and is_org_manager());

-- ---------- attendance ----------
create policy attendance_select on attendance
  for select using (
    organization_id = get_user_org()
    and (is_org_manager() or user_id = auth.uid())
  );
create policy attendance_insert on attendance
  for insert with check (organization_id = get_user_org() and user_id = auth.uid());
create policy attendance_update on attendance
  for update using (
    organization_id = get_user_org()
    and (is_org_manager() or user_id = auth.uid())
  );

-- ---------- social_posts ----------
create policy social_posts_select on social_posts
  for select using (organization_id = get_user_org());
create policy social_posts_write on social_posts
  for all using (organization_id = get_user_org())
  with check (organization_id = get_user_org());

-- ---------- tasks ----------
create policy tasks_select on tasks
  for select using (organization_id = get_user_org());
create policy tasks_write on tasks
  for all using (organization_id = get_user_org())
  with check (organization_id = get_user_org());

-- ---------- integration_settings (admin only) ----------
create policy integration_settings_select on integration_settings
  for select using (organization_id = get_user_org() and get_user_role() = 'admin');
create policy integration_settings_write on integration_settings
  for all using (organization_id = get_user_org() and get_user_role() = 'admin')
  with check (organization_id = get_user_org() and get_user_role() = 'admin');

-- ---------- notifications (per-user) ----------
create policy notifications_select on notifications
  for select using (user_id = auth.uid());
create policy notifications_update on notifications
  for update using (user_id = auth.uid());
create policy notifications_insert on notifications
  for insert with check (organization_id = get_user_org());

-- =============================================================
-- Storage buckets + policies
-- =============================================================
insert into storage.buckets (id, name, public)
values
  ('property-images', 'property-images', true),
  ('property-docs', 'property-docs', true),
  ('attendance-selfies', 'attendance-selfies', false),
  ('social-media', 'social-media', false)
on conflict (id) do nothing;

-- Authenticated org members manage files under their org's folder: {org_id}/...
create policy storage_org_read on storage.objects
  for select using (
    bucket_id in ('property-images', 'property-docs', 'attendance-selfies', 'social-media')
    and (
      bucket_id in ('property-images', 'property-docs') -- public buckets readable by anyone
      or (auth.role() = 'authenticated' and (storage.foldername(name))[1] = get_user_org()::text)
    )
  );

create policy storage_org_insert on storage.objects
  for insert with check (
    bucket_id in ('property-images', 'property-docs', 'attendance-selfies', 'social-media')
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = get_user_org()::text
  );

create policy storage_org_update on storage.objects
  for update using (
    bucket_id in ('property-images', 'property-docs', 'attendance-selfies', 'social-media')
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = get_user_org()::text
  );

create policy storage_org_delete on storage.objects
  for delete using (
    bucket_id in ('property-images', 'property-docs', 'attendance-selfies', 'social-media')
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = get_user_org()::text
  );

-- =============================================================
-- Realtime
-- =============================================================
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table activities;
alter publication supabase_realtime add table calls;
