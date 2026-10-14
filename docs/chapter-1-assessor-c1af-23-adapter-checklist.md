# C1AF-23 — Chapter compatibility and Chapter 3 adapter checklist

## Current boundary

Chapter 2 keeps its existing `assessor_chapter_qualifications` receipt. The reviewed overall rule may name that receipt as a `legacy` source only when its curriculum, rubric and orientation versions match exactly. It does not convert the receipt into a combined Chapter 1 award. Chapter 2 suspension or revocation affects its own qualification and any overall award that cites it; Chapter 1 permission remains governed by Chapter 1's own gates.

Chapter 3 has no approved assessor exam or orientation requirements today. Its staff path must show unavailable even if learner content is published. The overall award still requires three compatible chapters. A local fixture in `e2e/fixtures/c1af23-real-schema.sql` demonstrates how the generic legacy adapter opens after chapter-specific definitions are installed; those fixture definitions are rolled back.

## Review before a future Chapter 3 activation

1. **Onboarding and publication:** review Chapter 3 learner lessons, lesson keys and published revisions; publish the chapter course and set the program chapter available only after the approved material and staff path are ready. Confirm catchment and active account checks still apply.
2. **Exam adapter:** add a Chapter 3 `assessor_private.exam_requirements` row with its own curriculum version, required lesson keys, question bank, minimum count and pass threshold. Test pretest, study, posttest, missing content and retake behavior against Chapter 3 IDs.
3. **Rubric review:** map Chapter 3 indicators to approved evidence anchors and safety stops. Review the scoring orientation guide, cases, correct answers and passing count. Add a Chapter 3 `assessor_private.orientation_units` row with its own orientation version; do not reuse Chapter 2 cases as production content.
4. **Certification:** exercise passing orientation, automatic legacy qualification issuance, explicit recovery, duplicate prevention and status mutation on the real schema. Record the approved Chapter 3 curriculum, rubric and orientation versions in a reviewed overall rule. Check that a mismatched or suspended record cannot count.
5. **Overall award and output:** test the 0/1/2/3 chapter matrix, exact version matching, pinned source IDs, concurrent final completion, recovery, chapter status propagation and explicit overall lifecycle. Review issuer display text and public disclosure controls separately before enabling them.
6. **Release:** keep Chapter 1 cohort, write, award and simulation gates separate. Rehearse migrations on a disposable database, then follow `docs/deploy-runbook.md` for pilot health, migration and smoke checks. Obtain the content, rubric and release reviews required by the facilitator flow plan before enabling Chapter 3 in a live program.

The Chapter 3 activation should change chapter-specific data and reviewed configuration. The overall award's three-source rule and Chapter 1 issuer should need no rewrite; any failure of that expectation belongs in the activation review.
