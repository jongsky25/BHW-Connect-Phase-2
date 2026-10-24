# FB-2.4 — reviewed gift/conflict and lactation questions

The owner directed publication with “do it” after the prepared FB-2.4 packet
and publication step were described. This is owner content/publication approval,
with an assisted bilingual, policy and assessment review. Independent clinical,
legal or language-specialist sign-off is not claimed.

The exact reviewed packet is the proposal and REVIEW.md at commit
`d8042e63fe264d73d83824c8a02a46d09dc948c4`. Its proposal SHA-256 is
`3096743d446b98da2d417b22f221485b0f703a388a4383206f89ab33bff03579`.
The draft files remain intact as historical review evidence; approval is recorded
separately under `releases/chapter1-feedback-gifts-lactation-v4/`.

## Source and copy review

- [EO 51](https://lawphil.net/executive/execord/eo1986/eo_51_1986.html),
  sections 6(b), 7(b–c), 8(c–d), was retrieved and read on 24 October 2026.
  Section 8(c) directly addresses financial/material inducements offered by
  manufacturers/distributors to promote covered products. Both T08 scenarios
  explicitly tie a gift or phone load to infant-formula promotion in a health
  station. They do not teach that every gift in every setting is prohibited,
  expand the claim to pharmaceuticals, or turn professional-evaluation/research
  exceptions into permission for promotional offers.
- [RA 10028](https://lawphil.net/statutes/repacts/ra2010/ra_10028_2010.html),
  section 3(p) and section 6 adding section 11, was retrieved and read on the
  same date. It defines a private, clean, sanitary, well-ventilated lactation
  area and explicitly excludes toilets. T09 asks for a suitable area outside
  the toilet and verification of the full facilities with the responsible team.
  Privacy/ventilation alone are not claimed as complete compliance. The BHW
  does not certify compliance, authorize construction or commit funds.
- The proposal's NNC link is corroborating guidance from the prior audit;
  this review freshly checked the two statute mirrors, not a fresh NNC page.
  No additional official-page access or specialist review is implied.

English and Filipino stems, options and explanations express the same actor,
offer/location and next action. Each scenario has one supported answer; phone
load is correctly treated as a noncash benefit, and cleanliness or agreement
does not remove the toilet restriction. Options are plausible errors rather
than alternative correct actions. The correct option IDs and their ordering
are exactly those in the approved packet. Rationales stay in submitted feedback,
not in the safe learner-item projection.

## Release and continuity

The release replaces paired T08/T09 items with four new version-2 identities.
The other 56 form items, including approved UHC T05 and CSC T11, all 48 practice
items and all 42 lesson pins are unchanged from CSC v3. No lesson or media
revision is required. Comparability remains unvalidated; do not automatically
compare gains across releases.

The two reports are `78171de2-0082-475b-bb57-ddcbe32f9114` and
`393ef24f-3b97-41bc-b52d-1977ee5ae32c`. Their exact legacy questions retain
stored keys 1 and 0 respectively. This release improves future shared forms;
it does not regrade historical questions or rewrite saved attempts. Feedback
statuses remain in_review; publication alone is not report closure.

`node scripts/feedback-gifts-lactation-publication.mjs` validates the approved
snapshot. `--sql` emits the established guarded transaction without connecting
to any database. It checks the v3 baseline/forms and all live curriculum pins,
imports immutable v4 forms/checkpoints, and switches only new-enrollment
assignment. V3 becomes draft so pinned learners can finish both phases. Tests
cover full rollback on a failed pin, unexpected active-release refusal,
idempotent publication and exact preservation of enrollment/snapshot/score data.

After CI and merge, deliberately execute the approved data transaction, compare
before/after learner/history/config fingerprints, and verify active release and
form hashes. Record the final activation and production receipt in the release
PR. Signed-in learner confirmation requires an existing authorized test account;
never run write-based tests against the pilot.

Rollback, if needed, takes the same publication advisory lock in one transaction,
requires v4 as the current successor, sets v4 to draft then v3 active, and keeps
all immutable forms and enrollment pins. A learner already assigned v4 still
finishes both phases on v4. Do not delete releases or alter results.
