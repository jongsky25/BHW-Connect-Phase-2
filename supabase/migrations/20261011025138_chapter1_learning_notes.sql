-- Private, optional learner notes and explicit reviewer assignments.
create table learner_assessment_private.reviewer_assignments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  assigned_by uuid not null references public.users(id),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index chapter1_one_active_reviewer
  on learner_assessment_private.reviewer_assignments(learner_id, course_id) where ended_at is null;
create index chapter1_reviewer_queue
  on learner_assessment_private.reviewer_assignments(reviewer_id, assigned_at desc) where ended_at is null;

create table learner_assessment_private.reflection_drafts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  scope_key text not null,
  insight text not null default '' check (char_length(insight) <= 1000),
  lesson_feedback text not null default '' check (char_length(lesson_feedback) <= 1000),
  language text not null check (language in ('en','fil')),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  unique(learner_id, course_id, scope_key)
);
create table learner_assessment_private.reflection_versions (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references learner_assessment_private.reflection_drafts(id) on delete cascade,
  version integer not null check (version > 0),
  draft_revision bigint not null check (draft_revision > 0),
  insight text not null check (char_length(insight) <= 1000),
  lesson_feedback text not null check (char_length(lesson_feedback) <= 1000),
  language text not null check (language in ('en','fil')),
  after_checkpoint_feedback boolean not null default false,
  shared_at timestamptz not null default now(),
  author_id uuid not null references public.users(id),
  unique(draft_id, version),
  unique(draft_id, draft_revision),
  check (btrim(insight) <> '' or btrim(lesson_feedback) <> '')
);
create table learner_assessment_private.reflection_reviews (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references learner_assessment_private.reflection_versions(id) on delete cascade,
  reviewer_id uuid not null references public.users(id),
  status text not null check (status in ('Reviewed','Follow-up needed','Responded')),
  reply text not null default '' check (char_length(reply) <= 1000),
  created_at timestamptz not null default now(),
  check (status <> 'Responded' or btrim(reply) <> '')
);
create index chapter1_note_review_history on learner_assessment_private.reflection_reviews(version_id, created_at);
create table learner_assessment_private.note_receipts (
  learner_id uuid not null references public.users(id) on delete cascade,
  mutation_id uuid not null,
  payload_hash text not null,
  result jsonb not null,
  primary key(learner_id, mutation_id)
);

alter table learner_assessment_private.reviewer_assignments enable row level security;
alter table learner_assessment_private.reflection_drafts enable row level security;
alter table learner_assessment_private.reflection_versions enable row level security;
alter table learner_assessment_private.reflection_reviews enable row level security;
alter table learner_assessment_private.note_receipts enable row level security;
revoke all on learner_assessment_private.reviewer_assignments,
  learner_assessment_private.reflection_drafts, learner_assessment_private.reflection_versions,
  learner_assessment_private.reflection_reviews, learner_assessment_private.note_receipts
  from public, anon, authenticated;
grant select, insert, update on learner_assessment_private.reviewer_assignments,
  learner_assessment_private.reflection_drafts, learner_assessment_private.reflection_versions,
  learner_assessment_private.reflection_reviews, learner_assessment_private.note_receipts to service_role;

create trigger reflection_version_immutable before update
  on learner_assessment_private.reflection_versions for each row
  execute function learner_assessment_private.reject_form_mutation();
create trigger reflection_reply_immutable before update
  on learner_assessment_private.reflection_reviews for each row
  execute function learner_assessment_private.reject_form_mutation();

create function learner_assessment_private.valid_note_scope(p_course_id uuid, p_scope text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_scope in ('entry','chapter') or
    (p_scope like 'lesson:%' and exists(select 1 from public.course_lessons l
      join public.course_modules m on m.id = l.module_id
      where m.course_id = p_course_id and l.lesson_key = substring(p_scope from 8)
        and l.published_revision_id is not null)) or
    (p_scope ~ '^group:G(0[1-9]|1[0-2])$');
$$;
revoke execute on function learner_assessment_private.valid_note_scope(uuid, text) from public, anon, authenticated;

create function public.rpc_learning_notes_save(
  p_course_id uuid, p_scope_key text, p_expected_revision bigint, p_mutation_id uuid,
  p_insight text, p_lesson_feedback text, p_language text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_draft learner_assessment_private.reflection_drafts;
  v_receipt learner_assessment_private.note_receipts; v_hash text; v_result jsonb;
begin
  v_actor := learner_assessment_private.actor_for_course(p_course_id);
  if p_mutation_id is null or p_expected_revision is null or p_language not in ('en','fil')
    or not learner_assessment_private.valid_note_scope(p_course_id, p_scope_key)
    or char_length(coalesce(p_insight, '')) > 1000
    or char_length(coalesce(p_lesson_feedback, '')) > 1000 then
    raise exception 'invalid learning note';
  end if;
  v_hash := pg_catalog.md5(jsonb_build_array(p_course_id,p_scope_key,p_expected_revision,
    p_insight,p_lesson_feedback,p_language)::text);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || p_course_id::text || p_scope_key, 0));
  select * into v_receipt from learner_assessment_private.note_receipts
    where learner_id = v_actor and mutation_id = p_mutation_id;
  if v_receipt.learner_id is not null then
    if v_receipt.payload_hash <> v_hash then raise exception 'mutation ID reused with different payload'; end if;
    return v_receipt.result;
  end if;
  select * into v_draft from learner_assessment_private.reflection_drafts
    where learner_id = v_actor and course_id = p_course_id and scope_key = p_scope_key for update;
  if v_draft.id is null then
    if not exists(select 1 from public.feature_flags where key='chapter1_assessment_v2'
      and enabled and not ('bhw'=any(disabled_roles))) then
      raise exception 'new learning notes unavailable';
    end if;
    if p_expected_revision <> 0 then raise exception 'stale learning note revision'; end if;
    insert into learner_assessment_private.reflection_drafts(learner_id,course_id,scope_key,
      insight,lesson_feedback,language)
      values(v_actor,p_course_id,p_scope_key,coalesce(p_insight,''),coalesce(p_lesson_feedback,''),p_language)
      returning * into v_draft;
  else
    if v_draft.revision <> p_expected_revision then raise exception 'stale learning note revision'; end if;
    update learner_assessment_private.reflection_drafts
      set insight=coalesce(p_insight,''),lesson_feedback=coalesce(p_lesson_feedback,''),
        language=p_language,revision=revision+1,updated_at=now()
      where id=v_draft.id returning * into v_draft;
  end if;
  v_result := jsonb_build_object('id',v_draft.id,'scope_key',v_draft.scope_key,
    'insight',v_draft.insight,'lesson_feedback',v_draft.lesson_feedback,
    'language',v_draft.language,'revision',v_draft.revision);
  insert into learner_assessment_private.note_receipts values(v_actor,p_mutation_id,v_hash,v_result);
  return v_result;
end;
$$;
revoke execute on function public.rpc_learning_notes_save(uuid,text,bigint,uuid,text,text,text) from public,anon;
grant execute on function public.rpc_learning_notes_save(uuid,text,bigint,uuid,text,text,text) to authenticated;

create function public.rpc_learning_notes_share(
  p_course_id uuid, p_scope_key text, p_expected_revision bigint, p_mutation_id uuid,
  p_after_checkpoint_feedback boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_draft learner_assessment_private.reflection_drafts;
  v_receipt learner_assessment_private.note_receipts; v_version learner_assessment_private.reflection_versions;
  v_hash text; v_result jsonb; v_next integer;
begin
  v_actor := learner_assessment_private.actor_for_course(p_course_id);
  if p_mutation_id is null or p_expected_revision is null then raise exception 'invalid share request'; end if;
  v_hash := pg_catalog.md5(jsonb_build_array(p_course_id,p_scope_key,p_expected_revision,p_after_checkpoint_feedback)::text);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || p_course_id::text || p_scope_key, 0));
  select * into v_receipt from learner_assessment_private.note_receipts
    where learner_id=v_actor and mutation_id=p_mutation_id;
  if v_receipt.learner_id is not null then
    if v_receipt.payload_hash <> v_hash then raise exception 'mutation ID reused with different payload'; end if;
    return v_receipt.result;
  end if;
  select * into v_draft from learner_assessment_private.reflection_drafts
    where learner_id=v_actor and course_id=p_course_id and scope_key=p_scope_key for update;
  if v_draft.id is null or v_draft.revision <> p_expected_revision then raise exception 'stale learning note revision'; end if;
  if btrim(v_draft.insight) = '' and btrim(v_draft.lesson_feedback) = '' then
    v_result := jsonb_build_object('shared',false,'reason','empty');
  else
    select * into v_version from learner_assessment_private.reflection_versions
      where draft_id=v_draft.id and draft_revision=v_draft.revision;
    if v_version.id is null then
      select coalesce(max(version),0)+1 into v_next from learner_assessment_private.reflection_versions
        where draft_id=v_draft.id;
      insert into learner_assessment_private.reflection_versions(draft_id,version,draft_revision,insight,lesson_feedback,
        language,after_checkpoint_feedback,author_id)
        values(v_draft.id,v_next,v_draft.revision,v_draft.insight,v_draft.lesson_feedback,v_draft.language,
          p_after_checkpoint_feedback,v_actor) returning * into v_version;
    end if;
    v_result := jsonb_build_object('shared',true,'version_id',v_version.id,'version',v_version.version);
  end if;
  insert into learner_assessment_private.note_receipts values(v_actor,p_mutation_id,v_hash,v_result);
  return v_result;
end;
$$;
revoke execute on function public.rpc_learning_notes_share(uuid,text,bigint,uuid,boolean) from public,anon;
grant execute on function public.rpc_learning_notes_share(uuid,text,bigint,uuid,boolean) to authenticated;

create function public.rpc_learning_notes_own(p_course_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_drafts jsonb; v_shared jsonb; v_reviewer jsonb;
begin
  v_actor := learner_assessment_private.owner_id();
  select coalesce(jsonb_agg(jsonb_build_object('scope_key',scope_key,'insight',insight,
    'lesson_feedback',lesson_feedback,'language',language,'revision',revision)
    order by updated_at desc),'[]'::jsonb) into v_drafts
    from learner_assessment_private.reflection_drafts where learner_id=v_actor and course_id=p_course_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'scope_key',d.scope_key,'version',v.version,
    'insight',v.insight,'lesson_feedback',v.lesson_feedback,'language',v.language,
    'shared_at',v.shared_at,'author_id',v.author_id,
    'reviews',(select coalesce(jsonb_agg(jsonb_build_object('status',r.status,'reply',r.reply,
      'reviewer_id',r.reviewer_id,'created_at',r.created_at) order by r.created_at),'[]'::jsonb)
      from learner_assessment_private.reflection_reviews r where r.version_id=v.id))
    order by v.shared_at desc),'[]'::jsonb) into v_shared
    from learner_assessment_private.reflection_versions v
    join learner_assessment_private.reflection_drafts d on d.id=v.draft_id
    where d.learner_id=v_actor and d.course_id=p_course_id;
  select jsonb_build_object('id',a.reviewer_id,'name',u.full_name) into v_reviewer
    from learner_assessment_private.reviewer_assignments a
    join public.users u on u.id=a.reviewer_id
    where a.learner_id=v_actor and a.course_id=p_course_id and a.ended_at is null;
  return jsonb_build_object('drafts',v_drafts,'shared',v_shared,'reviewer',v_reviewer);
end;
$$;
revoke execute on function public.rpc_learning_notes_own(uuid) from public,anon;
grant execute on function public.rpc_learning_notes_own(uuid) to authenticated;

create function public.rpc_learning_reviewer_assign(p_learner_id uuid, p_course_id uuid, p_reviewer_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin public.users; v_learner public.users; v_reviewer public.users;
  v_course public.courses; v_active learner_assessment_private.reviewer_assignments;
begin
  select * into v_admin from public.current_app_user();
  select * into v_learner from public.users where id=p_learner_id;
  select * into v_course from public.courses where id=p_course_id;
  if v_admin.id is null or v_admin.role <> 'admin' or v_admin.status <> 'active'
    or v_learner.id is null or v_learner.role <> 'bhw'
    or v_course.id is null or v_course.status <> 'published'
    or public.org_unit_path(v_learner.org_unit_id) not like public.current_org_path() || '%'
    or public.org_unit_path(v_course.org_unit_id) not like public.current_org_path() || '%'
    or not exists(select 1 from public.training_program_chapters ch
      join public.training_programs p on p.id=ch.program_id
      where ch.course_id=p_course_id and ch.chapter_key='chapter-1'
        and p.content_key='bhw-reference-manual') then
    raise exception 'not authorized';
  end if;
  if p_reviewer_id is not null then
    select * into v_reviewer from public.users where id=p_reviewer_id;
    if v_reviewer.id is null or v_reviewer.role <> 'assessor' or v_reviewer.status <> 'active'
      or public.org_unit_path(v_learner.org_unit_id) not like public.org_unit_path(v_reviewer.org_unit_id) || '%'
      or public.org_unit_path(v_reviewer.org_unit_id) not like public.current_org_path() || '%' then
      raise exception 'reviewer is not eligible';
    end if;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_learner_id::text || p_course_id::text, 0));
  select * into v_active from learner_assessment_private.reviewer_assignments
    where learner_id=p_learner_id and course_id=p_course_id and ended_at is null for update;
  if v_active.id is not null and v_active.reviewer_id = p_reviewer_id then
    return jsonb_build_object('reviewer_id',p_reviewer_id,'changed',false);
  end if;
  update learner_assessment_private.reviewer_assignments set ended_at=now()
    where learner_id=p_learner_id and course_id=p_course_id and ended_at is null;
  if p_reviewer_id is not null then
    insert into learner_assessment_private.reviewer_assignments(learner_id,course_id,reviewer_id,assigned_by)
      values(p_learner_id,p_course_id,p_reviewer_id,v_admin.id);
  end if;
  return jsonb_build_object('reviewer_id',p_reviewer_id,'changed',true);
end;
$$;
revoke execute on function public.rpc_learning_reviewer_assign(uuid,uuid,uuid) from public,anon;
grant execute on function public.rpc_learning_reviewer_assign(uuid,uuid,uuid) to authenticated;

create function public.rpc_learning_notes_reviewer(p_learner_id uuid, p_course_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor public.users; v_shared jsonb;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role <> 'assessor' or v_actor.status <> 'active'
    or not exists(select 1 from learner_assessment_private.reviewer_assignments a
      join public.users u on u.id=a.learner_id
      where a.learner_id=p_learner_id and a.course_id=p_course_id
        and a.reviewer_id=v_actor.id and a.ended_at is null
        and public.org_unit_path(u.org_unit_id) like public.org_unit_path(v_actor.org_unit_id) || '%') then
    raise exception 'not authorized';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'scope_key',d.scope_key,'version',v.version,
    'insight',v.insight,'lesson_feedback',v.lesson_feedback,'language',v.language,
    'shared_at',v.shared_at,'author_id',v.author_id,
    'reviews',(select coalesce(jsonb_agg(jsonb_build_object('status',r.status,'reply',r.reply,
      'created_at',r.created_at) order by r.created_at),'[]'::jsonb)
      from learner_assessment_private.reflection_reviews r where r.version_id=v.id))
    order by v.shared_at desc),'[]'::jsonb) into v_shared
    from learner_assessment_private.reflection_versions v
    join learner_assessment_private.reflection_drafts d on d.id=v.draft_id
    where d.learner_id=p_learner_id and d.course_id=p_course_id;
  return jsonb_build_object('shared',v_shared);
end;
$$;
revoke execute on function public.rpc_learning_notes_reviewer(uuid,uuid) from public,anon;
grant execute on function public.rpc_learning_notes_reviewer(uuid,uuid) to authenticated;

create function public.rpc_learning_notes_reply(p_version_id uuid, p_status text, p_reply text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor public.users; v_version learner_assessment_private.reflection_versions;
  v_draft learner_assessment_private.reflection_drafts; v_review learner_assessment_private.reflection_reviews;
begin
  select * into v_actor from public.current_app_user();
  select * into v_version from learner_assessment_private.reflection_versions where id=p_version_id;
  if v_version.id is null then raise exception 'shared note not found'; end if;
  select * into v_draft from learner_assessment_private.reflection_drafts where id=v_version.draft_id;
  if v_actor.id is null or v_actor.role <> 'assessor' or v_actor.status <> 'active'
    or p_status not in ('Reviewed','Follow-up needed','Responded')
    or char_length(coalesce(p_reply,'')) > 1000
    or (p_status='Responded' and btrim(coalesce(p_reply,''))='')
    or not exists(select 1 from learner_assessment_private.reviewer_assignments a
      join public.users u on u.id=a.learner_id
      where a.learner_id=v_draft.learner_id and a.course_id=v_draft.course_id
        and a.reviewer_id=v_actor.id and a.ended_at is null
        and public.org_unit_path(u.org_unit_id) like public.org_unit_path(v_actor.org_unit_id) || '%') then
    raise exception 'not authorized';
  end if;
  insert into learner_assessment_private.reflection_reviews(version_id,reviewer_id,status,reply)
    values(p_version_id,v_actor.id,p_status,coalesce(p_reply,'')) returning * into v_review;
  return jsonb_build_object('id',v_review.id,'status',v_review.status,'reply',v_review.reply,
    'version_id',v_version.id);
end;
$$;
revoke execute on function public.rpc_learning_notes_reply(uuid,text,text) from public,anon;
grant execute on function public.rpc_learning_notes_reply(uuid,text,text) to authenticated;

create function public.rpc_learning_notes_queue(p_course_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor public.users; v_queue jsonb;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role <> 'assessor' or v_actor.status <> 'active' then
    raise exception 'not authorized';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('learner_id',a.learner_id,
    'learner_name',u.full_name,'shared_count',(
      select count(*) from learner_assessment_private.reflection_versions v
      join learner_assessment_private.reflection_drafts d on d.id=v.draft_id
      where d.learner_id=a.learner_id and d.course_id=a.course_id))
    order by u.full_name),'[]'::jsonb) into v_queue
    from learner_assessment_private.reviewer_assignments a
    join public.users u on u.id=a.learner_id
    where a.course_id=p_course_id and a.reviewer_id=v_actor.id and a.ended_at is null
      and public.org_unit_path(u.org_unit_id) like public.org_unit_path(v_actor.org_unit_id) || '%';
  return v_queue;
end;
$$;
revoke execute on function public.rpc_learning_notes_queue(uuid) from public,anon;
grant execute on function public.rpc_learning_notes_queue(uuid) to authenticated;

create function public.rpc_learning_reviewer_assignment_state(p_learner_id uuid, p_course_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_admin public.users; v_learner public.users; v_course public.courses;
  v_assignment jsonb;
begin
  select * into v_admin from public.current_app_user();
  select * into v_learner from public.users where id=p_learner_id;
  select * into v_course from public.courses where id=p_course_id;
  if v_admin.id is null or v_admin.role <> 'admin' or v_admin.status <> 'active'
    or v_learner.id is null or v_course.id is null
    or public.org_unit_path(v_learner.org_unit_id) not like public.current_org_path() || '%'
    or public.org_unit_path(v_course.org_unit_id) not like public.current_org_path() || '%' then
    raise exception 'not authorized';
  end if;
  select jsonb_build_object('reviewer_id',a.reviewer_id,'reviewer_name',u.full_name)
    into v_assignment from learner_assessment_private.reviewer_assignments a
    join public.users u on u.id=a.reviewer_id
    where a.learner_id=p_learner_id and a.course_id=p_course_id and a.ended_at is null;
  return jsonb_build_object('learner_id',p_learner_id,'reviewer',v_assignment);
end;
$$;
revoke execute on function public.rpc_learning_reviewer_assignment_state(uuid,uuid) from public,anon;
grant execute on function public.rpc_learning_reviewer_assignment_state(uuid,uuid) to authenticated;
