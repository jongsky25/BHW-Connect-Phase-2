"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePreview } from "@/components/preview/preview-provider";
import { historyText, type ChatHistoryMessage, type ChatHistoryPage, type ChatHistorySession } from "@/lib/chat/history";

const buttonClass = "min-h-[44px] rounded-md border border-ink/20 px-3 py-2 text-left text-ink hover:bg-ink/5 disabled:opacity-60";

export function ChatHistory() {
  const t = useTranslations("chat.history");
  const locale = useLocale();
  const preview = usePreview();
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatHistorySession[]>([]);
  const [messages, setMessages] = useState<ChatHistoryMessage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const lastRequest = useRef<{ session: string | null; page: number }>({ session: null, page: 0 });
  const requestId = useRef(0);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const transcriptHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (selected) transcriptHeading.current?.focus();
  }, [selected]);

  async function load(session: string | null, page = 0) {
    const id = ++requestId.current;
    lastRequest.current = { session, page };
    setBusy(true);
    setError(false);
    if (page === 0) {
      setSelected(session);
      setMessages([]);
      setNextPage(null);
      if (!session) setSessions([]);
    }
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (session) params.set("session", session);
      const response = await fetch(`/api/chat/history?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("history unavailable");
      const body = await response.json() as ChatHistoryPage<ChatHistoryMessage | ChatHistorySession>;
      if (id !== requestId.current) return;
      if (session) setMessages(previous => appendUnique(page ? previous : [], body.items as ChatHistoryMessage[]));
      else setSessions(previous => appendUnique(page ? previous : [], body.items as ChatHistorySession[]));
      setNextPage(body.nextPage);
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  function toggle() {
    if (open) {
      requestId.current++;
      setOpen(false);
      // Release the archived transcript when closed; no local persistence.
      setMessages([]);
      setSessions([]);
    } else {
      setOpen(true);
      void load(null);
    }
  }

  return <section className="min-w-0 rounded-lg border border-ink/15 p-3">
    <div className="flex flex-wrap items-center gap-3">
      <button ref={toggleRef} type="button" className={buttonClass} aria-expanded={open} aria-controls={open ? "chat-history" : undefined}
        disabled={preview} onClick={toggle}>{t("heading")}</button>
      <Link href="/kb" prefetch={false} className="inline-flex min-h-[44px] items-center text-ink underline">{t("browse")}</Link>
    </div>
    {open ? <div id="chat-history" className="mt-3 min-w-0 space-y-3">
      <p className="text-sm text-ink/70">{t("description")}</p>
      {selected ? <>
        <button type="button" className={buttonClass} onClick={() => { void load(null); toggleRef.current?.focus(); }}>{t("back")}</button>
        <h2 ref={transcriptHeading} tabIndex={-1} className="font-semibold text-ink">{t("transcript")}</h2>
        <p className="text-sm text-ink/70">{t("archiveNote")}</p>
        <ol aria-label={t("transcript")} className="space-y-3">
          {messages.map(message => <li key={message.id} className="min-w-0 rounded-md bg-ink/5 p-3 wrap-anywhere">
            <p className="text-sm font-semibold text-ink/70">{t(message.sender === "user" ? "you" : "guide")}</p>
            <p className="whitespace-pre-wrap text-ink">{historyText(message, locale)}</p>
          </li>)}
        </ol>
      </> : <ul aria-label={t("conversations")} className="space-y-2">
        {sessions.map(session => <li key={session.id}>
          <button type="button" className={`${buttonClass} w-full min-w-0 wrap-anywhere`} disabled={busy}
            onClick={() => void load(session.id)}>
            <span className="block font-medium">{session.chat_messages[0]
              ? historyText({ sender: "user", text: session.chat_messages[0].text }, locale) : t("conversation")}</span>
            <time className="text-sm text-ink/70" dateTime={session.last_message_at}>
              {new Intl.DateTimeFormat(locale === "en" ? "en-PH" : "fil-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.last_message_at))}
            </time>
          </button>
        </li>)}
      </ul>}
      {busy ? <p role="status" className="text-ink/70">{t("loading")}</p> : null}
      {error ? <div role="alert" className="space-y-2">
        <p>{t("error")}</p>
        <button type="button" className={buttonClass} onClick={() => void load(lastRequest.current.session, lastRequest.current.page)}>{t("retry")}</button>
      </div> : null}
      {!busy && !error && (selected ? messages : sessions).length === 0 ? <p>{t(selected ? "emptyTranscript" : "empty")}</p> : null}
      {nextPage !== null ? <button type="button" className={buttonClass} disabled={busy}
        onClick={() => void load(selected, nextPage)}>{t("more")}</button> : null}
    </div> : null}
  </section>;
}

function appendUnique<T extends { id: string }>(previous: T[], incoming: T[]): T[] {
  const ids = new Set(previous.map(item => item.id));
  return [...previous, ...incoming.filter(item => !ids.has(item.id))];
}
