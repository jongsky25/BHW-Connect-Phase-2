import type { ChatEntryCandidate } from "./types";

// Narrow, reviewed intent guards for facts that should never be guessed from
// two shared words like "YAKAP clinic" or "GAMOT medicine". A guard is inert
// until its target content_id is present in the published KB corpus.
type Rule = { entryId: string; topic: string[]; intent: string[]; exclude?: string[] };
const rules: Rule[] = [
  { entryId: "ph-credentials", topic: ["philhealth", "bhw", "login"], intent: ["otp", "password", "one time code", "verification code", "credentials"] },
  { entryId: "ph-gamot-dose", topic: ["gamot", "medicine", "meds", "reseta", "prescription", "tableta"], intent: ["dose", "dosage", "dosis", "pamalit", "substitute", "replacement", "ilang tableta"] },
  { entryId: "ph-gamot-stock", topic: ["gamot", "medicine", "meds", "botika", "pharmacy"], intent: ["stock", "availability", "available", "out of stock"] },
  { entryId: "ph-record-correction", topic: ["philhealth", "member record", "dependent details"], intent: ["wrong name", "maling pangalan", "correct", "correction", "itama", "i correct"] },
  { entryId: "ph-benefit-charge", topic: ["yakap", "gamot", "philhealth"], intent: ["charged", "charge", "siningil", "bayad", "payment", "free", "libre", "libreng"] },
  { entryId: "ph-clinic-no-internet", topic: ["yakap"], intent: ["offline", "no internet", "walang internet", "no phone", "walang cellphone", "signal"] },
  { entryId: "ph-clinic-transfer", topic: ["yakap"], intent: ["transfer", "change", "different", "lipat", "palit", "switch", "reselect"] },
  { entryId: "ph-dependent-selection", topic: ["dependent"], intent: ["clinic", "klinika", "empanelment", "selection", "select", "pili", "verify"], exclude: ["include", "included", "kasali", "kasama"] },
  { entryId: "ph-pin-unknown", topic: ["pin", "philhealth number", "member number"], intent: ["forgot", "lost", "unknown", "maalala", "mahanap", "reapply"] },
  { entryId: "ph-gamot-facility", topic: ["gamot", "botika", "pharmacy"], intent: ["facility", "provider", "where", "saan", "find", "accredited", "participating", "dispensing"], exclude: ["stock", "dose", "dosis"] },
  { entryId: "ph-gamot-get", topic: ["gamot"], intent: ["reseta", "prescription", "dispense", "dispensing", "pagkuha", "kumuha", "obtain"], exclude: ["dose", "dosis", "stock"] },
  { entryId: "ph-clinic-select", topic: ["yakap", "clinic", "klinika"], intent: ["egovph", "member portal", "select", "selection", "choose", "pipili", "register"], exclude: ["list", "listahan", "find", "hanap"] },
];

function hasPhrase(normalized: string, phrase: string): boolean {
  return ` ${normalized} `.includes(` ${phrase} `);
}

export function gabayIntentEntry(normalized: string, entries: ChatEntryCandidate[]): ChatEntryCandidate | null {
  const byId = new Map(entries.filter((entry) => entry.content_id).map((entry) => [entry.content_id, entry]));
  for (const rule of rules) {
    const target = byId.get(rule.entryId);
    if (!target) continue;
    if (rule.exclude?.some((phrase) => hasPhrase(normalized, phrase))) continue;
    if (rule.topic.some((phrase) => hasPhrase(normalized, phrase)) && rule.intent.some((phrase) => hasPhrase(normalized, phrase))) {
      return target;
    }
  }
  return null;
}
