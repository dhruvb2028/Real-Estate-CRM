"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { formatPrice } from "@/lib/constants";

interface LeadHit {
  id: string;
  full_name: string;
  phone: string;
}
interface PropertyHit {
  id: string;
  title: string;
  location: string;
  price: number;
}

const PAGES = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/leads/board", label: "Pipeline board", icon: Users },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/followups", label: "Follow-ups", icon: CalendarClock },
  { href: "/tasks", label: "Tasks & Site Visits", icon: ClipboardList },
  { href: "/attendance", label: "Attendance", icon: MapPin },
  { href: "/social", label: "Social Media", icon: Megaphone },
];

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<LeadHit[]>([]);
  const [properties, setProperties] = useState<PropertyHit[]>([]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Search leads + properties as the user types
  useEffect(() => {
    if (!open) return;
    const q = query.trim().replace(/[%_,]/g, " ");
    if (q.length < 2) {
      setLeads([]);
      setProperties([]);
      return;
    }
    const t = setTimeout(async () => {
      const supabase = createClient();
      const [l, p] = await Promise.all([
        supabase
          .from("leads")
          .select("id, full_name, phone")
          .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(5),
        supabase
          .from("properties")
          .select("id, title, location, price")
          .or(`title.ilike.%${q}%,location.ilike.%${q}%`)
          .limit(5),
      ]);
      setLeads((l.data as LeadHit[]) ?? []);
      setProperties((p.data as PropertyHit[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 md:size-10"
        aria-label="Search (Ctrl+K)"
        onClick={() => setOpen(true)}
      >
        <Search className="size-5" aria-hidden />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search leads, properties, pages…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {leads.length > 0 && (
            <CommandGroup heading="Leads">
              {leads.map((l) => (
                <CommandItem key={l.id} value={`${l.full_name} ${l.phone}`} onSelect={() => go(`/leads/${l.id}`)}>
                  <Users className="size-4" aria-hidden />
                  <span>{l.full_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{l.phone}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {properties.length > 0 && (
            <CommandGroup heading="Properties">
              {properties.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.title} ${p.location}`}
                  onSelect={() => go(`/properties/${p.id}`)}
                >
                  <Building2 className="size-4" aria-hidden />
                  <span className="truncate">{p.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatPrice(p.price)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {(leads.length > 0 || properties.length > 0) && <CommandSeparator />}

          <CommandGroup heading="Quick actions">
            <CommandItem value="Add lead new" onSelect={() => go("/leads/new")}>
              <UserPlus className="size-4" aria-hidden /> Add lead
            </CommandItem>
            <CommandItem value="Add property new" onSelect={() => go("/properties/new")}>
              <Plus className="size-4" aria-hidden /> Add property
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Go to">
            {PAGES.map((p) => (
              <CommandItem key={p.href} value={`${p.label} page`} onSelect={() => go(p.href)}>
                <p.icon className="size-4" aria-hidden /> {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
