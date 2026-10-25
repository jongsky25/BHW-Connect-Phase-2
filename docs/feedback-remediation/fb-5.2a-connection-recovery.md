# FB-5.2a — interrupted connections and recovery

The owner directed verification of slow/interrupted lesson loading, assessment
saving, retries and retained answers/position, then fixes, testing and publication.
Training owner remains Ray Justin Ventura. No pilot write tests, feedback replies,
status changes or user notifications.

## Feedback review and current scope

| Report | Review and disposition |
| --- | --- |
| `a1ba1b07-4322-4a66-9537-e3ac8555c6c2` | Internet access and competing duties. Earlier saved-draft/pacing guidance helps scheduling. This slice verifies network recovery and makes connection/save state clearer. |
| `351940cb-bd61-4185-8e12-9dfbcd75e17d` | Asks for an offline version. Pilot offline_pwa is already enabled, alongside the shared Chapter 1 flags. Existing service worker caches visited same-origin document/static GETs; it does not queue writes or guarantee new pages, media or full assessment access offline. This slice does not claim a complete offline manual or offline assessment submission. |
| `efdf3000-7998-4cd2-8d76-4258c175131b` | Suggests a Deepstash-like reading format. Separate UX suggestion, not a connection failure. |
| `b2d2e59e-53b0-46e8-850e-4f3217042a1f` | Chat question history/FAQ request. Separate chat feature review, not part of training connection recovery. |

The owner explicitly declined the too-many-lessons report
`b7900504-80c4-48a6-943d-0e3beee64f7a`: mark its repository disposition won't fix
and do not reduce lessons for it. The original live feedback record stays intact.

## Reproduced gap and fixes

A Chapter 1 submission can fail, then its confirmation request can reject too.
The old catch branch awaited this second request without guarding its rejection.
Two baseline component cases reproduce an unhandled rejection and missing retry
feedback in English/Filipino. A separate failure path retried history loading even
after receiving a confirmed submitted record, allowing another history error to
escape or obscure the distinction between confirmation and history refresh.
These are component-level failure conditions; no historical pilot incident is
claimed to have been reconstructed.

Confirmation rejection now produces an explicit unconfirmed-result message and
re-enables retry. It says saved responses remain, without asserting that a draft
still exists: the server may already have committed submission. A received
submitted record remains authoritative when only the secondary history refresh
fails. A non-submitted get response cannot display a confirmed result. Existing
server idempotency returns an already-submitted attempt instead of grading again.
No grading/RPC/schema change, new mutation queue or automatic submission.

While an answer save is in flight, status now says Saving rather than only
Unsaved. Existing disabling, pending selection, leave guards, response counts
and stable save mutation receipts remain intact. Loaded lesson reader retries
already recover the current position; completion errors already avoid claiming
success. Real interrupted-HTTP checks verify these paths without editing the
historically preserved shared reader.

Loaded ManualLesson and shared Chapter 1 assessment screens now show advisory
connection guidance only while the browser reports offline or just returns
online. They explain keeping the page open, retrying failed saves and waiting
for server confirmation. Previously loaded lesson text may remain readable;
new content/media can still need the network. Read-only preview does not imply
that it writes progress. A restored browser connection is described as tentative;
it does not establish that the server is reachable or that a save succeeded.
Dismissing the notice cannot clear an unsaved answer or its error.

The training route has a bilingual accessible loading fallback for slow route
loads. It adds no countdown, artificial progress percentage or offline promise.
Notices do not initiate RPCs, auto-replay changes, remount the reader or add
persistent answer storage. Current cached reading and sign-out behavior stay
unchanged. Legacy exam draft persistence remains separately scoped; this slice
addresses the shared Chapter 1 assessment reported in the current pilot.

## Verification and release boundary

Eight new component cases cover rejected/returned-error submission and confirmation
in both languages, retry with all responses retained, confirmed-result/history
failure, and a committed submission whose response was lost. The two rejecting
baseline cases fail before the fix and pass afterward. The focused six-file
suite passes 52 cases, including original lesson retries and assessment guards.

The new browser regression uses the actual ManualLesson, Chapter1Assessment,
connection notice and loading fallback with application CSS, through real HTTP
to a disposable in-memory localhost endpoint. It has no Supabase key, database
connection or pilot operation. Its ten English/Filipino cases at 320px XL cover:

- A delayed answer save, visible pending choice/Saving state, and disabled Next.
- Browser offline mode rejecting a save, retained selection, blocked leaving,
  restored notice/dismissal retaining the error, explicit retry and reload resume.
- Server-committed save with its HTTP response aborted; retry reuses the mutation
  ID and creates one save receipt.
- Committed submission with both response and confirmation aborted; the UI states
  uncertainty and a retry reconciles the single existing submission.
- Delayed lesson data with loading feedback, loaded text readable during outage,
  failed position save, explicit recovery and reload at the saved position;
  failed completion never claims success and retry records completion once.

The local server models existing receipt/idempotency behavior; existing CI's
real disposable-database tests remain the authority for SQL authorization and
scoring. Two complete lesson/notice main-region axe scans have zero WCAG2A/AA
violations and no horizontal overflow. Screenshots of offline/restored messages
and loading feedback in mobile English/light and Filipino/dark were inspected.
Framework navigation/image components are shims. No real media caching or full
offline cold-start availability is claimed.

Final full CI, merge, exact production readiness/alias and public smoke are
recorded in the release PR. Authenticated pilot interaction is unavailable.
Keep connectivity/offline requests open for live comments and remaining scope.
