import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { STABLE_CITY_ADMIN, createThrowawayAssessor, getAccessToken, onboardThroughLogin, restGet } from "./fixtures/auth";

function localSql(sql: string) {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.port !== "54321") throw new Error("Disposable local Supabase required");
  return execFileSync("docker", ["exec", "-i", "supabase_db_bhw-connect-phase-2", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], { input: sql, encoding: "utf8", timeout: 15_000 });
}

test("lesson headings and reading tools preserve context, readability, zoom and mode continuity", async ({ page, request }) => {
  test.setTimeout(120_000);
  const admin = await getAccessToken(request, STABLE_CITY_ADMIN.username, STABLE_CITY_ADMIN.password);
  const assessor = await createThrowawayAssessor(request, admin, "00000000-0000-0000-0000-000000000004");
  const [actor] = await restGet(request, admin, `users?select=id&username=eq.${assessor.username}`) as { id: string }[];
  expect(actor.id).toMatch(/^[a-f0-9-]{36}$/);
  const [course, program, chapter, module, lesson, revision] = Array.from({ length: 6 }, () => randomUUID());
  localSql(`
    insert into courses(id,org_unit_id,author_user_id,title_fil,title_en,status)
      values('${course}','00000000-0000-0000-0000-000000000006','${actor.id}','E2E heading','E2E heading','published');
    insert into training_programs(id,content_key,org_unit_id,author_user_id,title_fil,title_en,status)
      values('${program}','bhw-reference-manual','00000000-0000-0000-0000-000000000006','${actor.id}','E2E manual','E2E manual','published');
    insert into training_program_chapters(id,program_id,chapter_key,position,title_fil,title_en,course_id,availability)
      values('${chapter}','${program}','chapter-2',1,'Pagsasanay sa komunidad','Community practice','${course}','available');
    insert into course_modules(id,course_id,position,type,title_fil,title_en)
      values('${module}','${course}',0,'text','Paghahanda sa mahirap na sitwasyon','Preparing for difficult situations');
    insert into course_lessons(id,module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en)
      values('${lesson}','${module}','prepare-a-response',0,'Paghahanda ng malinaw na tugon sa isang mahirap na sitwasyon sa komunidad','Preparing a clear response to a difficult situation in the community',array['Pagsasanay'],array['Practice']);
    insert into course_lesson_revisions(id,lesson_id,revision_key,content_hash,read_sections,slides,coverage,sources,assets,created_by)
      values('${revision}','${lesson}','e2e-heading',repeat('0',64),
        '[{"id":"intro","concept_ids":["practice-topic"],"heading_fil":"Pagsasanay","heading_en":"Practice","body_fil":"Halimbawa lamang.","body_en":"Fictional example only.","asset_ids":["ai-illustration"],"takeaway_fil":"Maghanda.","takeaway_en":"Prepare.","check":null},{"id":"follow-up","concept_ids":["practice-topic"],"heading_fil":"Susunod na hakbang","heading_en":"Next step","body_fil":"Linawin ang susunod na hakbang.","body_en":"Clarify the next step.","asset_ids":["ai-illustration"],"takeaway_fil":"Linawin.","takeaway_en":"Clarify.","check":null}]',
        '[{"id":"slide-intro","concept_ids":["practice-topic"],"layout":"takeaway","heading_fil":"Pagsasanay","heading_en":"Practice","display_fil":"Maghanda.","display_en":"Prepare.","asset_ids":["ai-illustration"],"check":null},{"id":"slide-follow-up","concept_ids":["practice-topic"],"layout":"takeaway","heading_fil":"Susunod na hakbang","heading_en":"Next step","display_fil":"Linawin.","display_en":"Clarify.","asset_ids":["ai-illustration"],"check":null}]','[]','[]','[{"id":"ai-illustration","path":"/training/bhw-1-2/vlanche-ernesto-7e4e35141628.png","content_hash":"7e4e351416282cb78a0d8b17c80fba7a4367291f9d46f2586baaa90cd66dcaea","alt_en":"Fictional health discussion","alt_fil":"Kathang-isip na talakayan","caption_en":"Fictional example","caption_fil":"Kathang-isip na halimbawa","provenance":"Original AI-generated illustration; disposable fixture.","review_status":"approved"}]','${actor.id}');
    update course_lessons set published_revision_id='${revision}' where id='${lesson}';
    insert into assessor_exam_attempts(assessor_user_id,chapter_id,curriculum_version,exam_id,phase,status,question_set_hash,question_count,score_percent,passed,answers,submitted_at)
      values('${actor.id}','${chapter}','2026-09-28.1','chapter-2:pretest','pretest','submitted',repeat('0',32),1,0,false,'[]',now());
  `);
  try {
    const password = "LessonHeadingPw2026!";
    await onboardThroughLogin(page, assessor.username, assessor.tempPassword, password);
    const token = await getAccessToken(request, assessor.username, password);
    for (const locale of ["en", "fil"]) {
      const settings = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/rpc_update_settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}` },
        data: { p_language: locale, p_theme: "light", p_font_scale: "md", p_high_contrast: false },
      });
      expect(settings.ok()).toBe(true);
      for (const base of [`/training/${program}/chapter-2`, `/training/${program}/assessor/chapter-2`]) {
        await page.goto(`${base}/${module}/${lesson}?view=lesson`);
        const heading = page.locator("[data-lesson-heading]");
        await expect(heading).toBeVisible();
        await expect(heading).toContainText(locale === "en" ? "Chapter 2" : "Kabanata 2");
        await expect(heading.getByRole("link").first()).toHaveAttribute("href", base);
        await expect(heading.getByRole("link").nth(1)).toHaveAttribute("href", `${base}/${module}`);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        // The assessor's prior-language visit may have saved the second section.
        const inlineReader = page.locator('[data-reading-layout] > section');
        await inlineReader.getByRole("button", { name: locale === "en" ? "Read" : "Basahin", exact: true }).click();
        const previous = inlineReader.getByRole("button", { name: locale === "en" ? "Previous" : "Nakaraan", exact: true });
        if (await previous.isEnabled()) await previous.click();
        await expect(inlineReader.getByRole("heading", { name: locale === "en" ? "Practice" : "Pagsasanay", exact: true })).toBeVisible();
        const aiLabel = locale === "en" ? "AI-generated illustration" : "Ilustrasyong ginawa gamit ang AI";
        await expect(inlineReader.getByText(aiLabel, {exact:true})).toBeVisible();
        await page.getByText(locale === "en" ? "Reading tools" : "Mga tulong sa pagbasa", { exact: true }).click();
        const comfortable = page.getByRole("button", { name: locale === "en" ? "Comfortable" : "Maluwag", exact: true });
        const standard = page.getByRole("button", { name: locale === "en" ? "Standard" : "Karaniwan", exact: true });
        const article = page.locator('[data-reading-layout] > section > article[data-layout="read"]');
        await page.setViewportSize({ width: 1280, height: 844 });
        await expect(comfortable).toHaveAttribute("aria-pressed", "true");
        const originalText = await article.textContent();
        const comfortableWidth = (await article.boundingBox())!.width;
        await standard.click();
        expect((await article.boundingBox())!.width).toBeGreaterThan(comfortableWidth);
        await comfortable.click();
        await expect.poll(() => article.textContent()).toBe(originalText);
        await page.getByText(locale === "en" ? "How to use the lesson controls" : "Paano gamitin ang mga kontrol ng aralin", { exact: true }).click();
        for (const theme of ["light", "dark"]) {
          for (const scale of ["md", "xl"]) {
            await page.locator("html").evaluate((html, attrs) => {
              html.setAttribute("data-theme", attrs.theme); html.setAttribute("data-font-scale", attrs.scale);
            }, { theme, scale });
            for (const width of [320, 390, 768]) {
              await page.setViewportSize({ width, height: 844 });
              const layout = await heading.evaluate(element => {
                const title = element.querySelector("h1")!;
                return { width: element.clientWidth, scroll: element.scrollWidth, titleWidth: title.clientWidth, titleScroll: title.scrollWidth };
              });
              expect(layout.scroll).toBeLessThanOrEqual(layout.width);
              expect(layout.titleScroll).toBeLessThanOrEqual(layout.titleWidth);
            }
          }
          expect((await new AxeBuilder({ page }).include("[data-lesson-heading]").include('aside[aria-labelledby="lesson-reading-tools-heading"]').include('figcaption').analyze()).violations).toEqual([]);
        }
        // Chromium cannot resize its window while native fullscreen is active.
        await page.setViewportSize({ width: 320, height: 844 });
        await page.getByRole("button", { name: locale === "en" ? "Full screen" : "Buong screen", exact: true }).click();
        const dialog = page.getByRole("dialog", { name: locale === "en" ? "Full-screen lesson" : "Buong screen na aralin", exact: true });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText(aiLabel, {exact:true})).toBeVisible();
        const zoomIn = dialog.getByRole("button", { name: locale === "en" ? "Zoom in" : "Lakihan", exact: true });
        await expect(zoomIn).toContainText(locale === "en" ? "Zoom in" : "Lakihan");
        expect(await zoomIn.locator("..").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        await expect(dialog.locator('article[data-layout="read"]')).toHaveCSS("max-inline-size", "none");
        await zoomIn.click();
        await expect(dialog.locator("output")).toHaveText("1.25×");
        await dialog.getByRole("button", { name: locale === "en" ? "Fit to screen" : "I-akma sa screen", exact: true }).click();
        await expect(dialog.locator("output")).toHaveText("1×");
        expect((await new AxeBuilder({ page }).include("dialog[open]").analyze()).violations).toEqual([]);
        // Both sections share a concept: a format change must follow the exact section.
        await dialog.getByRole("button", { name: locale === "en" ? "Next" : "Susunod", exact: true }).click();
        const sectionHeading = locale === "en" ? "Next step" : "Susunod na hakbang";
        await expect(dialog.getByRole("heading", { name: sectionHeading, exact: true })).toBeVisible();
        await dialog.getByRole("button", { name: "Slides", exact: true }).click();
        await expect(dialog.getByRole("heading", { name: sectionHeading, exact: true })).toBeVisible();
        await dialog.getByRole("button", { name: locale === "en" ? "Read" : "Basahin", exact: true }).click();
        await expect(dialog.getByRole("heading", { name: sectionHeading, exact: true })).toBeVisible();
        await dialog.getByRole("button", { name: locale === "en" ? "Close" : "Isara", exact: true }).click();
        await expect(dialog).not.toBeVisible();
        await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
        await page.getByRole("group", { name: locale === "en" ? "Content mode" : "Uri ng nilalaman", exact: true })
          .getByRole("button", { name: "Slides", exact: true }).click();
        await expect(page.locator('[data-reading-layout] > section > article[data-layout="takeaway"]')).toHaveCSS("max-inline-size", "none");
        await expect(inlineReader.getByText(aiLabel, {exact:true})).toBeVisible();
        await expect(page.locator('[data-reading-layout] > section > article').getByRole("heading", { name: sectionHeading, exact: true })).toBeVisible();
        await page.getByRole("group", { name: locale === "en" ? "Content mode" : "Uri ng nilalaman", exact: true })
          .getByRole("button", { name: locale === "en" ? "Read" : "Basahin", exact: true }).click();
        await expect(page.locator('[data-reading-layout] > section > article').getByRole("heading", { name: sectionHeading, exact: true })).toBeVisible();
      }
    }
    await page.goto("/home");
  } finally {
    localSql(`begin;
      delete from assessor_lesson_resume where chapter_id='${chapter}';
      delete from assessor_lesson_progress where chapter_id='${chapter}';
      delete from assessor_exam_attempts where chapter_id='${chapter}';
      update course_lessons set published_revision_id=null where id='${lesson}';
      alter table course_lesson_revisions disable trigger training_revision_immutable;
      delete from course_lesson_revisions where id='${revision}';
      alter table course_lesson_revisions enable trigger training_revision_immutable;
      delete from course_lessons where id='${lesson}';
      delete from course_modules where id='${module}';
      delete from training_program_chapters where id='${chapter}';
      delete from training_programs where id='${program}';
      delete from courses where id='${course}';
      commit;`);
  }
});
