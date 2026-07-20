# BHW Connect Phase 2

A web app for Barangay Health Workers (BHWs) in the Philippines. See `docs/` for
the product vision, the increment-by-increment build contract, and the free-AI
leverage plan — start there before touching code.

## Status

**INC-0 — Scaffold & foundations** shipped: Next.js + TypeScript app, design
tokens, i18n skeleton, base layout shell, Supabase client wiring, CI.

**INC-1 — Auth, org hierarchy & consent** (see `docs/delivery-plan.md` §7)
built in this session: `org_units` + pilot chain seed, `users` table + RLS,
username+password login (synthesized `<username>@bhw.local` auth email),
NIST 800-63B password policy + 5-attempt/15-minute lockout, forced
password change on first login, DPA consent screen, 8-hour idle session
timeout. Admin UI for managing users is out of scope (INC-2).

A Supabase project is provisioned (`ltzicxyefizxoqhfuuzc`) with all ten
migrations in `supabase/migrations` applied and a pilot admin + BHW account
seeded in Barangay Batong Malake. The DoD claims that need a live database
were verified directly against it (RLS cross-org isolation, the 5-attempt
lockout, consent, and forced-password-change RPCs all behave correctly —
see commit history for the verification queries). Migrations 7–10 are
hardening fixes that came out of that live verification: pinned
`search_path` on every function, EXECUTE revoked from `PUBLIC`/default
grants down to exactly the roles each function needs, a consolidated/faster
`users` SELECT policy, and a real bug — `anon` queries against
`org_units`/`users` were throwing a permission error instead of cleanly
returning zero rows, because the RLS policies call helper functions that
`anon` didn't have EXECUTE on.

**This repo's own CI still doesn't have Supabase secrets configured**, so
`e2e/auth.live.spec.ts` and the pgTAP RLS test in `supabase/tests/` still
don't run there — only manual/live verification has happened so far. To
wire up CI (or your own local dev):

1. Fill in `.env.local` from `.env.example` using the project's URL and
   anon key (Project Settings → API).
2. `npm run seed` (needs `SUPABASE_SERVICE_ROLE_KEY` from the same page) to
   create another pilot admin + BHW account, or reuse the ones already
   seeded.
3. Run `e2e/auth.live.spec.ts` (see that file's header for the env vars it
   needs) and `supabase/tests/rls_org_scope.test.sql` (see
   `supabase/tests/README.md`) against the project.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase project values when available
npm run dev
```

The app runs without Supabase credentials configured — routes that need auth
(`/login`, `/change-password`, `/consent`) still render, but the middleware
that gates access and the server actions that call Supabase are inert until
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

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
| `npm run seed` | Seed a pilot admin + BHW account (needs a provisioned Supabase project — see Status above) |

## Design tokens

`src/styles/tokens.css` is the single source of truth for color — no other
file should contain a hex value. Tailwind consumes it via `@theme` in
`src/app/globals.css`.

## Auth

Login is username + password; `src/lib/auth/username.ts` synthesizes the
`<username>@bhw.local` address Supabase Auth actually uses. Password rules
and the common-password blocklist live in `src/lib/auth/password-policy.ts`.
`failed_login_attempts`/`locked_until`/`consented_at`/`must_change_password`
on `public.users` are only ever written by the `SECURITY DEFINER` RPCs in
`supabase/migrations/20260720000005_auth_rpcs.sql` — there's no RLS UPDATE
policy for clients, by design. `src/lib/supabase/middleware.ts` enforces the
login → forced password change → consent → home ordering and the 8-hour
idle timeout on every request.

## i18n

UI strings live in `messages/fil.json` and `messages/en.json` (Filipino is the
default locale). The language toggle in the header sets a `BHW_LOCALE` cookie
read by `src/i18n/request.ts`.
