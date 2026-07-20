# Supabase schema

`migrations/20260720000000_baseline_captured_from_remote.sql` is a captured
baseline of the schema already applied to the project's hosted Supabase
instance (org hierarchy, auth/session RPCs, admin user-management RPCs, and
the KB schema). It was reconstructed from the live database rather than
replayed from the original migration history, closing the gap where that
history existed only in the hosted project and not in version control.

New schema changes should ship as new timestamped files in `migrations/`
from here on, applied with `supabase db push` (or `supabase migration up`
against a local instance) so the repo stays the source of truth per the
delivery plan's portability guardrail (§3): the app must remain deployable
as a plain Node server + Postgres database.
