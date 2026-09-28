-- AF-02: personal assessor study only. Never touches BHW course_progress,
-- assessment queues, certificates, exams, orientation or qualifications.
begin;
create schema if not exists assessor_private;
revoke all on schema assessor_private from public,anon,authenticated;
create table public.assessor_lesson_progress (
  assessor_user_id uuid not null references public.users(id),
  chapter_id uuid not null references public.training_program_chapters(id),
  lesson_id uuid not null references public.course_lessons(id),
  revision_id uuid not null,
  completed_at timestamptz not null default now(),
  primary key(assessor_user_id,chapter_id,lesson_id,revision_id),
  foreign key(revision_id,lesson_id) references public.course_lesson_revisions(id,lesson_id)
);
create table public.assessor_lesson_resume (
  assessor_user_id uuid not null references public.users(id),
  chapter_id uuid not null references public.training_program_chapters(id),
  lesson_id uuid not null references public.course_lessons(id),
  revision_id uuid not null,
  modality text not null check(modality in ('read','slides')),
  language text not null check(language in ('fil','en')),
  position_key text not null,
  concept_id text not null,
  updated_at timestamptz not null default now(),
  primary key(assessor_user_id,chapter_id,lesson_id,modality),
  foreign key(revision_id,lesson_id) references public.course_lesson_revisions(id,lesson_id)
);
create index assessor_lesson_progress_chapter_idx on public.assessor_lesson_progress(chapter_id);
create index assessor_lesson_progress_revision_idx on public.assessor_lesson_progress(revision_id,lesson_id);
create index assessor_lesson_progress_lesson_idx on public.assessor_lesson_progress(lesson_id);
create index assessor_lesson_resume_lesson_idx on public.assessor_lesson_resume(lesson_id);
create index assessor_lesson_resume_chapter_idx on public.assessor_lesson_resume(chapter_id);
create index assessor_lesson_resume_revision_idx on public.assessor_lesson_resume(revision_id,lesson_id);
alter table public.assessor_lesson_progress enable row level security;
alter table public.assessor_lesson_resume enable row level security;
create policy assessor_study_progress_read on public.assessor_lesson_progress for select to authenticated using (
  assessor_user_id=(select u.id from public.current_app_user() u where u.status='active' and u.role='assessor')
);
create policy assessor_study_resume_read on public.assessor_lesson_resume for select to authenticated using (
  assessor_user_id=(select u.id from public.current_app_user() u where u.status='active' and u.role='assessor')
);
revoke all on public.assessor_lesson_progress,public.assessor_lesson_resume from public,anon,authenticated;
grant select on public.assessor_lesson_progress,public.assessor_lesson_resume to authenticated;

-- Internal helper: resolve the actual authenticated actor, never a client user id.
-- The existing visibility helper enforces course/program geography and publication.
create function assessor_private.study_context(p_chapter_id uuid,p_lesson_id uuid,p_revision_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.users;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role<>'assessor' or v_actor.status<>'active' then raise exception 'not authorized'; end if;
  if not exists (
    select 1 from public.training_program_chapters ch
    join public.training_programs p on p.id=ch.program_id
    join public.course_modules m on m.course_id=ch.course_id
    join public.course_lessons l on l.module_id=m.id
    where ch.id=p_chapter_id and p.content_key='bhw-reference-manual'
      and ch.chapter_key in ('chapter-1','chapter-2')
      and l.id=p_lesson_id and l.published_revision_id=p_revision_id
  ) or not public.training_lesson_visible(p_lesson_id) then
    raise exception 'chapter or lesson unavailable; reload the lesson';
  end if;
  return v_actor.id;
end;
$$;
create function public.rpc_assessor_lesson_complete(p_chapter_id uuid,p_lesson_id uuid,p_revision_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid;
begin
  v_actor:=assessor_private.study_context(p_chapter_id,p_lesson_id,p_revision_id);
  -- Match the publisher's module lock order, then validate after locking.
  perform 1 from public.course_modules m join public.course_lessons l on l.module_id=m.id
    where l.id=p_lesson_id for share of m;
  perform 1 from public.course_lessons where id=p_lesson_id for share;
  v_actor:=assessor_private.study_context(p_chapter_id,p_lesson_id,p_revision_id);
  insert into public.assessor_lesson_progress(assessor_user_id,chapter_id,lesson_id,revision_id)
    values(v_actor,p_chapter_id,p_lesson_id,p_revision_id) on conflict do nothing;
end;
$$;
create function public.rpc_assessor_lesson_resume(p_chapter_id uuid,p_lesson_id uuid,p_revision_id uuid,p_modality text,p_language text,p_position_key text,p_concept_id text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid; v_content jsonb;
begin
  if p_modality is null or p_modality not in ('read','slides') or p_language is null or p_language not in ('fil','en') then
    raise exception 'invalid lesson mode or language'; end if;
  v_actor:=assessor_private.study_context(p_chapter_id,p_lesson_id,p_revision_id);
  select case when p_modality='read' then read_sections else slides end into v_content
    from public.course_lesson_revisions where id=p_revision_id;
  if not exists(select 1 from jsonb_array_elements(v_content) item
    where item->>'id'=p_position_key and (item->'concept_ids') ? p_concept_id) then
    raise exception 'position and concept must belong to the current lesson revision'; end if;
  -- Bookmarks are lock-free, like BHW bookmarks. The reader ignores old revisions.
  insert into public.assessor_lesson_resume(assessor_user_id,chapter_id,lesson_id,revision_id,modality,language,position_key,concept_id)
    values(v_actor,p_chapter_id,p_lesson_id,p_revision_id,p_modality,p_language,p_position_key,p_concept_id)
  on conflict(assessor_user_id,chapter_id,lesson_id,modality) do update set
    revision_id=excluded.revision_id,language=excluded.language,position_key=excluded.position_key,
    concept_id=excluded.concept_id,updated_at=now()
  where (assessor_lesson_resume.revision_id,assessor_lesson_resume.language,assessor_lesson_resume.position_key,assessor_lesson_resume.concept_id)
    is distinct from (excluded.revision_id,excluded.language,excluded.position_key,excluded.concept_id);
end;
$$;
revoke execute on function assessor_private.study_context(uuid,uuid,uuid) from public,anon,authenticated;
revoke execute on function public.rpc_assessor_lesson_complete(uuid,uuid,uuid),public.rpc_assessor_lesson_resume(uuid,uuid,uuid,text,text,text,text) from public,anon;
grant execute on function public.rpc_assessor_lesson_complete(uuid,uuid,uuid),public.rpc_assessor_lesson_resume(uuid,uuid,uuid,text,text,text,text) to authenticated;
commit;
