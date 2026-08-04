<!--
  Source of record: docs/concept-notes/bhw-connect-phase2-concept-note-koica.docx
  This Markdown is a faithful conversion of that .docx, committed so the concept
  note is diffable and reviewable in git. The .docx remains authoritative for
  formatting; edit both together, or regenerate this file from the .docx.

  Audience: World Vision KOICA MNCH Project (Year 1 = ttCF, Eastern Visayas).
  A second, WHO-oriented version is planned - see pitch/bhw-connect-who.html for
  the WHO framing (Year 1 = HHP+ NCD screening, Western Visayas).
-->

CONCEPT NOTE

BHW Connect Phase 2: Enhancing the DOH National Digital Learning, Training and Certification Platform for Barangay Health Workers

Year 1 Flagship Learning Module: Timed & Targeted Care for Families (ttCF), Eastern Visayas

A government-led enhancement of a DOH national platform, with catalytic support from the World Vision KOICA MNCH Project

Bureau of Local Health Systems Development, Department of Health, Republic of the Philippines

| Platform Owner | Department of Health, through the Bureau of Local Health Systems Development (BLHSD) — Equity in Health and Special Concerns Section |
|---|---|
| Nature of the Proposal | Phase 2 of the DOH BHW Connect platform, building on a delivered Phase 1 and on a Phase 2 design that is already fully conceptualized and planned. Not a stand-alone project. |
| Phase 1 Track Record | Close to 300,000 Barangay Health Workers profiled nationwide within about one year — closing a gap that had persisted for roughly three decades |
| Year 1 Flagship Module | Timed & Targeted Care for Families (ttCF) — the first DOH-approved learning module to be digitized on the platform |
| Catalytic Partner | World Vision KOICA MNCH Project |
| Geographic Scope | Eastern Visayas (Region VIII), as national proof-of-concept |
| Target Beneficiaries | ~4,000 BHWs onboarded in Year 1 (1 priority province); ~26,000 regionally at full scale-up; the full nationally profiled base of nearly 300,000 BHWs at design capacity |
| Duration | 12 months — Year 1 of a proposed phased program |
| Year 1 Partner Contribution Sought | ₱6,000,000 (platform enhancement and maintenance only — see Section 10) |
| Government Counterpart | Platform ownership, hosting pathway, content approval authority, field structures, supervision and post-project sustainment (in-kind and budgeted) |
| Date | 24 July 2026 |

DRAFT — for internal review prior to submission

## Table of Contents

(Right-click the table above and choose “Update Field” to populate page numbers after opening in Word.)

## 1. At-a-Glance Summary

This page summarizes the proposal in full. Sections 2 to 21 provide the supporting detail.

| What this is | Phase 2 of BHW Connect, the Department of Health's digital platform for Barangay Health Workers, owned and led by BLHSD. Phase 1 delivered the national BHW registry and profiled close to 300,000 BHWs nationwide in about a year, after roughly three decades without a complete national registry. Phase 2 turns that registry into a learning, training and certification platform. Its design is already complete; this proposal funds the build-out. |
|---|---|
| What is being added | (1) A Training & Certification engine — e-learning, quizzes, assessor-graded skills demonstration, QR-verified certificates. (2) Regional-scale provisioning and operational hardening. (3) An AI-assisted content gap loop with mandatory DOH clinical review. (4) Usage insights and early-signal alerting for BLHSD. |
| First content module | Timed & Targeted Care for Families (ttCF) — an evidence-based, structured 12-visit MNCH curriculum already implemented in Eastern Visayas under a World Vision–DOH partnership. It becomes the first DOH-approved learning module on the platform, and the template for those that follow. |
| Why this is low risk | The bureau has already delivered a national digital health system at scale, the users are already registered and organizationally located in the platform, and the Phase 2 design, architecture and build roadmap are complete. What remains is build-out and rollout, not discovery and design. |
| Why this partner | The World Vision KOICA MNCH Project has already invested in ttCF implementation, developed the curriculum and learning resources, and holds the field experience in Region VIII. Digitizing ttCF on a government-owned national platform converts that investment into an institutionalized, permanent national asset. |
| Who owns it | DOH, through BLHSD, retains ownership of the platform, its source code, its data and all published content, subject to a Memorandum of Agreement executed before implementation. World Vision serves as fund-holder and implementation partner; KOICA provides catalytic financing. |
| Resource sharing | Partner side: ₱6,000,000 for the technical team, subscriptions, equipment, regional infrastructure and independent M&E. Government side: platform asset, content approval authority, field mobilization structures, supervision, office space, BHW time, and post-project hosting and maintenance budget. |
| Year 1 milestones | (1) Platform enhanced and regionally provisioned. (2) ttCF digitized and DOH-approved. (3) Governance and content approval process established under MOA. (4) Certification rolled out — first cohort certified. (5) Platform demonstrably ready to onboard the next DOH module. |
| Timeline | M1–3 mobilization and governance; M2–6 content development and DOH approval; M4–8 Wave 1 onboarding (~4,000 BHWs); M7–11 certification launch and Wave 2; M10–12 evaluation, handover and Year-2 plan. |
| Sustainability | Institutionalized through MOA and a departmental issuance, embedded in the BLHSD work and financial plan, hosted on government infrastructure, and staffed by trained BLHSD personnel — so continuity does not depend on the individuals or administrations in place today. |
| Long-term value | ttCF is the first of many DOH-approved modules. Immunization, Nutrition, Family Planning, Communicable Disease Surveillance, First Aid and BHW Administrative Procedures are already on the platform roadmap, each reusing the same architecture at a fraction of Year 1's cost. |

## 2. Executive Summary

For roughly three decades, the Department of Health had no complete, current national record of its Barangay Health Worker workforce. BHW Connect Phase 1 — conceptualized and delivered by the Bureau of Local Health Systems Development (BLHSD) — closed that gap: within about one year of rollout, close to 300,000 BHWs had been profiled nationwide, organizationally located from national down to barangay level. That is the foundation this proposal builds on.

This concept note proposes Phase 2: enhancing that platform into a full digital learning, training and certification system for the same workforce — an always-available bilingual (Filipino / English / Taglish) Knowledge Base and Chat Guide, and a structured training and certification pathway. Phase 2 is already fully conceptualized and planned by BLHSD: requirements, data model, system architecture, user journeys and a nine-increment build roadmap are complete, with a clickable prototype demonstrating the intended experience. What is sought is financing for build-out and rollout, not for discovery and design. The Timed & Targeted Care for Families (ttCF) programme is proposed as the Year 1 flagship learning module — the first DOH-approved curriculum to be digitized, certified and served through the platform, and the template for every module that follows.

> A Government Platform, Not a Project-Specific Tool
>
> BHW Connect is a DOH platform with its own mandate, roadmap, institutional home and a delivered national footprint. ttCF is Year 1's flagship content domain, not the boundary of what the platform is.
>
> ttCF was selected first because it already has a clearly defined, evidence-based, DOH- and World Vision-endorsed 12-visit curriculum — the fastest credible path to a fully worked, DOH-approved learning module.
>
> The underlying Knowledge Base and Training & Certification architecture is generic by design. Immunization, Nutrition, Communicable Disease Surveillance, Family Planning, First Aid and BHW Administrative Procedures are already committed on BHW Connect's own product roadmap, and require content authoring and DOH approval rather than re-engineering.

With catalytic support from the World Vision KOICA MNCH Project, Year 1 will (a) bring the enhanced platform to regional availability across Eastern Visayas through phased BHW onboarding, and (b) build and launch the Training & Certification engine, with ttCF as its first approved module. The engagement is structured as direct capacity support to BLHSD — funding a small technical team, subscriptions and equipment working under BLHSD supervision — rather than an arm's-length vendor commission. Field mobilization draws on existing DOH, LGU and World Vision structures as counterpart contribution.

> The Year-1 Ask
>
> ₱6,000,000 for platform enhancement and maintenance over 12 months: a four-person core team (2 full-time, 2 output-based), AI and developer tooling subscriptions, IT equipment, regional infrastructure, and independent monitoring and evaluation — itemized in Section 10.
>
> This does not include training-delivery costs, travel or per diem, or other programme implementation expenses. Those are provided as counterpart contributions or funded separately.
>
> Ownership of the platform, its code, its data and its published content remains with DOH throughout, subject to a Memorandum of Agreement executed before implementation.

Year 1 is deliberately scoped to be achievable: it provisions the platform for region-wide availability and actively onboards a first cohort of approximately 4,000 BHWs in one priority province, with the field-tested playbook and government structures in place to scale toward the region's approximately 26,000 BHWs in Year 2. Eastern Visayas is proposed as proof-of-concept for a nationwide DOH programme, not a standalone deployment.

This concept note summarizes the proposal; a full proposal with a detailed logical framework, itemized budget, and procurement and M&E plans will follow at the partner's invitation.

## 3. Problem Statement & Rationale

Barangay Health Workers are the Philippines' frontline community health cadre, and the platform on which primary health care ultimately depends. They carry an expanding programme load — maternal and child health, immunization, nutrition counselling, family planning, disease surveillance, first aid and routine reporting — with limited always-available reference support and no structured, nationally recognized pathway for training and certification.

Timed & Targeted Care for Families (ttCF) illustrates the gap precisely. It is a community-based maternal, newborn and child health intervention implemented in Eastern Visayas under a World Vision–DOH partnership (MNCH project, 2021–2025). BHWs, with Barangay Nutrition Scholars, conduct 12 structured home visits from pregnancy through a child's second birthday, targeting the critical first 1,000 days of life. A dedicated ttCF monitoring booklet, developed by World Vision International and adapted with DOH-Philippines, guides the visit schedule and counselling.

Source: Evaluation planning for the timed and targeted care for families program in Eastern Visayas, Philippines — Frontiers in Public Health (2025); also PMC12283334. The same literature notes that timed-and-targeted care models have been assessed as cost-effective against the WHO Commission on Macroeconomics and Health criterion.

The BHWs carrying out this 12-visit protocol have no digital job aid that answers their questions in the moment, in their own mixed Filipino/English/Taglish, and no structured way to complete the training and skills demonstration that a fully certified ttCF competency would require. Missed or poorly executed visits weaken the very outcomes ttCF exists to protect: maternal survival, safe delivery, exclusive breastfeeding, timely immunization and early childhood development.

Phase 1 answered the prior question — who and where the BHWs are — by profiling close to 300,000 of them nationwide. The question it does not answer is how they are supported, trained and certified once identified. Phase 2 answers that: an always-available bilingual reference tool and a structured certification pathway, delivered to a workforce that is already registered and reachable in the same system. Its design is complete and ready to build, beginning with ttCF.

## 4. Why ttCF Is the Right First Module

Selecting the first module to digitize on a national platform is a consequential decision: it sets the content standard, the approval workflow and the certification design that every later module inherits. ttCF was selected on five grounds.

| Criterion | Why ttCF Meets It |
|---|---|
| Evidence base | ttCF is grounded in the first-1,000-days evidence and has been assessed as cost-effective against the WHO Commission on Macroeconomics and Health criterion. Its evaluation is documented in peer-reviewed literature (Frontiers in Public Health, 2025). |
| Proven implementation | ttCF is not a design on paper. It has been implemented in Eastern Visayas since 2021 under a World Vision–DOH partnership, with field experience, implementation lessons and an established BHW delivery model already in place. |
| Structured curriculum | The 12-visit protocol, with its accompanying monitoring booklet developed by World Vision International and adapted with DOH-Philippines, provides a clearly bounded, sequenced curriculum that maps directly onto e-learning modules, quiz banks and a skills-demonstration checklist. |
| Alignment with national MNCH priorities | ttCF operationalizes the First 1,000 Days law (RA 11148) and contributes directly to SDG 3.1 and 3.2. It sits squarely within DOH's maternal, newborn and child health agenda rather than at its margins. |
| Readiness for national scale-up | Because the curriculum is already defined and field-tested, digitization and DOH approval can be completed within Year 1 — producing a fully worked, certifiable module that demonstrates the platform end to end and is ready for replication in other regions. |

The same recall burden and training gap exist across nearly every other programme a BHW is asked to run. ttCF is simply the sharpest, most tractable starting point: a single, clearly bounded curriculum on which to prove the model before extending the same architecture to the rest of a BHW's workload.

## 5. Why the World Vision KOICA MNCH Project

The rationale for this partnership is not funding alone. Among possible partners for the platform's first learning module, the World Vision KOICA MNCH Project holds a combination of assets that no other partner holds together.

| Partner Asset | Contribution to This Proposal |
|---|---|
| Prior investment in ttCF | The project has already financed ttCF implementation in Eastern Visayas. Digitizing the curriculum onto a platform that already reaches the national BHW workforce protects and extends that investment rather than duplicating it, and converts a time-bound project output into a permanent government asset. |
| Implementation experience | Years of field experience running ttCF through BHWs in Region VIII — including what works in supervision, mobilization and household engagement — informs both the content and the onboarding playbook, and reduces implementation risk. |
| Developed learning resources | The ttCF monitoring booklet, counselling materials and training content developed by World Vision International with DOH-Philippines form the source material for digitization. The curriculum does not have to be written from nothing. |
| Contribution to institutionalization | By supporting digitization on a DOH-owned national platform under a formal MOA, the project contributes directly to institutionalizing ttCF within the government system — the outcome most donor-funded community health programmes struggle to secure at closeout. |
| Alignment with Korea's ODA priorities | The proposal sits at the intersection of Korea's recognized leadership in digital government and its ODA emphasis on health-systems strengthening — offering a visible, replicable digital-health flagship with a defined national scale-up pathway. |

> Catalytic, Not Custodial
>
> The partner's role is to catalyze a government-led enhancement, not to own or operate the platform. Funding is concentrated in a 12-month enhancement window; ownership, approval authority and long-term operation sit with DOH from day one and remain there after closeout.

## 6. Strategic Alignment

### Philippine government priorities

The proposal operationalizes frontline delivery under the Universal Health Care Act (RA 11223) and directly supports the First 1,000 Days law (RA 11148, the Kalusugan at Nutrisyon ng Mag-Nanay Act), whose maternal-and-child-nutrition mandate the ttCF 12-visit protocol embodies. It complements the DOH digital-health agenda and primary-care thrust, contributes to the BHW workforce development agenda under RA 7883 and its successor policy directions, and is anchored in an existing DOH bureau rather than a parallel structure.

### Sustainable Development Goals

- SDG 3 (Good Health & Well-being) — directly supports 3.1 (maternal mortality) and 3.2 (newborn and under-five mortality) through better-supported home visits.
- SDG 5 (Gender Equality) — empowers and professionalizes a predominantly female frontline health cadre and serves mothers and infants.
- SDG 4 (Quality Education) — provides structured, certified lifelong learning for community health workers.
- SDG 9, 10 and 17 (Innovation; Reduced Inequalities; Partnerships) — a government-owned digital public good, extended toward Geographically Isolated and Disadvantaged Areas.
### Korea's development cooperation priorities

The proposal aligns with Korea's recognized leadership in digital government and its ODA emphasis on health-systems strengthening and digital transformation as enablers of inclusive development, offering a visible, replicable digital-health flagship with a defined national scale-up pathway.

## 7. Project Goal & Objectives

### Goal

To enhance BHW Connect — the Department of Health's existing digital platform for Barangay Health Workers — into a national digital learning, training and certification system, launched with Timed & Targeted Care for Families (ttCF) as its Year 1 flagship learning module across Eastern Visayas, as proof-of-concept for nationwide scale-up and multi-programme content expansion.

### Specific Objectives

- Objective 1 — Enhance and provision the existing platform: complete operational hardening, scale the Chat Guide and Knowledge Base to regional availability, and onboard a first cohort of approximately 4,000 BHWs in one priority province of Eastern Visayas, establishing the playbook to reach the region's approximately 26,000 BHWs.
- Objective 2 — Build and launch the Training & Certification engine: e-learning mapped to the 12 ttCF home visits, an in-person assessor-graded skills demonstration, and QR-verified certificates.
- Objective 3 — Establish governance, ownership and the content approval process: a DOH-chaired steering structure, a documented content development and approval workflow, and a Memorandum of Agreement defining ownership, roles and post-project stewardship.
- Objective 4 — Strengthen BLHSD and LGU capacity to administer, govern and sustain the platform, with documented runbooks and trained government administrators.
- Objective 5 — Demonstrate readiness for the next module: prove the Knowledge Base and Training & Certification architecture as a reusable platform capability, ready to onboard additional DOH-priority topics without re-engineering.
## 8. Theory of Change

If Barangay Health Workers are given an always-available bilingual job aid and a structured, certified training pathway — built into, and owned by, the government structure that supervises them — then they will deliver the ttCF 12-visit protocol more consistently and confidently, contributing to stronger maternal and child health outcomes in the first 1,000 days, in a model that can be extended to other health programmes and scaled nationally.

| Results Level | Description |
|---|---|
| Inputs | Partner financing for a core technical team, AI and developer subscriptions, IT equipment, infrastructure and M&E; the delivered Phase 1 registry and its nearly 300,000 profiled BHWs; the completed Phase 2 design; ttCF curriculum and learning resources; BLHSD, LGU and World Vision counterpart structures. |
| Activities | Harden and scale the platform; author and clinically validate ttCF content; secure DOH content approval; build the Training & Certification engine; onboard BHWs; train BLHSD and LGU staff; establish governance under MOA. |
| Outputs | A regionally available enhanced platform; a published, DOH-approved ttCF learning module; an operational certification pathway; a first cohort of onboarded and certified BHWs; trained government administrators; an established content approval process. |
| Outcomes | BHWs get reliable answers in the moment and complete structured, certified ttCF training; BHW knowledge, confidence and consistency on the 12-visit protocol improve; BLHSD operates the platform independently. |
| Impact | Contribution to stronger MNCH outcomes in the first 1,000 days across Eastern Visayas — and a proven, government-owned national learning platform ready for further modules and nationwide scale. |

## 9. Platform Readiness: A Proven Phase 1, a Fully Planned Phase 2

The strongest argument for this proposal is not the design of Phase 2. It is the delivery record of Phase 1.

### 9.1 What Phase 1 achieved

For roughly three decades, the Department of Health had no complete, current, nationally consolidated record of the Barangay Health Worker workforce. Successive attempts at a national BHW registry — paper-based, spreadsheet-based and locally maintained — did not produce one. Planning, deployment, incentive administration, training targeting and workforce policy were all conducted against incomplete numbers.

BHW Connect Phase 1 solved that. Conceptualized and delivered by BLHSD, it established the national BHW registry and profiling system — organizational hierarchy from national down to barangay level, individual BHW profiles, and roll-up reporting at every tier. Within approximately one year of rollout, close to 300,000 Barangay Health Workers had been profiled nationwide, closing a gap that had persisted for thirty years.

> Why This Matters for Phase 2
>
> Proven government delivery. BLHSD has already taken a national digital health system from concept to nationwide adoption at scale. This is not a bureau proposing its first platform.
>
> The users already exist in the system. Nearly 300,000 BHWs are identified, profiled and organizationally located. Onboarding for Phase 2 is activation of known, registered users — not recruitment from an empty database, which is where most digital-health platforms fail.
>
> The backbone is built and populated. Identity, organizational hierarchy, geographic assignment and administrative reporting all exist. Phase 2 plugs learning, support and certification into a spine that is already carrying national data.
>
> A demonstrated adoption pathway. The LGU, CHD and BHW mobilization channels that delivered nationwide profiling in a year are the same channels that will deliver Phase 2 onboarding.

### 9.2 What Phase 2 adds — already conceptualized and planned

Phase 2 is not a concept awaiting design. It has been fully conceptualized and planned by BLHSD: requirements, data model, system architecture, user journeys, accessibility approach and a nine-increment build roadmap (INC-0 to INC-9) are complete, and a clickable prototype demonstrating the intended experience is available (Annex A). What this proposal funds is the build-out and rollout of that plan, not the discovery and design phase that normally consumes the first year of a digital-health investment.

| Dimension | Phase 1 — Delivered | Phase 2 — Conceptualized and Planned |
|---|---|---|
| Purpose | Identify, register and profile the national BHW workforce | Support, train and certify that same workforce |
| Core capability | National BHW registry and profiling system; organizational hierarchy from national to barangay; profile records and roll-up reporting | Rule-based bilingual Chat Guide; Knowledge Base; content administration console; e-learning, quiz banks, assessor-graded skills demonstration and QR-verified certification |
| Result | Close to 300,000 BHWs profiled nationwide within about one year, after roughly three decades without a complete national registry | Those same BHWs given an always-available job aid and a structured, certified competency pathway, beginning with ttCF |
| Content | Administrative and demographic profile data | DOH-approved bilingual learning content and curricula, beginning with the full ttCF 12-visit protocol |
| Content governance | Administrative data standards | Formal content development, technical review, DOH approval and periodic update workflow (Section 10.5) |
| User base | Established — BHWs registered and organizationally located nationwide | Activation of already-registered users rather than recruitment from zero |
| Scale of provisioning | Nationwide profiling coverage | Regional provisioning across Eastern Visayas; architecture designed to serve the full profiled national base |
| Status | Delivered and operating under BLHSD | Fully conceptualized and planned; build-out funded under this proposal |

### 9.3 Build roadmap and what this proposal funds

| Build Stage | What It Covers | Status |
|---|---|---|
| Phase 1 | National BHW registry and profiling system: organizational hierarchy, BHW profiles, administrative reporting and roll-up dashboards. | Delivered — nearly 300,000 BHWs profiled |
| INC-0 to INC-8 | Phase 2 core: authentication against the existing registry, content administration console and audit trail, Knowledge Base authoring, rule-based Chat Guide engine and interface, admin dashboards, accessibility and onboarding, reports and analytics. | Conceptualized and planned; funded under this proposal |
| INC-9 | Operational hardening and readiness: feature flags, error tracking, backup and restore drill, Data Privacy Act data-rights actions, breach playbook. | Planned; funded under this proposal |
| Training & Certification | E-learning, quiz banks, assessor queue and grading, QR-verified certification — designed as generic capabilities, with ttCF as the first curriculum loaded into them. | Planned; funded under this proposal |
| Later phases | Announcements, Surveys, Forum, Flip-chart, deeper profiling integration, offline/PWA access. | Roadmap — Year 2 onward |

The Chat Guide's answer engine is designed to be rule-based — full-text search, trigram similarity, and an admin-editable Filipino/English/Taglish synonym dictionary — so it will answer BHWs at zero marginal cost per question. This is a deliberate value-for-money design choice, not a limitation.

### 9.4 Designed to hold more than ttCF

Knowledge Base categories, question-and-answer entries, long-form articles and the Training & Certification module are all specified as generic platform structures, not ttCF-specific ones. Adding a new health topic is a content-authoring and DOH-approval exercise, not a re-engineering effort. Immunization, Nutrition, Communicable Disease Surveillance, Family Planning, First Aid and BHW Administrative Procedures are already committed on the platform roadmap, with sequencing driven by real Chat Guide demand rather than a fixed order set in advance.

## 10. Implementation Framework

This section presents governance, roles and ownership, workstreams, the implementation timeline and the content approval process as a single integrated framework, so that the institutional arrangements can be assessed as a whole rather than in fragments.

> Delivery Modality — Direct Support, Not Third-Party Outsourcing
>
> This proposal funds personnel and IT resources that work directly for and with BLHSD, under BLHSD supervision. It is not a commission to an external vendor to build and operate the platform at arm's length. Capacity, content and the system itself stay within the government structure that will sustain them after closeout.

### 10.1 Governance structure

Three bodies govern the engagement. All are chaired or led by DOH, reflecting that this is a government platform receiving partner support.

| Body | Composition | Mandate |
|---|---|---|
| Project Steering Committee | Chaired by BLHSD (Director or designated Section Chief); members from World Vision, KOICA, CHD Eastern Visayas, and DICT or DOH KMITS as appropriate | Overall oversight and strategic direction; approval of annual work plans and budgets; go/no-go decisions at phase gates; resolution of escalated issues; endorsement of Year-2 continuation. Meets quarterly. |
| Technical Working Group | Led by BLHSD Equity in Health and Special Concerns Section; technical staff from World Vision, the funded core team, and CHD/LGU representatives | Day-to-day coordination and technical decision-making; monitoring against the workstream matrix; risk tracking; preparation of Steering Committee papers. Meets monthly. |
| Content Review Panel | Convened by BLHSD, with DOH programme experts (MNCH and related bureaus), World Vision technical staff, and clinical reviewers | Technical review and clearance of all learning content prior to DOH approval and publication; periodic review of published content. Meets as content batches are submitted. |

### 10.2 Roles, responsibilities and ownership

Ownership of the platform, its source code, its database, and all content published on it rests with the Department of Health throughout the engagement and after it, subject to a Memorandum of Agreement executed before implementation begins.

| Institution | Role | Specific Responsibilities |
|---|---|---|
| DOH / BLHSD | Platform owner and implementation lead | Owns the platform, code, data and content; chairs governance bodies; supervises the funded team; approves all learning content for publication; issues policy instruments; provides field structures through CHDs and LGUs; assumes hosting, maintenance and staffing at closeout. |
| World Vision | Implementation partner and fund-holder | Holds and administers partner funds; serves as employer of record for the funded core team; contributes ttCF curriculum, learning resources and field implementation experience; supports BHW mobilization in Region VIII; co-monitors delivery through the TWG. |
| KOICA / World Vision Korea | Catalytic financing partner | Provides Year-1 financing for platform enhancement and independent M&E; participates in the Steering Committee; receives narrative and financial reporting; considers subsequent phases on their own merits. |
| LGUs and CHD Eastern Visayas | Field implementation counterparts | Mobilize and endorse BHWs for onboarding; host assessor-graded skills demonstrations; provide local supervision and follow-through; nominate staff for administrator training. |

The Memorandum of Agreement will make explicit, at minimum: DOH ownership of the platform, source code, database and published content; intellectual property arrangements for ttCF-derived learning materials; data governance and Data Privacy Act responsibilities; the content approval authority of DOH; the disposition of equipment at closeout; and the government's commitment to sustain the platform after the engagement ends.

### 10.3 Workstream matrix

| Workstream | Scope | Lead | Key Year-1 Deliverables |
|---|---|---|---|
| WS1 — Platform Enhancement | INC-9 operational hardening; regional infrastructure provisioning; performance and security | Platform engineer, under BLHSD technical supervision | Hardened platform; regional provisioning complete; backup, restore and breach playbook tested |
| WS2 — Content & Curriculum | ttCF Knowledge Base authoring; e-learning modules; quiz banks; skills-demonstration protocol | KB Content & Training Coordinator, with World Vision technical input | At least 150 published bilingual entries; complete ttCF course mapped to the 12 visits; DOH approval secured |
| WS3 — Training & Certification Build | E-learning engine, assessor queue and grading, QR-verified certification | Platform engineer with senior developer oversight | Certification engine operational; first cohort certified; certificate verification operational |
| WS4 — Rollout & Change Management | Wave 1 and Wave 2 BHW onboarding; LGU coordination; user support | BLHSD with CHD, LGU and World Vision field structures | ~4,000 BHWs onboarded; activation and weekly-active targets met; onboarding playbook documented |
| WS5 — Governance & Institutionalization | MOA; steering and review bodies; content approval SOP; policy instruments | BLHSD Equity in Health and Special Concerns Section | MOA executed; governance bodies convened; content approval SOP adopted; draft departmental issuance prepared |
| WS6 — M&E and Learning | Baseline, midline, endline; independent review; evidence brief | M&E consultant, reporting to the TWG | Baseline report; midline course-correction; endline and independent review; Year-1 evidence brief |

### 10.4 Implementation timeline (Year 1)

| Phase | Months | Key Activities |
|---|---|---|
| Phase 1 — Mobilization & Governance | M1–3 | Execute the MOA; convene the Steering Committee, Technical Working Group and Content Review Panel; adopt the content approval SOP; recruit the core team; procure equipment; complete INC-9 hardening; plan and provision regional infrastructure; collect baseline data. |
| Phase 2 — Content Development & Approval | M2–6 | Author and clinically validate the ttCF Knowledge Base to a launch corpus of at least 150 bilingual entries; design the e-learning curriculum, quiz banks and assessor protocol; route all content through technical review and DOH approval. |
| Phase 3 — Wave 1 Rollout | M4–8 | Onboard the first cohort of approximately 4,000 BHWs in the priority province through existing DOH, LGU and World Vision structures; Chat Guide and Knowledge Base available to Wave 1; tune matching quality from real gap-queue data; build the Training & Certification engine in parallel. |
| Phase 4 — Certification Launch & Wave 2 | M7–11 | Launch the Training & Certification module; run the first assessor-graded skills demonstrations and issue the first QR-verified certificates; expand onboarding to additional municipalities within the priority province. |
| Phase 5 — Consolidation & Year-2 Plan | M10–12 | Midline and endline measurement and independent review; progressive capacity handover to BLHSD and LGU staff; Year-1 results and evidence brief; draft departmental issuance; Year-2 scope and proposal. |

### 10.5 Content development and approval process

No content reaches a Barangay Health Worker without DOH clearance. The following workflow governs every learning module on the platform, beginning with ttCF, and is adopted as a BLHSD Standard Operating Procedure in Phase 1.

| Step | Stage | Responsible | What Happens |
|---|---|---|---|
| 1 | Content development | KB Content & Training Coordinator, with World Vision technical input | Draft Knowledge Base entries, e-learning modules, quiz items and skills-demonstration checklists, sourced from the authoritative ttCF protocol and DOH guidelines. Bilingual drafting from the outset. |
| 2 | Technical review | Content Review Panel — DOH programme experts and clinical reviewers | Clinical accuracy, alignment with current DOH guidelines, language appropriateness and pedagogical soundness are reviewed. Comments returned for revision; content may cycle here more than once. |
| 3 | DOH approval | BLHSD, through the designated approving official | Formal clearance for publication. Approval is recorded in the platform's audit trail, with the approving official and date attached to each content item. |
| 4 | Publication | BLHSD platform administrators | Approved content is published to the platform and becomes available to onboarded BHWs. Version and approval metadata are retained. |
| 5 | Periodic update | KB Content & Training Coordinator, with Content Review Panel | Scheduled stale-content review at defined intervals, plus triggered review when DOH guidelines change or when the gap queue reveals recurring unmet questions. Re-approval follows the same route as new content. |

The AI gap-fallback path is governed by the same rule. When the rule-based engine finds no confident match, an AI model answers the BHW using only vetted Knowledge Base content, and the exchange is logged to the administrative gap-triage queue. That exchange is never automatically published: promotion into the permanent Knowledge Base requires the full review and approval route above, with human clinical sign-off.

## 11. Technical Approach

### Pillar 1 — Chat Guide and the gap-detection loop

A BHW asks a question in Filipino, English or Taglish and receives an answer from the Knowledge Base, matched through normalization, synonym expansion, full-text ranking and trigram similarity, with no paid AI in this first answer path. When no confident match exists, an AI model answers instead, grounded strictly in retrieved Knowledge Base content rather than free generation, and the exchange is logged for clinical review and possible promotion into the permanent Knowledge Base. The Knowledge Base therefore keeps growing from real BHW demand, and the share of questions needing AI shrinks over time as the content matures.

### Pillar 2 — Training and Certification

A ttCF-aligned e-learning course mapped one-to-one to the 12 home visits, combining short video and slide modules with per-topic quizzes. On completing the online modules, a BHW proceeds to an in-person skills demonstration graded by a qualified assessor from an open queue. Certification is automatic on a passing grade: a downloadable, QR-verified certificate checkable for authenticity at scale. The course, quiz and certification engine are built as generic capabilities — ttCF is the first curriculum loaded into them, not the only one they can hold.

### Pillar 3 — Usage insights and early-signal alerting

The design already provides for every Chat Guide question to be logged, matched or not, with a normalized theme and a frequency count. Year 1 adds a lightweight spike detector over this existing data: when a theme's ask-count crosses its recent baseline, BLHSD content administrators are notified in-app and by email, and a monthly Usage Insights Brief summarizes top themes, gap trends and flagged spikes. From Year 2, once questions are tagged by locality through the platform's organizational hierarchy, the same detector can distinguish a localized spike from ordinary volume growth — the seed of a public-health early-warning signal. This is explicitly a human-in-the-loop flag, not an automated diagnosis or outbreak declaration.

### Gender and social inclusion

This is a gender-responsive investment by design: the Philippine BHW workforce is overwhelmingly women, and the ttCF beneficiaries are mothers, newborns and young children. The platform advances inclusion by professionalizing a largely female, often-volunteer cadre with a recognized certification credential; by lowering barriers through accessibility designed in from the outset, including a bilingual interface, adjustable font size, and high-contrast and dark modes; and by extending reach toward Geographically Isolated and Disadvantaged Areas through satellite connectivity for the field team and the offline/PWA roadmap. Sex-disaggregated data on BHW participation and certification will be collected and reported.

### AI usage — transparency note

Subscriptions fund three things: developer productivity, administrative content drafting assistance, and the Chat Guide's AI gap-fallback. The first two remain fully human-reviewed before anything is published. The gap-fallback is the only path where a BHW sees an AI-generated answer directly; the safeguards there are retrieval grounding and mandatory clinical review before promotion into the permanent Knowledge Base. No AI-generated content is ever published without human clinical sign-off, and the platform's default, zero-marginal-cost answer path remains the rule-based engine.

## 12. Cost- and Resource-Sharing Framework

This engagement is a shared investment, not a grant to a recipient. The table below sets out what each party brings. Government contributions are substantial, and several of them — the platform asset itself, and the commitment to sustain it — are the reason partner financing produces a permanent national capability rather than a time-bound project output.

| Contribution Area | KOICA / World Vision Korea and World Vision | DOH / BLHSD and LGUs |
|---|---|---|
| Financial | ₱6,000,000 in Year 1 for platform build-out and enhancement, subscriptions, equipment, regional infrastructure and independent M&E | The delivered Phase 1 national registry and its nearly 300,000 profiled BHW records; the completed Phase 2 conceptualization, design and architecture, funded by BLHSD at its own cost; personnel time of BLHSD and CHD staff; office space and utilities; post-project hosting and maintenance budget from closeout onward |
| Technical | ttCF curriculum, monitoring booklet and learning resources; implementation experience in Region VIII; technical input to content development; M&E oversight | Platform concept, architecture and technical design; DOH clinical and programme expertise; content approval authority; data governance and Data Privacy Act compliance; digital-health standards alignment |
| Human resources | Fund-holding and employer-of-record function for the four-person core team; field mobilization support through World Vision structures | Supervision of the funded team; BLHSD administrators and content owners; CHD and LGU field structures for BHW mobilization; assessors for skills demonstrations |
| Institutional | Participation in the Steering Committee; reporting and accountability; catalytic positioning of the model for replication | Chairmanship of governance bodies; execution of the MOA; issuance of policy instruments; institutionalization pathway toward a departmental issuance and budget line |
| Sustainability | Year-1 financing only; no continuing obligation assumed beyond agreed reporting | Ownership of the platform in perpetuity; hosting, maintenance, staffing and content upkeep after closeout; commitment to continue certification and module expansion |

## 13. Budget Summary (Year 1)

> Scope of This Budget
>
> This budget covers platform enhancement and maintenance for one year only — personnel, AI and developer tooling subscriptions, IT equipment, infrastructure and independent M&E.
>
> It does not include training-delivery costs, travel or per diem, or other programme implementation expenses. Those are provided as counterpart contributions — DOH, LGU and World Vision field structures, office space, and existing BHW time — or funded separately.

| Line Item | Basis | Amount (₱) |
|---|---|---|
| 1. Personnel — 59% of total |  |  |
| Platform / engineering developer (full-time) | ₱65,000/month × 12 months | 780,000 |
| KB Content & Training Coordinator (full-time) | ₱65,000/month × 12 months | 780,000 |
| Senior developer (output-based) | Deliverable-based engagement, ~12 months | 1,000,000 |
| M&E / Training & Certification consultant (output-based) | Deliverable-based engagement, ~12 months | 1,000,000 |
| Subtotal — Personnel | 3,560,000 |  |
| 2. AI / developer tooling subscriptions — 8% of total |  |  |
| Claude (developer productivity, admin content drafting, Chat Guide gap-fallback) | ₱15,000/month × 12 months × 2 subscriptions | 360,000 |
| Gemini | ₱10,000/month × 12 months | 120,000 |
| Subtotal — AI / developer tooling | 480,000 |  |
| 3. IT equipment — 10% of total |  |  |
| Laptops (one per core team member) | ₱65,000 × 4 units | 260,000 |
| Tablets (field and content review) | ₱35,000 × 4 units | 140,000 |
| Mobile satellite connectivity hardware kits | ₱35,000 × 2 units | 70,000 |
| Satellite connectivity subscription | ₱5,000/month × 12 months × 2 units | 120,000 |
| Subtotal — IT equipment | 590,000 |  |
| 4. Infrastructure and hosting — 8% of total |  |  |
| Regional cloud hosting and database scale-up | ₱25,000/month × 12 months | 300,000 |
| Monitoring, backups, domain and SSL, miscellaneous SaaS tooling | ₱15,000/month × 12 months | 180,000 |
| Subtotal — Infrastructure and hosting | 480,000 |  |
| 5. Monitoring and evaluation — 9% of total |  |  |
| Baseline assessment (design, fieldwork, report) | Lump sum | 170,000 |
| Midline review (~Month 6) | Lump sum | 180,000 |
| Endline assessment and independent review (Month 11–12) | Lump sum | 190,000 |
| Subtotal — Monitoring and evaluation | 540,000 |  |
| 6. Contingency — 6% of total |  |  |
| Contingency reserve | Standard provision for a first-year single-province rollout | 350,000 |
| Subtotal — Contingency | 350,000 |  |
| GRAND TOTAL (Year 1) | 6,000,000 |  |

Rates reflect standard Philippine NGO and technical-team assumptions — a senior full-stack engineer and programme-coordinator salary band, typical consultant day-rates for output-based clinical and M&E expertise, regional cloud-hosting costs, and standard external assessment costs. Final rates to be confirmed with World Vision human resources and procurement, and with BLHSD, before submission. At approximately 4,000 BHWs onboarded in Year 1, this is roughly ₱1,500 per BHW reached — a figure worth carrying into the full proposal alongside a USD-equivalent line.

AI gap-fallback cost check: modelled at approximately 374,000 Chat Guide questions per year (4,000 onboarded BHWs, 60% weekly active, about 3 questions per week each) and a cost-effective model, the AI-answered fallback costs roughly ₱4,000 to ₱21,000 per year across a 10 to 50 percent gap-rate range, and under ₱43,000 per year even in an unrealistic scenario where every question is AI-answered. This is comfortably absorbed within the ₱480,000 AI and developer tooling line and does not increase the ₱6,000,000 total.

## 14. Year-1 Success Milestones

Five milestones define success in Year 1. Each is binary and verifiable, and together they establish the platform as a permanent national capability rather than a completed project.

| No. | Milestone | What It Means | Verification |
|---|---|---|---|
| 1 | Platform enhanced and regionally provisioned | Operational hardening complete; infrastructure provisioned for region-wide availability; first cohort of approximately 4,000 BHWs onboarded in the priority province | Provisioning records; platform analytics; onboarding records |
| 2 | ttCF digitized and DOH-approved | Full 12-visit curriculum published as Knowledge Base content and e-learning modules, cleared through technical review and formally approved by DOH | Content approval records with approving official and date; published content inventory |
| 3 | Governance established | MOA executed; Steering Committee, Technical Working Group and Content Review Panel convened; content approval SOP adopted by BLHSD | Signed MOA; minutes of governance meetings; adopted SOP document |
| 4 | Certification rolled out | Training & Certification engine operational; assessor-graded skills demonstrations conducted; first cohort of BHWs certified with QR-verified credentials | Certification records; certificate verification logs |
| 5 | Readiness for the next module demonstrated | Architecture proven end to end on one programme; content pipeline and approval route operating; the next DOH-priority module scoped and ready to onboard | Year-1 evidence brief; Year-2 scope document endorsed by the Steering Committee |

## 15. Results Framework and M&E

Indicators build on the platform's existing analytics. Targets reflect a single-province Year 1, and are sex-disaggregated where applicable.

| Results Level & Indicator | Baseline | Year-1 Target | Means of Verification |
|---|---|---|---|
| IMPACT — Contribution to improved MNCH outcomes in the first 1,000 days | ttCF programme M&E | Contributory, not solely attributed | ttCF programme monitoring |
| OUTCOME 1 — BHWs actively use the platform in ttCF work | 0 (new cohort) | Activation ≥70% of onboarded cohort; weekly active ≥60% | Platform analytics |
| OUTCOME 2 — BHWs obtain reliable, timely answers | Not applicable | Deflection ≥70% by end of Year 1; answer quality ≥80% | Platform analytics and user feedback |
| OUTCOME 3 — BHW ttCF knowledge and confidence improve | To be set via baseline assessment | ≥25% relative pre-to-post improvement | Pre/post knowledge assessment |
| OUTPUT 1 — Approved learning content published at scale | 0 (Phase 1 launch gate: ~50 entries) | ≥150 published bilingual, DOH-approved ttCF/MCH entries | Admin content and approval records |
| OUTPUT 2 — Training & Certification operational | 0 | Module launched; ≥800 BHWs certified (20% of onboarded cohort) | QR-verified certification records |
| OUTPUT 3 — Platform scaled regionally | Single-site readiness | 1 priority province; ~4,000 BHWs onboarded | Provisioning and onboarding records |
| OUTPUT 4 — Government capacity strengthened | 0 | ≥15 BLHSD and LGU staff trained; runbooks delivered | Training and handover records |
| OUTPUT 5 — Governance and content approval institutionalized | 0 | MOA executed; governance bodies convened; content approval SOP adopted | Signed MOA; minutes; adopted SOP |
| OUTPUT 6 — Usage insights and alerting operational | 0 | Monthly Usage Insights Brief from Month 4; theme-spike alerts operational | Admin dashboard records; brief archive |

A baseline is established in Phase 1 covering BHW digital readiness and ttCF knowledge and practice; a midline review at approximately Month 6 informs course-correction; and an endline plus independent review at Month 11 to 12 assess Year-1 results and inform the Year-2 decision. Platform analytics provide continuous, real-time monitoring against the outcome indicators.

## 16. Value for Money

- High leverage on new financing. Two of the most expensive and highest-risk stages are already paid for by government: the national user base exists and is profiled, and the Phase 2 design and architecture are complete. Financing goes to build-out, content and deployment rather than to discovery, design and user acquisition.
- Low marginal cost at scale. The rule-based Chat Guide is designed to answer BHWs at zero marginal cost per question, so serving 26,000 — and later approximately 200,000 — BHWs incurs no per-query licensing.
- Reusable architecture. Each subsequent learning module reuses the same engine, so the cost of the second, third and fourth modules is a fraction of the first.
- No vendor lock-in. The platform is specified on a portable, open-standard stack deployable on government infrastructure, avoiding proprietary licensing and costly exit.
- A cost-effective programme base. The ttCF model this platform supports has itself been assessed as cost-effective against the WHO Commission on Macroeconomics and Health criterion.
## 17. Sustainability and Institutionalization

Sustainability is treated here as an institutional design problem, not a closing assurance. The question this section answers is specific: what keeps BHW Connect running, funded and governed after partner financing ends and after the officials who champion it today have moved on?

### 17.1 Post-project governance and ownership

- Ownership from day one. DOH, through BLHSD, owns the platform, its source code, its database and all published content throughout and after the engagement, established in the MOA rather than negotiated at closeout.
- Governance survives the project. The Content Review Panel and the content approval SOP are BLHSD instruments, not project structures. They continue to operate after the Steering Committee dissolves at closeout.
- A named institutional home. The Equity in Health and Special Concerns Section of BLHSD is the permanent owner of the platform in the DOH structure, with platform administration assigned as a defined function rather than an individual's initiative.
### 17.2 Maintenance, staffing and budget

- Capacity transfer during Year 1. Platform administration, the weekly content ritual, and assessor and certification workflows are progressively handed to BLHSD and LGU staff, with documented runbooks and at least 15 trained government administrators.
- Hosting on government infrastructure. The open, non-proprietary stack is designed to migrate onto DOH or government servers without re-platforming or licence renewal, removing dependence on donor-funded cloud subscriptions.
- A budget line, not a hope. BLHSD commits to programming recurring hosting, maintenance and content-upkeep costs into its annual work and financial plan from the closeout year onward, and to pursuing a dedicated budget line for the platform through the regular DOH budget process.
- Modest recurring cost. Because the answer engine is rule-based and the stack is open, the steady-state cost of running the platform is dominated by hosting and staff time already inside the bureau, not by per-user licensing.
### 17.3 Continuity through political and leadership transitions

Philippine health programmes routinely lose momentum at transitions — of DOH and bureau leadership, of regional and local chief executives, and of barangay officials and the BHWs they supervise. This risk is treated explicitly rather than assumed away.

- Institutionalize through issuance, not personality. The Year-1 governance work produces a draft departmental issuance covering the platform's mandate, ownership and content approval authority, targeted for adoption so that the platform's status does not rest on any incumbent's endorsement.
- Bind commitments in the MOA. Ownership, data, content approval authority, equipment disposition and post-project sustainment obligations are documented in a signed instrument between institutions, not in informal understanding between individuals.
- Anchor in a career bureau. BLHSD is a permanent DOH bureau staffed largely by career personnel, which gives the platform continuity across changes in political leadership.
- Document everything. Runbooks, the content approval SOP, architecture documentation and administrator training materials are project deliverables, so operational knowledge does not leave with any individual.
- Design for workforce turnover. BHW and local official turnover is expected, not exceptional. Self-service onboarding, refresher pathways and re-certification are designed into the platform so that a new cohort can be brought on without a new project.
- Multi-level ownership. Because the platform serves national, regional, provincial, city or municipal and barangay levels simultaneously, a change at any one level does not strand the system — value and constituency exist at every tier.
## 18. Policy Contribution

Because this engagement is delivered as direct capacity support to BLHSD, it commits to institutional and policy artifacts that DOH can formally adopt and that outlast the platform itself.

| Policy / Institutional Commitment | What It Delivers |
|---|---|
| Knowledge Base Content Governance SOP | Formalizes the content development, technical review, DOH approval, publication and periodic update workflow (Section 10.5) into an adoptable BLHSD Standard Operating Procedure for maintaining official BHW reference and learning content — usable for ttCF and every later module. |
| BHW Digital Competency & Certification Framework (proposal) | Drafts, from the Year-1 ttCF certification pilot, a proposed national framework for structured BHW competency certification — e-learning, in-person skills demonstration and verified credential — for DOH consideration as a standard applicable beyond ttCF. |
| Data Privacy & Data-Rights Compliance Playbook | Formalizes the platform's consent, retention and breach-notification mechanics into a BLHSD-adoptable data-governance playbook for BHW-facing digital tools generally. |
| Year-1 Evidence Brief | Compiles Year-1 M&E results into a policy brief supporting the evidence case for continued national investment in digital BHW support. |
| Departmental issuance on institutionalization | Drafted in Year 1 and targeted for adoption thereafter, establishing BHW Connect's mandate, ownership and nationwide applicability within DOH policy. |

## 19. Risk Management and Key Assumptions

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Change in DOH or BLHSD leadership shifts priorities | Medium | High — continuity and budget | Institutionalize through MOA and a departmental issuance rather than personal endorsement; anchor in a career bureau; embed maintenance in the bureau work and financial plan; maintain a documented evidence base that justifies continuation on its merits. |
| Change in local political leadership after elections withdraws LGU cooperation | Medium | Medium — rollout pace | Secure LGU commitments through CHD-endorsed arrangements rather than individual officials; demonstrate value to LGUs through local dashboards; sequence onboarding toward committed LGUs first; design re-engagement as a routine step, not a crisis. |
| Turnover of barangay officials and BHWs erodes the onboarded cohort | High | Medium — sustained use | Self-service onboarding, refresher content and re-certification designed in; onboarding playbook transferable to new cohorts; activation monitored continuously so attrition is visible early. |
| Delay in MOA execution stalls implementation | Medium | High — start-up | MOA drafting begins before Year 1; Phase 1 activities that do not require the MOA are sequenced first; legal review engaged early on both sides. |
| Content approval bottleneck delays publication | Medium | High — blocks launch | Content Review Panel convened in Phase 1 with a defined meeting cadence and service standard; content submitted in batches rather than at once; approval status tracked in the workstream matrix. |
| Learning content not authored fast enough | High | Blocks scale | Authoring funded as a named full-time role from Phase 1; launch gate enforced; World Vision curriculum resources reduce drafting effort. |
| Taglish matching quality disappoints at scale | Medium | Core user experience | Fixture test corpus and tunable weights; synonym dictionary grows from real gap-queue data; AI fallback covers unmatched questions while content matures. |
| Connectivity and device access in GIDA | Medium | Reach and equity | Low-end-phone responsive design already specified; offline/PWA on roadmap; Wave 1 prioritizes connected sites; satellite connectivity for the field team. |
| BHW adoption and change management | Low to medium | Outcomes | The same LGU, CHD and BHW mobilization channels that profiled nearly 300,000 BHWs nationwide within a year are used for onboarding; users are already registered, so this is activation rather than recruitment; onboarding checklists and teaching empty states designed in; activation KPI actively monitored. |
| Infrastructure limits under load | Medium | Outage risk | Budget funds infrastructure scale-up ahead of rollout, not reactively. |
| Data Privacy Act obligations at scale | Low | Legal | Consent, retention and data-subject rights already designed in; breach playbook completed under this engagement. |

Key assumptions

- A Memorandum of Agreement between DOH, World Vision and the partner can be executed within the first quarter of implementation.
- BLHSD provides supervision, endorsement and access to LGU and BHW structures for onboarding.
- LGUs cooperate in provisioning and mobilizing BHWs in the priority province.
- Basic mobile connectivity is available at Wave-1 onboarding sites within the priority province.
- Qualified MNCH experts are available to validate ttCF clinical content within the timeline.
## 20. Long-Term Platform Value and Scale-Up

> Vision, Not a Multi-Year Funding Request
>
> Years 2 to 5 describe the potential this Year-1 investment unlocks. They are not a committed budget ask — only the Year-1 figure is requested here. Each subsequent year would be scoped and proposed on its own merits, informed by evidence.

ttCF is the first of many DOH-approved learning modules, and this is the central long-term argument for the investment. Once the platform, the approval workflow and the certification engine exist, every additional module is a content and approval exercise on an established system, not a new build. Eastern Visayas is a full regional proof-of-concept, not an isolated deployment: the Phase 1 registry already represents the complete public-health hierarchy from national to barangay level, with roll-up dashboards at every tier and close to 300,000 BHWs profiled within it, and the Phase 2 architecture was designed from the outset to serve that entire national base.

Growth therefore runs on two axes at once — more BHWs, provinces and regions reached, and more health-topic content and training modules available on the same established platform.

| Year | Status | Scale and Content Growth |
|---|---|---|
| Year 1 | This ask | SCALE: ~4,000 BHWs, one priority province. CONTENT: ttCF live as the platform's first DOH-approved learning module, proven end to end. |
| Year 2 | Vision | SCALE: full regional saturation (~26,000 BHWs); Announcements, Surveys, Forum and Flip-chart phases live; first adjacent-region expansion. CONTENT: catalogue expands to Immunization and Nutrition. |
| Year 3 | Vision | SCALE: multi-region expansion; BHW Profiling System integration; offline access for low-connectivity barangays. CONTENT: Family Planning and Communicable Disease Surveillance added, alongside a piloted early-signal escalation protocol. |
| Year 4 | Vision | SCALE: national expansion phase across additional DOH regions; positioned as the national digital tool for BHW support. CONTENT: First Aid and BHW Administrative Procedures added. |
| Year 5 | Vision | SCALE: nationwide coverage approaching the full profiled base of nearly 300,000 BHWs; full institutional operation on a DOH budget line. CONTENT: a mature, multi-programme national curriculum and certification pipeline. |

## 21. Conclusion and the Ask

BHW Connect has already done something the Philippine health system had not managed in three decades: it identified and profiled close to 300,000 Barangay Health Workers nationwide within about a year. This proposal asks for catalytic support to take the next step — turning that national registry into a digital learning, training and certification platform for the same workforce. The design is complete. What is needed is the financing to build and roll it out.

With ₱6,000,000 over 12 months, the World Vision KOICA MNCH Project can fund the core team, subscriptions, equipment and independent evaluation that bring the enhanced platform to a first cohort of approximately 4,000 BHWs in Eastern Visayas and stand up the Training & Certification pathway, with ttCF as its first DOH-approved module. In doing so, the project converts its own ttCF investment into a permanent government capability, and DOH gains the foundation for every module that follows.

We welcome the opportunity to develop a full proposal, detailed logical framework and itemized budget with the World Vision KOICA MNCH Project and BLHSD.

## Annex A — Visual Prototype

A clickable, bilingual prototype demonstrating the designed Chat Guide, the administrative gap-detection and Knowledge Base publishing workflow, and the proposed Training & Certification concept is available on request from BLHSD. The prototype illustrates the Phase 1 and Phase 2 design; it is not a deployed system.

> Sample-Content Notice
>
> The ttCF health specifics in the prototype — visit schedule, sample questions and answers, quiz items, skills-demonstration checklist — are realistic sample content for demonstration only, and are not sourced from an authoritative DOH or World Vision protocol. They require clinical validation and DOH approval before any real BHW-facing use.

## Annex B — Data Privacy and Safeguards

BHW Connect's consent and data-rights mechanics are already specified in the Phase 1 design: a first-login consent screen in Filipino and English, a linked privacy notice on every screen, administrator-triggered data export and deactivate-and-anonymize actions for data-subject requests, and a defined retention schedule with chat and analytics data auto-purged after 24 months and audit events retained for five years. A breach-notification playbook aligned to the Philippine Data Privacy Act's 72-hour National Privacy Commission requirement is part of the operational hardening funded under this engagement.

Health-content safety is protected by retrieval grounding and the human clinical-validation gate described in Section 10.5: the Chat Guide's AI gap-fallback answers only from vetted Knowledge Base content, and no AI-generated content is promoted into the permanent Knowledge Base without technical review and DOH approval.
