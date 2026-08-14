# Chat Guide demo runbook — HHP+ / PhilPEN community NCD screening

A six-minute walkthrough of the live app for the WHO / BLHSD conversation. It
uses the corpus in `content/kb/hhp-ncd`, which covers the six modules of the
proposed BHW training package (BLHSD alignment deck, 31 July 2026) and is loaded
by `npm run kb:load`.

The point of the demo is not that a chatbot answers questions. It is that a
standardised training package has somewhere to live after the contract ends,
that the platform enforces the scope boundary the curriculum draws, and that
content nobody has validated cannot reach a health worker.

## Before you present

1. `npm run kb:check-sources` — every citation shown on screen must resolve.
   `doh.gov.ph` and `foi.gov.ph` answer 403 to datacenter traffic; open those two
   in a browser once, from the presenting machine.
2. `npm run kb:load -- --project <ref> --dry-run` — confirm 0 creates, i.e. the
   corpus is already loaded and nothing is half-applied.
3. Sign in as a BHW in one browser profile and as an admin in another, so you can
   switch without logging out mid-demo.
4. Open `/chat`, `/kb`, and `/admin/dashboard/chat-guide` in tabs.

Have a fallback: if the network is unreliable, `npm run dev` against the same
project renders the identical UI.

## 1 — English (Module 3, ~40 seconds)

> **When should I refer someone after a high blood pressure reading?**

Point at the citation line under the answer. Every published clinical statement
carries a source a reviewer can open: WHO HEARTS, PAHO/WHO on blood pressure
measurement, the WHO phlebotomy guidelines, DOH PhilPEN.

## 2 — Filipino, same question (Module 3, ~30 seconds)

> **Kailan ko dapat i-refer ang may mataas na presyon?**

Same entry, same citation. One knowledge base, two languages, no duplicated
content — because `kb_entries` carries both languages on one row and the matcher
scores against both regardless of the interface language.

## 3 — Hiligaynon and a typo (Module 3/4, ~40 seconds)

> **dako ang butkon, tama pa ba ang cuff size?**

Then:

> **ano ang hypertention**

Iloilo and Guimaras are Hiligaynon-speaking and the schema has no Hiligaynon
column. Ilonggo terms live in each entry's `keywords` and in the `synonyms`
table — `butkon` → `braso arm`, `bulong` → `gamot medicine`, `hilanat` →
`lagnat fever` — so a BHW can ask in the language they actually use, and a
misspelling still lands. This is data, not a code change.

## 4 — The scope boundary (Module 1, ~50 seconds)

> **What dose of metformin should I give for a blood sugar of 250?**

The answer is *"that is the physician's decision"* — not a guess about
hypoglycemia. Module 1's whole purpose is the line between screening and
diagnosis, and the platform holds that line: `src/lib/chat/ncd-matcher.test.ts`
asserts that a dosing or diagnostic question can only ever be answered by a
scope-boundary entry, never by a screening-technique one. Try the same with
*"Can I start amlodipine 5mg?"* or *"How do I interpret this ECG?"*.

This is the answer to the question a clinician in the room is already forming.

## 5 — The gap closing itself (~90 seconds)

> **Ano ang schedule ng bakuna ng bagong panganak?**

No answer — the corpus is NCD, not immunisation. The BHW gets a graceful
"walang sagot pa" rather than a confident wrong one, and the question is logged.

Switch to the admin tab:

1. `/admin/dashboard/chat-guide` — the question is in the unanswered queue.
2. Click through to `/admin/kb/entries/new?fromUnmatched=<id>` — the queue hands
   the gap straight to the authoring form.
3. Write a short answer, set an owner, publish.
4. Back in the BHW tab, ask the same question again. It now answers, and
   `rpc_kb_entry_create` has already marked the gap resolved and written the
   audit rows.

Say what this means for the APW: Output 5's scale-up recommendations do not have
to be guesswork. The gap queue is a live record of what BHWs could not answer,
per barangay, which is exactly the evidence base for what the next revision of
the training package should cover.

## 6 — Governance (~90 seconds)

Three things, in the admin console:

- **Nothing unvalidated reaches a BHW.** Filter `/admin/kb/entries` to drafts.
  Eight entries are held there — community blood-glucose cut-offs, the repeat-
  measurement interval, the waist-circumference thresholds — every one carrying
  *"Pending BLHSD–WHO technical validation"*. They are invisible at `/kb` and in
  the Chat Guide. They are unpublished because the figure they need can only come
  from the PhilPEN 2025 protocol, and that is Output 3.1 of the proposed APW.
  There is a queue in the product waiting for that technical review.
- **Nothing is published anonymously.** Try to publish a draft with no owner:
  the database refuses (`kb_entries_publish_requires_owner`). Every entry has a
  named owner and a review-due date; the dashboard counts stale content; the bulk
  assign action clears a batch of drafts in one step.
- **Everything is on the record.** The audit view shows the entries you just
  created and published, in plain language, with who did it and when — including
  the ones the loader wrote, because the loader signs in as an admin and calls
  the same RPCs rather than writing to the database behind the app's back.

## Closing line

Every module in the deck exists in the app right now as searchable, cited,
bilingual content — 130-odd Q&A entries and six long-form references across the
seven competency domains. What is missing is not engineering. It is the
technical validation, the LGU authorisation, and the BHWs in the field. That is
what the APW buys.

## If someone asks

- **"Is this AI?"** No. It is deterministic keyword, synonym and fuzzy-string
  matching over the knowledge base — no model, no API cost, no patient data
  leaving the system. Answers are written by admins, not generated.
- **"Who wrote the clinical content?"** It was drafted from public WHO and DOH
  sources, each entry citing its own, and it is explicitly pending BLHSD and WHO
  technical review before field use. The pending tier exists for exactly this.
- **"What if you got a number wrong?"** An admin edits the entry and it is
  corrected everywhere at once, with the change audited. Every entry also has a
  review-due date so nothing silently ages.
- **"Can this be turned off?"** `npm run kb:unpublish -- --project <ref>
  --category "hhp-*"` returns the whole corpus to draft in one command.
