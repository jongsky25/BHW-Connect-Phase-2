# Training Content Style Guide (Day 1: Basic Competencies)

This is the authoring standard for `content/training/day1-basic-competencies/`,
written for whoever is writing modules 2-8 (INC-24/INC-25) — not necessarily a
developer. It expands `docs/training-modules-plan.md` §A, which the user
approved via the INC-19a mockup, into rules you can follow file-by-file
without reading the schema or the loader code. If a rule here and §A ever
disagree, §A is the source of truth and this file is out of date.

The companion document is `content/training/README.md`, which describes the
file *format* — what a `module.json` or `lesson.fil.md` has to contain
structurally so the loader can parse it. This file is about what makes the
*content* good: which verbs are allowed, how to write a summary that isn't
the objectives restated, how to caption a diagram, how to write an
observation indicator an assessor can actually use. Read both before writing
a module; this one first.

---

## 1. Every module opens with objectives you can watch for

The opening line is always **"Sa dulo ng bahaging ito, kaya mo nang…"** ("By
the end of this part, you will already be able to…"), followed by 3-4
objectives. Every objective must name something an assessor could stand in
the room and *see or hear* the BHW do. If you cannot picture watching
someone do it, it is not an objective yet — it is a topic.

**Banned verbs** — these describe a mental state, not an action, and the
loader rejects any objective starting with one of them (Filipino or
English, case-insensitive):

| Banned | Why | Use instead |
|---|---|---|
| `malalaman` / `know` / `know about` | Knowing is invisible. What does knowing look like from outside? | `maipaliwanag` (explain), `matukoy` (identify), `masabi` (state) |
| `maiintindihan` / `understand` | Same problem — understanding has no observable form of its own | `mailarawan` (describe), `maihambing` (compare), `magamit` (apply) |
| `malaman ang kahalagahan` / `appreciate` | A feeling, not a demonstrable skill | `maipaliwanag kung bakit mahalaga` (explain why it matters) |

**Before / after**, from Module 1:

> ❌ "Malalaman ng BHW ang mga tungkulin niya sa barangay." — a BHW who
> silently read the list and said nothing would technically satisfy this.
>
> ✅ "Maililista ng BHW ang apat na pangunahing tungkulin niya sa barangay at
> maipapaliwanag kung sino ang lalapitan niya para sa bawat isa." — an
> assessor can watch this happen.

**Objectives and A.4 indicators are one authoring pass, not two.** Every
objective you write here becomes exactly one paired **Nakikita / Hindi pa
sapat** indicator in that module's `competency.json` (§5 below) — write them
side by side, not in separate sessions, or they drift apart.

Minimum 3, maximum 4. The loader rejects a module with fewer than 3.

---

## 2. The closing summary is retrieval-first, and it is not the opening restated

The closing prompt is always **"Ano ang natutunan mo?"** ("What did you
learn?"). The BHW is asked to recall on their own *before* the consolidated
summary is shown — the point is the effort of retrieving, not the polish of
the final text. Design-wise this means: the app asks the recall question
first (INC-22's job), then reveals `summary_fil`/`summary_en` — your job here
is only to write a summary that is worth revealing.

**The test**: read your summary next to your objectives. If it is your
objectives with the verb changed from future ("kaya mo nang…") to past
("natutunan mo…"), it has failed — a summary that only restates what was
promised teaches nothing new and the loader's heuristic check (§C.2 of the
plan; see `content/training/README.md` §Validation) will flag it for human
review. A real summary **synthesizes** — it states the *thread* that ties
the module's scenario, sections and checks together, in language a BHW could
repeat to a neighbor.

**Before / after**, from Module 1:

> ❌ "Natutunan mo ang mga tungkulin ng BHW sa barangay at kung sino ang
> lalapitan mo." — this is objective #1 and #2 with the tense flipped.
>
> ✅ "Ang BHW ay hindi nagtatrabaho nang mag-isa — apat na ugnayan ang
> humuhubog sa araw-araw niyang gawain: ang komunidad na kanyang pinagsisilbihan,
> ang midwife na kanyang kinakausap kapag may kailangang i-refer, ang barangay
> officials na kasosyo sa proyekto, at ang sarili niyang tungkuling
> maghatid ng maagang babala. Sa sitwasyon ni Aling Nena, apat na ugnayang
> ito ang gumana nang sabay — hindi lang isa." — this names the connecting
> idea, not just the list.

Mechanically, `summary_*` is assembled by you from each section's
`takeaway_*` (§4 below) — write the takeaways first, then write a summary
that threads them together, not the reverse.

---

## 3. Sections: scenario-driven, chunked, tiered

Every module opens on a **named scenario** — a specific person with a name,
age and situation (`Aling Nena, 34 anyos...`), not an abstract description.
The scenario is what the rest of the module returns to; sections build on it
rather than presenting free-standing facts.

Each section has a `kind` (`scenario` / `concept` / `contrast` / `practice`)
and a `tier` (`core` / `standard` / `deep` — §A.6). **The tier is required on
every section heading; there is no default.** Getting this wrong is exactly
the mistake that would make a "short" (Maikli) density session silently miss
one of the module's objectives, so the loader rejects a heading with no
tier rather than guessing.

- **`core` sections alone must satisfy every one of the module's
  objectives.** Before moving on to `standard`/`deep` sections, check: if a
  BHW only ever saw the `core` sections, could they still do everything the
  objectives promise? If not, move content into `core` rather than adding a
  new `standard` section to cover the gap.
- **`standard`** adds reflection prompts, a second worked example, or
  elaboration on a `core` idea. This is what most BHWs see by default
  (Karaniwan = `core` + `standard`).
- **`deep`** is enrichment: an extra contrasting scenario, additional
  practice, material for a facilitator running a longer session (Detalyado).

**One idea per chunk.** A section should read in under a minute. If a
section is doing two things ("explains the referral pathway *and*
introduces the four roles"), split it — the loader does not enforce a
length limit, but a long section is a sign you have merged two chunks.

**Never text-on-slide read aloud.** The BHW-facing `body_*` text is what the
BHW reads silently or hears read to them once; it must not be a transcript
of what a facilitator would say out loud in the room. If you are writing a
facilitator delivery script, that goes in `facilitator-notes.*.md` (§5),
never duplicated into the lesson body.

---

## 4. Visuals: caption the takeaway, not the label

§D of the plan lists the six fixed primitives (`hub-spoke`, `chain`,
`contrast`, `map`, `tree`, `stack`) plus `image` for photographs. Authoring a
visual means picking the primitive that matches the *shape of the idea* —
radiating relationships → `hub-spoke`, a sequence → `chain`, right-vs-wrong
→ `contrast`, a network of who-talks-to-whom → `map`, a decision →
`tree`, a hierarchy → `stack` — and filling in labels, not inventing new
geometry. If no primitive fits, the idea is probably better as prose than a
diagram.

**The caption states the takeaway, not the label.** A caption that only
names the diagram ("Ang mga Tungkulin ng BHW") wastes the one sentence a
rushed reader will actually read. State the point the diagram makes.

**Before / after**, the Module 1 `hub-spoke` (BHW's four roles):

> ❌ "Ang apat na tungkulin ng BHW." — just names the picture.
>
> ✅ "Apat na ugnayan ang dumadaan sa BHW — hindi ito nagtatrabaho nang
> mag-isa." — states what the diagram is *for*.

**Every visual needs `alt_text_fil` and `alt_text_en` — not optional, and
not the same text as the caption.** The caption is what a sighted reader
sees under the image; the alt text is what a screen reader says *instead of*
seeing the image, so it needs to describe the diagram's actual content (the
nodes and connections), not just repeat the takeaway sentence.

> `alt_text_fil`: "Hub-and-spoke na dayagram: sa gitna ang BHW, apat na
> linyang umuusbong patungo sa Komunidad, Midwife, Barangay Officials, at
> Maagang Babala."

Use the SVG primitive templates in `_visual-primitives/` as your starting
point — copy one, then only change labels, node count (within the
primitive's shape) and text. Color exclusively via `currentColor` (never a
hex literal — the loader's SVG allowlist rejects any `#rrggbb`/`#rgb`
anywhere in the markup, matching the rule `tokens.css` already enforces
repo-wide). Keep a `<title>` element. Stay under ~12 text labels per
diagram; past that, split the idea into two visuals or move some of it into
prose.

---

## 5. Facilitator notes and the competency block (§A.4)

`facilitator-notes.*.md` and `competency.json` are never seen by a `bhw` —
RLS keeps them to `assessor`/`admin` only. Write them as if a facilitator
who has never taught this module before is reading them five minutes before
a session.

**`facilitator-notes.*.md`** (free-form, per module) should cover:
timing (how many minutes this module needs), the delivery script (what to
actually say, beat by beat, matched to the lesson's sections), **one named
misconception** BHWs commonly hold about this topic and how to correct it
without embarrassing anyone, discussion prompts to pose to the group, and
the answer key to every inline retrieval check in the lesson (§6).

**`competency.json`** is structured, one entry per objective:

- **`competency_statement_*`** — the BHS NC II competency this module maps
  to (§C of the plan's table). Write it once per module, not once per
  objective.
- **One `observation_indicators` entry per objective**, each with:
  - **`observable_*`** ("Nakikita — kaya na"): what the BHW visibly *does or
    says*. Must be checkable by watching, not by asking. Write it as a
    completed action, not a trait.
    - ❌ "Nauunawaan ang kahalagahan ng referral." (a mental state — you
      cannot watch someone "understand")
    - ✅ "Nagbibigay ng referral slip na may kumpletong impormasyon at
      naipapaliwanag kung saan pupunta ang kliyente." (an action you can
      literally watch happen)
  - **`not_yet_*`** ("Hindi pa sapat"): the specific, common shortfall — not
    a vague "needs improvement." Naming the actual failure mode is what lets
    an assessor recognize it when they see it, rather than passing someone
    out of politeness.
    - ✅ "Nagbibigay ng referral slip ngunit hindi naipapaliwanag kung sino
      ang hahanapin sa pasilidad."
  - **`levels`** — three short phrases describing what *this specific
    indicator* looks like at `kaya_na` (can already do it unsupervised),
    `kailangan_practice` (does it, but needs more repetition or prompting),
    and `hindi_pa_kaya` (cannot yet do it reliably). Each level description
    should be specific enough to this indicator that swapping it with
    another indicator's level text would visibly not fit — a level that
    reads the same on every indicator ("kailangan pa ng practice") is not
    doing its job.

`objective_index` in each indicator is 0-based and must point at a real
objective — the loader rejects an indicator whose index has no matching
objective.

---

## 6. Retrieval checks: how many, and where

Retrieval checks (`:::check` blocks — see `content/training/README.md` for
the exact syntax) are low-stakes, ungraded, in-the-moment self-checks between
chunks — never a test. Nothing is scored or persisted (§A.5); a wrong answer
just gets corrective feedback and the BHW moves on.

- **At least one retrieval check per module, ideally one per 2-3 `core`
  sections** — enough to break up passive reading, not so many that the
  module feels like a quiz. There is no hard cap enforced by the loader;
  use judgment the way you would pace a classroom.
- A check should test the *scenario's* decision point, not a trivia fact
  pulled from the text. "Bakit hindi agad nagbigay ng gamot si BHW Marites?"
  (testing judgment) beats "Ilang taon si Aling Nena?" (testing recall of an
  arbitrary number).
- Exactly one option is correct (marked `+`); write 2-3 plausible wrong
  options that reflect real misconceptions, not obviously-silly distractors
  — a distractor nobody would pick teaches nothing about where the BHW's
  actual thinking might go wrong.
- The feedback line (`>`) always explains *why* the correct answer is
  correct, not just "Tama!" alone — the explanation is what makes it a
  learning moment rather than a scorekeeping moment.

---

## 7. Bilingual parity

`lesson.fil.md` and `lesson.en.md` are two languages of the *same* lesson,
authored together, not translated independently later. The loader enforces
structural parity — same section count, same `kind`/`tier` per section in
order, same number of options in each corresponding check — because a
mismatch here silently produces a lesson that is only correct in one
language. If you find yourself wanting a section that exists in Filipino but
not English (or vice versa), that is a sign the module should be
restructured, not that the parity rule should be worked around.

Filipino is the primary language BHWs will use day-to-day; write it first,
then write the English as a full equivalent (not a literal translation —
natural English phrasing that says the same thing), then check both against
each other one more time.

---

## 8. One competency per module

§C of the plan maps each module to one primary BHS NC II competency
(module 8 carries two, and may split into two modules if authoring shows
it's too dense — a documented allowance). Do not fold a second competency's
material into a module "because it's related" — that breaks the
one-to-one mapping the A.4 rubric depends on, and makes the competency
statement in `competency.json` describe only part of what the module
actually covers.

---

## 9. Checklist before you call a module done

- [ ] 3-4 objectives, each an observable action, no banned verb
- [ ] Scenario is named and specific, returned to across sections
- [ ] Every section heading has both a `kind` and a `tier`
- [ ] `core` sections alone satisfy every objective
- [ ] At least one visual, using a §D primitive, caption states the
      takeaway, both `alt_text_*` filled in and different from the caption
- [ ] At least one retrieval check, testing judgment not trivia, feedback
      explains why
- [ ] Summary is written from the sections' takeaways and states the
      connecting idea — read it next to the objectives and confirm it is
      not just their tense flipped
- [ ] `facilitator-notes.*.md` has timing, script, one named misconception,
      discussion prompts, and the check answer key
- [ ] `competency.json` has one competency statement and one paired
      Nakikita/Hindi-pa-sapat indicator per objective, each with three
      distinct level descriptions
- [ ] `lesson.fil.md` and `lesson.en.md` match structurally: same section
      count, same kind/tier per section, same option count per check
- [ ] `qa-entries.json` entries follow `content/kb/hhp-ncd/entries/`'s shape
      (see `content/kb/README.md`) so the module is chatbot-searchable
- [ ] Run the loader in `--dry-run` and read every validation warning before
      moving to the next module
