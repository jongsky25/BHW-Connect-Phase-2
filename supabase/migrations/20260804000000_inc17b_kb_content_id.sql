-- INC-17b — give kb_entries a stable content identity.
--
-- INC-17's red-flag and clarifier rules reference *content* ids
-- ("m3-very-high-with-symptoms") because that is what the versioned content
-- files under content/kb/hhp-ncd use. But kb_entries.id is a uuid generated at
-- insert time, and /api/chat loads its corpus from the database — so the rule
-- lookup missed every time and the whole conversation layer was inert in
-- production while its unit tests stayed green (the test corpus is built from
-- the content files, where `id` *is* the content id).
--
-- The mapping already existed, but only in content/kb/hhp-ncd/locks/<ref>.json,
-- which is per-project, written by the loader, and unavailable at request time.
-- This moves it into the database where the app can actually read it.

alter table public.kb_entries
  add column if not exists content_id text;

comment on column public.kb_entries.content_id is
  'Stable id from the versioned content files (e.g. m3-very-high-with-symptoms). Null for entries authored by hand in the admin console. Set by scripts/kb-load.mjs.';

-- Partial unique index rather than a unique constraint: hand-authored entries
-- legitimately have no content id, and there will be many of them.
create unique index if not exists kb_entries_content_id_key
  on public.kb_entries (content_id)
  where content_id is not null;

-- No RPC changes. kb_entries_admin_write is `for all` with an admin check
-- (baseline migration), so the loader sets content_id with a direct PostgREST
-- PATCH. Adding a defaulted parameter to rpc_kb_entry_create would create an
-- overload rather than replace the function, and would churn four functions
-- plus their grants to no benefit.
