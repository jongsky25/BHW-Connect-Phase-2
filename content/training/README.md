# Training content

## Reference Manual lesson authoring (packages 3–5)

The loader now requires an explicit `--mode`: `hierarchy` (stage a draft program
and unavailable chapters), `course` (course metadata only), `content` (selected
legacy modules only), `lessons` (selected converted subchapters), `assessments`
(seed an empty bank or verify an identical bank), or `kb` (KB only). Old commands
without a mode fail before sign-in. A changed existing assessment bank is rejected:
historical questions must be versioned before replacement.

For a converted subchapter, keep the existing module folder and project lock.
Add `lessons/<stable-lesson-key>/` containing:

- `lesson.json`: `manifest` (key, zero-based position, bilingual titles and one
  or two objectives, explicit requiredness), `sections` (stable IDs, concepts,
  asset IDs, bilingual takeaways and check), `coverage`, `sources`, `assets`.
- `read.fil.md`, `read.en.md`: `## [stable-section-id] Heading` followed by
  plain paragraphs. Position IDs and order must match the manifest and language.
- `slides.json`: independently authored bilingual headings and display text,
  stable IDs, concept IDs, asset references, layout, nullable check and optional
  bilingual narration. Maximum 600 display characters per language. Do not
  paste Read bodies into Slides.
- `facilitator.fil.md`, `facilitator.en.md`, `competency.json`: private notes
  and one observation indicator per objective; never included in learner props.

Coverage must match both directions: every position's concepts and every concept's
position references agree. The selected subchapter must cover exactly its existing
non-excluded concept set. References use named sources and positive one-based PDF
pages, with corrected citations from the approved prototype crosswalk.

Assets live under `public/training/`, use bilingual alt/caption text and provenance,
and have a SHA-256 `content_hash`. Their filename includes its first 12 characters.
The loader verifies bytes and rejects root escapes/symlinks outside the public root.
New media gets a new path; retain historical assets. Draft media can stage but
cannot promote. The converted 1.1 fallback media remains draft pending visual review.

Example (future authorized target, not a release instruction):

```sh
npm run training:load -- --mode hierarchy --project <ref> --org-unit "<name>"
npm run training:load -- --mode lessons --modules 01-tungkulin-ng-bhw --project <ref> --org-unit "<name>"
```

No writes occur without `--apply`. In lessons mode, `--apply` stages immutable
revisions and separate private notes; `--apply --publish` additionally calls
the complete-subchapter atomic publication RPC. It does not activate the program
or chapter, publish the delivery course, change tests/KB, or migrate progress.
Hierarchy staging never activates a program. Activation remains a reviewed release step.

The full selected subchapter is the promotion unit. Natural lesson keys recover
interrupted inserts. Project locks gain `lessons[moduleKey][lessonKey]` mappings;
existing entries are retained and writes use atomic replacement. Missing/stale
course/module IDs or conflicting lesson metadata stop with a reconciliation error.
Identical staging/publication performs zero database writes. Revisions hash the
canonical learner content, lesson metadata, asset hashes and private notes.

Run `npm test -- scripts/tests/reference-content.test.mjs scripts/tests/reference-navigation.test.mjs`
through Vitest; see `docs/bhw-reference-content-navigation.md` for verification
limits and the extended disposable PostgreSQL rehearsal.

### Read-mode narration for converted subchapters

`npm run training:narrate` (dry run) / `-- --apply` pre-renders one MP3 per Read
section and language for every subchapter with a `lessons/` folder (or
`--modules a,b`). Output is committed: `public/training/audio/<module>/<lesson>/
<section>.<lang>.<hash12>.mp3` plus `day1-basic-competencies/narration.json`.
No Supabase write, no migration, and lesson revisions (and their approval
hashes) are unchanged: audio is keyed by lesson key + section ID + language +
a hash of the exact narrated text and voice.

- Voices: `fil-PH-BlessicaNeural` and `en-PH-RosaNeural`, via the keyless Edge
  Read Aloud service (honours `HTTPS_PROXY`). Each sentence is synthesized
  separately and the MP3 frames are joined, so read-along timings are exact.
- `**bold**` markers are stripped from speech; the Read view renders them bold.
- Re-runs only render changed sections and delete superseded files of the
  processed subchapters.
- The lesson page shows a player only when the recorded sentences equal the
  published revision's text. `scripts/tests/reference-narration.test.mjs`
  fails when lesson text changes without re-rendering.
- Slides mode has no audio yet: 1.1 slides have no narration script and
  slide display text differs from the Read text, so Read timings are never
  reused there.
- Machine speech: a listening review (pronunciation of acronyms such as BHW,
  RHU, RA 7883, and Filipino/English code-switching) is still owed.

Versioned source of truth for facilitated BHW training content, loaded into a
Supabase project by `scripts/training-load.mjs`. This is the format
reference — what each file must contain so the loader can parse it. For how
to write *good* content (objective verbs, the retrieval-first summary rule,
visual captioning, competency indicators), read
`docs/training-content-style-guide.md` first; come back here for the
mechanics.

This mirrors `content/kb/`'s conventions (see `content/kb/README.md`) —
versioned files are the master copy, the loader always rebuilds each row
from these files, and a `locks/<ref>.json` file (written by the loader,
one per target Supabase project) maps a stable content id to the row uuid it
became, so re-running the loader updates in place instead of duplicating.

## `day1-basic-competencies/` — Day 1: Basic Competencies (9 modules, §C of `docs/training-modules-plan.md`)

```
day1-basic-competencies/
  course.json            title_fil/en, description_fil/en, quiz thresholds
  sources.json           citation registry (RA 11223, RA 7883, EO 51, RA 10028, AOs, TESDA BHS NC II, ...)
  categories.json         kb_categories + domains for this course's qa-entries.json (mirrors content/kb's categories.json)
  test-questions.json    the shared pretest/posttest question bank (course-level, §A of the plan)
  _visual-primitives/    the 6 §D SVG layout templates — copy one, fill in labels
  modules/
    01-tungkulin-ng-bhw/
      module.json               objectives_fil/en (3-4), summary_fil/en, title_fil/en
      lesson.fil.md              lesson.en.md
      facilitator-notes.fil.md   facilitator-notes.en.md
      competency.json            competency_statement_* + observation_indicators
      visuals/
        visuals.json             position, primitive, file, caption_*, alt_text_*, tier
        01-role-map.svg
      qa-entries.json            shape of content/kb/hhp-ncd/entries/module-N.json
    02-polisiya-uhc/
      ...
  locks/<ref>.json       content id -> row uuid, per Supabase project (written by the loader)
```

Module folder names (`01-tungkulin-ng-bhw`, ...) are the stable content ids
the loader keys everything on. Renaming a module folder orphans its row in
`locks/<ref>.json`; editing its content is fine and re-loads in place.

### `course.json`

```json
{
  "id": "day1-basic-competencies",
  "title_fil": "...", "title_en": "...",
  "description_fil": "...", "description_en": "...",
  "quiz_passing_percent": 80,
  "quiz_max_attempts": 3
}
```

`id` is the content id stored in the lock file — it is never sent to the
database directly (the `courses` table has no such column); it exists so the
loader can find "this course" again on a re-run without guessing from the
title. The org unit a course is attached to is a load-time decision, not an
authoring one — see `--org-unit` in the loader section below.

### `module.json`

```json
{
  "id": "01-tungkulin-ng-bhw",
  "position": 0,
  "title_fil": "...", "title_en": "...",
  "objectives_fil": ["...", "...", "..."],
  "objectives_en": ["...", "...", "..."],
  "summary_fil": "...",
  "summary_en": "..."
}
```

`body_fil`/`body_en` (the INC-12 columns) are not authored here — every
module in this course has a non-null `lesson`, so the renderer always takes
the structured path and those two legacy columns are written as `''`.

### `lesson.fil.md` / `lesson.en.md` — the directive syntax

Line-based, deliberately not a markdown-AST dependency. A heading opens a
section; everything until the next heading or directive is that section's
`body_*`.

```markdown
## [scenario/core] Ang tanong ni Aling Nena

Si Aling Nena, 34 anyos, ay may anak na palaging may sipon at ubo. Nagtanong
siya kay BHW Marites kung anong gamot ang dapat niyang bilhin.

Sa halip na agad magmungkahi ng gamot, unang tinanong ni BHW Marites kung
gaano na katagal ito nangyayari, at kung may iba pang senyales.

:::visual 1
:::takeaway
Hindi lahat ng tanong ay kailangan ng gamot — may tanong na kailangan ng
tanong.
:::
:::check
? Bakit hindi agad nagbigay ng gamot si BHW Marites?
- Kasi wala siyang alam na gamot
+ Kasi hinanap muna niya ang dahilan ng paulit-ulit na sakit
- Kasi dapat munang pumunta sa doktor
> Tama! Ang pagtuklas sa ugat ng problema ang unang hakbang bago
  magpaalala o mag-refer.
:::

## [concept/standard] Bakit hindi basta-basta nagrerekomenda ng gamot
...
```

- **`## [kind/tier] Heading`** opens a section. `kind` is one of `scenario` /
  `concept` / `contrast` / `practice`; `tier` is one of `core` / `standard` /
  `deep` (§A.6 of the plan). **Both are required on every heading** — an
  omitted tier is rejected, not defaulted, because a silently-defaulted tier
  is exactly the authoring mistake that would make a "short" density session
  miss part of the module.
- **`{id, id}` at the end of a heading** — optional coverage markers naming
  which `coverage.json` concepts that section delivers (§C.2 of the plan).
  The marker is stripped from the heading before it is stored, so it never
  renders. Both language files must carry the same ids in the same order.
- Plain paragraph lines between the heading and the next directive become
  that section's `body_*` (blank lines separate paragraphs; paragraphs are
  joined with a blank line in the stored text).
- **`:::visual <position>`** — a single line, no closing `:::`. Sets the
  section's `visual_position` to that integer, which must match a
  `position` in that module's `visuals/visuals.json`.
- **`:::takeaway` … `:::`** — the block's text becomes `takeaway_*`. Every
  section should have one; it is what the closing summary is assembled from
  by the author (not automatically by the loader — see the style guide §2).
- **`:::check` … `:::`** — an inline retrieval check (§A.5: authored,
  never persisted). Inside the block:
  - a line starting with `?` is the prompt
  - a line starting with `-` is a wrong option
  - a line starting with `+` is the correct option (exactly one per check)
  - a line starting with `>` is the feedback shown after answering
  - option/feedback lines may wrap onto a following indented line (a line
    that does not start with one of `?-+>` continues the previous one)

A section needs neither `:::visual`, `:::takeaway` nor `:::check` to be
valid structurally, but the style guide (§3-§6) expects every section to
carry a takeaway and most modules to carry at least one visual and one
check — those are content-quality rules the loader flags heuristically, not
hard requirements on every single section.

### `facilitator-notes.fil.md` / `facilitator-notes.en.md`

Free-form markdown, not directive-parsed — stored as-is into
`course_module_facilitator_notes.notes_fil`/`notes_en`. See the style guide
§5 for what belongs in here (timing, script, named misconception, discussion
prompts, check answer key).

### `coverage.json`

The §C.2 breadth contract: everything this module's sources oblige it to
teach, so "we covered the whole topic" is checkable rather than asserted.
**Write it before the lesson prose,** by reading the module's topic across
all three documents in `docs/source-material/day1-basic-competencies/` (that
folder's README has a table saying where each topic sits in each).

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
      "redundant_with": "Not DOH content and not connected to any competency — deliberately not delivered."
    }
  ]
}
```

- `id` — stable, unique within the module, `m<N>.<area>.<thing>` by
  convention.
- `source` — where the obligation comes from, precise enough to check: a
  deck slide number, or a page in one of the two manuals.
- `redundant_with` — non-null means "deliberately not delivered, and here is
  why". Use it for genuine redundancy and for material that is not
  curriculum; do not use it to excuse something merely hard to author.

**The loader rejects** any concept that no `core`- or `standard`-tier
section marks. `deep` does not satisfy a concept: a BHW at the default
Karaniwan density never sees a `deep` section, so a concept reachable only
there is not delivered. It also rejects a marker naming an id that
`coverage.json` does not declare, a duplicate id, or a concept with no
`source`. A module with no `coverage.json` at all is flagged for review
rather than rejected, so pre-coverage modules still load.

Facilitator-only material — the deck's Learning Activity, Demonstration and
Practical Application slides — does **not** belong in `coverage.json`. It
goes to `facilitator-notes.*.md`, which is a separate track, not a coverage
gap.

### `competency.json`

```json
{
  "competency_statement_fil": "...",
  "competency_statement_en": "...",
  "observation_indicators": [
    {
      "objective_index": 0,
      "observable_fil": "...", "observable_en": "...",
      "not_yet_fil": "...", "not_yet_en": "...",
      "levels": {
        "kaya_na_fil": "...", "kaya_na_en": "...",
        "kailangan_practice_fil": "...", "kailangan_practice_en": "...",
        "hindi_pa_fil": "...", "hindi_pa_en": "..."
      }
    }
  ]
}
```

`objective_index` is 0-based into that module's `module.json.objectives_*`.
One indicator per objective (style guide §5).

### `visuals/visuals.json` + the SVG files it references

```json
{
  "visuals": [
    {
      "position": 1,
      "primitive": "hub-spoke",
      "file": "01-role-map.svg",
      "caption_fil": "...", "caption_en": "...",
      "alt_text_fil": "...", "alt_text_en": "...",
      "tier": "core"
    }
  ]
}
```

`file` is a path relative to the module's `visuals/` folder. The loader
reads it, runs it through `src/lib/elearning/svg-allowlist.ts`'s
`validateSvgMarkup`, and stores the raw markup as `svg_markup` — never a
photo path here (photos use `primitive: "image"` and an already-uploaded
Supabase Storage URL in place of `file`, once INC-22 ships the upload path;
none of Day 1's modules need one yet).

### `qa-entries.json`

Same shape as `content/kb/hhp-ncd/entries/module-N.json` — see
`content/kb/README.md` for the field-by-field contract (`tier`,
`domain`, `keywords`, `sources`). `category` must match a slug in this
course's own `categories.json`, not `content/kb/hhp-ncd/categories.json`
(the two corpora keep separate category rows, same as `hhp-ncd` and `cesr`
already do — see `scripts/lib/kb-content.mjs`'s corpus model). **Scoped for
this pass:** `qa-entries.json` seeds `kb_categories`/`kb_entries` only; long-form
`kb_articles` generation from the lesson content is not built in INC-21 —
named here so it is not silently assumed. A `qa-entries.json`-only entry set
is enough to make a module's content chatbot-answerable (`kb_entries` is
what `src/lib/chat/scoring.ts` matches against); `kb_articles` is
supplementary long-form reading the existing `hhp-ncd` corpus also does not
require every module to have.

### `test-questions.json`

```json
{
  "questions": [
    {
      "prompt_fil": "...", "prompt_en": "...",
      "options": [{ "fil": "...", "en": "..." }, ...],
      "correct_option_index": 0
    }
  ]
}
```

One shared bank for the whole course's pretest/posttest (§A of the plan:
taken once before content, once after; delta = learning gain). `position` is
the array index. As modules 2-9 are authored (INC-24/25), add questions here
covering their objectives too — this file grows with the course, it is not
per-module.

## Loading

```bash
npm run training:load -- --project <ref> --org-unit "<org unit name>"                    # dry run
npm run training:load -- --project <ref> --org-unit "<org unit name>" --apply
npm run training:load -- --project <ref> --org-unit "<org unit name>" --apply --publish --owner <admin-username>
npm run training:load -- --project <ref> --org-unit "<org unit name>" --modules 01-tungkulin-ng-bhw --apply
```

- `--org-unit` is required, no default (same reasoning `kb-load.mjs` gives
  for `--project` having none): a course's `org_unit_id` decides who can see
  it, so the target is always named explicitly. Pass the exact `org_units.name`
  of the org unit the course should be scoped under — typically the
  top-level `national` unit for a course meant for every BHW.
- Without `--publish`, `courses`/`kb_entries` load as `draft` — invisible to
  everyone but admins, same as `kb-load.mjs`. `course_module_visuals` and
  `course_module_facilitator_notes` have no draft/published state of their
  own; they follow their parent module and are gated by the parent course's
  status and the `course_sessions`/`elearning` feature flags at the UI layer,
  same as every other INC-12/INC-19/INC-20 row.
- `--modules <id,id,...>` limits a run to specific module content ids
  (matching the folder name), for iterating on one module without touching
  the rest of the course.
- Re-running with `--apply` is idempotent: every row is identified through
  `locks/<ref>.json` (course and module ids) or the database's own unique
  constraints (`course_module_visuals(module_id, position)`,
  `course_test_questions(course_id, position)`,
  `course_module_facilitator_notes(module_id)` — unique already), so nothing
  is ever duplicated by a second run.

### Validation (fails loudly, before anything is written)

- SVG allowlist violations (`src/lib/elearning/svg-allowlist.ts`).
- Fewer than 3 objectives, or an objective starting with a banned verb
  (style guide §1).
- An empty summary, or one whose sentences are a near-verbatim
  concatenation of that module's own objectives (style guide §2's failure
  mode — checked with a similarity heuristic, not exact string matching).
- A visual with blank alt text, or a section's `visual_position` that does
  not match any `visuals.json` entry.
- `lesson.fil.md` and `lesson.en.md` disagreeing on section count, section
  `kind`/`tier` per section, or check option counts.
- An `observation_indicators` entry whose `objective_index` has no matching
  objective.
- A module with zero `core`-tier sections (§A.6: `core` alone must be able
  to stand in for the whole module at "short" density).
- Everything `scripts/lib/kb-content.mjs`'s own `loadContent()` already
  checks for `qa-entries.json` content (keyword count, source ids resolving,
  etc. — see `content/kb/README.md`).

Every rule above has a failing-fixture test in
`scripts/lib/training-content.test.mjs`.

## Reviewing a module at a chosen density

Loading content is not enough to *see* it at Detalyado. §A.6 density is
deliberately not a BHW-facing preference, and INC-23's facilitator density
selector has not shipped, so `deep`-tier sections render only when the reader
is enrolled in a `course_session` whose `lesson_density` is `long` — and only
when the `elearning` and `course_sessions` flags are both on
(`src/app/courses/[id]/page.tsx`). With any of those missing, the page falls
back to `normal` and the deep sections are silently absent.

```bash
npm run training:review-setup -- --project <ref> --bhw <username>            # dry run
npm run training:review-setup -- --project <ref> --bhw <username> --apply
npm run training:review-setup -- --project <ref> --bhw <username> --density short --apply
npm run training:review-setup -- --project <ref> --bhw <username> --create-facilitator --apply
```

It turns on both flags, publishes the course if the loader left it `draft`,
creates (or re-densities) the facilitator's session for that course, and
enrolls the named BHW. Every write goes through the INC-12/INC-19 RPCs, so the
org-scope checks and audit events are the same ones a real facilitator's
browser produces. Re-running is idempotent.

Two accounts are required and cannot be collapsed into one — `rpc_flag_toggle`
and `rpc_course_set_status` demand `role = 'admin'`, while
`rpc_course_session_create` / `_enroll` / `_set_density` demand
`role = 'assessor'`:

| Env | Account |
| --- | --- |
| `KB_LOADER_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | the project's anon key |
| `KB_LOADER_USERNAME` / `KB_LOADER_PASSWORD` | an admin (the same one `training:load` uses) |
| `REVIEW_FACILITATOR_USERNAME` / `REVIEW_FACILITATOR_PASSWORD` | an assessor whose org unit is at or above the reviewer's |

A project that has no assessor on it yet does not need a second password:
`--create-facilitator [username]` provisions a throwaway one through the real
`rpc_admin_create_user`, under the admin token the script already holds, in the
reviewer's own org unit — the one place that satisfies both org-scope checks at
once. Its generated temp password is printed once and stored nowhere. An
existing username is never taken over this way, because `rpc_admin_reset_password`
would lock out whoever holds that account; the script stops and asks instead.
