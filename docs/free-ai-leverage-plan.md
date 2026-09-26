# BHW Connect Phase 2 — Free AI Leverage Plan

## Purpose & Ground Rules

The requirements doc bars *paid* AI API costs; it does not bar AI. This plan scopes where genuinely free AI adds real feature value across the build phases, under three hard rules:

1. **Zero cost, structurally.** Only providers that are free at our volumes — either self-hosted (no metering at all) or free tiers with published caps. Nothing that silently converts to billing.
2. **The rule-based baseline always works.** Every AI enhancement is an *upgrade layered on* the `delivery-plan.md` baseline (FTS + trigram matching, manual translation, human moderation). If every AI provider vanished tomorrow, the app still functions fully.
3. **Auto shut-off at cap.** Every external AI call goes through a budget guard (§2) that counts usage against daily/weekly ceilings and trips a circuit breaker *before* a cap is hit — degrading silently to the baseline, never erroring at the user.

A fourth rule falls out of DPA compliance, and it shapes the whole design: **no personal or user-generated data ever reaches an external AI provider — guaranteed by architecture, not by policy.** Free LLM tiers typically license the provider to train on submitted data (explicitly the case for Google AI Studio's free tier), and chat questions from BHWs can contain patient details. Scrubbing personal data *out* of arbitrary text is a blocklist approach and blocklists miss things — so the design inverts it into an **allowlist**: only data that is *structurally incapable* of containing unreviewed personal information may leave our infrastructure. Every payload in the system carries one of five classifications, and the provider adapter enforces which classifications each tier may receive (§2):

| Classification | Examples | Tier A (self-hosted) | Tier B (external) |
|---|---|---|---|
| `public_content` | Published KB entries, categories | ✅ | ✅ |
| `admin_authored` | Draft KB text, announcement drafts | ✅ | ✅ |
| `admin_cleared` | An unmatched question an admin has read, redacted if needed, and explicitly marked safe | ✅ | ✅ |
| `user_generated` | Chat questions, survey answers, forum posts | ✅ | ❌ rejected |
| `personal` | Profiles, credentials, audit rows | ❌ never touches AI | ❌ rejected |

- **Tier A — self-hosted AI (data never leaves our infrastructure)**: the *only* tier permitted to process user-generated text; runs on our own CPU, so nothing is shared with anyone.
- **Tier B — external free-tier AI**: receives admin-authored or admin-cleared content only. The human clearance step *is* the safeguard: an admin reading and forwarding a question converts it from `user_generated` to `admin_cleared` — the same judgment they'd apply before pasting it into any external tool.

## 1. Provider Shortlist (limits verified 2026-07-18)

| Provider / capability | Free allowance | Tier | Fit |
|---|---|---|---|
| **Self-hosted embeddings** — `multilingual-e5-small` (384-dim, ~100 languages via XLM-R lineage) run through ONNX runtime in our Node process | Unlimited — it's our CPU | A | **The headline win**: semantic search for the Chat Guide with no cap, no cost, no data egress. Tagalog/Taglish coverage must be *proven* by our fixture corpus, not assumed (§3.1) |
| Supabase Edge Functions built-in inference (`gte-small`) | Included in Supabase plan, charged only as CPU | A | Fallback embedding path; `gte-small` is English-centric, so only if e5 self-hosting stalls |
| **Groq** (`llama-3.1-8b-instant`) | 14,400 req/day, 500k tokens/day, 30 RPM | B | Primary external LLM: biggest daily allowance, fast; good for query rewrite, synonym suggestion, translation drafts |
| **Google Gemini** (Flash / Flash-Lite) | ~1,500 req/day Flash-class, 10–15 RPM | B | Secondary LLM; strongest Filipino quality; free-tier data may be used for training → Tier B rules strictly |
| **OpenRouter** `:free` models | 50 req/day (1,000/day after a one-time $10 credit purchase) | B | Tertiary fallback + model variety; the one-time $10 is optional and permanent |
| **Cloudflare Workers AI** (incl. multilingual `bge-m3` embeddings) | 10,000 neurons/day, resets 00:00 UTC | B | Alternative embeddings/LLM if we ever want them off-box; capped, so not the primary |
| **OpenAI Moderation API** (`omni-moderation-latest`) | Free for all API users, text+image, multilingual (improved but weaker on low-resource languages) | B | Forum/announcement moderation assist in later phases |
| **Web Speech API** (browser `speechSynthesis`) | Free, on-device | A | Text-to-speech for the accessibility roadmap; Filipino voice availability varies by device — feature-detect, never promise |
| Mistral La Plateforme "Experiment" tier | ~1B tokens/mo but **evaluation-only terms** | — | **Rejected for production** — ToS risk. Fine for internal prompt experiments only |

Ordering logic for external LLM calls: **Groq → Gemini → OpenRouter → off**. The provider adapter (§2) makes them swappable; free tiers change without notice, and rule 2 means that's survivable.

## 2. The AI Budget Guard (build once, in INC-4)

A small server-side module every external AI call must pass through. No direct provider calls from feature code.

- **`ai_usage` table**: `provider`, `feature`, `window_start` (day + ISO week), `request_count`, `token_count`. Incremented atomically per call.
- **Configured ceilings** per provider at **80% of the published free limit** (headroom for drift and retries), for both daily and weekly windows — e.g., Groq 11,500/day; Gemini 1,200/day. Ceilings live in config, admin-visible.
- **Circuit breaker**: a call is attempted only if under all ceilings; a `429`, quota error, or 5 consecutive failures trips the breaker for that provider until the window resets (or a 30-min cooldown for error trips). Tripping is an `audit_event` (`ai.provider_paused`) and shows on the admin dashboard.
- **Waterfall**: when a provider is tripped, the guard tries the next provider *if the feature allows it*, else returns "unavailable" and the feature silently uses its baseline.
- **Data classification gate** (the core safeguard): the adapter accepts only *typed payloads*, each tagged with a classification from §Ground Rules. Tier B calls with `user_generated` or `personal` payloads are **rejected at runtime** — there is no code path that sends them, and a CI test asserts the rejection. A lint rule bans network calls to AI provider domains anywhere outside the adapter, so the gate cannot be bypassed by feature code. Every Tier B call writes an `ai.external_call` audit event recording provider, feature, classification, and a content hash — DPA accountability is demonstrable, not asserted.
- **Redaction pass** (defense-in-depth, not the primary control): even `admin_cleared` text gets a regex + users-table dictionary sweep for names, phone numbers, and addresses before leaving — a second net under the human judgment, never a substitute for it.
- **Feature flags** (reuses INC-9's flags table), all defaulting as shown: `ai.semantic_search` (on — Tier A), `ai.translation_draft` (on — Tier B, `admin_authored`), `ai.synonym_suggest` (on — Tier B, `admin_cleared` only), `ai.gap_summary` (on — Tier B, `admin_cleared` only), `ai.moderation_assist` (off until forum phase; see §3.5), `ai.tts` (on where voices exist — Tier A, on-device). Any flag is an instant kill switch, per the requirements doc's toggle model.
- **Privacy notice** (delivery plan §5.4) gains a clause stating plainly: personal information and BHW-typed text are never shared with external AI services; external AI processes only admin-authored or admin-reviewed content.
- **Response cache**: keyed on normalized input per feature — repeated questions and re-translations cost zero quota. With a few dozen pilot BHWs asking overlapping questions, cache hit-rate compounds the free allowance substantially.

**Owner-approved exception: offline narration rendering (25 September 2026; extended 26 September 2026).** The Gemini text-to-speech provider (`scripts/lib/tts-providers/gemini.mjs`) calls the Gemini API directly. It does not go through the adapter, writes no `ai.external_call` audit event, and does not count against `ai_usage`. The owner approved this on 25 Sep 2026, under these conditions:

- It runs only from authoring scripts (`training:narrate`, and legacy `training:tts`) on a developer machine or session. It is never part of `src/` or any request path.
- It sends only published, `admin_authored` lesson text. That means no learner data, no names beyond the fictional characters in the lessons, and nothing `user_generated` or `personal`.
- The lint exception stays scoped to that one provider file.
- Bulk runs stay under the 1,200/day Gemini ceiling above. Re-runs resume, so a render may take several days.

**Extension (26 September 2026):** the owner extended this exception to also cover `scripts/remotion-narrate.mjs`, synthesizing the new narration script authored for the Chapter 2.3 handrub Remotion clip (`remotion/src/hand-hygiene/narration.ts`; see `docs/handrub-clip-enhancement-handoff.md` §3). Same conditions apply: authoring-script-only, `admin_authored` clip narration text, no learner data, well under the 1,200/day ceiling (about 20 requests per language for this clip).

Anything else that wants to call Gemini still goes through the adapter.

## 3. Phase-by-Phase AI Leverage

**Phase 1 at a glance — yes, AI ships in the initial phase.** Five integrations, none of which ever sees personal or unreviewed user data:

| # | AI feature | Engine | Data it sees | Increment |
|---|---|---|---|---|
| 1 | Semantic Chat Guide retrieval (the headline) | `multilingual-e5-small`, self-hosted | Published KB content + the BHW's question, embedded **on our own CPU** — nothing leaves | INC-4 |
| 2 | KB translation drafts (Fil↔En, human-gated) | Groq/Gemini free tier | Admin-authored draft text only | INC-3 |
| 3 | Synonym suggestions from the gap queue | Groq/Gemini free tier | Only questions an admin read, redacted, and explicitly sent | INC-6 |
| 4 | Weekly gap digest | Tier A clustering + one weekly LLM call | Aggregate cluster shapes; no raw user text | INC-6 |
| 5 | Read-aloud (TTS) | Browser `speechSynthesis`, on-device | Nothing leaves the device | INC-7 |

### 3.1 Phase 1 — Chat Guide (INC-4/INC-5): hybrid semantic retrieval

**(a) Semantic search upgrade — Tier A, always-on, uncapped.** The single highest-value AI addition in the whole plan. Embed every published KB entry's bilingual question+keywords with self-hosted `multilingual-e5-small` into a pgvector column; embed the (normalized) incoming question at ask time on our own CPU. Retrieval score becomes:

`0.35 × FTS rank + 0.20 × trigram + 0.15 × keyword overlap + 0.30 × cosine similarity`

with the existing thresholds re-tuned against the fixture corpus. This is what catches paraphrases the rule-based layer can't — *"anong gagawin pag mataas lagnat ng baby"* matching an entry phrased as *"fever management for infants"* — because multilingual embeddings map Filipino, English, and Taglish into one vector space. Embedding latency for one query on CPU is tens of milliseconds at 384 dims: fine.

Acceptance gate: the 60-fixture corpus (delivery plan §6.1) must score **≥ 90% with hybrid on, and strictly better than the rule-based-only score**. If e5's Tagalog handling underwhelms, fall back to Cloudflare's `bge-m3` (capped) or ship rule-based-only — the corpus decides, not hope.

**(b) External query rewrite — dropped by design.** An earlier draft sent borderline user questions to an external LLM for cleanup. That is the one Phase 1 idea that required user-typed text to leave our infrastructure, so it's cut: it violates the allowlist guarantee, and Tier A embeddings already do the same job — vector similarity is inherently tolerant of typos, spelling variants, and Taglish phrasing, which is precisely what the rewrite was for. Borderline scores keep the existing "did-you-mean" UX. Revisit only if a self-hostable small LLM (Tier A) ever becomes practical on our infrastructure.

**(c) Synonym mining from the gap queue — Tier B, `admin_cleared` only.** Unmatched questions are user-typed, so they never go to an external LLM automatically. Instead, the triage queue (INC-6) gets a **"Get AI suggestions"** action: the admin reads a question, redacts anything sensitive inline if needed, and explicitly sends it — that clearance step reclassifies it, and the LLM returns suggested `synonyms` rows and candidate KB entries for the admin to approve or discard. The synonym table — the matcher's Taglish brain — still grows from real usage, with a human eye on every string that leaves the system.

**Built in INC-18b, with one deliberate substitution.** The clearance control shipped as specified — the gap queue expands inline into an editable textarea, and what leaves the system is the admin's edit, never `unmatched_questions.text`. What comes back is **a complete bilingual draft KB entry** rather than suggested `synonyms` rows. The reason is the flywheel: a synonym widens the net for questions the KB can already answer, whereas a published entry answers a question it previously could not, so the second is the one that makes external AI need itself less over time. Synonym mining is not dropped — it is a second `AiFeature` on the same adapter, prompt and clearance step, and needs no new scaffolding.

**§3.2's human gate, generalised.** The "AI draft — review required" gate below was specified for translation drafts; INC-18b implements it for entry drafts, and implements it **in the database** — `rpc_kb_entry_update` refuses to publish a row whose `ai_drafted_at` is set and `ai_draft_confirmed_at` is null, so a direct PostgREST call fails exactly as the form does. When translation drafts arrive they inherit the same two columns and the same refusal; the confirmation audit event (`kb.ai_draft_confirmed`) already exists.

### 3.2 Phase 1 — KB authoring (INC-3): translation drafts — Tier B, admin-side

The bilingual content model requires every entry in Filipino *and* English — double authoring work, and the #1 risk in the register is content authoring throughput. Add a **"Draft translation"** button on the entry/article forms: sends the source-language text (admin-authored, no patient PII) to Groq/Gemini, fills the other language field marked **"AI draft — review required"**, and the entry cannot be published until a human edits-or-confirms the draft (audit event records confirmation). Cuts authoring effort toward half; the human gate keeps health-content accuracy owned by people.

### 3.3 Phase 1 — Dashboard (INC-6): weekly gap digest — clustering in Tier A, wording in Tier B

Two stages so no raw user text leaves. **Stage 1 (Tier A, automatic)**: cluster the open unmatched questions by their self-hosted embeddings — grouping happens entirely on our infrastructure and yields cluster sizes plus each cluster's nearest matching KB topics. **Stage 2 (Tier B, optional)**: one weekly LLM call turns *only the aggregate shape* — cluster counts, topic labels, and any `admin_cleared` representative questions — into a plain-language bilingual digest ("14 questions this week clustered around infant fever; 6 around vaccination schedules — no published entries cover the second"). If Stage 2 is off or capped, Stage 1's clusters still render as a table. Cost: ~4 external calls/month, zero user-typed text among them.

### 3.4 Phase 1 — Settings/accessibility (INC-7): on-device TTS — Tier A

"Read aloud" button on Chat Guide answers and KB articles via the browser's `speechSynthesis` — free, on-device, no quota, and it directly serves the screen-reader/TTS item resolved into the requirements doc. Feature-detect voices per device: show the button only when a usable `fil`/`en` voice exists (Filipino voice coverage varies by OS; Chrome on Android is the best case, which is also our primary device). No server cost ever.

### 3.5 Later phases

- **E-learning (quiz authoring)** — Tier B, admin-side: draft quiz questions from a topic's KB/article content for the course builder; assessor/admin reviews before publish. Low volume, high authoring leverage.
- **Survey tool (open-text analysis)** — same two-stage pattern as the gap digest: responses are `user_generated`, so clustering runs on Tier A embeddings in-house; external summarization only ever sees aggregate cluster shapes or `admin_cleared` excerpts.
- **Forum & announcements (moderation assist)** — the one candidate that inherently needs user posts as input, so under the allowlist it **cannot ship silently**: it stays off until a deliberate decision at the forum phase. Two compliant paths exist when that decision comes: (a) a self-hosted multilingual toxicity classifier via ONNX (Tier A — preferred, same pattern as embeddings), or (b) OpenAI omni-moderation (free; and unlike Google's free tier, OpenAI's API terms don't use API data for training by default) with the exception disclosed explicitly in the privacy notice. Either way it only *flags* for the human moderator — post-first/moderate-after stays human-decided.
- **Flip-chart builder** — Tier B, admin-side: draft BHW-facing talking-points from the client-facing material (Designer reviews; Admin approval gate already exists).
- **Profiling-system integration** — no AI role.
- **Offline phase (future)**: embeddings via transformers.js can run *in the browser*, keeping semantic search available offline — noted as a design option, not scoped.

## 4. Delivery Impact on the Increment Roadmap

- **INC-3**: + translation-draft button with review gate (~small; provider adapter stubbed if INC-4 not yet built, flag off).
- **INC-4**: + budget guard module, provider adapter with the data classification gate (typed payloads, runtime rejection, CI rejection test, lint rule), redaction pass, embedding pipeline + pgvector column, hybrid scoring, corpus re-tune. This is the increment that grows most; if it stops fitting one session, split into **INC-4a** (rule-based engine + guard/gate scaffold, as originally scoped) and **INC-4b** (embeddings + hybrid scoring) — 4b is independently shippable and independently reversible via `ai.semantic_search`.
- **INC-6**: + Tier A gap clustering, weekly digest job, the "Get AI suggestions" clearance action on the triage queue, and an AI-usage/breaker status panel on the admin dashboard.
- **INC-7**: + TTS read-aloud with voice feature-detection.
- **INC-9**: flags for all `ai.*` features already covered by the flags table; add the privacy-notice clause and the provider-outage entry to the runbook.

## 5. Risks

| Risk | Mitigation |
|---|---|
| Free tiers shrink or disappear (they do, without notice) | Rule 2: baseline always works; provider waterfall; ceilings at 80% of published limits re-verified quarterly |
| Free-tier data used for provider training → DPA exposure | Allowlist architecture: `user_generated`/`personal` payloads rejected by the adapter itself (CI-tested, lint-enforced); human clearance gate for anything user-typed; redaction pass as second net; per-call audit trail; privacy notice states the guarantee plainly |
| e5 embedding quality on Taglish disappoints | Fixture corpus is the gate (≥90% and strictly better than baseline); `bge-m3` fallback; ship without if it fails |
| LLM hallucination in health content | No LLM-generated text reaches a BHW unreviewed: translation/quiz/talking-point drafts are human-gated; rewrite only *re-queries the KB*, never answers directly |
| Quota exhaustion mid-day degrades UX | Breaker trips at 80% ceiling *before* provider 429s; degradation is silent (baseline answer, no error); admin panel shows breaker state |
| Filipino TTS voices missing on some devices | Feature-detect; button hidden, never broken |

## Sources (limits as verified 2026-07-18)

- Gemini free-tier rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Groq free-tier limits: https://tokenmix.ai/blog/groq-free-tier-limits-2026 ; https://pricepertoken.com/endpoints/groq/free
- OpenRouter free-model limits: https://openrouter.ai/docs/api_reference/limits
- Cloudflare Workers AI pricing/free allocation: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Supabase Edge Function inference: https://supabase.com/blog/ai-inference-now-available-in-supabase-edge-functions ; https://supabase.com/docs/guides/ai/quickstarts/generate-text-embeddings
- OpenAI moderation (free, multimodal): https://developers.openai.com/api/docs/guides/moderation ; https://openai.com/index/upgrading-the-moderation-api-with-our-new-multimodal-moderation-model/
- multilingual-e5-small model card / technical report: https://huggingface.co/intfloat/multilingual-e5-small ; https://arxiv.org/abs/2402.05672
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- Mistral tiers (evaluation-only free tier): https://docs.mistral.ai/admin/user-management-finops/tier
