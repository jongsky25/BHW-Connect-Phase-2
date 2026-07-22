# Data breach playbook

Backs `docs/delivery-plan.md` §5.4: **NPC notification within 72 h** per
the Philippine Data Privacy Act (DPA) Implementing Rules and Regulations
(IRR). This playbook is the procedure; it doesn't replace legal advice —
loop in counsel or the org's Data Protection Officer (DPO) as step 1 below
says, before any external notification goes out.

## What counts as a reportable breach

Per the DPA IRR, notification to the National Privacy Commission (NPC) and
affected data subjects is required when **all three** are true:

1. Sensitive personal information (or information that could enable
   identity fraud) was involved.
2. There's reason to believe the information was acquired by an
   unauthorized person.
3. The breach is likely to give rise to real risk of serious harm to any
   affected data subject.

For this app, the sensitive fields are: full name, contact number, email,
address (`public.users`), and the content of chat questions (which may
incidentally include health details a BHW typed in). A leaked list of
usernames alone, with no other PII, likely doesn't clear the bar — when in
doubt, treat it as reportable and let the DPO/NPC make the final call
rather than assuming it's below threshold.

## Timeline

| Elapsed | Action |
|---|---|
| 0–1 h | **Contain.** Rotate the leaked credential/key. If it's a compromised admin account, deactivate it (`rpc_admin_set_status`) and force-reset every admin's password in that org unit as a precaution. If it's a Supabase project-level credential (service role key, DB password), rotate it in the Supabase dashboard immediately — every RPC and job in this repo reads it from env/secrets, not a hardcoded value, so rotation doesn't require a code change. |
| 0–4 h | **Assess.** Identify what data was exposed, how many data subjects, and since when. Query `audit_events` and Supabase's own `get_logs`/auth logs for the access pattern. Loop in the DPO / whoever holds that role for the pilot barangay. |
| Within 24 h | **Internal report.** Written incident summary: what happened, what data, how many people, containment actions taken so far. This is the seed of the NPC notification, not a separate document. |
| **Within 72 h** | **Notify the NPC** (per DPA IRR) if the breach clears the threshold above. Use the NPC's official breach notification form/process. Notification must cover: nature of the breach, personal data involved, measures taken to address it, and contact details for follow-up. |
| Within 72 h (same window) | **Notify affected data subjects** if required — in this app's context, that means telling affected BHWs/admins directly (not just posting a notice), in plain language, in their preferred language (`users.language`), covering what happened and what they should do (e.g., "your account was reset, log in with the temporary password we sent"). |
| Ongoing | **Remediate.** Patch the root cause, document it, and add a regression check (test, RLS policy, CI gate) so the same class of issue can't recur silently. |

## Who does what

- **Incident lead** (whoever notices/is assigned first): drives containment
  and the internal timeline above; doesn't wait for a perfect picture
  before starting containment.
- **DPO / privacy contact**: makes the reportability call, owns the NPC
  notification, approves the data-subject notification wording.
- **Technical responder**: rotates credentials, pulls `audit_events`/
  Supabase logs, patches the vulnerability, verifies the fix.

For the pilot's scale (one barangay, a handful of admins), the incident
lead and technical responder are very likely the same person — the roles
are listed separately because the checklist doesn't change with team size,
only who's wearing which hat.

## Immediate technical actions by breach type

- **Leaked Supabase service role key or DB password**: rotate in the
  Supabase dashboard; update `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_DB_URL`
  in GitHub Actions secrets (used by `.github/workflows/retention-purge.yml`
  and `backup.yml`); redeploy if the anon/publishable key also needs
  rotation (it doesn't grant privileged access, but rotate on general
  principle if it was exposed alongside the service key).
- **Compromised admin account**: `rpc_admin_set_status(user_id, 'deactivated')`
  on the account, then `rpc_admin_reset_password` before reactivating.
  Review `audit_events` for that `actor_user_id` since the suspected
  compromise window to see what they did while compromised.
- **Suspected RLS gap** (a user read data outside their scope): the fix is
  a migration correcting the policy — see INC-6's PR history for a real
  precedent (`chat_sessions_admin_read`/`chat_messages_admin_read` were
  found unscoped and fixed in that increment). Run `get_advisors` (security)
  after any RLS change to confirm nothing else regressed.
- **Bulk data exfiltration via a legitimate admin RPC** (e.g. `rpc_admin_export_user_data`
  called far more than normal): the RPC's own `audit_events` row
  (`user.data_exported`) is the evidence trail — check its frequency/actor
  before assuming malice; a spike is still worth a conversation with that
  admin either way.

## Post-incident

Add one line to the risk register (`docs/delivery-plan.md` §9) if the
breach reveals a gap not already listed there, and reference the incident
in the next KB/ops review so it isn't only living in institutional memory.
