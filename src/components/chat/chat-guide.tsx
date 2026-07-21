"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";
import { normalizeText } from "@/lib/chat/normalize";
import { createClient } from "@/lib/supabase/client";

type ChatEntrySummary = {
  id: string;
  question_fil: string;
  question_en: string;
  answer_fil: string;
  answer_en: string;
  score: number;
};

type ChatApiResult =
  | { type: "answer"; answer: ChatEntrySummary; related: ChatEntrySummary[] }
  | { type: "did_you_mean"; candidates: ChatEntrySummary[] }
  | { type: "no_answer" };

type ChatApiResponse = ChatApiResult & {
  session_id: string | null;
  message_id: string | null;
  is_first_answer: boolean;
};

type Exchange = {
  key: string;
  question: string;
  status: "loading" | "done" | "error";
  result?: ChatApiResult;
  messageId?: string | null;
  isFirstAnswer?: boolean;
  errorMessage?: string;
  feedback?: "up" | "down" | null;
};

type ChatTranslations = ReturnType<typeof useTranslations>;

function pick(locale: string, fil: string, en: string): string {
  return locale === "en" ? en : fil;
}

export function ChatGuide() {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  async function ask(questionText: string) {
    const question = questionText.trim();
    if (!question || sending) return;

    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setExchanges((prev) => [...prev, { key, question, status: "loading" }]);
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, session_id: sessionIdRef.current }),
      });

      if (!response.ok) {
        const message =
          response.status === 429
            ? t("rateLimitError", { seconds: response.headers.get("Retry-After") ?? "60" })
            : t("genericError");
        setExchanges((prev) =>
          prev.map((exchange) =>
            exchange.key === key ? { ...exchange, status: "error", errorMessage: message } : exchange,
          ),
        );
        return;
      }

      const body = (await response.json()) as ChatApiResponse;
      sessionIdRef.current = body.session_id;

      setExchanges((prev) =>
        prev.map((exchange) =>
          exchange.key === key
            ? {
                ...exchange,
                status: "done",
                result: body,
                messageId: body.message_id,
                isFirstAnswer: body.is_first_answer,
                feedback: null,
              }
            : exchange,
        ),
      );
    } catch {
      setExchanges((prev) =>
        prev.map((exchange) =>
          exchange.key === key ? { ...exchange, status: "error", errorMessage: t("genericError") } : exchange,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input;
    setInput("");
    void ask(question);
  }

  async function handleFeedback(exchange: Exchange, vote: "up" | "down") {
    if (!exchange.messageId) return;
    setExchanges((prev) =>
      prev.map((item) => (item.key === exchange.key ? { ...item, feedback: vote } : item)),
    );

    const supabase = createClient();
    await supabase.from("chat_messages").update({ feedback: vote }).eq("id", exchange.messageId);

    if (vote === "down") {
      await supabase.rpc("rpc_chat_upsert_unmatched", {
        p_text: exchange.question,
        p_normalized_text: normalizeText(exchange.question),
        p_reason: "bad_answer",
      });
    }
  }

  return (
    <div className="mt-4 flex flex-1 flex-col gap-4">
      <div role="log" aria-live="polite" aria-relevant="additions" className="flex flex-1 flex-col gap-4">
        {exchanges.length === 0 ? <p className="text-ink/70">{t("emptyState")}</p> : null}
        {exchanges.map((exchange) => (
          <ExchangeBubbles
            key={exchange.key}
            exchange={exchange}
            locale={locale}
            t={t}
            onSelectQuestion={ask}
            onFeedback={handleFeedback}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
        <label htmlFor="chat-question" className="text-sm font-medium text-ink">
          {t("inputLabel")}
        </label>
        <div className="flex gap-2">
          <input
            id="chat-question"
            name="question"
            type="text"
            autoComplete="off"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("inputPlaceholder")}
            className="min-h-[48px] flex-1 rounded-md border border-ink/20 bg-canvas px-3 py-2 text-ink outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="min-h-[48px] min-w-[96px] rounded-md bg-primary px-6 py-3 font-medium text-canvas transition-opacity disabled:opacity-60"
          >
            {sending ? t("sending") : t("send")}
          </button>
        </div>
      </form>
    </div>
  );
}

function ExchangeBubbles({
  exchange,
  locale,
  t,
  onSelectQuestion,
  onFeedback,
}: {
  exchange: Exchange;
  locale: string;
  t: ChatTranslations;
  onSelectQuestion: (question: string) => void;
  onFeedback: (exchange: Exchange, vote: "up" | "down") => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="ml-auto max-w-[85%] rounded-lg rounded-br-none bg-primary px-4 py-2 text-canvas">
        {exchange.question}
      </div>

      {exchange.status === "loading" ? (
        <div
          className="mr-auto max-w-[85%] rounded-lg rounded-bl-none border border-ink/10 bg-canvas px-4 py-3 text-ink/70"
          aria-hidden="true"
        >
          &hellip;
        </div>
      ) : null}

      {exchange.status === "error" ? (
        <p role="alert" className="mr-auto max-w-[85%] text-sm text-danger">
          {exchange.errorMessage}
        </p>
      ) : null}

      {exchange.status === "done" && exchange.result ? (
        <AnswerBubble
          exchange={exchange}
          result={exchange.result}
          locale={locale}
          t={t}
          onSelectQuestion={onSelectQuestion}
          onFeedback={onFeedback}
        />
      ) : null}
    </div>
  );
}

function AnswerBubble({
  exchange,
  result,
  locale,
  t,
  onSelectQuestion,
  onFeedback,
}: {
  exchange: Exchange;
  result: ChatApiResult;
  locale: string;
  t: ChatTranslations;
  onSelectQuestion: (question: string) => void;
  onFeedback: (exchange: Exchange, vote: "up" | "down") => void;
}) {
  if (result.type === "no_answer") {
    return (
      <div className="mr-auto max-w-[85%] rounded-lg rounded-bl-none border border-ink/10 bg-canvas px-4 py-3 text-ink">
        {t("noAnswerMessage")}
      </div>
    );
  }

  if (result.type === "did_you_mean") {
    return (
      <div className="mr-auto flex max-w-[85%] flex-col gap-2 rounded-lg rounded-bl-none border border-ink/10 bg-canvas px-4 py-3">
        <p className="font-medium text-ink">{t("didYouMeanHeading")}</p>
        <div className="flex flex-col gap-2">
          {result.candidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onSelectQuestion(pick(locale, candidate.question_fil, candidate.question_en))}
              className="min-h-[44px] rounded-md border border-ink/20 px-3 py-2 text-left text-sm text-ink hover:bg-ink/5"
            >
              {pick(locale, candidate.question_fil, candidate.question_en)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mr-auto flex max-w-[85%] flex-col gap-3">
      {exchange.isFirstAnswer ? (
        <div className="rounded-lg bg-celebration px-4 py-2 text-sm font-medium text-celebration-ink">
          {t("celebrationMessage")}
        </div>
      ) : null}

      <div className="rounded-lg rounded-bl-none border border-ink/10 bg-canvas px-4 py-3 text-ink">
        {pick(locale, result.answer.answer_fil, result.answer.answer_en)}
      </div>

      <FeedbackControls exchange={exchange} t={t} onFeedback={onFeedback} />

      {result.related.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink/70">{t("relatedHeading")}</p>
          {result.related.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelectQuestion(pick(locale, entry.question_fil, entry.question_en))}
              className="min-h-[44px] rounded-md border border-ink/20 px-3 py-2 text-left text-sm text-ink hover:bg-ink/5"
            >
              {pick(locale, entry.question_fil, entry.question_en)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FeedbackControls({
  exchange,
  t,
  onFeedback,
}: {
  exchange: Exchange;
  t: ChatTranslations;
  onFeedback: (exchange: Exchange, vote: "up" | "down") => void;
}) {
  if (exchange.feedback) {
    return <p className="text-sm text-ink/70">{t("feedbackThanks")}</p>;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-ink/70">{t("feedbackPrompt")}</span>
      <button
        type="button"
        aria-label={t("feedbackUp")}
        onClick={() => onFeedback(exchange, "up")}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-ink/20 text-lg hover:bg-ink/5"
      >
        👍
      </button>
      <button
        type="button"
        aria-label={t("feedbackDown")}
        onClick={() => onFeedback(exchange, "down")}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-ink/20 text-lg hover:bg-ink/5"
      >
        👎
      </button>
    </div>
  );
}
