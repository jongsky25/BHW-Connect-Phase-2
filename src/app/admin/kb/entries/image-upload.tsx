"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ImageUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const t = useTranslations("kb");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(false);

    const supabase = createClient();
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("kb-images").upload(path, file);

    if (uploadError) {
      setError(true);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("kb-images").getPublicUrl(path);
    setPreviewUrl(data.publicUrl);
    onUploaded(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink">{t("image")}</label>
      <input type="file" accept="image/*" onChange={handleChange} disabled={uploading} />
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-only thumbnail, not the perf-budgeted Chat Guide route.
        <img src={previewUrl} alt="" className="h-24 w-24 rounded object-cover" />
      ) : null}
      {error ? <p className="text-xs text-danger">{t("errors.unknown")}</p> : null}
    </div>
  );
}
