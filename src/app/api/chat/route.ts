import { NextResponse, type NextRequest } from "next/server";
import { matchQuestion } from "@/lib/chat/matcher";
import type { ChatEntryCandidate, ChatMatchResult, SynonymRow } from "@/lib/chat/types";
import { getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

const MAX_QUESTION_LENGTH = 500;

type RateLimitRow = { allowed: boolean; retry_after_seconds: number };

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const appUser = await getAppUser(supabase, user.id);
  if (!appUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const question = (body as { question?: unknown } | null)?.question;
  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: "question is too long" }, { status: 400 });
  }

  const { data: rateLimit, error: rateLimitError } = await supabase
    .rpc("rpc_chat_check_rate_limit")
    .single<RateLimitRow>();

  if (rateLimitError) {
    return NextResponse.json({ error: "rate limit check failed" }, { status: 500 });
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retry_after_seconds) } },
    );
  }

  const [{ data: entries, error: entriesError }, { data: synonyms, error: synonymsError }] =
    await Promise.all([
      supabase
        .from("kb_entries")
        .select("id, question_fil, question_en, answer_fil, answer_en, keywords")
        .eq("status", "published"),
      supabase.from("synonyms").select("term, maps_to, language"),
    ]);

  if (entriesError || synonymsError) {
    return NextResponse.json({ error: "failed to load knowledge base" }, { status: 500 });
  }

  const result = matchQuestion(
    question,
    (entries ?? []) as ChatEntryCandidate[],
    (synonyms ?? []) as SynonymRow[],
  );

  if (result.type === "no_answer") {
    await supabase.rpc("rpc_chat_upsert_unmatched", {
      p_text: question.trim(),
      p_normalized_text: result.normalizedText,
    });
  }

  // Checked before this turn's messages are inserted, so it doesn't count itself.
  const isFirstAnswer = result.type === "answer" && (await isFirstEverAnswer(supabase));

  const { sessionId, systemMessageId } = await logConversation(
    supabase,
    appUser.id,
    requestSessionId(body),
    question,
    result,
  );

  return NextResponse.json({
    session_id: sessionId,
    message_id: systemMessageId,
    is_first_answer: isFirstAnswer,
    ...toResponseBody(result),
  });
}

// RLS (chat_messages_owner_all) already scopes this to the caller's own
// sessions, so no explicit user filter is needed here.
async function isFirstEverAnswer(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { count } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("sender", "system")
    .not("matched_entry_id", "is", null);

  return (count ?? 0) === 0;
}

function requestSessionId(body: unknown): string | null {
  const sessionId = (body as { session_id?: unknown } | null)?.session_id;
  return typeof sessionId === "string" && sessionId.length > 0 ? sessionId : null;
}

async function logConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  requestedSessionId: string | null,
  question: string,
  result: ChatMatchResult,
): Promise<{ sessionId: string | null; systemMessageId: string | null }> {
  let sessionId = requestedSessionId;

  if (sessionId) {
    await supabase
      .from("chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", sessionId);
  } else {
    const { data: session } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userId })
      .select("id")
      .single();
    sessionId = session?.id ?? null;
  }

  if (!sessionId) return { sessionId: null, systemMessageId: null };

  await supabase.from("chat_messages").insert({
    session_id: sessionId,
    sender: "user",
    text: question.trim(),
  });

  const { data: systemMessage } = await supabase
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      sender: "system",
      text: systemResponseText(result),
      matched_entry_id: result.type === "answer" ? result.top.entry.id : null,
      match_score: result.type === "answer" ? result.top.totalScore : null,
    })
    .select("id")
    .single();

  return { sessionId, systemMessageId: systemMessage?.id ?? null };
}

function systemResponseText(result: ChatMatchResult): string {
  if (result.type === "answer") return result.top.entry.answer_en;
  if (result.type === "did_you_mean") return "did_you_mean";
  return "no_answer";
}

function entrySummary(entry: ChatEntryCandidate, score: number) {
  return {
    id: entry.id,
    question_fil: entry.question_fil,
    question_en: entry.question_en,
    answer_fil: entry.answer_fil,
    answer_en: entry.answer_en,
    score,
  };
}

function toResponseBody(result: ChatMatchResult) {
  if (result.type === "answer") {
    return {
      type: "answer" as const,
      answer: entrySummary(result.top.entry, result.top.totalScore),
      related: result.related.map((r) => entrySummary(r.entry, r.totalScore)),
    };
  }
  if (result.type === "did_you_mean") {
    return {
      type: "did_you_mean" as const,
      candidates: result.candidates.map((c) => entrySummary(c.entry, c.totalScore)),
    };
  }
  return { type: "no_answer" as const };
}
