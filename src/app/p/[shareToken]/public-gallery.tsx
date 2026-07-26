"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicGallery({
  images,
  title,
}: {
  images: { url: string; is_cover: boolean }[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center rounded-2xl bg-primary/5">
        <Building2 className="size-12 text-primary/30" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative h-64 overflow-hidden rounded-2xl md:h-96">
        <Image
          src={images[active]?.url}
          alt={`${title} — photo ${active + 1} of ${images.length}`}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          priority
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors md:size-20",
                i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
