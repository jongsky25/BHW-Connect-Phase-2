# FB-5.1e — practice, browsing and saved lesson completion

Three pilot reports request answering before the next question, finishing playback before another topic, and locking later topics. A read-only check on 26 October 2026 confirms their original paths, no screenshots, and unchanged `new` statuses:

- `4cb70ff9-92d2-4958-b36a-83eddbb518e4`: assessor personal-study HEPO lesson `7ec7a016-ddac-495e-a2df-f7aa135dfa9c`.
- `a5bfc45c-d62e-47b2-9025-6c549fb8714f`: assessor personal-study lesson `24771587-9bd0-4f6c-acb0-ade791a24f45`.
- `04fc9cfc-6fec-4430-bd30-ccae873f8471`: general facilitator subchapter `5a915215-7237-4211-a189-8d75664d05b6`.

## Merit and decision

The need to distinguish browsing from finished study has merit. Current formative reader code already requires the final section and an attempt at every check in the selected Read or Slides view before enabling **Mark lesson complete**. Attempts are scoped to lesson, revision and view; they are not persisted and must be repeated after reload for unfinished lessons. A wrong first attempt counts, while explanatory feedback and retry remain available. **Next lesson** appears only after a successful save or an existing completion. Failure keeps completion unsaved and allows retry.

These are formative UI rules, not server validation of practice answers. The existing completion RPC validates study context/current publication and applicable diagnostic prerequisites, then records self-attested completion; it receives no check answers. This increment does not claim to close a direct-RPC bypass or introduce evidence-based completion. That would require a separate versioned data/assessment design.

Moving through sections, using the heading outline, opening another lesson and viewing a facilitator guide intentionally remain possible. Existing accepted guide access permits preparation and review before qualification (FB-5.1b); formal assessment separately requires authority and readiness. The question report points to a lesson, not a formal test. Existing formal test policy permits question navigation and unknown answers (FB-3.1). No report supplies evidence that mandatory playback or a universal sequential lock improves this pilot. Playback is not demonstrated competence, and alternative accessible Read/Slides paths already exist.

This review therefore addresses completion guidance and retains open navigation. The requested locks are **not implemented** and the reports are not marked resolved. Training owner remains Ray Justin Ventura; the two separately owner-deferred reports remain deferred.

## Visible change

Writable personal lesson readers now expose a separate, keyboard-operable **How to finish and save this lesson** disclosure immediately above Reading tools. It is discoverable while Reading tools is closed, in English and Filipino. It explains selected-view checks, feedback/retry, reload behavior, explicit completion/save confirmation, connection failure/retry, and why opening a topic or finishing media does not complete it. The disclosure starts closed to keep the teaching visible. Read-only facilitator presentations/previews receive no instruction to save personal completion. Formal exam screens do not use this wrapper.

The component has no state, effects, API calls or browser storage; opening it preserves reader identity and answers. Existing reader source, approved content/media, answer rules, resume/completion callbacks, qualification, assessment releases and database remain unchanged.

## Verification

Focused reader/completion/formal-finish tests cover skipped earlier checks, independent Read/Slides attempts, revision/reload isolation, wrong-answer feedback, optional video, save failure/retry and read-only access. Two new wrapper integration cases open bilingual guidance after an attempted answer and verify retained selection, no RPC/refresh, and still-disabled premature completion; read-only exclusion is checked in the existing BHW/assessor persistence case.

The existing actual-ManualLesson Chromium connection-recovery journey additionally opens the disclosure by keyboard in English/light and Filipino/dark at 320px/XL. It checks no extra API call or completion, no overflow, and a clean main-region axe scan before continuing its existing offline resume/completion retry flow. This local HTTP fixture is not an authenticated production walkthrough. Full CI and exact merged production READY/canonical-alias receipts are recorded in the release PR; original live feedback remains open for comments.
