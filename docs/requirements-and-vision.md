# BHW Connect Phase 2 — Requirements & Vision

## Context

BHW Connect Phase 2 is a new web application for Barangay Health Workers (BHWs) in the Philippines. This document consolidates an extensive discovery/planning conversation (11 rounds, ~44 clarifying questions) covering platform architecture, roles, admin capabilities, dashboards/reports, UI/UX design, and feature-level requirements.

This is a **requirements/vision document**, not a technical implementation plan. No tech stack or architecture has been chosen yet — see "Next Steps" below (Section 7 tracks how the original open items were resolved).

## 1. Platform Fundamentals

- **Form factor**: Web application accessed via browser (not a native app), fully responsive across desktop, laptop, tablet, and mobile — no primary device target; every role gets full-quality responsive design on any device.
- **Rollout model**: Phased/incremental feature releases, starting as a pilot.
- **Scale target**: Architected to grow from a small pilot to ~200,000 users.
- **Pilot scope**: A single barangay or Rural Health Unit (a few dozen BHWs), for close monitoring before wider rollout.
- **Timeline/budget**: Launch targeted a few months out; tight budget — lean toward free/low-cost hosting tiers and lean scope for an affordable near-term launch.
- **Tech stack/hosting**: Free choice of stack. Cloud is the default assumption, but government server hosting is a fallback if cloud costs prove prohibitive — architecture should not hard-lock into a cloud-only assumption.
- **Data privacy**: Must be Philippine Data Privacy Act (DPA)-compliant from day one — consent flows, data minimization, access logging, and data-subject rights (access/correction/deletion) designed in from the start, not retrofitted later.
- **Offline access**: A later-phase goal, not required for Phase 1. Phase 1 assumes internet connectivity; offline gets designed in once core features are proven and stable.

## 2. Organizational Hierarchy & Roles

**Hierarchy** (standard Philippine LGU/DOH terms): National (DOH) → Regional → Provincial → City/Municipal → Barangay. Each level manages and sees its own scope by default, with roll-up visibility for levels above.

**Roles identified:**
- **BHW** — end user/learner; uses the Chat Guide, e-learning, forum, surveys, etc.
- **Admin** — single role type (not distinct titles per hierarchy level), scoped by whichever org unit the account is assigned to (e.g., one Admin account = Barangay X). Manages/publishes content, users, and configuration within their scope.
- **Designer** — authors health promotion/flip-chart materials (drafts only; requires Admin approval to publish).
- **Assessor** (nurse/doctor) — grades and certifies BHWs via in-person skills demonstration. Any qualified assessor within scope (e.g., same barangay/RHU) can pick up a pending assessment (open queue model, not fixed assignment).
- **Phase 1 launch roles**: Just two — **Admin** and **BHW**. Designer/Assessor roles activate with later phases (e-learning, flip-chart builder).

**Account provisioning:**
- Admin creates/invites BHW accounts on their behalf (not self-registration) — the appropriate admin level provisions the account.
- **Login**: Username + password. Standard security baseline (reasonable password rules, session timeout) — balanced against not being burdensome for lower-tech-literacy users.

## 3. Admin Console — Core Capabilities

- **Universal content control**: Admin can edit/enhance/update content seen by users across all modules (Knowledge Base, e-learning, flip-chart materials, announcements, etc.), not just within individual features in isolation.
- **Admin-fed supplementary data** (two distinct kinds):
  1. **Reference/resource data** — protocols, guidelines, drug/vaccine info, contact directories BHWs can consult.
  2. **Configuration values/parameters** — data that powers feature behavior behind the scenes (e.g., survey question banks, program thresholds, scoring rules).
- **Feature toggles**: On/off control, settable by **both role and organizational unit** — e.g., pilot a feature in one region or for one role before wider rollout.
- **Per-feature access control**: Granular — not just login access, but which specific features a given role/org unit can use.
- **Operations & governance**:
  - Usage monitors (activity/engagement tracking)
  - "Laymanized" system audits — audit trails presented in plain, non-technical language
  - Automatic data backups — daily backups, 30-day rolling retention (finalized) — an operational/cost tradeoff, not driven by a specific DPA compliance minimum
  - Telemetry — serves **both** product-improvement (UX friction, unused features) and BHW performance/compliance tracking equally

## 4. Dashboards & Reports

- **Dashboard audience**: Not just top-level Admin — supervisory roles (nurses/doctors, RHU staff, regional offices) get roll-up dashboards for their scope, consistent with the org hierarchy.
- **Layout (resolved)**: Multi-tab dashboard — separate tabs for Activity, Chat Guide, Training, and Surveys, each with its own detailed view.
- **Dashboard content — field-level detail (resolved)**:
  - **Activity tab**: Aggregate summary cards (e.g., % active BHWs, average logins) **plus** a per-BHW drill-down table (name, last login, activity count, status).
  - **Chat Guide tab**: The unanswered-question log is the prioritized field — it feeds Admin's Knowledge Base gap review directly — alongside the top-asked-topics list.
  - **Training tab**: Training/certification progress (% completion, certificates issued) — relevant once e-learning ships.
  - **Surveys tab**: Survey response tracking — relevant once survey tool ships.
- **Default time range**: Rolling recent period (e.g., last 30 days), user-adjustable.
- **Reports** (formal, distinct from live dashboards):
  - Usage pattern: both on-demand exportable snapshots (ad hoc, e.g. for a submission deadline) AND scheduled automatic reports (routine cadence).
  - Export formats: PDF, Excel, and CSV (all three).
  - **Granularity (resolved)**: A field/column picker lets the user choose what level of detail goes into each report at export time, rather than a fixed raw-vs-mirrored rule.

## 5. UI/UX & Visual Design

- **Visual tone**: Combine warm/approachable with vibrant/energetic — friendly, encouraging, community feel, with energetic/motivating elements (e.g., progress indicators, celebratory moments on completing training).
- **Simplicity level**: Lean strongly toward simplicity — large tap targets, short labels, icon-heavy, minimal steps per task. Designed for users who may be new to app-based tools, given varying tech comfort levels and possibly older/lower-end phones.
- **Language**: Full bilingual support — Filipino and English, **user-selectable toggle for the interface itself** (menus/buttons/labels), not just content. Knowledge Base content must also handle mixed Filipino/English (Taglish) input with typo tolerance (see Phase 1 below).
- **Adaptive display settings (resolved)**: Phase 1 baseline — adaptive text/fonts, color palette options (see resolved palette below), dark mode/light mode, contrast adjustment, font size adjustment. Later-phase additions, once the baseline is proven: screen reader/text-to-speech support, reduced motion (disable/minimize animations), adjustable line/letter spacing, larger tap-target mode, icon-only/simplified mode, and a dyslexia-friendly font option. All accessibility preferences save to the BHW's user profile, persisting across devices/sessions.
- **Color palette (resolved)**: Marigold (`#E8641C` display / `#B84E12` button-safe) paired with Bayanihan Teal (`#0C7C7E`) as primary/secondary — a warm-vs-grounded complementary pairing rather than a single mono-warm hue, so the app reads energetic without tipping into visual noise. Sampaguita Yellow (`#FFC857`, paired only with dark ink text) carries celebratory/progress moments (certificates, badges, completion states) called for in the "energetic/motivating elements" brief above. Neutrals are warm-tinted (`#F6F2ED` canvas / `#2B2420` ink in light mode; `#221B16` / `#F5EDE4` in dark mode) rather than stark white/gray, avoiding a clinical-government feel. Semantic status colors (success `#1F7A45`, warning `#8F5A08`, danger `#C53A3A`, info `#2C6FA6`) are kept distinct from the brand hues so meaning never collides with decoration. Every text/background pairing was checked against WCAG 2.1 contrast minimums (4.5:1 normal text / 3:1 large text & UI) via the relative-luminance formula, not eyeballed — important since BHWs will often read this outdoors, on older phones, in direct sunlight. Full swatch reference, contrast table, and in-product component previews (Chat Guide bubble, certificate card, Admin status chips) are captured in the palette proposal artifact from this planning round; values above are the source of truth to carry into implementation.
- **Notifications**: In-app only for the pilot (no SMS/email cost); can expand to SMS/email/push as the system scales.

## 6. Feature Details

### 6.1 Chat Guide (Phase 1 priority — first feature to ship)
- Chatbot-style interface: BHW types a concern in free text, gets a response sourced from the Knowledge Base.
- Must handle Filipino, English, and code-switching (Taglish), plus typo/misspelling tolerance.
- **NLP approach confirmed**: Rule-based/fuzzy matching only (keyword matching, synonym lists, fuzzy string matching) — no paid AI API costs, consistent with the project's no-AI-credits constraint.
- **Fallback behavior**: When no good match is found, show a graceful "no answer yet" message to the BHW, and log the unmatched question for Admin review — directly feeds the Chat Guide usage/gap-detection dashboard (Section 4).

### 6.2 Knowledge Base
- **Structure**: Hybrid — structured topic categories with individual Q&A entries (for Chat Guide matching) AND longer-form reference articles (for deeper reading).
- **Topic roadmap (resolved)**: Maternal & Child Health ships as the focused Phase 1 starting topic. Immunization, Nutrition, Communicable Disease Surveillance, Family Planning, First Aid, and BHW Admin Procedures are all committed for later-phase expansion (no longer just discussed candidates), consistent with the doc's phased rollout model. Rollout order is data-driven — prioritized using the Chat Guide's unanswered-question log / dashboard gap insights (Section 4) rather than a fixed sequence set in advance.
- **Authoring experience**: Depends on content type — simple structured forms (Question, Answer, Category, Keywords/tags, optional image) for Q&A entries; a rich document editor for longer-form content and later features (e-learning, flip-chart scripts).
- Managed entirely through the Admin Console, updatable at any time.

### 6.3 E-Learning Module + Certification
- BHW completes online learning topics (content format: mix of video, text/slides, and quizzes — flexible per topic; video has bandwidth/offline implications to keep in mind).
- Quiz passing threshold and retake rules are **configurable per course** by Admin (not one fixed system-wide rule).
- After completing online content, BHW proceeds to an in-person skills demonstration.
- **Assessor matching**: Open queue — any qualified assessor within scope (e.g., same barangay/RHU) can pick up a pending assessment.
- Assessor logs into BHW Connect to grade/certify.
- **Certificates**: Auto-generated on completion, delivered as downloadable PDF with a QR code for public verification (fraud prevention at scale).
- Content (like the KB) is managed/updatable via the Admin Console at any time.

### 6.4 Announcement Page
- Facebook-feed style; supports file, video, and link attachments.
- **Posting scope**: Each org hierarchy level can post within its own scope (Barangay-level admin posts to their BHWs only; Regional posts to their region; National posts to everyone) — consistent with Section 2's hierarchy.

### 6.5 Interactive Forum / Sharing Platform
- For LGUs/regional health offices to share best practices and experiences.
- **Structure**: Both — top-level categories/topics (e.g., "Best Practices," "Program Updates," "General Discussion") for structure, plus tags for cross-cutting discovery.
- **Moderation**: Post-first, moderate-after — posts appear immediately for a lively/timely forum; moderators can remove/flag inappropriate content afterward.

### 6.6 BHW Profiling System Integration
- New BHW registrants get their base profile pulled from the existing (external) BHW profiling system.
- **Integration method**: Live database/API integration (real-time/near-real-time), not batch import.
- **Launch fallback (resolved)**: If live integration isn't ready in time for Phase 1, Admin manually enters a new BHW's base profile at account creation — launch is not blocked on the external system.
- **Minimum fields (resolved)**: Identity & contact only, at minimum — full name, contact number, email, address.
- **Auth assumption (resolved, pending confirmation)**: Assumed API-key/token-based. Full technical specifics (API docs, real auth mechanism, other data fields) are owed at a later milestone and not yet transmitted — see Next Steps.

### 6.7 Health Teaching / Health Promotion Materials Builder ("Flip Chart")
- Admin and **Designer** roles get a content-authoring module to build patient education materials.
- Flip-chart metaphor: each page/card has two synchronized views —
  - **Client-facing view**: a visual/image shown to the community member
  - **BHW-facing view**: a script/talking points for the BHW to reference while presenting
- **Approval workflow**: Designer drafts, Admin approves before publish — quality-control gate for official health education materials.
- Managed through the Admin Console like other content types.

### 6.8 Survey Tool
- Admin/authorized roles create and deploy surveys to BHWs.
- **Question types supported**: multiple choice (single answer), multiple choice (select all that apply), rating scale, and open text/comment box.
- **Response identity**: Admin chooses per survey whether responses are anonymous or identified — flexible per use case (sensitive feedback vs. training evaluations needing follow-up).

## 7. Open Items — Resolution Log (all resolved)

All items originally flagged here have been resolved:

- Field-level detail for dashboards and reports → Section 4.
- Full breadth of Knowledge Base topic categories → Section 6.2.
- Technical details of the BHW Profiling System integration → Section 6.6 (launch fallback, minimum fields, and auth assumption locked in; full API specifics still owed at a later milestone — see Next Steps).
- Exact backup frequency/retention figures → Section 3.
- Further "adaptive display" accessibility settings → Section 5.
- Additional features not yet captured — a completeness check against Sections 1–6 found two features fully specified in the body but missing from the Section 8 summary (Dashboards & Reports, Notifications); both are now reflected there. No other undiscussed features surfaced.

## 8. Full Feature List Summary

1. Chat Guide (Phase 1 priority) — rule-based bilingual/typo-tolerant Q&A chatbot over the Knowledge Base
2. Knowledge Base — hybrid structured Q&A + long-form articles, admin-managed
3. E-Learning Module + Assessor-graded certification with QR-verified certificates
4. Announcement Page — feed-style, hierarchy-scoped posting
5. Interactive Forum/Sharing Platform — categorized + tagged, post-then-moderate
6. BHW Profiling System integration — live pull of base profile data at registration (manual-entry fallback at launch)
7. Health Teaching/Health Promotion Materials Builder ("Flip Chart") — dual client/BHW views, Designer-drafted/Admin-approved
8. Survey Tool — multi-format questions, per-survey anonymity choice
9. Dashboards & Reports — hierarchy-scoped roll-up dashboards for Admin + supervisory roles (activity, Chat Guide gaps, training progress, survey tracking) plus on-demand/scheduled exports (PDF/Excel/CSV)
10. Cross-cutting: adaptive display/accessibility settings, admin universal content control, feature toggles + per-feature access control (role + org unit), usage monitors, laymanized audits, auto-backups, telemetry, in-app notifications

**Feature-completeness review (resolved)**: Cross-checked Sections 1–6 against this summary — no previously-undiscussed features surfaced from the original discovery conversation. Two gaps found were in this list itself, not in the underlying requirements: Dashboards & Reports (Section 4) and in-app Notifications (Section 5) were fully specified in the body but missing from the summary above; both are now reflected (item 9 and the cross-cutting line).

## Next Steps

1. Once real technical access to the BHW Profiling System is available, confirm or replace the assumed API-key/token auth method and finalize integration scope (Section 6.6).
2. Move into technical architecture planning (tech stack selection, data model, hosting decision) for Phase 1 specifically (Chat Guide + Knowledge Base + minimal Admin Console + Auth/roles).
3. Begin implementation planning/coding for Phase 1.

## Status Note (2026-07-18)

All six items previously flagged as open have been resolved — see the Resolution Log in Section 7 for where each is addressed.
