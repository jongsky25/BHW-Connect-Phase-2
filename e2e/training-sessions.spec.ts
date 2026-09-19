import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_CITY_ADMIN,
  createThrowawayAssessor,
  createThrowawayBhw,
  getAccessToken,
  onboardThroughLogin,
} from "./fixtures/auth";

// INC-22 DoD. Builds a fixture course with two modules: module 1 is a plain
// text module with no `lesson` (the explicit regression assertion — this
// must render exactly as the pre-INC-20 path, unchanged), module 2 carries
// a `lesson` with one section per §A.6 tier (core/standard/deep) plus one
// inline retrieval check, so density filtering and the retrieval-check
// no-row guarantee are both assertable. A 1-question course_test_questions
// bank makes the pretest/posttest gate + score/delta path assertable too.

const LOS_BANOS_ID = "00000000-0000-0000-0000-000000000004";

function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  return url;
}

function anonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required");
  return key;
}

async function callRpc(
  request: APIRequestContext,
  accessToken: string,
  fn: string,
  body: Record<string, unknown>,
) {
  const response = await request.post(`${supabaseUrl()}/rest/v1/rpc/${fn}`, {
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: body,
  });
  const text = await response.text();
  return {
    status: response.status(),
    body: text.length > 0 ? JSON.parse(text) : null,
  };
}

async function insertRows(
  request: APIRequestContext,
  accessToken: string,
  table: string,
  rows: Record<string, unknown>[],
) {
  const response = await request.post(`${supabaseUrl()}/rest/v1/${table}`, {
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    data: rows,
  });
  if (!response.ok()) {
    throw new Error(
      `insert ${table} -> ${response.status()}: ${await response.text()}`,
    );
  }
  return response.json();
}

async function userIdFor(
  request: APIRequestContext,
  accessToken: string,
  username: string,
): Promise<string> {
  const response = await request.get(
    `${supabaseUrl()}/rest/v1/users?username=eq.${username}&select=id`,
    {
      headers: { apikey: anonKey(), Authorization: `Bearer ${accessToken}` },
    },
  );
  const [row] = (await response.json()) as Array<{ id: string }>;
  return row.id;
}

async function testAttemptCount(
  request: APIRequestContext,
  accessToken: string,
  bhwUserId: string,
): Promise<number> {
  const response = await request.get(
    `${supabaseUrl()}/rest/v1/course_test_attempts?bhw_user_id=eq.${bhwUserId}&select=id`,
    { headers: { apikey: anonKey(), Authorization: `Bearer ${accessToken}` } },
  );
  return ((await response.json()) as unknown[]).length;
}

const LESSON = {
  sections: [
    {
      kind: "concept",
      tier: "core",
      heading_fil: "CoreOnly Fil",
      heading_en: "CoreOnly En",
      body_fil: "Core body fil.",
      body_en: "Core body en.",
      visual_position: null,
      takeaway_fil: "CoreTakeaway fil",
      takeaway_en: "CoreTakeaway en",
      check: {
        prompt_fil: "CheckPrompt fil?",
        prompt_en: "CheckPrompt en?",
        options: [
          { fil: "Opt A", en: "Opt A" },
          { fil: "Opt B", en: "Opt B" },
        ],
        correct_option_index: 1,
        feedback_fil: "CheckFeedback fil",
        feedback_en: "CheckFeedback en",
      },
    },
    {
      kind: "concept",
      tier: "standard",
      heading_fil: "StandardOnly Fil",
      heading_en: "StandardOnly En",
      body_fil: "Standard body fil.",
      body_en: "Standard body en.",
      visual_position: null,
      takeaway_fil: "StandardTakeaway fil",
      takeaway_en: "StandardTakeaway en",
      check: null,
    },
    {
      kind: "concept",
      tier: "deep",
      heading_fil: "DeepOnly Fil",
      heading_en: "DeepOnly En",
      body_fil: "Deep body fil.",
      body_en: "Deep body en.",
      visual_position: null,
      takeaway_fil: "DeepTakeaway fil",
      takeaway_en: "DeepTakeaway en",
      check: null,
    },
  ],
};

async function setUpCourse(
  request: APIRequestContext,
  cityAdminToken: string,
  marker: string,
) {
  const created = await callRpc(request, cityAdminToken, "rpc_course_create", {
    p_org_unit_id: LOS_BANOS_ID,
    p_title_fil: `Training Kurso ${marker}`,
    p_title_en: `Training Course ${marker}`,
    p_description_fil: "",
    p_description_en: "",
    p_quiz_passing_percent: 80,
    p_quiz_max_attempts: 3,
    p_modules: [
      {
        type: "text",
        title_fil: "Modyul 1 Fil",
        title_en: "Module 1 En",
        body_fil: "PlainBodyText fil",
        body_en: "PlainBodyText en",
      },
    ],
  });
  const courseId = (created.body as Array<{ course_id: string }>)[0]?.course_id;
  if (!courseId)
    throw new Error(`course create failed: ${JSON.stringify(created)}`);

  await insertRows(request, cityAdminToken, "course_modules", [
    {
      course_id: courseId,
      position: 1,
      type: "text",
      title_fil: "Modyul 2 Fil",
      title_en: "Module 2 En",
      body_fil: "",
      body_en: "",
      objectives_fil: ["Obj1 fil"],
      objectives_en: ["Obj1 en"],
      summary_fil: "Summary fil placeholder, never rendered directly.",
      summary_en: "Summary en placeholder, never rendered directly.",
      lesson: LESSON,
    },
  ]);

  await insertRows(request, cityAdminToken, "course_test_questions", [
    {
      course_id: courseId,
      position: 0,
      prompt_fil: "TestQ1 fil?",
      prompt_en: "TestQ1 en?",
      options: [
        { fil: "TQ Opt A", en: "TQ Opt A" },
        { fil: "TQ Opt B", en: "TQ Opt B" },
      ],
      correct_option_index: 1,
    },
  ]);

  const published = await callRpc(
    request,
    cityAdminToken,
    "rpc_course_set_status",
    {
      p_course_id: courseId,
      p_status: "published",
    },
  );
  if (published.status !== 204 && published.status !== 200) {
    throw new Error(`publish failed: ${JSON.stringify(published)}`);
  }

  return courseId as string;
}

// Both tests below flip the global `course_sessions` flag on/off around
// themselves (same caution as e2e/ops-hardening.spec.ts's kb_articles
// toggle — this flag is shared with every other e2e spec and live traffic).
// Unlike that spec, there are two tests here doing it, and this repo's
// playwright.config.ts sets fullyParallel: true, so without forcing them
// serial they could run concurrently and race each other's flag state.
test.describe.serial("training sessions (INC-22)", () => {
  test("an enrolled BHW at short density completes pretest-gated content and posttest with a recorded session_id, sees only core-tier content, and a retrieval check never writes an attempt row", async ({
    page,
    request,
  }) => {
    const marker = `e2e.training.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
    const cityAdminToken = await getAccessToken(
      request,
      STABLE_CITY_ADMIN.username,
      STABLE_CITY_ADMIN.password,
    );

    const flagOn = await callRpc(request, cityAdminToken, "rpc_flag_toggle", {
      p_key: "course_sessions",
      p_enabled: true,
    });
    expect(flagOn.status).toBe(204);

    try {
      const courseId = await setUpCourse(request, cityAdminToken, marker);

      const assessor = await createThrowawayAssessor(
        request,
        cityAdminToken,
        LOS_BANOS_ID,
      );
      await onboardThroughLogin(
        page,
        assessor.username,
        assessor.tempPassword,
        "AssessorPw2026!",
      );
      const assessorToken = await getAccessToken(
        request,
        assessor.username,
        "AssessorPw2026!",
      );

      const shortBhw = await createThrowawayBhw(
        request,
        cityAdminToken,
        BARANGAY_BATONG_MALAKE_ID,
      );
      const shortBhwId = await userIdFor(
        request,
        cityAdminToken,
        shortBhw.username,
      );

      const sessionCreate = await callRpc(
        request,
        assessorToken,
        "rpc_course_session_create",
        {
          p_course_id: courseId,
          p_scheduled_at: new Date().toISOString(),
          p_location_note: "",
          p_lesson_density: "short",
        },
      );
      const sessionId = (sessionCreate.body as Array<{ session_id: string }>)[0]
        ?.session_id;
      expect(sessionId).toBeTruthy();

      const enroll = await callRpc(
        request,
        assessorToken,
        "rpc_course_session_enroll",
        {
          p_session_id: sessionId,
          p_bhw_user_id: shortBhwId,
        },
      );
      expect(enroll.status).toBe(204);

      await page.goto("/home");
      await page.getByRole("button", { name: "Mag-sign out" }).click();
      await expect(page).toHaveURL("/login", { timeout: 10_000 });
      await onboardThroughLogin(
        page,
        shortBhw.username,
        shortBhw.tempPassword,
        "ShortBhwPw2026!",
      );

      await page.goto(`/courses/${courseId}`);

      // Pretest gates the first module — module content is not visible yet.
      await expect(
        page.getByRole("heading", { name: "Pretest" }),
      ).toBeVisible();
      await expect(page.getByText("PlainBodyText fil")).not.toBeVisible();

      await page.getByLabel("TQ Opt A", { exact: true }).check(); // wrong -> 0%
      await page.getByRole("button", { name: "Isumite" }).click();
      await expect(page.getByText("Marka sa pretest: 0%.")).toBeVisible();

      // Content is now unlocked; module 1 (no lesson) renders unchanged.
      await expect(page.getByText("PlainBodyText fil")).toBeVisible();

      // Module 2's lesson: short density shows only the core section.
      await expect(page.getByText("CoreOnly Fil")).toBeVisible();
      await expect(page.getByText("StandardOnly Fil")).not.toBeVisible();
      await expect(page.getByText("DeepOnly Fil")).not.toBeVisible();

      // Retrieval check gives feedback but writes no course_test_attempts row.
      const countBeforeCheck = await testAttemptCount(
        request,
        cityAdminToken,
        shortBhwId,
      );
      await page.getByLabel("Opt A", { exact: true }).check(); // wrong option
      await page.getByRole("button", { name: "Suriin ang sagot" }).click();
      await expect(page.getByText("Hindi tama.")).toBeVisible();
      await expect(page.getByText("CheckFeedback fil")).toBeVisible();
      const countAfterCheck = await testAttemptCount(
        request,
        cityAdminToken,
        shortBhwId,
      );
      expect(countAfterCheck).toBe(countBeforeCheck);

      // Retrieval-first summary: reveal shows only the rendered (core)
      // takeaway. Scoped to the summary's own <li> items — the same
      // takeaway text also renders inline right after its section (by
      // design, the "consolidated summary" is deliberately redundant with
      // it), so an unscoped getByText matches both and is ambiguous.
      await page.getByRole("button", { name: "Ipakita ang buod" }).click();
      const summaryItems = page.getByRole("listitem");
      await expect(
        summaryItems.filter({ hasText: "CoreTakeaway fil" }),
      ).toBeVisible();
      await expect(
        summaryItems.filter({ hasText: "StandardTakeaway fil" }),
      ).not.toBeVisible();
      await expect(
        summaryItems.filter({ hasText: "DeepTakeaway fil" }),
      ).not.toBeVisible();

      // Complete both modules. router.refresh() after each rpc call lands
      // asynchronously, so wait for the button count to actually drop
      // before clicking again rather than a fixed .first()/generic locator,
      // which can transiently still match the just-clicked module's button
      // (it briefly re-enables once its own pending state clears, before
      // the refreshed isDone prop arrives and replaces it with the badge).
      const completeButtons = page.getByRole("button", {
        name: "Markahan bilang tapos na",
      });
      await expect(completeButtons).toHaveCount(2);
      await completeButtons.first().click();
      await expect(completeButtons).toHaveCount(1, { timeout: 10_000 });
      await completeButtons.first().click();
      await expect(completeButtons).toHaveCount(0, { timeout: 10_000 });
      await expect(page.getByText("Tapos na")).toHaveCount(2);

      // Posttest is offered once content is complete.
      await expect(page.getByRole("heading", { name: "Posttest" })).toBeVisible(
        { timeout: 10_000 },
      );
      await page.getByLabel("TQ Opt B", { exact: true }).check(); // correct -> 100%
      await page.getByRole("button", { name: "Isumite" }).click();
      await expect(page.getByText("Marka sa posttest: 100%.")).toBeVisible();
      await expect(
        page.getByText("Pagbabago mula pretest patungong posttest: 100%."),
      ).toBeVisible();

      const attempts = await request.get(
        `${supabaseUrl()}/rest/v1/course_test_attempts?bhw_user_id=eq.${shortBhwId}&select=phase,session_id`,
        {
          headers: {
            apikey: anonKey(),
            Authorization: `Bearer ${cityAdminToken}`,
          },
        },
      );
      const rows = (await attempts.json()) as Array<{
        phase: string;
        session_id: string | null;
      }>;
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.session_id).toBe(sessionId);
      }
    } finally {
      const flagOff = await callRpc(
        request,
        cityAdminToken,
        "rpc_flag_toggle",
        { p_key: "course_sessions", p_enabled: false },
      );
      expect(flagOff.status).toBe(204);
    }
  });

  test("a BHW enrolled at long density sees all three tiers, and a solo BHW (no session) sees the normal core+standard set with a null session_id", async ({
    page,
    request,
  }) => {
    const marker = `e2e.training.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
    const cityAdminToken = await getAccessToken(
      request,
      STABLE_CITY_ADMIN.username,
      STABLE_CITY_ADMIN.password,
    );

    const flagOn = await callRpc(request, cityAdminToken, "rpc_flag_toggle", {
      p_key: "course_sessions",
      p_enabled: true,
    });
    expect(flagOn.status).toBe(204);

    try {
      const courseId = await setUpCourse(request, cityAdminToken, marker);

      const assessor = await createThrowawayAssessor(
        request,
        cityAdminToken,
        LOS_BANOS_ID,
      );
      await onboardThroughLogin(
        page,
        assessor.username,
        assessor.tempPassword,
        "AssessorPw2026!",
      );
      const assessorToken = await getAccessToken(
        request,
        assessor.username,
        "AssessorPw2026!",
      );

      const longBhw = await createThrowawayBhw(
        request,
        cityAdminToken,
        BARANGAY_BATONG_MALAKE_ID,
      );
      const longBhwId = await userIdFor(
        request,
        cityAdminToken,
        longBhw.username,
      );

      const sessionCreate = await callRpc(
        request,
        assessorToken,
        "rpc_course_session_create",
        {
          p_course_id: courseId,
          p_scheduled_at: new Date().toISOString(),
          p_location_note: "",
          p_lesson_density: "long",
        },
      );
      const sessionId = (sessionCreate.body as Array<{ session_id: string }>)[0]
        ?.session_id;

      const enroll = await callRpc(
        request,
        assessorToken,
        "rpc_course_session_enroll",
        {
          p_session_id: sessionId,
          p_bhw_user_id: longBhwId,
        },
      );
      expect(enroll.status).toBe(204);

      await page.goto("/home");
      await page.getByRole("button", { name: "Mag-sign out" }).click();
      await expect(page).toHaveURL("/login", { timeout: 10_000 });
      await onboardThroughLogin(
        page,
        longBhw.username,
        longBhw.tempPassword,
        "LongBhwPw2026!",
      );

      await page.goto(`/courses/${courseId}`);
      await page.getByLabel("TQ Opt A", { exact: true }).check();
      await page.getByRole("button", { name: "Isumite" }).click();
      await expect(page.getByText("Marka sa pretest:")).toBeVisible();

      await expect(page.getByText("CoreOnly Fil")).toBeVisible();
      await expect(page.getByText("StandardOnly Fil")).toBeVisible();
      await expect(page.getByText("DeepOnly Fil")).toBeVisible();

      // Solo BHW: no session at all, so density defaults to normal (core + standard).
      const soloBhw = await createThrowawayBhw(
        request,
        cityAdminToken,
        BARANGAY_BATONG_MALAKE_ID,
      );
      const soloBhwId = await userIdFor(
        request,
        cityAdminToken,
        soloBhw.username,
      );

      await page.goto("/home");
      await page.getByRole("button", { name: "Mag-sign out" }).click();
      await expect(page).toHaveURL("/login", { timeout: 10_000 });
      await onboardThroughLogin(
        page,
        soloBhw.username,
        soloBhw.tempPassword,
        "SoloBhwPw2026!",
      );

      await page.goto(`/courses/${courseId}`);
      await page.getByLabel("TQ Opt A", { exact: true }).check();
      await page.getByRole("button", { name: "Isumite" }).click();
      await expect(page.getByText("Marka sa pretest:")).toBeVisible();

      await expect(page.getByText("CoreOnly Fil")).toBeVisible();
      await expect(page.getByText("StandardOnly Fil")).toBeVisible();
      await expect(page.getByText("DeepOnly Fil")).not.toBeVisible();

      const soloAttempt = await request.get(
        `${supabaseUrl()}/rest/v1/course_test_attempts?bhw_user_id=eq.${soloBhwId}&select=session_id`,
        {
          headers: {
            apikey: anonKey(),
            Authorization: `Bearer ${cityAdminToken}`,
          },
        },
      );
      const [soloRow] = (await soloAttempt.json()) as Array<{
        session_id: string | null;
      }>;
      expect(soloRow.session_id).toBeNull();
    } finally {
      const flagOff = await callRpc(
        request,
        cityAdminToken,
        "rpc_flag_toggle",
        { p_key: "course_sessions", p_enabled: false },
      );
      expect(flagOff.status).toBe(204);
    }
  });
});
