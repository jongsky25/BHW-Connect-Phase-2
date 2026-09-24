# BHW Reference Manual redesign: reconciliation

Checked 24 September 2026. This records work package 0 and proposed integration boundaries; it does not approve subject content or change live data.

## GitHub baseline and concurrent work

- Latest main: `652b723af6a8e81426f797c1b91d53dba0b7b484`, merge of [PR #79](https://github.com/jongsky25/BHW-Connect-Phase-2/pull/79), which adds 06–09 from `codex/inc25-training-modules-6-9` at `0d33002ea201fa47751047b49c2a642b8ca149c1`. The implementation plan's older `870a584` baseline is superseded.
- PR #79 reports nine modules, 38 test questions, 54 QA entries, and 89 targeted tests. These are prior-author results, not checks rerun here. The PR explicitly says 06–09 require content approval and were not loaded/published to the pilot.
- Branch inventory inspected, including the merged 06–09 branch and older training branches. Open PR inventory contained #52, #42, and #33, all WHO proposal/deck work. No open training PR overlap found at this snapshot. Recheck before integration; unpublished work in another conversation cannot be detected from GitHub.
- This review uses `codex/bhw-reference-1-1-prototype`, created from the latest main SHA above. All changes are additive under `prototypes/bhw-reference-1-1/` and separate `docs/bhw-reference-*` records. Existing 01–09 folders, source transcriptions, shared schema/types, loader/parser, renderer, question bank, and lock mappings remain untouched.
- Local Git clone lacks GitHub credentials. Connected GitHub tools supplied a targeted source snapshot. Local worktree history starts with an explicitly labelled snapshot commit, not the actual upstream history. The remote review branch uses the genuine upstream commit/tree. Do not push the local snapshot root over upstream. Use a normal authenticated clone of the remote branch for subsequent full-app work.

## Course map and subject ownership

One course, three chapters. Chapter I has nine proposed subchapters and 42 proposed short lessons. Later chapters are unavailable. Existing module identities remain fixed. Proposed lesson counts are 6 / 4 / 5 / 5 / 6 / 5 / 4 / 4 / 3. The nine groupings and 42 lessons are instructional design choices, not exact printed manual headings.

`coverage-map.json` in the prototype maps every non-excluded Module 1 concept to actual Read sections and authored slide IDs. There are 20 required concepts; all are taught in both modes. Existing navigation/interstitial exclusions remain excluded. `incoming-map.json` assigns the merged author's existing 06–09 IDs to the proposed 1.6–1.9 lessons without inventing new IDs. These assignments are a reconciliation proposal awaiting review, not converted content.

1.3 retains policy expectations and 1.9 applies a continuing improvement cycle. 1.5 retains partners/teamwork/self-management; 1.6 practices gathering, assessing, recording, and presenting information. 1.1.5 owns the introductory record-purpose distinction; 1.6 expands communication practice. Community mobilization and detailed health-promotion skills remain linked to later common/core competencies.

## Source corrections applied to the prototype

Original Reference Manual PDF 11–12, Facilitator Guide PDF 20, and Day 1 deck PDF 7 were visually inspected; text from R11–12, F19–20, and D5–13 was checked. The original files have 150, 126, and 78 pages respectively per the prior plan's verification. PDF numbering is used, not printed footers.

| Concept group | Corrected source locations |
|---|---|
| Communication competency | D5; F19–20 |
| UHC direction / three-role overview | D7; F20; R11–12 |
| HEPO and prerequisite knowledge | D8; R11; role illustration F20/D7 |
| Health Educator | D9; R11–12 |
| Organizer / participation / planning team | D10; R12 |
| LIPH | R12; no matching dedicated deck slide |
| Provider / first contact / guidance | D11; R12 |
| Initial-service examples | R12; no detailed technique authorized here |
| Monitoring / records / documents | D12; R12; F20 documentation outcome |
| Skills cross-reference | F20 item 7 |
| Facilitator activities | D6 and D13 |

The new teaching text deliberately narrows several inherited claims. “HEPO” is the curriculum's health-promotion description, not a newly asserted universal legal appointment. The three-role illustration is conceptual, not an official reporting hierarchy. The existing text's assertion that RA 7883 expressly lists these three roles is not repeated as a verified legal finding. LIPH is taught as the source's planning link, without promising a particular membership process or funding. Initial-service examples are qualified by training, local policy, and supervision; no treatment or measurement instructions are authored. The observation scenario does not assert that standing water proves a diagnosis or a causal finding.

Official cross-check on 24 September: TESDA's [BHS NC II Revision 01 regulations](https://www.tesda.gov.ph/Downloadables/TRs/TR%20-%20Barangay%20Health%20Services%20NC%20II_as%20of%20June10.pdf), promulgated 11 January 2019, confirm the workplace-communication unit and its information, instruction, and document outcomes (PDF 6–8). A [DOH Region VII BHW congress notice](https://ro7.doh.gov.ph/news-and-advisories/98-press-releases/2557-doh-central-visayas-chd-holds-barangay-health-workers-congress) surfaced the barangay-level HEPO terminology, but its full page could not be fetched. This is not proof of a universal appointment rule or a comprehensive current legal review. No entitlement, benefit, treatment, or local service-availability claims are added.

F19's six hours versus F20's at least three hours is explicitly retained in facilitator notes. Short digital pacing estimates do not replace that allocation or the source's 37-hour total for basic competencies.

## Sections 13–15 carried forward to incoming content

- 1.6: preserve D56/R19 open–closed question pairs and F26 nonverbal/online-source supplementary practice; use F28 and D57 role-play contexts. Keep all `m6.*` IDs.
- 1.7: R20/D62 Five Why's repeats an ambiguous diarrhoea entry; distinguish a possible-cause example from verified causation. Incoming `m7.diarrhoea-example` cites D64, which is the worked prioritization slide, so that citation needs claim-level repair during conversion. R21/D64 scores (16, 17, 19, 15, 12, 10) are contextual, not universal priorities. Include F29's discussion of whether learners agree with the ranking.
- 1.8: hazard source extends through R23, not R21–22 alone. Map sharps, infection, muscular discomfort, stress/workload, and work accidents. Preserve incoming heat/vector extensions as separately sourced authoring, not extra source-table categories. D70–71 is one question/answer pair; D73–75 cover the five groups. Detailed safety instructions still require current review and supervised demonstration.
- 1.9: F19's ninth competency is the anchor; F19 maps both eighth/ninth topics to OSH. There is no standalone deck section. Check sustainability expansions against official TESDA requirements before conversion; coordinate policy boundaries with 1.3.
- Cross-cutting: D23 AO 2015-0053 conflicts with D25's 2015-0083; do not copy the conflicting identifier into new teaching. F26/F27 share three hours for relationships/teamwork. Keep self-management primarily in 1.5 and cross-reference from 1.4. Keep optional local partner/accreditation/benefit panels unconfigured until locally verified.
- Repeated deck navigation pages: 4, 14, 26, 42, 47, 51, 58, 68. Exclude interstitials D41 and D67; appropriate heat/hydration safety content is a separate matter. New ordering 1.2 UHC → 1.3 policy → 1.4 benefits preserves repository grouping rather than claiming the deck's exact sequence.
- Source photos/logos and screenshots are reference-only. A01–A07 are newly authored SVG/HTML sketches with live labels, and carry no agency endorsement or reused patient data.

## Integration gate

Review the six lessons, concept map, source qualifications, text density, and seven visual treatments before broad conversion or contract work. After approval, use additive hierarchy/revisions/progress, preserve all legacy identities and historical achievements, stage content, and test the migration/backfill/RLS against an authorized test environment. No such schema or database work is part of this prototype. Shared production guide examples (four relationships, old topic counts, identical Read/Slides bodies) must be updated in the later contract increment; this folder's README defines only the isolated prototype contract.
