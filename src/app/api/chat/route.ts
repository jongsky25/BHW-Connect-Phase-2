import { NextResponse, type NextRequest } from "next/server";
import { resolveTurn } from "@/lib/chat/conversation";
import { matchQuestion } from "@/lib/chat/matcher";
import { clarifierRules, redFlagRules } from "@/lib/chat/rules";
import type {
  ChatContext,
  ChatEntryCandidate,
  ClarifierSelection,
  ConversationResult,
  SynonymRow,
} from "@/lib/chat/types";
import { getFeatureFlags } from "@/lib/flags/get-flags";
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

  const flags = await getFeatureFlags(supabase);
  const conversational = flags.chat_conversation;

  // A selection is only meaningful when the conversation layer is on; with the
  // flag off the field is ignored entirely and a question is still required,
  // so an old client and a new one behave identically.
  const selection = conversational ? requestSelection(body) : null;

  const question = (body as { question?: unknown } | null)?.question;
  if (!selection) {
    if (typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json({ error: "question is too long" }, { status: 400 });
    }
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

  const requestedSessionId = requestSessionId(body);
  const context = conversational ? await loadContext(supabase, requestedSessionId) : null;
  const askedText = typeof question === "string" ? question.trim() : "";

  const result: ConversationResult = conversational
    ? resolveTurn(
        { question: askedText, selection: selection ?? undefined, context },
        (entries ?? []) as ChatEntryCandidate[],
        (synonyms ?? []) as SynonymRow[],
        redFlagRules,
        clarifierRules,
      )
    : asConversationResult(
        matchQuestion(askedText, (entries ?? []) as ChatEntryCandidate[], (synonyms ?? []) as SynonymRow[]),
        askedText,
      );

  if (result.type === "invalid_selection") {
    return NextResponse.json({ error: "unknown clarifier selection" }, { status: 400 });
  }

  // A clarifier is not a miss — the system knows the topic and is narrowing
  // it — so it must not be logged as a content gap the way no_answer is.
  if (result.type === "no_answer") {
    await supabase.rpc("rpc_chat_upsert_unmatched", {
      p_text: askedText,
      p_normalized_text: result.normalizedText,
    });
  }

  // Checked before this turn's messages are inserted, so it doesn't count itself.
  const isFirstAnswer = result.type === "answer" && (await isFirstEverAnswer(supabase));

  const { sessionId, systemMessageId, isNewSession } = await logConversation(
    supabase,
    appUser.id,
    requestedSessionId,
    selection ? selectionEcho(result) : askedText,
    result,
    conversational ? nextContext(context, result) : null,
  );

  // Best-effort analytics instrumentation (§8 taxonomy) — never blocks the
  // chat response. A new chat_sessions row is this app's existing notion
  // of "session" (see rpc_dashboard_activity_summary's active_bhws calc),
  // so that's what session.started tracks. did_you_mean isn't in the
  // taxonomy (neither a shown answer nor a miss), so only answer/no_answer
  // fire chat.answer_shown/chat.no_answer.
  if (isNewSession) {
    await supabase.rpc("rpc_track_event", { p_event_name: "session.started" });
  }
  await supabase.rpc("rpc_track_event", { p_event_name: "chat.question_asked" });
  if (result.type === "answer") {
    await supabase.rpc("rpc_track_event", { p_event_name: "chat.answer_shown" });
    // Tracked separately so the dashboard can show how often the Chat Guide
    // is intercepting an emergency rather than answering a routine question.
    if (result.route === "red_flag") {
      await supabase.rpc("rpc_track_event", {
        p_event_name: "chat.red_flag_shown",
        p_properties: { rule: result.redFlagId ?? null },
      });
    }
    if (result.route === "selection") {
      await supabase.rpc("rpc_track_event", {
        p_event_name: "chat.clarify_answered",
        p_properties: { clarifier: result.clarifierId ?? null },
      });
    }
  } else if (result.type === "no_answer") {
    await supabase.rpc("rpc_track_event", { p_event_name: "chat.no_answer" });
  } else if (result.type === "clarify") {
    await supabase.rpc("rpc_track_event", {
      p_event_name: "chat.clarify_shown",
      p_properties: { clarifier: result.clarifier.id },
    });
  }

  // Best-effort: the "try the Chat Guide" onboarding step is satisfied by
  // sending any question, matched or not. Never blocks the chat response.
  await supabase.rpc("rpc_onboarding_complete_step", { p_step: "chat" });

  return NextResponse.json({
    session_id: sessionId,
    message_id: systemMessageId,
    is_first_answer: isFirstAnswer,
    ...toResponseBody(result, conversational),
  });
}

// Adapts the single-turn matcher onto the conversation result shape so the
// rest of this route has one code path regardless of the flag.
function asConversationResult(
  result: ReturnType<typeof matchQuestion>,
  question: string,
): ConversationResult {
  const base = { route: "direct" as const, normalizedText: result.normalizedText, resolvedQuery: question };
  if (result.type === "answer") return { ...base, type: "answer", top: result.top, related: result.related };
  if (result.type === "did_you_mean") return { ...base, type: "did_you_mean", candidates: result.candidates };
  return { ...base, type: "no_answer" };
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

function requestSelection(body: unknown): ClarifierSelection | null {
  const raw = (body as { selection?: unknown } | null)?.selection;
  if (!raw || typeof raw !== "object") return null;

  const { clarifier_id: clarifierId, option_index: optionIndex } = raw as {
    clarifier_id?: unknown;
    option_index?: unknown;
  };

  if (typeof clarifierId !== "string" || clarifierId.length === 0) return null;
  if (typeof optionIndex !== "number" || !Number.isInteger(optionIndex) || optionIndex < 0) return null;

  return { clarifierId, optionIndex };
}

// RLS scopes chat_sessions to its owner, so a session id belonging to someone
// else simply reads back nothing rather than leaking their context.
async function loadContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string | null,
): Promise<ChatContext | null> {
  if (!sessionId) return null;
  const { data } = await supabase
    .from("chat_sessions")
    .select("context")
    .eq("id", sessionId)
    .maybeSingle();
  return (data?.context as ChatContext | null) ?? null;
}

function nextContext(previous: ChatContext | null, result: ConversationResult): ChatContext {
  if (result.type === "clarify") {
    // Keep whatever topic was last answered; mark the question we just asked
    // so a rephrase doesn't get the same clarifier a second time.
    return { lastEntryId: previous?.lastEntryId ?? null, pendingClarifierId: result.clarifier.id };
  }
  if (result.type === "answer") {
    return { lastEntryId: result.top.entry.id, pendingClarifierId: null };
  }
  return { lastEntryId: previous?.lastEntryId ?? null, pendingClarifierId: null };
}

// What to store as the user's turn when they tapped an option instead of
// typing. Storing the label keeps the transcript readable.
function selectionEcho(result: ConversationResult): string {
  return result.resolvedQuery;
}

async function logConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  requestedSessionId: string | null,
  userText: string,
  result: ConversationResult,
  context: ChatContext | null,
): Promise<{ sessionId: string | null; systemMessageId: string | null; isNewSession: boolean }> {
  let sessionId = requestedSessionId;
  let isNewSession = false;

  const sessionPatch: Record<string, unknown> = { last_message_at: new Date().toISOString() };
  if (context) sessionPatch.context = context;

  if (sessionId) {
    await supabase.from("chat_sessions").update(sessionPatch).eq("id", sessionId);
  } else {
    const { data: session } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userId, ...(context ? { context } : {}) })
      .select("id")
      .single();
    sessionId = session?.id ?? null;
    isNewSession = sessionId !== null;
  }

  if (!sessionId) return { sessionId: null, systemMessageId: null, isNewSession: false };

  await supabase.from("chat_messages").insert({
    session_id: sessionId,
    sender: "user",
    text: userText,
    kind: "question",
  });

  const { data: systemMessage } = await supabase
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      sender: "system",
      text: systemResponseText(result),
      matched_entry_id: result.type === "answer" ? result.top.entry.id : null,
      match_score: result.type === "answer" ? result.top.totalScore : null,
      kind: result.type,
      route: result.route,
      // The candidate set is persisted so a later turn can resolve a choice by
      // id. Before INC-17 this was discarded and the row read "did_you_mean".
      candidates: persistedCandidates(result),
      resolved_query: result.resolvedQuery,
    })
    .select("id")
    .single();

  return { sessionId, systemMessageId: systemMessage?.id ?? null, isNewSession };
}

function persistedCandidates(result: ConversationResult): unknown {
  if (result.type === "did_you_mean") {
    return result.candidates.map((c) => ({ entry_id: c.entry.id, score: c.totalScore }));
  }
  if (result.type === "clarify") {
    return {
      clarifier_id: result.clarifier.id,
      options: result.clarifier.options.map((option) => option.entry_id),
    };
  }
  return null;
}

function systemResponseText(result: ConversationResult): string {
  if (result.type === "answer") return result.top.entry.answer_en;
  if (result.type === "clarify") return result.clarifier.question_en;
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

function toResponseBody(result: ConversationResult, conversational: boolean) {
  // With the flag off the response is byte-for-byte what it was before the
  // conversation layer existed: no route, no clarifier, nothing new to parse.
  const route = conversational ? { route: result.route } : {};

  if (result.type === "answer") {
    return {
      ...route,
      type: "answer" as const,
      answer: entrySummary(result.top.entry, result.top.totalScore),
      related: result.related.map((r) => entrySummary(r.entry, r.totalScore)),
    };
  }
  if (result.type === "did_you_mean") {
    return {
      ...route,
      type: "did_you_mean" as const,
      candidates: result.candidates.map((c) => entrySummary(c.entry, c.totalScore)),
    };
  }
  if (result.type === "clarify") {
    return {
      ...route,
      type: "clarify" as const,
      clarifier: {
        id: result.clarifier.id,
        question_fil: result.clarifier.question_fil,
        question_en: result.clarifier.question_en,
        options: result.clarifier.options.map((option) => ({
          label_fil: option.label_fil,
          label_en: option.label_en,
        })),
      },
    };
  }
  return { ...route, type: "no_answer" as const };
}
