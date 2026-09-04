# CESR — Community Event-Based Surveillance and Response

**Status: candidate module. Not scheduled, not approved, not started.**

This document takes up the CESR material shared into the project (see
[`docs/source-material/cesr/`](./source-material/cesr/README.md)) and works out what — if anything —
BHW Connect should build from it. It is written to the same standard as
[`delivery-plan.md`](./delivery-plan.md): a real scope, a real data model, real acceptance criteria,
and an honest account of what would make this a bad idea.

Nothing here is in the build sequence. `delivery-plan.md` §7 remains the build contract, and its
rule of engagement — *deliver exactly one increment at a time, in order, and do not build ahead* —
is not suspended by this document. Treat this as the artifact that lets someone decide whether CESR
becomes increments at all.

---

## 1. What CESR is

Community Event-Based Surveillance and Response is the Philippine Department of Health's
community-level early warning system, governed by the
[DOH *Interim Guidelines for Community-Based Surveillance* (July 2024)](./source-material/cesr/doh-interim-guidelines-cbs-2024.md).

The premise: outbreaks start in communities before they show up in facility data. Facility-based
surveillance alone misses them, especially in geographically isolated areas. So the system recruits
the people who would notice first — teachers, pastors, market traders, farmers, barangay kagawad —
as **Key Informants**, and routes what they notice through the BHW.

The BHW's loop is four steps:

**Detect → Confirm → Record → Report**

A Key Informant tells the BHW something unusual. The BHW *confirms* it (ages, addresses, how the
people are connected, dates of onset, animal or environmental exposure). The BHW *records* it on the
barangay signal log sheet — **every signal, including the ones that turn out not to qualify**. The
BHW then *screens* it against four signal definitions and, if it qualifies, *reports* it to the
midwife/nurse or Disease Surveillance Officer.

Above the barangay the loop continues — **Verify → Assess → Respond → Feedback** — run by the
Municipal/City Epidemiology and Surveillance Unit (MESU/CESU). A verified signal becomes an
**event**.

### The four signal definitions

These are the whole screening contract. A BHW who cannot recall these cannot do CESR.

1. **Clusters of serious illness or death** — two or more people with a similar severe illness in
   the same 1-week period, with a social connection (same neighborhood, workplace, event, school, or
   social group). *Severe = needs hospital admission.*
2. **Clusters of severe illness in animals** — large numbers of animals dying (e.g. poultry), or a
   single animal with an illness that threatens humans (rabies, anthrax).
3. **Severe illness in a person exposed to a sick animal** — e.g. a serious lung infection after
   their chickens died; sickness after a dog bite.
4. **Single individuals with certain outbreak-capable illnesses:**
   - Children with rash, fever, and either cough, colds, or red eyes
   - A child under 15 with sudden weakness of the arms or legs
   - Anyone over 2 with severe watery diarrhea bad enough to cause dehydration

### The performance targets

From the DOH guideline's BHS indicator table — these are the numbers any CESR feature would be
measured against:

| Indicator | Target |
|---|---|
| Time from emergence of a signal/event until detection | **7 days** |
| Time from detection to reporting | **1 day** |
| Proportion of signals/events with complete data | **80%** |
| Proportion of signals screened as reportable | **50%** |
| Proportion of BHWs with CBS training completed in the last 12 months | **100%** |

The field programme also tracks **7-1-7**: detect within 7 days, notify within 1, complete early
response within 7.

---

## 2. Why this lands in BHW Connect's lap

The June 2026 Monitoring & Supportive Supervision round covered Marinduque (6/6 municipalities),
Palawan & Puerto Princesa (21/24) and Quezon City (6/6). Its
[findings](./source-material/cesr/mss-feedback-2026-06.md) and the
[Marinduque activity report](./source-material/cesr/activity-report-mss-marinduque-2026-05.md)
name a set of failures that are, almost without exception, **information-system failures** rather
than clinical or training ones:

| Finding | What it actually is |
|---|---|
| Reporting is done by **photographing the paper logbook and sending it over Messenger** | No structured data ever exists |
| Signals are consolidated at MESU level but *"these are pictures and have no database"* | No database |
| A PESU Google Sheet exists for encoding but has **8 entries** total | The workaround didn't take |
| **"MESU are unable to distinguish whether the absence of reports reflects the absence of signals or a failure to report"** | No zero-reporting mechanism |
| No routine feedback except on confirmed events — *"signal reporting is not translated to surveillance report and distributed to stakeholders"* | The guideline's feedback loop is broken at every hop |
| **BHWs demonstrated gaps in recalling the signal definitions** | Reference material isn't where the work happens |
| Same logbook, *"different approaches to signal recording"* across BHS | No enforced schema |
| Key informants kept in **a separate notebook with a different template** | The roster is unmanaged |
| Coverage of signal recording ranges **4% (Sta. Cruz, 2/55) to 64% (Torrijos, 16/25)** | Most barangays are dark |

And the M&SS deck does not stop at diagnosis. It closes with an explicit product ask — a
**"CESR Signal Application"**:

| Dimension | Their specification |
|---|---|
| Users | PESU, MESU, Midwives, BHW |
| Devices | Smartphone, tablet, computer |
| Variables | Same as the CESR logbook |
| Connectivity | Online version |
| Reporting | Real-time |
| Analysis period | Weekly / monthly |
| Other | Database downloadable as Excel |

with three named components — **Enter Signal Data (form)**, **Downloadable File (Excel to BHS, MESU,
PESU and EB level)**, and **Dashboard** (summary, visualization, which signals became true events,
disease trends) — plus a **SHARE** mechanism (Signal Health Alert and Report): a weekly or monthly
email loop to the MHO, Mayor, Councilor on Health, HRMO, Planning, MDRRMO and DILG.

The Marinduque report adds the operational rule they want enforced: **weekly reporting including
zero-reports every Friday, and any BHS with 3 consecutive weeks of no reports tagged "silent"**, with
an MESU visit triggered.

That is a specification for something BHW Connect is unusually well positioned to build — because it
already has the parts nobody wants to build twice.

### What already exists that CESR would reuse

| CESR needs | BHW Connect already has |
|---|---|
| Barangay → municipal → provincial → regional → national scoping | `org_units` with `level`, `parent_id`, materialized `path`, and RLS scoping on every table (§4) |
| BHW accounts, supervisors, admins, org transfer, audit trail | INC-1/INC-2 auth, RBAC, account lifecycle, laymanized audit events |
| Filipino-first UI with an English toggle | `messages/fil.json` / `messages/en.json`, `BHW_LOCALE` cookie (§5.5) |
| Signal definitions reachable at the moment of work | The Knowledge Base + Chat Guide |
| Refresher training with a pass mark and a certificate | INC-12 e-learning: ordered modules, quiz thresholds, retake limits, QR-verifiable certificates |
| Community education materials for outbreak response | INC-14 flip-chart builder (bilingual BHW script + client-facing image) |
| A dashboard, exports, feature-flagged rollout | INC-8 reports export, INC-9 flags, `/admin/flags` |
| Cascading feedback to the people who reported | INC-10 announcements, INC-13 forum |

The genuinely new surface is narrow: **structured signal capture, a key informant roster, silent-BHS
detection, timeliness computation, and the surveillance report.** Everything else is plumbing that
already exists.

### The counter-argument, stated fairly

The [July 2026 sensitization package](./source-material/cesr/sensitization-package-2026-07.md) —
presented by the same programme, to the DOH Epidemiology Bureau — states plainly that
**"CESR does not require expensive technology"**, and lists the rollout needs as people, reporting
pathways, signal logs, feedback mechanisms and LGU policy. Not software.

Both things are true and the tension is the useful part. CESR *works* on paper — the Torrijos rabies
event met all three 7-1-7 targets with a logbook and a phone call. What fails at scale is not
detection but **aggregation, visibility and feedback**: nobody can see across barangays, nobody can
tell silence from absence, and nobody closes the loop back down. A digital tool that tries to replace
the paper loop will fail the same way the 8-entry Google Sheet failed. A tool that **absorbs the
photograph-of-the-logbook step and gives the MESU a database, a silence alarm and a report** attacks
exactly the failures the M&SS found, and nothing else.

That framing — *digitize the aggregation, not the observation* — should govern the scope below. If we
cannot hold that line, we should not build this.

---

## 3. Scope

### In scope

- **Signal capture** conforming to the DOH Annex 2 barangay log sheet, bilingual, on a phone.
- **Screening support** — the four signal definitions presented at the moment of screening, not
  buried in a manual.
- **Key informant roster** per barangay, replacing the separate notebook.
- **The reporting chain** — BHW → midwife/nurse → MESU/CESU — with state and timestamps at each hop.
- **Zero-reporting and silent-BHS detection** — the Friday zero-report, the 3-week silence rule.
- **Timeliness and data-quality indicators**, computed rather than tallied by hand.
- **Surveillance dashboard** scoped to the viewer's org unit.
- **Export** to Excel/CSV at BHS, MESU, PESU and national level.
- **Feedback down the chain**, including on signals screened as *not* reportable — the guideline
  requires this and the M&SS found it missing.

### Out of scope

- **Replacing the paper logbook.** The logbook is the legal record and works when the network does
  not. This is a parallel structured record, not a substitute. Nothing in the product should tell a
  BHW to stop writing in the logbook.
- **The ESR Information System (ESR-IS).** It is a DOH national system, and at the time of the M&SS
  round it was *down for enhancement*. Integration is a conversation with the Epidemiology Bureau,
  not a build task. Design so it is possible later; do not attempt it.
- **Clinical decision support.** BHW Connect must not tell a BHW whether something is measles. The
  four signal definitions are a screening checklist, not a diagnosis, and the guideline is explicit
  that a signal is reported *before* the cause is known.
- **Case management, contact tracing, laboratory results, animal health records.** These belong to
  MESU/PVET systems.
- **Automated escalation to anyone outside the app.** SHARE is email to named officials; that is a
  later decision with its own review, not part of a first increment.
- **Offline-first sync.** See §6.

---

## 4. Data model (proposed)

Following `delivery-plan.md` §4 conventions: every table gets `id uuid pk`, `created_at`,
`updated_at`; RLS on every table; org scoping via `org_unit_id` and the hierarchy path.

- **`key_informants`** — `org_unit_id` (barangay), `full_name`, `designation` (teacher │ religious
  leader │ barangay official │ farmer │ market trader │ animal health worker │ other),
  `sector` (community │ animal_agriculture │ environment │ school │ other — the M&SS found animal and
  agricultural sectors *"not fully integrated as key informants"*, so sector is a first-class field,
  not a note), `contact_number`, `oriented_on date` (the guideline requires orientation before a KI is
  active), `last_followed_up_on date`, `managed_by_user_id` (the BHW), `status`
  (active │ inactive). Replaces the separate notebook.

- **`signals`** — the Annex 2 log sheet, one row per signal. `org_unit_id` (barangay),
  `local_reference` (the consecutive number in that BHS's own logbook, so paper and app can be
  reconciled), `reported_by_user_id` (BHW), `source_key_informant_id nullable`,
  `source_description` (for signals from a non-rostered source — rumor, own observation),
  `detected_at timestamptz` (Annex 2 col. 3), `occurred_on date` (col. 6 — earliest of onset /
  identification / lab date), `location_text` (col. 7 — "as near as possible … so the place can be
  found again"), `description` (col. 5), `case_count`, `hospitalized_count`, `death_count` (col. 8),
  `signal_type` (cluster_illness_death │ cluster_animal_illness │ illness_after_animal_exposure │
  single_outbreak_capable_illness │ other), `screening_result` (reportable │ not_reportable │
  pending — Annex 2 col. 9's Y/N), `screening_reason` (required in both directions — the guideline
  demands a reason for Y *and* N), `reported_at timestamptz nullable` (col. 10),
  `reported_to_user_id nullable`, `response_notes` (col. 11), `recorded_by_user_id` (col. 12),
  `animal_or_environmental_exposure boolean` (drives MAO/MVO/MENRO cross-notification),
  `status` (draft │ recorded │ reported │ verified │ closed).

  Note the design consequence of the guideline: **a signal screened *not reportable* is still a row.**
  "Every signal reported to the BHW must be recorded on a log sheet … even if it turns out that some
  of the originally reported information was incorrect." The *accuracy* indicator (target 50%
  reportable) is meaningless unless the denominator includes them.

- **`events`** — a verified signal. `signal_id`, `org_unit_id` (the MESU/CESU),
  `verified_by_user_id`, `verified_at`, `disease_classification` (respiratory │ vaccine_preventable │
  foodborne_waterborne │ vector_borne │ zoonotic │ other), `assessment_notes`,
  `response_started_at`, `response_completed_at`, `cross_notified` (`text[]` of MAO │ MVO │ MENRO),
  `outcome_summary`.

- **`signal_feedback`** — `signal_id`, `from_user_id`, `to_user_id nullable`,
  `to_key_informant_id nullable`, `body`, `sent_at`. Exists so the loop the guideline draws — every
  level owes feedback to the level below — is a record, not an intention. The M&SS finding is that
  this is where the system breaks.

- **`zero_reports`** — `org_unit_id` (barangay), `week_start date`, `submitted_by_user_id`,
  `submitted_at`, unique on (`org_unit_id`, `week_start`). The Friday "nothing to report" that makes
  silence distinguishable from absence. **This one table is the single highest-value row in the
  design** — it is the direct fix for *"unable to distinguish whether the absence of reports reflects
  the absence of signals or a failure to report."*

- **`surveillance_reports`** — `org_unit_id`, `period_start`, `period_end`, `body` (generated,
  admin-editable), `published_at`, `published_by_user_id`. The CESR/SHARE report.

Derived, not stored: **silent BHS** — a barangay with no `signals` and no `zero_reports` for 3
consecutive weeks. Computed on read so the rule can be tuned without a migration.

### Roles

Phase 1 shipped `bhw` and `admin`; later increments added `assessor` and `designer`. CESR needs
supervisory review distinct from platform administration:

- **`midwife`** (BHS supervisor) — verifies and forwards signals for their barangay; runs the
  [BHS Supervisory Checklist](./source-material/cesr/bhs-supervisory-checklist-tagalog.md).
- **`dso`** (Disease Surveillance Officer, MESU/CESU) — verifies signals into events, records
  response, publishes the surveillance report, sees the silent-BHS list for their municipality.

Both scope through the existing `org_units` path. RESU/PESU are the same role at a higher org level,
not new roles.

---

## 5. Proposed increments

Sliced so each is independently shippable and each one is useful even if the next never happens.
Behind a `cesr` feature flag, default off, per the INC-9 pattern.

**CESR-1 — Signal capture and the log sheet.** `signals` table + RLS; the bilingual capture form
following Annex 2 field-for-field; the four signal definitions inline at the screening step with the
Filipino text from Annex 1.1; screening reason required for both reportable and not-reportable; a
BHW's own signal list. *Out of scope: reporting chain, roster, dashboard.*
**DoD**: a BHW records a signal on a phone-width viewport in Filipino, screens it *not reportable*
with a reason, and it persists and appears in their list; a BHW from another barangay cannot read it
(RLS test); every Annex 2 column has a field, verified against
[the guideline transcription](./source-material/cesr/doh-interim-guidelines-cbs-2024.md#annex-2-barangay-log-sheet-for-signal-recording).

**CESR-2 — Key informant roster.** `key_informants` CRUD scoped to the BHW's barangay; sector and
designation; orientation date; follow-up prompt. *Out of scope: notifying KIs from the app.*
**DoD**: a BHW rosters a KI with sector *animal/agriculture*, the KI is selectable as the source on a
new signal, and the roster is visible to their midwife and MESU but not to another barangay.

**CESR-3 — The reporting chain and feedback.** `midwife` and `dso` roles; report-to-supervisor with
timestamp; verification into `events`; `signal_feedback` down the chain including on non-reportable
signals. *Out of scope: dashboard, exports.*
**DoD**: BHW reports → midwife verifies → DSO confirms as an event, each hop timestamped and
audit-logged; a DSO sends feedback on a *not reportable* signal and the BHW sees it.

**CESR-4 — Zero-reporting and silent BHS.** `zero_reports`; a weekly submit-nothing-to-report action;
the derived silent-BHS list for MESU/PESU scope; a reminder surfaced in-app on the reporting day.
*Out of scope: SMS/email reminders.*
**DoD**: a barangay with 3 consecutive weeks of neither signals nor zero-reports appears on its
MESU's silent list, and drops off the moment either is submitted; the rule's thresholds are
configurable without a migration.

**CESR-5 — Indicators, dashboard and export.** Computed timeliness (7-day detection, 1-day
notification, 7-day response), completeness, and screening accuracy against the DOH targets; a
dashboard scoped to the viewer's org unit; Excel/CSV export at BHS, MESU, PESU and national level.
*Out of scope: SHARE email distribution.*
**DoD**: the indicators reproduce the DOH definitions exactly (numerator/denominator asserted in unit
tests against fixtures drawn from the
[Sta. Cruz M&E figures](./source-material/cesr/mss-feedback-2026-06.md#cesr-me-metrics-as-measured--sta-cruz-marinduque));
export opens in Excel with the Annex 2 columns.

**CESR-6 — Surveillance report (SHARE).** Generated period report, admin-editable before publishing,
distributed in-app via the existing announcement surface. *Out of scope: outbound email to LGU
officials — that needs its own privacy review (§7).*
**DoD**: a DSO generates a monthly report for their municipality, edits it, publishes it, and BHWs in
scope see it.

**Adjacent, and cheaper than any of the above:** the four training decks and the DOH guideline are
already-authored curriculum. Loading the signal definitions into the Knowledge Base, and the four
decks into INC-12 courses with a quiz on the signal definitions, would attack the
*"BHWs demonstrated gaps in recalling signal definitions"* finding using **machinery that already
ships** — no new tables, no new roles. If only one thing is done from this whole document, it should
probably be that.

---

## 6. Open decisions

These need answers before CESR-1, not during it.

1. **Offline.** The M&SS spec says "Online version." The same programme's field reports name
   *"connectivity constraints"* in geographically isolated areas as an active barrier, and the
   dashboard's per-barangay table shows **4 of 9 listed Palawan BHS with no mobile phone provided for
   CESR at all** (the roll-up percentages lose their category labels in the Power BI export, so treat
   the exact split as indicative — the direction is not in doubt). An online-only
   tool serves the barangays that need it least. But offline-first sync is expensive and introduces
   conflict resolution on health records. Recommendation: **online-only with a draft that survives
   page reload** (localStorage on the capture form), and revisit true offline sync only if pilot
   telemetry shows capture failures. Do not build sync speculatively.

2. **Who owns the data.** Signal records are LGU surveillance records. BHW Connect holding them
   raises a question the KB never did: on what legal basis, retained how long, and released to the
   MESU how? This is a data-sharing agreement question, not a schema question.

3. **Does the paper logbook stay authoritative?** §3 says yes. If so, `local_reference` matters and
   reconciliation is a real workflow. If the app ever becomes authoritative, that is a change in kind
   and needs DOH sign-off.

4. **Silence thresholds.** 3 weeks is what the field programme proposed. Whether it should be
   configurable per municipality is a product call.

5. **Is BHW Connect the right home at all?** Quezon City already routes BHS → CESU through Kobo
   Toolbox and was the one site the M&SS found with working digital consolidation. Building a second
   tool that competes with a working one in one of three pilot provinces is a real risk. Worth asking
   what Kobo does not do before assuming we should.

---

## 7. Risks

**Sensitive personal information — the one that changes the compliance posture.**
Everything BHW Connect stores today is either public health content or staff account data. A signal
record is neither. It contains named individuals, their addresses precise enough to find the house
again, ages, symptoms, hospitalization and death counts, and the name and phone number of the person
who reported them. Under the Data Privacy Act this is **sensitive personal information**, and the
reporter relationship makes it worse: a KI who reports a neighbour's family is identifiable to that
neighbour.

`delivery-plan.md` §5.4 already commits consent flow, retention schedule, breach process and data
rights, and `docs/breach-playbook.md` covers NPC notification. **None of that was written with
third-party health data in mind** — it was written for BHWs consenting on their own behalf. The
data subjects here never touch the app and cannot consent through it.

This is not a checkbox. It is a prior question: whether a platform designed as a knowledge and
training tool should hold identifiable case data at all, and if so under whose legal authority. It
should be settled with counsel and the LGU/DOH before CESR-1, not discovered at the pilot gate.

**Scope gravity.** Surveillance systems accrete — case management, lab results, contact tracing,
animal health. Every one of them is a reasonable next ask and none of them is BHW Connect. The
out-of-scope list in §3 is load-bearing.

**Building the 8-entry Google Sheet again.** A PESU already built a digital encoding surface for
exactly this, and it collected 8 entries. The lesson is that a tool imposing *extra* work on the MESU
does not get used. CESR features must remove the photograph-and-re-encode step, not add a
parallel one. If a BHW ends up writing the logbook *and* typing the same thing into an app with no
compensating benefit they can feel, this fails the same way.

**Pilot focus.** The pilot launch gate — KB content review, real user provisioning, DoD
re-verification, KPI baseline — is still open (README, §7). CESR is a second programme with a
different partner, different data and a different sponsor. Starting it before the pilot ships risks
both.

---

## 8. Recommendation

Do not schedule CESR increments yet.

Do three things:

1. **Settle the sensitive-data question (§7).** It gates everything and it does not need a line of
   code.
2. **Take the free win.** Load the signal definitions into the KB and the four training decks into
   e-learning courses. It uses shipped machinery, needs no new tables, and directly addresses the
   recall gap the M&SS actually measured.
3. **Ask the Kobo question (§6.5)** before committing to build capture at all.

Then, if the answers hold, CESR-1 through CESR-4 is a coherent, genuinely valuable programme —
because *"unable to distinguish whether the absence of reports reflects the absence of signals or a
failure to report"* is a solved problem in software and an unsolved one on paper, and it is the
difference between surveillance that works in 4% of barangays and surveillance that works in all of
them.

---

## Source material

Everything above is grounded in [`docs/source-material/cesr/`](./source-material/cesr/README.md) —
fourteen files extracted from the shared Drive folder *CESR Implementation EpiC GHS*. The
authoritative documents for any build are the
[DOH Interim Guidelines](./source-material/cesr/doh-interim-guidelines-cbs-2024.md) (normative) and
the [M&SS feedback deck](./source-material/cesr/mss-feedback-2026-06.md) (the product ask).
