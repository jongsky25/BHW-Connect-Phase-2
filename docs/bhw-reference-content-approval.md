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

# Subchapters 1.2–1.5 publication approval — 24 September 2026

## Authorization

The repository owner asked to publish the corrected lessons for subchapters 1.2–1.5 (modules 02–05) on the pilot. The loader refused: "Promotion requires approved assets".

All 20 lessons carry one shared placeholder diagram, `practice-map` (`/training/bhw-next-draft/process-e56e73f832d7.svg`). The diagram itself is stamped "Draft — para sa pagsusuri". Its caption reads "Draft discussion guide; review required", and its provenance reads "Not owner-approved".

The owner was offered three options:
- remove the image and publish text-only;
- approve the placeholder;
- wait for real diagrams.

The owner explicitly chose **"Approve the placeholder"**, knowing that BHWs will see the "Draft — for review" stamp and caption.

This records that owner approval. It does not invent an independent clinical, legal, translation, visual or accessibility review. The content itself was signed off by the owner under the S7 queue in `docs/content-assessment-2026-09.md` §3.1.

What changed:
- Only the `review_status` of the `practice-map` asset changes, from `draft` to `approved`, in the 20 `lesson.json` files.
- Nothing else changes: asset bytes, path, alt text, caption, provenance, prose, slides and private notes are all as they were.
- The provenance string keeps its historical "Not owner-approved" wording. This dated record supplies the later owner decision.

## Approved lesson revisions

Canonical revision hashes include asset review status. Approval therefore changes each hash even though the teaching copy and the asset bytes are unchanged.

| Lesson key | Reviewed draft hash | Approved revision hash |
|---|---|---|
| uhc-coverage | 206c9c931a004c690891ebe8192671809dd5380d5cbb10ee584b316cd1a0203b | 4c99db4a01800cca403c7425675d34eb18d3ebaa56255ab5895b45dae49642c6 |
| uhc-primary-care | 0dca3c0bf5b36e06afa901f1d1e10ae98bd48c3982ebc152f5f04c38f94a8b58 | 45bfd245f4d77905eac05f632464fd592b8db0bdfe10dde2327daa89fdf81ce5 |
| uhc-local-system | 04e894a4368c2c176b29c30a9afbafa3ed6ae0db7e155f39d1de2f5bbff427f4 | 1f9163a628af2050340184e4e05a9dcc9a10a24f88691101b4653e3e55b5d09a |
| uhc-improvement | ddda30682d070affc92c4d7d9d77c326663e63842b151ac2b7d5ed5d799bab93 | febfd30f9bd2ff80de6b92b4e32c7e8e5f8ad6730f25390992cdc3ffee68460d |
| bhs-promotions | 55ec00998fbc59a8cb4fa2065807c83144f3b0b34c2d2f79d49d0c382e97f1b1 | 5ab5b1156b19510d0c712016654a556cbb74c8c392b98e383fd00ff07099e305 |
| bhs-support-environment | 90b9640fd48ee696ebf8ada01e14bbafdfc242f2122791f4c49d9bba6d4a7f57 | de49c6df322c105691f1a2b4366514fec81d0122b26131f2510a1f6f26ef9ce0 |
| bhs-decline | 1af9a27c20e27f0aaede25a0c26a48986514e8d5ec45349002df29fc5de1ff02 | eb1295f11a44e16cd7036fb603f7a57d0c1d966ce59e3a34afe836092cd4846c |
| bhs-resources | d6070c7d4ca902fbac15cf8a72c926f9d3b745fbb7c72e601b62df276d3b1aa9 | 80dcc8ff44ede895bcec0b6406ce65ac140319a2d2d708f420b91e523bc0a11f |
| bhs-improvement | 3b412370380df363ad1416ad12caf403ddcbe0e03ccdda90e17f3a4849073a5f | 00276de88b78f1a822d3f1fceeb2a28807e623a50e81579e3d66c96b5f3a47ff |
| bhw-legal-role | af2bbbc790f069b355b2b51e009061cffcc2d92c1c00dae2665e4be7837cf8de | 2fd234ee3908f28a81007a85709078245c216b62db8a7562048c0abc5facb499 |
| bhw-benefits | b5dcae0bdad31e5cda8da84144268e10d2e24c4f77957a9180f7d38941f2fdfc | ca265398de8b37eb1f2dab487f38eb8c02e021cf0d17c94c55cf37f8248ee814 |
| bhw-eligibility | f2410dbdbd8e3aabfd96597e17b4bc1528818e8362b93e85cf1cb50fe6accab4 | 3a2be55f35143fa9294a7224ac506c0d5aaff425c52645a8c4805bac57a4b8c5 |
| bhw-accreditation | 1a732dca2fcc10c9bf4c003c65442f9c3d786e223e2d477cb1ebf968a0f36723 | c991799838a61579434e2a052a0476b95bd6931973ec949bedf314e3196987d0 |
| bhw-follow-up | 5f2a07e9abcf7da59d1a1d609f72c982f73db2ddb2fdd786401ae2ff6e154e36 | 17d5d300481cb12648e8d32e142c869079a26793619b03a2dd8c5d1c32a892e1 |
| bhw-relationships | 78d4b21185547570850968c71cb301055ca2fcabf8ee558f77d515251b7ce564 | dcd25066e71783eb51bf0898140dbb8dea33352acc7c6bc858ca0d68de0c627c |
| bhw-barangay-partners | ee7a086ec235cc27c9ccefa393540070922ac4456980a9b8d989f48484a70615 | ba85468858010a4cbd9237d73d7ca2d88ab9a0e929c7f7c3ec1d9d206d857664 |
| bhw-local-partners | 242299bfddbdf2554e1fc36bc01ca8bba1bbc90557e5c181d02f20a23b82bb88 | c1f080c4a8809c6cd1929f257cbfb23f011e12f65e2d466daee4783e28239e78 |
| bhw-teamwork | 440b5c0b06beabd782f8473d38a4c4598b2a0c31c278cbfe940981a11e6f96a9 | 899ea342771d9b5ea11e9ef7fa1adc0086a25514c58b0dd3930660fcb6f4bcca |
| bhw-self-management | e1c147c67d556fd2b45ce8e4e5df18e8ff2420461984b9f35eb4b3862efd4637 | 468d464287c4b6dce9d205931d68ae790d86a7889e236ae4f41bcc8cb4df2b6c |
| bhw-right-contact | f7ddbf6e903adba2de8e44c4015da42a5ce6155b72efed9e7f8d72590e45c148 | bc5cc8c55b809d403bb935a04c30686b05ca66c0c1f34e05cfa93958ce8b1ca5 |

## Approved asset bytes

| Asset | SHA-256 |
|---|---|
| practice-map (`process-e56e73f832d7.svg`) | e56e73f832d719597d2e8462671901c5beb0ed07b6b386724b02be6a7f6bf02a |

## Gate disposition

- **Owner approval of the placeholder visual:** CLOSED for these exact hashes. All 20 lessons now pass the loader's asset-approval condition. This does not relax the general rejection of unapproved assets. Replacing the placeholder with real diagrams remains recommended (`docs/content-assessment-2026-09.md` §4.3), and a replacement stages as a new revision.
- **Authorization for live publication on the pilot:** GRANTED by the owner. Execution and verification are recorded in `docs/content-assessment-2026-09.md` §3.1.
- **Manual screen-reader testing and an independent visual review:** OUTSTANDING.
