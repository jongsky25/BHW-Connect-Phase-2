# C1AF-25 Chapter 1 policy decision package

**Status:** proposed for the program owner's review. This PR packages the exact
current authored bilingual lesson anchors in
[the machine-readable proposal](chapter-1-assessor-c1af-25-policy-proposal.json).
It is not a live approval record and cannot activate Chapter 1. No lesson,
rubric, database, feature flag, cohort, certificate, or runtime flow changes
in this PR.

## Decisions proposed for review

| Area | Proposed decision |
| --- | --- |
| Scope | One requirements version, `chapter-1:c1af25.pilot-1`, and rubric version, `chapter-1:c1af25.rubric-1`, for all nine Chapter 1 components. Use the 42 current lesson-specific criteria and their exact Filipino/English observable, not-yet and three rating anchors in the JSON proposal. Each lesson criterion is required for its own component. |
| Evidence | A complete component needs fresh **formal** sufficient evidence rated `kaya_na` on every required criterion. Unseen or insufficient evidence stays unrated; an observed `hindi_pa` or `kailangan_practice` gets feedback and a fresh reassessment. Do not average over a missing criterion. Practice records and legacy module ratings are context, never automatic formal passes. |
| BHW tests | Require submitted pretest and posttest attempts from a current validated Chapter 1 learner test release for each component. The existing readiness contract checks submission, not a passing score; no new component score threshold is proposed. Review this distinction explicitly. |
| Historical BHW evidence | Preserve old observations and assessments under their original identity and version. Do not convert them into the 42 revised formal criteria. |
| Staff Chapter 1 award | Keep current study of 42 published lessons, submitted pretest, passed posttest at 80%, six orientation lessons, 7/8 orientation cases including the mandatory safety case, and a server-validated 11-checkpoint Maria simulation. A new briefing and simulation receipt must name the approved requirements version. An existing legacy qualification may be linked only by explicit recovery after all unchanged current evidence is rechecked; no mass conversion or automatic award from historical status. |
| Issuer | The owner supplied `DOH`, `Ray Justin Ventura`, and `Chief Health Program Officer` for the forthcoming contract. Keep the proposal's `issuer_snapshot` null until a separate release package installs and reviews that exact snapshot. No government seal or accreditation claim is inferred. |

The draft lesson-to-legacy links in the JSON remain marked
`supports_partial_component_evidence`. A lesson's local `objective_index` is
never an authority to reuse a module rating. The proposal gives each current
lesson criterion a stable ID and proposed version `1`; its source SHA-256
fingerprint pins the exact text for review. At release, reconcile every
source with its published lesson revision before installing registry rows.

### Specific conflicts

- **1.3 refusal:** retain the current single combined `bhs-decline` criterion.
  `Kaya na` requires respectful clear refusal, the correct policy reason and
  firm boundary without a workaround, plus factual handover to the confirmed
  supervisor without patient data, all observed without prompting. The task
  does not satisfy the separate module policy-recall criterion. A permitted
  alternative may be mentioned only if the applicable policy allows it.
  Separate scoring of the three actions would require new IDs, anchors and a
  combination rule in another version.
- **1.6.2 clarification:** require the full current sequence independently:
  open invitation, neutral clarification, room for correction, and confirmation
  of the corrected summary. It contributes partial evidence to older listening
  guidance but is not equivalent to the legacy listening rating.
- **1.8 safety:** use an observed safe dummy demonstration against the current
  local critical-step checklist, never real used sharps. A written control
  selection is insufficient. The shared [English](lesson-184-practice-kit.en.md)
  and [Filipino](lesson-184-practice-kit.fil.md) setup cards keep contact fields
  blank. For each LGU and assessment session, the assessor and authorized local
  clinical trainer confirm the checklist, primary reporting contact, backup,
  and immediate qualified evaluation route before physical demonstration. An
  unconfirmed field pauses physical demonstration and remains not observed;
  paper reporting rehearsal cannot pass the demonstration criterion.

The nine component review notes in the earlier
[mapping audit](chapter-1-assessor-mapping-audit.md) remain part of this
decision. In particular, role demonstration does not prove all three roles,
fictional RA 7883 scenarios do not prove personal accreditation, and a single
resource-saving idea does not prove the entire 1.9 component. The exact
proposed lesson criteria in the JSON must be reviewed for those implications.

## Source and approval boundary

`scripts/c1af25-policy-proposal.mjs` recomputes the package from the current
authored files; `--check` fails when the saved proposal is stale. The older
`chapter-1-assessor-audit.json` is a dated 10 October snapshot. Ten Chapter
1.9 lesson/guide/manifest files changed afterward, so this package uses a
fresh in-memory audit and current source hashes. It does not rewrite that old
snapshot or regenerate approved curriculum pins.

To approve this proposal, review the complete bilingual anchors and nine
component membership lists in the JSON, then either request exact edits or
approve this PR with a recorded decision for the test-phase meaning, the
1.3/1.6.2/1.8 proposals, historical evidence reuse, and the real issuer
organization/signatory/title. That GitHub review can become the nonblank
reference for the separate requirements, mapping, evidence, orientation,
simulation, issuer and award approval fields. A broad “approved” response
without those exact contents would leave the database registry empty.

## Owner clarification after proposal merge

On 15 October 2026, the owner supplied the issuer values above, approved the
existing Chapter 1.8 dummy demonstration checklist, and directed that the
shared template leave reporting contacts blank because LGUs differ. Each
assessor uses the verified local context for that LGU and session. This is a
review instruction for the next implementation package; it does not assert
that a local clinical trainer has approved a particular LGU's procedure or
that any real reporting contact or evaluation route has been confirmed.

## Implementation handoff after policy review

An activation implementation PR must verify the approved source and published
lesson revisions; install the versioned award contract, 42 reviewed practice
criteria and nine component requirement records; update the briefing and
simulation version binding; rehearse the full migration chain and old-record
transition locally; and obtain the uncoached assessor walkthrough receipt and
named limited assessor/BHW cohort. It must keep production write/award and
authority cutover controls closed until a separate reviewed release step.
The two currently pending legacy BHW assessments are proposed to finish on
the existing path outside that first cohort; recheck their live status before
cutover. If a pilot fails after cutover, close new writes and retain recorded
evidence and read access rather than reopening unqualified legacy writes.

## Verification

Run `node scripts/c1af25-policy-proposal.mjs --check`,
`node scripts/chapter1-assessor-audit.mjs --summary`, `npm run assessor:check`,
the focused policy-proposal test, and normal PR CI. The existing source audit
reports activation blockers as expected. This proposal creates no migration
and has no production activation effect.
