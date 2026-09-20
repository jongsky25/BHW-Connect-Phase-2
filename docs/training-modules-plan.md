# Training Modules — Facilitator + BHW Tracks (Day 1: Basic Competencies)

## Status (read this first)

This is the build contract for the Training Modules feature, written to the
same standard as `delivery-plan.md` and `cesr-module.md`. Increments below
are meant to be picked up **one session at a time**, in order — the exact
convention `delivery-plan.md` §7's "rule of engagement" already establishes
for this codebase.

| Increment | Status |
|---|---|
| INC-19a — design mockup approval gate | ✅ Done. User approved the visual system, bookend format, and competency block via a rendered mockup artifact. |
| INC-19 — schema: sessions, enrollment, pre/post-test | ✅ Merged to `main` — [PR #53](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/53), migration `supabase/migrations/20260807000000_inc19_training_sessions.sql`. Verified against a real local Postgres 16 replay of the full migration history, not just reviewed (see the Status note inside the INC-19 section below for what that caught). |
| INC-20 — schema: pedagogy layer | ✅ Merged — migration `supabase/migrations/20260808000000_inc20_training_pedagogy.sql`. Verified against a real local Postgres 16 replay of the full migration history, not just reviewed (see the Status note inside the INC-20 section below). |
| INC-21 — loader, style guide, Module 1 (2nd approval gate) | ✅ Merged — [PR #56](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/56). `--dry-run`/`--apply` were subsequently run for real against the live pilot project in the INC-22 session (see the Status note inside the INC-21 section below) — the one item its own Status note had left open. |
| INC-22 — BHW UI: bookends, lesson renderer, visuals, pre/post-test | ✅ Merged — [PR #57](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/57). CI green including `e2e/training-sessions.spec.ts` (44 passed, 0 failed, 0 flaky) — the first increment in this plan whose e2e coverage was actually executed against a live project rather than left owed. See the Status note inside the INC-22 section below. |
| INC-21r — re-author Module 1 to its actual topic (re-opened approval gate) | 🔶 Code merged ([PR #61](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/61)); content loaded to the pilot and rendering at Detalyado since 19 Sep — **awaiting the user's yes**. Working agreement and live pilot state: `docs/session-handoff.md`. INC-21's Module 1 did not fail review on style — it failed on **subject**: it teaches the four working relationships and RA 7883 accreditation, which are modules 5 and 4's material, not the deck's Module 1 (the HEPO umbrella and the three RA 7883 roles). The pilot served that displaced version for a day after the merge, because `training:load` is manual — see "Getting the pilot to Detalyado" at the end of the INC-21r section. |
| INC-26 — slide mode | ⬜ Blocked on INC-21r. |
| INC-27 — audio narration + read-along | ⬜ Blocked on INC-26. |
| INC-28 — animated concept clips | ⬜ Blocked on INC-27. |
| INC-23 — facilitator UI | 🔶 Code complete — [PR #63](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/63), unmerged. Verified against a real local Postgres 16 replay (RLS/RPC layer), not yet clicked through in the real app — see the PR's test plan. Added a migration granting `assessor` a scoped read on `course_progress`/`course_module_progress`, a gap INC-12 left open. |
| INC-24 — author modules 2-5 | ⬜ Blocked on INC-28 (author once against a finished pipeline, per the sequencing decision). |
| INC-25 — author modules 6-9, KB entries, chat fixtures, final verification | ⬜ Blocked on INC-24. Now **four** modules, not three — §C is a nine-module map. |

**Before starting INC-21**, read this whole document, then read the actual
shipped `20260729000000_inc12_elearning.sql`, `20260807000000_inc19_training_sessions.sql`
and `20260808000000_inc20_training_pedagogy.sql` migrations — the line-number
references below point into those files. Also worth carrying forward
from INC-19/INC-20's builds, since they are easy to re-trip:

- **This codebase's RLS policies encode two genuinely different
  relationships** — *ownership* (a facilitator manages the specific rows
  they created) vs. *org-cascade* (an admin manages everything at-or-below
  their own org unit, via `org_unit_path(x) like current_org_path() || '%'`).
  Conflating them, or copying the wrong existing policy's predicate
  direction as a shortcut, produces either an over-restrictive or
  over-permissive check that still "looks right" on a read-through. Verify
  the actual direction against real org-unit UUIDs, not just by pattern-matching
  another policy's shape.
- **A raw `exists (select 1 from <other-table> ...)` inside an RLS policy,
  where that other table's own policy references back, is a real
  infinite-recursion bug**, not just a style smell — Postgres will reject it
  outright. If two-or-more of your new tables' policies need to peek at each
  other, write `security definer stable` helper functions for those specific
  lookups (mirroring `org_unit_path()`/`current_org_path()`), don't inline
  the cross-table `exists`.
- **`RETURNS TABLE (id uuid)` is unsafe** in this codebase's style: it
  implicitly declares a PL/pgSQL variable named `id` for the whole function
  body, silently shadowing any `where id = ...` against a real table later
  in the same function. Every existing RPC here avoids it (`course_id`,
  `certificate_id`, etc.) — keep doing that.
- **Never test "does this composite/row-typed variable represent a found
  row" with `v_row IS NOT NULL`.** Postgres's row-comparison NULL semantics
  make that `false` for a genuinely-found row that simply has any nullable
  column set to null — which is the common case, not the exception. Test a
  specific `NOT NULL` scalar column instead (e.g. `v_row.id is not null`).
  The safe, already-used-everywhere idiom is asserting the *negative*
  (`v_row IS NULL` → "not found"); asserting the positive is where this
  breaks.
- **Feature flags in this codebase gate the UI/route layer only** — no RPC
  anywhere checks `feature_flags` internally. Don't add that pattern; gate
  new pages/routes the same way `elearning` already gates `/courses`.
- **Verify schema changes by actually running them.** A local Postgres 16 +
  a minimal `auth`/`storage` schema stub (to stand in for what Supabase's
  managed platform provisions outside the migration files) is enough to
  replay the entire real migration history and drive real RLS-enforced
  scenarios as impersonated `authenticated`-role users
  (`set_config('request.jwt.claim.sub', <auth_user_id>, false)` after
  `set role authenticated`). This caught three real defects in INC-19 that
  a read-through missed entirely (detailed in that section below). The
  `auth.users` stub needs GoTrue's real column set (`confirmation_token`,
  `recovery_token`, etc.), not a toy `{id, email}` table — `rpc_admin_create_user`
  and its two follow-up fix migrations insert/update those columns directly,
  and Postgres's `crypt()`/`gen_salt()` need `search_path` to include the
  `extensions` schema (`alter database ... set search_path = public, extensions`)
  or every auth-touching RPC 500s on replay.
  Nothing new turned up when this same harness was run against INC-20
  (13/13 scenarios passed on the first attempt, no cross-table RLS
  recursion) — but that was *confirmed by actually running it*, not
  assumed because the two new tables' policies only look "up" toward
  `course_modules`/`courses`. INC-19's own recursion bug looked exactly as
  one-way-safe on a read-through, right up until Postgres rejected it. Run
  the harness on every future schema increment (INC-24, INC-25 touch no new
  tables, but INC-21's loader-driven inserts are still worth a real replay).
- **No RPC covers the INC-20/INC-21 columns or the two new child tables.**
  `rpc_course_create`'s `p_modules` jsonb predates
  `objectives_*`/`summary_*`/`lesson`, and no RPC exists for
  `course_module_facilitator_notes`, `course_module_visuals` or
  `course_test_questions`. INC-21's loader (`scripts/training-load.mjs`)
  writes all five tables directly through PostgREST under the admin
  token's own `_admin_write`/`for all` RLS policies instead — the same
  direct-write path `scripts/kb-load.mjs` already uses for
  `kb_entries.content_id` (see that script's own header comment). One real
  consequence: going around `rpc_course_create` means a loader-created
  course does not get a `course.created` audit event (the loader does call
  `rpc_course_set_status` for `--publish`, so `course.status_changed` is
  still recorded). Worth fixing with a proper RPC surface if a future
  increment needs the audit trail complete, not silently worked around
  again.
- **A `.mjs` script cannot import a `.ts` file without a build step**
  (Node 22, this repo's target, has no stable type-stripping). The SVG
  allowlist logic INC-20 shipped in `src/lib/elearning/svg-allowlist.ts`
  therefore has a plain-JS port at `scripts/lib/svg-allowlist.mjs` for the
  loader to use, kept in sync by hand — each has its own
  rejected-construct test suite, so drift between the two shows up as a
  difference in what each accepts, not a silent gap. Don't reach for a
  `.ts` import from a future loader script; port the logic instead, the
  same way.

---

## Context

BHW Connect Phase 2 ships an unshipped (flag-off) e-learning system from
INC-12: `courses` → `course_modules` (text/video/quiz) → `course_progress`,
with an `assessor` role that certifies a BHW after a course via an open
assessment queue and a QR-verifiable certificate
(`supabase/migrations/20260729000000_inc12_elearning.sql`).

That system was built for generic self-paced e-learning. It does not model
what this work is about: BHW training is **always facilitated** — a
supervisor runs a session, presents content, and knowledge gain is measured
by a pre-test before and a post-test after. Today there is no
facilitator-only content, no session/enrollment concept, and no pre/post-test
pairing (the existing "quiz" is a per-module pass/fail gate, not a
measurement instrument).

The source material (`DAY 1 - PART 1 PRESENTATION.pdf`, the DOH facilitator
guide, the DOH reference manual) is now checked in as transcriptions at
**[`docs/source-material/day1-basic-competencies/`](./source-material/day1-basic-competencies/)**
— read that folder's README before planning or authoring any module; it
carries the authoritative TESDA competency-and-hours table, which §C below
predates.

The user rejected the deck's bulleted information-transfer **style**
outright — but not its scope. The deck is the basis and starting point of
the course, and the two manuals supplement it; the full breadth of each
topic's learning objectives is to be delivered, minus genuine redundancy.
The replacement standard for *how* it is delivered is §A below:
scenario-driven, visual, bookended by stated objectives and a
retrieval-based summary, with an explicit competency-observation guide for
the facilitator/assessor.

First use case: **Chapter 1, Basic Competencies ("Ang BHW at ang Kanilang
Barangay")** — 9 modules (§C). "System registration" means
**training-session enrollment**, not new self-signup: accounts stay
admin-provisioned per existing convention. All new content must also be
chatbot-searchable via the author-once source-files → loader pattern
`content/kb/hhp-ncd/` established.

**Decisions locked with the user — do not re-litigate during
implementation:**

| Decision | Chosen |
|---|---|
| Facilitator role | Reuse existing `assessor`. No `users_role_check` migration. |
| "Registration" | Session enrollment, facilitator-pushed (picks BHWs in own org scope). No self-signup, no BHW self-enrollment. |
| Relationship to INC-12 | **Extend** it — new tables parented to `courses`/`course_modules`. Not a parallel system. |
| Pre/post-test | **One shared question bank per course**, taken once before content and once after. Delta = learning gain. |
| Delivery mode | **Hybrid** — a session is an optional cohort/reporting wrapper; the same course also works solo. A session is never a gate on `course_progress`. |
| Content scope | Full Day 1 chapter, all 9 modules (§C). **Chapter 1 only** — the Reference Manual's Chapters II (First Responder) and III (Primary Care / Health Promotion) are ~120 further pages and are a later phase, not this course. |
| Content authoring | Single-authored, dual-delivered: versioned files are master, loaded into course tables **and** `kb_entries`/`kb_articles`. |
| Source of scope | The deck is the **basis and starting point**; the Facilitator's Manual and Reference Manual supplement it. Full breadth of every learning objective is delivered, minus genuine redundancy — enforced by §C.2's `coverage.json`, not by good intentions. |
| Module map | Nine modules, one per TESDA basic competency, weighted by the regulation's training hours (§C). |
| Delivery modalities | Four renderings of one authored lesson: read (INC-22, shipped), slides (INC-26), audio narration with read-along (INC-27), animated concept clips (INC-28). Authored once as `LessonSection[]`; no modality gets its own content. |
| Text-to-speech | Azure Speech `fil-PH-BlessicaNeural` primary (native Filipino voice, free word/sentence boundary events, 500K chars/month free tier — the whole nine-module course fits inside it); `edge-tts` as the zero-cost fallback on the same voice catalog. Timing JSON format identical between the two so the provider can be swapped without re-authoring. |

**Rule of engagement** (from `delivery-plan.md`, unchanged): one increment
per session, in order; do not start the next until the previous DoD is
verified. Anything marked *Out of scope* in an increment is deliberately
excluded.

---

## §B. Traceability — where each stated requirement is delivered

| The user asked for | Delivered in |
|---|---|
| Facilitator track + BHW track, two materials | §A.3 + INC-20 (schema), INC-23 (facilitator UI) |
| Pre-test and post-test | INC-19 (schema + RPC), INC-22 (BHW UI) |
| System registration, so it can be tried | INC-19 (`course_sessions`, `course_session_enrollments`) + INC-23 |
| Our own style/standard/branding, not the source deck | §A + INC-19a mockup gate + INC-21 style guide |
| **Visuals that help understanding** | §A.2 + §D (6 diagram primitives) + INC-20 (`course_module_visuals`) + INC-22 (renderer) |
| **State what will be learned, summarize what was learned** | §A.1 + INC-20 (`objectives_*`/`summary_*` columns) + INC-22 (bookend rendering) |
| **Facilitator guide to what competency to look for** | §A.4 + INC-20 (`competency_statement_*`, `observation_indicators`) + INC-23 (observation checklist) |
| **Facilitator-adjustable short/normal/long lesson density** | §A.6 + INC-19 (`course_sessions.lesson_density`) + INC-20 (`tier` on sections/visuals) + INC-22 (renderer filter) + INC-23 (density selector) |
| Materials feed the knowledge-base chatbot | INC-21 loader + INC-25 (KB entries + chat fixtures) |
| **Full breadth of the source delivered, not a condensed sample** | §C.2 (`coverage.json` + loader check) + INC-21r |
| **Not just a book — concepts presented one at a time** | INC-26 (slide mode) |
| **Audio I can play while reading** | INC-27 (pre-rendered narration + sentence read-along) |
| **Animated clips explaining concepts** | INC-28 (animated SVG scenes; Remotion where video is genuinely needed) |
| Built in phases and increments | INC-19a → INC-28, each independently shippable |

---

## §A. Content & Instructional Design Standard

This is the contract INC-21's style guide formalizes and INC-20's schema
enforces structurally.

### A.1 Every module is bookended

- **Opening — "Sa dulo ng bahaging ito, kaya mo nang…"**: 3–4 objectives as
  *observable actions*. Banned verbs: `malalaman`, `maiintindihan`,
  `understand`, `know about` — if it cannot be observed, the assessor cannot
  assess it. These same lines are the source of the A.4 observation
  indicators, so objectives and indicators are authored as one pair.
- **Closing — "Ano ang natutunan mo?"**: **retrieval-first**. The learner is
  prompted to recall before the summary is revealed, then sees the
  consolidated summary assembled from each section's `takeaway`.
  A closing summary that merely restates the opening objectives is a failed
  summary — rejected in content review *and* mechanically by the loader
  (INC-21).

Both are **structured columns, not prose in the body**, so an author cannot
skip them and the renderer presents them identically — the same
enforcement-in-the-database reasoning INC-18b used for its review gate.

### A.2 Visuals

**Mechanism — decided.** Two, chosen per visual type:

1. **Inline SVG authored in the content files** — the default, and correct
   for every *instructional* diagram. Reasons are constraints this repo
   already enforces: ~2–6 KB against the ≤300 KB per-route budget
   (`delivery-plan.md` §5.2) on a Fast-3G low-end-Android target, where a
   photo costs 100 KB+; it inherits `src/styles/tokens.css` so it is correct
   in dark mode and high-contrast mode; it scales with `--font-scale`; its
   labels are bilingual fields; it is diffable in git.
2. **Raster image in Supabase Storage** — only for photographs and
   procedural illustrations that need them (PPE worn correctly, sharps
   disposal, cuff placement). Reuse the bucket + `storage.objects` policy
   pattern at `20260731000000_inc14_flipcharts.sql:111-120` and the existing
   browser-side upload path used for KB entry images.

**Two non-negotiable rules:**
- **The caption states the takeaway, not the label.** "Ang midwife ang
  technical supervisor ng BHW — dito dumadaan ang mga concern na
  pangkalusugan", never "Organizational chart".
- **Never text-on-slide read aloud.** The facilitator script pairs the
  *visual* with *spoken* explanation; BHW-facing text does not duplicate
  what the facilitator says. Duplicating narration as on-screen text splits
  attention and costs retention — the source deck does this on nearly every
  slide.

Every visual carries **required** `alt_text_fil`/`alt_text_en`.
*Noted, not fixed here:* `flip_chart_pages.client_image_url` has no alt-text
column, so that shipped feature cannot pass the axe-core bar other
increments hold themselves to. Out of scope (this repo avoids drive-by fixes
inside another increment's migration) — but do not extend the gap.

### A.3 Two tracks, one authoring pass

| | BHW-facing | Facilitator-facing |
|---|---|---|
| Source | `lesson.{fil,en}.md`, `module.json` | `facilitator-notes.{fil,en}.md`, `competency.json` |
| Stored in | `course_modules` (+ `course_module_visuals`) | `course_module_facilitator_notes` |
| Visible to | `bhw`, `assessor`, `admin` | `assessor`, `admin` **only** (RLS) |
| Contains | objectives → scenario → chunked sections + visuals + retrieval checks → retrieval-first summary | objective, timing, delivery script, named misconception, discussion prompts, answer key, **competency observation checklist** |

### A.4 Facilitator/assessor competency guide

**The gap this fills:** `rpc_assessment_decide(p_assessment_id, p_passed,
p_notes)` today takes a boolean and free text with **no criteria at all** —
an assessor certifying a BHW has nothing to observe against. Since the
certificate is aligned to TESDA BHS NC II, a *competency-based* framework,
the observable-evidence rubric is what makes the certificate mean something.

Per module:
- **Competency statement** — the BHS NC II competency the source facilitator
  guide names for that topic (§C table), so modules stay
  certification-aligned.
- **Paired observation indicators**, one pair per objective:
  - **Nakikita (kaya na):** what the BHW visibly *does or says*. Behavioral
    and checkable — "nagtanong ng open-ended na tanong bago magpayo", never
    "understands communication".
  - **Hindi pa sapat:** the specific common shortfall, so an assessor knows
    what failure looks like and does not pass a BHW out of politeness.
- **3-level guidance text** per indicator (`kaya_na` /
  `kailangan_pa_ng_practice` / `hindi_pa_kaya`) describing what each level
  looks like *for that indicator*.

Rendered as a **read-only observation checklist** (INC-23), deliberately not
an interactive rating control: an input that silently discarded the
assessor's entry would be the decorative-control problem INC-18b rejected.

**Explicitly deferred, named so it is not silently dropped:** persisting
per-indicator ratings and wiring them into `rpc_assessment_decide` as
structured data. That changes the certification data model and earns its own
increment with its own DoD. For this pass the assessor reads the rubric and
still decides via the existing unmodified binary RPC.

### A.5 Retrieval practice inside the lesson — no new table

Low-stakes self-checks sit between chunks (the highest-leverage retention
technique available). They are **authored inline in `lesson` and never
persisted** — nothing scores them, nothing gates on them, no attempt row is
written. Retrieval practice works ungraded, and this avoids a third
question bank alongside the summative `course_quiz_questions` (module gate)
and `course_test_questions` (pre/post measurement). Tracking formative
answers would be a separate increment, not a quiet addition.

### A.6 Lesson density — facilitator-set, tagged not tripled

**User request, added after INC-19a's first review round.** A facilitator
should be able to set a session to a shorter or longer version of the same
lesson. The wrong way to build this is three independently authored lessons
per module — that triples the authoring bottleneck
`delivery-plan.md` §9's risk register already names as the highest-risk item
("KB seed content doesn't get authored"), and it breaks the single-authored
decision in this plan's own Context section. The right way is **tagging**:

- Every `LessonSection` (and every `course_module_visuals` row) carries one
  `tier`: `core` | `standard` | `deep`. **Authoring rule, non-negotiable and
  stated in the style guide (INC-21a): `core` sections alone must satisfy
  every one of the module's objectives.** `standard` adds the reflection
  prompts, second worked examples, and elaboration; `deep` adds enrichment —
  an extra contrasting scenario, additional practice. This is authored in
  the *same pass* as everything else, as one lesson with tags, not three
  lessons.
- Density is purely which tags render: **Maikli** (short) = `core` only;
  **Karaniwan** (normal, the default) = `core` + `standard`; **Detalyado**
  (long) = all three. Strictly additive — nothing is rewritten per density,
  only shown or hidden.
- **The control belongs to the facilitator, per session** — they know their
  group's pace — not to the BHW and not per-module. A solo/self-paced BHW
  (no session) always gets `normal`. Making density a BHW-facing preference
  is a real possible future increment, named here so it is not silently
  assumed: it is not built in this pass.

This folds into existing increments rather than earning a new one:
`course_sessions.lesson_density` (INC-19), `tier` on `LessonSection`/
`course_module_visuals` (INC-20), the tiering rule in the style guide plus a
loader check that every module has at least one `core` section per
objective-count (INC-21), the renderer's tier filter (INC-22), and the
facilitator's density selector (INC-23).

---

## §C. The 9 modules and their competencies

One module per BHS NC II competency — do **not** merge topics that map to
different competencies, and do not split one competency across several
modules either, or the A.4 rubric stops being one-to-one in one direction
or the other.

**Corrected against the source, 19 September 2026.** This table used to
list 8 modules, inferred from the deck's topic list. The authoritative
mapping is the TESDA table on p.12 of the DOH Facilitator's Manual
(`docs/source-material/day1-basic-competencies/facilitator-guide.md`,
PDF page 19) — it names **nine** basic competencies with required training
hours. Four things were wrong and each moved a module boundary:

1. **The BHS policies are their own competency**, *Practice entrepreneurial
   skills in the workplace* (4 h) — not applied examples inside the UHC
   module, which is where the old table folded them.
2. **BHW-at-Barangay, Team Work and Self-Management are one competency**,
   *Work in a team environment* (3 h) — the old table split them across
   three modules, which breaks the one-to-one rule from the other side.
3. **A ninth competency had no module at all** — *Exercise efficient and
   effective sustainable practices in the workplaces* (3 h).
4. **The hours are wildly unequal** (8 for Komunikasyon, 6 for Tungkulin,
   3 for most others) and the old table treated all modules as peers.

| # | Folder | Module | BHS NC II competency | Hours |
|---|---|---|---|---|
| 1 | `01-tungkulin-ng-bhw` | Ang mga Tungkulin ng Isang BHW | Participate in workplace communication | 6 |
| 2 | `02-uhc-act` | Ang UHC Act of 2019 | Contribute to workplace innovation | 3 |
| 3 | `03-polisiya-bhs` | Mga Polisiya sa Barangay Health Station | Practice entrepreneurial skills in the workplace | 4 |
| 4 | `04-ra7883` | RA 7883: Benepisyo, Karapatan, Akreditasyon | Develop life and career decisions | 3 |
| 5 | `05-bhw-at-barangay` | Ang BHW at ang Kanyang Barangay (+ Team Work, Self-Management) | Work in a team environment | 3 |
| 6 | `06-komunikasyon` | Epektibong Komunikasyon | Present relevant information | 8 |
| 7 | `07-problema` | Pagkilala sa Problema at Pagpaplano ng Solusyon | Solve or address general workplace problems | 3 |
| 8 | `08-osh` | Occupational Safety and Health | Practice occupational safety and health policies and procedures | 4 |
| 9 | `09-sustainable-practices` | Mabisang Gawi sa Lugar ng Trabaho | Exercise efficient and effective sustainable practices in the workplaces | 3 |
| | | | **Total** | **37** |

**Hours are the weighting signal, not a schedule.** They do not become a
field anywhere; they tell the author how much content a module is expected
to carry. Module 6 at 8 hours is the largest topic in the chapter and
Module 1 at 6 the second — a nine-module course where every module is the
same size contradicts its own source. Where a module's hours exceed ~4, the
`standard` and `deep` tiers are where the extra breadth goes, not a longer
`core`.

Modules 8 and 9 share the same source topic (Occupational Safety and Health)
but are two distinct competencies in the TESDA table, so they are two
modules with two competency blocks. Module 9's material — workplace best
practices, efficient use of resources (water, electricity, supplies),
resourcefulness, workplace productivity — comes from the Facilitator's
Manual p.15 (PDF 22), not the deck, which does not cover it.

**Known contradiction in the source, resolved:** the Facilitator's Manual
gives Tungkulin 6 hours in the competency table and "at least 3 hours" in
its own narrative on p.13 (PDF 20). **We use 6** — the table is the TESDA
regulation's own summary and the narrative reads like an unrevised
carry-over. Noted so the discrepancy is not rediscovered as a bug.

---

## §C.2 Coverage — "full breadth" made mechanical

**Decided with the user, 19 September 2026.** §A rejects the source deck's
*style*; it does not license dropping its *scope*. The full breadth of each
topic's learning objectives is to be delivered, minus genuine redundancy.
That is a promise no read-through will keep reliably across nine modules,
so it is enforced the same way tiering and bilingual parity already are —
by the loader.

Each module folder carries a **`coverage.json`** enumerating the concepts
its sources oblige it to teach, each with a stable id, a one-line statement,
and a citation into `docs/source-material/day1-basic-competencies/`:

```json
{
  "concepts": [
    {
      "id": "m1.role.educator",
      "statement_en": "The BHW as Health Educator: teaches households how to keep body and environment healthy, across every life stage.",
      "source": "deck slide 10; reference-manual PDF 11-12",
      "redundant_with": null
    },
    {
      "id": "m1.filler.heels",
      "statement_en": "\"Health Facts\" slide on high heels and shopping.",
      "source": "deck slide 45",
      "redundant_with": "not DOH content; unrelated to any competency — deliberately not delivered"
    }
  ]
}
```

Every `LessonSection` heading gains an optional trailing `{ids}` marker
naming the concepts it delivers:

```markdown
## [concept/core] Tatlong tungkulin sa ilalim ng HEPO {m1.role.educator, m1.role.organizer, m1.role.provider}
```

**The loader rejects** a module where any `coverage.json` concept is neither
delivered by a `core`/`standard` section nor explicitly excused via
`redundant_with`. `deep` does not count — a concept only reachable at
Detalyado density is not delivered to the BHW who gets Karaniwan. An
unknown id in a heading marker is likewise rejected, so a typo fails loudly
rather than silently dropping a concept from the check.

This makes the coverage claim auditable: `coverage.json` is the contract,
the markers are the evidence, and a dropped concept fails CI rather than
being discovered by a facilitator in a room.

Authoring a module therefore starts by reading its topic across all three
source documents (the cross-reference table in that folder's README says
where each topic sits in each) and writing `coverage.json` **first** — before
any lesson prose.

---

## §D. Visual primitives — 6 fixed layouts, not bespoke art

Hand-authoring unique SVG per diagram will not produce a consistent system
and is slow. Instead, six parameterized layout templates live in
`content/training/_visual-primitives/`; authoring a visual means **filling in
labels**, not inventing geometry.

| Primitive | Shape | Used for |
|---|---|---|
| `hub-spoke` | center node + N radiating labels | BHW's 4 roles (M1) |
| `chain` | left→right sequence with arrows | referral pathway, escalation (M4) |
| `contrast` | two panels: Mali / Tama | OSH procedures (M8) |
| `map` | relationship graph, labeled edges | who-to-approach (M4) |
| `tree` | binary decision tree | problem prioritization (M8) |
| `stack` | layered hierarchy | org levels, policy hierarchy (M2) |

Conventions every primitive follows:
- Fixed `viewBox="0 0 640 400"`, no width/height attributes (scales to
  container).
- Color **only** via `currentColor` and the token variables already defined
  in `src/styles/tokens.css` — never a hex literal, which is the same rule
  `tokens.css` already enforces repo-wide.
- `<title>` element present for assistive tech, in addition to the required
  `alt_text_*` columns.
- Max ~12 text labels; beyond that the diagram is doing too much and the
  content should split.
- Font sizing in relative units so `--font-scale` applies.

---

## Increment Sequence

### INC-19a — Design mockup of one slice (approval gate, no code) — ✅ DONE

**Ran first, blocked everything.** Deliverable: one rendered mockup of
**Module 1's "Health Educator" slice**, both views side by side:
- **BHW view**: objectives bookend → scenario → chunked sections with a real
  `hub-spoke` SVG → an inline retrieval check → retrieval-first summary.
- **Facilitator view**: same slice with delivery script, timing, named
  misconception, **and** the A.4 competency block.

Built as a standalone HTML mockup (Design-canvas Artifact) and published
for review — not wired into the app, no migration, no repo-committed
feature code. Styled with the real values from `src/styles/tokens.css`,
including a dark-mode pass and a largest-`--font-scale` pass, plus a live
density toggle (added after the user's follow-up request — see §A.6).

**Outcome**: user approved the visual system, the bookend format, and the
competency block. That approval is what froze §A above. The exact Filipino
text from the mockup's Module 1 slice should carry forward into INC-21's
Module 1 authoring, not be rewritten from scratch.

Two real gaps in `src/styles/tokens.css` surfaced while building the
mockup's dark-mode pass, not yet fixed anywhere (raise during INC-22, which
is the first increment that actually ships dark-mode-rendered training UI):
- Semantic colors (`--color-success`/`warning`/`danger`/`info`) have no
  dark-mode variants and fail WCAG contrast against the dark canvas.
- `--color-primary` is used as both a button fill (needs light text on it)
  and as a text/border color (needs to pass contrast itself) — these are
  incompatible requirements on one token. Needs splitting into something
  like `--color-primary` (fill) + `--color-primary-text` + an
  `--color-on-primary` text-on-fill token.

*Out of scope: everything else.*

---

### INC-19 — Schema: sessions, enrollment, pre/post-test — ✅ MERGED

**Migration**: `supabase/migrations/20260807000000_inc19_training_sessions.sql`
(merged via [PR #53](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/53)).

Read `20260729000000_inc12_elearning.sql` first and match its idioms
exactly — in particular `(select public.current_app_user()).id` is how a
policy resolves the acting app user, and `org_unit_path()` /
`current_org_path()` do all scope comparison. Do not invent new helpers
for scope checks (do, however, add narrow `security definer` lookup helpers
when two of your own new tables' RLS policies need to reference each other
— see the recursion note below and in the Status section at the top of
this document).

Tables shipped: `course_sessions` (incl. `lesson_density`
short/normal/long, §A.6), `course_session_enrollments`,
`course_test_questions` (course-level shared pretest/posttest bank, not
per-module like `course_quiz_questions`), `course_test_attempts`
(`session_id` nullable — null means a solo/self-paced attempt).

**RLS** — two different relationships are at play, and conflating them is
the likeliest mistake: **ownership** (a facilitator manages the specific
sessions they scheduled) vs. **org-cascade** (an admin oversees everything
at-or-below their own org unit, the `courses_admin_write` shape). Ownership
for the facilitator, cascade only for the admin. See the shipped
migration's own header comment and inline RLS comments for the full
reasoning, including why `course_test_attempts`'s facilitator-visibility
policy uses ownership (via a session) rather than cascade, and why the
enrollment scope check deliberately does **not** copy
`rpc_assessment_claim`'s existing org-scope predicate (that predicate only
self-matches against a leaf-level org unit, which would have made a
facilitator only able to enroll BHWs at their own exact barangay instead of
the barangays under them).

**RPCs shipped**: `rpc_course_session_create` (returns `session_id`, not
`id` — see the Status section), `rpc_course_session_set_density`,
`rpc_course_session_enroll`, `rpc_course_session_cancel`,
`rpc_course_test_submit` (reuses `rpc_course_quiz_submit`'s answer-jsonb
convention and scoring arithmetic; guards pretest-before-content-starts,
posttest-after-content-completed, and no-duplicate-phase, each with a
distinct error message). `rpc_course_delete`'s existing
`course_progress`-exists guard was extended to also block on
`course_test_attempts`.

**Audit**: `course_session.created`/`enrolled`/`cancelled`,
`course_test.submitted` — appended to `docs/delivery-plan.md` §5.6's
taxonomy note and to `audit_event_visible_to_admin` (org-scoped, same
pattern as `course`/`assessment`).

**Flag**: `course_sessions`, seeded `false`. Gates the facilitator UI
(INC-23) and the BHW pretest/posttest UI (INC-22) at the route/UI layer —
**not** inside any RPC; this codebase's RPCs never check `feature_flags`
internally (confirmed by reading every existing RPC before assuming
otherwise — see the Status section).

**Verification — actually run, not just reviewed.** The entire existing
migration history (baseline through INC-18b) plus this migration was
replayed against a real local Postgres 16 instance (a hand-built minimal
stand-in for Supabase's `auth`/`storage` schemas substituted for what the
managed platform provisions outside the migration files), then driven
through 16 functional scenarios as real `authenticated`-role sessions with
per-user `auth.uid()` impersonation, RLS fully enforced throughout — not
bypassed via a superuser shortcut. All 16 passed on the final migration.
Three real defects were found this way that a read-through missed
entirely, all fixed before merging (full detail and rationale live as
comments in the migration file itself):

1. `rpc_course_session_create` originally declared `returns table (id
   uuid)`. `RETURNS TABLE` implicitly declares a same-named PL/pgSQL
   variable for the whole function body, which made a later `where id =
   p_course_id` against `public.courses` silently ambiguous — compiles
   fine, only fails at call time. Renamed the output column to
   `session_id`, matching this codebase's existing convention of never
   naming a `RETURNS TABLE` column `id`.
2. A genuine circular RLS dependency across `course_sessions` ↔
   `course_session_enrollments` ↔ `course_test_attempts` — each
   cross-referenced another via a raw `exists (select 1 from
   <other-table> ...)` inside its own policy. Postgres correctly rejected
   this as `infinite recursion detected in policy for relation
   course_sessions`. Fixed with three new `security definer stable` helper
   functions (`course_session_facilitator_id`, `course_session_org_unit_id`,
   `bhw_session_enrollment_exists`) that look up one table without
   triggering that table's own RLS — the exact same medicine
   `org_unit_path()`/`current_org_path()` already provide for `org_units`,
   just needed between two of this migration's own new tables.
3. A Postgres row-comparison NULL trap in the pretest guard: `v_progress IS
   NOT NULL` on a composite/row-typed PL/pgSQL variable is only `true` when
   *every* field is non-null. A real, in-progress `course_progress` row has
   `content_completed_at` still null, so that check silently evaluated
   `false` for a row that plainly existed — letting a BHW submit a pretest
   after content had already started. Fixed by testing the primary-key
   scalar (`v_progress.id is not null`) instead of the whole composite.
   Confirmed by an isolated reproduction against a throwaway table showing
   `IS NULL` and `IS NOT NULL` can both be `false` on the same
   mixed-null-field row.

*Out of scope (as shipped): all UI, all pedagogy schema (INC-20), all
content.*

---

### INC-20 — Schema: the pedagogy layer (bookends, lesson, visuals, competency) — NEXT

**Migration**: `supabase/migrations/<ts>_inc20_training_pedagogy.sql`
(pick a timestamp after `20260807000000`).

```sql
-- §A.1 bookends + §A.2/A.5 structured lesson. Nullable/defaulted so every
-- existing INC-12 course is untouched and renders exactly as before.
alter table public.course_modules
  add column objectives_fil text[] not null default '{}',
  add column objectives_en  text[] not null default '{}',
  add column summary_fil text not null default '',
  add column summary_en  text not null default '',
  add column lesson jsonb;          -- null => render body_fil/body_en as today

-- §A.4 competency guide, on the facilitator-notes table so RLS keeps it
-- away from bhw entirely.
create table public.course_module_facilitator_notes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null unique references public.course_modules(id) on delete cascade,
  notes_fil text not null default '',
  notes_en text not null default '',
  competency_statement_fil text not null default '',
  competency_statement_en text not null default '',
  -- [{ objective_index, observable_fil, observable_en, not_yet_fil,
  --    not_yet_en, levels: { kaya_na_fil, kaya_na_en,
  --    kailangan_practice_fil, ..., hindi_pa_fil, ... } }, ...]
  observation_indicators jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- §A.2 visuals. Exactly one of svg_markup / image_url. Caption states the
-- takeaway. alt_text_* required — flip_chart_pages shipped without it and
-- cannot pass an axe-core DoD; do not extend that gap.
create table public.course_module_visuals (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  position integer not null,
  primitive text not null
    check (primitive in ('hub-spoke','chain','contrast','map','tree','stack','image')),
  svg_markup text,
  image_url text,
  caption_fil text not null,
  caption_en text not null,
  alt_text_fil text not null,
  alt_text_en text not null,
  -- §A.6: default 'core' — a visual only becomes hideable at short density
  -- if the author deliberately marks it enrichment, not by omission.
  tier text not null default 'core' check (tier in ('core','standard','deep')),
  created_at timestamptz not null default now(),
  unique (module_id, position),
  check (num_nonnulls(svg_markup, image_url) = 1),
  check (length(trim(alt_text_fil)) > 0 and length(trim(alt_text_en)) > 0)
);
```

**RLS — apply the INC-19 lessons here too, before writing a line:**
- `course_module_facilitator_notes_assessor_admin_read`: `select` for
  `assessor`/`admin` only — **no `bhw` branch at all**, which is the entire
  reason this is a separate table (Postgres RLS is row-level, so these
  columns on `course_modules` would be unhideable from a `bhw` who can
  already read that row). Write policy mirrors `course_modules_admin_write`
  joined through `course_modules` → `courses`.
- `course_module_visuals_read` / `_admin_write`: mirror
  `course_modules_read` / `_admin_write` — visuals are learner-facing and
  follow the module's own scope.
- The new `course_modules` columns need **no policy change**: they ride the
  existing module policies, which is safe here precisely because all four
  are learner-facing.
- **Check for a recursion risk before shipping**: does any policy here need
  to look up `course_modules` or `courses` from `course_module_visuals` or
  `course_module_facilitator_notes` in a way that could cross back? On a
  first read this looks like a one-way reference (visuals/notes → modules →
  courses, never the reverse), so it's probably fine — but INC-19 looked
  fine on a read-through too. Actually run it against a real Postgres
  before calling this DoD met, the same way INC-19 was verified (see that
  section above for the harness approach: a local Postgres 16, a stub
  `auth`/`storage` schema, the full migration replay, and RLS-enforced
  scenarios via `auth.uid()` impersonation — reuse the same scripts rather
  than rebuilding them from scratch).

**The `lesson` jsonb shape** — add to `src/lib/elearning/types.ts` and treat
as the contract the loader writes and the renderer reads:

```ts
export type LessonCheck = {
  prompt_fil: string; prompt_en: string;
  options: QuizOption[];            // reuse the existing QuizOption type
  correct_option_index: number;
  feedback_fil: string; feedback_en: string;
};

export type LessonTier = "core" | "standard" | "deep";
export type LessonDensity = "short" | "normal" | "long";

// §A.6: strictly additive — normal includes core, long includes everything.
export const TIERS_FOR_DENSITY: Record<LessonDensity, LessonTier[]> = {
  short: ["core"],
  normal: ["core", "standard"],
  long: ["core", "standard", "deep"],
};

export type LessonSection = {
  kind: "scenario" | "concept" | "contrast" | "practice";
  tier: LessonTier;                 // §A.6 — core sections alone must cover every objective
  heading_fil: string; heading_en: string;
  body_fil: string; body_en: string;
  visual_position: number | null;   // -> course_module_visuals.position
  takeaway_fil: string; takeaway_en: string;
  check: LessonCheck | null;
};

export type Lesson = { sections: LessonSection[] };
```

`takeaway_*` per section is what the closing summary is assembled from
(§A.1), and it is what makes "the summary isn't just the objectives
restated" checkable mechanically.

**SVG safety — required, not optional.** `svg_markup` is markup rendered
into the page, so it must never reach the DOM through unsanitized
`dangerouslySetInnerHTML`. Build `src/lib/elearning/svg-allowlist.ts` with
two exports: a validator used by the loader (INC-21) and a sanitizer used by
the renderer (INC-22), defense in depth.
- Allow: `svg g path rect circle ellipse line polyline polygon text tspan
  title defs marker`, plus geometry/`viewBox`/`fill`/`stroke`/
  `stroke-width`/`class`/`text-anchor`/`transform`/`font-size`/`d`/`points`.
- **Reject** (do not strip): `<script>`, `<foreignObject>`, `<image>`, `<use>`,
  any `on*` handler, any `href`/`xlink:href`, any `style` attribute, and any
  hex color literal — so an authoring mistake fails loudly in CI, the same
  reject-don't-repair stance `parseKbDraft` takes in INC-18b. Hex literals
  are rejected because `tokens.css` is the only place in this repo allowed to
  hold them.
- Unit test one case per rejected construct. `/admin/kb`-style console
  authoring means an admin could eventually write this field through a UI, so
  "it is version-controlled content" is not by itself sufficient.

**DoD**: a `bhw` selecting `course_module_facilitator_notes` gets zero rows
regardless of course visibility, including the competency columns; a `bhw`
*can* read `course_module_visuals` for a visible module; inserts violating
the one-of/alt-text/primitive constraints are rejected; a `course_module_visuals`
insert with an invalid `tier` is rejected and one with no `tier` defaults to
`'core'`; the validator rejects each banned construct with a test per case;
every pre-existing `course_modules` row reads correctly at the new defaults;
`npm run lint`, `npm test` and `e2e/elearning.spec.ts` all pass unchanged;
**the migration was actually applied and exercised against a real Postgres
instance**, per the note above, not only reviewed.

*Out of scope: UI, loader, content.*

**Status — done, shipped as
[`20260808000000_inc20_training_pedagogy.sql`](../supabase/migrations/20260808000000_inc20_training_pedagogy.sql).**
`src/lib/elearning/types.ts` got the `Lesson`/`LessonSection`/`LessonCheck`/
`LessonTier`/`LessonDensity`/`TIERS_FOR_DENSITY` types plus
`CourseModuleVisual`/`CourseModuleFacilitatorNotes`, and
`src/lib/elearning/svg-allowlist.ts` ships `validateSvgMarkup`/
`sanitizeSvgMarkup` with a failing-fixture unit test per rejected construct
(`svg-allowlist.test.ts`, 15 cases).

**Verification — actually run, not just reviewed**, same harness approach as
INC-19: the entire migration history (baseline through INC-19) plus this
migration was replayed against a real local Postgres 16 instance (the same
hand-built `auth`/`storage` schema stub — GoTrue's real `auth.users` column
set, not a toy `{id, email}` table, since `rpc_admin_create_user` and its two
follow-up fix migrations insert/update specific GoTrue columns directly), then
driven through 13 functional scenarios as real `authenticated`-role sessions
with per-user `auth.uid()` impersonation, RLS fully enforced throughout. All
13 passed on the first attempt — unlike INC-19, this migration's own
first-draft read-through turned out to be correct: `course_module_visuals`
and `course_module_facilitator_notes` really do only ever look "up" toward
`course_modules`/`courses`, never at each other, so no cross-referencing
`security definer` helper functions were needed here. That was **confirmed by
actually running it**, not assumed from the shape looking one-way safe on a
read-through — INC-19 looked one-way safe on a read-through too, right up
until Postgres rejected it. Scenarios covered: a `bhw` gets zero
`course_module_facilitator_notes` rows even after a note exists for a module
they can otherwise see (competency columns included); an in-scope `assessor`
can read it and an out-of-scope `assessor` (disjoint org subtree) cannot; an
in-scope `admin` can read and update it; a `bhw` can read
`course_module_visuals` for a visible module; a `course_module_visuals`
insert with no `tier` given defaults to `'core'`; inserts violating the
invalid-tier, one-of-svg/image (both null and both set), blank-alt-text, and
invalid-primitive constraints are each rejected; a `bhw` cannot write to
either new table (confirmed by re-reading the row afterward, unchanged); and
a pre-existing INC-12 `course_modules` row reads correctly at the new
column defaults (`{}` / `''` / `null`).

`npm run lint`, `npx tsc --noEmit`, and `npm test` (187 tests, including the
new 15) all pass. `e2e/elearning.spec.ts` is confirmed byte-for-byte
unchanged (`git diff` against the pre-INC-20 tree), consistent with this
increment touching no UI/route code — it was not re-executed against a live
Supabase project in this session (no `bhw-connect-e2e` credentials were
available in the environment), so it still owes an actual green CI run
before INC-21 starts, same as any other pushed change.

---

### INC-21 — Loader, style guide, and Module 1 (second approval gate)

Three things together, because a loader is only proven by real content and
content is only proven by a loader.

**21a — `docs/training-content-style-guide.md`**: §A as approved in INC-19a,
expanded so a non-developer author can follow it unaided — the allowed vs
banned objective verbs, why the summary is retrieval-first and how to write
one that is not the objectives restated, the §D primitive table and
conventions, the takeaway-caption rule with before/after examples, how to
write a paired Nakikita / Hindi pa sapat indicator that is behavioral, and
how many retrieval checks per module and where they sit.

**21b — the authoring format.** Content lives at
`content/training/day1-basic-competencies/`, mirroring
`content/kb/hhp-ncd/`'s conventions (see `content/kb/README.md`):

```
content/training/day1-basic-competencies/
  sources.json          citation registry (RA 11223, RA 7883, EO 51, RA 10028, AOs)
  course.json           title_fil/en, description_fil/en, quiz thresholds
  test-questions.json    the shared pretest/posttest bank
  _visual-primitives/    the 6 §D SVG templates
  modules/01-tungkulin-ng-bhw/
    module.json          objectives_fil/en (3-4), summary_fil/en
    lesson.fil.md  lesson.en.md
    facilitator-notes.fil.md  facilitator-notes.en.md
    competency.json      competency_statement_* + observation_indicators
    visuals/01-role-map.svg + visuals.json   (position, primitive, caption_*, alt_text_*)
    qa-entries.json      shape of content/kb/hhp-ncd/entries/module-N.json
```

`lesson.*.md` uses a line-based directive syntax the loader parses into
`Lesson`:

```markdown
## [scenario/core] Ang tanong ni Aling Nena
Si Aling Nena, 34 anyos, ay may anak na palaging may sipon at ubo...

:::visual 1
:::takeaway
Hindi lahat ng tanong ay kailangan ng gamot — may tanong na kailangan ng tanong.
:::
:::check
? Bakit hindi agad nagbigay ng gamot si BHW Marites?
- Kasi wala siyang alam na gamot
+ Kasi hinanap muna niya ang dahilan ng paulit-ulit na sakit
- Kasi dapat munang pumunta sa doktor
> Tama! Ang pagtuklas sa ugat ng problema ang unang hakbang.
:::

## [practice/standard] Sa iyong karanasan
May pamilya ka bang naaalala na katulad ni Aling Nena...
```

`## [kind/tier] Heading` opens a section — `tier` is one of `core` /
`standard` / `deep` (§A.6) and is **required on every heading**, not
optional-with-a-default: an omitted tier is exactly the authoring mistake
that would silently make a "short" lesson miss an objective, so the loader
rejects a heading with no tier rather than assuming one. `+` marks the
correct option; `>` is the feedback. Keep the parser small and line-based —
no markdown AST dependency.

**21c — the loader.** Extend `scripts/kb-load.mjs` or add a sibling script
(decide by reading its actual structure; reuse its `--project` /
`--dry-run` / `--apply` argument discipline and its `locks/<ref>.json`
content-id→row-uuid mechanism either way, so re-running updates rather than
duplicates). It writes `courses`, `course_modules` (incl. `objectives_*`,
`summary_*`, parsed `lesson`), `course_module_facilitator_notes`,
`course_module_visuals`, `course_test_questions`, **and** the
`kb_categories`/`kb_entries`/`kb_articles` rows from `qa-entries.json` —
the dual delivery §B promises, keeping the files master per
`content/kb/README.md`.

**Validate and reject** (loudly, in CI — same spirit as
`parseKbDraft`'s minimum-keyword rule):
- SVG allowlist violations, via INC-20's validator.
- A module with fewer than 3 objectives, or an objective using a banned verb.
- An empty summary, or a summary that is a verbatim concatenation of that
  module's own objectives (§A.1's failure mode).
- A visual with blank alt text, or `visual_position` referencing a visual
  that does not exist.
- **`lesson.fil.md` and `lesson.en.md` disagreeing on section count, section
  kinds, or check option counts** — a structural mismatch between languages
  is the likeliest authoring error and silently produces a broken bilingual
  lesson.
- An `observation_indicators` entry whose `objective_index` has no matching
  objective.
- **§A.6: a module with zero `core`-tier sections, or whose `core`-tier
  sections' `takeaway_*` fields don't collectively touch every objective**
  (a simple heuristic is fine here — e.g. flag for human review rather than
  hard-fail if this can't be checked precisely — but it must not pass
  silently, since this is exactly what makes "short" density safe to ship).

**21d — author Module 1** end-to-end (carrying INC-19a's approved text
forward — do not rewrite it), load it with `--dry-run` then `--apply`, and
**stop for user review of the real thing in the real app**.

**DoD**: `--dry-run` prints the expected course/module/visual/
facilitator-note/test-question/KB rows and writes nothing; `--apply` loads
Module 1; re-running `--apply` updates in place and creates no duplicates;
every validation above has a failing-fixture test; `npm run kb:check-sources`
passes over the new content root; the user reviews Module 1 rendered in the
app and approves before INC-24 authors anything further.

*Out of scope: modules 2-8; the BHW renderer (INC-22) — review Module 1 via
INC-22 if sequencing allows, otherwise via the INC-19a mockup plus raw row
inspection.*

**Status — 21a/21b/21c shipped, 21d authored, awaiting the 2nd user
approval gate.** INC-22 (the BHW renderer) doesn't exist yet, so Module 1 is
presented for review via a rendered mockup artifact, same allowance the DoD
above names ("otherwise via the INC-19a mockup plus raw row inspection") —
carrying INC-19a's own approved bookend format and competency block forward
into real, final Module 1 content rather than the mockup's placeholder text.

- **21a**: `docs/training-content-style-guide.md` — banned/allowed objective
  verbs with before/after examples, the retrieval-first summary rule and
  its restated-objectives failure mode, the §D primitive table, the
  takeaway-caption rule, Nakikita/Hindi-pa-sapat indicator guidance, and a
  closing per-module checklist.
- **21b**: `content/training/README.md` + `content/training/day1-basic-competencies/`
  — the full authoring tree (`course.json`, `sources.json`, `categories.json`,
  `test-questions.json`, `_visual-primitives/` with all six §D SVG
  templates) and the `lesson.*.md` directive syntax (`## [kind/tier]`,
  `:::visual`, `:::takeaway`, `:::check`) documented field-by-field.
- **21c**: `scripts/lib/lesson-md.mjs` (the directive parser),
  `scripts/lib/training-content.mjs` (tree loader + every validation named
  in the plan), `scripts/lib/svg-allowlist.mjs` (plain-JS port, see the
  lessons section above), and `scripts/training-load.mjs` (writes
  `courses`/`course_modules`/`course_module_facilitator_notes`/
  `course_module_visuals`/`course_test_questions` plus
  `kb_categories`/`kb_entries` from `qa-entries.json`, idempotent via
  `locks/<ref>.json`, `--org-unit` required with no default for the same
  reason `kb-load.mjs` gives for `--project`). `npm run training:load` added.
  `scripts/lib/training-content.test.mjs` has 23 tests, one failing-fixture
  case per validation rule (SVG allowlist, objective count/banned verb,
  empty/restated summary, blank alt text, dangling `visual_position`,
  fil/en section-count and kind/tier/check-option-count/check-correct-index
  parity, missing-tier heading, no-correct-option check, zero-core-section
  module, plus the qa-entries checks it delegates to
  `kb-content.mjs`-equivalent rules) plus the §A.6 coverage heuristic's
  non-fatal `reviewFlags` path. `vitest.config.ts` now also includes
  `scripts/**/*.test.mjs`. Full suite: 210/210 passing (`npm test`),
  `npm run lint` and `npx tsc --noEmit` both clean.
- **21d**: Module 1 (`01-tungkulin-ng-bhw`) fully authored — 4 objectives,
  7 tiered lesson sections (5 `core`/1 `standard`/1 `deep`, satisfying
  §A.6's "core alone covers every objective" rule with zero review-flag
  heuristic hits), 2 `hub-spoke`/`chain` SVG visuals, 2 inline retrieval
  checks, a retrieval-first summary, full bilingual facilitator notes
  (timing, script, one named misconception, discussion prompts, answer
  key), a competency block with one paired Nakikita/Hindi-pa-sapat
  indicator per objective, and 7 `qa-entries.json` Q&A entries grounded in
  RA 7883 and the WHO BHW reference-manual source (both citations
  verified live via `npm run kb:check-sources`, which was extended to also
  check `content/training/<course>/sources.json` — it previously only
  covered `content/kb/`). `npm run kb:check-sources` passes for this
  corpus (the one remaining failure it reports, `hhp-ncd/upv-ncd-flipchart-tot`
  → 503, predates this session and is unrelated to INC-21). The 6-question
  `test-questions.json` pretest/posttest bank covers all 4 of Module 1's
  objectives; it will grow, not get replaced, as modules 2-8 add their own.
  `loadTrainingCourse("day1-basic-competencies")` loads with zero
  validation problems and zero review flags.
- **Update (INC-22 session) — now actually run against the real pilot
  project.** The gap this note originally left open (no `KB_LOADER_USERNAME`/
  `PASSWORD` or a real `--project` were available) was closed: a dedicated
  `training.loader` admin account was provisioned on the pilot project (ref
  `ltzicxyefizxoqhfuuzc`, org-scoped at Los Baños — no admin existed at the
  national root to provision one there, so it was scoped to match the
  broadest existing admin, `admin.city.stable`) via the real
  `rpc_admin_create_user` RPC, not a hand-rolled insert. Before the loader
  could run at all, the pilot project turned out to be missing INC-19 and
  INC-20's migrations entirely (merged to `main` but never deployed there) —
  both were applied for real via the Supabase Management API and confirmed
  present (`course_sessions`, `course_session_enrollments`,
  `course_test_questions`, `course_test_attempts`, `course_module_visuals`,
  `course_module_facilitator_notes` all exist and are recorded in
  `supabase_migrations.schema_migrations`). With that in place,
  `training:load --project ltzicxyefizxoqhfuuzc --org-unit "Los Baños"
  --dry-run` printed exactly the expected row counts (1 course, 1 module, 1
  facilitator-notes row, 2 visuals, 6 test questions, 8 KB categories, 7 KB
  entries) and wrote nothing; `--apply` then loaded all of it; re-running
  `--apply` showed `update` counts matching the first run's `create` counts
  with zero duplicates, confirming the idempotency DoD for real, not just by
  reading the lock-file logic. Module 1 is live on the pilot project now, as
  a **draft** course (not published — that's a deliberate call for the next
  session/user to make, not this one). The same two migrations were also
  applied to the CI `bhw-connect-e2e` project, since `e2e/training-sessions.spec.ts`
  (INC-22) needs those tables there too. The rendered-in-the-app review this
  DoD calls for is still owed — INC-22 shipped the renderer that makes that
  possible, but nobody has looked at Module 1 live in a browser yet.

---

### INC-22 — BHW UI: bookends, lesson renderer, visuals, pre/post-test

Extends `src/components/elearning/course-detail.tsx` and `src/app/courses/`.

- **Lesson renderer**: for a module with non-null `lesson` — objectives
  bookend → ordered sections **filtered by the effective density**
  (`TIERS_FOR_DENSITY[density].includes(section.tier)`, §A.6 — where
  `density` is the BHW's enrolled session's `lesson_density`, or `'normal'`
  if solo), each with its `course_module_visuals` entry, itself filtered by
  the same tier check (caption as takeaway, `alt_text_*` on every visual,
  `svg_markup` passed through INC-20's sanitizer) and its inline check
  (answer → immediate feedback, **client state only, nothing persisted**,
  per §A.5) → retrieval-first summary (recall prompt, then reveal assembled
  from the *rendered* sections' `takeaway_*` only — a short-density summary
  must not reference a `standard`/`deep` section the BHW never saw). A null
  `lesson` falls back to today's `body_fil`/`body_en` path, untouched.
- **Pre/post-test**: with `course_test_questions` present, the pretest gates
  the first module; after `course_progress.status = 'content_completed'` the
  posttest is offered. Both call `rpc_course_test_submit`, passing the BHW's
  `course_session_enrollments` session id when one exists and `null`
  otherwise — **one code path, no session/solo branching** beyond that
  value, per the hybrid decision.
- The BHW sees their own two scores and the delta on their progress view;
  `course_test_attempts_own_read` already prevents seeing anyone else's.
- **i18n**: all chrome strings go in a new `training` namespace in
  `messages/fil.json` / `messages/en.json` (top-level namespace convention
  as used by `courses`, `assessments`, `flipcharts`). Content —
  objectives, lesson bodies, captions, summaries — is bilingual **DB
  columns**, never catalog keys. Do not mix the two.
- **Also fix while here**: the two `tokens.css` gaps flagged at the end of
  the INC-19a section above (missing dark-mode semantic colors, and
  `--color-primary` overloaded as both fill and text color) — this is the
  first increment that actually ships dark-mode-rendered training content,
  so it's the natural place to close them rather than letting a third
  increment rediscover the same bug.

**DoD** (extend `e2e/training-sessions.spec.ts`): an enrolled BHW and a solo
BHW both complete the same course, ending with both scores and the correct
`session_id` (or null); a module with a null `lesson` renders exactly as
before — **an explicit regression assertion, since this must be a no-op for
every existing INC-12 course**; a retrieval check gives feedback and writes
no row (assert no new `course_test_attempts` row); **a BHW enrolled in a
`short`-density session sees only `core` sections and a summary built only
from those, the same BHW enrolled in a `long`-density session on the same
module sees all three tiers, and a solo BHW sees exactly the `normal`
(core+standard) set** — one fixture module authored with at least one
section per tier makes this assertable; axe-core clean on module
routes **at the largest `--font-scale`, in dark mode, and in high-contrast
mode** (the bar INC-5/INC-7 set, and where visual-heavy layouts break);
route first-load stays within the §5.2 budget with the SVGs inline.

**Status — ✅ merged via [PR #57](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/57),
CI green (44 passed, 0 failed, 0 flaky).** `e2e/training-sessions.spec.ts`
ran for real against the live CI project — the first increment here whose
e2e coverage was actually executed rather than left owed to a future
session. Getting there surfaced four genuine defects, none of which a
read-through would have caught (detail at the end of this note).

- **Renderer**: `src/components/elearning/lesson-module.tsx` (objectives
  bookend, tier-filtered sections via `TIERS_FOR_DENSITY`, per-section
  visual filtered by its own tier too, inline retrieval check — client
  state only, never calls an RPC — and the retrieval-first closing summary,
  gated behind a reveal button, assembled only from the *rendered* sections'
  `takeaway_*`) and `src/components/elearning/pre-post-test.tsx`
  (`TestScores`/`TestForm`, wired to `rpc_course_test_submit`). Wired into
  `src/components/elearning/course-detail.tsx`: a module renders through
  `LessonModule` when `type === "text" && lesson != null`, and falls back to
  the untouched pre-INC-20 `body_fil`/`body_en` path otherwise — the
  regression case is a real `if` branch, not just a hope. The pretest, when
  `course_test_questions` exist, gates the module list entirely (matching
  "gates the first module" literally, not just "offers" it); the posttest
  appears once `course_progress.status === 'content_completed'`, else a
  locked message.
- **Data layer**: `src/app/courses/[id]/page.tsx` now fetches
  `objectives_*`/`summary_*`/`lesson` on `course_modules`,
  `course_module_visuals`, and — only when the `course_sessions` flag is on
  — the BHW's own session (for `lesson_density`/`session_id`),
  `course_test_questions`, and the BHW's own `course_test_attempts`. Feature
  flags stay a UI/route-layer gate only, per this doc's own established
  rule: no RPC checks `course_sessions` internally, the page simply doesn't
  fetch session-shaped data when it's off, same as it doesn't exist.
- **Real gap found and fixed**: `course_sessions` was seeded by INC-19's own
  migration but was never added to `FeatureFlagKey`/`DEFAULT_FLAGS`
  (`src/lib/flags/types.ts`, `get-flags.ts`) — meaning the flag could never
  actually be turned on from the app's own flags console before this
  session, regardless of the DB row. Fixed as part of this increment, since
  INC-22 is the first thing that actually needs it to work.
- **tokens.css gaps closed** (carried from INC-19a through INC-20/21, as
  planned): `--color-success`/`warning`/`danger`/`info` now have dark-mode
  variants (computed to clear 4.5:1 against the dark canvas — the unchanged
  light-mode values ranged 2.94–3.35:1 in dark mode, a real WCAG failure,
  not a style nit). `--color-primary`'s two incompatible uses were split:
  it now stays fill-only; a new `--color-primary-text` (light mode = itself,
  dark mode = the existing `--color-primary-display`, which already cleared
  5.07:1 on the dark canvas) replaced the 3 existing `text-primary`/
  `border-primary` call sites (`site-header.tsx`, `forum/page.tsx`,
  `flipchart-viewer.tsx`); a new fixed `--color-on-primary` (not tied to
  `--color-canvas`, which flips with theme and was the actual bug — a
  button's fill color doesn't flip, so its text can't either) replaced
  every existing `bg-primary`/`text-canvas` button-fill pairing app-wide (35
  files) as well as the new training UI's own buttons. This was a
  mechanical, same-string-pattern rename per file, not a design change.
- **e2e**: `e2e/training-sessions.spec.ts` — two tests, wrapped in
  `test.describe.serial` (this repo's `playwright.config.ts` sets
  `fullyParallel: true`, and both tests flip the shared global
  `course_sessions` flag on/off around themselves the same way
  `ops-hardening.spec.ts` does for `kb_articles`; serial avoids the two
  tests racing that shared flag). Fixture course has two modules — a plain
  `text` module with no `lesson` (the explicit regression assertion) and a
  `lesson` module authored with one section per tier plus one inline check —
  and a 1-question `course_test_questions` bank. Covers: pretest gating the
  module list; short-density showing only `core`; long-density showing all
  three tiers; solo (no session) showing `normal` (core+standard); the
  retrieval check giving feedback while `course_test_attempts` row count
  stays unchanged before/after; full pretest→content→posttest completion
  with both scores, the delta, and the correct `session_id` (short-density
  BHW) vs. `null` (solo BHW) recorded on the real attempt rows. axe-core at
  large font-scale/dark/high-contrast, and the §5.2 route-weight budget, are
  **not** covered here — this repo's own `lighthouserc.js` explicitly scopes
  the budget check to `/` only and names extending it to an authenticated
  route "its own follow-up, not silently bolted on here"; that follow-up
  still hasn't been taken, same as before this session, so it stays a named
  gap rather than something quietly assumed done.
- **Verified for real, at the data/RLS layer, against both live projects**
  (pilot `ltzicxyefizxoqhfuuzc` and CI `bhw-connect-e2e` /
  `qeryhxctxslhdkclifom`) via direct REST/SQL calls with real fixture rows:
  `rpc_course_session_create`/`_enroll`/`rpc_course_test_submit` all behave
  exactly as their migration-level guards specify; `course_test_questions_read`
  correctly lets an in-scope BHW read a published course's bank;
  `course_sessions_bhw_read` correctly resolves a BHW's own enrolled session
  and no one else's. A local `npx playwright test` run from this session's
  sandbox could not complete — root-caused (not assumed) to the sandbox's
  outbound HTTPS proxy presenting a CA chain Chromium doesn't trust, which
  breaks `auth.signInWithPassword` specifically; `curl` to the same endpoint
  and a standalone Playwright script with `ignoreHTTPSErrors` both succeeded
  with the same credentials against the same project. **CI has no such proxy
  and ran the spec green**, so this is recorded only as a sandbox gotcha for
  the next session, not an open item.
- **Five real defects that only CI could find**, worth recording because
  each was invisible to review, typecheck and lint:
  1. *Ambiguous locator.* `getByText("CoreTakeaway fil")` matched two
     elements — the section's own inline takeaway and the same takeaway
     again inside the revealed summary. That duplication is by design (the
     consolidated summary is deliberately redundant with the inline
     takeaways), so the fix was scoping the assertion to the summary's
     `<li>` items, not changing the renderer.
  2. *Race against `router.refresh()`.* After completing module 1, a
     generic button locator transiently matched both modules' complete
     buttons: `handleModuleComplete` clears its own pending state in
     `finally`, which re-enables the button a beat before the refreshed
     `isDone` prop arrives and swaps it for the badge. Harmless to a human,
     fatal to a fixed locator. Fixed by waiting on button *count* to settle.
     Note this pending/refresh gap is pre-existing INC-12 behaviour, not
     introduced here — it only became observable because this is the first
     page with two complete buttons on screen at once.
  3. *Missing index on `audit_events(subject_id, event_type)`* — see the
     dedicated bullet below. A genuine production bug, not a test artifact.
  4. *Unpaginated dashboard table.* Not fixed here; filed as
     [#58](https://github.com/jongsky25/BHW-Connect-Phase-2/issues/58).
  5. *A global feature flag leaking out of a timed-out test.* Surfaced only
     after INC-22 merged, on a later run of the same spec.
     `training-sessions.spec.ts` turned `course_sessions` on inline and
     reset it in a `try/finally` inside the test body — but Playwright
     tears the context down *before* that `finally` runs when a test times
     out, so the reset threw instead of executing and left the flag on for
     the shared CI project. The timeout itself was legitimate: each test
     runs course setup plus three full onboarding journeys, which does not
     fit the 30s default. Fixed in
     [#60](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/60) by
     giving the describe block a 120s timeout and moving the toggle into
     `beforeEach`/`afterEach`, which Playwright *does* run on timeout —
     and which also makes the pair self-healing if an earlier run leaked.
     The general lesson outlives this spec: **`finally` is not a safe place
     to undo shared global state in a Playwright test.** `ops-hardening`'s
     `kb_articles` toggle has the same shape and the same exposure.
- **Unrelated production bug found and fixed while driving CI green**:
  `rpc_dashboard_bhw_table` (INC-6) resolves each BHW's `last_login_at` with
  a correlated subquery filtering `audit_events` on `subject_id`, but that
  table was only ever indexed on `actor_user_id` and `created_at`. The
  planner therefore seq-scanned the whole audit table **once per BHW row** —
  `EXPLAIN (ANALYZE, BUFFERS)` showed 927 loops × 10,391 rows ≈ 9.6M row
  examinations, 386,559 buffer hits, 911ms. Cost is
  O(bhw_count × audit_events_count) and *both factors grow forever*, so this
  was always going to cross a threshold. Fixed in
  `20260809000000_fix_audit_events_subject_index.sql`: same query drops to
  17.112ms (~53×) and stops scaling with table size. This mattered beyond
  CI — the pilot's `audit_events` is append-only, so the real admin
  dashboard was degrading on the identical curve.
- **CI test-project hygiene.** Even with the index, `dashboard.spec.ts` kept
  failing: the RPC was fast (17ms, all rows returned — verified) but the page
  renders *every* BHW in scope with no pagination, and the shared CI project
  had accumulated **942** BHW rows in one barangay's scope from ~1000
  historical test runs. Purged the `e2e.%`-prefixed throwaway BHWs (942 → 91)
  after first confirming they authored nothing — zero courses, surveys,
  announcements, flipcharts, KB entries, forum posts or certificates, only
  per-user ephemera — deleting in FK dependency order inside a transaction,
  with all five stable fixtures verified intact afterwards. Two things worth
  knowing for next time: only 2 of the 22 FKs into `public.users` cascade
  (the rest are `NO ACTION`, so a naive delete *fails* rather than silently
  orphaning — protective, but it means any purge must unwind dependents
  explicitly); and `ops-hardening.spec.ts`'s anonymize test leaves one
  `anonymized-*` row per run (90 so far), which nothing purges. **The purge
  moved the threshold, it did not remove it** — [#58](https://github.com/jongsky25/BHW-Connect-Phase-2/issues/58)
  is the actual fix.
- **Also applied, as prerequisites, not originally scoped to INC-22 but
  needed to get here**: INC-19 and INC-20's migrations were deployed to the
  pilot project for the first time (see the updated INC-21 Status note
  above) and to `bhw-connect-e2e`; a `training.loader` admin account was
  provisioned on the pilot project; Module 1 was actually loaded onto the
  pilot project as a draft course via `training:load --apply`.
- **Still owed, carried into INC-23/INC-24**: axe-core on the new module
  routes at largest font-scale / dark mode / high-contrast, and the §5.2
  route-weight budget with SVGs inline — `lighthouserc.js` still scopes the
  budget check to `/` only and names authenticated routes as its own
  follow-up. And the human review of Module 1 rendered in the real app,
  which is INC-21's approval gate and blocks INC-24's authoring, not INC-23.

---

### INC-23 — Facilitator UI (assessor console)

Decide between extending `src/app/assessments/` and a sibling
`src/app/training-sessions/` by looking at how crowded the assessor nav
already is — a judgment call at implementation time, not here. Follow the
component patterns in `src/components/elearning/assessments-console.tsx`.

- **Create/schedule a session** from published courses in the facilitator's
  scope (reuse `courses-console.tsx`'s scoping query), **including the §A.6
  density selector** (Maikli / Karaniwan / Detalyado, defaulting to
  Karaniwan) → `rpc_course_session_create`. Editable afterward while the
  session is still `scheduled`, via `rpc_course_session_set_density` — show
  it as an ordinary field on the session, not a buried setting, since this
  is the one control the user specifically asked for.
- **Enroll BHWs**: picker scoped to the facilitator's org unit — reuse the
  in-scope user query already in `src/components/admin/users-console.tsx` /
  `user-row.tsx` rather than writing a new shape →
  `rpc_course_session_enroll` per selection.
- **Per-module facilitator view**: the BHW-facing content (objectives,
  sections, visuals) beside `course_module_facilitator_notes` — script,
  timing, misconception, discussion prompts, answer key. Per §A.2 the
  facilitator *presents* the visual while speaking, so it must be legible at
  presentation size here, not only at phone size.
- **Competency observation checklist** (§A.4): `competency_statement_*` and
  the paired indicators with their 3-level guidance text, **read-only** — not
  an interactive rating, for the reason given in §A.4. The assessor still
  decides via the existing unmodified `rpc_assessment_decide`.
- **Session roster**: enrolled BHWs, module progress, pretest/posttest
  scores and delta.
- **Session summary**: cohort average pretest vs posttest, computed
  client-side over the already-fetched roster — no `rpc_session_summary`;
  a session's roster is small.
- **i18n**: new `trainingSessions` namespace.

**DoD**: a facilitator sees only their own scope's sessions, courses and
BHWs (verify against a second assessor in a sibling org unit); the roster
reflects live progress and both scores; the cohort averages match
hand-computed values from seeded fixtures (the verification style INC-8's
KPI panel DoD used); the competency checklist renders from authored content
with no input controls that discard data; a `bhw` hitting the facilitator
route directly is refused; **the density selector defaults to Karaniwan on
create, changing it and revisiting the session shows the new value, and it
is disabled (not merely ignored) once the session's status leaves
`scheduled`.**

**Status — code complete, [PR #63](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/63)
open, unmerged.** Route: a sibling `/training-sessions`, not folded into
`/assessments` (that page is a single flat pass/fail queue with one CTA on
`/home`, not a crowded nav, and `rpc_assessment_decide`'s console is
untouched here). All six scope bullets built; DoD's RLS-scoping and
density-lock claims verified against a real local Postgres 16 replay of the
full migration history with two facilitators seeded in sibling barangays,
not against the live pilot (unreachable from that session). One schema gap
found while building the roster, not assumed from a read-through: INC-12
never granted `assessor` a read policy on `course_progress`/
`course_module_progress` (only `bhw`-own and admin-cascade existed — INC-12
predates the facilitator role's use of this data). Added in
`20260810000000_inc23_facilitator_progress_read.sql`, ownership-scoped via
the session's own enrollment, mirroring `course_test_attempts`'s
`_facilitator_via_session` policy. Owed before merge: a real click-through
against the pilot project (create session → set density → enroll → roster →
module view → checklist; a `bhw` redirected off the route; a second
facilitator in a sibling org unit sees neither the first facilitator's
sessions nor their BHWs) — see the PR's test-plan checklist.

---

### INC-21r — Re-author Module 1 to its actual topic (re-opened approval gate)

**Why this exists.** INC-21's Module 1 was reviewed against the source deck
for the first time on 19 September 2026 and did not pass. The problem is not
style — the scenario method, bookends and competency block are exactly what
INC-19a approved. The problem is **subject**: the module teaches the four
working relationships (community / midwife / barangay officials / fellow
BHWs) and RA 7883 accreditation. Under §C those are Module 5's and Module
4's material. The deck's Module 1 — *Ang mga Tungkulin ng Isang BHW* — is
about something else entirely, and none of it is in the authored module
(grep the content tree for "Health Educator", "Community Organizer",
"household profile" or "UHC": zero hits outside a Module 2 category slug).

**What Module 1 actually has to teach** (deck slides 5-13; Facilitator's
Manual p.13; Reference Manual PDF 11-12):

- **The UHC re-framing.** BHWs asked to name their tasks will say service
  delivery. The UHC Act's direction is primary care and health promotion, so
  the role is *bigger* than that. This is the module's whole point, and the
  Facilitator's Manual makes it the trainer's opening move.
- **HEPO is the umbrella.** Under UHC, BHWs are designated barangay-level
  Health Education and Promotion Officers. The three roles below sit under
  it and come from RA 7883.
- **Health Educator** — teach households to keep body and environment
  healthy; prepare them for illness, accidents and risk factors at every
  life stage; reach every sector, children through elderly.
- **Community Organizer** — maintain relationships and communication with
  community leaders, members and city/municipal health staff; organize and
  encourage participation; member of the barangay planning team for health;
  contribute to the Local Investment Plan for Health (LIPH).
- **Health Service Provider** — part of the primary care team assisting the
  midwife; first contact / frontline; guide people where to go; deliver
  simple initial services (interview, vital signs, recording, household
  profile, first aid); continuous monitoring; collect and keep household
  profiles, master lists, registries and government forms.
- **Competency framing** — *Participate in workplace communication*: obtain
  and convey relevant workplace information, perform duties following
  workplace instructions, complete relevant work-related documents. The
  documents strand is why the records material belongs here and not only in
  Chapter III.

**Scope discipline.** 6 hours (§C) — the second-largest module in the
chapter. `core` carries the UHC shift and the three roles; `standard` carries
the worked examples per role and the records/documents detail; `deep` carries
the LIPH and planning-team material.

**Do not discard the displaced content.** The four-relationships sections and
the RA 7883 accreditation section are good work against the style guide.
Carry their text forward into `05-bhw-at-barangay` and `04-ra7883` when those
are authored (INC-24/25) rather than rewriting from scratch — the same
instruction INC-21d was given about INC-19a's mockup text.

**Also in scope:** `coverage.json` for Module 1 (§C.2) and the loader check
that enforces it, since Module 1 is the first module authored under the
coverage rule and a rule with no implementation is not a rule. The six
`test-questions.json` items all test the displaced content and are rewritten
against the new objectives.

**DoD**: `coverage.json` enumerates Module 1's concepts with citations, and
every non-excused concept is delivered by a `core`/`standard` section;
the coverage check has a failing-fixture test alongside INC-21's other
validations; `--dry-run` then `--apply` load clean with zero review flags;
`npm run kb:check-sources` passes; **the user reviews Module 1 rendered in
the real app at Detalyado density and approves** — the gate INC-21 opened and
this increment re-opens. INC-24 stays blocked until then.

**Getting the pilot to Detalyado.** Merging the code does not move the
content, and loading the content does not by itself render it at Detalyado.
Both were missed, and on 19 September 2026 the user opened the app and saw
INC-21's *displaced* Module 1 — the four-relationships objectives verbatim
from `d424bde` — because the pilot project had never been re-loaded after
INC-21r merged. Three independent gates sit between a merged PR and a
reviewable Detalyado render, and none of them announces itself:

1. **The content.** `training:load` is a manual step with no CI equivalent.
   Until it is re-run against `ltzicxyefizxoqhfuuzc`, the pilot serves
   whatever the last `--apply` wrote.
2. **The flags.** `src/app/courses/[id]/page.tsx` returns early on
   `!flags.elearning`, and reads `course_sessions` only when that flag is on.
   Both default to `false` (`src/lib/flags/get-flags.ts`), so with either off
   the density is the hardcoded `'normal'` fallback.
3. **The session.** §A.6 density is not a BHW-facing preference and INC-23's
   selector has not shipped, so `long` exists only as an enrolled
   `course_session`'s `lesson_density`. No session, no `deep` tier — and
   nothing in the UI says a tier was withheld, which is exactly what makes
   this failure mode quiet.

All three were closed on the pilot on 19 September 2026: the loader was
re-run, both flags turned on, a `long`-density session created, and
`demo.viewer` and `review.bhw` enrolled in it. Live ids are in
`docs/session-handoff.md`.

`scripts/training-review-setup.mjs` (`npm run training:review-setup`) closes
gates 2 and 3 in one idempotent command — see "Reviewing a module at a chosen
density" in `content/training/README.md`. Gate 1 stays `training:load`'s job.
Run the loader first, then the setup script, then review. At Detalyado,
Module 1 gains exactly two sections over Karaniwan:
`[concept/deep] Ang BHW sa pagpaplano ng barangay` and
`[contrast/deep] Mali at tama: "Hindi ko naman trabaho 'yan"` — if those two
are not on screen, the render is not Detalyado and the gate has not been met.

---

### INC-26 — Slide mode

**User request, 19 September 2026:** the lesson should not only read like a
book; it should also present concepts one at a time.

The section model is already the slide model — one `LessonSection` is one
slide (heading → body → visual → takeaway → optional check), objectives
bookend as slide 0, the retrieval-first summary as the last. Tier filtering
applies unchanged, so density controls slide count for free.

`LessonSlides` as a sibling of `LessonModule`, with a Basahin / Islide
toggle on the module page. CSS `scroll-snap-type: x mandatory` over
`overflow-x: auto` — native swipe and keyboard scrolling, no dependency
(this repo has no carousel or animation library today and should not gain
one for this). `IntersectionObserver` drives the progress dots. Reach for
`embla-carousel-react` (~7 KB, MIT) **only** if native snap proves unreliable
on the low-end Android WebViews in the §5.2 target, and say so in the commit
if it does.

Reuse, don't fork: the visual, check and takeaway renderers are the same
components `LessonModule` already uses. If a section's body is too long for
one screen, that is an authoring signal (style guide §3's "one idea per
chunk"), not a reason to paginate inside a slide.

**DoD**: both modes render the same content for the same density; the
toggle preserves position; the inline check still persists nothing; keyboard
and swipe navigation both work; axe-core clean at the largest `--font-scale`,
in dark mode and in high-contrast mode; no new runtime dependency, or a
stated reason for one.

---

### INC-27 — Audio narration + read-along

**User request:** an audio mode — not only reading, but playable while
reading.

**Pre-rendered, never at runtime.** Content is static, so narration is
generated at content-load time by `scripts/tts-render.mjs`, a sibling of
`training-load.mjs` reusing its `--project` / `--dry-run` / `--apply`
discipline and its `locks/` mechanism. Runtime TTS would put a paid API on
the critical path of a page a BHW opens on mobile data, which is the wrong
trade for content that changes a few times a year.

- **Provider**: Azure Speech `fil-PH-BlessicaNeural`, with `edge-tts` as the
  zero-cost fallback (locked decision, see Context). Both emit
  WordBoundary/SentenceBoundary events; persist **sentence-level** timings,
  which survive Tagalog affixation far better than word-level and are
  enough for the read-along UX. Store the timing JSON in one shape
  regardless of provider.
- **Encoding**: Opus/WebM at 32 kbps (~240 KB/minute) with an MP3 fallback
  for old WebViews. Audio goes to Supabase Storage, reusing the bucket and
  `storage.objects` policy pattern at
  `20260731000000_inc14_flipcharts.sql:111-120`. It is **not** inlined —
  §5.2's ≤300 KB route budget is per-route and audio is fetched on demand.
- **Schema**: audio url + timings per section. Decide at implementation time
  between a new `course_module_audio` child table and a column on the
  existing `lesson` jsonb; prefer the child table if facilitator-notes ever
  need narration too.
- **Read-along**: `<audio>` plus a `requestAnimationFrame` loop reading
  `currentTime`, binary-searching the current sentence span and setting
  `data-active` on pre-split `<span>`s. Roughly 40 lines; no library.
  Works in both read and slide modes.
- **Accessibility is not optional here**: a visible play/pause control, a
  speed control, and highlighting that does not rely on color alone.
  `prefers-reduced-motion` must not break playback — it is audio, not motion,
  but auto-scrolling to follow the highlight is motion and must be
  suppressible.

**Cost check before building**: the nine-module course is well under Azure's
500K chars/month free tier, but confirm against the real authored text
rather than this estimate, and record the actual figure.

**DoD**: narration plays in both modes, in both languages, with the correct
sentence highlighted; a section with no generated audio degrades to text
with no broken control; re-running the render script is idempotent and does
not re-bill for unchanged text; the audio files are not counted against the
route budget; axe-core clean with the player present.

---

### INC-28 — Animated concept clips

**User request:** animated video clips explaining concepts.

Two tiers, because most concepts here do not need a video file:

1. **Animated SVG scenes — the default.** The §D primitives already exist as
   SVG and the allowlist already permits `class`. Drive a build-up from React
   step state (the hub-spoke's spokes appearing one at a time as the
   narration names each role) rather than shipping a video. Zero additional
   bytes, scales with `--font-scale`, correct in dark mode, and it can be
   driven by INC-27's sentence timings so the picture assembles as the
   narration reaches it — which a pre-rendered video cannot do bilingually
   without two renders. Extending the allowlist to `<animate>` /
   `<animateTransform>` is in scope; `<script>` and the rest of the reject
   list stay rejected, and each new permitted element needs its own
   allowlist test.
2. **Remotion — for the few concepts that genuinely need video.** Procedural
   sequences where showing motion *is* the teaching (the Five Whys unfolding,
   correct sharps disposal). React-based, so the existing components and
   tokens are reusable. Rendered in CI to 480p H.264 (~0.5-1 MB for 20 s)
   plus a poster frame, lazy-loaded, never autoplaying on mobile data.
   Install via the official skills (`npx skills add remotion-dev/skills`).

**Licence gate — resolve before writing any Remotion code.** Remotion is
source-available, free for individuals, non-profits and companies of three
or fewer employees, otherwise $25/seat/month. Confirm which applies to BHW
Connect's operating entity and record the answer here. If it does not come
out free, tier 1 covers the pedagogy and tier 2 is dropped rather than
quietly incurring a licence.

**`prefers-reduced-motion` is a hard requirement**, not a nicety: every
animated scene must have a static end-state that conveys the same
information, and that is what renders when reduced motion is set.

**DoD**: at least one animated scene in Module 1 driven by the narration
timings; its static fallback conveys the same content under
`prefers-reduced-motion`; the allowlist's new elements each have a test and
the reject list is unchanged; no video file ships unless the licence
question is answered in writing above; route weight stays within §5.2.

---

### INC-24 — Author modules 2-5

Modules 2-5 per §C, to the approved style guide, each with: `coverage.json`
written first (§C.2), objectives bookend, chunked scenario-driven sections,
≥1 purposeful visual using a §D primitive with takeaway caption and alt
text, ≥1 inline retrieval check, retrieval-first summary, facilitator
script, and a competency block whose indicators pair one-to-one with the
objectives. Size each module to its §C training hours. Load via INC-21's
loader.

Modules 4 and 5 inherit displaced text from INC-21's original Module 1 (the
RA 7883 accreditation section, and the four-relationships sections
respectively) — carry it forward, do not rewrite it.

**DoD**: all four modules load clean through every INC-21 validation
including the coverage check; `npm run kb:check-sources` passes; a
read-through confirms no sentence is lifted verbatim from the source
documents and no summary merely restates its objectives; the
pretest/posttest bank in `test-questions.json` covers these modules'
objectives; each module renders correctly in all four modalities
(read, slides, audio, animation).

---

### INC-25 — Author modules 6-9, KB entries, chat fixtures, final verification

Modules 6-9 per §C. Module 6 (Epektibong Komunikasyon) is the largest in the
chapter at 8 hours — budget for it accordingly rather than treating it as
one module among four. Then close the chatbot loop:

- `qa-entries.json` for all 9 modules loaded into `kb_entries`/`kb_articles`.
- Fixtures added to the Chat Guide corpus following
  `src/lib/chat/ncd-fixtures.ts`'s existing shape, so the new entries are
  **provably retrievable**, not merely present — keywords are the matcher's
  main lever and `content/kb/README.md` names keyword collision as its main
  failure mode, so watch for collisions against the existing HHP+ corpus.
- `synonyms.json` additions for Day-1 vocabulary as needed.

**DoD**: the full corpus (existing + new) passes the ≥90% gate; a BHW asking
"ano ang tungkulin ng BHW" is answered from the new content rather than
landing in the gap queue; no existing HHP+ fixture regresses.

---

## Verification (end-to-end, after INC-25)

1. Admin publishes the Day 1 course; `elearning` + `course_sessions` both on.
2. An assessor creates a session at `lesson_density = 'short'` and enrolls a
   BHW in their org unit; the BHW receives the enrollment notification.
2b. That BHW sees only `core`-tier content across all 9 modules; the
   facilitator changes the session to `long` before the BHW starts a second
   module and the BHW now sees `standard` and `deep` content too on the
   modules taken afterward — confirming the control actually reaches the
   renderer, not just the database.
3. The BHW takes the pretest, works all 9 modules — each opening with
   objectives, carrying visuals and retrieval checks, closing with the
   retrieval-first summary — then takes the posttest.
4. The facilitator's roster shows both scores and the delta; the per-module
   view shows script + competency checklist beside what the BHW saw.
5. Repeat step 3 at the largest `--font-scale`, in dark mode, and in
   high-contrast mode, axe-core clean throughout.
6. A second BHW in no session completes the same course solo;
   `session_id` is null on both attempts.
7. The Chat Guide answers a Day-1 question from the new KB content.
8. Flip `course_sessions` off: facilitator session UI is gone, solo
   course-taking still works, recorded completions intact.
9. Full suite green — `npm run lint`, `npm test`, Playwright, the Lighthouse
   budget check — with `e2e/elearning.spec.ts` unchanged from before this
   work, proving the INC-12 system it extends did not regress.
