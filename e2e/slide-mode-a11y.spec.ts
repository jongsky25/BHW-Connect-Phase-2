import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
  createThrowawayBhw,
  getAccessToken,
  onboardThroughLogin,
} from "./fixtures/auth";

// INC-26 DoD: axe-core clean at the largest --font-scale, in dark mode, and
// in high-contrast mode — for BOTH lesson renderers (Basahin and Islide),
// since Islide is the new surface (progress dots, a scroll-snap region,
// keyboard-navigable controls) that e2e/a11y-font-scale.spec.ts's existing
// fixed route list never exercises. That spec also never varies theme or
// contrast at all (only font scale, only light mode) — this fills both
// gaps for the one route this feature touches, rather than trying to
// retrofit every Phase 1 route in the same pass.
function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL as string;
}
function anonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
}

async function setUpSlideCourse(
  request: import("@playwright/test").APIRequestContext,
  adminToken: string,
  marker: string,
): Promise<string> {
  const headers = {
    apikey: anonKey(),
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json",
  };

  const createResponse = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_course_create`, {
    headers,
    data: {
      p_org_unit_id: BARANGAY_BATONG_MALAKE_ID,
      p_title_fil: `Kurso a11y ${marker}`,
      p_title_en: `A11y course ${marker}`,
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

  const modulesResponse = await request.get(
    `${supabaseUrl()}/rest/v1/course_modules?course_id=eq.${courseId}&select=id`,
    { headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}` } },
  );
  const [{ id: moduleId }] = (await modulesResponse.json()) as Array<{ id: string }>;

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
            heading_fil: "Unang seksyon",
            heading_en: "First section",
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
            heading_fil: "Pangalawang seksyon",
            heading_en: "Second section",
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

  return courseId;
}

const SETTINGS_COMBOS: Array<{
  label: string;
  p_theme: "light" | "dark";
  p_font_scale: "md" | "xl";
  p_high_contrast: boolean;
}> = [
  { label: "largest font scale", p_theme: "light", p_font_scale: "xl", p_high_contrast: false },
  { label: "dark mode", p_theme: "dark", p_font_scale: "md", p_high_contrast: false },
  { label: "high contrast", p_theme: "light", p_font_scale: "md", p_high_contrast: true },
];

test("Basahin and Islide have no axe-core violations at the largest font scale, in dark mode, or in high-contrast mode", async ({
  page,
  request,
}) => {
  const marker = `e2e.slidea11y.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const courseId = await setUpSlideCourse(request, adminToken, marker);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  const newPassword = "Fresh-SlideA11y-2026";
  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, newPassword);
  const userToken = await getAccessToken(request, fresh.username, newPassword);

  for (const combo of SETTINGS_COMBOS) {
    await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_update_settings`, {
      headers: {
        apikey: anonKey(),
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      data: {
        p_language: "fil",
        p_theme: combo.p_theme,
        p_font_scale: combo.p_font_scale,
        p_high_contrast: combo.p_high_contrast,
      },
    });

    await page.goto(`/courses/${courseId}`);
    await expect(page.locator("html")).toHaveAttribute("data-font-scale", combo.p_font_scale);

    const readScan = await new AxeBuilder({ page }).include("main").analyze();
    expect(readScan.violations, `Basahin axe violations at ${combo.label}`).toEqual([]);

    await page.getByRole("button", { name: "Islide", exact: true }).click();
    await expect(page.getByRole("region", { name: "Tanawing slide" })).toBeVisible();

    const slideScan = await new AxeBuilder({ page }).include("main").analyze();
    expect(slideScan.violations, `Islide axe violations at ${combo.label}`).toEqual([]);
  }
});
