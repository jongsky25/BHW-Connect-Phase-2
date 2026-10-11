-- C1AF-04: explicit personal onboarding evidence, not chapter authority.
begin;
create table public.assessor_briefing_acknowledgements (
 assessor_user_id uuid not null references public.users(id),
 program_id uuid not null,
 chapter_key text not null check(chapter_key='chapter-1'),
 requirements_version text not null check(length(btrim(requirements_version))>0),
 briefing_version text not null check(length(btrim(briefing_version))>0),
 language text not null check(language in ('fil','en')),
 acknowledged_at timestamptz not null default now(),
 primary key(assessor_user_id,program_id,chapter_key,requirements_version,briefing_version),
 foreign key(program_id,chapter_key) references public.training_program_chapters(program_id,chapter_key)
);
alter table public.assessor_briefing_acknowledgements enable row level security;
revoke all on public.assessor_briefing_acknowledgements from public,anon,authenticated;
create index assessor_briefing_program_idx on public.assessor_briefing_acknowledgements(program_id,chapter_key);

-- Private definer lookup is needed because neither receipts nor cohort policy
-- tables are exposed directly. Public wrappers remain invoker functions.
create function assessor_rollout_private.briefing_state(p_program_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_policy jsonb; v_at timestamptz;
 v_requirements constant text:='chapter-1:c1af.draft-1';
 v_version constant text:='chapter-1:briefing.v1';
begin
 -- Derives the actual actor, rejects inactive/admin/BHW/persona identities.
 v_policy:=assessor_rollout_private.policy(p_program_id,'chapter-1');
 if v_policy is null or not (v_policy->>'uiEnabled')::boolean
   or v_policy->>'requirementsVersion'<>v_requirements then raise exception 'briefing unavailable'; end if;
 if (select count(*) from public.feature_flags f where f.key in ('elearning','assessor_flow_ui')
   and f.enabled and not ('assessor'=any(coalesce(f.disabled_roles,'{}'::text[]))))<>2 then
  raise exception 'briefing unavailable';
 end if;
 if not exists(select 1 from public.training_programs p join public.training_program_chapters ch on ch.program_id=p.id
   join public.courses c on c.id=ch.course_id
   where p.id=p_program_id and p.content_key='bhw-reference-manual' and p.status='published'
    and ch.chapter_key='chapter-1' and ch.availability='available' and c.status='published') then
  raise exception 'briefing unavailable';
 end if;
 select a.acknowledged_at into v_at from public.assessor_briefing_acknowledgements a
 where a.assessor_user_id=(v_policy->>'actorId')::uuid and a.program_id=p_program_id and a.chapter_key='chapter-1'
   and a.requirements_version=v_requirements and a.briefing_version=v_version;
 return jsonb_build_object('actorId',v_policy->>'actorId','programInstanceId',p_program_id,
   'chapterKey','chapter-1','requirementsVersion',v_requirements,'briefingVersion',v_version,'acknowledgedAt',v_at);
end;
$$;

create function assessor_rollout_private.briefing_acknowledge(p_program_id uuid,p_expected_actor_id uuid,p_requirements_version text,
 p_briefing_version text,p_acknowledged boolean,p_language text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_state jsonb; v_inserted boolean;
begin
 if p_acknowledged is distinct from true then raise exception 'explicit acknowledgement required'; end if;
 if p_language is null or p_language not in ('fil','en') then raise exception 'language invalid'; end if;
 v_state:=assessor_rollout_private.briefing_state(p_program_id);
 if p_expected_actor_id is distinct from (v_state->>'actorId')::uuid then raise exception 'actor changed'; end if;
 if p_requirements_version is distinct from v_state->>'requirementsVersion'
   or p_briefing_version is distinct from v_state->>'briefingVersion' then raise exception 'briefing version changed'; end if;
 insert into public.assessor_briefing_acknowledgements(assessor_user_id,program_id,chapter_key,
   requirements_version,briefing_version,language)
 values((v_state->>'actorId')::uuid,p_program_id,'chapter-1',p_requirements_version,p_briefing_version,p_language)
 on conflict do nothing returning true into v_inserted;
 if v_inserted then
  insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
  values((v_state->>'actorId')::uuid,'assessor_briefing.acknowledged','training_program',p_program_id,
    jsonb_build_object('chapter_key','chapter-1','requirements_version',p_requirements_version,'briefing_version',p_briefing_version,'language',p_language),
    'Kinilala ang panimulang briefing ng Kabanata 1.','Chapter 1 opening briefing acknowledged.');
 end if;
 -- A duplicate or retry returns the original receipt and timestamp.
 return assessor_rollout_private.briefing_state(p_program_id);
end;
$$;
create function public.rpc_assessor_briefing_state(p_program_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select assessor_rollout_private.briefing_state(p_program_id) $$;
create function public.rpc_assessor_briefing_acknowledge(p_program_id uuid,p_expected_actor_id uuid,p_requirements_version text,
 p_briefing_version text,p_acknowledged boolean,p_language text) returns jsonb
language sql security invoker set search_path='' as $$
 select assessor_rollout_private.briefing_acknowledge(p_program_id,p_expected_actor_id,p_requirements_version,p_briefing_version,p_acknowledged,p_language) $$;
revoke execute on function assessor_rollout_private.briefing_state(uuid),
 assessor_rollout_private.briefing_acknowledge(uuid,uuid,text,text,boolean,text),
 public.rpc_assessor_briefing_state(uuid),public.rpc_assessor_briefing_acknowledge(uuid,uuid,text,text,boolean,text)
 from public,anon,authenticated;
grant execute on function assessor_rollout_private.briefing_state(uuid),
 assessor_rollout_private.briefing_acknowledge(uuid,uuid,text,text,boolean,text),
 public.rpc_assessor_briefing_state(uuid),public.rpc_assessor_briefing_acknowledge(uuid,uuid,text,text,boolean,text) to authenticated;
commit;

-- Preserve both assessor and the newer learner-release role scopes after all
-- earlier migrations have replayed. No flag is activated by this change.
create or replace function public.flag_role_scope(p_key text)
returns text[]
language sql immutable
set search_path = public
as $$
  select case p_key
    when 'kb_articles' then array['bhw', 'assessor', 'designer']
    when 'announcements' then array['bhw', 'assessor', 'designer']
    when 'surveys' then array['bhw', 'assessor', 'designer']
    when 'forum' then array['bhw', 'assessor', 'designer']
    when 'notifications' then array['bhw', 'assessor', 'designer']
    when 'offline_pwa' then array['bhw', 'assessor', 'designer']
    when 'chat_conversation' then array['bhw', 'assessor', 'designer']
    when 'elearning' then array['bhw', 'assessor']
    when 'course_sessions' then array['bhw', 'assessor']
    when 'assessor_flow_ui' then array['assessor']
    when 'assessor_flow_writes' then array['assessor']
    when 'assessor_flow_awards' then array['assessor']
    when 'chapter1_assessment_v2' then array['bhw', 'assessor']
    when 'flipcharts' then array['bhw', 'designer']
    else '{}'::text[]
  end;
$$;
revoke execute on function public.flag_role_scope(text) from public, anon;

