# BHW Connect Phase 2 — Delivery Plan (Build Contract)

## Purpose

`requirements-and-vision.md` is the frozen record of *what* BHW Connect is and *why* — all of its open items are resolved. This document is the *build contract* layered on top of it: it closes the gaps that made the requirements doc insufficient as a direct build input, folds in proven private-industry practices, commits a tech stack, and breaks Phase 1 into small increments that an implementing agent (Sonnet) can deliver one at a time with high accuracy.

Rule of engagement for the builder: **deliver exactly one increment per session, in order, and do not start the next until the previous one's Definition of Done is verified.** Anything marked *Out of scope* for an increment is deliberately excluded — do not build ahead.

## 1. Gap Analysis — what the requirements doc lacked as a build input

| # | Gap | Resolved where |
|---|-----|----------------|
| G1 | No tech stack, hosting, or architecture decision | §3 |
| G2 | No data model — entities, relationships, or field definitions | §4 |
| G3 | Auth under-specified: password policy, session rules, lockout, account recovery, RBAC enforcement mechanism | §5.1, INC-1 |
| G4 | DPA compliance named but mechanically undefined — no consent flow, retention schedule, breach process, or data-rights procedure | §5.4, INC-1, INC-9 |
| G5 | Chat Guide matching engine entirely unspecified (normalization, scoring, thresholds, synonym management, Taglish handling) | §6, INC-4 |
| G6 | No non-functional budgets: page weight, device/browser matrix, uptime, backup RPO/RTO | §5.2, §5.3 |
| G7 | No i18n implementation approach (string catalogs, content translation model) | §5.5 |
| G8 | No acceptance criteria anywhere — features described but never made testable | Every increment's DoD, §7 |
| G9 | No pilot success metrics — no way to know if the pilot worked | §8 |
| G10 | No increment boundaries — "Phase 1" was a scope, not a sequence | §7 |
| G11 | Audit trail promised ("laymanized audits") but no event taxonomy | §5.6, INC-2 |
| G12 | Account lifecycle undefined: deactivation, barangay transfer, admin succession | §4 (users), INC-2 |
| G13 | KB content operations undefined: who owns an article, when it goes stale, how gaps become content | §6.3, INC-6 |
| G14 | No risk register | §9 |

## 2. Industry Practices Adopted

Practices pulled from private-sector SaaS, support-desk, and LMS operations, mapped to where they land in this plan:

- **Content-gap loop & deflection metrics** (Intercom/Zendesk-style support desks): every unanswered Chat Guide question enters a triage queue; triage closes by creating/linking a KB entry; deflection rate (answered ÷ asked) is a headline pilot KPI. → INC-4, INC-6, §8
- **Knowledge-Centered Service (KCS) content ops**: every KB entry has an owner and a review-due date; stale content is flagged on the admin dashboard; content is created from demand (the gap queue), not speculation. → §6.3, INC-3, INC-6
- **NIST SP 800-63B password guidance**: length over composition rules (min 8 chars, no forced symbols/rotation), common-password blocklist, throttled attempts. Kinder to low-tech-literacy users *and* more secure than legacy complexity rules. → §5.1
- **3-2-1 backups with tested restores**: backups are worthless until a restore is proven; a documented restore drill is part of ops hardening, with explicit RPO/RTO. → §5.3, INC-9
- **Design tokens**: the resolved palette in the requirements doc becomes a single tokens file consumed by every component — no hard-coded hex values in feature code. → INC-0
- **Feature flags with kill switches** (LaunchDarkly practice, self-hosted table): the requirements doc's role/org-unit toggles are implemented as a flags table checked server-side, enabling gradual rollout and instant disable without deploys. → INC-9
- **Product-analytics event taxonomy** (Amplitude/Mixpanel practice): a fixed, versioned list of named events instrumented from day one; an explicit *activation metric* defines when a BHW "gets it." → §8, INC-8
- **Onboarding checklists & teaching empty states** (Appcues-style): first-run checklist for BHWs; every empty screen tells the user what to do next instead of showing nothing. → INC-7
- **Performance budgets for low-end mobile** (e-commerce practice for emerging markets): hard byte/time budgets enforced in CI, because the target device is an older Android phone on a congested PH mobile network. → §5.2
- **Error tracking + structured logging** (Sentry-style): every unhandled error is captured with context; the admin-facing "laymanized audit" is a friendly projection of a structured event log, not a separate system. → §5.6, INC-9

## 3. Architecture & Stack (decided)

- **Frontend**: Next.js (App Router, TypeScript) — responsive web app per the requirements doc; no native app.
- **Backend/data**: Supabase — Postgres, Supabase Auth, Row-Level Security (RLS) as the primary authorization enforcement, Storage for images/attachments.
- **Hosting**: Vercel free tier (frontend) + Supabase free tier (data). Fits the tight-budget constraint.
- **Portability guardrail** (gov-server fallback from the requirements doc): all business logic lives in Postgres + the Next.js app; no proprietary edge functions unless unavoidable. The whole system must remain deployable as "a Node server + a Postgres database" on a government machine.
- **Chat Guide NLP**: baseline entirely in Postgres — full-text search + `pg_trgm` trigram similarity + an app-side normalization/synonym layer. No *paid* AI APIs (hard requirement); genuinely free AI (self-hosted embeddings, capped free tiers with auto shut-off) may be layered on top per `free-ai-leverage-plan.md` — the rule-based baseline must always work standalone.
- **Testing**: Vitest (unit), Playwright (E2E, Chromium). The Chat Guide matcher gets a fixture-based test corpus including Taglish and misspellings.
- **CI**: GitHub Actions — lint, typecheck, unit tests, E2E smoke, and the performance-budget check on every PR.

## 4. Data Model (Phase 1 entities)

All tables get `id uuid pk`, `created_at`, `updated_at`. RLS on every table; org scoping via `org_unit_id` and the hierarchy path.

- **org_units** — `name`, `level` (national│regional│provincial│city_municipal│barangay), `parent_id` (self-ref), `path` (materialized ltree-style path for scope queries).
- **users** (app profile over Supabase Auth) — `auth_user_id`, `username` (unique; auth email is synthesized internally as `<username>@bhw.local` since login is username+password), `full_name`, `contact_number`, `email` (optional, real), `address`, `role` (bhw│admin — Phase 1 only), `org_unit_id`, `status` (invited│active│deactivated), `must_change_password`, `consented_at` (DPA consent timestamp), `language` (fil│en), `a11y_settings jsonb` (theme, font scale, contrast).
- **kb_categories** — `name_fil`, `name_en`, `slug`, `sort_order`. Seeded with Maternal & Child Health; the other six committed topics get created as they roll out.
- **kb_entries** (Q&A, chat-matchable) — `category_id`, `question_fil`, `question_en`, `answer_fil`, `answer_en`, `keywords text[]`, `image_url`, `status` (draft│published), `owner_user_id` (KCS), `review_due_on` (KCS), `search_vector tsvector` (generated).
- **kb_articles** (long-form) — `category_id`, `title_*`, `body_*` (rich JSON), `status`, `owner_user_id`, `review_due_on`.
- **synonyms** — `term`, `maps_to`, `language` (fil│en│taglish). The Taglish/typo dictionary the matcher expands against; admin-editable.
- **chat_sessions** / **chat_messages** — session per conversation; message has `sender` (user│system), `text`, `matched_entry_id nullable`, `match_score`, `feedback` (up│down│null).
- **unmatched_questions** — `text`, `normalized_text`, `asked_count` (deduped by normalized text), `status` (open│resolved│dismissed), `resolved_entry_id`. The content-gap triage queue.
- **audit_events** — `actor_user_id`, `event_type` (from the taxonomy, §5.6), `subject_type`, `subject_id`, `metadata jsonb`, `plain_summary` (the pre-rendered "laymanized" sentence).
- **analytics_events** — `user_id nullable`, `event_name` (from the taxonomy, §8), `properties jsonb`. Simple Postgres table now; warehouse later if scale demands.
- **feature_flags** — `key`, `enabled`, `role_filter`, `org_unit_filter`.

Account lifecycle (closes G12): deactivation is a status change, never a row delete (audit integrity); barangay transfer = `org_unit_id` change, audit-logged; every barangay must have ≥1 active admin — the console blocks deactivating the last one.

## 5. Non-Functional Requirements (budgets, not aspirations)

### 5.1 Security
- Passwords: min 8 chars, no composition rules, top-10k common-password blocklist, no forced rotation (NIST 800-63B).
- Login throttling: 5 failed attempts → 15-minute lockout, audit-logged.
- Account recovery: admin-initiated reset (temp password + forced change on next login) — no email dependency for BHWs.
- Sessions: 8-hour idle timeout (a BHW's working day), refresh on activity.
- Authorization: RLS is the enforcement layer; UI checks are convenience only. Every table's policy is scoped by role + org-unit path.
- Rate limiting on the chat endpoint and auth endpoints.

### 5.2 Performance (enforced in CI)
- Initial JS ≤ 200 KB gzipped; any route's total first-load ≤ 300 KB.
- Interactive ≤ 5 s on a throttled "low-end mobile / Fast 3G" Lighthouse profile; Lighthouse performance score ≥ 80 on Chat Guide and Login routes.
- Images served via optimized pipeline (WebP/AVIF, explicit dimensions).
- Browser matrix: Chrome on Android (last 2 major), Safari iOS (last 2), Edge/Chrome desktop. No IE, no legacy polyfills.

### 5.3 Reliability & backups
- Backups: daily, 30-day rolling retention (per requirements doc) — Supabase scheduled backups plus a weekly `pg_dump` exported to a second location (3-2-1: second copy, different medium).
- **RPO 24 h / RTO 4 h**; a written restore drill executed once before pilot launch and quarterly after (INC-9).
- Error tracking (Sentry free tier or equivalent) wired to both frontend and API routes.
- Uptime target for pilot: 99.5% (honest for free-tier infra); revisit at scale-up.

### 5.4 DPA compliance mechanics
- First-login consent screen (Filipino + English) covering: what data is collected, why, retention, and rights; `consented_at` recorded; no consent → no access.
- Privacy notice page linked from every screen footer.
- Data-subject rights: admins can export a user's data (JSON) and deactivate+anonymize on request; both are audit events.
- Retention: chat messages and analytics events auto-purge after 24 months (configurable); audit events retained 5 years.
- Breach playbook documented in INC-9 (NPC notification within 72 h per DPA IRR).

### 5.5 i18n
- UI strings in per-locale catalogs (`fil.json` / `en.json`) via `next-intl` (or equivalent); no hard-coded user-facing strings — enforced by lint rule.
- Content (KB entries/articles) is bilingual at the field level (`*_fil` / `*_en`); the UI shows the user's language and falls back to the other with a "translation pending" tag.
- Language toggle persists to the user profile.

### 5.6 Audit event taxonomy (laymanized)
Fixed Phase 1 list: `user.created`, `user.deactivated`, `user.reactivated`, `user.password_reset`, `user.transferred`, `user.consent_given`, `user.data_exported`, `auth.login`, `auth.login_failed`, `auth.lockout`, `kb.entry_created`, `kb.entry_published`, `kb.entry_updated`, `kb.entry_archived`, `gap.resolved`, `gap.dismissed`, `flag.toggled`, `report.exported`. Each event stores a pre-rendered plain-language sentence in both languages (e.g., *"Si Admin Maria ay nagdagdag ng bagong user na si Juan D."*) — the laymanized audit view is just a filtered list of these sentences. Extended in INC-10 with `announcement.created` / `announcement.deleted`, in INC-11 with `survey.created` / `survey.published` / `survey.closed` / `survey.deleted` (deliberately *not* `survey.responded` — see INC-11's migration header for why response submission stays out of the audit trail), in INC-12 with `course.created` / `course.status_changed` / `course.deleted` / `assessment.claimed` / `assessment.decided`, in INC-13 with `forum.category_created` / `forum.category_deleted` / `forum.thread_created` / `forum.post_created` / `forum.thread_hidden` / `forum.thread_unhidden` / `forum.post_hidden` / `forum.post_unhidden`, and in INC-14 with `flipchart.created` / `flipchart.submitted` / `flipchart.published` / `flipchart.rejected` / `flipchart.deleted`, following the same pattern.

**A note on audit visibility for non-user subjects (fixed)**: while building INC-11, direct testing (JWT impersonation against the e2e Supabase project) turned up a pre-existing gap in `audit_events_admin_read`: its RLS policy only resolved `subject_id` against `users.id`, so any event whose subject was a different entity type — `kb.entry_*`, `flag.toggled`, `gap.*`, `report.exported`, INC-10's `announcement.*`, INC-11's `survey.*` — was silently invisible to admins in the audit viewer, regardless of org scope. Fixed post-merge (not as a drive-by inside any single increment's own migration, for the reasons this note originally gave) by `20260729000000_fix_audit_events_admin_read_subject_scope.sql`: a `public.audit_event_visible_to_admin(subject_type, subject_id)` security-definer helper (same rationale as `org_unit_path()` — a raw `org_units` join inside the policy inherits the querying role's own RLS and silently collapses "at-or-above my scope" to false) dispatches per subject type — org-scoped (`user`, `announcement`, `survey`, and `feature_flag` when it has an `org_unit_filter`) resolves against the admin's org path the same way the original `user` case did; global subjects (`kb_entry`, `kb_article`, `unmatched_question`, `report`, and a `feature_flag` with no filter) are always visible; anything else (a future subject type nobody's added a case for) fails closed. Verified directly against the e2e project: same-scope and ancestor admins see the events, a sibling barangay's admin doesn't, and an unmapped subject type stays invisible rather than guessing at a scope rule. That fix predated INC-12, INC-13, and INC-14, so it carried the same gap forward for their subject types; closed by `20260801000000_fix_audit_events_admin_read_course_forum_flipchart.sql`, which adds `course`/`assessment` (org-scoped like `announcement`/`survey`, via each table's own `org_unit_id`), `forum_category`/`forum_thread`/`forum_post` (always visible — forum content is deliberately not hierarchy-scoped, per INC-13) and `flip_chart` (always visible — `flip_charts` carries no `org_unit_id`, global content once it exists, like `kb_entry`) to the dispatch list. INC-15 (Offline/PWA) writes no audit events, so it introduced no new gap. Verified the same way: same-scope/ancestor admins see `course.*`/`assessment.*` events, a sibling barangay's admin doesn't; `forum.*` and `flipchart.*` events are visible to every admin regardless of scope.

## 6. Feature Build Specs (detail beyond the requirements doc)

### 6.1 Chat Guide matching engine (closes G5)
Pipeline, in order:
1. **Normalize**: lowercase; strip punctuation; collapse whitespace; map common Taglish/text-speak variants via the `synonyms` table (e.g., *"bkit"→"bakit"*, *"lagnat ng baby"* tokens map to fever/infant terms).
2. **Expand**: union the normalized tokens with their synonym mappings (both directions, both languages).
3. **Score** each published `kb_entry`: `0.5 × ts_rank` (full-text, both language questions + keywords) `+ 0.3 × trigram similarity` (question text) `+ 0.2 × keyword-overlap ratio`. Weights and threshold live in config, admin-tunable later.
4. **Answer**: score ≥ 0.55 → top entry as the answer, next 2 as "related"; 0.35–0.55 → "Did you mean…?" list of top 3; < 0.35 → graceful no-answer message (per requirements doc) and an upsert into `unmatched_questions` (increment `asked_count` on duplicate normalized text).
5. **Feedback**: 👍/👎 on every answer; a 👎 also feeds the gap queue flagged as *bad answer* (distinct from *no answer*).

Quality bar: a checked-in test corpus of ≥ 60 fixtures (20 English, 20 Filipino, 20 Taglish/misspelled) with expected outcomes; matcher changes must keep the corpus ≥ 90% passing.

### 6.2 Dashboard (Phase 1 tabs: Activity, Chat Guide)
Per the requirements doc's resolved layout. Activity tab: cards (% active BHWs, avg sessions/BHW, total questions asked) + per-BHW table (name, last login, questions asked, status). Chat Guide tab: the **gap triage queue** front and center (open unmatched questions sorted by `asked_count`, with one-click "Create KB entry from this" that pre-fills the authoring form and links resolution), plus top-asked topics and deflection-rate trend. Time-range picker defaults to last 30 days. Training/Surveys tabs ship with their phases.

### 6.3 KB content operations (closes G13)
Every entry/article requires an owner at publish time; `review_due_on` defaults to +6 months; the dashboard shows a "stale content" count; the weekly admin ritual is: work the gap queue, review stale content. Seed-content requirement: **the pilot cannot launch with fewer than 50 published Maternal & Child Health Q&A entries** — content authoring is human work and is called out in the risk register.

## 7. Increment Roadmap (the Sonnet build sequence)

Each increment is one focused build session: scoped, testable, and independently shippable to the pilot branch. DoD = Definition of Done.

**INC-0 — Scaffold & foundations.** Next.js + TypeScript app; Supabase project wiring; design-tokens file generated from the resolved palette (light + dark); i18n skeleton with `fil`/`en` catalogs and toggle; base responsive layout shell; CI pipeline (lint, typecheck, test, Lighthouse budget check). *Out of scope: any feature UI.* **DoD**: CI green; empty shell deploys to Vercel; tokens file is the only place hex values appear; language toggle switches a sample string.

**INC-1 — Auth, org hierarchy & consent.** `org_units` + seed (one pilot barangay chain up to national); `users` table + RLS policies; username+password login (synthesized auth email, §4); NIST password policy + lockout; forced password change on first login; DPA consent screen gating first access; session timeout. *Out of scope: admin UI for managing users.* **DoD**: E2E test — provisioned BHW logs in with temp password → forced change → consent → lands on home; a BHW cannot query another org unit's rows (RLS test); lockout works.

**INC-2 — Admin console: user management & audit.** Admin CRUD for BHW accounts within scope (create with temp password, edit, deactivate/reactivate, transfer, reset password); last-admin deactivation guard; audit events for the full §5.6 user/auth taxonomy; laymanized audit viewer (filterable list of plain sentences, both languages). *Out of scope: KB authoring.* **DoD**: E2E — admin creates a BHW, resets their password, deactivates them; every action appears in the audit view in plain Filipino and English.

**INC-3 — KB authoring.** Categories CRUD; Q&A entry form (bilingual question/answer, keywords, optional image upload, draft/publish); long-form article editor (TipTap or equivalent, bilingual); KCS fields (owner, review-due) enforced at publish; synonyms admin table. *Out of scope: the matcher and chat UI.* **DoD**: E2E — admin authors and publishes a bilingual entry with an image; unpublished entries invisible to BHW role; publish without owner is blocked.

**INC-4 — Chat Guide engine.** The §6.1 pipeline as a server route; config-tunable weights/thresholds; unmatched upsert + dedup; the 60-fixture test corpus checked in and ≥ 90% passing. *Out of scope: chat UI (test via API).* **DoD**: corpus passes; unmatched questions dedupe correctly; rate limit on the endpoint verified.

**INC-5 — Chat Guide UI.** Mobile-first chat interface (large tap targets per requirements doc); answer, related-entries, did-you-mean, and no-answer states; 👍/👎 feedback; celebratory micro-moment on first successful answer (Sampaguita Yellow, per palette rules); full i18n; WCAG 2.1 AA pass on this flow. *Out of scope: dashboards.* **DoD**: E2E — BHW asks a Taglish question and gets the right entry; a nonsense question shows the graceful fallback and lands in the gap queue; axe-core scan clean.

**INC-6 — Dashboard: Activity + Chat Guide tabs.** As §6.2, including the gap-triage queue with "Create KB entry from this" pre-fill flow and stale-content count; roll-up scoping for higher-level org units; time-range picker. *Out of scope: exports, Training/Surveys tabs.* **DoD**: E2E — unmatched question → triage → pre-filled entry → publish → question now answered in chat and gap marked resolved; barangay admin sees only their scope, higher-level account sees roll-up.

**INC-7 — Settings, accessibility & onboarding.** Settings screen: language, dark/light, font size, contrast — persisted to profile, applied everywhere; first-run BHW onboarding checklist (set language → try the Chat Guide → visit a KB category); teaching empty states across all screens. **DoD**: prefs survive logout/login and a second device; axe-core clean on all Phase 1 routes at all font scales; checklist completes and never reappears.

**INC-8 — Reports export & analytics.** Analytics event instrumentation per §8 taxonomy; CSV and Excel export with the field/column picker (per requirements doc); PDF export of the dashboard summary; `report.exported` audit event; pilot-KPI panel (activation, WAU, deflection, CSAT) on the dashboard. **DoD**: exported CSV columns match picker selection; KPI panel matches hand-computed values from seeded fixture data.

**INC-9 — Ops hardening & pilot readiness.** Feature-flags table + server-side gating helper wired to nav/routes; error tracking wired with source maps; weekly `pg_dump` second-copy job; **executed restore drill with written runbook**; DPA data-export + anonymize actions; breach playbook + retention-purge jobs; deploy runbook. **DoD**: a flag flip hides a feature without deploy; a thrown test error appears in the tracker; the restore drill doc shows a real timed restore within RTO; purge job dry-run verified.

**Pilot launch gate** (after INC-9): ≥ 50 published MCH entries; the pilot barangay's real users provisioned; all nine increment DoDs re-verified on production; KPI baseline captured. This gate and the later-phase increments below are independent tracks — later phases are being built ahead of pilot validation at the maintainer's explicit direction (rather than the gap-queue-driven prioritization originally planned in this section), so each ships behind a feature flag defaulted off, leaving the pilot project unaffected until the gate clears and someone deliberately turns a feature on.

**INC-10 — Announcements** (§6.4). Hierarchy-scoped post feed: `announcements` table + RLS (a post is visible to a viewer if the post's org unit is an ancestor of, or equal to, the viewer's own — so a national post reaches everyone, a barangay post reaches only that barangay); admin posting UI with an org-unit picker (defaults to the poster's own unit, selectable within their scope) and image/link attachments (native video upload is out of scope — a pasted video link covers that case); BHW-facing read-only feed at `/announcements`. Ships behind the `announcements` flag (default `false`). **DoD**: a barangay-level post reaches BHWs in that barangay but not a sibling barangay; a city-or-higher-level post cascades down to every barangay beneath it; delete removes a post from every viewer's feed.

**INC-11 — Surveys** (§6.8). Admin-authored surveys with four question types (single-choice, multi-choice, rating 1-5, open text), created and deployed in one step via a dynamic question builder; per-survey anonymity choice (an anonymous survey never writes a `respondent_user_id` in the first place — not merely hides it — and response submission is deliberately excluded from the audit trail, since logging the actor there would itself be a re-identification channel); hierarchy-scoped visibility identical to INC-10's announcements (cascades downward from where it's deployed); a BHW-facing respond flow at `/surveys`; an admin results view that tallies choice/rating answers and lists free-text responses. Ships behind the `surveys` flag (default `false`). **DoD**: a draft survey is invisible to BHWs; publishing makes it visible and answerable within its deployed scope (including cascading from a city-or-higher level down to every barangay beneath it); results tally correctly per question type; deleting a survey removes it everywhere.

**INC-12 — E-Learning + Assessor Certification** (§6.3), built alongside INC-11 on an independent branch. Admin-authored courses with mixed text/video/quiz modules (video via a pasted link, same call as INC-10's attachments) and a per-course configurable quiz passing score and max attempts; a new `assessor` role (nurse/doctor) provisioned the same way as BHW/admin accounts via `rpc_admin_create_user`; an open assessment queue — any assessor at-or-above the BHW's own org unit can claim a pending assessment once the BHW finishes all modules — rather than a fixed assignment; passing issues a certificate with a public, unauthenticated verification page at `/certificates/[code]` (added to the middleware's public-path allowlist). Ships behind the `elearning` flag (default `false`). **DoD**: a BHW must pass every module (including the quiz, within its attempt limit) before an assessment is queued; a city-or-higher-level course cascades down to every barangay beneath it; an assessor can claim and decide a pending assessment in their scope; a passing decision issues a certificate whose code verifies publicly without login. Scope trimmed for this pass (documented, not silently dropped): no retry flow after a *failed* in-person assessment (terminal for this MVP); no dashboard "Training tab" aggregation (course_progress is admin-readable within scope so the data exists for a later dashboard increment to use).

**INC-13 — Interactive Forum / Sharing Platform** (§6.5), built as a later-phase module the same way as INC-10/11/12. Unlike those, forum visibility is deliberately *not* hierarchy-scoped: the requirements doc frames this as a cross-cutting space for LGUs/regional offices to share best practices, so any authenticated user (bhw/admin/assessor) can start a thread or reply and it's visible app-wide, not just within the author's own subtree. Admin-managed global categories plus free-form tags on threads for cross-cutting discovery. Moderation matches the spec's "post-first, moderate-after" model exactly: content is visible immediately (no pre-approval queue), and any admin can subsequently hide a thread or post (a reversible status flip, not a delete); the author of hidden content can still see it themselves so they know it was moderated. Author display name/username are snapshotted onto each thread/post at creation time rather than read via a `users` embed, avoiding the same RLS gap INC-12 hit (the `users` table's RLS only grants a viewer their own row or an admin's own-scope descendants — a raw embed would silently null out authors from unrelated branches, and widening `users` read access app-wide would also expose contact_number/email/address to anyone). Ships behind the `forum` flag (default `false`). **DoD**: a thread posted by a barangay-level BHW is visible to a BHW in an unrelated barangay; an admin hiding a thread or post removes it from every other viewer's feed but not the author's own view or any admin's; a category with existing threads can't be deleted.

**INC-14 — Flip-Chart Builder** (§6.7), built as a later-phase module the same way as INC-10/11/12/13. Adds a new `designer` role (provisioned like bhw/admin/assessor via `rpc_admin_create_user`). A flip chart is an ordered sequence of pages, each carrying the spec's two synchronized views: a client-facing image and a bilingual BHW-facing script/talking-points. Approval workflow matches the spec exactly — "Designer drafts, Admin approves before publish" — as a `draft` → `in_review` → `published` status machine: a designer submits a draft for review, an admin approves (publishes) or rejects (back to draft, with a `review_note` the designer sees on their own row). Content authored directly by an admin skips the gate and publishes immediately, since the approval step exists to gate *designer* output and an admin is already the approver. Mutation is create-once, matching the established convention for admin-authored content in this codebase (announcements/surveys/courses have no update RPC either) — revising a rejected or draft chart means deleting and recreating it, a disclosed v1 limit; a published chart can't be deleted at all (avoids breaking a chart already in use in the field). Author display name is snapshotted at write time, the same lesson INC-13 (Forum) established, so a reviewing admin can see who authored a chart regardless of the designer's org branch without hitting the `users`-embed RLS gap. Visibility is global once published (like `kb_entries`), not hierarchy-scoped — flip charts are official health education material meant for every BHW. Ships behind the `flipcharts` flag (default `false`). **DoD**: a draft is invisible to BHWs and to admins other than a reviewer (who sees everything); submitting locks it into the review queue; an admin's reject sends it back to draft with a note the designer can read; an admin's approve publishes it and it becomes visible app-wide with both its client-facing and BHW-facing views intact; a published chart can't be deleted.

**INC-15 — Offline / PWA** (§1's "later-phase goal" note; requirements doc gave no further spec beyond "designed in once core features are proven and stable", so scope was set here). A web app manifest (`public/manifest.webmanifest`, installable/standalone) plus a hand-rolled service worker (`public/sw.js`, no build-time precache manifest — Next.js content-hashes its static chunks per deploy, so a fixed asset list goes stale the moment a new version ships) that caches pages **as a BHW actually visits them** ("cache-as-you-browse"): a failed navigation falls back to whatever was last cached for that URL, or to a generic `/offline` page if nothing was ever cached for it. `/api/*` responses are never cached (live data only). The manifest link, theme-color meta, and service-worker registration are all read from the `offline_pwa` flag via a request header middleware already forwards (same mechanism as the a11y settings header) — flipping the flag off doesn't just stop new registrations, it actively unregisters any the BHW's device already picked up (`ServiceWorkerRegister`'s kill-switch branch), and sign-out clears the cache via a `postMessage` to the worker, since cached HTML on a shared device can carry another BHW's data. Ships behind the `offline_pwa` flag (default `false`). **DoD**: with the flag on, the manifest/theme-color/service-worker registration are all present; flipping it off and reloading tears the registration down; `/offline` renders without auth for a fully offline navigation to an uncached page. Scope trimmed for this pass (documented, not silently dropped): no offline write queue or background sync — a form submitted while offline fails the same way it would on any other web app, retry once reconnected; no push notifications; no precached "install once, works everywhere" guarantee — coverage is exactly whatever pages a BHW has actually opened.

**INC-16 — In-App Notifications** (requirements-and-vision.md §5 "Notifications: In-app only for the pilot" and §8 item 10 of the full feature list). A cross-cutting Phase 1 requirement that this roadmap had never actually scheduled — an audit against the requirements doc found it missing an increment entirely, going straight from INC-9 into the later-phase feature modules. A `notifications` table delivers either to a single known recipient (`recipient_user_id`) or as an org-scoped broadcast (`org_unit_id`, cascading downward exactly like announcements/surveys via `org_unit_path()`), never both. Read state is a single per-user cursor (`users.notifications_last_read_at`), the same minimalist shape as `consented_at`/`onboarding_completed_at`, rather than a per-notification join table. A header bell (`SiteHeader` → `NotificationBell`) shows the unread count, forwarded from middleware the same way the a11y/offline_pwa state already is, avoiding a duplicate Supabase round trip per request; `/notifications` lists the feed with a "mark all as read" action. Seven existing RPCs gained a notification side effect: `rpc_announcement_create` (broadcast), `rpc_survey_set_status`/`rpc_course_set_status` (broadcast, publish transition only — not draft/closed/archived), `rpc_assessment_decide` (targeted, both pass/fail outcomes), `rpc_forum_post_create` (targeted to the thread author, skipped when replying to one's own thread), `rpc_flipchart_review` (targeted to the designer), and `rpc_admin_transfer_user` (targeted to the transferred user). Ships behind the `notifications` flag (default `false`). **DoD**: a barangay-level announcement/survey/course publish notifies a same-barangay BHW and not a sibling barangay's, cascading from city-or-higher exactly like the underlying content; a decided assessment, a forum reply, a flip-chart review decision, and a transfer each notify only their specific intended recipient, never a broadcast; the unread badge reflects `notifications_last_read_at` and clears via the mark-all-read action; flipping the flag off hides the bell and blocks `/notifications` without a deploy. Scope trimmed for this pass (documented, not silently dropped): no push/SMS/email (in-app only, per the requirements doc itself); no live/real-time delivery — this codebase has no websockets/polling anywhere, so the bell is only as fresh as the last page load, consistent with its existing request-driven posture; no per-notification read/unread toggle, only the single per-user cursor; no `gap.resolved` personal notification — `unmatched_questions` dedupes across askers with no asker identity to resolve a personal notification to, which is structurally incompatible with the Chat Guide's anonymous-dedup model; no notification on deactivation/password reset (unreadable or already known out-of-band at the moment it would fire) or reactivation (low value — deferred, not dropped); no `assessment.claimed` notification, only the terminal `assessment.decided` outcome; no free-form admin-authored broadcast composer — every notification here is a side effect of an action that already exists.

Remaining later phases: Profiling-system live integration, still blocked on real technical access to the external system (requirements-and-vision.md §7, item 1); INC-2's manual-entry fallback remains the shipped Phase 1 path until that access arrives.

### 7.1 Deferred — closing the last developer dependencies in content authoring

The platform's defining goal is that BLHSD can add knowledge base content and
lectures from the front end indefinitely, with no developer in the loop — that
independence, not feature count, is what separates this from an INGO-run
training app on a vendor platform. An audit of the shipped console against that
goal found it largely met: categories, Q&A entries, long-form articles,
**synonyms** (the Chat Guide matcher's own Taglish/misspelling tuning),
courses with ordered text/video/quiz modules, quiz thresholds and retake limits,
flip charts, announcements, surveys, forum moderation, users and feature flags
are all admin-authored in-app, with real browser-side image upload to Supabase
storage. Three dependencies remain. All three are deliberately deferred until
the build matures — recorded here rather than actioned now.

1. **Video is link-only.** `course-form.tsx` takes a `video_url` text field;
   there is no upload path for video the way there is for images (the explicit
   call made in INC-10 and carried into INC-12). Authoring a lecture therefore
   depends on an outside host — YouTube, Facebook, Drive — and no admin-side
   surface reports a link that has rotted or been taken down. Revisit as a cost
   and bandwidth decision (storage and egress against BHW data cost), not as a
   missing feature; link-only may well remain correct.

2. **Two authoring models contradict each other for HHP+ content.**
   `content/kb/README.md` declares the versioned files the master copy — "the
   loader always rebuilds each row from these files, so the database never
   becomes the master copy" — while `/admin/kb` offers full in-app editing of
   the same rows. `scripts/kb-load.mjs` keys off `locks/<ref>.json` (content id
   → row uuid), so admin-*created* entries are never touched; but an admin's
   console edit to a loader-managed HHP+ entry is silently overwritten the next
   time anyone runs the loader. Needs one decision at the pilot gate, not code:
   either the database becomes master for HHP+ content and the loader demotes to
   seed-only, or the files stay master and those six modules are made read-only
   in the console. Both cannot stay true.

3. **No content-quality signal in the console.** The retrieval gate — ≥90% of
   the 90 fixtures in `src/lib/chat/ncd-fixtures.ts` — runs in CI against the
   content *files*. An admin authoring through the UI gets no equivalent check:
   nothing warns that a new entry's keywords collide with a neighbouring entry
   and degrade matching for both, which `content/kb/README.md` already names as
   the matcher's main failure mode. The unanswered-question log catches *misses*
   but not *mis-matches*, so Chat Guide accuracy can decay under front-end
   authoring with no dashboard signal. This is the substantive risk of full
   authoring independence and the one worth building for: a keyword-collision
   warning at publish time, and/or a console-side run of the fixture gate.

## 8. Pilot Success Metrics

Event taxonomy (fixed, versioned): `session.started`, `chat.question_asked`, `chat.answer_shown`, `chat.no_answer`, `chat.feedback_given`, `kb.article_viewed`, `onboarding.completed`, `settings.changed`, `gap.resolved`.

| Metric | Definition | Pilot target (first 60 days) |
|---|---|---|
| Activation | BHW asks ≥ 3 questions within first 7 days | ≥ 70% of provisioned BHWs |
| Weekly active | % of active BHWs with ≥ 1 session/week | ≥ 60% |
| Deflection rate | answered ÷ asked | ≥ 70% by day 60 (will start lower) |
| Answer quality | 👍 ÷ (👍+👎) | ≥ 80% |
| Gap turnaround | median open→resolved time for unmatched questions | ≤ 7 days |
| Content freshness | published entries past review-due | ≤ 10% |

These six numbers are the pilot report. If activation and deflection hit target, wider rollout is justified; if not, the gap queue and feedback data say exactly what to fix.

## 9. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| KB seed content doesn't get authored (human bottleneck) | High | Blocks launch | 50-entry launch gate set now; authoring starts during INC-3, not after INC-9 |
| Taglish matching quality disappoints | Medium | Core UX | Fixture corpus + tunable weights + synonyms table grows from real gap-queue data |
| Supabase free tier pauses/limits under pilot load | Medium | Outage | Pilot load is tiny; monitor usage; upgrade path is $25/mo; portability guardrail (§3) keeps exit open |
| Gov-server migration demanded later | Low | Rework | §3 portability guardrail: plain Node + Postgres, no proprietary lock-in |
| Single-admin dependency in pilot barangay | Medium | Ops stall | Provision ≥ 2 admins at launch; last-admin guard already in INC-2 |
| DPA/NPC obligations missed | Low | Legal | §5.4 mechanics built in INC-1/INC-9, not deferred |
| Profiling-system specifics arrive late (owed at a later milestone) | Expected | None for Phase 1 | Manual-entry fallback is the shipped Phase 1 path; integration is its own later increment |
