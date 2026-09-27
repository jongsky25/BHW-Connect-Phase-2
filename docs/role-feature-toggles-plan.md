# Admin feature toggles per user type: phased plan

Prepared 27 September 2026. Status: **draft plan, not yet implemented**. Each increment below is sized for one session and one small PR. Work the increments in order.

## 1. Outcome

An admin can turn each feature on or off **per user type** (`bhw`, `admin`, `assessor`, `designer`), not only for everyone at once. Examples:

- Turn the Forum on for BHWs but keep it off for assessors.
- Pilot Flipcharts with designers first, then open it to BHWs.

The admin makes the change from `/admin/flags`. It applies on the user's next page load, needs no deploy, and every change is written to the audit log.

## 2. Current state

| Area | Today | File |
|---|---|---|
| Flag storage | `public.feature_flags(key, enabled, description, role_filter, org_unit_filter)`. `role_filter` is a single `text` that **nothing reads or writes** | `supabase/migrations/20260726000000_inc9_ops_hardening.sql:33` |
| Toggle RPC | `rpc_flag_toggle(p_key, p_enabled)`: `security definer`, admin-only, locks the row and writes the `flag.toggled` audit event | same migration |
| Flag reading | `getFeatureFlags(supabase)` reads `key, enabled` and overlays the rows on `DEFAULT_FLAGS`. It is **global and has no user context** | `src/lib/flags/get-flags.ts` |
| Per-request memo | `getRequestFeatureFlags()`, also global | `src/lib/supabase/request.ts:29` |
| Middleware | Loads the flags *in parallel* with `appUser`, then forwards `x-app-offline-pwa` and `x-app-notifications` | `src/lib/supabase/middleware.ts:99,161-173` |
| Gating | Nav items use `show({ role, flags })`. About 40 pages and API routes check `flags.X` themselves and redirect to `/home` or return 403 | `src/lib/nav/nav-items.ts`, `src/lib/admin/nav.ts`, `src/app/**` |
| Admin UI | A list of flags, each shown by its raw key with one on/off switch | `src/components/admin/flags-console.tsx` |
| Roles | A `users.role` text CHECK allowing `bhw`, `admin`, `assessor`, `designer`. The TS union is repeated in four places | `src/lib/supabase/app-user.ts`, `src/lib/admin/types.ts`, `src/lib/super-admin/types.ts`, `src/app/layout.tsx` |

## 3. Design

### 3.1 Rule

```
effective(flag, role) = flag.enabled AND role NOT IN flag.disabled_roles
```

- `enabled` stays the **master switch**. Off means off for everyone, which is today's behaviour.
- `disabled_roles text[] not null default '{}'` is a new column. A role listed in it loses the feature even when the master switch is on.
- The column stores a **deny-list**, not an allow-list, for two reasons:
  - Existing rows (`'{}'`) keep exactly today's behaviour.
  - A role added in the future inherits every feature that is currently on, instead of silently getting none.
- A CHECK constraint keeps it a subset of the valid roles: `disabled_roles <@ array['bhw','admin','assessor','designer']`.
- `role_filter` stays unused and is marked deprecated in the column comment. Dropping it is a separate clean-up.

### 3.2 Which toggle gates what

| Surface | Uses | Why |
|---|---|---|
| User-facing pages, the header and home nav, `/api/chat`, the PWA and notification headers | **Role-effective** flags for the signed-in user | This is the feature being asked for |
| The admin console (`/admin/*` pages, the admin nav, `/api/admin/*`) | The **master** switch only | Lets admins prepare content before opening a feature to BHWs, and stops an admin from switching off their own moderation tools |
| SQL-side checks on `feature_flags.enabled` (the notification fan-out in inc19, the audit read policies) | The master switch only, unchanged | These are system behaviours, not per-user surfaces |

The `admin` column in the matrix therefore controls only an admin's *user-facing* view of a feature (for example reading `/forum`). It never hides an admin console page.

### 3.3 Role scope per flag

Some cells make no sense. `reports_export` is admin-console only, and `/assessments` is assessor-only whatever its flag says. A code-side map, `FLAG_ROLE_SCOPE: Record<FeatureFlagKey, AppRole[] | "master-only">`, lists the roles each flag can apply to. The UI shows "—" for the other cells.

This is a first draft. Confirm it against each page's own role check in increment 2.

| Flag | Roles it can apply to |
|---|---|
| `kb_articles`, `announcements`, `surveys`, `forum`, `notifications`, `offline_pwa`, `chat_conversation` | all four |
| `elearning` | bhw, assessor, admin |
| `course_sessions` | bhw, assessor |
| `flipcharts` | bhw, designer, admin |
| `reports_export`, `ai_gap_draft`, `ai_external` | master only (admin console or system) |

### 3.4 Personas and super admins

A super-admin persona runs as a real `users` row with a role, so role-effective flags apply to it automatically and need no special case. Changing toggles stays **admin-only**, the same as `rpc_flag_toggle`.

## 4. Rules for every increment

1. **Scope.** One increment per PR. Branch `claude/rft-<n>-<slug>`, based on the latest `main`.
2. **Checks.** Run `npm run lint`, `npm run typecheck` and `npm test` before pushing. Run touched e2e specs when Playwright can run. E2E runs against the shared pilot database, so **always restore every flag you change in a `finally` block**.
3. **Copy.** Every string goes in both `messages/en.json` and `messages/fil.json`, in plain, short Filipino.
4. **A11y.** Switches use `role="switch"` and `aria-checked`, have a 44px touch target and a visible focus ring. Hex colours go only in `src/styles/tokens.css`.
5. **No behaviour change until increment 3.** While every `disabled_roles` is `'{}'`, the role-aware code must produce exactly today's flags.

## 5. Increments

### 1. Migration and RPC (DB only)

`supabase/migrations/20261005000000_rft1_feature_flag_roles.sql`:

- Add `feature_flags.disabled_roles text[] not null default '{}'` and the subset CHECK.
- Add `rpc_flag_set_role(p_key text, p_role text, p_enabled boolean)`:
  - `security definer set search_path = public`, admin-only through `current_app_user()`;
  - validates `p_role` and locks the row `for update`;
  - removes the role from `disabled_roles` (enable) or appends it without duplicates (disable);
  - bumps `updated_at`;
  - writes the audit event `flag.role_toggled` with Filipino and English summaries, following `rpc_flag_toggle`;
  - raises `flag not found` or `not authorized` exactly as the existing RPC does, so `mapAdminRpcError` works unchanged.
- `revoke execute ... from anon`, as in inc29.
- The existing read policy already exposes the table to signed-in users; no change.

### 2. Role-aware resolution (no visible change)

- **Roles.** Add `src/lib/auth/roles.ts` with `APP_ROLES` and `AppRole`. Point the four duplicated unions at it.
- **Types.** In `src/lib/flags/types.ts`, add `disabled_roles: AppRole[]` to `FeatureFlagRow`. Add `FLAG_ROLE_SCOPE` (§3.3).
- **Resolver.** In `src/lib/flags/get-flags.ts`:
  - `fetchFlagRows(supabase)` selects `key, enabled, disabled_roles`;
  - a pure `resolveFlags(rows, role?)` returns master flags when `role` is undefined and role-effective flags otherwise, falling back to `DEFAULT_FLAGS` as today;
  - `getFeatureFlags(supabase, role?)` composes the two.
- **Middleware** (`src/lib/supabase/middleware.ts`). Keep the parallel read, but make it fetch *rows* and resolve them with `appUser.role` after the profile arrives. This still costs one round trip.
- **Request memo** (`src/lib/supabase/request.ts`):
  - `getRequestFeatureFlags()` becomes role-aware. It uses the cached `getRequestAuthUser` and `getRequestAppUser`, and falls back to master flags when signed out.
  - Add `getRequestMasterFlags()`.
  - Switch `src/app/admin/**` pages and layouts to the master variant. The remaining user-facing call sites keep `getRequestFeatureFlags()` and so become role-aware automatically.
- **API routes.**
  - Pass `appUser.role` in `src/app/api/chat/route.ts` and `src/lib/ai/server.ts`.
  - Keep `src/app/api/admin/**` on master flags.
- **Tests.**
  - `get-flags.test.ts`: cover `resolveFlags` for master, a role in the deny-list, a role not listed, master off, and unknown keys.
  - `nav-items.test.ts`: a BHW with `forum` disabled for `bhw` gets no Forum item; an assessor still does.

### 3. Admin matrix UI

`src/components/admin/flags-console.tsx` becomes a matrix:

- **Desktop (≥ md).**
  - A table with one row per feature, showing its **friendly name** and description.
  - Columns are **Everyone** (the master switch), then BHW, Admin, Assessor and Designer.
  - A role cell calls `rpc_flag_set_role`.
- **Master off.** The role cells are disabled and read "Off for everyone", but keep their stored value so switching the master back on restores it.
- **Out of scope.** Cells outside `FLAG_ROLE_SCOPE` show "—".
- **Phone.** One card per feature: the master switch, then a stack of role switches. No horizontal scroll.
- **Save behaviour.** A cell shows a pending state while its RPC runs, the page calls `router.refresh()` afterwards, and errors go through `mapAdminRpcError`, as today.
- **i18n.**
  - `admin.flags.names.<key>` gives each flag a friendly name; today the raw key is shown.
  - Add `admin.flags.roles.*`, `admin.flags.everyone`, `admin.flags.offForEveryone` and `admin.flags.notApplicable`.
  - Update `admin.flags.intro` to explain per-type control.
- **Audit.** Show `flag.role_toggled` in `/admin/audit` with a readable label.
- **Tests.** `flags-console.test.tsx`:
  - renders the matrix;
  - disables role cells when the master is off;
  - calls the RPC with the right arguments;
  - shows "—" for out-of-scope cells.

### 4. End-to-end, hardening and docs

- **E2E.** Extend `e2e/ops-hardening.spec.ts`:
  - the admin disables `forum` for `bhw` through `rpc_flag_set_role`;
  - the BHW's header has no Forum link and `/forum` redirects to `/home`;
  - an assessor still sees the Forum;
  - `/admin/forum` still loads for the admin;
  - restore the flag in `finally`.
  - Add an axe pass on `/admin/flags`.
- **Optional SQL enforcement.** Add `public.feature_enabled_for_current_user(p_key text) returns boolean` (stable, security definer). Use it in the write RPCs of role-scopable features (forum post, survey submit, and so on), so a disabled role cannot use the feature by calling the API directly. Today no user RPC checks flags, so this is extra hardening; land it as its own PR if it grows.
- **Docs.** Update `docs/deploy-runbook.md` (how to turn a feature on for one user type) and this plan's status.

## 6. Open questions for the product owner

1. **Granularity.** Is per *user type* enough, or do you also want per *org unit* (for example, one municipality piloting first)? `org_unit_filter` exists but is unused; this plan leaves it out.
2. **Admin console.** Is it right that turning a feature off for "Admin" hides only the admin's user-facing view, never the admin console page (§3.2)?
3. **Who may toggle.** Every `admin`, as today, or super admins only?
4. **Role scope table (§3.3).** Is the draft correct for `elearning`, `course_sessions` and `flipcharts`?

## 7. Status

| Increment | State |
|---|---|
| 1. Migration and RPC | not started |
| 2. Role-aware resolution | not started |
| 3. Admin matrix UI | not started |
| 4. E2E, hardening and docs | not started |
