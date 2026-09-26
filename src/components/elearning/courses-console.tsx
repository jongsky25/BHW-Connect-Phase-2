"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/empty-state";
import { mapElearningRpcError } from "@/lib/elearning/error-messages";
import type { Course, CourseStatus } from "@/lib/elearning/types";
import { createClient } from "@/lib/supabase/client";
import { CourseForm } from "./course-form";
import type { OrgUnitNode } from "@/lib/org-units";

type Props = {
  initialCourses: Course[];
  rootOrgUnit: OrgUnitNode;
};

export function CoursesConsole({ initialCourses, rootOrgUnit }: Props) {
  const t = useTranslations("admin.courses");
  const [courses, setCourses] = useState(initialCourses);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSetStatus(id: string, status: CourseStatus) {
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

      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
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

      setCourses((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t("heading")} />

      <CourseForm
        rootOrgUnit={rootOrgUnit}
        onCreated={(course) => setCourses((prev) => [course, ...prev])}
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
          <table className="w-full min-w-[720px] border-collapse text-left">
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
                    <div className="flex flex-wrap gap-2">
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
                      {course.status !== "archived" ? (
                        <button
                          type="button"
                          disabled={pendingId === course.id}
                          onClick={() => handleSetStatus(course.id, "archived")}
                          className="rounded-md border border-ink/20 px-2 py-1 text-xs font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
                        >
                          {t("archiveAction")}
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
