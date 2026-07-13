// =============================================================
// EstateFlow CRM — Domain types (mirror supabase/migrations/0001)
// =============================================================

export type UserRole =
  | "admin"
  | "sales_manager"
  | "sales_agent"
  | "field_executive"
  | "social_media_manager";

export type LeadSource =
  | "36acre"
  | "magicbricks"
  | "housing"
  | "facebook"
  | "instagram"
  | "website"
  | "whatsapp"
  | "referral"
  | "manual"
  | "other";

export type PropertyType = "apartment" | "villa" | "plot" | "commercial" | "rental";

export type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "site_visit_scheduled"
  | "negotiation"
  | "won"
  | "lost"
  | "not_responding"
  | "call_pending";

export type LeadTemperature = "cold" | "warm" | "hot";

export type PropertyAvailability = "available" | "hold" | "sold" | "rented";

export type FurnishingStatus = "unfurnished" | "semi_furnished" | "fully_furnished";

export type CallStatus =
  | "queued"
  | "ringing_agent"
  | "agent_connected"
  | "ringing_lead"
  | "bridged"
  | "completed"
  | "agent_no_answer"
  | "lead_no_answer"
  | "busy"
  | "failed"
  | "canceled";

export type CallOutcome =
  | "connected"
  | "agent_no_answer"
  | "lead_no_answer"
  | "busy"
  | "failed"
  | "voicemail"
  | "pending";

export type MessageChannel = "whatsapp" | "sms" | "email";

export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed" | "simulated";

export type FollowupType = "whatsapp" | "sms" | "email" | "call" | "meeting" | "site_visit";

export type FollowupStatus = "pending" | "completed" | "snoozed" | "cancelled";

export type AttendanceStatus = "present" | "late" | "half_day" | "absent";

export type SocialPostType =
  | "instagram_reel"
  | "instagram_post"
  | "facebook_post"
  | "linkedin_post"
  | "story";

export type SocialPostStatus = "idea" | "draft" | "scheduled" | "published";

export type ActivityType =
  | "lead_created"
  | "lead_assigned"
  | "status_changed"
  | "temperature_changed"
  | "note_added"
  | "call_made"
  | "message_sent"
  | "property_shared"
  | "followup_scheduled"
  | "followup_completed"
  | "site_visit"
  | "attendance_event"
  | "social_post_event"
  | "other";

export type NotificationType =
  | "new_lead_assigned"
  | "missed_lead_call"
  | "followup_due"
  | "site_visit_scheduled"
  | "property_shared"
  | "attendance_issue"
  | "social_post_due"
  | "general";

export type AssignmentMode = "round_robin" | "manual" | "least_busy";

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

// ---------- Rows ----------

interface BaseRow {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Organization extends BaseRow {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  work_start_time: string | null;
}

export interface Profile extends BaseRow {
  organization_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  last_assigned_at: string | null;
}

export interface TeamInvite extends BaseRow {
  organization_id: string;
  email: string;
  role: UserRole;
  invited_by: string | null;
  token: string;
  status: InviteStatus;
  expires_at: string;
  accepted_at: string | null;
}

export interface Lead extends BaseRow {
  organization_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  source_detail: string | null;
  property_type: PropertyType | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_location: string | null;
  status: LeadStatus;
  temperature: LeadTemperature;
  assigned_agent_id: string | null;
  notes: string | null;
  next_followup_at: string | null;
  last_contacted_at: string | null;
  created_by: string | null;
}

export interface LeadWithAgent extends Lead {
  assigned_agent: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
}

export interface Property extends BaseRow {
  organization_id: string;
  title: string;
  location: string;
  address: string | null;
  property_type: PropertyType;
  price: number;
  size_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  furnishing: FurnishingStatus | null;
  availability: PropertyAvailability;
  description: string | null;
  amenities: string[];
  tags: string[];
  units_available: number;
  owner_name: string | null;
  owner_phone: string | null;
  developer_name: string | null;
  share_token: string;
  created_by: string | null;
}

export interface PropertyImage extends BaseRow {
  organization_id: string;
  property_id: string;
  storage_path: string | null;
  url: string;
  is_cover: boolean;
  sort_order: number;
}

export interface PropertyDocument extends BaseRow {
  organization_id: string;
  property_id: string;
  name: string;
  storage_path: string | null;
  url: string;
}

export interface PropertyWithImages extends Property {
  property_images: PropertyImage[];
}

export interface LeadPropertyShare extends BaseRow {
  organization_id: string;
  lead_id: string;
  property_id: string;
  shared_by: string | null;
  channel: MessageChannel;
  message_body: string | null;
  share_url: string | null;
  status: MessageStatus;
}

export interface Activity extends BaseRow {
  organization_id: string;
  lead_id: string | null;
  actor_id: string | null;
  type: ActivityType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  actor?: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
}

export interface Call extends BaseRow {
  organization_id: string;
  lead_id: string;
  agent_id: string | null;
  call_sid: string | null;
  conference_sid: string | null;
  status: CallStatus;
  duration: number | null;
  recording_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  outcome: CallOutcome;
  is_dry_run: boolean;
  notes: string | null;
}

export interface Message extends BaseRow {
  organization_id: string;
  lead_id: string;
  sender_id: string | null;
  channel: MessageChannel;
  direction: "outbound" | "inbound";
  template_key: string | null;
  subject: string | null;
  body: string;
  status: MessageStatus;
  external_id: string | null;
  is_dry_run: boolean;
}

export interface Followup extends BaseRow {
  organization_id: string;
  lead_id: string;
  agent_id: string | null;
  type: FollowupType;
  notes: string | null;
  template_key: string | null;
  due_at: string;
  status: FollowupStatus;
  completed_at: string | null;
  snoozed_until: string | null;
  lead?: Pick<Lead, "id" | "full_name" | "phone" | "preferred_location" | "temperature"> | null;
}

export interface AttendanceRecord extends BaseRow {
  organization_id: string;
  user_id: string;
  work_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  selfie_url: string | null;
  status: AttendanceStatus;
  notes: string | null;
  user?: Pick<Profile, "id" | "full_name" | "avatar_url" | "role"> | null;
}

export interface SocialPost extends BaseRow {
  organization_id: string;
  title: string;
  post_type: SocialPostType;
  caption: string | null;
  media_urls: string[];
  status: SocialPostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_by: string | null;
  assignee?: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
}

export interface CrmTask extends BaseRow {
  organization_id: string;
  lead_id: string | null;
  property_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  task_type: "general" | "site_visit" | "call" | "followup";
  due_at: string | null;
  status: TaskStatus;
  completed_at: string | null;
  visit_notes: string | null;
  created_by: string | null;
}

export interface IntegrationSettings extends BaseRow {
  organization_id: string;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_phone_number: string | null;
  whatsapp_sender: string | null;
  resend_api_key: string | null;
  smtp_settings: Record<string, unknown> | null;
  lead_webhook_secret: string;
  openai_api_key: string | null;
  openai_base_url: string | null;
  social_webhook_url: string | null;
  default_assignment_mode: AssignmentMode;
  dry_run: boolean;
}

export interface AppNotification extends BaseRow {
  organization_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
}

// ---------- Service results ----------

export interface ServiceResult<T = unknown> {
  ok: boolean;
  dryRun?: boolean;
  data?: T;
  error?: string;
}

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}
