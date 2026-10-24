# FB-2.5 — plant-aid access and local ownership draft

Related report: `5bedf6bc-fe03-4feb-a48e-1ddc17313492`.
This increment inventories existing material and defines the next reviewable
deliverable. It publishes no clinical advice, plant-identification card or
mandatory protocol. A named local clinical/training owner has not been supplied.

## Inventory and access findings

The [inventory](fb-2.5-plant-aid-inventory-2026-10-24.json) records the repository
practice files in English and Filipino for all twelve medicinal-plant lessons,
with paths and SHA-256 hashes. These participant cards, worksheets and observer
sheets support fictional facilitated practice. The scope lesson's participant
card asks learners to compare two plant cards; it does not itself provide the
two verified botanical cards. Do not relabel it as an approved identification aid.

The two current published lessons `plant-scope-identification` and
`plant-integrated-practice` each attach one bilingual process diagram. Their
asset arrays were checked read-only on 24 October 2026. Neither attached diagram
is a botanical identification card. The repository preview generator includes
printable practice materials; this establishes a preview path, not a verified
learner route to current, locally approved botanical references. Local printed
aids and external clinical inventories have not been inspected.

The lessons already require botanical identity, plant part, a current reference,
non-use when uncertain, and consultation. Their published Read/Slides copy was
compared in the preceding audit. Whole draft hashes differ because publication
filters media; do not replace the live revisions with the draft wholesale.

## Proposed local register and approval handoff

The clinical/training owner should supply the actual aid for each plant and
approve its scope. Record these fields for each accepted aid:

| Field | Required evidence |
| --- | --- |
| Stable aid ID, version and review date | The exact document, checksum and replacement/withdrawal record |
| Source and provenance | Issuing authority, source URL/page, image rights and limits |
| Identity and part | Reviewer-verified botanical identity and intended plant part, with ambiguity/look-alike limits |
| English and Filipino text | Equivalent wording reviewed with local BHW readers; text remains legible when printed |
| Clinical/training owner | Actual name/role and dated scope approval; no placeholder approval |
| Consultation route | Locally supplied responsible person/service and fallback route |
| Access | Stable learner link to the approved version and a printable copy; superseded copies clearly marked |

The PITAHC directory cited in the preceding audit is a reference source, not
evidence of a national mandatory BHW card protocol. A completed register or
observed card exercise does not certify a plant, authorize treatment, or confer
prescribing/dispensing powers. No dose, preparation instruction or new botanical
identity is proposed here.

## Proposed learner wording for owner review

**English:** Use the current reference aid provided by your local training or
clinical team. Check its version, botanical identity and plant part. If the aid
is unavailable, outdated or does not resolve uncertainty, do not recommend
preparation or use; consult the responsible clinician or supervisor through the
local route. A picture or familiar name alone does not confirm identity.

**Filipino:** Gamitin ang kasalukuyang reference aid na ibinigay ng lokal na
training o clinical team. Suriin ang bersiyon, botanical identity at bahagi ng
halaman. Kung wala ang aid, luma ito o may hindi pa tiyak, huwag magrekomenda ng
paghahanda o paggamit; kumonsulta sa kinauukulang clinician o supervisor sa lokal
na paraan. Hindi sapat ang larawan o pamilyar na pangalan upang makumpirma ang
pagkakakilanlan.

This is draft wording, not a new requirement or published lesson. Replace the
generic local route with a verified route before adoption; do not invent a
phone number or reviewer. Preserve urgent-referral guidance and avoid delaying
care while locating an aid.

## Next implementation and acceptance checks

1. Have the named local clinical/training owner review the inventory, supply the
   actual aids and consultation route, and decide whether the two teaching cards
   in the scope exercise need new material or an existing approved attachment.
2. Review both languages, provenance and identification limits for the actual
   documents. Test uncertain/missing-aid cases with fictional practice details.
3. Add the approved documents to the existing lesson asset flow with versioned
   IDs and hashes, descriptive links, readable text and a print path. Review
   Read/Slides/narration references together if their wording changes.
4. Verify signed-in BHW access in both languages and on mobile, plus print
   legibility and the missing/outdated-aid fallback. Use an isolated database
   for write-based tests; then deliberately publish new immutable revisions.
5. Keep the report open until aid access and the local route are verified.
   Existing progress, attempts and competency evidence stay on their recorded
   versions. Do not silently regrade or certify learners from this exercise.

FB-2.6 remains the subsequent slice: comprehend current T13 role wording and
problem-analysis safeguards, then recover the exact item/context for network
versus referral and the benefits concern. The prior audit records those four
IDs and their separate acceptance checks. Their original intent cannot be
inferred from nearby current questions.
