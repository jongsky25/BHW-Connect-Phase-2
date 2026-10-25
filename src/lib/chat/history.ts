export type ChatHistorySession = {
  id: string;
  created_at: string;
  last_message_at: string;
  chat_messages: { text: string; sender: string }[];
};

export type ChatHistoryMessage = {
  id: string;
  sender: "user" | "system";
  text: string;
  created_at: string;
  kind: string | null;
  route: string | null;
};

export type ChatHistoryPage<T> = { items: T[]; nextPage: number | null };

// Stored markers deliberately omit patient measurements. Never reconstruct
// them, rerun the matcher, or present an internal marker as a clinical answer.
export function historyText(message: Pick<ChatHistoryMessage, "sender" | "text">, locale: string): string {
  const en = locale === "en";
  if (/^\[(bmi|bp) measurement\]$/.test(message.text) || /^measurement:(bmi|bp):/.test(message.text)) {
    return en ? "Measurement details were not saved." : "Hindi itinabi ang mga detalye ng pagsukat.";
  }
  if (message.sender === "system" && message.text === "did_you_mean") {
    return en ? "Suggested questions were shown. Their options were not saved as a transcript." : "Nagpakita ng mga mungkahing tanong. Hindi itinabi ang mga pagpipilian sa tala.";
  }
  if (message.sender === "system" && message.text === "no_answer") {
    return en ? "No answer was found for this question." : "Walang nahanap na sagot sa tanong na ito.";
  }
  return message.text;
}
