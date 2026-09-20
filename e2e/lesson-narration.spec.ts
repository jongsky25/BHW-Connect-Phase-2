import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
  createThrowawayBhw,
  getAccessToken,
  onboardThroughLogin,
} from "./fixtures/auth";

// INC-27 (docs/training-modules-plan.md): pre-rendered narration + a
// sentence-level read-along. Written the same way slide-mode.spec.ts sets
// up its fixture course — rpc_course_create only takes plain body_fil/en,
// so lesson/visuals/audio are set with direct admin-scoped REST
// calls, matching what scripts/training-load.mjs and scripts/tts-render.mjs
// do outside a test. Audio for section 0 is a tiny embedded silent WAV data
// URI (not a real narration render — this spec was never executed against
// a live Supabase project or a real TTS provider in the session that wrote
// it, the same gap INC-23/INC-26 both hit), which is enough for a real
// browser to actually fire play/pause/ended events; section 1 is left
// without any course_module_audio row at all, to cover the "no narration
// for this section" graceful-degradation path in the same course.

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL as string;
}
function anonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
}

// A ~0.1s silent mono 8kHz 16-bit PCM WAV, inlined so this spec has no
// dependency on Supabase Storage or an external asset host.
const SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAGAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

// docs/deploy-runbook.md requires every migration to be applied to the
// dedicated bhw-connect-e2e project by hand (via the Supabase MCP
// apply_migration tool or `supabase db push`) alongside merging — there is
// no CI step that does this. The same gap this spec's own header comment
// already discloses (never executed against a live Supabase project) means
// that step may not have happened yet for INC-27's migration. Rather than
// fail on a missing table, this probes for it first and skips with a clear
// reason — the same pattern e2e/ai-gap-draft.spec.ts already uses for its
// own unconfigured-environment precondition (GEMINI_API_KEY).
async function courseModuleAudioTableExists(
  request: import("@playwright/test").APIRequestContext,
  adminToken: string,
): Promise<boolean> {
  const response = await request.get(
    `${supabaseUrl()}/rest/v1/course_module_audio?select=id&limit=1`,
    { headers: { apikey: anonKey(), Authorization: `Bearer ${adminToken}` } },
  );
  if (response.ok()) return true;
  const body = (await response.json().catch(() => null)) as { code?: string } | null;
  if (body?.code === "PGRST205") return false; // "Could not find the table ... in the schema cache"
  throw new Error(`unexpected error probing course_module_audio: ${response.status()} ${JSON.stringify(body)}`);
}

async function setUpNarratedCourse(
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
      p_title_fil: `Kurso naratibo ${marker}`,
      p_title_en: `Narration course ${marker}`,
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
      objectives_fil: ["Unang layunin"],
      objectives_en: ["First objective"],
      lesson: {
        sections: [
          {
            kind: "concept",
            tier: "core",
            heading_fil: "May naratibo",
            heading_en: "Has narration",
            body_fil: "Isang pangungusap.",
            body_en: "One sentence.",
            visual_position: null,
            takeaway_fil: "Tandaan ito.",
            takeaway_en: "Remember this.",
            check: null,
          },
          {
            kind: "concept",
            tier: "core",
            heading_fil: "Walang naratibo",
            heading_en: "No narration",
            body_fil: "Isa pang seksyon.",
            body_en: "Another section.",
            visual_position: null,
            takeaway_fil: "",
            takeaway_en: "",
            check: null,
          },
        ],
      },
    },
  });

  // Matches the zone order src/lib/elearning/narration-zones.ts builds for
  // section 0's English text: heading, then the one body sentence, then
  // the takeaway.
  await request.post(`${supabaseUrl()}/rest/v1/course_module_audio`, {
    headers,
    data: {
      module_id: moduleId,
      section_index: 0,
      language: "en",
      audio_url: SILENT_WAV_DATA_URI,
      format: "mp3",
      duration_seconds: 0.1,
      content_hash: "e2e-fixture",
      timings: [
        { zone: "heading", index: 0, text: "Has narration", start_ms: 0, end_ms: 30 },
        { zone: "body", index: 0, text: "One sentence.", start_ms: 30, end_ms: 60 },
        { zone: "takeaway", index: 0, text: "Remember this.", start_ms: 60, end_ms: 100 },
      ],
    },
  });

  await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_course_set_status`, {
    headers,
    data: { p_course_id: courseId, p_status: "published" },
  });

  return courseId;
}

test("a section with pre-rendered audio shows a working play control; a section without one renders plainly", async ({
  page,
  request,
}) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);

  test.skip(
    !(await courseModuleAudioTableExists(request, adminToken)),
    "INC-27's migration (course_module_audio) isn't applied to this Supabase project yet — see docs/deploy-runbook.md's migration-application step",
  );

  const marker = `e2e.narration.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const courseId = await setUpNarratedCourse(request, adminToken, marker);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  const newPassword = "Fresh-Narration-2026";
  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, newPassword);

  // A freshly onboarded BHW defaults to language='fil' (baseline migration),
  // but the fixture's course_module_audio row and this spec's assertions
  // are English — switch the BHW's own language so `locale` matches what
  // findAudioForSection looks up ("en") and what's actually on screen.
  const userToken = await getAccessToken(request, fresh.username, newPassword);
  await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_update_settings`, {
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    data: { p_language: "en", p_theme: "light", p_font_scale: "md", p_high_contrast: false },
  });

  await page.goto(`/courses/${courseId}`);

  // Section with narration: the player is present, and clicking it actually
  // drives the underlying <audio> element (real playback, not a stub).
  const playButton = page.getByRole("button", { name: "Play narration" });
  await expect(playButton).toBeVisible();
  await expect(page.getByText("One sentence.")).toBeVisible();

  await playButton.click();
  await expect(page.getByRole("button", { name: "Pause narration" })).toBeVisible();
  // A ~0.1s clip finishes almost immediately; the control returns to "Play".
  await expect(playButton).toBeVisible({ timeout: 5000 });

  // Section without any course_module_audio row: renders plainly, no player.
  await expect(page.getByText("Another section.")).toBeVisible();
  const narrationControls = page.getByRole("button", { name: /narration/i });
  await expect(narrationControls).toHaveCount(1); // only section 0's control exists

  const scan = await new AxeBuilder({ page }).include("main").analyze();
  expect(scan.violations, "axe violations with the narration player present").toEqual([]);
});
