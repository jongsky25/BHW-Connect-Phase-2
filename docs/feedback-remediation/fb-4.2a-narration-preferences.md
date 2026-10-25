# FB-4.2a — narration preferences and section continuation

Feedback 949d12a3-8385-4a17-a73c-711e44494602 and
078f7189-d414-4cd4-a58c-169fbfff9585 request remembered narration speed;
efc25730-8afc-4464-a2c0-31d0f6c4bec5 asks to retain listening when navigating
to the next slide. Current source confirms both narration players initialize
speed to 1 on every mount and have no continuation preference. This establishes
a current defect without claiming to reproduce the historical reporting session.
Training owner remains Ray Justin Ventura. No replies or pilot status writes.

## Delivered behavior

Both section narration players share a versioned browser-local speed preference,
limited to the existing 0.75, 1, 1.25 and 1.5 choices. The actual media rate and
visible selector are restored on a new section/lesson, format change or reload.
No account or database change. Invalid stored values use 1; restricted storage
falls back to a preference for this visit. Same-document controls and other tabs
respond to speed changes. Selecting speed never starts playback.

Read has a bilingual, native checkbox: “Play next sections automatically”. This
is off by default and applies only after pressing Listen (or enabling it while
playing). Navigating manually within the same lesson then starts the next
available, matching Read recording at the chosen speed. It does not navigate
pages, answer questions or complete a lesson. Pausing stops continuation until
Listen is pressed again. Unchecking disables it. Finishing a clip keeps the
opt-in for the next manually selected section. Leaving a section pauses the old
media so recordings cannot overlap.

Listening intent is held in memory for the current lesson/revision/language and
Read mode. Another lesson, language, Slides, the optional story or a full reload
requires a new Listen action. Slides’ optional full-narration panel still has
manual playback and inherits speed. This is the deliberate scope of the slide
continuation request: authored slide summaries and optional closed panels do not
start hidden full-length audio. The report remains partially addressed for any
future explicit continuous Slides narration design.

Missing or stale recordings remain plain text. Locked self-check narration
remains unavailable until response; revealing the player after responding never
starts it automatically. Browser refusal/media failure stops automatic retries
and keeps the existing readable fallback and error message. All authored source,
recordings, timings, translations, summaries and completion/answer rules remain.

## Verification and release boundary

Component tests cover real media event wiring, persistent speed across both
players, new sections/lessons, invalid/blocked storage, cross-tab changes,
opt-in/default behavior, pause/disable, ended clips, scope changes, stale/locked
recordings and rejected play promises. A new preservation receipt pins exactly
three shared-reader additions and reconstructs its full predecessor; older
receipts remain unchanged. Tests retain all authored training/media bytes.

A disposable-local Supabase browser scenario covers actual audio playback in
English and Filipino, general training and assessor study, speed restoration,
manual next-section continuation, pause, Slides round trips, check gates and
reload. It checks the new control group for mobile overflow and light/dark axe
issues. It refuses pilot database URLs and restores fixture feature flags.
Authenticated production access is unavailable; authenticated browser flows run
in disposable CI. Final CI counts, deployment commit/alias and public smoke
results are recorded in the PR. No migration, content publication or pilot writes.

Offline actual-reader/application-CSS review passed eight combinations of
English/Filipino, light/dark and 320/1280px at XL font. It used actual local
recordings and verified playback, 1.5× on the next section, pause, bounded
controls and zero control-region axe violations. Mobile Filipino/dark and
desktop English/light screenshots were inspected. Framework navigation and
image components were shimmed; this is not authenticated production testing.

CI initially passed 2,436 tests with four historical full-view media/hash checks
timing out at the default five seconds (1.6.3, 1.6.4, 1.8.1 and 1.8.2). The
Vitest default is now twenty seconds to accommodate these synchronous audits on
shared runners. No test source, assertion, hash, receipt, filter or skip changed.

The first disposable browser attempt exposed a test locator error: exact label
matching included the nested select option text, so it waited for a nonexistent
“Speed” label. The same selector failure was reproduced against the actual
offline reader. The fixture now selects the single native combobox inside the
named narration control group, as in the passing offline browser review.
No playback implementation was changed for this test correction.

The full CI trace then verified playback/pause/mode/check steps and exposed a
second fixture assumption: assessor reload may restore Slides. The reload test
now explicitly selects Read, returns to the first section, and checks retained
speed and paused/off continuation without selecting speed again. The trace
confirmed Slides was active; application format/resume behavior is unchanged.
Additional offline actual-reader review passed the complete Read → Slides →
Read → locked check → response → reload flow in both languages.
