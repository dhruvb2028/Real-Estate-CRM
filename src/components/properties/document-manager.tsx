"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, FileUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { addPropertyDocument, deletePropertyDocument } from "@/server/actions/properties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PropertyDocument } from "@/lib/types";

/**
 * Brochures / floor plans / legal docs for a property.
 * Uploads to the public property-docs bucket, then registers the row
 * via a server action so it appears on the public share page too.
 */
export function DocumentManager({
  orgId,
  propertyId,
  documents,
}: {
  orgId: string;
  propertyId: string;
  documents: PropertyDocument[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} is over 15 MB`);
        continue;
      }
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${orgId}/${propertyId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("property-docs").upload(path, file);
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        continue;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("property-docs").getPublicUrl(path);

      const r = await addPropertyDocument(propertyId, file.name, publicUrl, path);
      if (r.ok) toast.success(`${file.name} uploaded`);
      else toast.error(r.error);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          Documents & brochures
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <FileUp className="size-3.5" aria-hidden />
            )}
            Upload
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            No brochures or documents yet. Upload PDFs, floor plans, or price lists.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 py-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" aria-hidden />
                </span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary hover:underline"
                >
                  {doc.name}
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  className="size-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${doc.name}`}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await deletePropertyDocument(doc.id);
                      if (r.ok) toast.success("Document removed");
                      else toast.error(r.error);
                    })
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
          aria-label="Upload property documents"
        />
      </CardContent>
    </Card>
  );
}
