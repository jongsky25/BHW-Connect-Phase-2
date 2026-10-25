# FB-5.2b — personal chat history and published-question discovery

Feedback `b2d2e59e-53b0-46e8-850e-4f3217042a1f`, reported at `/chat`:

> include a history bank for my previous questions or for frequently asked questions

## Merit and existing behavior

Read-only pilot audit on 25 October 2026 found 1,599 saved sessions and 3,020 messages. The existing `/api/chat` stores user/system turns, but `ChatGuide` kept its visible transcript and current session ID only in component memory. Leaving/reloading the page lost access to that transcript even though records remained in the database. There was no user history endpoint or reopening UI. This is a confirmed retrieval/discoverability gap, not evidence that all historical saves succeeded.

The FAQ portion was reviewed separately. `/kb` already groups published questions by topic, and `/kb/[slug]` expands bilingual answers with published/visibility filters. The live pilot has 222 visible published question entries across 11 categories. Add a direct **Browse published questions** link beside history instead of duplicating this library or inventing popularity rankings. This does not claim all 222 questions are frequently asked.

## Shipped increment

- **My chat history / Mga nakaraan kong usapan** appears directly above the current conversation. Expanding fetches fresh personal records; opening an archive does not send a question or replace the current chat/input.
- Latest sessions first, first saved question as preview, localized last-activity date; pages of 20 sessions, one embedded user preview per session. Stored transcript reads oldest first in pages of 50 messages. Empty sessions and unavailable reads have explicit states; retries preserve already loaded rows.
- Archive is read only. It shows the exact saved system text, not an answer regenerated from current KB content. Existing stored answers/clarifier prompts are English; the bilingual interface says so. Internal no-answer/suggestion markers are explained, not displayed as answers. Old option buttons are not replayed. BP/BMI measurement placeholders remain placeholders; no patient numbers are reconstructed or newly persisted.
- Archived guidance may no longer apply; the interface states this. Existing 24-month chat retention is unchanged, so this is access to remaining saved records, not a permanent or complete archive.
- Opening/closing history leaves live exchanges and unsent text intact. Closing releases fetched archive records from component state. Role preview disables personal history rather than exposing the reviewing admin's archive as the previewed role's data.
- New GET `/api/chat/history` uses the existing authenticated Supabase server client and RLS. Explicit `user_id = authenticated app user.id` applies to both list and session ownership lookup, including admins with broader operational RLS. Foreign/missing sessions both return 404 before message reads. Active-account check, validated UUID/page, bounded response pages, stable timestamp/ID ordering, private/no-store responses, and fetch no-store. No service-role credentials, schema/policy changes, writes, browser transcript storage, or SW changes.
- Added `min-w-0` to the existing question input after checking the new surface at 320px/XL text; no chat matching, measurement handling, conversation flags, content, or assessment changes.

Offset pages are refreshed when history is reopened. If another device adds/reorders sessions during paging, reopening refreshes the list; duplicate IDs are suppressed in the current view. History is online-only; `/api/` is already excluded from the service-worker cache. Restoring the current draft conversation across reload is outside this read-only archive increment.

## Verification

- 19 focused API/component checks: anonymous/deactivated access, invalid page/UUID, explicit admin ownership, foreign-session rejection before message query, exact stored-text reads, pagination bounds, sanitized failure response, bilingual open/close/reload, failed-page retry retaining rows, stale-response suppression, preview disablement, and measurement/internal-marker presentation.
- `scripts/chat-history-browser.mjs`: actual ChatGuide/ChatHistory and application CSS with loopback HTTP fixture, 8 cases across English/Filipino and light/dark at 320px/XL. Verifies 21-session/52-message paging, long unbroken previews, retry, current exchanges/input preservation, measurement markers, reload/reopen without extra POSTs, empty state, no horizontal overflow, four clean axe scans and no page errors. This fixture does not exercise authentication or real database isolation.
- `e2e/chat-history.spec.ts`: disposable localhost Supabase only, guarded before sign-in/writes. Sends a real chat question, reloads and opens its stored transcript, compares exact records before/after reads, proves both another BHW and an admin cannot use this personal endpoint to access it, and exercises real embedded preview and 20/50-row pagination. Temporary pagination rows and test conversation are removed. CI provides the disposable stack; no authenticated production chat was sent.
- Full CI and exact merged production deployment receipts are recorded in the release PR. Public production smoke tests cannot substitute for authenticated E2E, so live checks make no authenticated-interaction claim.

Pilot feedback remains `new` and unchanged. Repository disposition is `partial_fix_pending_live_review`; users can comment on the visible archive/library access in the pilot. Training owner remains Ray Justin Ventura.
