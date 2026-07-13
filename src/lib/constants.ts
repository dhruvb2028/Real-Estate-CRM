import type {
  AttendanceStatus,
  CallStatus,
  FollowupStatus,
  FollowupType,
  LeadSource,
  LeadStatus,
  LeadTemperature,
  MessageChannel,
  PropertyAvailability,
  PropertyType,
  SocialPostStatus,
  SocialPostType,
  UserRole,
} from "@/lib/types";

export const APP_NAME = "EstateFlow CRM";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  sales_manager: "Sales Manager",
  sales_agent: "Sales Agent",
  field_executive: "Field Executive",
  social_media_manager: "Social Media Manager",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  "36acre": "36 Acre",
  magicbricks: "MagicBricks",
  housing: "Housing.com",
  facebook: "Facebook",
  instagram: "Instagram",
  website: "Website",
  whatsapp: "WhatsApp",
  referral: "Referral",
  manual: "Manual",
  other: "Other",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  site_visit_scheduled: "Site Visit Scheduled",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  not_responding: "Not Responding",
  call_pending: "Call Pending",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  contacted: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  interested: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  site_visit_scheduled: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  negotiation: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  lost: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  not_responding: "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400",
  call_pending: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
};

export const TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

export const TEMPERATURE_COLORS: Record<LeadTemperature, string> = {
  hot: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  warm: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  cold: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Apartment",
  villa: "Villa",
  plot: "Plot",
  commercial: "Commercial",
  rental: "Rental",
};

export const AVAILABILITY_LABELS: Record<PropertyAvailability, string> = {
  available: "Available",
  hold: "On Hold",
  sold: "Sold",
  rented: "Rented",
};

export const AVAILABILITY_COLORS: Record<PropertyAvailability, string> = {
  available: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  hold: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  sold: "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400",
  rented: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
};

export const FURNISHING_LABELS = {
  unfurnished: "Unfurnished",
  semi_furnished: "Semi-Furnished",
  fully_furnished: "Fully Furnished",
} as const;

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  queued: "Queued",
  ringing_agent: "Ringing Agent",
  agent_connected: "Agent Connected",
  ringing_lead: "Calling Lead",
  bridged: "On Call",
  completed: "Completed",
  agent_no_answer: "Agent No Answer",
  lead_no_answer: "Lead No Answer",
  busy: "Busy",
  failed: "Failed",
  canceled: "Canceled",
};

export const FOLLOWUP_TYPE_LABELS: Record<FollowupType, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  call: "Call",
  meeting: "Meeting",
  site_visit: "Site Visit",
};

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  snoozed: "Snoozed",
  cancelled: "Cancelled",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  half_day: "Half Day",
  absent: "Absent",
};

export const SOCIAL_POST_TYPE_LABELS: Record<SocialPostType, string> = {
  instagram_reel: "Instagram Reel",
  instagram_post: "Instagram Post",
  facebook_post: "Facebook Post",
  linkedin_post: "LinkedIn Post",
  story: "Story",
};

export const SOCIAL_POST_STATUS_LABELS: Record<SocialPostStatus, string> = {
  idea: "Idea",
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
};

export const SOCIAL_POST_STATUS_COLORS: Record<SocialPostStatus, string> = {
  idea: "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  scheduled: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export const MESSAGE_CHANNEL_LABELS: Record<MessageChannel, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

// ---------- Message templates ----------

export interface MessageTemplate {
  key: string;
  label: string;
  channels: MessageChannel[];
  body: string;
}

/**
 * Template variables: {{leadName}}, {{agentName}}, {{preferredLocation}},
 * {{propertyTitle}}, {{location}}, {{price}}, {{shareLink}}, {{orgName}}
 */
export const FOLLOWUP_TEMPLATES: MessageTemplate[] = [
  {
    key: "review_check",
    label: "Property review check-in",
    channels: ["whatsapp", "sms", "email"],
    body: "Hi {{leadName}}, just checking if you had a chance to review the property details I shared.",
  },
  {
    key: "quick_call",
    label: "Quick call request",
    channels: ["whatsapp", "sms", "email"],
    body: "Hi {{leadName}}, are you available for a quick call today to discuss properties in {{preferredLocation}}?",
  },
  {
    key: "new_options",
    label: "New matching options",
    channels: ["whatsapp", "sms", "email"],
    body: "Hi {{leadName}}, we have a few new options matching your budget. Should I share them?",
  },
];

export const PROPERTY_SHARE_TEMPLATE: MessageTemplate = {
  key: "property_share",
  label: "Property share",
  channels: ["whatsapp", "sms", "email"],
  body: "Hi {{leadName}}, sharing details of {{propertyTitle}} in {{location}}. Price: {{price}}. Photos and details: {{shareLink}}",
};

export function renderTemplate(
  body: string,
  vars: Record<string, string | number | null | undefined>
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

// ---------- Formatting ----------

/** Indian currency, compact: ₹1.25 Cr / ₹75 L / ₹35,000 */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value >= 10000000) {
    const cr = value / 10000000;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  if (value >= 100000) {
    const l = value / 100000;
    return `₹${l % 1 === 0 ? l : l.toFixed(1)} L`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatBudget(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  if (!min && !max) return "—";
  if (min && max) return `${formatPrice(min)} – ${formatPrice(max)}`;
  return formatPrice(min ?? max);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Normalize a phone into wa.me format (digits only, best effort). */
export function waPhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}
