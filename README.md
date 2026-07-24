# BHW Connect Phase 2

A web app for Barangay Health Workers (BHWs) in the Philippines. See `docs/` for
the product vision, the increment-by-increment build contract, and the free-AI
leverage plan — start there before touching code.

## Status

**INC-11 — Surveys** (see `docs/delivery-plan.md` §7). INC-0 through INC-8
shipped auth, the admin console, KB authoring, the Chat Guide (engine + UI),
the dashboard, settings/onboarding, and reports export. INC-9 added feature
flags, error tracking, backups/restore, DPA data-subject actions, and the
retention/breach/deploy runbooks below. INC-11 adds admin-authored surveys
(multi-format questions, per-survey anonymity, hierarchy-scoped deployment,
results tallying) — built ahead of the pilot launch gate, at the
maintainer's direction, alongside INC-10 (Announcements) on an independent
branch; it ships behind the `surveys` feature flag (default off) so the
pilot project is unaffected until it's explicitly turned on. Next up:
further later-phase modules (§7), and, independently, the pilot launch gate
itself (KB content review, real user provisioning, DoD re-verification, KPI
baseline).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase project values when available
npm run dev
```

The app runs without Supabase credentials configured — auth wiring lands in
INC-1.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` / `npm run test:watch` | Vitest unit tests |
| `npm run e2e` | Playwright E2E (builds and serves automatically) |
| `npx lhci autorun` | Performance budget check (needs a running build; see `lighthouserc.js`) |

## Design tokens

`src/styles/tokens.css` is the single source of truth for color — no other
file should contain a hex value. Tailwind consumes it via `@theme` in
`src/app/globals.css`.

## i18n

UI strings live in `messages/fil.json` and `messages/en.json` (Filipino is the
default locale). The language toggle in the header sets a `BHW_LOCALE` cookie
read by `src/i18n/request.ts`.

## Ops & compliance

- `docs/deploy-runbook.md` — deploy flow, env var/secrets checklist, rollback.
- `docs/restore-drill-runbook.md` — backup/restore procedure and RPO 24h/RTO 4h drill log.
- `docs/breach-playbook.md` — DPA breach response, NPC 72h notification timeline.
- `/admin/flags` — feature flags, flippable without a deploy.
- `.github/workflows/backup.yml` / `retention-purge.yml` — scheduled backup and data-retention jobs.
