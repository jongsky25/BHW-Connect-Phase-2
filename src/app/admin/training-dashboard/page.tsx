import * as Sentry from "@sentry/nextjs";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { OrgUnitPicker } from "@/components/org-unit-picker";
import { loadOrgChain, loadOrgUnit } from "@/lib/org-units";
import {
  completionRate,
  progressStatus,
  type TrainingDashboardData,
  type TrainingDashboardArea,
  type TrainingDashboardPerson,
  type TrainingDashboardPersonChapter,
  type TrainingDashboardRole,
  type TrainingDashboardSummary,
} from "@/lib/progress/training-dashboard";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestMasterFlags } from "@/lib/supabase/request";

const PAGE_SIZE = 20;

type SearchParams = {
  org?: string;
  chapter?: string;
  role?: string;
  q?: string;
  page?: string;
};

function parsedPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1;
}

export default async function TrainingDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const flags = await getRequestMasterFlags();
  if (!flags.elearning) redirect("/admin/users");
  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) redirect("/login");
  const appUser = await getRequestAppUser(user.id);
  if (!appUser || appUser.role !== "admin") redirect("/home");

  const params = await searchParams;
  const role = params.role === "bhw" || params.role === "assessor" ? params.role : "all";
  const search = params.q?.trim().slice(0, 100) ?? "";
  const page = parsedPage(params.page);
  const locale = (await getLocale()) === "en" ? "en" : "fil";
  const t = await getTranslations("admin.trainingDashboard");
  const db = await createClient();
  const [root, { data: selectedOrg }] = await Promise.all([
    loadOrgUnit(db, appUser.org_unit_id),
    params.org
      ? db.from("org_units").select("id,name").eq("id", params.org).maybeSingle<{ id: string; name: string }>()
      : Promise.resolve({ data: null }),
  ]);
  if (!root) redirect("/home");
  const chain = await loadOrgChain(db, root.id, selectedOrg?.id);

  let dashboard: TrainingDashboardData | null = null;
  let failed = false;
  try {
    const { data, error } = await db.rpc("rpc_training_dashboard", {
      p_org_unit_id: params.org || null,
      p_chapter_id: params.chapter || null,
      p_role: role,
      p_search: search || null,
      p_page: page,
    });
    if (error || !data) throw error ?? new Error("Training dashboard returned no data");
    dashboard = data as TrainingDashboardData;
  } catch (error) {
    Sentry.captureException(error);
    failed = true;
  }

  const query = new URLSearchParams();
  if (params.org) query.set("org", params.org);
  if (params.chapter) query.set("chapter", params.chapter);
  if (role !== "all") query.set("role", role);
  if (search) query.set("q", search);
  const pageHref = (target: number) => {
    const next = new URLSearchParams(query);
    if (target > 1) next.set("page", String(target));
    return `?${next.toString()}`;
  };
  const totalPages = Math.max(1, Math.ceil((dashboard?.total ?? 0) / PAGE_SIZE));

  const summaries = new Map(dashboard?.summary.map((item) => [item.role, item]) ?? []);
  const areas = new Map<string, { id: string; name: string; bhw?: TrainingDashboardArea; assessor?: TrainingDashboardArea }>();
  for (const area of dashboard?.areas ?? []) {
    const entry = areas.get(area.id) ?? { id: area.id, name: area.name };
    entry[area.role] = area;
    areas.set(area.id, entry);
  }
  const areaHref = (org: string) => {
    const next = new URLSearchParams(query);
    next.set("org", org);
    next.delete("q");
    return `?${next.toString()}`;
  };
  const emptySummary = (itemRole: TrainingDashboardRole): TrainingDashboardSummary => ({
    role: itemRole,
    eligible: 0,
    started: 0,
    content_completed: 0,
    final_completed: 0,
  });
  const title = (item: { title_fil: string; title_en: string }) =>
    locale === "en" ? item.title_en : item.title_fil;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t("heading")} description={t("description")} />

      <form action="" className="grid gap-3 rounded-xl border border-ink/15 bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 text-sm font-medium text-ink">
          <span>{t("area")}</span>
          <OrgUnitPicker name="org" root={root} initialChain={chain} maxLevel="barangay" />
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("course")}
          <select name="chapter" defaultValue={params.chapter ?? ""} className="rounded-md border border-ink/20 bg-canvas px-3 py-2">
            <option value="">{t("allChapters")}</option>
            {dashboard?.chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>{title(chapter)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("role")}
          <select name="role" defaultValue={role} className="rounded-md border border-ink/20 bg-canvas px-3 py-2">
            <option value="all">{t("allRoles")}</option>
            <option value="bhw">BHW</option>
            <option value="assessor">{t("assessors")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          {t("search")}
          <input name="q" type="search" defaultValue={search} maxLength={100}
            className="rounded-md border border-ink/20 bg-canvas px-3 py-2" />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-ink hover:opacity-90">
            {t("apply")}
          </button>
          <a href="/admin/training-dashboard" className="text-sm font-medium text-ink underline">{t("clear")}</a>
          <span className="text-sm text-ink/65">{t("showingArea", { area: selectedOrg?.name ?? root.name })}</span>
        </div>
      </form>

      {failed ? <p role="alert" className="text-sm text-danger">{t("loadError")}</p> : null}
      {dashboard ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {(["bhw", "assessor"] as const).map((itemRole) => {
              const item = summaries.get(itemRole) ?? emptySummary(itemRole);
              return (
                <section key={itemRole} className="rounded-xl border border-ink/15 bg-canvas p-5" aria-label={itemRole === "bhw" ? "BHW" : t("assessors")}>
                  <h2 className="text-lg font-semibold text-ink">{itemRole === "bhw" ? "BHW" : t("assessors")}</h2>
                  <p className="mt-1 text-sm text-ink/70">{t("eligible", { count: item.eligible })}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <Metric label={t("started")} value={item.started} />
                    <Metric label={t("contentCompleted")} value={item.content_completed} />
                    <Metric label={itemRole === "bhw" ? t("certified") : t("qualified")} value={item.final_completed} />
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-ink/75">
                    <Rate label={t("ofEligible")} count={item.content_completed} total={item.eligible} empty={t("notAvailable")} />
                    <Rate label={t("ofStarted")} count={item.content_completed} total={item.started} empty={t("notAvailable")} />
                    <Rate label={itemRole === "bhw" ? t("certifiedOfEligible") : t("qualifiedOfEligible")}
                      count={item.final_completed} total={item.eligible} empty={t("notAvailable")} />
                  </div>
                </section>
              );
            })}
          </div>

          {areas.size > 0 ? (
            <section className="space-y-3" aria-label={t("areas")}>
              <h2 className="text-xl font-semibold text-ink">{t("areas")}</h2>
              <p className="text-sm text-ink/70">{t("areaDescription")}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {[...areas.values()].map((area) => (
                  <div key={area.id} className="rounded-xl border border-ink/15 bg-canvas p-4">
                    {area.id === (selectedOrg?.id ?? root.id) ? (
                      <h3 className="font-semibold text-ink">{area.name} <span className="text-sm font-normal text-ink/60">{t("assignedHere")}</span></h3>
                    ) : (
                      <h3><a href={areaHref(area.id)} className="font-semibold text-ink underline hover:text-secondary">{area.name}</a></h3>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <AreaMeasure label="BHW" role="bhw" area={area.bhw} t={t} />
                      <AreaMeasure label={t("assessors")} role="assessor" area={area.assessor} t={t} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3" aria-label={t("people") }>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold text-ink">{t("people")}</h2>
              <p className="text-sm text-ink/70">{t("peopleCount", { count: dashboard.total })}</p>
            </div>
            {dashboard.people.length === 0 ? (
              <p className="rounded-xl border border-ink/15 p-5 text-sm text-ink/70">{t("empty")}</p>
            ) : (
              <ul className="space-y-3">
                {dashboard.people.map((person) => (
                  <PersonCard key={person.user_id} person={person} title={title} t={t} locale={locale} />
                ))}
              </ul>
            )}
          </section>

          {totalPages > 1 ? (
            <nav className="flex items-center justify-between gap-3 text-sm" aria-label={t("page", { page, totalPages })}>
              {page > 1 ? <a href={pageHref(page - 1)} className="font-medium text-ink underline">{t("previous")}</a> : <span />}
              <span className="text-ink/70">{t("page", { page, totalPages })}</span>
              {page < totalPages ? <a href={pageHref(page + 1)} className="font-medium text-ink underline">{t("next")}</a> : <span />}
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div><p className="text-2xl font-semibold tabular-nums text-ink">{value}</p><p className="text-xs text-ink/70">{label}</p></div>;
}

function Rate({ label, count, total, empty }: { label: string; count: number; total: number; empty: string }) {
  const rate = completionRate(count, total);
  return (
    <div>
      <div className="flex justify-between gap-2"><span>{label}</span><span className="tabular-nums">{rate === null ? empty : `${rate}%`}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-secondary" style={{ width: `${rate ?? 0}%` }} />
      </div>
    </div>
  );
}

type DashboardTranslations = Awaited<ReturnType<typeof getTranslations<"admin.trainingDashboard">>>;

function AreaMeasure({ label, role, area, t }: {
  label: string; role: TrainingDashboardRole; area?: TrainingDashboardArea; t: DashboardTranslations;
}) {
  return (
    <div>
      <p className="font-medium text-ink">{label}</p>
      <p className="tabular-nums text-ink/75">{t("areaCompleted", {
        completed: area?.content_completed ?? 0, eligible: area?.eligible ?? 0,
      })}</p>
      <p className="text-xs text-ink/60">{t("areaStarted", { count: area?.started ?? 0 })}</p>
      <p className="text-xs text-ink/60">{t(role === "assessor" ? "areaQualified" : "areaCertified", {
        count: area?.final_completed ?? 0,
      })}</p>
    </div>
  );
}

function PersonCard({
  person, title, t, locale,
}: {
  person: TrainingDashboardPerson;
  title: (item: { title_fil: string; title_en: string }) => string;
  t: DashboardTranslations;
  locale: "en" | "fil";
}) {
  const status = progressStatus(person);
  const statusLabel = (value: ReturnType<typeof progressStatus>) =>
    value === "final_completed" ? t(person.role === "bhw" ? "certified" : "qualified") : t(value);
  const date = (value: string | null) => value
    ? new Intl.DateTimeFormat(locale === "en" ? "en-PH" : "fil-PH", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila",
    }).format(new Date(value))
    : t("notAvailable");
  const dates = (item: TrainingDashboardPerson | TrainingDashboardPersonChapter) => (
    <dl className="grid gap-x-4 gap-y-1 text-xs text-ink/65 sm:grid-cols-2">
      <div><dt className="inline">{t("startedAt")}: </dt><dd className="inline tabular-nums">{date(item.started_at)}</dd></div>
      <div><dt className="inline">{t("lastProgressAt")}: </dt><dd className="inline tabular-nums">{date(item.last_progress_at)}</dd></div>
      <div><dt className="inline">{t("contentCompletedAt")}: </dt><dd className="inline tabular-nums">{date(item.content_completed_at)}</dd></div>
      <div><dt className="inline">{t(person.role === "bhw" ? "certifiedAt" : "qualifiedAt")}: </dt><dd className="inline tabular-nums">{date(item.final_completed_at)}</dd></div>
    </dl>
  );
  return (
    <li className="rounded-xl border border-ink/15 bg-canvas">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 focus-visible:outline-2 focus-visible:outline-secondary">
          <span>
            <span className="block font-semibold text-ink">{person.full_name}</span>
            <span className="block text-sm text-ink/65">{person.role === "bhw" ? "BHW" : t("assessor")} · {person.org_unit_name} · @{person.username}</span>
          </span>
          <span className="flex items-center gap-3 text-sm">
            <span className="font-medium text-ink">{statusLabel(status)}</span>
            <span className="tabular-nums text-ink/70">{person.lesson_done}/{person.lesson_total}</span>
            <span aria-hidden="true" className="text-ink/60 group-open:rotate-180">⌄</span>
          </span>
        </summary>
        <div className="space-y-3 border-t border-ink/10 p-4">
          {person.chapter_total > 1 ? <div className="rounded-md bg-ink/5 p-3">{dates(person)}</div> : null}
          {person.chapters.map((chapter: TrainingDashboardPersonChapter) => {
            const chapterStatus = progressStatus(chapter);
            return (
              <div key={chapter.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="font-medium text-ink">{title(chapter)}</p>
                  <p className="text-sm text-ink/65">{statusLabel(chapterStatus)} · {t("lessons", { done: chapter.lesson_done, total: chapter.lesson_total })}</p>
                  <div className="mt-2">{dates(chapter)}</div>
                  {chapter.scores.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2 text-xs text-ink/75">
                      {chapter.scores.map((score) => (
                        <li key={score.phase} className="rounded-md bg-ink/5 px-2 py-1">
                          {t(score.phase)}: <span className="font-semibold tabular-nums">{score.score_percent}%</span>
                          {" · "}{date(score.attempted_at)}
                          {score.attempts > 1 ? ` · ${t("attempts", { count: score.attempts })}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10 sm:w-36" role="progressbar"
                  aria-label={title(chapter)} aria-valuenow={chapter.lesson_done} aria-valuemin={0} aria-valuemax={chapter.lesson_total}>
                  <div className="h-full rounded-full bg-secondary" style={{ width: `${completionRate(chapter.lesson_done, chapter.lesson_total) ?? 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </li>
  );
}
