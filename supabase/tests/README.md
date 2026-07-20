# RLS tests

`rls_org_scope.test.sql` is a pgTAP test proving the INC-1 DoD claim "a BHW
cannot query another org unit's rows." It isn't run by the app's CI (no
Supabase project/Docker Postgres is provisioned there yet) — run it locally
or in a Supabase-project-connected CI job once one exists:

```bash
npx supabase init      # once, if this repo hasn't run it before
npx supabase start     # local Postgres + pgTAP via Docker
npx supabase test db
```
