# Feature toggles per user type, admin preview, and content visibility: phased plan

Prepared 27 September 2026. Status: **approved plan, not yet implemented**. Each increment below is sized for one Sonnet session and one small PR. Work the increments in the order given in §9. The increments are self-contained: read §3 and §4, then the increment itself.

## 1. Outcome

1. **Feature toggles per user type.**
   - The super admin turns each feature on or off separately for **BHW**, **Assessor** and **Designer**, from `/admin/flags`.
   - Every flag keeps an **"Available" master switch**, a kill switch for everyone.
   - The change applies on the user's next page load, needs no deploy, and is audited.
2. **Nothing is ever hidden from admins.**
   - Admins always see every feature that is available, and every piece of content, including hidden and archived content.
   - Instead, an admin can **preview the app as a BHW, Assessor or Designer**: a "View as" switch shows the menus, features and content that user type sees. A banner shows while preview is on, and preview is read-only.
3. **Content can be hidden, shown or archived on each admin page.**
   - **Hide** takes an item away from users for now. It stays in the admin list with a "Hidden" badge.
   - **Show** brings a hidden item back.
   - **Archive** retires an item. It leaves users' view and moves to the admin page's **Archived** tab, read-only. **Restore** brings it back.
   - Nothing is deleted by these actions. Progress, responses, certificates and audit history are kept.

## 2. Decisions confirmed by the product owner (27 Sep 2026)

| # | Decision |
|---|---|
| D1 | Toggles work per **user type** only. There is no per-org-unit or per-user targeting, and `feature_flags.org_unit_filter` stays unused. |
| D2 | **Nothing is hidden from admins.** Per-type toggles cover only `bhw`, `assessor` and `designer`. Admins get a **preview / view-as** mode instead. |
| D3 | **Only super admins may change feature toggles.** Today the only super admin is `rcventura` (`public.super_admins`, seeded in `20260925000000_super_admin_personas.sql:59`). Other admins can see the flags page read-only. |
| D4 | The role scope per flag in §4.3 is approved. |
| D5 | Admins can hide, show, archive and restore content on each admin page (§4.5). |

The master switch is not a per-type toggle, and switching it off does hide a feature from admins too. It is kept on purpose as a kill switch for:

- AI spend (`ai_external`);
- unreviewed features;
- incidents.

Only the super admin can use it. D2 applies to the per-type toggles and to content.

## 3. Rules for every increment (read before starting)

1. **Scope.** One increment per session, one PR per increment. Branch `claude/rft-<id>-<slug>`, for example `claude/rft-a1-flag-roles-migration`, from the latest `main`. Do not start work that belongs to a later increment.
2. **Checks.** Before pushing, run `npm run lint`, `npm run typecheck` and `npm test`. Run the e2e specs you touched when Playwright can run (`npm run e2e -- <spec>`).
3. **Shared pilot database.** E2E runs against the shared pilot project. **Restore every flag, preview cookie and content state you change in a `finally` block.** Never leave a shared flag or a shared content item changed.
4. **Migrations.**
   - Name: `supabase/migrations/YYYYMMDDHHMMSS_rft_<id>_<slug>.sql`, with a timestamp later than the newest file in the folder.
   - Follow the house style:
     - a header comment explaining why;
     - `create ... if not exists`;
     - `drop policy if exists` before `create policy`;
     - RPCs are `security definer set search_path = public` and begin with the actor check;
     - every admin mutation writes one `audit_events` row with `plain_summary_fil` and `plain_summary_en`;
     - `revoke execute ... from anon` (see `20260929000000_inc29_revoke_anon_execute.sql`).
   - Never edit an applied migration.
5. **Errors.** Every new RPC error message must be mapped in `src/lib/admin/error-messages.ts` (`mapAdminRpcError`). Add a message key in both locales for it.
6. **Copy.** Every user-visible string goes in **both** `messages/en.json` and `messages/fil.json`. Filipino copy is plain and short (see `docs/training-content-style-guide.md`).
7. **UI.**
   - Touch targets are at least 44×44px, with a visible `focus-visible` outline.
   - Switches use `role="switch"` and `aria-checked`. Menus use the disclosure pattern (see `docs/header-navigation-display-settings-plan.md` §3).
   - Hex colours go only in `src/styles/tokens.css`.
   - Phone width has no horizontal scroll.
8. **No behaviour drift.** Keep these working unchanged:
   - the super-admin persona bar and switching;
   - the notification bell;
   - the offline/PWA toggle;
   - existing per-page flag redirects.
9. **Status.** Tick your increment in §10 of this doc in the same PR.

## 4. Design

### 4.1 Current state (baseline `main` @ 36d9281)

| Area | Today | File |
|---|---|---|
| Flag storage | `feature_flags(key, enabled, description, role_filter, org_unit_filter)`. `role_filter` is unused | `supabase/migrations/20260726000000_inc9_ops_hardening.sql:33` |
| Toggle RPC | `rpc_flag_toggle(p_key, p_enabled)`: **any admin**, locks the row, audits `flag.toggled` | same file |
| Flag read | `getFeatureFlags(supabase)` is global, with no user context. It fails closed except for `kb_articles` and `reports_export` | `src/lib/flags/get-flags.ts` |
| Request memo | `getRequestFeatureFlags()`, global | `src/lib/supabase/request.ts:29` |
| Middleware | Reads flags in parallel with `appUser`. Hard-gates `/admin` to admins. Forwards `x-app-role`, `x-app-offline-pwa`, `x-app-notifications` and `x-app-user-id` | `src/lib/supabase/middleware.ts:95-173` |
| Gating | Nav uses `show({ role, flags })`. About 40 pages and routes check `flags.X` and/or `appUser.role` themselves | `src/lib/nav/nav-items.ts`, `src/lib/admin/nav.ts`, `src/app/**` |
| Super admin | `public.super_admins`; `current_super_admin()` (revoked from `authenticated`, so call it only inside `security definer` functions); `rpc_super_admin_context()` for the UI. Personas are real separate accounts, switched by a session swap | `20260925000000_super_admin_personas.sql`, `src/app/actions/super-admin.ts`, `src/components/super-admin/persona-bar.tsx` |
| Admin nav super-admin gating | Nav items can be `superAdminOnly`; `isSuperAdmin` comes from `rpc_super_admin_context` in `src/app/admin/layout.tsx:23-30` | `src/lib/admin/nav.ts:66-86` |
| Content states | See §4.5. There are no `hidden_at` or `archived_at` columns and no soft delete anywhere | — |
| E2E accounts | `STABLE_BHW`, `STABLE_ADMIN`, `OTHER_BARANGAY_BHW` and `STABLE_CITY_ADMIN`, from `E2E_*` secrets. **None is a super admin** | `e2e/fixtures/auth.ts` |

### 4.2 Feature toggles: rule

```
effective(flag, viewer) =
  flag.enabled                                              -- master "Available" switch
  AND (viewer.role = 'admin' OR viewer.role NOT IN flag.disabled_roles)
```

- The new column is `feature_flags.disabled_roles text[] not null default '{}'`, with the CHECK `disabled_roles <@ array['bhw','assessor','designer']::text[]`. `admin` can never be stored in it (D2).
- The column is a **deny-list**, for two reasons:
  - Every existing row (`'{}'`) behaves exactly as today.
  - A future role inherits every feature that is currently on.
- `role_filter` stays. Add a `comment on column` marking it deprecated. Do not drop it.
- `viewer.role` is the **effective role**: the preview role while an admin is previewing (§4.4), otherwise `appUser.role`.

Which switch gates which surface:

| Surface | Uses |
|---|---|
| User-facing pages, header and home nav, `/api/chat`, the `x-app-offline-pwa` and `x-app-notifications` headers | `effective(flag, viewer)` |
| The admin console (`/admin/*`, `src/lib/admin/nav.ts`, `/api/admin/*`) | the master switch (`flag.enabled`) |
| SQL-side flag checks (the inc19 notification fan-out, the audit read policies) | the master switch, unchanged |

### 4.3 Role scope per flag (approved, D4)

`FLAG_ROLE_SCOPE` in `src/lib/flags/types.ts` decides which per-type switches the matrix shows. Cells outside the scope render "—" and cannot be toggled. The RPC rejects them too (§5 A1).

| Flag | Per-type switches shown |
|---|---|
| `kb_articles`, `announcements`, `surveys`, `forum`, `notifications`, `offline_pwa`, `chat_conversation` | BHW, Assessor, Designer |
| `elearning` | BHW, Assessor |
| `course_sessions` | BHW, Assessor |
| `flipcharts` | BHW, Designer |
| `reports_export`, `ai_gap_draft`, `ai_external` | none: master switch only |

The same map is mirrored in SQL as `public.flag_role_scope(p_key text) returns text[]`, an immutable `case` expression. Keep the two in sync; a unit test in A2 compares the TS map with the migration text.

### 4.4 Admin preview ("View as")

- **Who and how.** Only `appUser.role = 'admin'` can preview; this includes the super admin. The admin chooses **BHW, Assessor or Designer** from a "View as" control in the header user menu.
- **Where it is stored.** A server action sets the httpOnly cookie `bhw_view_as=<role>` (`sameSite=lax`, `path=/`, session-only, with no maxAge). Clearing it ends preview.
- **Middleware.**
  - Reads the cookie **only if** `appUser.role === 'admin'` and the value is in the allowed list. Otherwise it deletes the cookie.
  - Computes `effectiveRole`.
  - Forwards `x-app-effective-role` and `x-app-preview=1`.
  - While previewing, `/admin/*` redirects to `/home?preview=1`. The admin must exit preview to manage anything. This keeps "what I see" honest.
- **Viewer context.** Add `src/lib/auth/viewer.ts` with `getViewer()`, which returns `{ appUser, role: effectiveRole, isPreview }` and is cached per request.
  - Every page and layout that gates on `appUser.role` or on flags switches to `getViewer()`.
  - Data reads still run as the admin; RLS does not change.
  - So the preview shows the admin's **own org scope** through the effective role's pages and flags, with hidden and archived content filtered out (§4.5). It is an approximation.
  - For an exact experience of a single user, keep using the super-admin personas.
- **Read-only.**
  - While previewing, a `PreviewProvider` React context (`isPreview`) disables every submit, enrol, post, vote, answer and progress action, and shows a tooltip or inline note: "Preview only — nothing is saved."
  - Route handlers under `/api/*` return `403 {error:"preview read-only"}` for non-GET requests when `x-app-preview=1`.
  - Progress-writing paths already have an "admin preview" precedent: the training manual, `src/app/training/[programId]/[[...path]]/page.tsx:42-45`. Reuse its pattern.
- **Banner.**
  - `src/components/preview/preview-bar.tsx` shows the text "Previewing as BHW — this is what BHWs see. [Switch ▾] [Exit preview]".
  - It uses the `warning` token like `persona-bar.tsx`, but must look different from the persona bar (use an icon and different text).
  - It renders only when `isPreview` is true. It is sticky under the header and announced with `role="status"`.
- **Audit.** None; preview is read-only and does not change state.

### 4.5 Content visibility: hide, show, archive

**Model.** Add the same four nullable columns to every in-scope table:

```
hidden_at timestamptz, hidden_by uuid references public.users(id),
archived_at timestamptz, archived_by uuid references public.users(id)
```

The existing `status` columns and their CHECKs stay exactly as they are. Publishing, drafts and notifications do not change. Visibility is a separate layer on top:

```
visible_to_users(row) = <existing publish rule> AND row.hidden_at IS NULL AND row.archived_at IS NULL
```

- **Hide** sets `hidden_at`; **Show** clears it.
- **Archive** sets `archived_at` and clears `hidden_at`; **Restore** clears `archived_at`.
- An archived item is read-only in admin until it is restored. Its edit and set-status RPCs raise `content archived`.

**Enforcement.**

1. **RLS, as a restrictive policy per table.** A restrictive policy is added on top of the existing permissive policies, so none of them needs rewriting:
   ```sql
   create policy <t>_visibility on public.<t> as restrictive for select to authenticated
     using ((hidden_at is null and archived_at is null)
            or (select public.current_app_user()).role = 'admin'
            or <author clause where the table has an author>);
   ```
   The author clause keeps a designer's own hidden flipchart and a forum author's own archived thread visible to their author.
2. **Explicit query filters** in every user-facing read: pages, `src/lib/chat/published-entries.ts` (Chat Guide retrieval) and the notification links. These are needed because admins bypass RLS visibility, and admin preview must still filter. Add the helper `withVisible(q)` in `src/lib/content/visibility.ts`; it applies `.is('hidden_at', null).is('archived_at', null)`.

**In-scope content** (the rest is listed as out of scope in §8):

| Content | Table | Admin page | Existing states it keeps | Notes |
|---|---|---|---|---|
| KB entries | `kb_entries` | `/admin/kb/entries` | draft/published | Also excluded from Chat Guide retrieval |
| KB articles | `kb_articles` | `/admin/kb/articles` | draft/published | |
| Announcements | `announcements` | `/admin/announcements` | none (hard delete only today) | Archive gives a non-destructive alternative to delete; keep delete |
| Surveys | `surveys` | `/admin/surveys` | draft/published/closed | Responses are kept; archived surveys stay in results |
| Courses | `courses` | `/admin/courses` | draft/published/archived | See the note below on `status='archived'` |
| Flipcharts | `flip_charts` | `/admin/flipcharts` | draft/in_review/published | Today published charts cannot be unpublished; Hide fixes that |
| Forum threads | `forum_threads` | `/admin/forum` | visible/hidden (moderation) | Moderation hide stays as it is (it has a reason field). Only **Archive/Restore** is added here |

**Courses already have a status value `archived`, which nothing in the UI uses.** Increment C1 must:

- count `courses where status='archived'`, and if there are any, backfill `archived_at = updated_at, status = 'published'` in the same migration and write the count in the PR description;
- change `rpc_course_set_status` to reject `archived`, with the error `use archive action`, so archiving happens only one way.

**One RPC for every content type:** `rpc_content_set_visibility(p_type text, p_id uuid, p_action text)`.

- `p_type` must be one of `kb_entry`, `kb_article`, `announcement`, `survey`, `course`, `flipchart` or `forum_thread`.
- `p_action` must be one of `hide`, `show`, `archive` or `restore`. For `forum_thread`, only `archive` and `restore` are accepted.
- The actor must be an admin. For org-scoped tables, reuse the same scope check as that table's existing admin RPC; for example, surveys and courses use the check in `rpc_survey_set_status` and `rpc_course_set_status`. The KB is global, so any admin may act on it.
- The RPC locks the row `for update`, checks that the transition is legal, and updates the columns.
- It audits `content.hidden`, `content.shown`, `content.archived` or `content.restored`, with `subject` set to the type and id and a plain summary in both languages that names the item title.
- It raises one of the following. Every message must be mapped in `mapAdminRpcError`:
  - `not authorized`
  - `content not found`
  - `invalid content type`
  - `invalid action`
  - `already hidden`
  - `not hidden`
  - `already archived`
  - `not archived`

**Admin UI**, one shared kit in `src/components/admin/content-visibility/`:

- `VisibilityBadge`: "Hidden" or "Archived".
- `VisibilityActions`: a disclosure menu with Hide/Show and Archive/Restore. It asks for confirmation before Archive, calls the RPC, then `router.refresh()`.
- `VisibilityTabs`: **Active** (the default: published, draft and hidden) and **Archived**, with the counts. The tab is kept in the `?view=archived` search param.

## 5. Phase A: Feature toggles per user type

### A1. Migration: per-type column, super-admin-only RPCs

**Before you start (owner action).** E2E needs a super-admin account.

- The owner creates a dedicated test user `superadmin.stable` with role `admin`, in the org used by `STABLE_ADMIN` (`admin.stable`).
- The owner adds it to `super_admins` with a one-off SQL statement. Do not put it in a migration, because migrations also run on other projects.
- The owner adds the CI secret `E2E_STABLE_SUPER_ADMIN_PASSWORD` (the username is fixed in `e2e/fixtures/auth.ts`, like the other stable fixtures).
- If these are missing, stop and ask; do not weaken the RPC.

**Migration** `..._rft_a1_flag_roles.sql`:

- Add `disabled_roles` and its CHECK (§4.2). Add the deprecation comment on `role_filter`.
- Add `public.flag_role_scope(p_key)` (§4.3).
- Add `public.rpc_flag_set_role(p_key text, p_role text, p_enabled boolean) returns void`. It:
  - requires `current_super_admin()` to be non-null (`not authorized`);
  - requires `p_role` to be in `flag_role_scope(p_key)` (`invalid role for flag`);
  - locks the row and raises `flag not found` if it is missing;
  - enables by removing the role from `disabled_roles`;
  - disables by appending the role (`array_append` guarded by `not (p_role = any(...))`);
  - sets `updated_at = now()`;
  - audits `flag.role_toggled`, for example Filipino "Pinatay ang Forum para sa BHW" and English "Forum turned off for BHWs".
- Replace `rpc_flag_toggle` (same signature) so it requires `current_super_admin()` instead of `role = 'admin'`. Everything else stays the same.
- Revoke `anon` on both RPCs.

**Code and tests:**

- `e2e/fixtures/auth.ts`: add `STABLE_SUPER_ADMIN` (`superadmin.stable`); wire `E2E_STABLE_SUPER_ADMIN_PASSWORD` into `.env.example` and the CI e2e job env.
- `e2e/ops-hardening.spec.ts`: call `rpc_flag_toggle` with the super-admin token.
- Add an e2e case: calling `rpc_flag_toggle` with `STABLE_ADMIN`'s token fails with `not authorized`.
- `src/lib/admin/error-messages.ts`: map `invalid role for flag`.

**Done when:**

- The migration applies cleanly (`supabase db push` on a branch or preview).
- Existing behaviour is unchanged for users.
- A plain admin can no longer toggle flags.

### A2. Role-aware flag resolution (no visible change)

- **Roles.** Add `src/lib/auth/roles.ts`, exporting:
  - `APP_ROLES = ["bhw","admin","assessor","designer"] as const`;
  - `type AppRole`;
  - `PREVIEWABLE_ROLES = ["bhw","assessor","designer"] as const`.

  Point the duplicated unions at it: `src/lib/supabase/app-user.ts`, `src/lib/admin/types.ts`, `src/lib/super-admin/types.ts` and `src/app/layout.tsx:147`.
- **Types** (`src/lib/flags/types.ts`):
  - add `disabled_roles: AppRole[]` to `FeatureFlagRow`;
  - add `FLAG_ROLE_SCOPE` (§4.3).
- **Resolver** (`src/lib/flags/get-flags.ts`):
  - `fetchFlagRows(supabase)` selects `key, enabled, disabled_roles`;
  - `resolveFlags(rows, role?: AppRole)` is pure. With no role, or with `admin`, it returns the master switches. Otherwise it applies §4.2. It keeps `DEFAULT_FLAGS` and its fail-closed behaviour;
  - `getFeatureFlags(supabase, role?)` composes the two.
- **Middleware** (`src/lib/supabase/middleware.ts`):
  - keep the parallel read, but make it fetch *rows*;
  - after `appUser` is known, call `resolveFlags(rows, appUser.role)`;
  - this is still one round trip.
- **Request memo** (`src/lib/supabase/request.ts`):
  - `getRequestFeatureFlags()` becomes role-aware. It uses the cached `getRequestAuthUser` and `getRequestAppUser`; when signed out it returns the master switches;
  - add `getRequestMasterFlags()`;
  - switch every `src/app/admin/**` page and layout to `getRequestMasterFlags()`. User-facing call sites keep `getRequestFeatureFlags()` and become role-aware with no edits.
- **API.**
  - `src/app/api/chat/route.ts` and `src/lib/ai/server.ts` pass `appUser.role`;
  - `src/app/api/admin/**` stays on the master switches.
- **Tests.**
  - `get-flags.test.ts`: master only; role in `disabled_roles`; role not in it; `admin` ignores `disabled_roles`; master off beats everything; unknown keys; read failure falls back to defaults.
  - `nav-items.test.ts`: a BHW with `forum` disabled for `bhw` has no Forum item, while an assessor still does.
  - `flag-role-scope.test.ts`: `FLAG_ROLE_SCOPE` matches the `flag_role_scope` `case` in the A1 migration (parse the SQL text).
- **Done when:** with every `disabled_roles = '{}'`, every page, the nav and the headers are identical to today, and the unit tests prove the role behaviour.

### A3. Flags matrix UI (super admin edits, admins read)

- **`src/app/admin/flags/page.tsx`:**
  - select `disabled_roles` as well;
  - read `rpc_super_admin_context()` and pass `canEdit = is_super_admin`.
- **`src/components/admin/flags-console.tsx`** becomes a matrix:
  - **Desktop (≥ md).** A table with one row per flag, showing its friendly name and description. The columns are **Available** (the master switch), then BHW, Assessor and Designer.
  - **Master off.** The per-type cells are disabled and read "Off for everyone". Their stored value is kept, so switching the master switch back on restores them.
  - **Out of scope.** Cells outside `FLAG_ROLE_SCOPE` show "—".
  - **Phone.** One card per flag: the master switch, then the per-type switches stacked. No horizontal scroll.
  - **Read-only view.** When `canEdit` is false, the switches render as status text (On/Off), not buttons, under a note: "Only the super admin can change these."
  - **Saving.** A cell shows a pending state while its RPC runs. Errors go through `mapAdminRpcError`, then `router.refresh()`.
- **Header copy.** Drop the column header for admins and show the line "Admins always see every available feature. Use **View as** to check what others see." The link becomes live in B1; until then it is text only.
- **i18n** (`admin.flags`):
  - `names.<key>` for all 13 flags, in plain language (for example `forum` → "Forum / Talakayan");
  - `columns.available`, `columns.bhw`, `columns.assessor`, `columns.designer`;
  - `offForEveryone`, `notApplicable`, `readOnlyNote`, `adminsAlwaysSee`;
  - updated `intro`.
- **Tests.** `flags-console.test.tsx`:
  - renders the matrix;
  - "—" for out-of-scope cells;
  - per-type cells disabled when the master switch is off;
  - calls `rpc_flag_set_role` with the right arguments;
  - read-only mode shows no buttons.
- **E2E** (`ops-hardening.spec.ts`):
  - the super admin disables `forum` for `bhw` through the UI;
  - the BHW has no Forum link and `/forum` redirects to `/home`;
  - the admin still sees the Forum;
  - restore in `finally`;
  - add an axe pass on `/admin/flags`.
- **Done when:** the super admin can control each feature per user type, and the change shows on the user's next page load.

## 6. Phase B: Admin preview ("View as")

Needs A2 and C2.

### B1. Viewer context, cookie and banner

- **Server action** `src/app/actions/preview.ts`:
  - `startPreview(role)` checks that the caller is an admin and that `role` is in `PREVIEWABLE_ROLES`, sets `bhw_view_as`, and redirects to `/home`;
  - `endPreview()` clears the cookie and redirects to `/admin/dashboard`.
- **Middleware (§4.4):**
  - validate the cookie and compute `effectiveRole`;
  - resolve the flags with `effectiveRole`;
  - forward `x-app-effective-role` and `x-app-preview`;
  - redirect `/admin/*` to `/home?preview=1` while previewing;
  - `/super-admin` stays reachable;
  - clear the cookie on sign-out (`src/lib/nav/use-sign-out.ts`, next to `clearSuperAdminCookies`).
- **Viewer** (`src/lib/auth/viewer.ts`):
  - add `getViewer()`, cached;
  - replace `appUser.role` gating with `viewer.role` in the user-facing pages that check it: `assessments`, `training-sessions`, `training-sessions/[id]`, `designer/flipcharts`, `select-barangay`, `home`, `site-header` via `src/app/layout.tsx`, and the training manual preview check;
  - `getRequestFeatureFlags()` resolves with `viewer.role`.
- **UI:**
  - add a "View as" disclosure to the user menu, for admins only, listing BHW, Assessor and Designer;
  - add `src/components/preview/preview-bar.tsx` (§4.4), rendered from `src/app/layout.tsx`;
  - add i18n namespace `preview.*`.
- **Tests:**
  - middleware unit tests: a non-admin's cookie is ignored and deleted; an invalid role is ignored; an admin in preview gets the BHW flags and nav; `/admin` redirects while previewing;
  - `preview-bar.test.tsx`.
- **Done when:** an admin can switch to "View as BHW" and sees the BHW menus and features, with a clear banner and a one-click exit.

### B2. Read-only preview and e2e

- Add `PreviewProvider` (a context fed from `x-app-preview` in the layout) and the hook `usePreview()`.
- Disable the write actions in the user-facing client components: chat send, forum new thread and reply, survey submit, course and quiz answer and progress, training-session enrol, notifications mark-read, and settings save. Add the inline note "Preview only — nothing is saved." Find them all with `grep -rn "supabase.rpc(\|fetch(\"/api" src/components src/app --include=*.tsx`, excluding `admin/`.
- The `/api/*` route handlers return 403 for non-GET requests while previewing. Put this in middleware, keyed on `x-app-preview`.
- **E2E** (`e2e/admin-preview.spec.ts`), using `STABLE_ADMIN`:
  - start View as BHW and see the banner;
  - Admin is not in the nav;
  - a flag disabled for BHW (set by the super admin, restored in `finally`) is hidden;
  - a hidden KB article (from C3) is not listed;
  - the survey submit button is disabled;
  - exit preview returns to `/admin/dashboard`;
  - add an axe pass with the banner showing.
- **Done when:** preview matches what the user type sees for the admin's own scope, and nothing can be saved while previewing.

## 7. Phase C: Content hide, show and archive

### C1. Migration: columns, restrictive policies, one RPC

- **Migration** `..._rft_c1_content_visibility.sql`:
  - add the four columns (§4.5) to `kb_entries`, `kb_articles`, `announcements`, `surveys`, `courses`, `flip_charts` and `forum_threads`, with partial indexes `where hidden_at is null and archived_at is null` where the table is listed by users;
  - add one restrictive `select` policy per table (§4.5). Author clauses:
    - `flip_charts.author_user_id`;
    - `forum_threads.author_user_id` (both verified in the inc13 and inc14 migrations);
    - none for the other tables.
  - backfill `courses status='archived'` and guard `rpc_course_set_status` (§4.5);
  - add `rpc_content_set_visibility` (§4.5);
  - revoke `anon`.
- **Guard existing edit RPCs** so each raises `content archived` when the row is archived:
  - `rpc_kb_entry_update`, `rpc_kb_article_update`;
  - `rpc_survey_set_status`, `rpc_course_set_status`;
  - `rpc_flipchart_review`.

  Do this with `create or replace` and **copy each function's current body from its latest migration** (grep for the newest redefinition, for example inc16 redefines the survey and course set-status functions).
- **Errors.** Map every new error in `mapAdminRpcError`.
- **Tests.**
  - Unit: the error-mapping tests.
  - SQL smoke checks, written as comments in the PR:
    1. as a BHW, a hidden announcement is not returned by REST;
    2. as an admin it is;
    3. archive → restore round-trips;
    4. a plain BHW calling the RPC gets `not authorized`.
- **Done when:** the migration applies, and nothing is hidden yet, so there is no user-visible change.

### C2. User-facing read filters (no visible change)

- Add `src/lib/content/visibility.ts` exporting `withVisible(query)` and `isVisible(row)`.
- Apply them to every user-facing read of the in-scope tables:
  - `src/app/kb/[slug]/page.tsx` and the KB list and search;
  - `src/lib/chat/published-entries.ts`, and any other Chat Guide retrieval queries;
  - `src/app/announcements/page.tsx`;
  - `src/app/surveys/page.tsx` and `surveys/[id]`;
  - `src/app/courses/page.tsx` and `courses/[id]`;
  - `src/app/flipcharts/page.tsx` and `flipcharts/[id]`;
  - `src/app/forum/page.tsx`, `forum/[id]` and `forum/new` (the category picker is unaffected);
  - the home page widgets that list any of these.

  Find them with `grep -rn "from(\"\(kb_entries\|kb_articles\|announcements\|surveys\|courses\|flip_charts\|forum_threads\)\")" src --include=*.ts* | grep -v "/admin/"`.
- A direct link to a hidden or archived item renders the existing not-found state, never an error.
- **Tests.** Unit tests for the helper, and page tests where they already exist (extend their Supabase stubs to include the new columns).
- **Done when:** every user-facing query filters visibility, and admins see no change in `/admin`.

### C3. Shared admin kit and the KB pages

- Build `VisibilityBadge`, `VisibilityActions` and `VisibilityTabs` (§4.5) in `src/components/admin/content-visibility/`, with tests (keyboard, the confirm dialog on Archive, and that an error is shown).
- Wire them into:
  - `/admin/kb/entries`: `src/components/kb/entries-table.tsx`, and the entry page `/admin/kb/entries/[id]`, which becomes read-only when archived;
  - `/admin/kb/articles`: its inline list and `article-form.tsx`.
- Admin list queries select the new columns and filter by tab: Active is `archived_at is null`; Archived is `archived_at is not null`.
- i18n: `admin.visibility.*` (hide, show, archive, restore, confirmArchive, hiddenBadge, archivedBadge, tabs.active, tabs.archived, archivedReadOnly, and the error keys).
- E2E (`kb-authoring.spec.ts`): hide an e2e-created article; the BHW can't see it and the Chat Guide doesn't cite it; show it again; archive and restore it. Use data created by the spec and cleaned up in `finally`.
- **Done when:** KB entries and articles can be hidden, shown, archived and restored from their admin pages.

### C4. Announcements, surveys and courses

- Wire the kit into:
  - `announcements-console.tsx`, keeping Delete but moving it inside the actions menu next to Archive, with a clear warning that it cannot be undone;
  - `surveys-console.tsx`, where an archived survey's results page stays reachable;
  - `courses-console.tsx`, removing any "archived" option from the status control.
- E2E: extend `announcements.spec.ts`, `surveys.spec.ts` and `elearning.spec.ts` with one hide/show case and one archive/restore case each, using spec-created data.
- **Done when:** all three admin pages support hide, show, archive and restore.

### C5. Flipcharts and forum threads, then the final pass

- Wire the kit into:
  - `flipcharts/admin-console.tsx`, for Hide, Show, Archive and Restore on published charts;
  - `forum-console.tsx`, for Archive and Restore on threads, leaving the moderation hide as it is.
- The designer's own console (`designer-console.tsx`) shows a "Hidden by admin" or "Archived" badge on the designer's own charts.
- E2E: extend `flipcharts.spec.ts` and `forum.spec.ts`.
- **Docs:**
  - add a short "Hide, show and archive content" section and a "Feature toggles per user type" section to `docs/deploy-runbook.md` or the admin help;
  - update `README.md:95`, which describes the super-admin line.
- **Done when:** every in-scope admin page supports hide, show, archive and restore, and the docs are updated.

## 8. Out of scope (later, if asked)

- Per-org-unit or per-user feature targeting (D1).
- Hide and archive for KB categories, forum categories, course modules and lessons, training programs and chapters (these have no admin UI today; they are managed by scripts), and training sessions (already have scheduled/completed/cancelled).
- Scheduled visibility (show from or hide after a date).
- Enforcing feature flags inside user write RPCs. Today no user RPC checks flags; gating is at the page and API level. It would be a separate hardening PR adding `feature_enabled_for_current_user(p_key)`.
- Dropping `feature_flags.role_filter`.

## 9. Order and dependencies

```
A1 → A2 → A3
C1 → C2 → C3 → C4
               C3 → C5
A2 + C2 → B1 → B2   (B2's e2e also uses the kit from C3)
```

The recommended serial order is **A1, A2, A3, C1, C2, C3, B1, B2, C4, C5**. Phase A and Phase C up to C2 are independent and may run in parallel sessions. Two migrations must never be in flight at once, so merge A1 before C1 starts, or give C1 a later timestamp.

## 10. Status

| Increment | Status | PR |
|---|---|---|
| A1 Flag roles migration, super-admin-only RPCs | ☑ applied to the pilot | #156 |
| A2 Role-aware flag resolution | ☑ | #156 |
| A3 Flags matrix UI | ☑ | #156 |
| B1 Viewer context, cookie, banner | ☐ | |
| B2 Read-only preview and e2e | ☐ | |
| C1 Content visibility migration | ☑ applied to the pilot | #156 |
| C2 User-facing read filters | ☐ | |
| C3 Admin kit and KB pages | ☐ | |
| C4 Announcements, surveys, courses | ☐ | |
| C5 Flipcharts, forum, docs | ☐ | |

## 11. Kickoff prompt for a Sonnet session

> Implement increment **<ID>** of `docs/role-feature-toggles-plan.md` in jongsky25/bhw-connect-phase-2. First read §2 (decisions), §3 (rules), the §4 design subsections the increment references, and the increment itself in full. Branch `claude/rft-<id>-<slug>` from the latest `main`. Stay strictly within the increment's scope; if something the increment needs is missing or contradicts the code, stop and ask rather than improvising. Run lint, typecheck, unit tests and the touched e2e specs. Tick the increment in §10 in the same PR, then open a draft PR titled "RFT <ID>: <increment title>".
