"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface UploadedImage {
  url: string;
  path: string;
}

/**
 * Uploads images to Supabase Storage (property-images bucket) as the user
 * picks them, and emits hidden inputs (imageUrls[]/imagePaths[]) consumed by
 * the create/update property server actions.
 */
export function ImageUploader({ orgId }: { orgId: string }) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} is over 8 MB`);
        continue;
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("property-images")
        .upload(path, file, { cacheControl: "3600" });
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        continue;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("property-images").getPublicUrl(path);
      setImages((prev) => [...prev, { url: publicUrl, path }]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(img: UploadedImage) {
    setImages((prev) => prev.filter((i) => i.path !== img.path));
    const supabase = createClient();
    await supabase.storage.from("property-images").remove([img.path]);
  }

  return (
    <div className="space-y-2">
      {images.map((img) => (
        <span key={img.path}>
          <input type="hidden" name="imageUrls[]" value={img.url} />
          <input type="hidden" name="imagePaths[]" value={img.path} />
        </span>
      ))}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((img, i) => (
          <div key={img.path} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={`Upload ${i + 1}`} className="size-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(img)}
              aria-label="Remove image"
              className="absolute right-1 top-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-5" aria-hidden />
          )}
          <span className="text-[11px] font-medium">{uploading ? "Uploading…" : "Add photos"}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
        aria-label="Upload property photos"
      />
    </div>
  );
}
