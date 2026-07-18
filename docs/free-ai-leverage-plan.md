# BHW Connect Phase 2 — Free AI Leverage Plan

## Purpose & Ground Rules

The requirements doc bars *paid* AI API costs; it does not bar AI. This plan scopes where genuinely free AI adds real feature value across the build phases, under three hard rules:

1. **Zero cost, structurally.** Only providers that are free at our volumes — either self-hosted (no metering at all) or free tiers with published caps. Nothing that silently converts to billing.
2. **The rule-based baseline always works.** Every AI enhancement is an *upgrade layered on* the `delivery-plan.md` baseline (FTS + trigram matching, manual translation, human moderation). If every AI provider vanished tomorrow, the app still functions fully.
3. **Auto shut-off at cap.** Every external AI call goes through a budget guard (§2) that counts usage against daily/weekly ceilings and trips a circuit breaker *before* a cap is hit — degrading silently to the baseline, never erroring at the user.

A fourth rule falls out of DPA compliance, and it shapes the whole design: **free LLM tiers typically license the provider to train on submitted data** (explicitly the case for Google AI Studio's free tier). Chat questions from BHWs can contain patient details. Therefore:

- **Tier A — self-hosted AI (data never leaves our infrastructure)**: allowed on the user-facing hot path.
- **Tier B — external free-tier AI**: admin-side features by default (translation drafts, summaries, synonym suggestions — reviewed by a human before anything reaches a BHW); any user-facing use requires the PII scrubber (§2) *and* its own feature flag, off by default.

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
- **Feature flags** (reuses INC-9's flags table), all defaulting as shown: `ai.semantic_search` (on — Tier A), `ai.query_rewrite` (off), `ai.translation_draft` (on, admin-side), `ai.synonym_suggest` (on, admin-side), `ai.gap_summary` (on, admin-side), `ai.moderation_assist` (off until forum phase), `ai.tts` (on where voices exist). Any flag is an instant kill switch, per the requirements doc's toggle model.
- **PII scrubber**: regex + dictionary pass stripping names (from the users table), phone numbers, and addresses from any text bound for a Tier B provider; mandatory on any user-originated text. Privacy notice (delivery plan §5.4) gains a clause covering external AI processing of scrubbed text.
- **Response cache**: keyed on normalized input per feature — repeated questions and re-translations cost zero quota. With a few dozen pilot BHWs asking overlapping questions, cache hit-rate compounds the free allowance substantially.

## 3. Phase-by-Phase AI Leverage

### 3.1 Phase 1 — Chat Guide (INC-4/INC-5): hybrid semantic retrieval + optional rewrite

**(a) Semantic search upgrade — Tier A, always-on, uncapped.** The single highest-value AI addition in the whole plan. Embed every published KB entry's bilingual question+keywords with self-hosted `multilingual-e5-small` into a pgvector column; embed the (normalized) incoming question at ask time on our own CPU. Retrieval score becomes:

`0.35 × FTS rank + 0.20 × trigram + 0.15 × keyword overlap + 0.30 × cosine similarity`

with the existing thresholds re-tuned against the fixture corpus. This is what catches paraphrases the rule-based layer can't — *"anong gagawin pag mataas lagnat ng baby"* matching an entry phrased as *"fever management for infants"* — because multilingual embeddings map Filipino, English, and Taglish into one vector space. Embedding latency for one query on CPU is tens of milliseconds at 384 dims: fine.

Acceptance gate: the 60-fixture corpus (delivery plan §6.1) must score **≥ 90% with hybrid on, and strictly better than the rule-based-only score**. If e5's Tagalog handling underwhelms, fall back to Cloudflare's `bge-m3` (capped) or ship rule-based-only — the corpus decides, not hope.

**(b) Gray-zone query rewrite — Tier B, flagged off by default.** Only when the hybrid score lands in the "did-you-mean" band (0.35–0.55): send the *scrubbed* question to Groq with a constrained prompt ("normalize this Taglish/misspelled health question; return only the cleaned question"), re-run retrieval on the rewrite. Adds one LLM call only for borderline queries — at pilot scale (≈40 BHWs × ~10 questions/day, of which maybe 20% are borderline ≈ 80 calls/day) this is <1% of Groq's daily allowance. Enable during the pilot only after (a) has a baseline to compare against.

**(c) Synonym mining from the gap queue — Tier B, admin-side.** A daily batch job (one LLM call, batched) reads new `unmatched_questions` and *suggests* `synonyms` rows and candidate KB entries; an admin approves or discards. The synonym table — the matcher's Taglish brain — grows from real usage without an admin hand-writing every mapping.

### 3.2 Phase 1 — KB authoring (INC-3): translation drafts — Tier B, admin-side

The bilingual content model requires every entry in Filipino *and* English — double authoring work, and the #1 risk in the register is content authoring throughput. Add a **"Draft translation"** button on the entry/article forms: sends the source-language text (admin-authored, no patient PII) to Groq/Gemini, fills the other language field marked **"AI draft — review required"**, and the entry cannot be published until a human edits-or-confirms the draft (audit event records confirmation). Cuts authoring effort toward half; the human gate keeps health-content accuracy owned by people.

### 3.3 Phase 1 — Dashboard (INC-6): weekly gap digest — Tier B, admin-side

One scheduled LLM call per week: cluster the open unmatched questions and produce a plain-language digest in both languages ("14 questions this week were about infant fever; 6 about vaccination schedules — no published entries cover the second"). Rendered atop the triage queue. Cost: ~4 calls/month. Value: turns a raw queue into a content strategy.

### 3.4 Phase 1 — Settings/accessibility (INC-7): on-device TTS — Tier A

"Read aloud" button on Chat Guide answers and KB articles via the browser's `speechSynthesis` — free, on-device, no quota, and it directly serves the screen-reader/TTS item resolved into the requirements doc. Feature-detect voices per device: show the button only when a usable `fil`/`en` voice exists (Filipino voice coverage varies by OS; Chrome on Android is the best case, which is also our primary device). No server cost ever.

### 3.5 Later phases

- **E-learning (quiz authoring)** — Tier B, admin-side: draft quiz questions from a topic's KB/article content for the course builder; assessor/admin reviews before publish. Low volume, high authoring leverage.
- **Survey tool (open-text analysis)** — Tier B, admin-side batch: summarize/cluster open-text survey responses per survey close; anonymous-mode responses are already PII-light, scrubber still applies.
- **Forum & announcements (moderation assist)** — OpenAI omni-moderation (free, multilingual) scores each new post; flagged posts surface in a moderator review queue. This *assists* the requirements doc's post-first/moderate-after model — it never auto-deletes, and its weaker performance on low-resource languages is why the human moderator stays the decision-maker.
- **Flip-chart builder** — Tier B, admin-side: draft BHW-facing talking-points from the client-facing material (Designer reviews; Admin approval gate already exists).
- **Profiling-system integration** — no AI role.
- **Offline phase (future)**: embeddings via transformers.js can run *in the browser*, keeping semantic search available offline — noted as a design option, not scoped.

## 4. Delivery Impact on the Increment Roadmap

- **INC-3**: + translation-draft button with review gate (~small; provider adapter stubbed if INC-4 not yet built, flag off).
- **INC-4**: + budget guard module, provider adapter, PII scrubber, embedding pipeline + pgvector column, hybrid scoring, corpus re-tune. This is the increment that grows most; if it stops fitting one session, split into **INC-4a** (rule-based engine + guard scaffold, as originally scoped) and **INC-4b** (embeddings + hybrid + rewrite) — 4b is independently shippable and independently reversible via `ai.semantic_search`.
- **INC-6**: + weekly gap digest job + AI-usage/breaker status panel on the admin dashboard.
- **INC-7**: + TTS read-aloud with voice feature-detection.
- **INC-9**: flags for all `ai.*` features already covered by the flags table; add the privacy-notice clause and the provider-outage entry to the runbook.

## 5. Risks

| Risk | Mitigation |
|---|---|
| Free tiers shrink or disappear (they do, without notice) | Rule 2: baseline always works; provider waterfall; ceilings at 80% of published limits re-verified quarterly |
| Free-tier data used for provider training → DPA exposure | Tier A/B split; PII scrubber mandatory on Tier B; user-facing Tier B off by default; privacy notice clause |
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
