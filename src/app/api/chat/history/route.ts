import { NextResponse, type NextRequest } from "next/server";
import { forwardedAppUser, getAppUser } from "@/lib/supabase/app-user";
import { createClient } from "@/lib/supabase/server";

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const authId = data?.claims?.sub;
  if (!authId) return reply({ error: "unauthorized" }, 401);
  const user = forwardedAppUser(request.headers, authId) ?? await getAppUser(supabase, authId);
  if (!user || user.status !== "active") return reply({ error: "unauthorized" }, 401);

  const params = request.nextUrl.searchParams;
  const pageText = params.get("page") ?? "0";
  const page = Number(pageText);
  const sessionId = params.get("session");
  if (!/^\d+$/.test(pageText) || !Number.isSafeInteger(page) || page > 10000 ||
    (sessionId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId))) {
    return reply({ error: "invalid history page" }, 400);
  }

  if (sessionId) {
    // Explicit ownership is required even for admins: their existing RLS
    // allows wider operational reads, but this is PERSONAL history.
    const { data: session, error } = await supabase.from("chat_sessions")
      .select("id").eq("id", sessionId).eq("user_id", user.id).maybeSingle();
    if (error) return reply({ error: "history unavailable" }, 500);
    if (!session) return reply({ error: "not found" }, 404);
    const size = 50;
    const { data: messages, error: messagesError } = await supabase.from("chat_messages")
      .select("id, sender, text, created_at, kind, route").eq("session_id", sessionId)
      .order("created_at", { ascending: true }).order("id", { ascending: true })
      .range(page * size, page * size + size);
    if (messagesError) return reply({ error: "history unavailable" }, 500);
    return reply({ items: (messages ?? []).slice(0, size), nextPage: (messages?.length ?? 0) > size ? page + 1 : null });
  }

  const size = 20;
  const { data: sessions, error } = await supabase.from("chat_sessions")
    .select("id, created_at, last_message_at, chat_messages(text, sender)")
    .eq("user_id", user.id)
    .eq("chat_messages.sender", "user")
    .order("last_message_at", { ascending: false }).order("id", { ascending: false })
    .order("created_at", { referencedTable: "chat_messages", ascending: true })
    .limit(1, { referencedTable: "chat_messages" })
    .range(page * size, page * size + size);
  if (error) return reply({ error: "history unavailable" }, 500);
  return reply({ items: (sessions ?? []).slice(0, size), nextPage: (sessions?.length ?? 0) > size ? page + 1 : null });
}
