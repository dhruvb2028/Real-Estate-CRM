-- =============================================================
-- EstateFlow CRM — 0002: Helper functions & triggers
-- =============================================================

-- Current user's organization (used by RLS policies)
create or replace function get_user_org()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from profiles where id = auth.uid();
$$;

-- Current user's role
create or replace function get_user_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- Is the current user an admin or sales manager?
create or replace function is_org_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role in ('admin', 'sales_manager') from profiles where id = auth.uid()),
    false
  );
$$;

-- updated_at maintenance
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
    group by table_name
  loop
    execute format(
      'create trigger trg_%I_updated_at before update on %I
       for each row execute function set_updated_at()', t, t
    );
  end loop;
end;
$$;

-- Create a profile row whenever an auth user is created.
-- Signup metadata drives org bootstrap:
--   * organization_name  → create a new org, user becomes admin
--   * invite_token       → join the inviting org with the invited role
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_role user_role := 'sales_agent';
  v_invite team_members%rowtype;
  v_org_name text := new.raw_user_meta_data ->> 'organization_name';
  v_invite_token text := new.raw_user_meta_data ->> 'invite_token';
begin
  if v_invite_token is not null then
    select * into v_invite
    from team_members
    where token = v_invite_token
      and status = 'pending'
      and expires_at > now();
    if found then
      v_org := v_invite.organization_id;
      v_role := v_invite.role;
      update team_members
        set status = 'accepted', accepted_at = now()
        where id = v_invite.id;
    end if;
  end if;

  if v_org is null and v_org_name is not null then
    insert into organizations (name) values (v_org_name) returning id into v_org;
    v_role := 'admin';
    insert into integration_settings (organization_id) values (v_org);
  end if;

  insert into profiles (id, organization_id, full_name, email, phone, role)
  values (
    new.id,
    v_org,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'phone',
    v_role
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Round-robin agent picker: least-recently-assigned active sales agent.
-- Atomically advances the cursor so concurrent webhooks don't double-assign.
create or replace function next_round_robin_agent(p_org uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent uuid;
begin
  select id into v_agent
  from profiles
  where organization_id = p_org
    and role = 'sales_agent'
    and is_active
  order by last_assigned_at asc nulls first, created_at asc
  limit 1
  for update skip locked;

  if v_agent is not null then
    update profiles set last_assigned_at = now() where id = v_agent;
  end if;

  return v_agent;
end;
$$;

-- Least-busy agent picker: active sales agent with fewest open leads.
create or replace function next_least_busy_agent(p_org uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent uuid;
begin
  select p.id into v_agent
  from profiles p
  left join leads l
    on l.assigned_agent_id = p.id
    and l.status not in ('won', 'lost', 'not_responding')
  where p.organization_id = p_org
    and p.role = 'sales_agent'
    and p.is_active
  group by p.id
  order by count(l.id) asc, p.last_assigned_at asc nulls first
  limit 1;

  if v_agent is not null then
    update profiles set last_assigned_at = now() where id = v_agent;
  end if;

  return v_agent;
end;
$$;

-- Public property lookup for share pages (anon-safe; exposes no org internals)
create or replace function get_public_property(p_share_token text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'location', p.location,
    'address', p.address,
    'property_type', p.property_type,
    'price', p.price,
    'size_sqft', p.size_sqft,
    'bedrooms', p.bedrooms,
    'bathrooms', p.bathrooms,
    'floor', p.floor,
    'furnishing', p.furnishing,
    'availability', p.availability,
    'description', p.description,
    'amenities', p.amenities,
    'organization_name', o.name,
    'organization_phone', o.phone,
    'images', coalesce(
      (
        select jsonb_agg(jsonb_build_object('url', pi.url, 'is_cover', pi.is_cover)
               order by pi.is_cover desc, pi.sort_order)
        from property_images pi
        where pi.property_id = p.id
      ),
      '[]'::jsonb
    )
  )
  from properties p
  join organizations o on o.id = p.organization_id
  where p.share_token = p_share_token;
$$;

grant execute on function get_public_property(text) to anon, authenticated;
