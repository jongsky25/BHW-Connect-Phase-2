import { expect, test } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
  createThrowawayBhw,
  getAccessToken,
  onboardThroughLogin,
} from "./fixtures/auth";

// INC-26 (docs/training-modules-plan.md): Basahin (LessonModule) and Islide
// (LessonSlides) are two renderers over the same authored lesson. This spec
// stands up a module with a real `lesson` (objectives, two core sections —
// one with a visual + inline check — and takeaways, so the closing summary
// has something to reveal) the same way scripts/training-load.mjs does:
// rpc_course_create only takes plain body_fil/body_en, so the pedagogy
// columns are set with a direct admin-scoped REST PATCH against
// course_modules/course_module_visuals, exactly as the loader does.
function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL as string;
}
function anonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
}

test("Basahin/Islide toggle preserves reading position, and Islide's keyboard/scroll navigation and mark-complete work", async ({
  page,
  request,
}) => {
  const marker = `e2e.slide.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  const headers = {
    apikey: anonKey(),
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json",
  };

  const createResponse = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_course_create`, {
    headers,
    data: {
      p_org_unit_id: BARANGAY_BATONG_MALAKE_ID,
      p_title_fil: `Kurso slide ${marker}`,
      p_title_en: `Slide course ${marker}`,
      p_description_fil: "",
      p_description_en: "",
      p_quiz_passing_percent: 80,
      p_quiz_max_attempts: 3,
      p_modules: [
        {
          type: "text",
          title_fil: `Modyul ${marker}`,
          title_en: `Module ${marker}`,
          body_fil: "",
          body_en: "",
        },
      ],
    },
  });
  const [{ course_id: courseId }] = (await createResponse.json()) as Array<{ course_id: string }>;
  expect(courseId).toBeTruthy();

  const modulesResponse = await request.get(
    `${supabaseUrl()}/rest/v1/course_modules?course_id=eq.${courseId}&select=id`,
    { headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}` } },
  );
  const [{ id: moduleId }] = (await modulesResponse.json()) as Array<{ id: string }>;
  expect(moduleId).toBeTruthy();

  const sectionOneHeading = `Unang seksyon ${marker}`;
  const sectionTwoHeading = `Pangalawang seksyon ${marker}`;

  await request.patch(`${supabaseUrl()}/rest/v1/course_modules?id=eq.${moduleId}`, {
    headers,
    data: {
      objectives_fil: ["Unang layunin", "Pangalawang layunin"],
      objectives_en: ["First objective", "Second objective"],
      lesson: {
        sections: [
          {
            kind: "concept",
            tier: "core",
            heading_fil: sectionOneHeading,
            heading_en: sectionOneHeading,
            body_fil: "Katawan ng unang seksyon.",
            body_en: "Body of the first section.",
            visual_position: 1,
            takeaway_fil: "Kuha isa",
            takeaway_en: "Takeaway one",
            check: {
              prompt_fil: "Anong tama?",
              prompt_en: "Which is correct?",
              options: [
                { fil: "Mali", en: "Wrong" },
                { fil: "Tama", en: "Right" },
              ],
              correct_option_index: 1,
              feedback_fil: "Paliwanag.",
              feedback_en: "Explanation.",
            },
          },
          {
            kind: "concept",
            tier: "core",
            heading_fil: sectionTwoHeading,
            heading_en: sectionTwoHeading,
            body_fil: "Katawan ng pangalawang seksyon.",
            body_en: "Body of the second section.",
            visual_position: null,
            takeaway_fil: "Kuha dalawa",
            takeaway_en: "Takeaway two",
            check: null,
          },
        ],
      },
    },
  });

  await request.post(`${supabaseUrl()}/rest/v1/course_module_visuals`, {
    headers,
    data: {
      module_id: moduleId,
      position: 1,
      primitive: "hub-spoke",
      svg_markup: `<svg viewBox="0 0 640 400"><circle cx="0" cy="0" r="10" fill="currentColor" /></svg>`,
      image_url: null,
      caption_fil: "Caption fil",
      caption_en: "Caption en",
      alt_text_fil: "Alt fil",
      alt_text_en: "Alt en",
      tier: "core",
    },
  });

  await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_course_set_status`, {
    headers,
    data: { p_course_id: courseId, p_status: "published" },
  });

  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, "Fresh-SlideMode-2026");
  await page.goto(`/courses/${courseId}`);

  // Basahin (read) is the default — scroll the second section into view,
  // then toggle to Islide and check it lands on that same section rather
  // than resetting to the top.
  await expect(page.getByText(sectionOneHeading)).toBeVisible();
  await page.getByText(sectionTwoHeading).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300); // let the IntersectionObserver-based scroll-spy catch up

  await page.getByRole("button", { name: "Islide", exact: true }).click();

  // Section order: objectives (slide 1), section one (slide 2), section
  // two (slide 3), summary (slide 4) — so scrolling to section two before
  // the toggle should land Islide on slide 3.
  await expect(page.getByRole("button", { name: "Pumunta sa slide 3" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  // Keyboard navigation.
  const region = page.getByRole("region", { name: "Tanawing slide" });
  await region.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("button", { name: "Pumunta sa slide 2" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(page.getByText(sectionOneHeading)).toBeInViewport();

  // Native scroll — the mechanism CSS scroll-snap turns a touch swipe
  // into — also advances the current slide via the same
  // IntersectionObserver spy (this sandbox's Desktop Chrome project has no
  // touch emulation, so this is the closest a real-swipe-equivalent check
  // gets here; see the commit message for what that does and doesn't prove).
  await region.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  await page.waitForTimeout(300);
  await expect(page.getByRole("button", { name: "Pumunta sa slide 4" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  // The mark-complete control lives on the final (summary) slide in Islide
  // mode, and actually completes the module.
  await expect(page.getByText("Ano ang natutunan mo?")).toBeInViewport();
  await page.getByRole("button", { name: "Ipakita ang buod" }).click();
  await page.getByRole("button", { name: "Markahan bilang tapos na" }).click();
  await expect(page.getByText("Tapos na", { exact: true })).toBeVisible();

  // Toggling back to Basahin keeps the same reading position (the summary,
  // where the toggle was last used).
  await page.getByRole("button", { name: "Basahin", exact: true }).click();
  await expect(page.getByText("Ano ang natutunan mo?")).toBeInViewport();
});
