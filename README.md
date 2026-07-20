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

**No Supabase project is provisioned for this repo yet.** The app and its CI
run fully without one — see "Getting started" — so the parts of INC-1's
Definition of Done that need a live database (the temp-password login E2E
flow in `e2e/auth.live.spec.ts`, and the RLS pgTAP test in
`supabase/tests/`) aren't exercised by CI. To turn this on for real:

1. Create a Supabase project and run the migrations in `supabase/migrations`
   against it (SQL editor, or `supabase db push` once `supabase link`'d).
2. Fill in `.env.local` from `.env.example` (see below).
3. Run `npm run seed` (needs `SUPABASE_SERVICE_ROLE_KEY`, project settings >
   API) to create a pilot admin + BHW account.
4. Run `supabase/tests/rls_org_scope.test.sql` (see `supabase/tests/README.md`)
   and `e2e/auth.live.spec.ts` (see that file's header) against the project.

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
