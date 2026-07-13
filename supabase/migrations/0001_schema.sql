-- =============================================================
-- EstateFlow CRM — 0001: Core schema (enums, tables, indexes)
-- =============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role as enum (
  'admin', 'sales_manager', 'sales_agent', 'field_executive', 'social_media_manager'
);

create type lead_source as enum (
  '36acre', 'magicbricks', 'housing', 'facebook', 'instagram',
  'website', 'whatsapp', 'referral', 'manual', 'other'
);

create type property_type as enum (
  'apartment', 'villa', 'plot', 'commercial', 'rental'
);

create type lead_status as enum (
  'new', 'contacted', 'interested', 'site_visit_scheduled',
  'negotiation', 'won', 'lost', 'not_responding', 'call_pending'
);

create type lead_temperature as enum ('cold', 'warm', 'hot');

create type property_availability as enum ('available', 'hold', 'sold', 'rented');

create type furnishing_status as enum ('unfurnished', 'semi_furnished', 'fully_furnished');

create type call_status as enum (
  'queued', 'ringing_agent', 'agent_connected', 'ringing_lead',
  'bridged', 'completed', 'agent_no_answer', 'lead_no_answer',
  'busy', 'failed', 'canceled'
);

create type call_outcome as enum (
  'connected', 'agent_no_answer', 'lead_no_answer', 'busy', 'failed', 'voicemail', 'pending'
);

create type message_channel as enum ('whatsapp', 'sms', 'email');

create type message_status as enum ('queued', 'sent', 'delivered', 'read', 'failed', 'simulated');

create type followup_type as enum ('whatsapp', 'sms', 'email', 'call', 'meeting', 'site_visit');

create type followup_status as enum ('pending', 'completed', 'snoozed', 'cancelled');

create type attendance_status as enum ('present', 'late', 'half_day', 'absent');

create type social_post_type as enum (
  'instagram_reel', 'instagram_post', 'facebook_post', 'linkedin_post', 'story'
);

create type social_post_status as enum ('idea', 'draft', 'scheduled', 'published');

create type activity_type as enum (
  'lead_created', 'lead_assigned', 'status_changed', 'temperature_changed',
  'note_added', 'call_made', 'message_sent', 'property_shared',
  'followup_scheduled', 'followup_completed', 'site_visit',
  'attendance_event', 'social_post_event', 'other'
);

create type notification_type as enum (
  'new_lead_assigned', 'missed_lead_call', 'followup_due', 'site_visit_scheduled',
  'property_shared', 'attendance_issue', 'social_post_due', 'general'
);

create type assignment_mode as enum ('round_robin', 'manual', 'least_busy');

create type invite_status as enum ('pending', 'accepted', 'expired', 'revoked');

create type task_status as enum ('pending', 'in_progress', 'completed', 'cancelled');

-- ---------- Tables ----------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  logo_url text,
  work_start_time time default '09:30',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profiles extend auth.users (1:1)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid references organizations (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  role user_role not null default 'sales_agent',
  avatar_url text,
  is_active boolean not null default true,
  last_assigned_at timestamptz, -- round-robin cursor
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Team invitations
create table team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  role user_role not null default 'sales_agent',
  invited_by uuid references profiles (id) on delete set null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status invite_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Custom/extra lead sources per org
create table lead_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  source lead_source not null default 'manual',
  source_detail text,
  property_type property_type,
  budget_min bigint,
  budget_max bigint,
  preferred_location text,
  status lead_status not null default 'new',
  temperature lead_temperature not null default 'warm',
  assigned_agent_id uuid references profiles (id) on delete set null,
  notes text,
  next_followup_at timestamptz,
  last_contacted_at timestamptz,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  title text not null,
  location text not null,
  address text,
  property_type property_type not null default 'apartment',
  price bigint not null default 0,
  size_sqft numeric,
  bedrooms int,
  bathrooms int,
  floor text,
  furnishing furnishing_status,
  availability property_availability not null default 'available',
  description text,
  amenities text[] not null default '{}',
  tags text[] not null default '{}',
  units_available int not null default 1,
  owner_name text,
  owner_phone text,
  developer_name text,
  share_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table property_images (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  storage_path text,
  url text not null,
  is_cover boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table property_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  name text not null,
  storage_path text,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table lead_property_shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  shared_by uuid references profiles (id) on delete set null,
  channel message_channel not null default 'whatsapp',
  message_body text,
  share_url text,
  status message_status not null default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unified activity timeline
create table activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lead_id uuid references leads (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  type activity_type not null default 'other',
  title text not null,
  description text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  agent_id uuid references profiles (id) on delete set null,
  call_sid text,
  conference_sid text,
  status call_status not null default 'queued',
  duration int, -- seconds
  recording_url text,
  started_at timestamptz,
  ended_at timestamptz,
  outcome call_outcome not null default 'pending',
  is_dry_run boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  sender_id uuid references profiles (id) on delete set null,
  channel message_channel not null default 'whatsapp',
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  template_key text,
  subject text,
  body text not null,
  status message_status not null default 'queued',
  external_id text,
  is_dry_run boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table followups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lead_id uuid not null references leads (id) on delete cascade,
  agent_id uuid references profiles (id) on delete set null,
  type followup_type not null default 'call',
  notes text,
  template_key text,
  due_at timestamptz not null,
  status followup_status not null default 'pending',
  completed_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  work_date date not null default current_date,
  check_in_time timestamptz,
  check_out_time timestamptz,
  check_in_latitude double precision,
  check_in_longitude double precision,
  check_out_latitude double precision,
  check_out_longitude double precision,
  selfie_url text,
  status attendance_status not null default 'present',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date)
);

create table social_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  title text not null,
  post_type social_post_type not null default 'instagram_post',
  caption text,
  media_urls text[] not null default '{}',
  status social_post_status not null default 'idea',
  scheduled_at timestamptz,
  published_at timestamptz,
  assigned_to uuid references profiles (id) on delete set null,
  notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lead_id uuid references leads (id) on delete cascade,
  property_id uuid references properties (id) on delete set null,
  assigned_to uuid references profiles (id) on delete set null,
  title text not null,
  description text,
  task_type text not null default 'general' check (task_type in ('general', 'site_visit', 'call', 'followup')),
  due_at timestamptz,
  status task_status not null default 'pending',
  completed_at timestamptz,
  visit_notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Org-level integration configuration (secrets should prefer env vars in dev)
create table integration_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations (id) on delete cascade,
  twilio_account_sid text,
  twilio_auth_token text,
  twilio_phone_number text,
  whatsapp_sender text,
  resend_api_key text,
  smtp_settings jsonb,
  lead_webhook_secret text not null default encode(gen_random_bytes(24), 'hex'),
  openai_api_key text,
  openai_base_url text,
  social_webhook_url text,
  default_assignment_mode assignment_mode not null default 'round_robin',
  dry_run boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  type notification_type not null default 'general',
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index idx_profiles_org on profiles (organization_id);
create index idx_profiles_org_role on profiles (organization_id, role) where is_active;
create index idx_team_members_org on team_members (organization_id);
create index idx_leads_org on leads (organization_id);
create index idx_leads_org_status on leads (organization_id, status);
create index idx_leads_org_agent on leads (organization_id, assigned_agent_id);
create index idx_leads_org_temp on leads (organization_id, temperature);
create index idx_leads_org_followup on leads (organization_id, next_followup_at);
create index idx_leads_org_created on leads (organization_id, created_at desc);
create index idx_properties_org on properties (organization_id);
create index idx_properties_share_token on properties (share_token);
create index idx_properties_org_availability on properties (organization_id, availability);
create index idx_property_images_property on property_images (property_id);
create index idx_property_documents_property on property_documents (property_id);
create index idx_shares_lead on lead_property_shares (lead_id);
create index idx_activities_org_created on activities (organization_id, created_at desc);
create index idx_activities_lead on activities (lead_id, created_at desc);
create index idx_calls_org on calls (organization_id, created_at desc);
create index idx_calls_lead on calls (lead_id);
create index idx_calls_sid on calls (call_sid);
create index idx_messages_lead on messages (lead_id);
create index idx_followups_org_due on followups (organization_id, status, due_at);
create index idx_followups_lead on followups (lead_id);
create index idx_followups_agent on followups (agent_id, status, due_at);
create index idx_attendance_org_date on attendance (organization_id, work_date desc);
create index idx_attendance_user_date on attendance (user_id, work_date desc);
create index idx_social_posts_org on social_posts (organization_id, scheduled_at);
create index idx_tasks_org on tasks (organization_id, status, due_at);
create index idx_tasks_assignee on tasks (assigned_to, status);
create index idx_notifications_user on notifications (user_id, created_at desc) ;
create index idx_notifications_user_unread on notifications (user_id) where read_at is null;
