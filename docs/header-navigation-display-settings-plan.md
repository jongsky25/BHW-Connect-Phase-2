# Header navigation, display settings, and Equity branding: phased plan

Prepared 26 September 2026. Status: **approved plan, not yet implemented**. Each increment below is sized for one Sonnet session and one small PR. Work the increments in order; do not merge phases.

## 1. Outcome

1. **A header you can navigate from anywhere.** It has role-aware links, a "More" overflow, a user menu with Settings, Language, Privacy and **Sign out**, and a mobile drawer. Today sign-out and every feature link live only on `/home`.
2. **Display settings like mature apps (GitHub, Office Connect/css-is).**
   - Theme: light, dark or system.
   - Colour palette with **two independent picks**:
     - a *main colour* (buttons and fills: `--color-primary*`);
     - an *accent colour* (links and secondary UI: `--color-secondary`);
     - one-tap preset pairs.
   - Contrast, text size, density and reduced motion.
   - Reading aids: underline links, line spacing, a dyslexia-friendly font.
   - Colour-blind-safe status colours.
   - Reset to defaults.
3. **Equity in Health branding** from the `jongsky25/css-is` repository:
   - the Equity mark logo, recoloured to the active palette;
   - an **Equity Blue** colourway;
   - the credit line "An Equity in Health Section innovation".

Decisions confirmed by the product owner:

- Marigold stays the default main colour. Equity Blue is offered as a choice, alongside more colourways.
- Users can pick the main and accent colours separately ("select multiples").
- Mobile navigation uses a drawer, not a bottom tab bar.
- Reading aids and colour-blind colours ship in this round, as Phase 4.

## 2. Current state (baseline `main` @ c96a2a1)

| Area | Today | File |
|---|---|---|
| Header | App name, username·role pill (not interactive), bell, fil/en toggle. No nav, no user menu, no mobile menu, not sticky | `src/components/site-header.tsx` |
| Feature links | A hard-coded list of role/flag-gated buttons on `/home` only | `src/app/home/page.tsx:61-153` |
| Sign out | Only on `/home` | `src/components/sign-out-button.tsx` |
| Settings | Language, theme (light/dark/system), font scale (md/lg/xl), high contrast; explicit Save | `src/components/settings/settings-form.tsx`, `src/app/settings/page.tsx` |
| Settings storage | `users.a11y_settings` jsonb + `users.language`, via `rpc_update_settings(p_language, p_theme, p_font_scale, p_high_contrast)`. That RPC rebuilds the whole jsonb, so any new key would be wiped | `supabase/migrations/20260724000000_inc7_settings_onboarding.sql:267` |
| Applying settings | Middleware forwards `x-app-a11y`; the root layout sets `data-theme`, `data-font-scale`, `data-contrast` on `<html>` (SSR, no flash) | `src/lib/supabase/middleware.ts:194`, `src/app/layout.tsx:52-64,93` |
| Tokens | `src/styles/tokens.css` is the **only** file allowed to hold hex values. Tailwind maps them in `src/app/globals.css` `@theme inline` | — |
| Token usage | `bg-primary` ×64, `text-on-primary` ×58, `text-secondary` ×40, `border-secondary` ×15. **Secondary is used as text**, so every accent colourway must be text-safe | — |
| Accessibility | No skip link; `<main>` has no id. Axe runs in `e2e/settings.spec.ts` and others | — |
| PWA | `themeColor` hard-coded `#b84e12` | `src/app/layout.tsx:42` |

The Equity brand source is `jongsky25/css-is` → `static/css/app.css:12-115,384-395` (tokens, accents, mask logo) and `templates/dash_layout.html:57-157` (header). The logo asset is **already copied** to `public/brand/equity-mark.png` (2048×672 RGBA). Later sessions do not need access to css-is.

## 3. Rules for every increment (read before starting)

1. **Scope.** Do one increment per session and one PR per increment. Branch: `claude/<phase>-<increment>-<slug>`, e.g. `claude/p1-1-nav-config`. Base it on the latest `main`.
2. **Checks.** Before pushing, run `npm run lint`, `npm run typecheck` and `npm test`. Run the e2e spec(s) you touched when Playwright can run (`npm run e2e -- <spec>`).
3. **Colour values.**
   - Hex values go **only** in `src/styles/tokens.css`.
   - Components use Tailwind token utilities (`bg-primary`, `text-secondary`, `text-ink/70` …).
   - Never add a colour that the contrast test (increment 3.1) has not validated.
4. **Copy.** Every user-visible string goes in **both** `messages/en.json` and `messages/fil.json`. Filipino copy is plain and short (see `docs/training-content-style-guide.md`).
5. **Accessibility.**
   - Every interactive element: minimum 44×44px touch target, visible `focus-visible` outline, keyboard-operable.
   - Menus use the **disclosure pattern** (`<button aria-expanded aria-controls>`), not ARIA `role="menu"`.
   - Esc closes a menu and returns focus to its trigger.
6. **Keep saved settings working.** Old `a11y_settings` rows (`{theme,font_scale,high_contrast}` or `{}`) must parse to sensible defaults. Never break an existing saved preference.
7. **No behaviour drift.** Signed-out pages, super-admin persona bar, notification bell and offline cache clearing on sign-out must keep working.
8. **Status table.** When done, tick the increment in §8 of this doc as part of the same PR.

## 4. Phase 1: Header and navigation

### 1.1 Single nav config (no visual change)

- **Goal:** one source of truth for which links a user sees.
- **Add** `src/lib/nav/nav-items.ts`:
  - Export `type NavItem = { id; href; labelKey; group: "primary" | "more" | "admin"; match?: "exact" | "prefix" }`.
  - Export `getNavItems({ role, flags }): NavItem[]`, reproducing exactly the gating now in `home/page.tsx:61-150`:
    - Chat and KB for all;
    - announcements, surveys, courses, forum and flipcharts behind their flags;
    - assessments and training-sessions for assessors;
    - designer flipcharts for designers;
    - admin for admins;
    - settings for all.
  - Primary group: Home, Chat Guide, Knowledge Base, Courses (when `elearning`). Everything else goes in "more"; admin goes in "admin".
- **Refactor** `home/page.tsx` to render its buttons from `getNavItems` (same order, same classes, same labels).
- **Tests:** `src/lib/nav/nav-items.test.ts` covers each role × flag combination. The existing home tests/e2e stay green.
- **Done when:** the home page looks identical, and the nav list lives in one place.

### 1.2 Header shell: skip link, sticky bar, desktop links

- **Skip link:**
  - Add a "Skip to main content" link as the first focusable element in `src/app/layout.tsx`. It is visually hidden until focused.
  - Set `<main id="main" tabIndex={-1}>`.
- **Restructure `SiteHeader`:**
  - Layout: logo/app-name (left); primary links + "More ▾" (desktop ≥ `md`); right cluster (bell, then placeholders for the user menu and quick-display, filled in 1.3 and 3.5).
  - Sticky: `sticky top-0 z-40`, canvas background, bottom border.
- **New client component** `src/components/nav/nav-link.tsx`:
  - It uses `usePathname()` to set `aria-current="page"` plus an active style (underline bar in `primary-text`).
  - Prefix match for sections: `/kb/foo` activates KB.
- **New** `src/components/nav/more-menu.tsx`: a disclosure dropdown holding the "more" items. Esc and outside-click close it.
- **Signed-out header:** app name + LanguageToggle only (unchanged).
- The header needs `role` and `flags`: pass the flags from `getRequestFeatureFlags()` in the layout, alongside the existing props.
- **Tests:** update `site-header.test.tsx`: links render per role, `aria-current` is set correctly, "More" opens/closes via keyboard.
- **Done when:** on desktop, any page can reach any feature in ≤ 2 clicks.

### 1.3 User menu with sign out

- **New** `src/components/nav/user-menu.tsx`:
  - Trigger: a round initials avatar (from `username`) plus a chevron. Accessible name: the existing `common.signedInAs` string.
  - **Panel:**
    - name and role;
    - Settings (`/settings`);
    - Display (`/settings#display`);
    - Language (inline fil/en segmented control, reusing `LanguageToggle` logic);
    - Privacy (`/privacy`);
    - Help (link to the existing onboarding/help if there is one, otherwise omit);
    - a divider, then **Sign out**.
- **Sign out:**
  - Extract the logic from `sign-out-button.tsx` into a hook `useSignOut()`, so the button and the menu share it: super-admin cookies → `auth.signOut` → `clearOfflineCache` → `/login`.
  - Show a pending state; never double-submit.
- **Header changes:** the old role pill and the standalone LanguageToggle are removed for signed-in users (both now live in the menu). The signed-out header keeps the LanguageToggle.
- **Home page:** keep `SignOutButton` on `/home` for this release (familiar to pilot users); remove it later.
- **Tests:**
  - unit tests for the menu (open/close, Esc returns focus, sign-out calls the hook);
  - update `sign-out-button.test.tsx`;
  - e2e: sign out from the menu on a non-home page lands on `/login`.

### 1.4 Mobile drawer

- **New** `src/components/nav/mobile-drawer.tsx`:
  - Trigger: a ☰ button, visible below `md`, with `aria-label` from messages.
  - It is a native `<dialog>` opened with `showModal()`, which gives a free focus trap, Esc handling and inert background. It slides in from the left and is ≤ 20rem wide.
- **Contents, in order:**
  1. user card (name, role);
  2. primary links;
  3. "More" links;
  4. Admin (if admin);
  5. Settings;
  6. Display;
  7. Language;
  8. Privacy;
  9. **Sign out** at the bottom.
- Items are ≥ 48px tall. The current page is highlighted with `aria-current`. Navigating closes the drawer.
- **Mobile header:** ☰ + logo + bell + avatar. The desktop links are hidden.
- **Tests:** e2e at a 390×844 viewport: open the drawer, Tab stays inside, Esc closes, a link navigates and closes, sign out works. Run axe on the open drawer.

### 1.5 Header polish and a11y pass

- `prefers-reduced-motion` disables drawer/menu transitions.
- Header height is stable across roles, with no layout shift (check `e2e/shell.spec.ts`).
- Axe runs in both themes (light/dark) for the header, drawer and menus.
- Filipino labels have been reviewed and the long ones don't wrap badly at 320px width.
- Update `docs/bhw-manual-navigation.md` if it describes navigation.

## 5. Phase 2: Display settings foundation

### 2.1 Display settings model (types only)

- Extend `src/lib/settings/types.ts`, keeping the `A11ySettings` name and `parseA11ySettings` so the call sites still compile. Add keys:

| Key | Values | Default |
|---|---|---|
| `theme` | `light` \| `dark` \| `system` | `system` |
| `font_scale` | `sm` \| `md` \| `lg` \| `xl` (**adds `sm`**) | `md` |
| `high_contrast` | boolean | `false` |
| `primary_color` | colourway id (see 3.2) | `marigold` |
| `accent_color` | colourway id (see 3.3) | `teal` |
| `density` | `comfortable` \| `compact` | `comfortable` |
| `motion` | `system` \| `reduce` | `system` |
| `underline_links` | boolean | `false` |
| `line_spacing` | `normal` \| `relaxed` | `normal` |
| `reading_font` | `default` \| `hyperlegible` | `default` |
| `colorblind_status` | boolean | `false` |

- Export the allow-lists as `as const` arrays: `primaryColors`, `accentColors` etc. Phase 3/4 add rendering; this increment only adds the model.
- Export `displayAttributes(settings)`. It returns the `<html>` data-attribute map, so it is the single place that maps settings to attributes:
  - omit attributes that equal the default;
  - `data-theme` is omitted for `system`, as today.
- **Tests:** legacy rows parse; invalid values fall back per key; `displayAttributes` gives snapshot-style expectations.

### 2.2 Migration: merge-safe settings RPC

- New migration `supabase/migrations/<timestamp>_display_settings.sql`:
  - `rpc_update_display_settings(p_settings jsonb) returns void`, `security definer`, `set search_path = public`, same auth check as `rpc_update_settings`.
  - Validate **each key against an allow-list** (mirror 2.1 exactly) and reject unknown keys/values with `raise exception 'invalid display setting: <key>'`.
  - **Merge** into the existing jsonb: `a11y_settings = coalesce(a11y_settings,'{}') || p_settings`. Partial updates (e.g. from the quick popover) must not wipe other keys.
  - Emit the same `analytics_events` row style as `rpc_update_settings`.
  - Grant execute to `authenticated` only, matching the existing grants.
  - Update `rpc_update_settings` to also **merge** rather than rebuild, and to accept `sm` for font scale, so the old form can't wipe new keys.
- Update `mapSettingsRpcError` for the new exception text.
- Apply to the Supabase branch/preview per `docs/deploy-runbook.md`. Never apply straight to production from a session.

### 2.3 Apply settings on every page (SSR, signed in and signed out)

- In `layout.tsx`, spread `displayAttributes(a11y)` onto `<html>` instead of the three hand-written attributes.
- **Signed-out users:**
  - Store preferences in a cookie `BHW_DISPLAY` (compact JSON, `path=/; max-age=1y; samesite=lax`).
  - The layout reads it with `parseA11ySettings` when there is no signed-in profile. The profile always wins when signed in.
- Add `color-scheme: light dark` handling in `tokens.css`, so native controls and scrollbars follow the theme.
- `viewport.themeColor`: keep a static value for now. It is made palette-aware in 3.2 via `generateViewport`.
- **Tests:** unit tests for the cookie parse; e2e that a signed-out user choosing dark on `/login` persists across reload.

### 2.4 Settings page restructure

- Split `/settings` into sections with anchored headings:
  - **Language** (`#language`);
  - **Display** (`#display`): theme, contrast, text size (4 steps) for now;
  - **Colours** (`#colours`): placeholder filled in 3.5;
  - **Reading & comfort** (`#reading`): filled in Phase 4;
  - **Reset to defaults**.
- Controls are **radio groups styled as segmented buttons**. Use native `<input type="radio">` inside `<fieldset><legend>`, never div-buttons.
- **Apply instantly** (optimistic): set the `<html>` attribute on change, so the user sees the result immediately, then save through `rpc_update_display_settings` with a debounce. Show "Saved"/error inline with `aria-live="polite"`. On error, revert the attribute. Language keeps its existing flow (it needs a refresh for messages).
- A **preview card** shows a sample button, link, chip, status badges and body text, so users see changes before leaving.
- **Tests:** update `e2e/settings.spec.ts` and the unit tests; axe on the page in light/dark/high-contrast.

## 6. Phase 3: Colour palettes and Equity branding

### 3.1 Contrast guard (do this before adding any colour)

- Add `src/styles/tokens-contrast.test.ts`. It:
  - reads `tokens.css`;
  - resolves each colourway × theme (light, dark, high-contrast light, high-contrast dark);
  - asserts WCAG 2.1 relative-luminance ratios.
- **Main colour fill:** `on-primary` text on `primary` ≥ 4.5:1.
- **Main colour text/border:** `primary-text` on `canvas` ≥ 4.5:1.
- **Accent:** `secondary` on `canvas` ≥ 4.5:1 (it is used as text).
- **Focus ring/UI:** `primary` vs `canvas` ≥ 3:1.
- **Status colours:** each ≥ 4.5:1 on canvas in each theme (existing values must pass as-is).
- Keep the parser simple: a regex over custom-property declarations inside known selectors. Document that new selectors must be added to the test.

### 3.2 Main-colour colourways (`data-primary`)

- **Colourways:** `marigold` (default, current values), `equity` (Equity Blue), `teal`, `emerald`, `violet`, `rose`, `crimson`, `slate`.
- For each colourway, define `--color-primary`, `--color-primary-display`, `--color-primary-text` and `--color-on-primary` under:
  - `:root[data-primary="x"]`;
  - its dark variant (both the `prefers-color-scheme` block and `[data-theme="dark"]`);
  - the high-contrast variants.
- **Starting values (tune until 3.1 passes):**
  - `equity`: fill `#1040a0`, text `#1040a0`, display `#1040a0`, on `#ffffff`. Dark: text/display `#6f9be8`. High contrast: fill/text `#002060`. (Source: css-is `app.css:18,51,70`.)
  - `teal` `#0f7a7a`, `violet` `#6d49c4`, `emerald` `#1f7a4d`, `rose` `#b8325e`, `crimson` `#b3261e`, `slate` `#475569`. Dark variants are lighter tints that pass 4.5:1 on `#221b16`.
- **Palette-aware PWA colour:** switch `layout.tsx` to `generateViewport` and set `themeColor` from a small map in `src/lib/settings/palette.ts` (ids → hex). That map is the one allowed exception, validated by 3.1; add a comment explaining why.
- **Tests:** 3.1 passes for every colourway; a unit test checks the attribute is emitted.

### 3.3 Accent colourways (`data-accent`) and preset pairs

- **Accent colourways** (text-safe, used by `--color-secondary`): `teal` (default, current Bayanihan Teal `#0c7c7e`), `equity`, `marigold` (uses the text-safe marigold), `emerald`, `violet`, `rose`, `slate`.
- **Preset pairs**, exported from `palette.ts`:

| Preset | Main | Accent |
|---|---|---|
| Bayanihan (default) | marigold | teal |
| Equity in Health | equity | marigold |
| Garden | emerald | violet |
| Sunrise | rose | marigold |
| Calm | slate | teal |

  Choosing a preset sets both keys. Changing either key afterwards shows "Custom".
- Same main + accent is allowed but shows a gentle hint ("Main and accent are the same colour. Links may be harder to spot").

### 3.4 Equity branding

- **New** `src/components/brand/equity-mark.tsx`:
  - a `<span role="img" aria-label="Equity in Health">`;
  - it uses the CSS mask technique from css-is, so it recolours with the active main colour: background `var(--color-primary-text)`; mask `url(/brand/equity-mark.png) center/contain no-repeat`; `aspect-ratio: 2048/672`;
  - sizes `sm` (20px), `md` (32px), `lg` (48px);
  - put the mask CSS in `globals.css` as `.equity-mark` (no hex).
- **Placement:**
  - header, left of the app name (`sm`, decorative there: `aria-hidden`, since the app name carries the link text);
  - login page (`lg`, above the form);
  - certificate page `src/app/certificates/[code]/page.tsx` (`md`, check the print styles);
  - footer credit.
- **Footer:** add `footer.credit` = "An Equity in Health Section innovation" / "Isang inobasyon ng Equity in Health Section" (confirm the Filipino wording with the product owner) next to the copyright line.
- **Forced colours:** under `@media (forced-colors: active)`, set the mask background to `CanvasText`, so the logo stays visible in Windows high-contrast mode.
- **Tests:** component unit test; axe; visual check in light/dark/each main colour (Playwright screenshot is fine, not a snapshot assertion).

### 3.5 Colour picker UI and header quick-display popover

- **Settings → Colours:**
  - **Presets row:** cards showing both swatches plus the name.
  - Below the presets: **Main colour** and **Accent colour** radio groups of round swatches (≥ 44px). Each swatch has a visible name under it (colour alone is never the only cue) and a checkmark on the selected swatch.
- **Header quick-display popover:**
  - Trigger: a palette/sun icon button next to the avatar, `aria-label` "Display".
  - Contents: Theme (Light/Dark/System), Preset pair, Text size (A−/A/A+), and a link "More display settings →" to `/settings#display`.
  - Saves via the same debounced partial RPC. Signed out: writes the `BHW_DISPLAY` cookie.
- **Mobile:** the popover content appears as a "Display" section inside the drawer rather than as a separate popover.
- **Tests:** e2e: pick Equity preset → the header logo and buttons recolour → reload persists; keyboard-only operation of the swatch radios.

## 7. Phase 4: Reading and comfort aids

### 4.1 Text size `sm` and density

- `tokens.css`: `[data-font-scale="sm"] { --font-scale: 0.9375; }`.
- `[data-density="compact"]`:
  - define spacing tokens used by list rows/cards: `--space-row`, `--space-card`, defaults matching today's padding;
  - apply them in the few shared list/card components only (`empty-state`, KB list, course cards). Do not touch every page.
  - Compact must still keep 44px touch targets.

### 4.2 Motion, underline links, line spacing

- **Motion:**
  - `data-motion="reduce"` → `*, *::before, *::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; scroll-behavior:auto!important; }`;
  - mirror the same rule under `@media (prefers-reduced-motion: reduce)` for `system`;
  - check Remotion/lesson narration players honour it (pause autoplay).
- **Underline links:** `data-underline-links` → `main a:not([class*="bg-"]) { text-decoration: underline; text-underline-offset: 0.2em; }`. This mirrors GitHub's "Link underlines" setting; exclude button-styled links.
- **Line spacing:** `data-line-spacing="relaxed"` → body `line-height: 1.75`, and `letter-spacing: 0.01em` on prose.

### 4.3 Dyslexia-friendly font

- Load **Atkinson Hyperlegible** via `next/font/google` with `preload: false` and `display: "swap"`, exposed as `--font-reading`.
- `data-reading-font="hyperlegible"` → `--font-sans: var(--font-reading)`.
- Check the Filipino diacritics and the KB/lesson prose. Measure the bundle impact on first load with Lighthouse (`lighthouserc.js`); it must not regress the budget.

### 4.4 Colour-blind-safe status colours

- `data-colorblind-status` swaps `--color-success/warning/danger/info` to a blue/orange-based set, in the style of the Okabe-Ito palette. Tune it until 3.1 passes in every theme.
- Status UI must already pair colour with an icon or label. Audit admin status chips and quiz feedback, and add an icon or label where colour is the only signal.

### 4.5 Reset, docs, final matrix

- **Reset to defaults:** a confirm dialog, then an RPC with the full default object. Signed out: clear the cookie.
- **Tests:** e2e matrix of axe across `{light, dark} × {standard, high contrast} × {marigold/teal, equity/marigold}`. Also a 320px width pass.
- **Docs:** update `docs/requirements-and-vision.md` §5 to record which adaptive settings shipped, and add a short "Display settings" section to the user-facing help/onboarding if one exists.

## 8. Status

| Increment | Status | PR |
|---|---|---|
| 1.1 Nav config | ☑ | #128 |
| 1.2 Header shell | ☑ | |
| 1.3 User menu + sign out | ☑ | |
| 1.4 Mobile drawer | ☑ | |
| 1.5 Header a11y pass | ☑ | |
| 2.1 Settings model | ☑ | #129 |
| 2.2 Settings RPC migration | ☑ | #144 |
| 2.3 Apply everywhere (SSR + cookie) | ☑ | #145 |
| 2.4 Settings page restructure | ☑ | |
| 3.1 Contrast guard test | ☐ | |
| 3.2 Main colourways + Equity Blue | ☐ | |
| 3.3 Accent colourways + presets | ☐ | |
| 3.4 Equity mark + credit | ☐ | |
| 3.5 Colour picker + quick popover | ☐ | |
| 4.1 Text `sm` + density | ☐ | |
| 4.2 Motion, underline, spacing | ☐ | |
| 4.3 Dyslexia-friendly font | ☐ | |
| 4.4 Colour-blind status colours | ☐ | |
| 4.5 Reset, docs, final matrix | ☐ | |

Dependencies:

- 1.1 → 1.2 → 1.3 → 1.4 → 1.5;
- 2.1 → 2.2 → 2.3 → 2.4;
- 3.1 before 3.2–3.4; 3.5 needs 2.4 and 3.3;
- Phase 4 needs 2.4 and 3.1.

Phases 1 and 2 are independent and may run in parallel sessions.

## 9. Kickoff prompt for a Sonnet session

> Implement increment **X.Y** of `docs/header-navigation-display-settings-plan.md` in jongsky25/bhw-connect-phase-2. Read §3 (rules) and the increment in full first. Branch `claude/pX-Y-<slug>` from the latest `main`. Stay strictly within the increment's scope. Run lint, typecheck, unit tests and the touched e2e specs. Tick the increment in §8 in the same PR, then open a draft PR titled "X.Y: <increment title>".
