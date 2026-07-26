import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Wallet,
  MessageCircle,
} from "lucide-react";
import { requireProfile } from "@/lib/supabase/server";
import {
  getAgents,
  getLeadDetail,
  getRecommendedProperties,
} from "@/server/queries/leads";
import { QuickActions } from "@/components/leads/quick-actions";
import { StatusControls } from "@/components/leads/status-controls";
import { LeadTimeline } from "@/components/leads/timeline";
import { NoteForm } from "@/components/leads/note-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LEAD_SOURCE_LABELS,
  PROPERTY_TYPE_LABELS,
  TEMPERATURE_COLORS,
  TEMPERATURE_LABELS,
  formatBudget,
  formatPrice,
  initials,
  waPhone,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lead" };
export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, detail] = await Promise.all([requireProfile(), getLeadDetail(id)]);
  if (!detail) notFound();
  const { lead, timeline } = detail;

  const [agents, recommended] = await Promise.all([
    getAgents(),
    getRecommendedProperties(lead),
  ]);

  const canAssign = ["admin", "sales_manager"].includes(profile.role);

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24 md:pb-0">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="size-14 ring-2 ring-gold/25">
          <AvatarFallback className="bg-gradient-to-br from-[oklch(0.3_0.01_56)] to-[oklch(0.22_0.008_56)] text-lg font-bold text-[oklch(0.85_0.1_90)]">
            {initials(lead.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-2xl font-semibold tracking-tight">{lead.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {LEAD_SOURCE_LABELS[lead.source]} · Added{" "}
            {format(new Date(lead.created_at), "d MMM yyyy")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge className={cn("border-0", TEMPERATURE_COLORS[lead.temperature])}>
              {TEMPERATURE_LABELS[lead.temperature]}
            </Badge>
            {lead.assigned_agent && (
              <Badge variant="outline">Agent: {lead.assigned_agent.full_name}</Badge>
            )}
          </div>
        </div>
      </div>

      <StatusControls lead={lead} agents={agents} canAssign={canAssign} />

      {/* Sticky quick actions (bottom on mobile) */}
      <QuickActions
        lead={lead}
        properties={recommended.map((p) => ({
          id: p.id,
          title: p.title,
          location: p.location,
          price: p.price,
        }))}
      />

      {/* Contact + requirements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2.5 text-sm">
          <a
            href={`tel:${lead.phone}`}
            className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-lg px-2 font-medium text-primary transition-colors active:bg-accent"
          >
            <Phone className="size-4 shrink-0" aria-hidden /> {lead.phone}
          </a>
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-foreground transition-colors active:bg-accent"
            >
              <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {lead.email}
            </a>
          )}
          <a
            href={`https://wa.me/${waPhone(lead.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-emerald-700 transition-colors active:bg-accent dark:text-emerald-400"
          >
            <MessageCircle className="size-4 shrink-0" aria-hidden /> Open WhatsApp chat
          </a>
          <p className="flex items-center gap-2.5">
            <Wallet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {formatBudget(lead.budget_min, lead.budget_max)}
            {lead.property_type ? ` · ${PROPERTY_TYPE_LABELS[lead.property_type]}` : ""}
          </p>
          {lead.preferred_location && (
            <p className="flex items-center gap-2.5">
              <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {lead.preferred_location}
            </p>
          )}
          {lead.next_followup_at && (
            <p className="text-muted-foreground">
              Next follow-up: {format(new Date(lead.next_followup_at), "d MMM, h:mm a")}
            </p>
          )}
          {lead.notes && (
            <p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-muted-foreground">
              {lead.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recommended properties */}
      {recommended.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recommended properties</CardTitle>
          </CardHeader>
          <CardContent className="no-scrollbar -mx-2 flex gap-3 overflow-x-auto px-2 pb-1">
            {recommended.map((p) => (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="w-44 shrink-0 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
              >
                <div className="mb-2 flex h-20 items-center justify-center rounded-md bg-primary/5">
                  <Building2 className="size-7 text-primary/40" aria-hidden />
                </div>
                <p className="truncate text-sm font-semibold">{p.title}</p>
                <p className="truncate text-xs text-muted-foreground">{p.location}</p>
                <p className="mt-1 text-sm font-bold text-primary">{formatPrice(p.price)}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notes + timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <NoteForm leadId={lead.id} />
          <LeadTimeline items={timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
