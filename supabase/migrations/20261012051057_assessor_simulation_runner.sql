-- C1AF-06b: personal fictional rehearsal only. No issuance or learner mutations.
begin;
create table assessor_rollout_private.simulation_runs (
 actor_id uuid not null references public.users(id), program_id uuid not null,
 state jsonb not null, primary key(actor_id,program_id),
 foreign key(program_id) references public.training_programs(id)
);
create table assessor_rollout_private.simulation_requests (
 actor_id uuid not null, program_id uuid not null, request_id uuid not null,
 payload jsonb not null, primary key(actor_id,program_id,request_id),
 foreign key(actor_id,program_id) references assessor_rollout_private.simulation_runs(actor_id,program_id)
);
alter table assessor_rollout_private.simulation_runs enable row level security;
alter table assessor_rollout_private.simulation_requests enable row level security;
revoke all on assessor_rollout_private.simulation_runs,assessor_rollout_private.simulation_requests from public,anon,authenticated;
-- Deliberately independent of official writes/awards. Production activation is separate.
create table assessor_rollout_private.simulation_control (singleton boolean primary key check(singleton), enabled boolean not null default false);
insert into assessor_rollout_private.simulation_control values(true,false);
alter table assessor_rollout_private.simulation_control enable row level security;
revoke all on assessor_rollout_private.simulation_control from public,anon,authenticated;

create function assessor_rollout_private.simulation_state(p_program_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b jsonb; o jsonb; s jsonb; ch uuid;
begin
 b:=assessor_rollout_private.briefing_state(p_program_id);
 if b->>'acknowledgedAt' is null or not exists(select 1 from assessor_rollout_private.simulation_control where enabled) then
  raise exception 'simulation unavailable'; end if;
 select id into ch from public.training_program_chapters where program_id=p_program_id and chapter_key='chapter-1';
 o:=public.rpc_assessor_orientation_state(ch);
 if (o->>'ready')::boolean is distinct from true or (o->>'passed')::boolean is distinct from true then
  raise exception 'finish study, post-test and orientation first'; end if;
 select state into s from assessor_rollout_private.simulation_runs where actor_id=(b->>'actorId')::uuid and program_id=p_program_id;
 return coalesce(s,jsonb_build_object('actorId',b->>'actorId','programInstanceId',p_program_id,'programKey','bhw-reference-manual',
  'chapterKey','chapter-1','requirementsVersion','chapter-1:c1af.draft-1','scenarioId','chapter-1-maria-communication-storyboard',
  'version','1.0.0','revision',0,'next',0,'viewStep',0,'facts','[]'::jsonb,'note','','attempts','{}'::jsonb,'receipt',null));
end; $$;

create function assessor_rollout_private.simulation_act(p_program_id uuid,p_actor_id uuid,p_version text,p_requirements text,
 p_chapter text,p_scenario text,p_revision integer,p_checkpoint text,p_checkpoint_version integer,p_request_id uuid,p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s jsonb; old_payload jsonb; payload jsonb; n integer; kind text; val text; step integer; receipt jsonb;
 checkpoints constant text[]:=array['find-maria','prepare','brief','observe','feedback','missing','readiness','arrange','formal','chapter-gap','final-review'];
 answers constant text[]:=array['maria','cards','practice','prompted','private','no-grade','resolve','new-task','bounded','gap','sample'];
 choices constant jsonb:='[["rosa","maria"],["cards","answers"],["formal","practice"],["independent","prompted","motive"],["group","private"],["fail","no-grade"],["override","resolve"],["reuse","new-task"],["chapter-pass","bounded"],["gap","issue"],["credential","sample"]]';
begin
 s:=assessor_rollout_private.simulation_state(p_program_id);
 if p_actor_id is distinct from (s->>'actorId')::uuid or p_version is distinct from s->>'version'
  or p_requirements is distinct from s->>'requirementsVersion' or p_chapter is distinct from s->>'chapterKey'
  or p_scenario is distinct from s->>'scenarioId' then raise exception 'simulation identity changed'; end if;
 if p_request_id is null or p_action is null or jsonb_typeof(p_action)<>'object' or octet_length(p_action::text)>8000 then raise exception 'invalid action'; end if;
 insert into assessor_rollout_private.simulation_runs values(p_actor_id,p_program_id,s) on conflict do nothing;
 select state into s from assessor_rollout_private.simulation_runs where actor_id=p_actor_id and program_id=p_program_id for update;
 payload:=jsonb_build_object('revision',p_revision,'checkpoint',p_checkpoint,'checkpointVersion',p_checkpoint_version,'action',p_action);
 select r.payload into old_payload from assessor_rollout_private.simulation_requests r
  where actor_id=p_actor_id and program_id=p_program_id and request_id=p_request_id;
 if old_payload is not null then
  if old_payload<>payload then raise exception 'request identity reused'; end if;
  return s;
 end if;
 n:=(s->>'next')::integer; kind:=p_action->>'type'; val:=p_action->>'value'; step:=(s->>'viewStep')::integer;
 if p_checkpoint is distinct from coalesce(checkpoints[n+1],'debrief') or p_checkpoint_version is distinct from 1 then raise exception 'checkpoint out of order'; end if;
 -- Concurrent finish requests return the same immutable receipt, even with an old revision.
 if p_action='{"type":"finish"}'::jsonb and n=11 and s->'receipt'<>'null'::jsonb then return s; end if;
 if p_revision is distinct from (s->>'revision')::integer then raise exception 'reload simulation state'; end if;

 if kind='view' and n=1 and (p_action-'type'-'value')='{}'::jsonb then
  if val is distinct from (array['guide','learner','return'])[step+1] then raise exception 'view out of order'; end if;
  s:=jsonb_set(s,'{viewStep}',to_jsonb(step+1));
 elsif kind='evidence' and n=3 and (p_action-'type'-'facts'-'note')='{}'::jsonb then
  if jsonb_typeof(p_action->'note') is distinct from 'string' or length(p_action->>'note')>1200
   or jsonb_typeof(p_action->'facts') is distinct from 'array' then raise exception 'invalid evidence'; end if;
  if exists(select 1 from jsonb_array_elements(p_action->'facts') f where f not in ('0'::jsonb,'1'::jsonb,'2'::jsonb))
   or (select count(*)<>count(distinct f) from jsonb_array_elements(p_action->'facts') f) then raise exception 'invalid facts'; end if;
  s:=jsonb_set(jsonb_set(s,'{note}',p_action->'note'),'{facts}',p_action->'facts');
 elsif kind='choice' and n<11 and (p_action-'type'-'value')='{}'::jsonb then
  if val is null or not ((choices->n) ? val) then raise exception 'unknown choice'; end if;
  if n=1 and step<>3 then raise exception 'inspect guide, learner view and return first'; end if;
  if n=3 and (jsonb_array_length(s->'facts')<>3 or not ((s->>'note') ~ '[^[:space:]]')) then raise exception 'record observed facts and note first'; end if;
  s:=jsonb_set(s,array['attempts',checkpoints[n+1]],coalesce(s->'attempts'->checkpoints[n+1],'[]'::jsonb)||to_jsonb(val));
  if val=answers[n+1] then s:=jsonb_set(s,'{next}',to_jsonb(n+1)); end if;
 elsif kind='finish' and n=11 and p_action='{"type":"finish"}'::jsonb then
  receipt:=(s-'revision'-'next'-'viewStep'-'facts'-'note'-'attempts'-'receipt')||jsonb_build_object(
   'id',gen_random_uuid(),'completedAt',clock_timestamp(),'serverValidated',true,'checkpointIds',to_jsonb(checkpoints),
   'checkpointVersions','[1,1,1,1,1,1,1,1,1,1,1]'::jsonb);
  s:=jsonb_set(s,'{receipt}',receipt);
 elsif kind='replay' and n=11 and s->'receipt'<>'null'::jsonb and p_action='{"type":"replay"}'::jsonb then
  -- Retain the receipt and all earlier decisions. Replay never resets qualifications.
  s:=s||'{"next":0,"viewStep":0,"facts":[],"note":""}'::jsonb;
 else raise exception 'invalid or out of order action'; end if;
 s:=jsonb_set(s,'{revision}',to_jsonb(p_revision+1));
 update assessor_rollout_private.simulation_runs set state=s where actor_id=p_actor_id and program_id=p_program_id;
 insert into assessor_rollout_private.simulation_requests values(p_actor_id,p_program_id,p_request_id,payload);
 return s;
end; $$;
create function public.rpc_assessor_simulation_state(p_program_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select assessor_rollout_private.simulation_state(p_program_id)$$;
create function public.rpc_assessor_simulation_act(p_program_id uuid,p_actor_id uuid,p_version text,p_requirements text,
 p_chapter text,p_scenario text,p_revision integer,p_checkpoint text,p_checkpoint_version integer,p_request_id uuid,p_action jsonb) returns jsonb
language sql security invoker set search_path='' as $$select assessor_rollout_private.simulation_act(p_program_id,p_actor_id,p_version,p_requirements,p_chapter,p_scenario,p_revision,p_checkpoint,p_checkpoint_version,p_request_id,p_action)$$;
revoke all on function assessor_rollout_private.simulation_state(uuid),public.rpc_assessor_simulation_state(uuid),
 assessor_rollout_private.simulation_act(uuid,uuid,text,text,text,text,integer,text,integer,uuid,jsonb),
 public.rpc_assessor_simulation_act(uuid,uuid,text,text,text,text,integer,text,integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function assessor_rollout_private.simulation_state(uuid),public.rpc_assessor_simulation_state(uuid),
 assessor_rollout_private.simulation_act(uuid,uuid,text,text,text,text,integer,text,integer,uuid,jsonb),
 public.rpc_assessor_simulation_act(uuid,uuid,text,text,text,text,integer,text,integer,uuid,jsonb) to authenticated;
commit;
