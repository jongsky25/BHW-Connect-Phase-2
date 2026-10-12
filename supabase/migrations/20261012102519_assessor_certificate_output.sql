begin;
-- Output has its own disclosure gate; no award/write/authority gate changes.
create table assessor_rollout_private.certificate_output_control (
 singleton boolean primary key default true check(singleton),
 public_verification_enabled boolean not null default false
);
insert into assessor_rollout_private.certificate_output_control values(true,false);
alter table assessor_rollout_private.certificate_output_control enable row level security;
revoke all on assessor_rollout_private.certificate_output_control from public,anon,authenticated;

-- V1 captures display facts at issuance, never on a read or from today's
-- profile for an old award. No backfill; absent snapshot means output unavailable.
create table assessor_rollout_private.certificate_display_snapshots (
 award_id uuid primary key references assessor_rollout_private.chapter_awards(id),
 display_version integer not null check(display_version=1),
 holder_name text not null,
 title_fil text not null,
 title_en text not null,
 issuer_organization text not null,
 issuer_signatory text not null,
 issuer_title text not null
);
alter table assessor_rollout_private.certificate_display_snapshots enable row level security;
revoke all on assessor_rollout_private.certificate_display_snapshots from public,anon,authenticated;
create function assessor_rollout_private.capture_certificate_display() returns trigger
language plpgsql security definer set search_path='' as $$
declare holder text; chapter text;
begin
 select full_name into holder from public.users where id=new.actor_id;
 select chapter_key into chapter from public.training_program_chapters where id=new.chapter_id;
 if chapter='chapter-1' and nullif(btrim(holder),'') is not null then
  insert into assessor_rollout_private.certificate_display_snapshots values(new.id,1,holder,
   'BHW Reference Manual — Tagatasa/Tagapagpadaloy, Kabanata 1',
   'BHW Reference Manual — Assessor/Facilitator, Chapter 1',
   new.issuer_snapshot->>'organization',new.issuer_snapshot->>'signatory',new.issuer_snapshot->>'title');
 end if;
 return new;
end; $$;
create trigger capture_certificate_display after insert on assessor_rollout_private.chapter_awards
 for each row execute function assessor_rollout_private.capture_certificate_display();
create function assessor_rollout_private.preserve_certificate_display() returns trigger
language plpgsql set search_path='' as $$
begin raise exception 'certificate display snapshot is immutable'; end; $$;
create trigger preserve_certificate_display before update or delete on assessor_rollout_private.certificate_display_snapshots
 for each row execute function assessor_rollout_private.preserve_certificate_display();

-- Status is always live. Version changes preserve the historical document.
create function assessor_rollout_private.certificate_current_status(p_award_id uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when w.status<>'active' then w.status
  when exists(select 1 from public.assessor_flow_cohort_members m join public.assessor_flow_cohorts c on c.id=m.cohort_id
   where m.user_id=w.actor_id and m.program_id=w.program_id and m.chapter_key=ch.chapter_key
    and c.requirements_version<>w.requirements_version) then 'update_required'
  else 'active' end
 from assessor_rollout_private.chapter_awards w join public.training_program_chapters ch on ch.id=w.chapter_id
 where w.id=p_award_id
$$;

-- Owner-only, current active actual assessor. No supplied actor and no evidence
-- blobs. Historical reads do not require currently published chapter content.
create function assessor_rollout_private.certificate_owner_read(p_certificate_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.users; result jsonb;
begin
 a:=public.current_app_user();
 if a.id is null or a.role<>'assessor' or a.status<>'active'
  or exists(select 1 from public.super_admin_personas where persona_user_id=a.id) then raise exception 'not authorized'; end if;
 if p_certificate_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
 select jsonb_build_object('certificateId',w.certificate_id,'programId',w.program_id,'chapterKey',ch.chapter_key,
  'issuedAt',w.issued_at,'status',assessor_rollout_private.certificate_current_status(w.id),
  'currentPermission',false,'displayVersion',d.display_version,'holderName',d.holder_name,
  'titleFil',d.title_fil,'titleEn',d.title_en,'issuerOrganization',d.issuer_organization,
  'issuerSignatory',d.issuer_signatory,'issuerTitle',d.issuer_title)
 into result from assessor_rollout_private.chapter_awards w
 join public.training_program_chapters ch on ch.id=w.chapter_id
 left join assessor_rollout_private.certificate_display_snapshots d on d.award_id=w.id
 where w.certificate_id=p_certificate_id::uuid and w.actor_id=a.id and ch.chapter_key='chapter-1';
 return result;
end; $$;
create function public.rpc_assessor_certificate_owner(p_certificate_id text) returns jsonb
language sql stable security invoker set search_path='' as $$select assessor_rollout_private.certificate_owner_read(p_certificate_id)$$;

-- Exact identity only, no enumeration. Allow-list deliberately excludes holder
-- name, signatory, internal IDs, approvals, scores and evidence. Disclosure is
-- disabled until separately approved; no settings mutation API is added here.
create function assessor_rollout_private.certificate_verify(p_certificate_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from assessor_rollout_private.certificate_output_control where singleton and public_verification_enabled) then
  return jsonb_build_object('available',false); end if;
 if p_certificate_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  return jsonb_build_object('available',true,'found',false); end if;
 select jsonb_build_object('available',true,'found',true,'certificateType','assessor_facilitator_chapter',
  'certificateId',w.certificate_id,'chapterKey','chapter-1','titleFil',d.title_fil,'titleEn',d.title_en,
  'issuedAt',w.issued_at,'issuerOrganization',d.issuer_organization,
  'status',assessor_rollout_private.certificate_current_status(w.id),'currentPermission',false)
 into result from assessor_rollout_private.chapter_awards w
 join assessor_rollout_private.certificate_display_snapshots d on d.award_id=w.id
 join public.training_program_chapters ch on ch.id=w.chapter_id
 where w.certificate_id=p_certificate_id::uuid and ch.chapter_key='chapter-1';
 return coalesce(result,jsonb_build_object('available',true,'found',false));
end; $$;
create function public.rpc_assessor_certificate_verify(p_certificate_id text) returns jsonb
language sql stable security invoker set search_path='' as $$select assessor_rollout_private.certificate_verify(p_certificate_id)$$;

-- Small owner projection used by all three cards. Includes historical legacy
-- qualifications even if current publication/requirements have disappeared.
create function assessor_rollout_private.certifications_state(p_program_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.users; result jsonb;
begin
 a:=public.current_app_user();
 if a.id is null or a.role<>'assessor' or a.status<>'active'
  or exists(select 1 from public.super_admin_personas where persona_user_id=a.id) then raise exception 'not authorized'; end if;
 if not exists(select 1 from public.training_programs p where p.id=p_program_id and p.content_key='bhw-reference-manual'
  and p.status='published' and (public.current_org_path() like public.org_unit_path(p.org_unit_id)||'%'
   or public.org_unit_path(p.org_unit_id) like public.current_org_path()||'%')) then raise exception 'program unavailable'; end if;
 select jsonb_agg(jsonb_build_object('chapterKey',ch.chapter_key,'publicationAvailable',ch.availability='available' and exists(select 1 from public.courses course where course.id=ch.course_id and course.status='published' and (public.current_org_path() like public.org_unit_path(course.org_unit_id)||'%' or public.org_unit_path(course.org_unit_id) like public.current_org_path()||'%')),'revisedPath',exists(select 1 from public.assessor_flow_cohort_members m join public.assessor_flow_cohorts c on c.id=m.cohort_id where m.user_id=a.id and m.program_id=ch.program_id and m.chapter_key=ch.chapter_key and c.authority_cutover_at is not null),'awards',coalesce((
  select jsonb_agg(jsonb_build_object('certificateId',w.certificate_id,'issuedAt',w.issued_at,
   'status',assessor_rollout_private.certificate_current_status(w.id),'requirementsVersion',w.requirements_version,
   'outputAvailable',exists(select 1 from assessor_rollout_private.certificate_display_snapshots d where d.award_id=w.id))
   order by w.issued_at desc,w.id desc)
  from (select id,certificate_id,issued_at,requirements_version from assessor_rollout_private.chapter_awards
   where actor_id=a.id and chapter_id=ch.id order by issued_at desc,id desc limit 50) w),'[]'::jsonb),
  'legacy',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'status',q.status,'issuedAt',q.issued_at,
   'curriculumVersion',q.curriculum_version,'orientationVersion',q.orientation_version) order by q.issued_at desc,q.id desc)
   from (select id,status,issued_at,curriculum_version,orientation_version from public.assessor_chapter_qualifications
    where assessor_user_id=a.id and chapter_id=ch.id order by issued_at desc,id desc limit 50) q),'[]'::jsonb)))
 into result from public.training_program_chapters ch where ch.program_id=p_program_id
 and ch.chapter_key in ('chapter-1','chapter-2','chapter-3');
 return coalesce(result,'[]'::jsonb);
end; $$;
create function public.rpc_assessor_certifications_state(p_program_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$select assessor_rollout_private.certifications_state(p_program_id)$$;

revoke all on function assessor_rollout_private.capture_certificate_display(),assessor_rollout_private.preserve_certificate_display(),
 assessor_rollout_private.certificate_current_status(uuid),assessor_rollout_private.certificate_owner_read(text),
 assessor_rollout_private.certificate_verify(text),assessor_rollout_private.certifications_state(uuid),
 public.rpc_assessor_certificate_owner(text),public.rpc_assessor_certificate_verify(text),public.rpc_assessor_certifications_state(uuid)
 from public,anon,authenticated;
grant execute on function assessor_rollout_private.certificate_owner_read(text),assessor_rollout_private.certifications_state(uuid),
 public.rpc_assessor_certificate_owner(text),public.rpc_assessor_certifications_state(uuid) to authenticated;
grant usage on schema assessor_rollout_private to anon;
grant execute on function assessor_rollout_private.certificate_verify(text),public.rpc_assessor_certificate_verify(text) to anon,authenticated;
commit;
