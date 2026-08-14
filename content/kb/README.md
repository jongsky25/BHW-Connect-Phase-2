# Knowledge Base content

Versioned source of truth for KB content that is loaded into a Supabase project
by `scripts/kb-load.mjs`. Editing a file here and re-running the loader is the
supported way to change loaded content — the loader always rebuilds each row
from these files, so the database never becomes the master copy.

## `hhp-ncd/` — HHP+ / PhilPEN community NCD screening

Covers the six-module, seven-competency-domain BHW training package proposed in
the BLHSD alignment deck of 31 July 2026 (Healthy Hearts Plus, Western Visayas):

| Module | Category slug | Topic |
|---|---|---|
| 1 | `hhp-m1-care-pathway` | HHP+/PhilPEN, screening vs diagnosis, BHW scope, referral pathway |
| 2 | `hhp-m2-risk-assessment-flipchart` | Risk assessment and the NCD Flipchart |
| 3 | `hhp-m3-blood-pressure` | Standardised blood pressure measurement |
| 4 | `hhp-m4-blood-glucose` | Capillary blood glucose testing and infection prevention |
| 5 | `hhp-m5-communication-referral` | Explaining results, motivational interviewing, referral |
| 6 | `hhp-m6-documentation-cascade` | Registers, reporting, peer cascade |

```
hhp-ncd/
  sources.json        citation registry — id → {label_en, label_fil, publisher, year, url}
  categories.json     the six module categories + the seven competency domains
  entries/module-N.json   bilingual Q&A entries
  articles/index.json + module-N.{en,fil}.md   long-form references
  synonyms.json       Taglish, Hiligaynon and misspelling expansions for the matcher
  locks/<ref>.json    content id → row uuid, per Supabase project (written by the loader)
```

### Conventions that matter

- **`tier`** is `cited` or `pending`. `cited` means every clinical statement is
  traceable to a source in `sources.json` and the entry is published. `pending`
  means the answer needs a figure only the unpublished PhilPEN 2025 protocol can
  settle — those load as **drafts**, carry a visible "Pending BLHSD–WHO technical
  validation" line, and never reach a BHW until someone confirms the number.
- **Citations are rendered into the answer text** by the loader, because
  `kb_entries` has no source column. Do not hand-write a source line into an
  answer.
- **`keywords` are the matcher's main lever.** `src/lib/chat/scoring.ts` scores
  `question_fil`, `question_en` and `keywords` only — answer text is never
  scored. Keep keywords distinctive: a generic word that also fits a neighbouring
  entry costs accuracy for both. This is also where Hiligaynon terms belong.
- **`synonyms.json` rows follow `src/lib/chat/synonyms.ts`**: a single-word
  `term` matches the query's token set, a multi-word `term` matches as a
  substring of the normalised query, and matching runs both directions.
- Content ids (`m3-cuff-size`) are the stable key used by `locks/<ref>.json` and
  by the fixture corpus. Renaming one orphans its row; changing an entry's text
  is fine.

### Working on it

```bash
npm run kb:check-sources                                  # every citation resolves
npm test -- src/lib/chat                                  # retrieval quality gate
npm run kb:load -- --project <ref> --dry-run              # what would change
npm run kb:load -- --project <ref> --apply --publish --owner <admin-username>
npm run kb:unpublish -- --project <ref> --category "hhp-*" --apply   # kill switch
```

`src/lib/chat/ncd-fixtures.ts` builds its corpus from these files, so the
retrieval test scores the exact text a BHW will be matched against. Edit an
entry's question or keywords and the test re-scores it; the gate is ≥90% of 90
fixtures, plus the hard rule that an out-of-scope question (dosing, ECG,
diagnosis) may only ever be answered by a scope-boundary entry.

### `red-flags.json` and `clarifiers.json` (INC-17)

Routing rules for the conversational Chat Guide, active only behind the
`chat_conversation` flag. Unlike entries and articles these are **not** loaded
into the database — they are bundled at build time from `src/lib/chat/rules.ts`,
because they are routing logic whose review history belongs in the same pull
request as the fixtures that prove it works.

- **`red-flags.json`** forces a specific entry before scoring runs. Scoring
  cannot see urgency: against the shipped corpus, "mataas ang presyon niya at
  sumasakit ang dibdib niya" scores 0.749 against a *definition* of
  hypertension, and "180 ang presyon niya, ano gagawin ko" scores 0.709 against
  "what if blood spills on the table" — both above the 0.55 answer threshold, so
  both were returned with no hedge. Rules are evaluated in array order, first
  match wins, so rules with `and_any_of` are listed first.
- **`clarifiers.json`** asks one authored question when the decisive detail is
  missing, with each option mapped to an entry id. Options resolve server-side
  by index, so a selection is never re-scored.

Phrases are matched **whole-token** against the normalized question, so `hilo`
does not match inside `nahihilo` — every variant a BHW might type is listed
explicitly. That is what makes the lists reviewable by a nurse rather than by a
programmer. `loadContent()` rejects a rule whose target is unknown or is
`tier: pending` (an unpublished target means the rule can never fire — the worst
way for a safety rule to fail), and rejects any phrase that is not already
lowercase and trimmed.

Loading is deliberately explicit: `--project` has no default, and `--apply` is
required to write anything. `kb_entries` has no org scoping and no feature flag,
so publishing here is visible to every BHW in the project.
