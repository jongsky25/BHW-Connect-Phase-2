<!--
  WHO edition of the BHW Connect Phase 2 concept note.

  Derived from bhw-connect-phase2-concept-note-koica.md. Three things differ materially
  and must not be silently reverted:

  1. BUILD STATUS. The KOICA edition says Phase 2 is "conceptualized and planned… funded
     under this proposal." That is no longer accurate: INC-0 through INC-16 are merged,
     with 22 migrations and 40+ test suites. This edition says built, behind feature flags
     defaulted off, pilot launch gate not cleared. It must stay aligned with
     pitch/bhw-connect-who.html — a funder holding both a deck claiming working software
     and a note asking to fund a build is worse off than with either alone.
  2. YEAR-1 MODULE. HHP+ / PhilPEN 2025 community NCD screening in Western Visayas,
     not ttCF in Eastern Visayas. ttCF is the designed second module.
  3. PARTNER. WHO Philippines. World Vision fund-holder and KOICA financing mechanics
     are removed, not reassigned.

  [TO CONFIRM] markers are load-bearing: the priority province, the Year-1 BHW cohort and
  the cost per BHW are Region VI figures nobody has supplied yet. The ₱6,000,000 envelope
  and the "26,000 BHWs" figure in the KOICA edition are Eastern Visayas numbers. Do not
  fill these with plausible-looking values.
-->

# CONCEPT NOTE

## BHW Connect Phase 2: Operationalizing the DOH National Digital Learning, Training and Certification Platform for Barangay Health Workers

**Year 1 Flagship Learning Module: Community-Based NCD Screening under Healthy Hearts Plus (HHP+) and PhilPEN 2025, Western Visayas**

*A government-owned platform, already built, seeking catalytic support from the World Health Organization to be validated, approved, provisioned and rolled out.*

Bureau of Local Health Systems Development, Department of Health, Republic of the Philippines

| | |
|---|---|
| Platform Owner | Department of Health, through the Bureau of Local Health Systems Development (BLHSD) — Equity in Health and Special Concerns Section |
| Nature of the Proposal | Phase 2 of the DOH BHW Connect platform. The software is built; this proposal funds validation, DOH content approval, provisioning, rollout and evaluation. Not a stand-alone project. |
| Phase 1 Track Record | Close to 300,000 Barangay Health Workers profiled nationwide within about one year — closing a gap that had persisted for roughly three decades |
| Phase 2 Build Status | INC-0 to INC-16 implemented and automatically tested; every later module ships behind a feature flag defaulted off; pilot launch gate not yet cleared; no BHW using it in the field today |
| Year 1 Flagship Module | Community-based NCD screening — the six-module HHP+ curriculum, digitized as the first DOH-approved learning module on the platform |
| Proposed Partner | World Health Organization, Country Office for the Philippines |
| Geographic Scope | Western Visayas (Region VI), aligned to the existing HHP+ footprint, as national proof-of-concept |
| Priority Province | **[TO CONFIRM]** |
| Year-1 BHW Cohort | **[TO CONFIRM]** onboarded in Year 1; regional and national scale-up figures follow from the registry extract |
| Duration | 12 months — Year 1 of a proposed phased programme |
| Year-1 Contribution Sought | ₱6,000,000 envelope, **currently being re-costed for the Region VI scope** (see Section 13) |
| Government Counterpart | Platform ownership, the delivered Phase 1 registry, the built Phase 2 codebase, hosting pathway, content approval authority, field structures, supervision and post-project sustainment |
| Date | **[TO CONFIRM]** |

> **DRAFT — for internal review prior to submission**

---

## 1. At-a-Glance Summary

| | |
|---|---|
| What this is | Phase 2 of BHW Connect, the Department of Health's digital platform for Barangay Health Workers, owned and led by BLHSD. Phase 1 delivered the national BHW registry and profiled close to 300,000 BHWs nationwide in about a year, after roughly three decades without a complete national registry. Phase 2 turns that registry into a learning, training and certification platform. **The Phase 2 software is built and automatically tested; this proposal funds what stands between built software and a certified workforce.** |
| What is being added | (1) The HHP+ six-module curriculum authored as DOH-approved learning content. (2) Clinical validation and formal DOH approval of that content. (3) Regional provisioning, operational hardening and pilot-gate clearance. (4) Onboarding, supervision, certification and independent evaluation in one priority province of Region VI. |
| First content module | Community-based NCD screening under HHP+ / PhilPEN 2025 — an evidence-based, WHO-supported curriculum with an existing 29-criterion return-demonstration assessment instrument. It becomes the first DOH-approved learning module on the platform, and the template for those that follow. |
| Why this is low risk | The bureau has already delivered a national digital health system at scale; the users are already registered and organizationally located in the platform; and the Phase 2 software already exists, with 22 applied database migrations and more than 40 automated test suites. What remains is validation, approval, provisioning and rollout — not discovery, design or construction. |
| Why WHO | WHO has already financed the clinical substance: PhilPEN 2025 and PPSA capacity building, NCD flipcharts, job aids, monitoring tools, and a BHW training package now being contracted. That investment produces competency at a point in time. This platform is what keeps it current, measurable and national after the training contract closes. |
| Who owns it | DOH, through BLHSD, retains ownership of the platform, its source code, its data and all published content, subject to a Memorandum of Agreement executed before implementation. |
| Year-1 milestones | (1) Platform hardened, provisioned and through the pilot gate. (2) HHP+ curriculum digitized, clinically validated and DOH-approved. (3) Governance and content approval process established under MOA. (4) Certification rolled out — first cohort certified against the DOH return-demonstration standard. (5) Platform demonstrably ready to onboard the next DOH module. |
| Timeline | M1–3 mobilization, governance and hardening; M2–6 content authoring, clinical validation and DOH approval; M4–8 Wave 1 onboarding; M7–11 certification launch and Wave 2; M10–12 evaluation, handover and Year-2 plan. |
| Sustainability | Institutionalized through MOA and a departmental issuance, embedded in the BLHSD work and financial plan, hosted on government infrastructure, and staffed by trained BLHSD personnel — so continuity does not depend on the individuals or administrations in place today. |
| Long-term value | HHP+ is the first of many DOH-approved modules. ttCF (first 1,000 days), Immunization, Nutrition, Family Planning, Communicable Disease Surveillance, First Aid and BHW Administrative Procedures are already on the platform roadmap, each reusing the same engine at a fraction of Year 1's cost. |

---

## 2. Executive Summary

For roughly three decades, the Department of Health had no complete, current national record of its Barangay Health Worker workforce. BHW Connect Phase 1 — conceptualized and delivered by BLHSD — closed that gap: within about one year of rollout, close to 300,000 BHWs had been profiled nationwide, organizationally located from national down to barangay level.

This concept note proposes Phase 2: an always-available bilingual (Filipino / English / Taglish) Knowledge Base and Chat Guide, and a structured training and certification pathway, for that same workforce.

**Phase 2 is not a design awaiting a build.** Requirements, data model, architecture and user journeys were completed by BLHSD, and the resulting system has been implemented across sixteen increments — authentication against the existing registry, Knowledge Base authoring, the Chat Guide matching engine, admin dashboards and the gap-triage queue, e-learning with quizzes, an assessor queue, and QR-verified certification with a public verification endpoint — supported by 22 applied database migrations and more than 40 automated test suites. Every later module ships behind a feature flag defaulted off. The pilot launch gate has not been cleared, and no Barangay Health Worker is using the system in the field today.

What stands between built software and a certified workforce is not engineering. It is clinical content authored to DOH standard, formal DOH approval of that content, operational hardening and regional provisioning, and the field work of onboarding, supervising, assessing and evaluating a real cohort. That is what this proposal funds.

The **HHP+ community NCD screening curriculum** is proposed as the Year 1 flagship module — the first DOH-approved curriculum to be digitized, certified and served through the platform.

> **A Government Platform, Not a Programme-Specific Tool**
>
> BHW Connect is a DOH platform with its own mandate, roadmap, institutional home and a delivered national footprint. HHP+ is Year 1's flagship content domain, not the boundary of what the platform is.
>
> HHP+ was selected first because its curriculum is already defined, WHO-supported and about to be standardized, and because it already carries a formal assessment instrument — the fastest credible path to a fully worked, DOH-approved learning module.
>
> The Knowledge Base and Training & Certification architecture is generic by design. ttCF, Immunization, Nutrition, Communicable Disease Surveillance, Family Planning, First Aid and BHW Administrative Procedures are already committed on the roadmap, and require content authoring and DOH approval rather than re-engineering.

> **The Year-1 Ask**
>
> A ₱6,000,000 envelope over 12 months, **currently being re-costed for the Region VI scope**: a small core team, AI and developer tooling subscriptions, IT equipment, regional infrastructure, and independent monitoring and evaluation — itemized in Section 13.
>
> This does not include training-delivery costs, travel or per diem, or other programme implementation expenses. Those are counterpart contributions or funded separately.
>
> Ownership of the platform, its code, its data and its published content remains with DOH throughout, subject to a Memorandum of Agreement executed before implementation.

Year 1 is deliberately scoped to be achievable: it provisions the platform for region-wide availability and actively onboards a first cohort in one priority province of Region VI **[TO CONFIRM]**, with the field-tested playbook and government structures in place to scale regionally in Year 2. Western Visayas is proposed as proof-of-concept for a nationwide DOH programme, not a standalone deployment.

---

## 3. Problem Statement & Rationale

Barangay Health Workers are the Philippines' frontline community health cadre, and the platform on which primary health care ultimately depends. They carry an expanding programme load — maternal and child health, immunization, nutrition counselling, family planning, disease surveillance, NCD screening, first aid and routine reporting — with limited always-available reference support and no structured, nationally recognized pathway for training and certification.

Community-based NCD screening under HHP+ illustrates the gap precisely, and does so at a moment when it can still be acted on.

Healthy Hearts Plus is strengthening diabetes and hypertension integration into primary care in Western Visayas. Capacity building for physicians, nurses and NCD coordinators has been completed under PhilPEN 2025 and PPSA. Clinical job aids, NCD flipcharts and monitoring tools have been developed, field-tested and distributed. Region VI's own CHD already treats community screening — including capillary blood glucose monitoring with demonstration and return demonstration — as a Barangay Health Worker competency. A standardized BHW training package is now being contracted: six video-anchored modules across seven competency domains, delivered to all districts of Iloilo and one session in Guimaras, over five months.

**The clinical work is done, and it is good.** The gap is not the content. It is what carries the content afterwards.

A five-month training contract, executed perfectly, still leaves six things unresolved:

| | Gap | Why it persists |
|---|---|---|
| G1 | **Materials go stale** | Video modules are cut once. When guidance moves there is no mechanism to re-cut them and get the correction to people already trained. |
| G2 | **Cascade decay** | Trained representatives cascade to their peers. What each BHW actually receives depends on who retold it, and nothing measures the difference. |
| G3 | **The ceiling is arithmetic** | One contractor, five months, one province. Not a question of effort or of scoping judgement — of how many people five months can physically reach. |
| G4 | **No route to national** | The contract's final output is scale-up *recommendations*. A recommendation is not a mechanism; nothing carries the package to the rest of the country's BHWs. |
| G5 | **One competency, once** | Nothing is left standing to hold the next programme. Immunization, nutrition and MNCH each start again from zero. |
| G6 | **Paper competence** | The 29-criterion return-demonstration checklist is hand-scored and filed locally. There is no queryable record of which BHWs are competent, and no re-certification trigger. |

These are not defects in anyone's design. They are what happens to every training that ends. Section 21 returns to each of the six and states how the platform closes it.

Phase 1 answered the prior question — who and where the BHWs are — by profiling close to 300,000 of them nationwide. The question it does not answer is how they are supported, trained and certified once identified. Phase 2 answers that, beginning with HHP+.

---

## 4. Why HHP+ NCD Screening Is the Right First Module

Selecting the first module to digitize on a national platform is a consequential decision: it sets the content standard, the approval workflow and the certification design that every later module inherits. HHP+ community screening was selected on five grounds.

| Criterion | Why HHP+ meets it |
|---|---|
| Evidence base | Grounded in WHO HEARTS and operationalized nationally through PhilPEN 2025, with an established primary-care integration pathway. |
| Live implementation | Not a design on paper. HHP+ is being implemented in Western Visayas now, with facility-level capacity already built and job aids already in the field. |
| Structured curriculum | Six modules across seven competency domains, with defined learning objectives per module — a clearly bounded, sequenced curriculum that maps directly onto e-learning modules, quiz banks and a skills-demonstration checklist. |
| An assessment instrument that already exists | The DOH return-demonstration checklist for capillary blood glucose monitoring — 29 criteria, 87-point maximum, with competency bands at 90% and 75% — is already written. Digitizing it is faithful reproduction, not invention. |
| Alignment with national NCD priorities | Directly supports Universal Health Care implementation and the DOH NCD agenda, and complements rather than duplicates an in-flight WHO investment. |

The same recall burden and training gap exist across nearly every other programme a BHW is asked to run. HHP+ is simply the sharpest, most tractable starting point — and the one where a platform investment compounds an investment WHO has already made.

---

## 5. Why the World Health Organization

The rationale for this partnership is not financing alone. Among possible partners for the platform's first learning module, WHO holds a combination of assets that no other partner holds together.

| Partner asset | Contribution to this proposal |
|---|---|
| Prior investment in HHP+ | WHO has already financed the clinical substance — PhilPEN 2025 capacity building, NCD flipcharts, job aids, monitoring tools, and the BHW training package now being contracted. Digitizing that curriculum onto a platform that already reaches the national BHW workforce protects and extends the investment rather than duplicating it, and converts a time-bound contract output into a permanent government asset. |
| Normative authority | WHO's guidance on optimizing community health worker programmes calls for competency-based training, certification, supportive supervision and workforce data. This platform is a country mechanism for all four, and can be documented as such. |
| Technical validation capacity | The training package's own scope already defines a technical review and validation step with WHO. Extending that review to the digitized curriculum is a marginal addition to a process that exists. |
| Convening power | WHO's standing with DOH, BLHSD and CHD Region VI is what carries a regional training package into a national platform commitment. |
| Contribution to institutionalization | By supporting digitization on a DOH-owned national platform under a formal MOA, WHO contributes directly to institutionalizing HHP+ competency within the government system — the outcome most externally funded community health programmes struggle to secure at closeout. |

> **Catalytic, Not Custodial**
>
> The partner's role is to catalyze a government-led programme, not to own or operate the platform. Funding is concentrated in a 12-month window; ownership, approval authority and long-term operation sit with DOH from day one and remain there after closeout.

---

## 6. Strategic Alignment

### Philippine government priorities

The proposal operationalizes frontline delivery under the Universal Health Care Act (RA 11223), supports the DOH NCD prevention and control agenda through PhilPEN 2025, complements the DOH digital-health agenda and primary-care thrust, contributes to the BHW workforce development agenda under RA 7883 and its successor policy directions, and is anchored in an existing DOH bureau rather than a parallel structure.

### WHO priorities

- **HEARTS technical package** — community screening is the entry point to the HEARTS pathway; this makes that entry point competent and measurable.
- **Community health worker guideline (2018)** — competency-based pre-service training, certification, supportive supervision and workforce data, delivered as a country implementation.
- **Global strategy on digital health** — a government-owned digital public good on open standards, country-led and institutionally housed.
- **Universal Health Coverage** — extending assured quality of primary care to the last mile.

### Sustainable Development Goals

- **SDG 3 (Good Health & Well-being)** — directly supports 3.4 (premature NCD mortality) through earlier detection and more reliable referral.
- **SDG 5 (Gender Equality)** — empowers and professionalizes a predominantly female frontline health cadre.
- **SDG 4 (Quality Education)** — structured, certified lifelong learning for community health workers.
- **SDG 9, 10 and 17** — a government-owned digital public good, extended toward Geographically Isolated and Disadvantaged Areas.

---

## 7. Project Goal & Objectives

### Goal

To operationalize BHW Connect — the Department of Health's existing and already-built digital platform for Barangay Health Workers — as a national digital learning, training and certification system, launched with the HHP+ community NCD screening curriculum as its Year 1 flagship learning module in Western Visayas, as proof-of-concept for nationwide scale-up and multi-programme content expansion.

### Specific objectives

- **Objective 1 — Harden and provision the existing platform:** complete operational hardening, clear the pilot launch gate, scale the Chat Guide and Knowledge Base to regional availability, and onboard a first cohort in one priority province of Region VI **[TO CONFIRM]**, establishing the playbook to reach the region.
- **Objective 2 — Author, validate and publish the HHP+ curriculum:** the six modules as e-learning content and Knowledge Base entries, the return-demonstration instrument digitized faithfully, all routed through clinical review and formal DOH approval.
- **Objective 3 — Launch certification:** assessor-graded skills demonstration against the DOH standard, with QR-verified certificates written to the national registry.
- **Objective 4 — Establish governance, ownership and the content approval process:** a DOH-chaired steering structure, a documented content development and approval workflow, and an MOA defining ownership, roles and post-project stewardship.
- **Objective 5 — Strengthen BLHSD and LGU capacity** to administer, govern and sustain the platform, with documented runbooks and trained government administrators.
- **Objective 6 — Demonstrate readiness for the next module:** prove the architecture as a reusable platform capability, ready to onboard additional DOH-priority topics without re-engineering.

---

## 8. Theory of Change

If Barangay Health Workers are given an always-available bilingual job aid and a structured, certified training pathway — built into, and owned by, the government structure that supervises them — then they will deliver community-based NCD screening more consistently and confidently, contributing to earlier detection and more reliable referral for hypertension and diabetes, in a model that can be extended to other health programmes and scaled nationally.

| Results level | Description |
|---|---|
| Inputs | Partner financing for a core team, subscriptions, equipment, infrastructure and M&E; the delivered Phase 1 registry and its nearly 300,000 profiled BHWs; **the built Phase 2 codebase**; the HHP+ curriculum, job aids and return-demonstration instrument; BLHSD, CHD and LGU counterpart structures. |
| Activities | Harden and provision the platform; author and clinically validate HHP+ content; secure DOH content approval; clear the pilot gate; onboard BHWs; run assessor-graded certification; train BLHSD and LGU staff; establish governance under MOA. |
| Outputs | A regionally available, pilot-gated platform; a published, DOH-approved HHP+ learning module; an operational certification pathway; a first cohort of onboarded and certified BHWs; trained government administrators; an established content approval process. |
| Outcomes | BHWs get reliable answers at the point of care and complete structured, certified NCD screening training; BHW knowledge, confidence and consistency improve; competency becomes queryable at every tier; BLHSD operates the platform independently. |
| Impact | Contribution to earlier NCD detection and more reliable referral across Western Visayas — and a proven, government-owned national learning platform ready for further modules and nationwide scale. |

---

## 9. Platform Readiness: A Delivered Phase 1, a Built Phase 2

The strongest argument for this proposal is not the design of Phase 2. It is that Phase 1 was delivered and Phase 2 already exists as working software.

### 9.1 What Phase 1 achieved

For roughly three decades, the Department of Health had no complete, current, nationally consolidated record of the Barangay Health Worker workforce. Successive attempts — paper-based, spreadsheet-based and locally maintained — did not produce one. Planning, deployment, incentive administration, training targeting and workforce policy were all conducted against incomplete numbers.

BHW Connect Phase 1 solved that. Conceptualized and delivered by BLHSD, it established the national BHW registry and profiling system — organizational hierarchy from national down to barangay level, individual BHW profiles, and roll-up reporting at every tier. Within approximately one year of rollout, close to 300,000 Barangay Health Workers had been profiled nationwide.

*Supporting evidence — registry extract date, profile completeness rate and active-login rate — to be attached as an annex:* **[TO CONFIRM]**

> **Why this matters for Phase 2**
>
> **Proven government delivery.** BLHSD has already taken a national digital health system from concept to nationwide adoption at scale. This is not a bureau proposing its first platform.
>
> **The users already exist.** Nearly 300,000 BHWs are identified, profiled and organizationally located. Onboarding for Phase 2 is activation of known, registered users — not recruitment from an empty database, which is where most digital-health platforms fail. Converting a registry record into an active learner remains real work, and is budgeted and measured as such.
>
> **The backbone is built and populated.** Identity, organizational hierarchy, geographic assignment and administrative reporting all exist. Phase 2 plugs learning, support and certification into a spine already carrying national data.
>
> **A demonstrated adoption pathway.** The CHD, LGU and BHW mobilization channels that delivered nationwide profiling in a year are the same channels that deliver Phase 2 onboarding.

### 9.2 What Phase 2 adds — and its true build status

This section supersedes the corresponding section of the earlier concept note edition, which described Phase 2 as awaiting construction. That is no longer accurate.

Phase 2 has been implemented across sixteen increments and is supported by 22 applied database migrations and more than 40 automated test suites, together with error tracking, performance budgets enforced in CI, and automated accessibility testing.

| Status | Capability |
|---|---|
| **Built and tested** | Authentication against the existing registry, org hierarchy and role-based access; DPA consent gating; admin console for user management with a laymanized audit trail; Knowledge Base authoring (bilingual, with named owners and review-due dates); the Chat Guide matching engine (normalization, synonym expansion, full-text and trigram ranking, Taglish tolerance) and its interface; admin dashboards with the gap-triage queue; reports and analytics with export; settings, accessibility and first-run onboarding; operational hardening including feature flags, error tracking, backup and tested restore, DPA data-rights actions and a breach playbook; e-learning with mixed text/video/quiz modules and configurable pass marks; an assessor role and open assessment queue; QR-verified certification with a public, unauthenticated verification endpoint; announcements, surveys, an interactive forum, a flip-chart builder, offline/PWA caching and in-app notifications. |
| **Built, not yet switched on** | Every later module ships behind a feature flag defaulted off. The pilot launch gate — a published-content threshold, real users provisioned, all increment definitions-of-done re-verified on production, and a KPI baseline captured — has not been cleared. **No Barangay Health Worker is using the system in the field today.** |
| **Not built, and funded here** | The HHP+ curriculum as authored, clinically validated, DOH-approved content. Regional infrastructure provisioning at cohort scale. Pilot-gate clearance. Onboarding, supervision, assessor mobilization and certification of a real cohort. Independent baseline, midline and endline evaluation. Live integration with the external profiling system, which remains blocked on technical access. |

**We invite independent technical due diligence on the codebase before signature.** It is the fastest way to convert this section from a claim into a verified fact, and it is offered rather than waited for.

| Dimension | Phase 1 — Delivered | Phase 2 — Built, awaiting validation and rollout |
|---|---|---|
| Purpose | Identify, register and profile the national BHW workforce | Support, train and certify that same workforce |
| Core capability | National registry and profiling; hierarchy from national to barangay; profile records and roll-up reporting | Rule-based bilingual Chat Guide; Knowledge Base; content administration console; e-learning, quiz banks, assessor-graded skills demonstration and QR-verified certification |
| Result | Close to 300,000 BHWs profiled nationwide within about one year | Those same BHWs given an always-available job aid and a certified competency pathway, beginning with HHP+ |
| Content | Administrative and demographic profile data | DOH-approved bilingual learning content and curricula — **none yet authored or approved; this is the critical path** |
| Content governance | Administrative data standards | Formal content development, technical review, DOH approval and periodic update workflow (Section 10.5) |
| User base | Established — BHWs registered and organizationally located nationwide | Activation of already-registered users rather than recruitment from zero |
| Status | Delivered and operating under BLHSD | Implemented and automatically tested; behind feature flags; pilot gate not cleared |

### 9.3 What this proposal funds

Because the software exists, the critical path is not engineering. It is **content, approval, provisioning and field delivery** — in that order. The Year-1 personnel line is accordingly justified as content authoring, clinical coordination, operational hardening and rollout support, not as construction of a new system. Section 13 restates the budget on that basis.

### 9.4 Designed to hold more than HHP+

Knowledge Base categories, question-and-answer entries, long-form articles and the Training & Certification module are all implemented as generic platform structures, not HHP+-specific ones. Adding a new health topic is a content-authoring and DOH-approval exercise, not a re-engineering effort. ttCF, Immunization, Nutrition, Communicable Disease Surveillance, Family Planning, First Aid and BHW Administrative Procedures are already committed on the roadmap, with sequencing driven by real Chat Guide demand rather than a fixed order set in advance.

**Disclosure:** BLHSD is approaching more than one partner across this catalogue, module by module, and will state this openly in any agreement. Each module is separately scoped and separately funded; no partner is asked to fund another partner's module, and no module is represented as delivered until it is published and DOH-approved.

---

## 10. Implementation Framework

> **Delivery Modality — Direct Support, Not Third-Party Outsourcing**
>
> This proposal funds personnel and IT resources that work directly for and with BLHSD, under BLHSD supervision. It is not a commission to an external vendor to build and operate the platform at arm's length. Capacity, content and the system itself stay within the government structure that will sustain them after closeout.
>
> *Instrument note:* the appropriate WHO contracting instrument is to be agreed. A deliverable-based agreement with defined outputs, acceptance criteria and payment tranches is proposed in Section 10.4; BLHSD is open to restructuring the engagement to fit WHO procurement rules, and asks that this be settled early rather than at signature.

### 10.1 Governance structure

| Body | Composition | Mandate |
|---|---|---|
| Project Steering Committee | Chaired by BLHSD (Director or designated Section Chief); members from WHO, CHD Western Visayas, and DICT or DOH KMITS as appropriate | Overall oversight and strategic direction; approval of annual work plans and budgets; go/no-go decisions at phase gates; resolution of escalated issues; endorsement of Year-2 continuation. Meets quarterly. |
| Technical Working Group | Led by BLHSD Equity in Health and Special Concerns Section; technical staff from WHO, the funded core team, the HHP+ training contractor, and CHD/LGU representatives | Day-to-day coordination and technical decision-making; monitoring against the workstream matrix; risk tracking; preparation of Steering Committee papers. Meets monthly. |
| Content Review Panel | Convened by BLHSD, with DOH programme experts (NCD and related bureaus), WHO technical staff, and clinical reviewers | Technical review and clearance of all learning content prior to DOH approval and publication; periodic review of published content. Meets as content batches are submitted. |

### 10.2 Roles, responsibilities and ownership

Ownership of the platform, its source code, its database, and all content published on it rests with the Department of Health throughout the engagement and after it, subject to an MOA executed before implementation begins.

| Institution | Role | Specific responsibilities |
|---|---|---|
| DOH / BLHSD | Platform owner and implementation lead | Owns the platform, code, data and content; chairs governance bodies; supervises the funded team; approves all learning content for publication; issues policy instruments; provides field structures through CHDs and LGUs; assumes hosting, maintenance and staffing at closeout. |
| WHO | Technical and financing partner | Provides Year-1 financing; technical review and validation of the digitized curriculum against HEARTS and PhilPEN 2025; normative positioning; convening with DOH and CHD; participates in the Steering Committee; receives narrative and financial reporting. |
| HHP+ training contractor | Content counterpart | Coordination so the digitized curriculum and the delivered training package remain a single standard rather than two divergent ones. |
| LGUs and CHD Western Visayas | Field implementation counterparts | Mobilize and endorse BHWs for onboarding; host assessor-graded skills demonstrations; provide local supervision and follow-through; nominate staff for administrator training. |

The MOA will make explicit, at minimum: DOH ownership of the platform, source code, database and published content; intellectual property arrangements for HHP+-derived learning materials; data governance and Data Privacy Act responsibilities; the content approval authority of DOH; the disposition of equipment at closeout; and the government's commitment to sustain the platform after the engagement ends.

### 10.3 Workstream matrix

| Workstream | Scope | Lead | Key Year-1 deliverables |
|---|---|---|---|
| WS1 — Hardening & Provisioning | Operational hardening; pilot-gate clearance; regional infrastructure provisioning; performance and security | Platform engineer, under BLHSD technical supervision | Pilot gate cleared; regional provisioning complete; backup, restore and breach playbook re-tested at cohort scale |
| WS2 — Content & Curriculum | HHP+ Knowledge Base authoring; six e-learning modules; quiz banks; digitized return-demonstration instrument | KB Content & Training Coordinator, with WHO and contractor technical input | Published bilingual entries to the launch threshold; complete HHP+ course; DOH approval secured |
| WS3 — Certification Rollout | Assessor mobilization, queue operation, grading and certificate issuance | Platform engineer with BLHSD | Certification operational; first cohort certified; certificate verification live |
| WS4 — Rollout & Change Management | Wave 1 and Wave 2 BHW onboarding; LGU coordination; user support | BLHSD with CHD and LGU field structures | Cohort onboarded **[TO CONFIRM]**; activation and weekly-active targets met; onboarding playbook documented |
| WS5 — Governance & Institutionalization | MOA; steering and review bodies; content approval SOP; policy instruments | BLHSD Equity in Health and Special Concerns Section | MOA executed; governance bodies convened; content approval SOP adopted; draft departmental issuance prepared |
| WS6 — M&E and Learning | Baseline, midline, endline; independent review; evidence brief | M&E consultant, reporting to the TWG | Baseline report; midline course-correction; endline and independent review; Year-1 evidence brief |

### 10.4 Implementation timeline with go/no-go gates

| Phase | Months | Key activities | Gate |
|---|---|---|---|
| 1 — Mobilization & Governance | M1–3 | Execute the MOA; convene the three governance bodies; adopt the content approval SOP; recruit the core team; procure equipment; complete hardening; provision regional infrastructure; collect baseline | **Gate 1:** MOA executed, governance convened, baseline captured |
| 2 — Content Development & Approval | M2–6 | Author and clinically validate the HHP+ curriculum; digitize the return-demonstration instrument; design quiz banks and assessor protocol; route all content through technical review and DOH approval | **Gate 2:** DOH approval of the full six-module curriculum; pilot launch gate cleared |
| 3 — Wave 1 Rollout | M4–8 | Onboard the first cohort through existing DOH, LGU and CHD structures; Chat Guide and Knowledge Base available to Wave 1; tune matching quality from real gap-queue data | **Gate 3:** activation target met on Wave 1 |
| 4 — Certification Launch & Wave 2 | M7–11 | Launch certification; run assessor-graded skills demonstrations; issue the first QR-verified certificates; expand onboarding within the priority province | **Gate 4:** first cohort certified |
| 5 — Consolidation & Year-2 Plan | M10–12 | Midline and endline measurement and independent review; capacity handover to BLHSD and LGU staff; Year-1 evidence brief; draft departmental issuance; Year-2 scope | **Gate 5:** endline complete, handover documented |

Payment tranches are proposed to follow acceptance at these gates.

### 10.5 Content development and approval process

No content reaches a Barangay Health Worker without DOH clearance. This workflow governs every learning module on the platform, beginning with HHP+, and is adopted as a BLHSD Standard Operating Procedure.

| Step | Stage | Responsible | What happens |
|---|---|---|---|
| 1 | Content development | KB Content & Training Coordinator, with WHO and contractor technical input | Draft Knowledge Base entries, e-learning modules, quiz items and skills-demonstration checklists, sourced from the authoritative HHP+ curriculum, PhilPEN 2025 and DOH guidelines. Bilingual drafting from the outset. |
| 2 | Technical review | Content Review Panel — DOH programme experts and clinical reviewers, with WHO validation | Clinical accuracy, alignment with current DOH and HEARTS guidance, language appropriateness and pedagogical soundness. Comments returned for revision; content may cycle here more than once. |
| 3 | DOH approval | BLHSD, through the designated approving official | Formal clearance for publication. Recorded in the platform's audit trail, with approving official and date attached to each content item. |
| 4 | Publication | BLHSD platform administrators | Approved content published and available to onboarded BHWs. Version and approval metadata retained. |
| 5 | Periodic update | KB Content & Training Coordinator, with Content Review Panel | Scheduled stale-content review at defined intervals, plus triggered review when DOH guidelines change or the gap queue reveals recurring unmet questions. Re-approval follows the same route. |

**This workflow is the answer to G1.** A guidance change is an edit routed through review and approval, not a reprint and redistribution exercise.

---

## 11. Technical Approach

### Pillar 1 — Chat Guide and the gap-detection loop

A BHW asks a question in Filipino, English or Taglish and receives an answer from the Knowledge Base, matched through normalization, synonym expansion, full-text ranking and trigram similarity, with no paid AI in this answer path. When no confident match exists, the exchange is logged to the administrative gap-triage queue, themed and counted, so the Knowledge Base grows from real BHW demand.

**On AI answering a BHW directly:** the platform supports a retrieval-grounded AI fallback, but **whether it is enabled for BHW-facing use in Year 1 is a DOH clinical-governance decision, not a technical default.** The conservative path — the system says it has no answer yet, and logs the question — is what Year 1 proposes to ship. If DOH and WHO agree to enable the fallback, it would require its own clinical governance framework, escalation and harm-reporting pathway, and explicit sign-off before activation. No AI-generated content is ever promoted into the permanent Knowledge Base without technical review and DOH approval.

### Pillar 2 — Training and Certification

An HHP+-aligned e-learning course mapped to the six modules, combining short video and text with per-module quizzes at a DOH-set pass mark. On completing the online modules, a BHW proceeds to an in-person skills demonstration graded by a qualified assessor from an open queue, against the DOH return-demonstration instrument reproduced faithfully — 29 criteria, 87-point maximum, competency bands at 90% and 75%. Certification is automatic on a passing grade: a downloadable, QR-verified certificate checkable for authenticity without a login, and written to the BHW's registry profile.

**Recognition status:** the legal standing of the credential — its recognition under RA 7883, its relationship to BHW incentives and accreditation, and the liability position — is a policy step proposed to be taken with WHO during Year 1. It is not assumed.

### Pillar 3 — Usage insights and early-signal alerting

Every Chat Guide question is logged, matched or not, with a normalized theme and a frequency count. A lightweight spike detector notifies BLHSD content administrators when a theme's ask-count crosses its recent baseline, and a monthly Usage Insights Brief summarizes top themes, gap trends and flagged spikes.

**This is a demand signal, not disease surveillance.** It is a human-in-the-loop flag for content and supervision priorities — explicitly not an automated diagnosis, outbreak detection or outbreak declaration, and it should not be described as such.

### Gender and social inclusion

The Philippine BHW workforce is overwhelmingly women. The platform advances inclusion by professionalizing a largely female, often-volunteer cadre with a recognized certification credential; by lowering barriers through accessibility designed in from the outset, including a bilingual interface, adjustable font size, and high-contrast and dark modes, with automated accessibility testing in CI; and by extending reach toward Geographically Isolated and Disadvantaged Areas through offline/PWA access and satellite connectivity for the field team. Sex-disaggregated data on BHW participation and certification will be collected and reported.

### AI usage — transparency note

Subscriptions fund developer productivity and administrative content drafting assistance, both fully human-reviewed before anything is published, and the optional Chat Guide gap-fallback described above. Modelled fallback cost is approximately ₱4,000–43,000 per year across a realistic gap-rate range, and under ₱43,000 even in an unrealistic scenario where every question is AI-answered — comfortably inside the tooling line. The platform's default, zero-marginal-cost answer path remains the rule-based engine.

---

## 12. Cost- and Resource-Sharing Framework

| Contribution area | WHO | DOH / BLHSD and LGUs |
|---|---|---|
| Financial | Year-1 envelope for content, validation, hardening, provisioning, equipment and independent M&E | The delivered Phase 1 registry and its nearly 300,000 profiled records; **the built Phase 2 codebase, funded by BLHSD at its own cost**; personnel time of BLHSD and CHD staff; office space and utilities; post-project hosting and maintenance budget from closeout onward |
| Technical | HHP+ curriculum, job aids and the return-demonstration instrument; technical review and validation against HEARTS and PhilPEN 2025; normative positioning; M&E oversight | Platform concept, architecture, technical design and implementation; DOH clinical and programme expertise; content approval authority; data governance and DPA compliance; digital-health standards alignment |
| Human resources | Financing for the core team; technical staff time for content validation | Supervision of the funded team; BLHSD administrators and content owners; CHD and LGU field structures for BHW mobilization; assessors for skills demonstrations |
| Institutional | Participation in the Steering Committee; reporting and accountability; catalytic positioning of the model for replication | Chairmanship of governance bodies; execution of the MOA; issuance of policy instruments; institutionalization pathway toward a departmental issuance and budget line |
| Sustainability | Year-1 financing only; no continuing obligation assumed beyond agreed reporting | Ownership of the platform in perpetuity; hosting, maintenance, staffing and content upkeep after closeout; commitment to continue certification and module expansion |

---

## 13. Budget Summary (Year 1)

> **Status of this budget**
>
> The ₱6,000,000 envelope below is carried from the earlier concept note edition, which was costed for a different region, a different module and a different cohort size. **It is presented as an envelope and a cost structure, not a final price.** The re-cost for Region VI depends on three figures not yet supplied — priority province, Year-1 BHW cohort, and the resulting cost per BHW reached — and BLHSD proposes agreeing those parameters with WHO before a final figure is fixed.
>
> Section 9.3 also changes what the personnel line buys: because the platform is built, it funds content authoring, clinical coordination, hardening and rollout support, **not construction of a new system.** That should reduce rather than increase the engineering component, and the re-cost is expected to reflect it.

| Line item | Basis | Amount (₱) |
|---|---|---|
| **1. Personnel** | | |
| Platform / engineering support (full-time) | Hardening, provisioning, release and support — not new construction | 780,000 |
| KB Content & Training Coordinator (full-time) | Authoring, clinical coordination, approval routing | 780,000 |
| Senior engineer (output-based) | Deliverable-based, ~12 months | 1,000,000 |
| M&E / Training & Certification consultant (output-based) | Deliverable-based, ~12 months | 1,000,000 |
| *Subtotal — Personnel* | *59%* | *3,560,000* |
| **2. AI / developer tooling subscriptions** | | 480,000 |
| **3. IT equipment** | Laptops, tablets, satellite connectivity hardware and subscription | 590,000 |
| **4. Infrastructure and hosting** | Regional cloud hosting, database scale-up, monitoring, backups, domain and SSL | 480,000 |
| **5. Monitoring and evaluation** | Baseline, midline, endline and independent review | 540,000 |
| **6. Contingency** | Standard provision for a first-year single-province rollout | 350,000 |
| **ENVELOPE TOTAL (Year 1)** | | **6,000,000** |

Cost per BHW reached: **[TO CONFIRM]** — computable once the Year-1 cohort is fixed, and proposed as the primary value-for-money comparator against the per-BHW cost of the training package.

Equipment disposition at closeout, and eligibility of capital items under the chosen instrument, to be settled in the MOA.

---

## 14. Year-1 Success Milestones

| No. | Milestone | What it means | Verification |
|---|---|---|---|
| 1 | Platform hardened, provisioned and pilot-gated | Operational hardening complete; infrastructure provisioned for region-wide availability; pilot launch gate cleared; first cohort onboarded in the priority province | Provisioning records; gate checklist; platform analytics; onboarding records |
| 2 | HHP+ digitized and DOH-approved | Full six-module curriculum published as Knowledge Base content and e-learning modules, with the return-demonstration instrument digitized faithfully, cleared through technical review and formally approved by DOH | Content approval records with approving official and date; published content inventory |
| 3 | Governance established | MOA executed; Steering Committee, Technical Working Group and Content Review Panel convened; content approval SOP adopted by BLHSD | Signed MOA; minutes; adopted SOP |
| 4 | Certification rolled out | Assessor-graded skills demonstrations conducted against the DOH standard; first cohort certified with QR-verified credentials written to the registry | Certification records; certificate verification logs |
| 5 | Readiness for the next module demonstrated | Architecture proven end to end on one programme; content pipeline and approval route operating; the next DOH-priority module scoped and ready | Year-1 evidence brief; Year-2 scope endorsed by the Steering Committee |

---

## 15. Results Framework and M&E

Targets reflect a single-province Year 1 and are sex-disaggregated where applicable. Absolute targets marked **[TO CONFIRM]** follow from the agreed cohort size.

| Results level & indicator | Baseline | Year-1 target | Means of verification |
|---|---|---|---|
| IMPACT — Contribution to earlier NCD detection and more reliable referral | HHP+ programme M&E | Contributory, not solely attributed | HHP+ programme monitoring |
| OUTCOME 1 — BHWs actively use the platform in screening work | 0 (new cohort) | Activation ≥70% of onboarded cohort; weekly active ≥60% | Platform analytics |
| OUTCOME 2 — BHWs obtain reliable, timely answers | Not applicable | Deflection ≥70% by end of Year 1; answer quality ≥80% | Platform analytics and user feedback |
| OUTCOME 3 — BHW screening knowledge and confidence improve | To be set via baseline assessment | ≥25% relative pre-to-post improvement | Pre/post knowledge assessment |
| OUTPUT 1 — Approved learning content published | 0 | ≥150 published bilingual, DOH-approved NCD screening entries; full six-module course | Admin content and approval records |
| OUTPUT 2 — Certification operational | 0 | Module launched; **[TO CONFIRM]** BHWs certified (target 20% of onboarded cohort) | QR-verified certification records |
| OUTPUT 3 — Platform provisioned regionally | Single-site readiness | 1 priority province **[TO CONFIRM]**; cohort onboarded **[TO CONFIRM]** | Provisioning and onboarding records |
| OUTPUT 4 — Government capacity strengthened | 0 | ≥15 BLHSD and LGU staff trained; runbooks delivered | Training and handover records |
| OUTPUT 5 — Governance institutionalized | 0 | MOA executed; governance bodies convened; content approval SOP adopted | Signed MOA; minutes; adopted SOP |
| OUTPUT 6 — Usage insights operational | 0 | Monthly Usage Insights Brief from Month 4; theme-spike alerts operational | Admin dashboard records; brief archive |

A baseline covering BHW digital readiness and NCD screening knowledge and practice is established in Phase 1; a midline review at approximately Month 6 informs course-correction; an endline plus independent review at Month 11–12 assesses Year-1 results and informs the Year-2 decision. Platform analytics provide continuous monitoring against the outcome indicators.

---

## 16. Value for Money

- **The most expensive stage is already paid for.** The national user base exists and is profiled, and the Phase 2 software is built — both at government cost. Financing goes to content, approval, deployment and evaluation rather than to discovery, design, construction and user acquisition.
- **Low marginal cost at scale.** The rule-based Chat Guide answers matched questions at no per-query cost, so serving a region — and later the national base — incurs no per-query licensing. The optional AI fallback is modelled at ₱4,000–43,000 per year.
- **Reusable architecture.** Each subsequent learning module reuses the same engine, so the second, third and fourth modules cost a fraction of the first.
- **No vendor lock-in.** The platform runs on a portable, open-standard Postgres core. Migration onto government infrastructure is intended and designed for, subject to a hosting agreement with DOH KMITS; it is a real project with a real cost, not a zero-effort switch.
- **It compounds an existing investment.** The clinical content WHO has already financed becomes permanent, current and national rather than frozen at month five.

---

## 17. Sustainability and Institutionalization

Sustainability is treated here as an institutional design problem, not a closing assurance. The question this section answers is specific: what keeps BHW Connect running, funded and governed after partner financing ends and after the officials who champion it today have moved on?

### 17.1 Post-project governance and ownership

- **Ownership from day one.** DOH, through BLHSD, owns the platform, its source code, its database and all published content throughout and after the engagement, established in the MOA rather than negotiated at closeout.
- **Governance survives the project.** The Content Review Panel and the content approval SOP are BLHSD instruments, not project structures. They continue after the Steering Committee dissolves.
- **A named institutional home.** The Equity in Health and Special Concerns Section of BLHSD is the permanent owner in the DOH structure, with platform administration assigned as a defined function rather than an individual's initiative.

### 17.2 Maintenance, staffing and budget

- **Capacity transfer during Year 1.** Platform administration, the weekly content ritual, and assessor and certification workflows are progressively handed to BLHSD and LGU staff, with documented runbooks and at least 15 trained government administrators.
- **Hosting on government infrastructure.** The open, non-proprietary stack is designed to migrate onto DOH or government servers, subject to a KMITS hosting agreement, removing dependence on donor-funded subscriptions.
- **A budget line, not a hope.** BLHSD commits to programming recurring hosting, maintenance and content-upkeep costs into its annual work and financial plan from the closeout year onward, and to pursuing a dedicated budget line through the regular DOH budget process. Steady-state annual run cost: **[TO CONFIRM]** — to be stated in pesos, with its work-and-financial-plan line and its status in the budget cycle.
- **Modest recurring cost.** Because the answer engine is rule-based and the stack is open, steady-state cost is dominated by hosting and staff time already inside the bureau, not by per-user licensing.

### 17.3 Continuity through political and leadership transitions

- **Institutionalize through issuance, not personality.** Year-1 governance work produces a draft departmental issuance covering mandate, ownership and content approval authority.
- **Bind commitments in the MOA.** Ownership, data, content approval authority, equipment disposition and post-project sustainment obligations are documented between institutions, not in informal understanding between individuals.
- **Anchor in a career bureau.** BLHSD is a permanent DOH bureau staffed largely by career personnel.
- **Document everything.** Runbooks, the content approval SOP, architecture documentation and administrator training materials are project deliverables.
- **Design for workforce turnover.** BHW and local official turnover is expected, not exceptional. Self-service onboarding, refresher pathways and re-certification are built in.
- **Multi-level ownership.** The platform serves national, regional, provincial, city or municipal and barangay levels simultaneously, so a change at any one level does not strand the system.

---

## 18. Policy Contribution

| Policy / institutional commitment | What it delivers |
|---|---|
| Knowledge Base Content Governance SOP | Formalizes the content development, technical review, DOH approval, publication and periodic update workflow into an adoptable BLHSD Standard Operating Procedure — usable for HHP+ and every later module. |
| BHW Digital Competency & Certification Framework (proposal) | Drafts, from the Year-1 HHP+ certification pilot, a proposed national framework for structured BHW competency certification — e-learning, in-person skills demonstration and verified credential — including its intended standing under RA 7883, for DOH consideration. |
| Data Privacy & Data-Rights Compliance Playbook | Formalizes the platform's consent, retention and breach-notification mechanics into a BLHSD-adoptable data-governance playbook for BHW-facing digital tools generally. |
| Year-1 Evidence Brief | Compiles Year-1 M&E results into a policy brief supporting continued national investment in digital BHW support. |
| Departmental issuance on institutionalization | Drafted in Year 1 and targeted for adoption thereafter, establishing BHW Connect's mandate, ownership and nationwide applicability within DOH policy. |

---

## 19. Risk Management and Key Assumptions

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Change in DOH or BLHSD leadership shifts priorities | Medium | High — continuity and budget | Institutionalize through MOA and a departmental issuance rather than personal endorsement; anchor in a career bureau; embed maintenance in the bureau work and financial plan |
| Change in local political leadership after elections withdraws LGU cooperation | Medium | Medium — rollout pace | Secure LGU commitments through CHD-endorsed arrangements rather than individual officials; sequence onboarding toward committed LGUs first |
| Turnover of barangay officials and BHWs erodes the onboarded cohort | High | Medium — sustained use | Self-service onboarding, refresher content and re-certification designed in; activation monitored continuously so attrition is visible early |
| **Registry records do not convert into active users** | **Medium** | **High — the core adoption assumption** | Activation is an explicit, measured Year-1 target, not an assumption; onboarding is budgeted and staffed; a registry record is treated as a lead, not a user |
| Delay in MOA execution stalls implementation | Medium | High — start-up | MOA drafting begins before Year 1; activities not requiring the MOA are sequenced first; legal review engaged early on both sides |
| Content approval bottleneck delays publication | Medium | High — blocks launch | Content Review Panel convened in Phase 1 with a defined cadence and service standard; content submitted in batches; approval status tracked |
| Learning content not authored fast enough | High | Blocks scale | Authoring funded as a named full-time role from Phase 1; launch gate enforced; existing HHP+ curriculum materials reduce drafting effort |
| **Divergence between the digitized curriculum and the contracted training package** | **Medium** | **High — two competing standards** | Contractor represented on the TWG; digitization is faithful reproduction, reviewed jointly; single approved standard is a Gate 2 condition |
| Taglish matching quality disappoints at scale | Medium | Core user experience | Fixture test corpus and tunable weights; synonym dictionary grows from real gap-queue data |
| Connectivity and device access in GIDA | Medium | Reach and equity | Low-end-phone responsive design; offline/PWA implemented; Wave 1 prioritizes connected sites; satellite connectivity for the field team |
| Infrastructure limits under load | Medium | Outage risk | Budget funds infrastructure scale-up ahead of rollout, not reactively |
| Data Privacy Act obligations at scale | Low | Legal | Consent, retention and data-subject rights implemented; breach playbook complete; NPC registration and DPIA status to be confirmed (Annex B) |
| **Certificate lacks legal recognition** | **Medium** | **Medium — perceived value** | Recognition pathway pursued as an explicit Year-1 policy deliverable with WHO, rather than assumed |

### Key assumptions

- An MOA between DOH and WHO can be executed within the first quarter of implementation.
- BLHSD provides supervision, endorsement and access to LGU and BHW structures for onboarding.
- LGUs cooperate in provisioning and mobilizing BHWs in the priority province.
- Basic mobile connectivity is available at Wave-1 onboarding sites.
- Qualified NCD experts are available to validate clinical content within the timeline.
- The HHP+ training contractor and BLHSD can align on a single curriculum standard.

---

## 20. Long-Term Platform Value and Scale-Up

> **Vision, Not a Multi-Year Funding Request**
>
> Years 2 to 5 describe the potential this Year-1 investment unlocks. They are not a committed budget ask — only the Year-1 envelope is requested here. Each subsequent year would be scoped and proposed on its own merits, informed by evidence.

HHP+ is the first of many DOH-approved learning modules, and this is the central long-term argument. Once the content pipeline, the approval workflow and the certification engine are operating, every additional module is a content and approval exercise on an established system, not a new build. Growth runs on two axes at once — more BHWs, provinces and regions reached, and more health-topic content available on the same platform.

| Year | Status | Scale and content growth |
|---|---|---|
| Year 1 | This ask | SCALE: one priority province, Region VI **[TO CONFIRM]**. CONTENT: HHP+ NCD screening live as the platform's first DOH-approved module, proven end to end. |
| Year 2 | Vision | SCALE: regional saturation across Western Visayas; first adjacent-region expansion. CONTENT: ttCF and Immunization added. |
| Year 3 | Vision | SCALE: multi-region expansion; profiling-system integration; offline access for low-connectivity barangays. CONTENT: Nutrition and Family Planning added. |
| Year 4 | Vision | SCALE: national expansion across additional DOH regions. CONTENT: Communicable Disease Surveillance and First Aid added. |
| Year 5 | Vision | SCALE: nationwide coverage approaching the full profiled base of nearly 300,000 BHWs; full institutional operation on a DOH budget line. CONTENT: a mature, multi-programme national curriculum and certification pipeline. |

---

## 21. Every Gap, Closed

Section 3 set out six gaps that survive a perfectly executed five-month training contract. Each is a design intention of this proposal, to be verified in Year 1 against the indicators in Section 15 — stated here as commitments, not as accomplished facts.

| | Gap | How Phase 2 closes it | Verified by |
|---|---|---|---|
| G1 | Materials go stale | Content lives in a versioned, DOH-approved Knowledge Base with named owners and review-due dates. A guidance change is an edit routed through Section 10.5, not a reprint. | Content approval records; stale-content review cadence |
| G2 | Cascade decay | Every BHW takes the same modules directly and is assessed individually against the same rubric. Quality stops depending on who taught whom. | Per-BHW course progress and assessment records |
| G3 | The ceiling is arithmetic | Onboarding is activation of an already-profiled workforce through existing CHD and LGU channels, not a roadshow bounded by contractor months. | Activation rate against onboarded cohort |
| G4 | No route to national | The platform is the mechanism. Region VI is proof-of-concept; the architecture was designed from the outset to serve the full national base. | Year-2 scope endorsed by the Steering Committee |
| G5 | One competency, once | Courses, quizzes, assessment and certification are generic capabilities. HHP+ is module one; the rest are content and approval. | Next module scoped and ready without re-engineering |
| G6 | Paper competence | The 29-criterion return demonstration digitized and auto-scored against the identical 87-point standard, issuing a QR-verified certificate written to the national registry. | Certification records; verification logs; registry queries by org unit |

---

## 22. Conclusion and the Ask

BHW Connect has already done two things that are hard to do. It identified and profiled close to 300,000 Barangay Health Workers nationwide within about a year, after three decades in which no complete national registry existed. And it has built — at government cost, without external financing — the learning, training and certification platform that registry was always meant to carry.

What it has not yet done is put approved clinical content in front of a single Barangay Health Worker. That is what this proposal is for.

With a Year-1 engagement **[amount to be fixed following the Region VI re-cost]**, WHO can fund the content authoring, clinical validation, DOH approval, provisioning, rollout and independent evaluation that turn built software into a certified frontline — with the HHP+ community NCD screening curriculum as its first DOH-approved module. In doing so, WHO converts clinical content it has already financed into a permanent government capability, and DOH gains the foundation for every module that follows.

We welcome the opportunity to develop a full proposal, detailed logical framework and itemized budget with WHO, and we invite independent technical due diligence on the platform as part of that process.

---

## Annex A — The Working Platform

A running instance of the Phase 2 platform is available for demonstration on request from BLHSD, alongside the source repository and its automated test suites. The system is implemented and tested but has not cleared the pilot launch gate; later modules ship behind feature flags defaulted off, and no Barangay Health Worker is using it in the field today.

> **Sample-Content Notice**
>
> The HHP+ health specifics shown in any demonstration — screening questions, sample answers, quiz items and the populated return-demonstration checklist — are realistic sample content for demonstration only. They are procedural and traceable to the HHP+ curriculum outline, and they assert no PhilPEN numeric clinical thresholds. All of it requires clinical validation and DOH approval before any real BHW-facing use. The return-demonstration instrument itself — 29 criteria, 87-point maximum, competency bands at 90% and 75% — is reproduced from the DOH checklist rather than invented.

---

## Annex B — Data Privacy and Safeguards

BHW Connect's consent and data-rights mechanics are implemented: a first-login consent screen in Filipino and English, a linked privacy notice on every screen, administrator-triggered data export and deactivate-and-anonymize actions for data-subject requests, and a defined retention schedule with chat and analytics data auto-purged after 24 months and audit events retained for five years. A breach-notification playbook aligned to the Philippine Data Privacy Act's 72-hour National Privacy Commission requirement is complete, and a backup-and-restore drill has been executed against a written runbook.

Outstanding and to be completed as Year-1 deliverables:

- National Privacy Commission registration status for the Phase 2 processing activities: **[TO CONFIRM]**
- A completed Data Privacy Impact Assessment covering the repurposing of an administrative registry into a learning and certification platform: **[TO CONFIRM]**
- Confirmed data residency position and its relationship to the government hosting pathway: **[TO CONFIRM]**

Health-content safety is protected by the human clinical-validation gate described in Section 10.5. No content reaches a BHW without DOH approval, and no AI-generated content is promoted into the permanent Knowledge Base without technical review and DOH approval.
