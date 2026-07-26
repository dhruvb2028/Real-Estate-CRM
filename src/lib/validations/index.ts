import { z } from "zod";

// ---------- Shared ----------
export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number is too short")
  .max(20)
  .regex(/^\+?[\d\s()-]+$/, "Invalid phone number");

export const leadSourceEnum = z.enum([
  "36acre", "magicbricks", "housing", "facebook", "instagram",
  "website", "whatsapp", "referral", "manual", "other",
]);

export const propertyTypeEnum = z.enum([
  "apartment", "villa", "plot", "commercial", "rental",
]);

export const leadStatusEnum = z.enum([
  "new", "contacted", "interested", "site_visit_scheduled",
  "negotiation", "won", "lost", "not_responding", "call_pending",
]);

export const temperatureEnum = z.enum(["cold", "warm", "hot"]);

export const roleEnum = z.enum([
  "admin", "sales_manager", "sales_agent", "field_executive", "social_media_manager",
]);

export const messageChannelEnum = z.enum(["whatsapp", "sms", "email"]);

// ---------- Auth ----------
export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email"),
  phone: phoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().trim().min(2, "Enter your business name").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const inviteAcceptSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  token: z.string().min(10),
});

export const inviteCreateSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  role: roleEnum,
});

// ---------- Leads ----------
export const leadFormSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(120),
  phone: phoneSchema,
  email: z.union([z.literal(""), z.string().trim().email("Invalid email")]).optional(),
  source: leadSourceEnum.default("manual"),
  propertyType: z.union([z.literal(""), propertyTypeEnum]).optional(),
  budgetMin: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
  budgetMax: z.coerce.number().int().nonnegative().optional().or(z.literal("")),
  preferredLocation: z.string().trim().max(200).optional(),
  temperature: temperatureEnum.default("warm"),
  assignedAgentId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
  nextFollowupAt: z.string().optional(),
  autoCall: z.coerce.boolean().optional(),
});

/**
 * External webhook payload (36 Acre / portals / Zapier / forms).
 * Tolerant: accepts fullName|full_name|name, phone|phoneNumber|mobile, etc.
 */
export const webhookLeadSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    full_name: z.string().trim().min(1).max(120).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().optional(),
    phoneNumber: z.string().trim().optional(),
    mobile: z.string().trim().optional(),
    email: z.string().trim().email().optional().or(z.literal("")),
    source: z.string().trim().optional(),
    propertyType: z.string().trim().optional(),
    property_type: z.string().trim().optional(),
    budgetMin: z.coerce.number().nonnegative().optional(),
    budget_min: z.coerce.number().nonnegative().optional(),
    budgetMax: z.coerce.number().nonnegative().optional(),
    budget_max: z.coerce.number().nonnegative().optional(),
    preferredLocation: z.string().trim().max(200).optional(),
    preferred_location: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(5000).optional(),
  })
  .refine((d) => d.fullName || d.full_name || d.name, {
    message: "A name field is required (fullName / full_name / name)",
  })
  .refine((d) => d.phone || d.phoneNumber || d.mobile, {
    message: "A phone field is required (phone / phoneNumber / mobile)",
  });

export type WebhookLeadInput = z.infer<typeof webhookLeadSchema>;

/** Map free-text source strings from portals to our enum. */
export function normalizeSource(raw: string | undefined): z.infer<typeof leadSourceEnum> {
  if (!raw) return "other";
  const s = raw.toLowerCase().replace(/[\s._-]/g, "");
  if (s.includes("36") || s.includes("acre")) return "36acre";
  if (s.includes("magic")) return "magicbricks";
  if (s.includes("housing")) return "housing";
  if (s.includes("facebook") || s === "fb") return "facebook";
  if (s.includes("instagram") || s === "ig") return "instagram";
  if (s.includes("website") || s.includes("web") || s.includes("form")) return "website";
  if (s.includes("whatsapp") || s === "wa") return "whatsapp";
  if (s.includes("referral") || s.includes("refer")) return "referral";
  if (s.includes("manual")) return "manual";
  return "other";
}

export function normalizePropertyType(
  raw: string | undefined
): z.infer<typeof propertyTypeEnum> | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("apart") || s.includes("flat") || s.includes("bhk")) return "apartment";
  if (s.includes("villa") || s.includes("house")) return "villa";
  if (s.includes("plot") || s.includes("land")) return "plot";
  if (s.includes("commer") || s.includes("office") || s.includes("shop")) return "commercial";
  if (s.includes("rent")) return "rental";
  return null;
}

// ---------- Properties ----------
export const propertyFormSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(150),
  location: z.string().trim().min(2, "Location is required").max(150),
  address: z.string().trim().max(300).optional(),
  propertyType: propertyTypeEnum,
  price: z.coerce.number().int().nonnegative("Price is required"),
  sizeSqft: z.coerce.number().nonnegative().optional().or(z.literal("")),
  bedrooms: z.coerce.number().int().min(0).max(30).optional().or(z.literal("")),
  bathrooms: z.coerce.number().int().min(0).max(30).optional().or(z.literal("")),
  floor: z.string().trim().max(30).optional(),
  furnishing: z
    .union([z.literal(""), z.enum(["unfurnished", "semi_furnished", "fully_furnished"])])
    .optional(),
  availability: z.enum(["available", "hold", "sold", "rented"]).default("available"),
  description: z.string().trim().max(5000).optional(),
  amenities: z.string().trim().max(1000).optional(), // comma separated in the form
  tags: z.string().trim().max(500).optional(),
  unitsAvailable: z.coerce.number().int().min(0).default(1),
  ownerName: z.string().trim().max(120).optional(),
  ownerPhone: z.string().trim().max(20).optional(),
  developerName: z.string().trim().max(120).optional(),
});

// ---------- Follow-ups ----------
export const followupFormSchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(["whatsapp", "sms", "email", "call", "meeting", "site_visit"]),
  dueAt: z.string().min(1, "Pick a date/time"),
  notes: z.string().trim().max(2000).optional(),
  templateKey: z.string().optional(),
});

// ---------- Social ----------
export const socialPostFormSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(200),
  postType: z.enum(["instagram_reel", "instagram_post", "facebook_post", "linkedin_post", "story"]),
  caption: z.string().trim().max(3000).optional(),
  status: z.enum(["idea", "draft", "scheduled", "published"]).default("idea"),
  scheduledAt: z.string().optional(),
  assignedTo: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
});

// ---------- Settings ----------
export const integrationSettingsSchema = z.object({
  twilioAccountSid: z.string().trim().max(100).optional(),
  twilioAuthToken: z.string().trim().max(100).optional(),
  twilioPhoneNumber: z.string().trim().max(20).optional(),
  whatsappSender: z.string().trim().max(30).optional(),
  resendApiKey: z.string().trim().max(120).optional(),
  leadWebhookSecret: z.string().trim().min(12, "Use at least 12 characters").max(120),
  openaiApiKey: z.string().trim().max(200).optional(),
  openaiBaseUrl: z.union([z.literal(""), z.string().trim().url()]).optional(),
  socialWebhookUrl: z.union([z.literal(""), z.string().trim().url()]).optional(),
  defaultAssignmentMode: z.enum(["round_robin", "manual", "least_busy"]),
  whatsappMode: z.enum(["deep_link", "api"]).default("deep_link"),
  dryRun: z.coerce.boolean(),
});
