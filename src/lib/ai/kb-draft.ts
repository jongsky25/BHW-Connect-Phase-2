// The prompt, response schema and validator for drafting a KB entry from a
// gap question an admin has cleared.
//
// This is the repo's first structured-output feature, so the shape is worth
// stating plainly: the provider is asked for JSON matching KB_DRAFT_SCHEMA,
// and whatever comes back is still treated as untrusted and validated here.
// Provider-side schema enforcement is a convenience, not a guarantee.

export type KbDraft = {
  question_fil: string;
  question_en: string;
  answer_fil: string;
  answer_en: string;
  keywords: string[];
};

export type KbDraftParseResult =
  | { ok: true; draft: KbDraft }
  | { ok: false; problems: string[] };

// Matches the versioned content files' own bar (scripts/lib/kb-content.mjs).
// Keywords are the matcher's main lever, so a draft that skimps on them is
// worse than useless: it will not be retrieved, and it can dilute matching for
// neighbouring entries. This is the one rule the model does not get to shortcut.
export const MIN_KEYWORDS = 4;

const MIN_ANSWER_LENGTH = 40;

export const KB_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    question_fil: { type: "string" },
    question_en: { type: "string" },
    answer_fil: { type: "string" },
    answer_en: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
  },
  required: ["question_fil", "question_en", "answer_fil", "answer_en", "keywords"],
} as const;

/**
 * The instruction sent alongside the cleared question.
 *
 * Two constraints are load-bearing and deliberately repeated in the prompt
 * even though they are also enforced in code: scope (a BHW screens, a
 * physician diagnoses) and the keyword count. The scope line matters because
 * an LLM asked "how do I treat high blood pressure" will happily answer with
 * dosing advice, which is outside a BHW's scope of practice and is exactly
 * what the Chat Guide's scope-boundary entries exist to refuse.
 */
export function buildKbDraftPrompt(clearedQuestion: string, contextEntries: string[]): string {
  const context =
    contextEntries.length > 0
      ? `\n\nExisting related entries, for tone and consistency:\n${contextEntries.map((entry) => `- ${entry}`).join("\n")}`
      : "";

  return `You are drafting a knowledge base entry for Barangay Health Workers (BHWs) in the Philippines, for review by a health administrator before publication.

A BHW asked this and the knowledge base had no answer:
"${clearedQuestion}"

Draft one entry answering it, as JSON.

Requirements:
- Write the question and answer in BOTH Filipino and English. The Filipino must read naturally to a Filipino BHW, not as a literal translation.
- Stay strictly within BHW scope of practice. A BHW screens, educates, refers, and follows up. A BHW does NOT diagnose, prescribe, start or adjust any medicine, or interpret laboratory results, ECGs or imaging. If the question asks for something outside that scope, the answer must say plainly that the decision belongs to the physician and describe what the BHW should do instead.
- Never state a specific drug dose.
- Give at least ${MIN_KEYWORDS} keywords, mixing Filipino and English terms and including the words a BHW would actually type, misspellings and Taglish included.
- Keep the answer practical and concrete: what to do, in what order.
- Do not invent statistics, thresholds or guideline figures. If a specific number would be needed, say that it must be taken from the current DOH/PhilPEN protocol instead of giving one.${context}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate untrusted model output.
 *
 * Follows the repo's two existing patterns: `is`-predicates over `unknown`
 * (src/lib/settings/types.ts) and collect-problems-then-fail
 * (scripts/lib/kb-content.mjs). Deliberately NOT the parse-with-defaults shape
 * used for a11y settings — a missing answer there is a cosmetic fallback, a
 * missing answer here would be an empty KB entry shown to a health worker.
 */
export function parseKbDraft(raw: unknown): KbDraftParseResult {
  const problems: string[] = [];

  if (typeof raw !== "object" || raw === null) {
    return { ok: false, problems: ["draft is not an object"] };
  }

  const value = raw as Record<string, unknown>;

  for (const field of ["question_fil", "question_en", "answer_fil", "answer_en"] as const) {
    if (!isNonEmptyString(value[field])) problems.push(`${field} is missing or empty`);
  }

  for (const field of ["answer_fil", "answer_en"] as const) {
    if (isNonEmptyString(value[field]) && value[field].trim().length < MIN_ANSWER_LENGTH) {
      problems.push(`${field} is too short to be a usable answer`);
    }
  }

  const keywords = Array.isArray(value.keywords)
    ? value.keywords.filter(isNonEmptyString).map((keyword) => keyword.trim())
    : [];

  if (keywords.length < MIN_KEYWORDS) {
    problems.push(`needs at least ${MIN_KEYWORDS} keywords, got ${keywords.length}`);
  }

  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    draft: {
      question_fil: (value.question_fil as string).trim(),
      question_en: (value.question_en as string).trim(),
      answer_fil: (value.answer_fil as string).trim(),
      answer_en: (value.answer_en as string).trim(),
      keywords,
    },
  };
}

/** Parses the provider's raw text as JSON, then validates it. */
export function parseKbDraftResponse(text: string): KbDraftParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, problems: ["provider did not return valid JSON"] };
  }
  return parseKbDraft(raw);
}
