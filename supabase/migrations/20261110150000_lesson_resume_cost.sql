-- Cheaper lesson resume saves.
--
-- Between 28 Sep and 10 Nov, rpc_course_lesson_resume (5,957 calls, 182 ms
-- mean) and rpc_assessor_lesson_resume (12,250 calls, 61 ms mean) were the
-- next-largest DB costs after the lesson list. Two causes:
--
-- 1. training_lesson_visible() was a SQL-language SECURITY DEFINER function.
--    Postgres 17 never inlines it and re-plans it on every call, and it
--    nested current_app_user() and two org_visible_to_actor() calls, each
--    calling current_org_path() and org_unit_path() again: about a dozen
--    statements planned per check. Both resume RPCs, both completion RPCs and
--    the assessor exam bank call it.
-- 2. rpc_course_lesson_resume wrote on every call, even when the bookmark
--    had not changed. Each write bumps updated_at, which is indexed
--    (course_lesson_resume_latest_idx), so no update could be HOT: 4,809
--    updates and 0 HOT on the pilot.
--
-- training_lesson_visible keeps the same signature and rules. It is now
-- PL/pgSQL, reads the actor once with the same current_app_user() and
-- current_org_path() calls, and returns early when the actor is not active.
--
-- rpc_course_lesson_resume now skips the write only when the stored bookmark
-- is identical and this lesson is already the learner's most recently
-- resumed lesson. "Continue where you left off" sorts resumes by updated_at
-- across the learner's courses (continueTarget in manual-progress.ts,
-- continueLesson in reference-navigation.ts). Re-saving the latest lesson's
-- unchanged bookmark cannot change that order. Any other save still writes
-- and bumps updated_at exactly as before.

create or replace function public.training_lesson_visible(p_lesson uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user public.users;
  v_path text;
begin
  v_user := public.current_app_user();
  if v_user.id is null or v_user.status is distinct from 'active' then
    return false;
  end if;
  v_path := public.current_org_path();
  -- org_visible_to_actor(org) with the actor already known:
  --   coalesce(actor_path like org_path || '%'
  --            or (role = 'assessor' and status = 'active' and org_path like actor_path || '%'), false)
  return exists (
    select 1
    from public.course_lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    join public.training_program_chapters ch on ch.course_id = c.id
    join public.training_programs pr on pr.id = ch.program_id
    left join public.org_units co on co.id = c.org_unit_id
    left join public.org_units po on po.id = pr.org_unit_id
    where l.id = p_lesson
      and l.published_revision_id is not null
      and c.status = 'published'
      and pr.status = 'published'
      and ch.availability = 'available'
      and coalesce(v_path like co.path || '%' or (v_user.role = 'assessor' and co.path like v_path || '%'), false)
      and coalesce(v_path like po.path || '%' or (v_user.role = 'assessor' and po.path like v_path || '%'), false)
  );
end;
$$;

create or replace function public.rpc_course_lesson_resume(p_lesson_id uuid,p_revision_id uuid,p_modality text,p_language text,p_position_key text,p_concept_id text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_progress uuid; v_content jsonb;
begin
  if p_modality is null or p_modality not in ('read','slides') or p_language is null or p_language not in ('fil','en') then raise exception 'invalid lesson mode or language'; end if;
  v_progress:=public.training_lesson_resume_context(p_lesson_id,p_revision_id);
  select case when p_modality='read' then read_sections else slides end into v_content from public.course_lesson_revisions where id=p_revision_id;
  if not exists(select 1 from jsonb_array_elements(v_content) item where item->>'id'=p_position_key and (item->'concept_ids') ? p_concept_id) then
    raise exception 'position and concept must belong to the current lesson revision'; end if;
  insert into public.course_lesson_resume(course_progress_id,lesson_id,modality,language,revision_id,position_key,concept_id)
    values(v_progress,p_lesson_id,p_modality,p_language,p_revision_id,p_position_key,p_concept_id)
    on conflict(course_progress_id,lesson_id,modality) do update set language=excluded.language,revision_id=excluded.revision_id,
      position_key=excluded.position_key,concept_id=excluded.concept_id,updated_at=now()
    -- Skip only an unchanged bookmark on the learner's most recent lesson
    -- (see the header): every other save still writes and bumps updated_at.
    where (course_lesson_resume.language,course_lesson_resume.revision_id,course_lesson_resume.position_key,course_lesson_resume.concept_id)
        is distinct from (excluded.language,excluded.revision_id,excluded.position_key,excluded.concept_id)
      or exists (
        select 1
        from public.course_progress mine
        join public.course_progress other_progress on other_progress.bhw_user_id = mine.bhw_user_id
        join public.course_lesson_resume other on other.course_progress_id = other_progress.id
        where mine.id = course_lesson_resume.course_progress_id
          and other.lesson_id <> course_lesson_resume.lesson_id
          and other.updated_at >= course_lesson_resume.updated_at
      );
end;
$$;
