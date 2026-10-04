# Lesson 1.3.1 — Mimi recognizes a company offer

Draft review, 4 October 2026, Asia/Manila. This package is **not release-ready**: `GEMINI_API_KEY` is absent, so the final recordings, narrated videos, measured captions and posters are not available. No owner media approval or policy SME approval is recorded. No deployment, merge or database publication has been performed.

The owner requested execution of the handoff and subsequently renamed the fictional BHW to **Mimi in all 1.3 lessons**. This supersedes the handoff's earlier Corazon naming instruction. Only the protagonist's name changes in sibling lessons; their instructional scope and immutable manifests remain intact. The historical image-generation prompt and old narration manifest retain truthful original wording. New assets remain draft.

## Gap decisions and acceptance

| Area | Baseline | Authored change | Required verification |
| --- | --- | --- | --- |
| Identity | Published key, title, objective, two stable screen IDs | All immutable manifest strings retained; old screens remain first and second | Target-specific metadata and old-revision resume tests pass; no progress writes/backfill |
| Learner content | Two short screens, broad policy wording | Six equivalent bilingual Read screens and slides, plausible two-offer check | Policy scope checked against primary issuances; no SME approval claimed |
| Character | Corazon in 1.3 materials | Mimi throughout authored 1.3 learner/facilitator material and target animation | Continuity regression and module audit; six affected sibling recordings need regeneration |
| Illustration | Shared practice SVG falsely marked approved despite draft provenance | Original unbranded company-offer scene with Mimi; contained art in Read/Slides; practice-map removed from new revision | Exact PNG SHA-256 verified; historical SVG preserved; visual review is draft |
| Read speech | Four existing Gemini/Kore recordings | Shared expressive bilingual story style and default Gemini for all target sections | Twelve recordings still require actual synthesis; no substitution or manifest relabeling |
| Animation | No target story | Six-beat bilingual script, Remotion scenes and measured timing callback, Gemini generator | Both complete language tracks required before composition registration/rendering |
| Facilitation | Generic practical prompts | Fixed twelve-section outline and observable recognition/role-boundary criteria | Online completion stays separate from observed skill |
| Review/release | 1.2.2 historical approval only | Target-specific draft package and draft PR | Finished new media, explicit owner approval and exact-head release gates remain required |

## Six-screen bilingual storyboard

1. `section-1` / `slide-section-1`: **Ang bisita sa BHS / The visitor at the BHS**. Mimi hears an offer of samples, a tarpaulin and a gift; she identifies what is expected and pauses acceptance, display and distribution.
2. `section-2` / `slide-section-2`: **Dalawang paksa ng polisiya / Two policy topics**. Distinguish Milk Code product/facility/inducement rules from pharmaceutical-order scope for prescription products and medical devices.
3. `identify-offer`: **Apat na detalyeng aalamin / Four details to identify**. Product, promotion, place/audience and inducement; prescription samples are not for the public, and the order specifies licensed physicians/dentists.
4. `pause-route`: **Huminto at idulog / Pause and refer**. A short respectful response, facility-supervisor verification and the stated scientific-convention exception; Mimi cannot invent an exception.
5. `independent-information`: **Panatilihing malaya ang impormasyon / Keep information independent**. Approved health information, factual reporting without patient data, no feeding blame and referral of clinical advice to trained professionals.
6. `recognition-check`: **Kilalanin bago magpasya / Recognize before deciding**. Compare infant-formula promotion tied to a gift with an anatomical model for a coordinated scientific activity whose conditions still require verification. Recognize, pause and refer rather than independently approving either offer.

Required concepts `m3.milk-code` and `m3.pharma-ban` are retained. Detailed refusal role-play stays in lesson 1.3.3. The original objective index is zero. See `lesson-131-source-audit.json` for exact primary-source pages, sections, URLs and retrieval limits.

## Media provenance and plan

The original landscape PNG was generated with built-in imagegen on 3 October 2026. The proposed identity is a Filipina around 50 with shoulder-length straight black hair, lavender polo and navy trousers. A respectful generic representative carries a closed blank box and rolled sheet beside a blank gift bag. No brands, legible marketing, patient data or clinical action are shown. Both faces are kept visible. The 4 October name change does not change unnamed pixels. The exact original prompt, generation date, hash, bilingual captions and draft status are in the target `lesson.json`.

Read uses `BHS_PROMOTIONS_STORY_STYLES` for conversational Filipino/Philippine English, a curious visitor, calm Mimi, natural pauses and emphasis on role limits. Style/model/voice and existing pronunciation normalization participate in hashes. No YAKAP wording is needed; the shared exception is unchanged and regression-tested.

The animation's six beats are offer → two policy topics → four details → pause/refer/verify → independent information → practical summary. It uses the repository Remotion pattern with meaningful scene changes and contained art. Actual synthesis must produce measured scene timings; metadata refuses missing or mismatched timings. The component is deliberately **not registered** while required MP3/timing files are absent. No synthetic/fallback timings are presented as recorded media.

## Validation and limitations

- Root TypeScript, root ESLint and Remotion ESLint/TypeScript passed on the Mimi draft. Relevant target/viewer/Gemini/pronunciation tests: **5 suites, 40 tests passed**, using a single worker after an initial concurrent run had worker-start timeouts.
- Content/narration tests: **56 passed, 1 failed**. The unchanged current-narration guard correctly identifies twelve target recordings plus four `bhs-decline` and two `bhs-resources` recordings as stale/missing. Full track/provider details are in `lesson-131-narration-audit.json`. All existing audio bytes are retained.
- Actual scoped Gemini `--apply` failed before writes: **`GEMINI_API_KEY is not set`**. Actual model availability/delivery cannot be verified without its approved configuration. The default and explicit dry runs still request generation; zero-render acceptance has not passed.
- The in-app browser could not open the local fixture. The agent-browser CLI subsequently opened a separate local actual-component fixture on port 3131. It imports the real viewer and authored lesson, with explicit Next navigation/image adapters and stub resume/completion callbacks. This is not an authenticated production session.
- Responsive checks cover all six Read and Slides screens in both languages at 1280×900, 390×844, 844×390 and 768×1024. The first pass found no horizontal overflow. A final screenshot pass follows the scoped contained-image CSS change. Feedback, completion and full-screen evidence is saved with the review package.
- The local default Turbopack build rejected an external `node_modules` junction. The documented Webpack fallback is being checked separately; normal production build and E2E/CI results are not yet claimed.
- New Read playback/highlighting, narrated-story single-player/captions, H.264/AAC streams, measured endings, listening review, both target compositions and final-head Remotion artifacts remain unverified because media are absent. Existing viewer tests verify the shared optional-video behavior with test media, not these target recordings.

## Scope and continuation

Isolated branch `codex/lesson-131-story-gemini`, reconciled with `origin/main` at `f6d0871d`. The shared viewer and narration changes from released 1.2.3 were retained. No narration-manifest edits or historical asset deletions were made. Sibling edits implement the explicit all-1.3 rename; they do not authorize sibling publication.

Restore the approved Gemini configuration locally without putting a key in chat, Git or review files. Generate the target's twelve Read tracks and both story narrations, then regenerate the six affected sibling tracks with their audited actual provider and scope. Inspect scoped cleanup and restore historical media before committing. Register only after required files exist; render language-matched H.264/AAC/VTT/poster assets, integrate a stable draft featured asset, listen and inspect, rerun current-audio/loader/viewer/build/E2E checks and both CI shards on the final reviewed head. Complete the owner-review package before requesting approval. Publish **only `bhs-promotions`**, and only after explicit new-package approval and the handoff's exact-commit deployment/publication gates.
