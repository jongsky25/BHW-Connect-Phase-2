"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Field, inputClass } from "@/components/admin/form-field";
import { ImageUpload } from "@/components/announcements/image-upload";
import { mapAnnouncementRpcError } from "@/lib/announcements/error-messages";
import type { Announcement } from "@/lib/announcements/types";
import { createClient } from "@/lib/supabase/client";
import { OrgUnitPicker } from "@/components/org-unit-picker";
import type { OrgUnitNode } from "@/lib/org-units";

type Props = {
  /** The admin's own org unit: content can be deployed there or anywhere below it. */
  rootOrgUnit: OrgUnitNode;
  onCreated: (announcement: Announcement) => void;
};

export function AnnouncementForm({ rootOrgUnit, onCreated }: Props) {
  const t = useTranslations("admin.announcements");
  const [orgUnit, setOrgUnit] = useState<OrgUnitNode>(rootOrgUnit);
  const orgUnitId = orgUnit.id;
  const [bodyFil, setBodyFil] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("rpc_announcement_create", {
        p_org_unit_id: orgUnitId,
        p_body_fil: bodyFil.trim(),
        p_body_en: bodyEn.trim(),
        p_link_url: linkUrl.trim() || null,
        p_image_url: imageUrl,
      });

      if (rpcError) {
        setError(t(mapAnnouncementRpcError(rpcError.message)));
        return;
      }

      const row = (data as Array<{ announcement_id: string }> | null)?.[0];
      if (!row) {
        setError(t("genericError"));
        return;
      }
      onCreated({
        id: row.announcement_id,
        org_unit_id: orgUnitId,
        author_user_id: "",
        body_fil: bodyFil.trim(),
        body_en: bodyEn.trim(),
        link_url: linkUrl.trim() || null,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        org_units: { name: orgUnit.name },
        users: null,
      });

      setBodyFil("");
      setBodyEn("");
      setLinkUrl("");
      setImageUrl(null);
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-md border border-ink/10 p-4"
      noValidate
    >
      <h2 className="text-lg font-semibold text-ink">{t("postHeading")}</h2>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">{t("orgUnitLabel")}</span>
        <OrgUnitPicker root={rootOrgUnit} onChange={setOrgUnit} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("bodyFilLabel")} htmlFor="announcement-body-fil">
          <textarea
            id="announcement-body-fil"
            required
            rows={4}
            value={bodyFil}
            onChange={(event) => setBodyFil(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("bodyEnLabel")} htmlFor="announcement-body-en">
          <textarea
            id="announcement-body-en"
            required
            rows={4}
            value={bodyEn}
            onChange={(event) => setBodyEn(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={t("linkLabel")} htmlFor="announcement-link">
        <input
          id="announcement-link"
          type="url"
          placeholder={t("linkPlaceholder")}
          value={linkUrl}
          onChange={(event) => setLinkUrl(event.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label={t("imageLabel")} htmlFor="announcement-image">
        <ImageUpload imageUrl={imageUrl} onChange={setImageUrl} />
      </Field>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-md bg-primary px-6 py-3 font-medium text-on-primary disabled:opacity-60"
      >
        {loading ? t("posting") : t("postAction")}
      </button>
    </form>
  );
}
