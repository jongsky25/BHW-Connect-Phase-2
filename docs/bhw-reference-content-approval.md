# Subchapter 1.1 content approval — 24 September 2026

## Authorization

The repository owner requested “approve content and release the gate” after receiving the six-lesson bilingual review packet, separate facilitator review, seven draft visuals and decision worksheet. When asked to distinguish repository approval from live operations, the owner explicitly selected “Also authorize live publication and deployment.” This records that owner approval; it does not invent an independent clinical, legal, translation or accessibility review.

Approval covers the existing Filipino/English Read and Slides copy, practice checks and feedback, private facilitator notes and competency rubrics, and seven exact static SVG adaptations for subchapter 1.1. Review questions in the packet were disclosed; this change records acceptance of the current version without rewriting those materials.

Base main: 3a43b8ac224b8778d58ce27f7009fc1faecfcd49 (PRs #80, #81 and #82 merged). All 51 local content/parser/loader files checked against GitHub blob hashes before editing. Asset bytes, paths, alt text, captions, prose and private notes are unchanged. Only asset review_status values change from draft to approved. Existing provenance strings retain the historical “visual review required” wording; this dated record supplies the subsequent owner decision.

## Approved lesson revisions

Canonical revision hashes include asset review status, so approval changes each canonical hash even though teaching copy and asset bytes are unchanged.

| Lesson key | Reviewed draft hash | Approved revision hash |
|---|---|---|
| bhw-roles-hepo | 8b7bb2b6ee77b19f0da425d5be121fb1e3cfa15debbf34ed0e6e6dedead487d7 | 6521acd2d3c5ecf6447df3373e551957746bae059e4b1eda66a8597a78a9d1d3 |
| bhw-health-educator | ab7bf93b59ee8f29085ecb530ebf77b97dcf83203bac7469f05551f755ba2689 | 2312be2a5d101fdc92808719bb142674c662429533e81f60102d85e6cc4e92dd |
| bhw-community-organizer | d6799dac2e932c11f6b7013ec3fd2e891e9fe202fe5d6efde3287c434bb71bd5 | 4867eb88b5cffdf0e1ad93daed1954a07c27b159c638376c20ddfe2e0aeff402 |
| bhw-service-provider | fd0f9fa87fc19bdde21c382fb268759c6875dc162b28403c502b49221794bb75 | a9da0c9f99adb972458bbfc1ebac57b36e065d9e32a20da7053ab69562441593 |
| bhw-records | 3aa8918f21c6d2a1cec2e15b7ccbd21663499c3306219cceb45d48ecc34dd9fa | 0d8c95312832ad728d1b8ec83c098b645452aa20ba999cffcf4a284407dc9db4 |
| bhw-roles-application | b00869d82a8911bf44b462c35a5ab3f1f78a5dbe83b41f57e1cf5399dbc20981 | 4cdf714d470a1dfe076fb2264120018232a6595530222bfebe64e443ac32ab80 |

## Approved asset bytes

| Asset | SHA-256 |
|---|---|
| A01 | 83aeca62b560e3cc3ad49b97cd921461deb996b174d315b7bc269dc9b027493e |
| A02 | 736187dad098070d806d873a90f59cf871b3d03c02b52bb3001692d1ecb7ecb8 |
| A03 | ed47f1a56c671de7f5f1a795c5c0539fb1683960ca3026567cc4c5e6440dc60e |
| A04 | b4c8ec2f14110700a21b0ead42866f5ae29ed818936673af8f26880cc00a8723 |
| A05 | e058d004a5e503ea9821b772a3c55148b3585f76c6e9aeaed6362fc61af4bf1c |
| A06 | 5b37233368b572819d45bc852803a0dd16f444cb8a77e326fc387693d02c47f9 |
| A07 | 8e889f00c7b01707b03caefefabb7070f60d79fcde64c067f7ee7ff7ad242e9d |

## Gate disposition

- Content/visual owner approval: CLOSED for these exact hashes. All six lessons now pass the loader asset-approval condition. This does not relax the general rejection of unapproved assets.
- Authorization for live publication and deployment: GRANTED by the owner. Execution and verification must be recorded separately.
- Matching-platform Supabase/Auth rehearsal: OUTSTANDING; fixture-authenticated PostgreSQL/PostgREST results remain prior evidence only.
- Manual screen-reader testing: OUTSTANDING; automated axe and keyboard checks do not establish this result.
- Target mapping, migration state, staged/publication state, preservation/equivalence and activation: verify against the actual authorized target before writing. Approval does not automatically backfill historical work or replace assessments.
- Parts 1.2–1.5 and 1.6–1.9 are outside this content approval. Chapters II–III remain unavailable; Chapter I assessment/certificate scope is unchanged.

No technical test is marked passed by owner authorization. Do not describe the whole release as fully validated while the remaining evidence is missing.
