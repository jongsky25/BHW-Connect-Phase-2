import * as Sentry from "@sentry/nextjs";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { OrgUnitPicker } from "@/components/org-unit-picker";
import { BhwProgressCard } from "@/components/progress/bhw-progress-card";
import { pageCount, pageRange, parseUserPage, sanitizeUserSearch, userSearchFilter } from "@/lib/admin/user-list";
import {
  loadSupervisorProgress,
  type SupervisorBhw,
  type SupervisorProgram,
  type SupervisorRow,
} from "@/lib/progress/load-supervisor-progress";
import { loadOrgChain, loadOrgUnit } from "@/lib/org-units";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

const PAGE_SIZE = 20;

type OrgUnit = { id: string; name: string; level: string; path: string };
type UserRow = {
  id: string;
  username: string;
  full_name: string;
  org_units: { name: string } | { name: string }[] | null;
};

// Supervisor view of each BHW's progress through the training manual
// (docs/bhw-progress-plan.md Phase 3). Scope is RLS: an admin only sees the
// BHWs, org units and progress rows in their own org tree, so the area filter
// can only narrow that, never widen it.
export default async function AdminTrainingProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string; org?: string; q?: string; page?: string }>;
}) {
  const flags = await getRequestFeatureFlags();
  if (!flags.elearning) redirect("/admin/users");

  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) redirect("/login");
  const appUser = await getRequestAppUser(user.id);
  if (!appUser || appUser.role !== "admin") redirect("/home");

  const params = await searchParams;
  const search = sanitizeUserSearch(params.q);
  const page = parseUserPage(params.page);
  const t = await getTranslations("admin.trainingProgress");
  const locale = (await getLocale()) === "en" ? "en" : "fil";
  const supabase = await createClient();

  const [{ data: programs }, rootOrgUnit, { data: selectedOrg }] = await Promise.all([
    supabase
      .from("training_programs")
      .select("id,content_key,title_fil,title_en")
      .eq("status", "published")
      .order("created_at")
      .returns<SupervisorProgram[]>(),
    loadOrgUnit(supabase, appUser.org_unit_id),
    params.org
      ? supabase.from("org_units").select("id,name,level,path").eq("id", params.org).maybeSingle<OrgUnit>()
      : Promise.resolve({ data: null }),
  ]);
  if (!rootOrgUnit) redirect("/home");
  const program = programs?.find((p) => p.id === params.program) ?? programs?.[0] ?? null;
  // Picking the admin's own unit is the same as no area filter.
  const org = selectedOrg && selectedOrg.id !== rootOrgUnit.id ? selectedOrg : null;
  const orgChain = await loadOrgChain(supabase, rootOrgUnit.id, org?.id);

  const { from, to } = pageRange(page, PAGE_SIZE);
  let usersQuery = supabase
    .from("users")
    .select("id,username,full_name,org_units!inner(name,path)", { count: "exact" })
    .eq("role", "bhw")
    .eq("status", "active")
    .order("full_name")
    .range(from, to);
  if (org) usersQuery = usersQuery.like("org_units.path", `${org.path}%`);
  if (search) usersQuery = usersQuery.or(userSearchFilter(search));
  const { data: users, count } = program ? await usersQuery.returns<UserRow[]>() : { data: [], count: 0 };

  const total = count ?? 0;
  const lastPage = pageCount(total, PAGE_SIZE);

  const baseParams = new URLSearchParams();
  if (program && programs && programs.length > 1) baseParams.set("program", program.id);
  if (org) baseParams.set("org", org.id);
  if (search) baseParams.set("q", search);
  if (page > lastPage && total > 0) {
    baseParams.set("page", String(lastPage));
    redirect(`/admin/training-progress?${baseParams.toString()}`);
  }
  const pageHref = (target: number) => {
    const p = new URLSearchParams(baseParams);
    if (target > 1) p.set("page", String(target));
    const qs = p.toString();
    return qs ? `?${qs}` : "?";
  };

  const bhws: SupervisorBhw[] = (users ?? []).map((u) => {
    const unit = Array.isArray(u.org_units) ? u.org_units[0] : u.org_units;
    return { id: u.id, username: u.username, full_name: u.full_name, org_unit_name: unit?.name ?? null };
  });

  let rows: SupervisorRow[] = [];
  let loadFailed = false;
  if (program && bhws.length > 0) {
    try {
      rows = await loadSupervisorProgress(supabase, program, bhws);
    } catch (error) {
      Sentry.captureException(error);
      loadFailed = true;
    }
  }

  const selectClass = "w-full rounded-md border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink sm:w-auto";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <p className="mt-1 text-sm text-ink/70">{t("description")}</p>
      </div>

      {!program ? (
        <EmptyState message={t("noProgram")} />
      ) : (
        <>
          <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" action="">
            {programs && programs.length > 1 ? (
              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                {t("programLabel")}
                <select name="program" defaultValue={program.id} className={selectClass}>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {locale === "en" ? p.title_en : p.title_fil}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="flex flex-col gap-1 text-sm font-medium text-ink">
              {t("orgLabel")}
              <OrgUnitPicker name="org" root={rootOrgUnit} initialChain={orgChain} maxLevel="barangay" />
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              {t("searchLabel")}
              <input
                type="search"
                name="q"
                defaultValue={search}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm text-ink sm:w-64"
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-md border border-ink/20 px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5"
              >
                {t("apply")}
              </button>
              {org || search ? (
                <a
                  href="/admin/training-progress"
                  className="text-sm font-medium text-ink underline hover:text-secondary"
                >
                  {t("clear")}
                </a>
              ) : null}
            </div>
          </form>

          <p className="text-sm text-ink/70">
            {t("bhwCount", { count: total })} · {t("noLessonsNote")}
          </p>

          {loadFailed ? (
            <p role="alert" className="text-sm text-danger">
              {t("loadError")}
            </p>
          ) : rows.length === 0 ? (
            <EmptyState message={search ? t("emptySearch", { query: search }) : t("empty")} />
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((row) => (
                <BhwProgressCard key={row.bhw.id} row={row} locale={locale} detailsLabel={t("showDetails")} />
              ))}
            </ul>
          )}

          {lastPage > 1 ? (
            <nav className="flex items-center justify-between gap-3 text-sm" aria-label={t("pageOf", { page, totalPages: lastPage })}>
              {page > 1 ? (
                <a href={pageHref(page - 1)} className="font-medium text-ink underline hover:text-secondary">
                  {t("prevPage")}
                </a>
              ) : (
                <span />
              )}
              <span className="text-ink/70">{t("pageOf", { page, totalPages: lastPage })}</span>
              {page < lastPage ? (
                <a href={pageHref(page + 1)} className="font-medium text-ink underline hover:text-secondary">
                  {t("nextPage")}
                </a>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
