import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { STABLE_ADMIN, STABLE_BHW, getAccessToken, restGet } from "./fixtures/auth";

// INC-17. The conversation layer only works against the real HHP+ NCD corpus
// (the red-flag and clarifier rules point at m3-/m4-/m1- entry ids), so this
// spec asserts behaviour rather than seeding its own entries: it needs the
// loaded content, which `npm run kb:load` puts in the e2e project.
//
// chat_conversation is a global flag like offline_pwa, so it is flipped on
// only for the duration of the assertions and always restored off in
// `finally` — never leave shared e2e state changed.

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

async function setConversationFlag(request: APIRequestContext, enabled: boolean) {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const response = await request.post(`${supabaseUrl()}/rest/v1/rpc/rpc_flag_toggle`, {
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    data: { p_key: "chat_conversation", p_enabled: enabled },
  });
  expect(response.status(), await response.text()).toBe(204);
}

async function loginAsBhw(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });
}

type ChatBody = {
  type: string;
  route?: string;
  session_id?: string | null;
  answer?: { id: string; content_id: string | null };
  clarifier?: { id: string; question_fil: string; options: { label_fil: string; label_en: string }[] };
};

test("Chat Guide intercepts a red flag, asks the deeper question, and resolves a selection by id", async ({
  page,
  request,
}) => {
  await loginAsBhw(page);

  // With the flag off the response carries no route and the symptomatic
  // question is answered by whatever scores highest — the behaviour this
  // increment exists to change. Asserted so the rollback path is real.
  const before = (await (
    await page.request.post("/api/chat", {
      data: { question: "mataas ang presyon niya at sumasakit ang dibdib niya" },
    })
  ).json()) as ChatBody;
  expect(before.route).toBeUndefined();

  await setConversationFlag(request, true);

  try {
    // 1. Red flag: a symptomatic client is routed to the emergency entry even
    // though scoring alone confidently prefers a definition of hypertension.
    const redFlag = (await (
      await page.request.post("/api/chat", {
        data: { question: "mataas ang presyon niya at sumasakit ang dibdib niya" },
      })
    ).json()) as ChatBody;
    expect(redFlag.type).toBe("answer");
    expect(redFlag.route).toBe("red_flag");
    expect(redFlag.answer?.content_id).toBe("m3-very-high-with-symptoms");

    // 2. Clarifier: the same topic without the decisive detail is not guessed
    // at — the system asks which situation this is.
    //
    // The trailing marker makes this question unique per run. unmatched_questions
    // dedupes globally on normalized_text and never resets, so assertion 4 below
    // would otherwise read a row left behind by an earlier run rather than
    // testing this one. The marker is inert to the clarifier, which matches on
    // topic ("bp"), intent ("ano gagawin") and the high marker ("mataas")
    // before any scoring happens.
    const clarifyQuestion = `mataas ang BP niya, ano gagawin ko? zzz${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    const clarify = (await (
      await page.request.post("/api/chat", {
        data: { question: clarifyQuestion },
      })
    ).json()) as ChatBody;
    expect(clarify.type).toBe("clarify");
    expect(clarify.clarifier?.id).toBe("clr-bp-high-next-step");
    expect(clarify.clarifier?.options.length).toBeGreaterThanOrEqual(2);
    // The client is never told which entry an option maps to; it replies with
    // an index and the server resolves it.
    expect(clarify.clarifier?.options[0]).not.toHaveProperty("entry_id");

    // 3. Selection resolves by id. Option 0 is the symptomatic branch, so it
    // must return the emergency entry — the option that was tapped, not
    // whatever re-scoring its label text would have produced.
    const selected = (await (
      await page.request.post("/api/chat", {
        data: {
          selection: { clarifier_id: "clr-bp-high-next-step", option_index: 0 },
          session_id: clarify.session_id,
        },
      })
    ).json()) as ChatBody;
    expect(selected.type).toBe("answer");
    expect(selected.route).toBe("selection");
    expect(selected.answer?.content_id).toBe("m3-very-high-with-symptoms");

    // 4. A clarifier is a narrowing step, not a content gap — it must not be
    // logged as an unmatched question the way a genuine miss is. Scoped to this
    // run's marker, so it proves what this run did rather than what the table
    // has accumulated.
    const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
    const gapRows = (await restGet(
      request,
      adminToken,
      `unmatched_questions?text=eq.${encodeURIComponent(clarifyQuestion)}&select=id`,
    )) as Array<{ id: string }>;
    expect(gapRows).toHaveLength(0);

    // 5. An unknown selection is rejected rather than silently answered.
    const bogus = await page.request.post("/api/chat", {
      data: { selection: { clarifier_id: "clr-bp-high-next-step", option_index: 99 } },
    });
    expect(bogus.status()).toBe(400);

    // 6. The turn is persisted with its provenance, so a red-flag
    // interception is distinguishable from an ordinary confident answer.
    const messages = (await restGet(
      request,
      adminToken,
      "chat_messages?route=eq.red_flag&select=kind,route,resolved_query&limit=1",
    )) as Array<{ kind: string; route: string }>;
    expect(messages[0]?.kind).toBe("answer");
    expect(messages[0]?.route).toBe("red_flag");
  } finally {
    await setConversationFlag(request, false);
  }
});

test("Chat Guide UI asks a clarifying question and answers the tapped option", async ({ page, request }) => {
  await setConversationFlag(request, true);

  try {
    await loginAsBhw(page);
    await page.goto("/chat");

    // The disclaimer is present before anything is asked — the chat surface
    // had none at all before this increment.
    await expect(page.getByText(/hindi ito medikal na payo|not medical advice/i)).toBeVisible();

    await page.getByLabel("Ang iyong tanong").fill("mataas ang BP niya, ano gagawin ko?");
    await page.getByRole("button", { name: "Ipadala" }).click();

    const optionLabel = /sakit ng dibdib|chest pain/i;
    await expect(page.getByRole("button", { name: optionLabel })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: optionLabel }).click();

    // The emergency answer is announced assertively, not as a routine bubble.
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  } finally {
    await setConversationFlag(request, false);
  }
});
