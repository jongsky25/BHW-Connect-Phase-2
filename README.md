# BHW Connect Phase 2

A web app for Barangay Health Workers (BHWs) in the Philippines. See `docs/` for
the product vision, the increment-by-increment build contract, and the free-AI
leverage plan — start there before touching code.

## Status

**INC-1 — Auth, org hierarchy & consent** (see `docs/delivery-plan.md` §7).
Username+password login (synthesized `<username>@bhw.local` auth email),
NIST 800-63B password policy with 5-attempt/15-minute lockout, forced
password change on first login, DPA consent gate, 8-hour idle session
timeout, and org-unit-scoped RLS. Schema lives in `supabase/migrations/`.
Admin UI for managing users lands in INC-2.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase project values
npm run dev
```

The app runs without Supabase credentials configured (auth-gated routes and
the `/` landing page just won't work), which keeps local UI-only work and CI
runs without secrets functional.

## Database

Schema, RLS policies, and auth RPCs are version-controlled under
`supabase/migrations/`. Apply them to a linked project with the
[Supabase CLI](https://supabase.com/docs/guides/local-development):

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### Running the live-fixture E2E tests

Most of the E2E suite (`e2e/shell.spec.ts`, `e2e/rls.spec.ts`) runs safely
against any linked project. `e2e/auth.spec.ts` drives the login flow against
the `bhw.pilot` and `admin.pilot` pilot fixtures and mutates their state
(password, lockout) — it's opt-in and skipped unless both `.env.local` is
configured and `RUN_LIVE_AUTH_E2E=1` is set, and `bhw.pilot` needs resetting
to a fresh temp-password state before each run (see the seed migration's
comment for the fixture list and reset shape).

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
