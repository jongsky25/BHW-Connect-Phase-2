# C1-PE-1 — Complete manual passages beside Chapter 1 lessons

Owner / release coordinator: current Codex session, single-session work.
Branch / PR: `plan/chapter1-pilot-enhancements-2026-11-20`, [#515](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/515).
Base: `44ba7477057c1495256b729d5f5d4fd13beb2c01`.
Updated: 20 November 2026 UTC.
Status: reference-reading increment implemented and locally checked; remote
delivery/deployment evidence follows below. Broader authored-language review and
representative signed-in usability remain outstanding, not silently marked done.

## Outcome and boundaries

Every one of the 42 Chapter 1 lessons now has an optional **Basahin ang Reference
Manual / Read the Reference Manual** section above the existing reader, for BHWs
and assessor study. It remains available when revisiting completed lessons.
The same scenario, checks, scoring, media, completion rules and immutable
publication identities remain in use. Chapter 2/3 routes do not enable it.

Eleven shared passages contain the complete relevant named manual sections,
including headings, lists, examples and all five image-based tables. Long table
rows are displayed as labelled cards for phone reading; the original table image
is also available at full size. Text keeps the source Filipino in either UI
language. Page citations distinguish printed and PDF numbers. The new wrapper
instructions use plain Filipino and explicitly separate the quotation from
authored lesson explanations. The three resource lessons label the manual's
partial support; their trial/audit exercises are not presented as quoted manual
procedures. No full-manual download is required.

This completes the reference-reading part of C1-PE-1, not a claim that every
existing Filipino instruction has been user-tested or rewritten. Do that review
with specific observed difficult wording, without modifying quoted text or
reopening already resolved feedback speculatively. C1-PE-3 policy decisions in
the baseline remain deferred; no retake/disclosure policy changes are included.

## Source fidelity and publication reconciliation

Source: *Barangay Health Workers’ Reference Manual*, 2022, DOH BLHSD with WHO
Philippines, Drive file `13auqmQNRLevwxTm3lkMRHX13U1_d0TYs`, 150 pages.
PDF SHA-256: `e79248b6be4c6a5f871cb338f54fd867210d599302075d9650bc5aa04ba82296`.
Excerpt version: `2022-c1-v1`.

`scripts/extract-chapter1-manual.py` reproduces the excerpt from that exact PDF
and refuses a different source hash. Paragraphs/headings/lists come directly
from PDF text blocks in reading order, with whitespace/ligature normalization.
The five tables were visually transcribed from PDF 19–23 and checked against
rendered originals; the exact original crops are content-hashed PNGs. The full
PDF is not committed. Reviewer: this Codex session, source text and rendered
table comparison; this is not a new clinical/legal specialist sign-off.

The older transcription's omissions are addressed: open/closed questions,
Five Why example, priority matrix, and both safety-table pages are present.
Source wording, including awkward spellings/phrasing, stays within the quotation.
Reflowed text preserves content rather than the PDF's pagination/layout.

The C1-PE-0 raw-source discrepancy is resolved: all eight differences belong to
approved release overlays already applied by the actual loader. Comparing
`applyApprovedReferenceReleases(loadReferenceModule(...))` matches all **42/42**
published hashes, including updated questions, wording and contextual story media.
Do not edit those protected raw packages or republish lessons merely to make
raw hashes equal. The new regression check uses the effective loader chain.

## Owned paths and delivery parts

- `content/training/day1-basic-competencies/manual-references/chapter1.json`:
  static excerpts, source identity, page citations, 42 mappings and support limits.
- `public/training/manual-2022/`: five immutable original-table image crops.
- `src/lib/elearning/chapter1-manual-reference.ts` and the corresponding component:
  read-only lookup and optional accessible reading surface.
- `manual-lesson.tsx` and the two existing training route files: explicit
  Chapter 1 enablement. No new layout/middleware queries or read-path writes.
- Focused content/component checks, local browser fixture and reproduction script.
- C1-PE-0 correction/evidence, phase plan and work register.

Deployment is app code plus bundled static content/assets. **No migration,
content loader, pilot seed, feature flag or database publication step is needed.**
Reference reading does not count toward completion and does not change a lesson
revision. Existing historical attempts, enrollments, scores and awards are intact.

Rollback: revert the reference-reading code/static-content increment and redeploy
the prior main. Do not touch learner progress or the existing approved lesson
release overlays. No database restoration is required.

## Verification

- Effective loader against bounded live publication receipt: 42/42 hashes match.
- 82 existing focused local tests passed: assessment save/resume/pacing/finish,
  lesson resume/completion, simulation recovery, in-memory assessment DB.
- Existing `chapter1-browser-smoke.mjs` passed in local Chromium: pre/post flows,
  optional breaks, saved-draft resume, review and confirmation. It uses local
  RPC fixtures, not pilot data. Its existing Link shim logs a non-boolean
  `prefetch` warning; assertions and journey passed.
- 100 focused tests passed across new reference coverage/components and existing
  manual/navigation/assessor-study tests.
- `chapter1-manual-browser.mjs`: all 42 references, both UI languages at 390px,
  keyboard opening, citations, complete safety tables, original image loading,
  no horizontal overflow; WCAG 2 A/AA axe scan passed on the safety surface.
  Already-loaded reference text remained readable after disconnect/reopen.
  Cold offline loading and unloaded images are not promised. This local fixture
  uses actual application CSS and the actual reference component.
- Production build and TypeScript passed. Lint passed with five pre-existing
  warnings, no errors (before final fixture-only checks).
- Full local suite: **333 files / 2,728 tests passed**. Final focused excerpt
  checks: six tests passed. Final fixture lint passed with no added warnings.
- First remote CI exposed four historical no-change audits that also covered
  new files (the initial local run preceded staging those additions). Added exact
  SHA-256 allowances for the new manifest and five figures; all pre-existing
  source/media paths remain protected. All 12 tests across the four affected
  audits and reference coverage pass with the additions tracked.
- Delivery: bundled implementation and baseline continuation pushed together
  on PR #515; exact commit is the branch head. CI/deployment state must be
  checked from the PR; this record does not claim a completed release.

Signed-in pilot access was not established in this workspace. Local browser
checks are not an authenticated production walkthrough or representative-user
approval. Record actual production identity separately before saying deployed.
