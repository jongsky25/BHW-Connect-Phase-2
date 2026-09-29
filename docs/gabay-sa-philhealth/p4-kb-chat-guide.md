# Gabay sa PhilHealth P4 — KB and Chat Guide draft

This increment turns the P1 inventory into 19 bilingual Knowledge Base answers with stable `ph-*` content IDs. Every answer gives a next action and cites PhilHealth sources. Three categories cover YAKAP, GAMOT and registration guidance. The registration content distinguishes a missing or uncertain PIN, record correction, and YAKAP clinic selection; detailed membership application remains in PhilHealth's own channels. Answers never promise medicine stock, a clinical dose, universal free service or an individual's eligibility.

The Chat Guide uses the existing published-KB loader and matcher. A versioned clarifier asks whether a vague “register / rehistro / magparehistro” question means a PIN or member record, or choosing a YAKAP clinic. It skips the question when the person already gave that clue. Narrow intent guards route stock, dose, credentials, charges, transfer and similar questions to the correct boundary answer before generic word overlap can pick an unsafe neighbour. Rules have no effect unless their target content ID exists among published entries. NCD emergency rules still take precedence in the conversational flow.

## Current source and review state

The source registry in `content/kb/philhealth-gabay/sources.json` uses official PhilHealth pages and circulars. On 2026-09-29, the old contact URL in the P1 register returned 404; this packet uses the current PhilHealth About Us page instead. The 2026 fraud advisory supports the credential safety answer. The YAKAP clinic list, GAMOT facility list, channel advisory and relevant circulars were checked against the current official pages. Recheck high-change claims before pilot publication. The loader schedules those entries for review after 30 days.

## Local-only load and verification

`npm run gabay:kb:check` checks the packet offline. `npm run kb:load -- --project local --corpus philhealth-gabay --apply` loads draft entries into a disposable local Supabase stack; the loader rejects any nonlocal target for this corpus. CI deliberately publishes it **only in its disposable stack** to test real Chat Guide retrieval and the clarifier. No pilot or live project was loaded, no feature flag was changed, and this PR does not deploy.

The retrieval fixture has three independent phrasings for each answer: English, Filipino and Taglish. It scores all 19 answers against the existing NCD and UHC material and requires at least 90% correct routing. Additional tests cover vague and specific registration questions, dose, stock, record and credential boundaries, local-only load protection, and the disposable E2E chat path.
