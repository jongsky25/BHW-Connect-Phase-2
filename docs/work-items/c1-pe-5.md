# C1-PE-5 — connection recovery and assessor practice

Owner/release coordinator: current Codex session; no parallel batch.
Branch: `feat/c1-pe-5-connection-practice`; base main `0f8e94ea` (PR #519).
Updated: 21 November 2026. Final CI/deployment receipts belong in this increment's
PR description. No database, content-loader, flag or assessment-policy changes.

## Confirmed gaps and changes

Regression tests reproduced two simulation problems before the fix:
1. Unsaved evidence did not prevent ordinary reload/close or warn on links leaving
   the page. Three new cases failed against the baseline.
2. Unchecking/rechecking the same fact changed array order and falsely marked the
   original saved fact set unsaved. One additional regression failed.

The runner now registers a native beforeunload warning while edits, a pending
request, or an unconfirmed status exist. Normal same-tab link navigation offers a
localized stay/leave confirmation; in-page anchors and new-tab/modified links do
not unnecessarily warn. Confirmed matching state releases protection. Fact-set
comparison ignores selection order. Nothing is silently saved to browser storage.
Status recovery continues to preserve local note edits.

Four read-only guided exercises live in the existing workspace preparation section:
lesson/manual navigation, fictional simulation saves and recovery, eligible own
post-test review, and a fictional monitoring example with an expected interpretation.
Opening the guide creates no learner record or completion evidence. Links preserve
existing authorization/eligibility; no retake or real BHW edit is needed to practice.

## Connection evidence and limits

| Condition | Verification / expected result |
| --- | --- |
| 1.8-second assessment save | Existing local HTTP browser fixture blocks premature navigation and confirms Saved only after receipt |
| Assessment save rejected offline, then reconnect | Unsaved response stays on the page; explicit retry restores saved response after reload |
| Assessment save committed, response lost | Existing mutation receipt/status recovery; no duplicate save |
| Assessment submission committed, response and confirmation lost | Reconnect/retry recovers submitted result with one final submission in the local HTTP fixture |
| Slow lesson state load | Loading UI remains visible until the existing fixture returns state |
| Loaded lesson navigation/completion offline | Readable loaded text; failed resume/completion is explicit; reconnect/retry succeeds |
| Already-expanded manual reference offline | Actual reference remains readable in the browser fixture; this does not prove cold offline availability |
| Unsaved simulation note, attempt to leave | Browser fixture cancels link departure, preserves the note and checks native unload protection; unit tests release it only after confirmation |
| Simulation request rejected before receipt | Disposable Supabase E2E verifies stored state is unchanged and local evidence retained |
| Simulation evidence committed, response lost | Disposable Supabase E2E verifies one revision increment, Check saved status recovers it, and confirmed note survives reload |
| Cold uncached route with offline PWA enabled | Disposable E2E waits for service-worker control, goes offline, requests an uncached route, verifies the offline fallback and reconnect/retry |

The existing HTTP fixture passed all 10 interrupted/slow cases (five per language).
New focused unit tests passed: 32 across recovery, simulation, guide and workspace.
The simulation guard and guide passed at 320px / 200% text in both languages and
light/dark themes, with WCAG A/AA checks. Required CI must verify the actual local
Supabase and PWA cases before release. No fault injection is run against the pilot.

Limits: there is no offline write queue or full-offline guarantee. Loaded text can
remain available; new pages/media need connectivity unless already cached. The PWA
fallback test applies only when its existing flag is enabled; no live flag is changed.
Native beforeunload prompts depend on browser support and prior interaction. Mobile
OS termination, browser crashes and forced closure may bypass them. Browser-history
SPA navigation is not universally intercepted; keep the page open until a save is
confirmed. Unsaved notes are intentionally not promised to survive app closure.
A laboratory test does not establish usability on representative participants'
phones or all network conditions. Signed-in pilot review remains unverified.

## Delivery, review and recovery

Application-only release through one PR/main deployment; no pilot mutation required.
Prior production: main `0f8e94ea`, deployment `dpl_4b9frLZsyswKM2pybHJwkTtBof9t`.
Rollback by reverting this app increment; saved records require no restoration.

Review:
https://bhw-connect-phase-2.vercel.app/training/8dfe8b88-84ce-4e60-a353-93031eceda59/assessor/workspace
Expand Guided practice in My preparation. Use only fictional information in the
simulation and existing eligible own results for review; do not alter real BHW data.

Next: C1-PE-6 Chapter 1 review and expansion gate. Representative signed-in phone
review and the unresolved C1-PE-3 retake/pretest-disclosure policy remain outstanding;
this increment does not approve expansion, new retakes, or certification changes.
