# FB-3.3d — preferred Home greeting

The owner directed implementation and publication of a saved greeting-name
preference. Report `465fa19e-06bc-4004-afaf-36581b308286` asks for a first or
chosen name instead of the current full-name greeting. The original report was
checked read-only against the pilot; its status remains `new`.

## Behavior

Settings adds a separate “What should we call you?” form with an explicit
Save greeting name button and a Home link. The chosen name applies only to the
Home welcome. A blank saved value clears the preference and restores the
existing full-name greeting. The app does not split names, guess a first name,
change letter case, or update the official profile/certificate name.

The preference persists in the database across sessions/devices. Names allow
Unicode and up to 80 characters; boundary spaces are trimmed and control
characters rejected. The form retains an entry after a failed save and reports
success only after a successful response. Input is disabled during saving.
A failed initial read disables editing and offers reload, preventing accidental
clearing of an unread preference. Home safely falls back to the existing full
name if its preference read is unavailable. Long greetings wrap on phones.

Preview does not fetch personal preferences: Home retains its existing
full-name behavior, and Settings omits the personal form while keeping the
existing preview-aware settings UI. The greeting field is available to all
active account roles and is not a legal/official identity field.

## Access and data boundaries

CLI-generated migration `20261024101555_fb33d_preferred_greeting_name.sql`
creates a private RLS-enabled preference table, linked to users by an
ON DELETE CASCADE foreign key. It starts empty and backfills no guessed names.
PUBLIC/anonymous/authenticated schema/table access is revoked. The two explicit
public RPCs grant execution only to authenticated callers (plus existing
platform owner/service privileges). Each uses an empty search path and the
current authenticated database profile, requires active status, and reads or
writes only that profile's row. Neither accepts a user ID or editable metadata
role claim. Admin callers have the same own-row restriction.

Only the setter changes preferences; clearing deletes only its own row.
Official user rows, auth identities, certificates, grading records, assessment
snapshots and progress are not rewritten. Existing auth middleware/profile
columns and language/display RPC contracts remain unchanged. There is no new
privileged client credential or direct-table client access.

## Verification and release

Database tests load the actual existing current_app_user helper and the new
migration into PGlite. They verify defaults, all four active roles, Unicode and
trimming, bounds/control rejection, owner isolation, admin isolation, clear,
anonymous/inactive/unregistered denial, direct-table denial, ACL/search path,
RLS, immutable official profile/grade fingerprints and FK cleanup behavior.
UI/route tests cover bilingual save, failure/retry, reset, load-failure lockout,
preview no-read/no-edit, authentication and Home fallback. Existing settings
behavior remains covered by its existing suite.

A disposable-backend browser journey saves a chosen name in both languages,
removes browser cookies and signs in again to verify persistence, returns to
Settings to verify the stored value, scans the form in light/dark themes at
320px/XL text, checks unchanged official name/role/org metadata and clears the
preference back to the original full-name greeting. It uses one temporary
local BHW and never runs writes against the pilot.

After green CI and merge, apply the exact additive migration before the new
production build becomes ready. Verify function hashes/signatures/ACL/search
paths, private-table RLS and zero initial preferences; compare complete users
and learner/history fingerprints before/after and inspect advisor changes.
The migration service's generated ledger version is aligned to the repository
version only after verifying the exact newly applied source and row identity.
The PR records CI, migration receipts, exact production readiness and public
auth-gate verification. Signed-in CI evidence is not represented as an
authenticated production-browser check. Rollback can restore the previous
frontend while retaining the unused preference objects; no learner restoration
is required. The report remains open for live comments.
