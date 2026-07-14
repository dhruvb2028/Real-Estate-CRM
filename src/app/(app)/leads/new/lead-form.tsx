"use client";

import { useActionState } from "react";
import { AlertCircle, PhoneCall } from "lucide-react";
import { createLead } from "@/server/actions/leads";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/layout/submit-button";
import {
  LEAD_SOURCE_LABELS,
  PROPERTY_TYPE_LABELS,
  TEMPERATURE_LABELS,
} from "@/lib/constants";

export function LeadForm({ agents }: { agents: { id: string; full_name: string }[] }) {
  const [state, formAction] = useActionState(createLead, {});

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name *</Label>
            <Input id="fullName" name="fullName" required className="h-11" placeholder="Rahul Sharma" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                required
                className="h-11"
                placeholder="+91 99999 99999"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                className="h-11"
                placeholder="rahul@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="source">Source</Label>
              <Select name="source" defaultValue="manual">
                <SelectTrigger id="source" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_SOURCE_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="propertyType">Property type</Label>
              <Select name="propertyType">
                <SelectTrigger id="propertyType" className="h-11 w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="budgetMin">Budget min (₹)</Label>
              <Input
                id="budgetMin"
                name="budgetMin"
                type="number"
                inputMode="numeric"
                min={0}
                className="h-11"
                placeholder="7500000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budgetMax">Budget max (₹)</Label>
              <Input
                id="budgetMax"
                name="budgetMax"
                type="number"
                inputMode="numeric"
                min={0}
                className="h-11"
                placeholder="12000000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preferredLocation">Preferred location</Label>
            <Input
              id="preferredLocation"
              name="preferredLocation"
              className="h-11"
              placeholder="Golf Course Road, Gurgaon"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="temperature">Temperature</Label>
              <Select name="temperature" defaultValue="warm">
                <SelectTrigger id="temperature" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPERATURE_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assignedAgentId">Assign to</Label>
              <Select name="assignedAgentId">
                <SelectTrigger id="assignedAgentId" className="h-11 w-full">
                  <SelectValue placeholder="Auto (round-robin)" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nextFollowupAt">Next follow-up</Label>
            <Input id="nextFollowupAt" name="nextFollowupAt" type="datetime-local" className="h-11" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Looking for 3BHK near Golf Course Road…"
            />
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-accent/40 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <PhoneCall className="size-4 text-primary" aria-hidden />
              Start bridge call after saving
            </span>
            <Switch name="autoCall" value="true" />
          </label>

          {state.error && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}

          <SubmitButton>Save lead</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
