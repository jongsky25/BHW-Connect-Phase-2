-- Widen a published course's or training program's org-unit scope, so a
-- super admin can promote locality content to be visible everywhere (e.g.
-- publish the BHW Reference Manual DOH-wide) without recreating it.
--
-- courses.org_unit_id already had no identity guard, so a plain course can
-- always be re-pointed. training_programs.org_unit_id was pinned immutable
-- by training_identity_guard() (20260924000000): that trigger now allows an
-- org_unit_id change only when the new org unit is an ancestor of (or the
-- same as) the current one -- i.e. only widening, never narrowing or a
-- lateral move to an unrelated branch, so a change here can only add
-- viewers, never remove them from a program admins already granted access
-- to. id/content_key/author_user_id stay fully immutable.
--
-- Both RPCs are super-admin only: a scope widen reaches every locality at
-- or below the target, which is a broader effect than an ordinary admin's
-- own org_unit_id-scoped write access is meant to have.

create or replace function public.training_identity_guard() returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if tg_table_name='training_programs' then
    if (new.id,new.content_key,new.author_user_id) is distinct from (old.id,old.content_key,old.author_user_id) then
      raise exception 'training identity is immutable'; end if;
    if new.org_unit_id is distinct from old.org_unit_id and not exists (
      select 1 from public.org_units where id = old.org_unit_id
        and path like public.org_unit_path(new.org_unit_id) || '%'
    ) then
      raise exception 'training program scope can only be widened to an ancestor org unit';
    end if;
    new.updated_at:=now();
  elsif tg_table_name='training_program_chapters' then
    if tg_op='UPDATE' and ((new.id,new.program_id,new.chapter_key) is distinct from (old.id,old.program_id,old.chapter_key)
      or (old.course_id is not null and new.course_id is distinct from old.course_id)) then
      raise exception 'chapter delivery identity is immutable'; end if;
    if new.course_id is not null and not exists(select 1 from public.courses c join public.training_programs p on p.org_unit_id=c.org_unit_id
      where c.id=new.course_id and p.id=new.program_id) then raise exception 'chapter and delivery course scopes must match'; end if;
  elsif tg_table_name='course_lessons' then
    perform 1 from public.course_modules where id=new.module_id for update;
    if tg_op='UPDATE' and (new.id,new.module_id,new.lesson_key,new.required) is distinct from (old.id,old.module_id,old.lesson_key,old.required) then
      raise exception 'lesson identity and completion policy are immutable'; end if;
    if not exists(select 1 from public.course_modules m join public.training_program_chapters ch on ch.course_id=m.course_id
      where m.id=new.module_id and m.type <> 'quiz') then raise exception 'lesson requires a mapped non-quiz module'; end if;
  end if;
  return new;
end;
$$;

-- Widen a standalone course's org scope. Refuses a course that is a
-- training-program chapter's delivery course: that one must move together
-- with its program (rpc_training_program_set_org_unit), since a program and
-- its chapters' courses must keep matching scope for the manual to render.
create or replace function public.rpc_course_set_org_unit(p_course_id uuid, p_org_unit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_course public.courses;
begin
  select * into v_actor from public.current_super_admin();
  if v_actor.id is null then
    raise exception 'not authorized';
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if v_course is null then
    raise exception 'course not found';
  end if;

  if not exists (select 1 from public.org_units where id = p_org_unit_id) then
    raise exception 'org unit not found';
  end if;

  if exists (select 1 from public.training_program_chapters where course_id = p_course_id) then
    raise exception 'this course belongs to a training program; widen the program''s scope instead';
  end if;

  if not exists (
    select 1 from public.org_units where id = v_course.org_unit_id
      and path like public.org_unit_path(p_org_unit_id) || '%'
  ) then
    raise exception 'scope can only be widened to an ancestor org unit';
  end if;

  update public.courses set org_unit_id = p_org_unit_id, updated_at = now() where id = p_course_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'course.org_unit_widened', 'course', p_course_id,
    jsonb_build_object('org_unit_id', p_org_unit_id),
    format('Pinalawak ni %s ang saklaw ng isang kurso.', v_actor.username),
    format('%s widened a course''s visibility scope.', v_actor.username));
end;
$$;

-- Widen a training program's org scope, cascading to every chapter's
-- delivery course so the program and its courses keep matching scope (the
-- invariant training_program_chapters' insert/update trigger checks).
create or replace function public.rpc_training_program_set_org_unit(p_program_id uuid, p_org_unit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_program public.training_programs;
begin
  select * into v_actor from public.current_super_admin();
  if v_actor.id is null then
    raise exception 'not authorized';
  end if;

  select * into v_program from public.training_programs where id = p_program_id;
  if v_program is null then
    raise exception 'training program not found';
  end if;

  if not exists (select 1 from public.org_units where id = p_org_unit_id) then
    raise exception 'org unit not found';
  end if;

  if not exists (
    select 1 from public.org_units where id = v_program.org_unit_id
      and path like public.org_unit_path(p_org_unit_id) || '%'
  ) then
    raise exception 'scope can only be widened to an ancestor org unit';
  end if;

  update public.courses set org_unit_id = p_org_unit_id, updated_at = now()
  where id in (select course_id from public.training_program_chapters where program_id = p_program_id and course_id is not null);

  update public.training_programs set org_unit_id = p_org_unit_id where id = p_program_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, metadata, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'training_program.org_unit_widened', 'training_program', p_program_id,
    jsonb_build_object('org_unit_id', p_org_unit_id),
    format('Pinalawak ni %s ang saklaw ng isang training program.', v_actor.username),
    format('%s widened a training program''s visibility scope.', v_actor.username));
end;
$$;

-- The org_units read policy only exposes an actor's own org unit and its
-- descendants (org_units_read_own_scope), so a super admin scoped to a
-- barangay cannot otherwise see the ancestor chain (region/province/
-- national) to widen a course into. Lists a given unit's ancestors,
-- root-first, excluding itself.
create or replace function public.rpc_org_unit_ancestors(p_org_unit_id uuid)
returns table (id uuid, name text, level text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor public.users;
begin
  select * into v_actor from public.current_super_admin();
  if v_actor.id is null then
    raise exception 'not authorized';
  end if;

  return query
    select o.id, o.name, o.level
    from public.org_units o
    where o.id = any (
      string_to_array(rtrim((select ou.path from public.org_units ou where ou.id = p_org_unit_id), '.'), '.')::uuid[]
    )
    and o.id <> p_org_unit_id
    order by length(o.path);
end;
$$;

revoke execute on function public.rpc_course_set_org_unit(uuid, uuid) from public, anon;
revoke execute on function public.rpc_training_program_set_org_unit(uuid, uuid) from public, anon;
revoke execute on function public.rpc_org_unit_ancestors(uuid) from public, anon;
grant execute on function public.rpc_course_set_org_unit(uuid, uuid) to authenticated;
grant execute on function public.rpc_training_program_set_org_unit(uuid, uuid) to authenticated;
grant execute on function public.rpc_org_unit_ancestors(uuid) to authenticated;
