import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { CourseLayoutToggle } from "@/components/elearning/course-layout-toggle";
import { withVisible } from "@/lib/content/visibility";
import { withCourseLayout } from "@/lib/elearning/course-layout";
import { createClient } from "@/lib/supabase/server";
import { getRequestAppUser, getRequestAuthUser, getRequestFeatureFlags } from "@/lib/supabase/request";

type CourseRow = {
  id: string;
  title_fil: string;
  title_en: string;
  description_fil: string;
  description_en: string;
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ layout?: string }>;
}) {
  const supabase = await createClient();
  const flags = await getRequestFeatureFlags();

  if (!flags.elearning) {
    redirect("/home");
  }

  const {
    data: { user },
  } = await getRequestAuthUser();
  if (!user) {
    redirect("/login");
  }
  const appUser = await getRequestAppUser(user.id);
  if (!appUser) {
    redirect("/login");
  }

  const t = await getTranslations("courses");
  const tCrumbs = await getTranslations("breadcrumbs");
  const locale = await getLocale();
  const fullPage = appUser.role === "bhw" && (await searchParams).layout === "full";

  const { data: courses } = await withVisible(
    supabase
      .from("courses")
      .select("id, title_fil, title_en, description_fil, description_en")
      .eq("status", "published"),
  )
    .order("created_at", { ascending: false })
    .returns<CourseRow[]>();

  const {data: programs, error: programError} = await supabase.from('training_programs')
    .select('id,content_key,title_fil,title_en').eq('status','published').order('created_at');
  if(programError) throw new Error('Unable to load training catalog');
  const {data: chapters, error: chapterError} = programs?.length ? await supabase.from('training_program_chapters')
    .select('course_id').in('program_id',programs.map(p=>p.id)) : {data:[],error:null};
  if(chapterError) throw new Error('Unable to load training chapters');
  const mapped = new Set((chapters??[]).map(c=>c.course_id));
  const rows = (courses ?? []).filter(c=>!mapped.has(c.id));

  return (
    <div className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-10 sm:px-6 ${fullPage ? "max-w-[1600px] lg:px-10" : "max-w-4xl"}`}>
      <Breadcrumbs items={[{ label: tCrumbs("home"), href: "/home" }, { label: t("heading") }]} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t("heading")}</h1>
          <p className="mt-1 text-ink/70">{t("intro")}</p>
        </div>
        {appUser.role === "bhw" && <CourseLayoutToggle href="/courses" fullPage={fullPage} locale={locale} />}
      </div>

      {rows.length === 0 && !programs?.length ? (
        <EmptyState message={t("empty")} />
      ) : (
        <ul className={fullPage ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "flex flex-col divide-y divide-ink/10 rounded-md border border-ink/10"}>
          {programs?.map(program=>(
            <li key={program.id}><Link prefetch={false} href={withCourseLayout(`/training/${program.id}`, fullPage)} className={`flex min-h-[44px] h-full flex-col gap-2 px-4 py-5 hover:bg-ink/5 ${fullPage ? "rounded-xl border border-ink/15" : ""}`}>
              <span className="text-lg font-semibold">{program.content_key==='bhw-reference-manual' ? 'BHW Reference Manual' : locale==='en'?program.title_en:program.title_fil}</span>
              <span className="text-sm text-ink/70">{locale==='en'?'Explore chapters, subchapters and short lessons.':'Piliin ang kabanata, subchapter, at maiikling aralin.'}</span>
            </Link></li>
          ))}
          {rows.map((course) => (
            <li key={course.id}>
              <Link prefetch={false}
                href={withCourseLayout(`/courses/${course.id}`, fullPage)}
                className={`flex min-h-[44px] h-full flex-col gap-1 px-4 py-[var(--space-row)] hover:bg-ink/5 ${fullPage ? "rounded-xl border border-ink/15" : ""}`}
              >
                <span className="font-medium text-ink">
                  {locale === "en" ? course.title_en : course.title_fil}
                </span>
                {(locale === "en" ? course.description_en : course.description_fil) ? (
                  <span className="text-sm text-ink/70">
                    {locale === "en" ? course.description_en : course.description_fil}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
