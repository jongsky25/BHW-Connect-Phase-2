import { NextResponse, type NextRequest } from "next/server";
import { runAiCall } from "@/lib/ai/server";
import { KB_DRAFT_SCHEMA, buildKbDraftPrompt, parseKbDraftResponse } from "@/lib/ai/kb-draft";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

// The flywheel's one write path: a gap question an admin has read and cleared
// goes out, a draft KB entry comes back. Every AI call made here permanently
// increases KB coverage, which is what makes "the system relies on the LLM less
// over time" a measured number rather than an intention.

const MAX_CLEARED_LENGTH = 500;

// Enough neighbouring entries for the model to match house tone, few enough
// that the prompt stays small. All published, so all public_content — the
// payload's classification is the stricter of its parts, admin_cleared.
const CONTEXT_ENTRY_LIMIT = 5;

type DraftBody = { unmatched_question_id?: unknown; cleared_text?: unknown };

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const appUser = await getAppUser(supabase, user.id);
  if (!appUser || appUser.role !== "admin") {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  // Feature-disabled looks like no route, the house convention
  // (reports/export/route.ts:28). Both flags: ai_external stays a real master
  // kill switch, ai_gap_draft retires this feature alone.
  const flags = await getFeatureFlags(supabase);
  if (!flags.ai_external || !flags.ai_gap_draft) {
    return NextResponse.json({ error: "feature disabled" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const { unmatched_question_id: gapId, cleared_text: clearedText } = (body ?? {}) as DraftBody;

  if (typeof gapId !== "string" || gapId.length === 0) {
    return NextResponse.json({ error: "unmatched_question_id is required" }, { status: 400 });
  }

  // This is the entire clearance step, and the reason the classification is
  // admin_cleared rather than user_generated: what leaves is the text the admin
  // typed after reading and redacting, never the row's stored text. Reading
  // row.text here instead would send the BHW's raw words to a third party and
  // make the DPA guarantee false while the code still looked correct.
  if (typeof clearedText !== "string" || clearedText.trim().length === 0) {
    return NextResponse.json({ error: "cleared_text is required" }, { status: 400 });
  }
  if (clearedText.length > MAX_CLEARED_LENGTH) {
    return NextResponse.json({ error: "cleared_text is too long" }, { status: 400 });
  }

  // Existence check only. The gap's own text is deliberately not read.
  const { data: gap } = await supabase
    .from("unmatched_questions")
    .select("id")
    .eq("id", gapId)
    .maybeSingle();

  if (!gap) {
    return NextResponse.json({ error: "gap not found" }, { status: 404 });
  }

  // The first category by sort order, as a placeholder. Category is not asked
  // of the model — a wrong-but-confident category is harder for a reviewer to
  // notice than an obviously unset one, and the entry form opens on this field
  // with the full list, so correcting it is one click during the review the
  // draft already requires.
  const { data: categories } = await supabase
    .from("kb_categories")
    .select("id")
    .order("sort_order")
    .limit(1);

  const categoryId = (categories ?? [])[0]?.id as string | undefined;
  if (!categoryId) {
    return NextResponse.json({ error: "no category available" }, { status: 400 });
  }

  const { data: contextRows } = await supabase
    .from("kb_entries")
    .select("question_en")
    .eq("status", "published")
    .limit(CONTEXT_ENTRY_LIMIT);

  const contextEntries = (contextRows ?? []).map((row) => (row as { question_en: string }).question_en);

  const result = await runAiCall(
    supabase,
    {
      classification: "admin_cleared",
      prompt: buildKbDraftPrompt(clearedText.trim(), contextEntries),
      jsonSchema: KB_DRAFT_SCHEMA,
    },
    "gap_draft",
  );

  // Every unavailable reason is a value, not an exception — the admin still has
  // the manual "create entry from this" link, which is the baseline this
  // feature accelerates rather than replaces.
  if (!result.ok) {
    return NextResponse.json({ error: "ai unavailable", reason: result.reason }, { status: 503 });
  }

  const parsed = parseKbDraftResponse(result.text);
  if (!parsed.ok) {
    // The problems are logged rather than returned: they name the model's
    // failure modes, which is a debugging detail, not something an admin can
    // act on. The admin's action is "try again or write it yourself".
    console.error("gap/draft: provider returned an unusable draft", parsed.problems);
    return NextResponse.json({ error: "invalid draft" }, { status: 502 });
  }

  // Created server-side rather than handed to the client to stash, so the
  // existing gap linkage comes for free: rpc_kb_entry_create already stamps
  // resolved_entry_id on a draft without resolving the gap, and
  // rpc_kb_entry_update resolves it on publish by reverse lookup. No new gap
  // plumbing at all.
  const { data: created, error: createError } = await supabase
    .rpc("rpc_kb_entry_create", {
      p_category_id: categoryId,
      p_question_fil: parsed.draft.question_fil,
      p_question_en: parsed.draft.question_en,
      p_answer_fil: parsed.draft.answer_fil,
      p_answer_en: parsed.draft.answer_en,
      p_keywords: parsed.draft.keywords,
      p_image_url: null,
      p_owner_user_id: null,
      p_review_due_on: null,
      p_status: "draft",
      p_source_unmatched_question_id: gapId,
    })
    .single<{ entry_id: string }>();

  if (createError || !created) {
    return NextResponse.json({ error: createError?.message ?? "create failed" }, { status: 400 });
  }

  // A separate RPC rather than a twelfth parameter on rpc_kb_entry_create:
  // `create or replace function` keys on the full argument signature, so a new
  // parameter creates a second overload and PostgREST answers PGRST203.
  const { error: markError } = await supabase.rpc("rpc_kb_entry_mark_ai_drafted", {
    p_id: created.entry_id,
  });

  if (markError) {
    // Failing here would leave an AI-drafted entry that the publish gate does
    // not recognise as needing review — the one outcome this increment must
    // not produce. Better an admin sees an error and the draft sits unused.
    console.error("gap/draft: failed to mark the entry as AI-drafted", markError);
    return NextResponse.json({ error: "draft provenance not recorded" }, { status: 500 });
  }

  return NextResponse.json({ entry_id: created.entry_id });
}
