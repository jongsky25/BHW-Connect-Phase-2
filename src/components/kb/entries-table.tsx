"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Field, inputClass } from "@/components/admin/form-field";
import { mapKbRpcError } from "@/lib/kb/error-messages";
import type { KbStatus, OwnerOption } from "@/lib/kb/types";
import { createClient } from "@/lib/supabase/client";

export type EntryRow = {
  id: string;
  question_en: string;
  status: KbStatus;
  review_due_on: string | null;
  owner_user_id: string | null;
  category_name: string | null;
  owner_name: string | null;
};

function defaultReviewDueOn(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().slice(0, 10);
}

export function EntriesTable({ rows, owners }: { rows: EntryRow[]; owners: OwnerOption[] }) {
  const t = useTranslations("admin.kbEntries");
  const router = useRouter();

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkOwnerId, setBulkOwnerId] = useState("");
  const [bulkReviewDue, setBulkReviewDue] = useState(defaultReviewDueOn());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  function clearFeedback() {
    setError(null);
    setSuccessCount(null);
  }

  function toggleRow(id: string) {
    clearFeedback();
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleAll() {
    clearFeedback();
    setSelected(allSelected ? {} : Object.fromEntries(rows.map((row) => [row.id, true])));
  }

  function selectMissingOwner() {
    clearFeedback();
    setSelected(Object.fromEntries(rows.filter((row) => !row.owner_user_id).map((row) => [row.id, true])));
  }

  async function handleBulkAssign() {
    clearFeedback();
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("rpc_kb_entries_bulk_assign", {
        p_entry_ids: selectedIds,
        p_owner_user_id: bulkOwnerId || null,
        p_review_due_on: bulkReviewDue || null,
      });

      if (rpcError) {
        setError(t(mapKbRpcError(rpcError.message)));
        return;
      }

      setSuccessCount(data?.[0]?.updated_count ?? selectedIds.length);
      setSelected({});
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-ink/10 bg-ink/5 p-4">
        <p className="mr-auto text-sm font-medium text-ink">{t("bulkSelectedCount", { count: selectedIds.length })}</p>

        <button
          type="button"
          onClick={selectMissingOwner}
          className="rounded-md border border-ink/20 px-3 py-2 text-xs font-medium text-ink hover:bg-ink/5"
        >
          {t("bulkSelectMissingOwner")}
        </button>

        <Field label={t("ownerLabel")} htmlFor="bulk-owner">
          <select
            id="bulk-owner"
            value={bulkOwnerId}
            onChange={(event) => setBulkOwnerId(event.target.value)}
            className={inputClass}
          >
            <option value="">{t("ownerNone")}</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.full_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("reviewDueLabel")} htmlFor="bulk-review-due">
          <input
            id="bulk-review-due"
            type="date"
            value={bulkReviewDue}
            onChange={(event) => setBulkReviewDue(event.target.value)}
            className={inputClass}
          />
        </Field>

        <button
          type="button"
          disabled={loading || selectedIds.length === 0 || !bulkOwnerId}
          onClick={handleBulkAssign}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity disabled:opacity-60"
        >
          {loading ? t("saving") : t("bulkAssignAction")}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {successCount !== null ? (
        <p role="status" className="text-sm text-ink">
          {t("bulkAssignSuccess", { count: successCount })}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-ink/10">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead className="bg-ink/5">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4"
                  aria-label={t("bulkSelectAll")}
                />
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                {t("questionEnLabel")}
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                {t("colCategory")}
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                {t("colStatus")}
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                {t("colOwner")}
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                {t("reviewDueLabel")}
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                {t("colActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink/10">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={Boolean(selected[row.id])}
                    onChange={() => toggleRow(row.id)}
                    className="h-4 w-4"
                    aria-label={t("bulkSelectRow", { question: row.question_en })}
                  />
                </td>
                <td className="px-3 py-3 text-sm text-ink">{row.question_en}</td>
                <td className="px-3 py-3 text-sm text-ink">{row.category_name ?? "—"}</td>
                <td className="px-3 py-3 text-sm text-ink">
                  {t(row.status === "published" ? "statusPublished" : "statusDraft")}
                </td>
                <td className="px-3 py-3 text-sm text-ink">{row.owner_name ?? "—"}</td>
                <td className="px-3 py-3 text-sm text-ink">{row.review_due_on ?? "—"}</td>
                <td className="px-3 py-3 text-sm">
                  <Link
                    href={`/admin/kb/entries/${row.id}`}
                    className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5"
                  >
                    {t("editAction")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
