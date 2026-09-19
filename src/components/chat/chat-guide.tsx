"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/empty-state";
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

type ClarifierPayload = {
  id: string;
  question_fil: string;
  question_en: string;
  // Deliberately no entry_id: the client sends back the option's index and the
  // server resolves it, so a tampered payload cannot select an arbitrary entry.
  options: { label_fil: string; label_en: string }[];
};

// How the server decided this turn. Present only when the chat_conversation
// flag is on; absent responses render exactly as they did before.
type ChatRoute = "direct" | "red_flag" | "clarify" | "selection" | "context_carry";

type ChatApiResult =
  | { type: "answer"; answer: ChatEntrySummary; related: ChatEntrySummary[]; route?: ChatRoute }
  | { type: "did_you_mean"; candidates: ChatEntrySummary[]; route?: ChatRoute }
  | { type: "clarify"; clarifier: ClarifierPayload; route?: ChatRoute }
  | { type: "no_answer"; route?: ChatRoute };

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

type ChatRequest = { question: string } | { selection: { clarifier_id: string; option_index: number } };

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

  // `label` is what the transcript shows for this turn; `payload` is what the
  // server is asked. They differ for a clarifier selection, where the BHW taps
  // an option and the server resolves it by index rather than re-matching the
  // label text — re-asking could return a different entry than the one tapped.
  async function send(label: string, payload: ChatRequest) {
    if (sending) return;

    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setExchanges((prev) => [...prev, { key, question: label, status: "loading" }]);
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, session_id: sessionIdRef.current }),
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

  function ask(questionText: string) {
    const question = questionText.trim();
    if (!question) return;
    void send(question, { question });
  }

  function selectClarifierOption(clarifierId: string, optionIndex: number, label: string) {
    void send(label, { selection: { clarifier_id: clarifierId, option_index: optionIndex } });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input;
    setInput("");
    ask(question);
  }

  async function handleFeedback(exchange: Exchange, vote: "up" | "down") {
    if (!exchange.messageId) return;
    setExchanges((prev) =>
      prev.map((item) => (item.key === exchange.key ? { ...item, feedback: vote } : item)),
    );

    const supabase = createClient();
    await supabase.from("chat_messages").update({ feedback: vote }).eq("id", exchange.messageId);
    await supabase.rpc("rpc_track_event", {
      p_event_name: "chat.feedback_given",
      p_properties: { vote },
    });

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
      <p className="rounded-md border border-ink/10 bg-ink/5 px-3 py-2 text-sm text-ink/80">
        {t("disclaimer")}
      </p>

      <div role="log" aria-live="polite" aria-relevant="additions" className="flex flex-1 flex-col gap-4">
        {exchanges.length === 0 ? <EmptyState message={t("emptyState")} /> : null}
        {exchanges.map((exchange) => (
          <ExchangeBubbles
            key={exchange.key}
            exchange={exchange}
            locale={locale}
            t={t}
            onSelectQuestion={ask}
            onSelectClarifierOption={selectClarifierOption}
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
            className="min-h-[48px] min-w-[96px] rounded-md bg-primary px-6 py-3 font-medium text-on-primary transition-opacity disabled:opacity-60"
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
  onSelectClarifierOption,
  onFeedback,
}: {
  exchange: Exchange;
  locale: string;
  t: ChatTranslations;
  onSelectQuestion: (question: string) => void;
  onSelectClarifierOption: (clarifierId: string, optionIndex: number, label: string) => void;
  onFeedback: (exchange: Exchange, vote: "up" | "down") => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="ml-auto max-w-[85%] rounded-lg rounded-br-none bg-primary px-4 py-2 text-on-primary">
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
          onSelectClarifierOption={onSelectClarifierOption}
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
  onSelectClarifierOption,
  onFeedback,
}: {
  exchange: Exchange;
  result: ChatApiResult;
  locale: string;
  t: ChatTranslations;
  onSelectQuestion: (question: string) => void;
  onSelectClarifierOption: (clarifierId: string, optionIndex: number, label: string) => void;
  onFeedback: (exchange: Exchange, vote: "up" | "down") => void;
}) {
  if (result.type === "no_answer") {
    return (
      <div className="mr-auto max-w-[85%] rounded-lg rounded-bl-none border border-ink/10 bg-canvas px-4 py-3 text-ink">
        {t("noAnswerMessage")}
      </div>
    );
  }

  // The system is asking the BHW a question rather than answering one. Options
  // are resolved server-side by index, so this is a selection, not a re-ask.
  if (result.type === "clarify") {
    return (
      <div className="mr-auto flex max-w-[85%] flex-col gap-2 rounded-lg rounded-bl-none border border-ink/10 bg-canvas px-4 py-3">
        <p className="font-medium text-ink">
          {pick(locale, result.clarifier.question_fil, result.clarifier.question_en)}
        </p>
        <p className="text-sm text-ink/70">{t("clarifyHint")}</p>
        <div className="flex flex-col gap-2">
          {result.clarifier.options.map((option, index) => {
            const label = pick(locale, option.label_fil, option.label_en);
            return (
              <button
                key={`${result.clarifier.id}-${index}`}
                type="button"
                onClick={() => onSelectClarifierOption(result.clarifier.id, index, label)}
                className="min-h-[44px] rounded-md border border-ink/20 px-3 py-2 text-left text-sm text-ink hover:bg-ink/5"
              >
                {label}
              </button>
            );
          })}
        </div>
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
        <FeedbackControls exchange={exchange} t={t} onFeedback={onFeedback} />
      </div>
    );
  }

  const urgent = result.route === "red_flag";

  return (
    <div className="mr-auto flex max-w-[85%] flex-col gap-3">
      {exchange.isFirstAnswer && !urgent ? (
        <div className="rounded-lg bg-celebration px-4 py-2 text-sm font-medium text-celebration-ink">
          {t("celebrationMessage")}
        </div>
      ) : null}

      {/* An intercepted emergency is announced assertively rather than politely:
          role="alert" so it is read immediately, and a danger-tinted border so
          it does not look like the routine answer that scoring would have given. */}
      {urgent ? (
        <p role="alert" className="font-semibold text-danger">
          {t("urgentHeading")}
        </p>
      ) : null}

      <div
        className={
          urgent
            ? "rounded-lg rounded-bl-none border-2 border-danger bg-canvas px-4 py-3 text-ink"
            : "rounded-lg rounded-bl-none border border-ink/10 bg-canvas px-4 py-3 text-ink"
        }
      >
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
