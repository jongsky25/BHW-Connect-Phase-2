// Read-only release report. Run the emitted SQL through the authorized database
// connection; this script never connects to or writes to any database itself.
import {pathToFileURL} from 'node:url';
export const releaseReportSql=`with released as (
 select c.id,c.program_id,p.org_unit_id from public.assessor_flow_cohorts c
 join public.training_programs p on p.id=c.program_id
 where c.chapter_key='chapter-1' and p.content_key='bhw-reference-manual'
 and c.authority_cutover_decision_id='c1af28-all-pilot-2026-10-16'
), accounts as (
 select u.id,u.role,r.id cohort_id,
 exists(select 1 from public.super_admin_personas s where s.persona_user_id=u.id) persona,
 exists(select 1 from public.assessor_flow_cohort_members m where m.cohort_id=r.id and m.user_id=u.id) enrolled
 from released r join public.users u on u.status='active' and u.role in ('assessor','bhw')
 and public.org_unit_path(u.org_unit_id) like public.org_unit_path(r.org_unit_id)||'%'
)
select role,count(*) filter(where not persona) eligible,
 count(*) filter(where not persona and enrolled) enrolled,
 count(*) filter(where persona) excluded_personas,
 count(*) filter(where not persona and not enrolled) missing_eligible,
 count(*) filter(where persona and enrolled) unexpected_persona_members
from accounts group by role order by role;`;
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.stdout.write(releaseReportSql+'\n');
