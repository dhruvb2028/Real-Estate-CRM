"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { importLeads } from "@/server/actions/leads";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ParsedRow {
  fullName: string;
  phone: string;
  email?: string;
  source?: string;
  propertyType?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredLocation?: string;
  notes?: string;
}

/** Minimal CSV parser handling quoted fields and CRLF. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<keyof ParsedRow, string[]> = {
  fullName: ["fullname", "full name", "name", "lead name", "client"],
  phone: ["phone", "phone number", "mobile", "contact", "number"],
  email: ["email", "e-mail", "mail"],
  source: ["source", "lead source", "portal", "platform"],
  propertyType: ["propertytype", "property type", "type", "interested in"],
  budgetMin: ["budgetmin", "budget min", "min budget", "budget from"],
  budgetMax: ["budgetmax", "budget max", "max budget", "budget to", "budget"],
  preferredLocation: ["preferredlocation", "preferred location", "location", "area", "city"],
  notes: ["notes", "note", "comments", "remarks", "requirement"],
};

function mapHeaders(headers: string[]): Partial<Record<keyof ParsedRow, number>> {
  const map: Partial<Record<keyof ParsedRow, number>> = {};
  headers.forEach((h, i) => {
    const norm = h.trim().toLowerCase();
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm) && map[key as keyof ParsedRow] === undefined) {
        map[key as keyof ParsedRow] = i;
      }
    }
  });
  return map;
}

export function ImportWizard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [autoAssign, setAutoAssign] = useState(true);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ imported: number; skipped: number } | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    setDone(null);
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) {
      toast.error("CSV needs a header row and at least one data row");
      setRows([]);
      return;
    }
    const map = mapHeaders(parsed[0]);
    if (map.fullName === undefined || map.phone === undefined) {
      toast.error('Could not find "name" and "phone" columns in the header');
      setRows([]);
      return;
    }
    const get = (r: string[], k: keyof ParsedRow) =>
      map[k] !== undefined ? r[map[k]!]?.trim() : undefined;
    const data: ParsedRow[] = parsed.slice(1).map((r) => ({
      fullName: get(r, "fullName") ?? "",
      phone: get(r, "phone") ?? "",
      email: get(r, "email") || undefined,
      source: get(r, "source") || undefined,
      propertyType: get(r, "propertyType") || undefined,
      budgetMin: get(r, "budgetMin") ? Number(get(r, "budgetMin")!.replace(/[^\d]/g, "")) || undefined : undefined,
      budgetMax: get(r, "budgetMax") ? Number(get(r, "budgetMax")!.replace(/[^\d]/g, "")) || undefined : undefined,
      preferredLocation: get(r, "preferredLocation") || undefined,
      notes: get(r, "notes") || undefined,
    }));
    setRows(data.slice(0, 500));
    if (data.length > 500) toast.warning("Only the first 500 rows will be imported");
  }

  function onImport() {
    startTransition(async () => {
      const r = await importLeads(JSON.stringify(rows), autoAssign);
      if (r.ok) {
        setDone({ imported: r.imported ?? 0, skipped: r.skipped ?? 0 });
        toast.success(r.message);
      } else {
        toast.error(r.error);
      }
    });
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="mb-3 size-12 text-primary" aria-hidden />
          <p className="text-lg font-bold">{done.imported} leads imported</p>
          {done.skipped > 0 && (
            <p className="text-sm text-muted-foreground">
              {done.skipped} row(s) skipped (missing name/phone)
            </p>
          )}
          <Button className="mt-5 h-11" onClick={() => router.push("/leads")}>
            View leads
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-10 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <FileUp className="size-8" aria-hidden />
            <span className="font-semibold">{fileName ?? "Choose a CSV file"}</span>
            <span className="text-xs">
              Needs at least &ldquo;name&rdquo; and &ldquo;phone&rdquo; columns
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            aria-label="Upload CSV file"
          />
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <>
          <Card>
            <CardContent className="pt-6">
              <p className="mb-3 text-sm font-semibold">
                Preview — {rows.length} row(s)
              </p>
              <div className="max-h-72 overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 20).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.fullName || "—"}</TableCell>
                        <TableCell>{r.phone || "—"}</TableCell>
                        <TableCell>{r.source ?? "—"}</TableCell>
                        <TableCell>{r.preferredLocation ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 20 && (
                  <p className="border-t border-border p-2 text-center text-xs text-muted-foreground">
                    + {rows.length - 20} more rows
                  </p>
                )}
              </div>

              <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-border bg-accent/40 px-4 py-3">
                <span className="text-sm font-medium">
                  Auto-assign to agents (round-robin)
                </span>
                <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
              </label>
            </CardContent>
          </Card>

          <Button onClick={onImport} disabled={pending} className="h-12 w-full text-base font-semibold">
            {pending ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-5" aria-hidden />
            )}
            Import {rows.length} lead(s)
          </Button>
        </>
      )}
    </div>
  );
}
