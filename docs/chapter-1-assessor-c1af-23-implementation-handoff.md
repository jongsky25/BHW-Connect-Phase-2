# C1AF-23 implementation handoff

**Scope:** Chapter 2 compatibility regression, Chapter 3 adapter rehearsal and checklist. No new Chapter 2 or Chapter 3 learner content, production Chapter 3 requirements, overall contract or gate activation.

**Changes:** `e2e/assessor-chapter-compatibility.spec.ts` runs `e2e/fixtures/c1af23-real-schema.sql` against the complete migrated local Supabase schema. Its transaction rolls back the chapter, legacy qualification, reviewed-rule and synthetic Chapter 3 adapter rows. It checks the real Chapter 2 orientation foreign key and versioned receipt, absence of automatic conversion to a combined award, overall progress and unavailable Chapter 3, independent Chapter 2 suspension, and the future Chapter 3 prerequisite adapter. The qualifications card now uses the returned prerequisite state to expose a ready Chapter 3 legacy path and hide a path whose requirements are unavailable. Component tests cover both states.

**Verification:** run the focused Vitest component test, typecheck and lint, then run the Playwright compatibility spec in the disposable Supabase E2E environment after the full migration chain. The SQL rehearsal deliberately requires local `127.0.0.1:54321`; it is not a production data script. Review the full CI result before merge.

**Release boundary:** this PR has no database migration or production switch. A separate merge approval is required. After merge, Vercel's Git integration deploys `main`; smoke the protected qualifications page with Chapter 3 unavailable and Chapter 2 legacy history preserved. The future Chapter 3 work follows [the adapter checklist](chapter-1-assessor-c1af-23-adapter-checklist.md) and its own content, rubric and release review. C1AF-24 then rehearses the complete Chapter 1 story locally.
