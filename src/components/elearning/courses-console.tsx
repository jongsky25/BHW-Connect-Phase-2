"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { VisibilityActions, VisibilityBadge, VisibilityTabs } from "@/components/admin/content-visibility";
import { EmptyState } from "@/components/empty-state";
import { mapElearningRpcError } from "@/lib/elearning/error-messages";
import type { Course, CourseStatus } from "@/lib/elearning/types";
import { createClient } from "@/lib/supabase/client";
import { CourseForm } from "./course-form";
import type { OrgUnitNode } from "@/lib/org-units";

type Props = {
  courses: Course[];
  view: "active" | "archived";
  activeCount: number;
  archivedCount: number;
  rootOrgUnit: OrgUnitNode;
};

export function CoursesConsole({ courses, view, activeCount, archivedCount, rootOrgUnit }: Props) {
  const t = useTranslations("admin.courses");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 'archived' is no longer a status this control offers — that's now the
  // Visibility menu's Archive action (RFT C1/C4), which also takes the
  // course out of user-facing reads, unlike the old bare status flip.
  async function handleSetStatus(id: string, status: Exclude<CourseStatus, "archived">) {
    setError(null);
    setPendingId(id);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_course_set_status", {
        p_course_id: id,
        p_status: status,
      });

      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }

      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setPendingId(id);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("rpc_course_delete", { p_course_id: id });

      if (rpcError) {
        setError(t(mapElearningRpcError(rpcError.message)));
        return;
      }

      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t("heading")} />

      <CourseForm rootOrgUnit={rootOrgUnit} onCreated={() => router.refresh()} />

      <VisibilityTabs
        basePath="/admin/courses"
        view={view}
        activeCount={activeCount}
        archivedCount={archivedCount}
      />

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {courses.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="overflow-x-auto rounded-md border border-ink/10">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="bg-ink/5">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colTitle")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colOrgUnit")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colStatus")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colVisibility")}
                </th>
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/70">
                  {t("colActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id} className="border-b border-ink/10">
                  <td className="px-3 py-3 text-sm text-ink">{course.title_en}</td>
                  <td className="px-3 py-3 text-sm text-ink">{course.org_units?.name ?? "—"}</td>
                  <td className="px-3 py-3 text-sm text-ink">{t(`status.${course.status}`)}</td>
                  <td className="px-3 py-3 text-sm">
                    <VisibilityBadge hidden_at={course.hidden_at} archived_at={course.archived_at} />
                  </td>
                  <td className="px-3 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      {course.status !== "published" ? (
                        <button
                          type="button"
                          disabled={pendingId === course.id}
                          onClick={() => handleSetStatus(course.id, "published")}
                          className="rounded-md border border-success/40 px-2 py-1 text-xs font-medium text-success hover:bg-success/5 disabled:opacity-60"
                        >
                          {t("publishAction")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={pendingId === course.id}
                        onClick={() => handleDelete(course.id)}
                        className="rounded-md border border-danger/40 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5 disabled:opacity-60"
                      >
                        {t("deleteAction")}
                      </button>
                      <VisibilityActions
                        contentType="course"
                        id={course.id}
                        hidden_at={course.hidden_at}
                        archived_at={course.archived_at}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
