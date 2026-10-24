# FB-2.5 — live pilot for review and comments

The owner clarified that the immediate goal is visible pilot material that
people can inspect and comment on. Collecting locally approved reference cards
is not a prerequisite to this pilot preview. This direction supersedes that
sequencing in the earlier handoff plan. Ray Justin Ventura remains training
owner; no separate clinical sign-off is attributed to him.

## Review experience

Open **Courses → Plant reference aids · pilot**, or `/plant-aids` while signed
in. The existing learning feature flag and normal account access apply.
The page provides ten cards, botanical/local-name search, English/Filipino
switching, source links, printing of the current selection, and a fictional
two-plants/one-name practice case with an expandable possible response.

The existing page-feedback feature can target each card or sentence using a
stable element ID on `/plant-aids`. Access follows the same existing eligibility
check and preview restrictions as the global feedback widget. No new feedback
storage, permission or admin role is introduced. Training-owner assignment does
not create or elevate an application account.

The cards are explicitly pilot review material. They list names and the parts
already described in the lessons; they do not establish a real specimen's
identity or add treatment/preparation instructions. Clinical verification and
the local consultation contact remain openly pending. Reviewers can comment
on wording, translation, desired imagery, source navigation and print layout
now, without gathering local documents first.

## Content provenance

All ten botanical names were checked against the
[PITAHC herbs directory](https://pitahc.gov.ph/herbs-directory/) on 24 October
2026. Each card links directly to its named section in that directory. Plant
parts reproduce each corresponding Chapter 2 lesson's bilingual `action`
section under `drafts/05-medicinal-plants/lessons/<key>/read.{en,fil}.md`.
The directory's nomenclature is retained for this review; taxonomic synonyms
are not independently resolved or invented. Source photography is not copied
or replaced with fabricated identification imagery.

The checked source lists Senna alata, Momordica charantia, Allium sativum,
Psidium guajava, Vitex negundo, Quisqualis indica, Blumea balsamifera,
Carmona retusa, Peperomia pellucida and Mentha cordifolia. The interface's
version is `pilot-1 · 2026-10-24`; later corrections can follow from comments.

## Verification and release

Component/route coverage checks authentication, the learning flag, preview and
feedback eligibility, language/search continuity, no-match behavior, printing,
source targets, and the existing feedback form's card/page context. An isolated
browser journey opens the catalog link as a BHW, checks the mobile layout,
switches language, filters the cards, opens the practice response and checks the
print view. It does not write clinical, progress or assessment records.

Merge after repository CI, then verify the production deployment corresponds
to the merge SHA. The PR carries the final deployment receipt. Pilot review
does not require publishing a new assessed lesson revision, rewriting an
assessment release, changing a lesson criterion, or closing the original
feedback report. The next iteration should use comments from the live page.
