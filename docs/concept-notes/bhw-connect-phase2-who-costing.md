<!--
  Source of record: docs/concept-notes/bhw-connect-phase2-who-costing.docx
  This Markdown and that .docx are edited together. The .docx is authoritative
  for formatting and page count; this file is authoritative for figures.

  Audience: WHO Country Office for the Philippines. This is a WHO document.
  Nothing from the KOICA / World Vision edition belongs in it — that note was
  used only as a structural template for the contribution table and the
  line-item budget. DO NOT REINTRODUCE ttCF, Eastern Visayas or Region VIII.

  SCOPE BOUNDARY — the whole point of this document, and the thing most likely
  to be eroded by a well-meaning edit:
    WHO funds        3 people embedded in and reporting to DOH; the AI tooling
                     they use to build the Knowledge Base; and hosting for the
                     12-month cycle ONLY, up to the transfer described below.
    DOH delivers     the standard, the issuance, the governance body, the
                     platform itself, content approval, data governance — and
                     the destination infrastructure the platform migrates onto.
    WHO + its APW    everything else — training delivery, rollout, equipment,
                     video production, M&E, travel and per diem — under DOH
                     guidance and approval.
  If a line item does not sit in the first row, it does not belong in the
  costing table.

  HOSTING IS TIME-BOUNDED AND THAT IS LOAD-BEARING. Section 6 is not decoration:
  hosting is funded for twelve months and then MIGRATES ONTO DOH-OWNED
  INFRASTRUCTURE under a hosting agreement with DOH KMITS, before closeout. The
  point is that WHO acquires no recurring obligation. Do not soften "before
  closeout" into "eventually", and do not let the hosting line read as an
  open-ended subscription. The architecture supports it — open, non-proprietary
  Postgres core, no proprietary lock-in — and that is why the commitment can be
  made in writing.

  RELATIONSHIP TO THE CONCEPT NOTE. This states PHP 3,193,400. Concept note §13
  states PHP 14,980,000. They are NOT the same figure and neither is wrong: §13
  prices the entire information-system programme bottom-up, including rollout,
  equipment, video and M&E; this note prices only the DOH-side cash ask now
  that those have moved to WHO's APW. §13 is deliberately untouched. Before
  either document goes to WHO, decide which is the standing ask — two
  different totals must not reach the same funder unreconciled.

  PRICES ARE VERIFIED, NOT RECALLED (checked 2026-08-28):
    Claude Max 20x   US$200/seat/month — Anthropic support, "What is the Max plan?"
    Gemini API       gemini-3.6-flash, US$0.75/M input and US$3.75/M output
                     through 2026-12-31; US$1.50 / US$7.50 from 2027-01-01.
  The Gemini line is an API allowance, NOT a subscription seat. The 1,200
  requests/day ceiling it is bounded by is real and enforced in software —
  src/lib/ai/config.ts providerCeilings, and rpc_ai_check_budget in
  supabase/migrations/20260805000000_inc18a_ai_budget_guard.sql.

  HOSTING IS BUILT FROM LIST PRICES, NOT FROM THE OLD BAND. The first draft of
  this note carried the repo's KOICA-era infrastructure band (PHP 25,000/mo cloud
  + PHP 15,000/mo monitoring = PHP 480,000/yr). That was never checked against
  what the stack actually costs, and it does not survive the check: PHP 25,000/mo
  is ~US$431, i.e. Supabase 2XL compute ($410), for a read-heavy app serving
  ~14,000 weekly actives. Verified list prices 2026-08-28 — Supabase Pro $25/mo
  (8 GB disk, 250 GB egress, daily backups, $10 compute credit; compute add-ons
  Micro $10 / Small $15 / Medium $60 / Large $110); Vercel Pro $20/mo per seat
  ($20 credit, 1 TB transfer); Sentry ~$26/mo, already wired via SENTRY_DSN.
  A sensible build is ~US$131/mo. The line is set at PHP 10,000/mo (~US$172) —
  real headroom over that, and defensible line by line if WHO asks.
  DO NOT restore the PHP 480,000 figure for consistency with §13's infrastructure
  line; §13 bundles AI subscriptions and region-wide scale-up into the same row
  and is not comparable. Salary bands remain [TO CONFIRM] and are still derived
  from the Phase 2 workplan. FX at PHP 58/US$, per §13.
-->

# BHW Connect Phase 2 — Year-1 Costing

## What WHO is asked to fund, and what DOH delivers in return

**Submitted by** Department of Health, Bureau of Local Health Systems Development — Equity in Health and Special Concerns Section
**Submitted to** World Health Organization, Country Office for the Philippines
**Period** 12 months · **Total** ₱3,193,400 ≈ US$55,058 at ₱58/US$
**Date · version · contact** [TO CONFIRM]

---

## 1. Purpose

This document costs three things: **the small team that builds the DOH information system, the AI tooling it uses to build the Knowledge Base, and hosting for the twelve months it takes to get there.** That is the entire cash ask.

It is deliberately narrow, and it is deliberately finite. Everything else this programme needs is already assigned — either to DOH, which owns and delivers the information system itself, or to WHO and its Agreement for Performance of Work, under DOH guidance and approval. And the one recurring cost in it, hosting, **ends inside the engagement**: the platform migrates onto DOH-owned infrastructure before closeout, so WHO acquires no continuing obligation. Section 6 states that commitment in full.

## 2. The exchange

| WHO is asked to provide | DOH delivers, and owns |
|---|---|
| **Three full-time personnel** for 12 months — a software developer, a quality assurance analyst, and a Knowledge Base content and training coordinator — engaged for and embedded in DOH, reporting to BLHSD | **The national standard.** A BHW competency and certification framework: competency domains, assessment rubrics, pass marks and re-certification triggers |
| **AI tooling** for building the Knowledge Base — two authoring seats and a bounded API allowance | **The policy issuance** that makes the standard mandatory for all BHW training, whoever funds or delivers it |
| **Hosting and infrastructure for twelve months only**, up to the transfer onto government infrastructure | **The governance body** — DOH convenes and organizes the Steering Committee, Technical Working Group and Content Review Panel, and chairs them |
| Technical review and validation of the digitized curriculum; normative positioning; participation in governance | **The platform** — built, provisioned, governed and owned by DOH, together with its source code, its data and every published word |
| Narrative and financial reporting requirements | **The destination infrastructure** — DOH-owned hosting, and the hosting agreement with DOH KMITS that the platform migrates onto before closeout, and the budget line that sustains it afterwards |

The asymmetry is intentional. WHO is asked to finance people and a runway; DOH is committing to deliver institutions, policy, an asset it will still own after the engagement closes — and the infrastructure that asset lands on.

## 3. What this costing covers — and what it does not

| | Responsible | Costed here? |
|---|---|---|
| The three personnel, their AI tooling, and hosting for the 12-month cycle | **WHO** — cash | **Yes.** Section 5. |
| The information system: the standard, the issuance, the governance body, the platform, content approval, data governance and Data Privacy Act compliance — **and the DOH infrastructure the platform transfers onto, and all hosting from that point forward** | **DOH / BLHSD** | No — DOH's to deliver |
| Training delivery, region-wide rollout and onboarding, IT equipment, video and bilingual production, independent monitoring and evaluation, travel and per diem | **WHO and its APW**, with DOH guidance and approval | No — arranged separately by WHO |

Nothing in the third row is being declined or deferred. It sits with WHO's existing implementing arrangements rather than in this instrument, and DOH guides and approves it.

## 4. What BLHSD brings

This is a shared investment, and the government contribution is already substantial — most of it spent before WHO is asked for anything.

- **The delivered Phase 1 national registry** and its nearly 300,000 profiled Barangay Health Worker records — the first complete national record of this workforce in roughly three decades, and the only place a competency standard can actually be written.
- **The complete Phase 2 design and architecture — requirements, data model, system architecture, user journeys, content governance and approval workflow, accessibility and data-privacy approach — funded by BLHSD at its own cost.** The engagement does not begin with discovery; it begins with construction against a settled design.
- **Government infrastructure to receive the platform**, and the hosting agreement with DOH KMITS that makes the transfer in Section 6 possible — together with the hosting budget from that point onward, in perpetuity.
- **Supervision of the funded team**, and the BLHSD administrators and content owners who work alongside them.
- **Chairmanship of the governance bodies**, execution of the Memorandum of Agreement, and the policy instruments themselves.
- **Content approval authority** — every learning item routes through the Content Review Panel and DOH approval before publication.
- **Data governance and Data Privacy Act compliance**, and digital-health standards alignment.
- **Field structures** through the Centers for Health Development and LGUs, and assessors for skills demonstrations.
- **Office space and utilities**, and maintenance and staffing from closeout onward.

## 5. Year-1 costing

### 5.1 Personnel — 12 months, full-time, reporting to BLHSD

| Position | Basis | Amount (₱) |
|---|---|---|
| Software Developer (senior full-stack) — builds the platform to the completed design; hardening and provisioning | ₱100,000/month × 12 | 1,200,000 |
| Quality Assurance Analyst — test and release QA, accessibility, regression and acceptance against the standard | ₱65,000/month × 12 | 780,000 |
| Knowledge Base Content & Training Coordinator — authors the bilingual Knowledge Base and the course content; routes it through validation and DOH approval | ₱65,000/month × 12 | 780,000 |
| **Subtotal — personnel** | | **2,760,000** |

Rates are [TO CONFIRM] with BLHSD and against market before submission. They are derived from the bands already used in the Phase 2 workplan, not from independent market research. Contracting modality — whether engaged directly by WHO or through a third party, and under which instrument — is [TO CONFIRM].

### 5.2 Hosting and infrastructure — 12 months only

| Line | Basis | Amount (₱) |
|---|---|---|
| Managed database, application hosting and CDN | ₱6,100/month × 12 | 73,200 |
| Monitoring, backups and restore drills, domain and SSL, supporting SaaS tooling | ₱1,700/month × 12 | 20,400 |
| Headroom for egress and compute overage at rollout peak | ₱2,200/month × 12 | 26,400 |
| **Subtotal — hosting and infrastructure** | | **120,000** |

Built from published list prices rather than a carried-over band: managed Postgres with daily backups, application hosting and CDN, and error monitoring come to roughly US$131 per month at the tier this workload needs. The line is set at ₱10,000 per month — about US$172 — so the headroom is real rather than nominal. Daily backups already meet the platform's 24-hour recovery-point objective; point-in-time recovery is an optional add-on if DOH wants a tighter one.

**This line does not recur.** It funds the runway to the transfer described in Section 6, and stops there — and because cutover happens before closeout, twelve months is the safe assumption rather than the expected draw.

### 5.3 AI tooling — for building the Knowledge Base

| Line | Basis | US$ | Amount (₱) |
|---|---|---|---|
| Claude Max 20× — 2 authoring seats | US$200/seat/month × 2 × 12 | 4,800 | 278,400 |
| Gemini API — usage allowance, not-to-exceed | See 5.4 | 603 | 35,000 |
| **Subtotal — AI tooling** | | **5,403** | **313,400** |

### 5.4 How the Gemini API figure was built

Gemini is used programmatically, not as a subscription seat: the platform calls it to draft a Knowledge Base entry from a gap question an admin has already cleared, and every draft is validated in code and then reviewed by a person before anything is published.

At the configured model (`gemini-3.6-flash`, US$0.75 per million input tokens and US$3.75 per million output tokens through 31 December 2026, doubling on 1 January 2027) and roughly 800 input and 800 output tokens per draft, the Year-1 target of 150+ published bilingual entries — allowing five drafting passes each, plus gap-queue triage throughout the year — models to **well under US$50**.

The **US$603 (₱35,000)** allowance is therefore roughly fifteen times the modelled need. It is set deliberately high to absorb the January 2027 price change, heavier drafting than projected, and any future use of the optional Chat Guide gap-fallback. **It is a not-to-exceed ceiling, not a forecast.** Unspent balance is not drawn.

The ceiling is also enforced in software rather than by good intentions: the platform caps AI calls at 1,200 per day and 8,400 per week and refuses the call beyond that, so the line cannot overrun without an operator deliberately raising it.

### 5.5 Total

| | US$ ≈ | Amount (₱) |
|---|---|---|
| Personnel (86.4%) | 47,586 | 2,760,000 |
| Hosting and infrastructure (3.8%) | 2,069 | 120,000 |
| AI tooling (9.8%) | 5,403 | 313,400 |
| **YEAR-1 TOTAL** | **55,058** | **3,193,400** |

No contingency line is included. Salaries, hosting and tooling are fixed and knowable, and a contingency against them would be padding. The one real exposure is foreign exchange: the AI tooling lines are denominated in US dollars, so ₱58/US$ is an assumption rather than a fact.

## 6. Hosting transfers to DOH before closeout

The hosting line above buys twelve months of runway, not a standing arrangement. **Before the engagement closes, the platform migrates onto DOH-owned infrastructure, under a hosting agreement with DOH KMITS. From that point the platform runs on government infrastructure at government cost, and WHO's hosting obligation ends.**

This is a commitment, not an aspiration, and three things make it deliverable:

- **The architecture was built for it.** An open, non-proprietary PostgreSQL core with no proprietary managed-service lock-in. Migration is a database and deployment exercise, not a rewrite.
- **It is a scheduled deliverable, not a closing formality.** The migration is planned, rehearsed against the existing backup-and-restore runbook, and completed inside the twelve months — with the cutover treated as an acceptance gate, so the engagement is not signed off until the platform is running on DOH infrastructure.
- **DOH carries it afterwards.** Hosting, maintenance, staffing and content upkeep become a BLHSD budget line from cutover onward, consistent with the sustainability commitments in the accompanying concept note.

The practical effect for WHO: **this is a one-year cost with a defined end, not the first year of a subscription.** The exit is designed in, dated, and gated.

Migration target, KMITS hosting agreement status and cutover date are [TO CONFIRM].

## 7. What the AI tooling is — and what it is not

This line will be read closely, so it is stated plainly.

**It is** an authoring tool. The two Claude seats and the Gemini API allowance exist so that three people can build a bilingual Knowledge Base and six modules of course content in twelve months — drafting, translating, structuring and checking work that would otherwise be impossible at that headcount.

**It is not** a service that answers Barangay Health Workers. The platform's answer path is a rule-based engine matching against DOH-approved content, with no per-question licensing and no marginal cost per matched answer. Whether an AI may ever answer a BHW directly is a DOH governance decision, not a technical default, and Year 1 ships the conservative path.

**Nothing authored with these tools reaches a Barangay Health Worker unreviewed.** Every entry is validated in code, cleared by the Content Review Panel, and approved by DOH before publication. All health content requires clinical validation and DOH approval before any BHW-facing use.

## 8. Supervision, reporting and assumptions

**Supervision.** The three personnel report to BLHSD, Equity in Health and Special Concerns Section, and work within the Technical Working Group's delivery cadence. DOH supervises the work; WHO receives narrative and financial reporting on an agreed schedule.

**Ownership.** The platform, its source code, its database and all published content rest with the Department of Health throughout the engagement and after it, subject to a Memorandum of Agreement executed before implementation begins.

**Assumptions.** Twelve-month engagement · FX at ₱58/US$ · salary and hosting rates [TO CONFIRM] with BLHSD · contracting modality [TO CONFIRM] · migration target and cutover date [TO CONFIRM] · subscription and API list prices as published on 28 August 2026 and subject to provider change · Gemini API line is a not-to-exceed allowance, drawn against actual usage.

**Relationship to the concept note.** This document prices only the DOH-side cash ask. The accompanying concept note's Section 13 prices the full information-system programme bottom-up, including the rollout, equipment, production and evaluation lines that now sit with WHO's APW. The two figures describe different scopes and should be read together.
