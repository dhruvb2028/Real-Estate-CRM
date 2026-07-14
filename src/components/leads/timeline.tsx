import { format } from "date-fns";
import {
  CalendarClock,
  MessageSquare,
  PhoneCall,
  Share2,
  StickyNote,
  UserPlus,
  Activity as ActivityIcon,
  Flame,
  ArrowRightLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CALL_STATUS_LABELS,
  FOLLOWUP_TYPE_LABELS,
  MESSAGE_CHANNEL_LABELS,
} from "@/lib/constants";
import type {
  Activity,
  Call,
  Followup,
  Message,
} from "@/lib/types";
import type { LeadTimelineItem } from "@/server/queries/leads";

function iconFor(item: LeadTimelineItem) {
  if (item.kind === "call") return PhoneCall;
  if (item.kind === "message") return MessageSquare;
  if (item.kind === "followup") return CalendarClock;
  if (item.kind === "share") return Share2;
  const a = item.data as Activity;
  switch (a.type) {
    case "note_added":
      return StickyNote;
    case "lead_assigned":
      return UserPlus;
    case "status_changed":
      return ArrowRightLeft;
    case "temperature_changed":
      return Flame;
    case "property_shared":
      return Share2;
    case "call_made":
      return PhoneCall;
    case "message_sent":
      return MessageSquare;
    default:
      return ActivityIcon;
  }
}

function TimelineBody({ item }: { item: LeadTimelineItem }) {
  switch (item.kind) {
    case "call": {
      const c = item.data as Call;
      return (
        <>
          <p className="text-sm font-medium">
            Bridge call · {CALL_STATUS_LABELS[c.status]}
            {c.is_dry_run && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                simulated
              </Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : "No duration"}
            {c.recording_url && (
              <>
                {" · "}
                <a
                  href={c.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Recording
                </a>
              </>
            )}
          </p>
        </>
      );
    }
    case "message": {
      const m = item.data as Message;
      return (
        <>
          <p className="text-sm font-medium">
            {MESSAGE_CHANNEL_LABELS[m.channel]} {m.direction === "outbound" ? "sent" : "received"}
            {m.is_dry_run && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                simulated
              </Badge>
            )}
          </p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{m.body}</p>
        </>
      );
    }
    case "followup": {
      const f = item.data as Followup;
      return (
        <>
          <p className="text-sm font-medium">
            Follow-up ({FOLLOWUP_TYPE_LABELS[f.type]}) · {f.status}
          </p>
          <p className="text-xs text-muted-foreground">
            Due {format(new Date(f.due_at), "d MMM, h:mm a")}
            {f.notes ? ` · ${f.notes}` : ""}
          </p>
        </>
      );
    }
    default: {
      const a = item.data as Activity;
      return (
        <>
          <p className="text-sm font-medium">{a.title}</p>
          {a.description && (
            <p className="whitespace-pre-wrap text-xs text-muted-foreground">{a.description}</p>
          )}
        </>
      );
    }
  }
}

export function LeadTimeline({ items }: { items: LeadTimelineItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No activity yet. Calls, messages, notes and shares will appear here.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {items.map((item) => {
        const Icon = iconFor(item);
        return (
          <li key={item.id} className="relative">
            <span className="absolute -left-[27px] flex size-4.5 items-center justify-center rounded-full bg-primary/10 ring-4 ring-background">
              <Icon className="size-2.5 text-primary" aria-hidden />
            </span>
            <TimelineBody item={item} />
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {format(new Date(item.at), "d MMM yyyy, h:mm a")}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
