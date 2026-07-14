"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePropertyImage } from "@/server/actions/properties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PropertyImage } from "@/lib/types";

export function ImageManager({ images }: { images: PropertyImage[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Current photos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="size-full object-cover" />
              {img.is_cover && (
                <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  Cover
                </span>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await deletePropertyImage(img.id);
                    if (r.ok) toast.success("Photo removed");
                    else toast.error(r.error);
                  })
                }
                aria-label="Delete photo"
                className="absolute right-1 top-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-destructive disabled:opacity-50"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
