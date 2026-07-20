# BHW Connect Phase 2

A web app for Barangay Health Workers (BHWs) in the Philippines. See `docs/` for
the product vision, the increment-by-increment build contract, and the free-AI
leverage plan — start there before touching code.

## Status

**INC-1 — Auth, org hierarchy & consent** (see `docs/delivery-plan.md` §7).
Username+password login (synthesized auth email), org-unit hierarchy with
RLS, NIST 800-63B password policy, login lockout, forced first-login
password change, and a DPA consent gate — on top of INC-0's foundation
shell (design tokens, i18n, layout, CI).

**Not yet connected to a real Supabase project in this environment** — see
"Connecting a Supabase project" below. Until one is linked, the app runs in
its INC-0 foundation-shell mode (no auth) and the auth/RLS E2E specs
skip themselves.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase project values when available
npm run dev
```

The app runs without Supabase credentials configured — every page is public
and behaves exactly like the INC-0 shell.

## Connecting a Supabase project

1. Create a Supabase project and fill in `.env.local` from `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API). The service role
   key is server-only — never prefix it `NEXT_PUBLIC_` or expose it to the
   browser.
2. Apply the migrations in `supabase/migrations/` in order (via the
   Supabase CLI's `supabase db push`, or paste them into the SQL editor in
   order). They create `org_units`, `users`, `audit_events`, and the RLS
   policies described in `docs/delivery-plan.md` §4/§5.1.
3. Seed one pilot org-unit chain plus a test admin and BHW account:
   ```bash
   npm run seed:pilot
   ```
   This prints the temp password for `admin.pilot` / `bhw.pilot`
   (`scripts/pilot-fixtures.ts`). Both accounts start with
   `must_change_password = true` and no consent recorded, so logging in
   walks the full forced-change → consent flow.
4. To also run the auth/RLS E2E specs (`e2e/auth.spec.ts`,
   `e2e/rls.spec.ts`) instead of having them skip, export the three env
   vars above in your shell before `npm run e2e`, or add them as
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
   `SUPABASE_SERVICE_ROLE_KEY` repo secrets so CI picks them up
   (`.github/workflows/ci.yml` already wires them through when present).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` / `npm run test:watch` | Vitest unit tests |
| `npm run e2e` | Playwright E2E (builds and serves automatically) |
| `npm run seed:pilot` | Seed the pilot org-unit chain + test admin/BHW accounts (needs a linked project) |
| `npx lhci autorun` | Performance budget check (needs a running build; see `lighthouserc.js`) |

## Design tokens

`src/styles/tokens.css` is the single source of truth for color — no other
file should contain a hex value. Tailwind consumes it via `@theme` in
`src/app/globals.css`.

## i18n

UI strings live in `messages/fil.json` and `messages/en.json` (Filipino is the
default locale). The language toggle in the header sets a `BHW_LOCALE` cookie
read by `src/i18n/request.ts`.

## Auth

- Login is username+password; Supabase Auth still wants an email, so one is
  synthesized internally as `<username>@bhw.local` (`src/lib/auth/username.ts`)
  and never shown to the user.
- Password policy is NIST SP 800-63B: length over composition rules (min 8
  chars, no forced symbols/rotation), checked against a ~2,000-entry
  common-password blocklist (`src/lib/auth/common-passwords.json`, derived
  from SecLists' 10k-most-common list, filtered to length ≥ 8).
- 5 failed attempts locks the account for 15 minutes
  (`src/lib/auth/lockout.ts`); both failures and lockouts are audit-logged.
- Route gating (unauthenticated → `/login`; forced password change →
  `/change-password`; DPA consent → `/consent`; 8-hour idle timeout) lives
  in `src/lib/supabase/middleware.ts`.
- All writes to `users`/`audit_events` from the auth flow go through the
  service-role client (`src/lib/supabase/service.ts`), bypassing RLS by
  design — RLS's job is scoping *reads* (see the "admins can read users in
  their org-unit subtree" policy in `supabase/migrations/20260720000003_users.sql`).
