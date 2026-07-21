"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  imageUrl: string | null;
  onChange: (url: string | null) => void;
};

export function ImageUpload({ imageUrl, onChange }: Props) {
  const t = useTranslations("admin.kbEntries");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop() ?? "jpg";
      const path = `entries/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("kb-images")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        setError(t("imageUploadError"));
        return;
      }

      const { data } = supabase.storage.from("kb-images").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch {
      setError(t("imageUploadError"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-authored KB image, no known dimensions to optimize for
        <img
          src={imageUrl}
          alt=""
          className="h-32 w-32 rounded-md border border-ink/10 object-cover"
        />
      ) : null}
      <div className="flex items-center gap-3">
        <label className="cursor-pointer rounded-md border border-ink/20 px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5">
          {uploading ? t("imageUploading") : imageUrl ? t("imageReplace") : t("imageUpload")}
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
        {imageUrl ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm font-medium text-danger underline"
          >
            {t("imageRemove")}
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
