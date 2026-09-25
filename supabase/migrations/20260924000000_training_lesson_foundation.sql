-- Reference Manual work package 2. Additive and dormant until explicitly authored
-- and published. No seeded curriculum, automatic backfill, or historical updates.
-- Preserve courses/course_modules as delivery/assessment identities.
begin;

create table public.training_programs (
  id uuid primary key default gen_random_uuid(),
  content_key text not null check (content_key ~ '^[a-z0-9][a-z0-9-]*$'),
  org_unit_id uuid not null references public.org_units(id),
  author_user_id uuid not null references public.users(id),
  title_fil text not null check (btrim(title_fil) <> ''),
  title_en text not null check (btrim(title_en) <> ''),
  description_fil text not null default '', description_en text not null default '',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(org_unit_id, content_key)
);
create table public.training_program_chapters (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id),
  chapter_key text not null check (chapter_key ~ '^[a-z0-9][a-z0-9-]*$'),
  position integer not null check (position >= 0),
  title_fil text not null check (btrim(title_fil) <> ''),
  title_en text not null check (btrim(title_en) <> ''),
  course_id uuid unique references public.courses(id),
  availability text not null default 'unavailable' check (availability in ('unavailable','available')),
  check (availability = 'unavailable' or course_id is not null),
  unique(program_id,chapter_key), unique(program_id,position) deferrable initially immediate
);
create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id),
  lesson_key text not null check (lesson_key ~ '^[a-z0-9][a-z0-9-]*$'),
  position integer not null check (position >= 0),
  title_fil text not null check (btrim(title_fil) <> ''),
  title_en text not null check (btrim(title_en) <> ''),
  objectives_fil text[] not null check (cardinality(objectives_fil) between 1 and 2),
  objectives_en text[] not null check (cardinality(objectives_en) between 1 and 2),
  required boolean not null default true,
  published_revision_id uuid,
  created_at timestamptz not null default now(),
  check (cardinality(objectives_fil) = cardinality(objectives_en)),
  unique(module_id,lesson_key), unique(module_id,position) deferrable initially immediate
);
create table public.course_lesson_revisions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons(id),
  revision_key text not null check (btrim(revision_key) <> ''),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  read_sections jsonb not null check (jsonb_typeof(read_sections) = 'array' and jsonb_array_length(read_sections) > 0),
  slides jsonb not null check (jsonb_typeof(slides) = 'array' and jsonb_array_length(slides) > 0),
  coverage jsonb not null check (jsonb_typeof(coverage) = 'array'),
  sources jsonb not null check (jsonb_typeof(sources) = 'array'),
  assets jsonb not null default '[]' check (jsonb_typeof(assets) = 'array'),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  unique(lesson_id,revision_key), unique(lesson_id,content_hash), unique(id,lesson_id)
);
alter table public.course_lessons add constraint course_lessons_published_revision_fk
  foreign key(published_revision_id,id) references public.course_lesson_revisions(id,lesson_id);
create table public.course_lesson_facilitator_notes (
  revision_id uuid primary key references public.course_lesson_revisions(id),
  notes_fil text not null, notes_en text not null,
  observation_indicators jsonb not null default '[]' check (jsonb_typeof(observation_indicators) = 'array')
);
create table public.course_lesson_equivalences (
  lesson_id uuid primary key references public.course_lessons(id),
  revision_id uuid not null,
  legacy_module_id uuid not null references public.course_modules(id),
  legacy_content_hash text not null check (legacy_content_hash ~ '^[0-9a-f]{64}$'),
  review_reference text not null check (btrim(review_reference) <> ''),
  approved_by uuid not null references public.users(id), approved_at timestamptz not null default now(),
  foreign key(revision_id,lesson_id) references public.course_lesson_revisions(id,lesson_id)
);
create table public.course_lesson_progress (
  course_progress_id uuid not null references public.course_progress(id),
  lesson_id uuid not null references public.course_lessons(id),
  revision_id uuid not null,
  completed_at timestamptz not null,
  completion_basis text not null check (completion_basis in ('learner','legacy_equivalence')),
  legacy_module_id uuid references public.course_modules(id),
  migration_batch text,
  primary key(course_progress_id,lesson_id),
  foreign key(revision_id,lesson_id) references public.course_lesson_revisions(id,lesson_id),
  check ((completion_basis='learner' and legacy_module_id is null and migration_batch is null)
    or (completion_basis='legacy_equivalence' and legacy_module_id is not null and btrim(migration_batch) <> '' and migration_batch is not null))
);
create table public.course_lesson_resume (
  course_progress_id uuid not null references public.course_progress(id),
  lesson_id uuid not null references public.course_lessons(id),
  modality text not null check (modality in ('read','slides')),
  language text not null check (language in ('fil','en')),
  revision_id uuid not null,
  position_key text not null, concept_id text not null,
  updated_at timestamptz not null default now(),
  primary key(course_progress_id,lesson_id,modality),
  foreign key(revision_id,lesson_id) references public.course_lesson_revisions(id,lesson_id)
);
create index course_lesson_progress_lesson_idx on public.course_lesson_progress(lesson_id);
create index course_lesson_resume_latest_idx on public.course_lesson_resume(course_progress_id,updated_at desc);

-- Definer helpers avoid mutual RLS recursion. Actor status is checked here even
-- though the older current_app_user helper itself returns inactive profiles.
create function public.training_admin_scope(p_org uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select u.role='admin' and u.status='active'
    and public.org_unit_path(p_org) like public.current_org_path() || '%'
    from public.current_app_user() u),false);
$$;
create function public.training_module_admin(p_module uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id
    where m.id=p_module and public.training_admin_scope(c.org_unit_id));
$$;
create function public.training_lesson_admin(p_lesson uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.course_lessons l where l.id=p_lesson and public.training_module_admin(l.module_id));
$$;
create function public.training_lesson_visible(p_lesson uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.course_lessons l
    join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id
    join public.training_program_chapters ch on ch.course_id=c.id join public.training_programs pr on pr.id=ch.program_id
    cross join public.current_app_user() u
    where l.id=p_lesson and u.status='active' and l.published_revision_id is not null
      and c.status='published' and pr.status='published' and ch.availability='available'
      and public.current_org_path() like public.org_unit_path(c.org_unit_id) || '%'
      and public.current_org_path() like public.org_unit_path(pr.org_unit_id) || '%');
$$;
create function public.training_revision_visible(p_revision uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.course_lesson_revisions r join public.course_lessons l on l.id=r.lesson_id
    where r.id=p_revision and (public.training_lesson_admin(l.id)
      or (l.published_revision_id=r.id and public.training_lesson_visible(l.id))));
$$;
create function public.training_legacy_content_hash(p_module uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select encode(extensions.digest(jsonb_build_object('lesson',m.lesson,'body_fil',m.body_fil,'body_en',m.body_en)::text,'sha256'),'hex')
    from public.course_modules m where m.id=p_module and public.training_module_admin(m.id);
$$;

-- Authoring is scoped by RLS. Learner mutations and publication are RPC-only.
alter table public.training_programs enable row level security;
alter table public.training_program_chapters enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_lesson_revisions enable row level security;
alter table public.course_lesson_facilitator_notes enable row level security;
alter table public.course_lesson_equivalences enable row level security;
alter table public.course_lesson_progress enable row level security;
alter table public.course_lesson_resume enable row level security;

create policy training_program_read on public.training_programs for select to authenticated using (
  public.training_admin_scope(org_unit_id) or (status='published' and (select public.current_app_user()).status='active'
    and public.current_org_path() like public.org_unit_path(org_unit_id) || '%'));
create policy training_program_insert on public.training_programs for insert to authenticated with check (
  public.training_admin_scope(org_unit_id) and author_user_id=(select public.current_app_user()).id);
create policy training_program_update on public.training_programs for update to authenticated
  using(public.training_admin_scope(org_unit_id)) with check(public.training_admin_scope(org_unit_id));
create policy training_chapter_read on public.training_program_chapters for select to authenticated using (
  exists(select 1 from public.training_programs p where p.id=program_id));
create policy training_chapter_insert on public.training_program_chapters for insert to authenticated with check (
  exists(select 1 from public.training_programs p where p.id=program_id and public.training_admin_scope(p.org_unit_id)));
create policy training_chapter_update on public.training_program_chapters for update to authenticated using (
  exists(select 1 from public.training_programs p where p.id=program_id and public.training_admin_scope(p.org_unit_id))) with check (
  exists(select 1 from public.training_programs p where p.id=program_id and public.training_admin_scope(p.org_unit_id)));
create policy training_lesson_read on public.course_lessons for select to authenticated using (
  public.training_module_admin(module_id) or public.training_lesson_visible(id));
create policy training_lesson_insert on public.course_lessons for insert to authenticated with check (public.training_module_admin(module_id));
create policy training_lesson_update on public.course_lessons for update to authenticated
  using(public.training_module_admin(module_id)) with check(public.training_module_admin(module_id));
-- Check author access from the row itself so INSERT ... RETURNING can see a new revision.
create policy training_revision_read on public.course_lesson_revisions for select to authenticated using(
  public.training_lesson_admin(lesson_id) or public.training_revision_visible(id));
create policy training_revision_insert on public.course_lesson_revisions for insert to authenticated with check (
  public.training_lesson_admin(lesson_id) and created_by=(select public.current_app_user()).id);
create policy training_notes_read on public.course_lesson_facilitator_notes for select to authenticated using (
  (select public.current_app_user()).role in ('admin','assessor') and public.training_revision_visible(revision_id));
create policy training_notes_insert on public.course_lesson_facilitator_notes for insert to authenticated with check (
  exists(select 1 from public.course_lesson_revisions r where r.id=revision_id and public.training_lesson_admin(r.lesson_id)
    and not exists(select 1 from public.course_lessons l where l.published_revision_id=r.id)));
create policy training_equivalence_read on public.course_lesson_equivalences for select to authenticated using(public.training_lesson_admin(lesson_id));
-- Reuse existing progress RLS: self, scoped admin, or owner of an enrolled session.
create policy training_progress_read on public.course_lesson_progress for select to authenticated using (
  exists(select 1 from public.course_progress p where p.id=course_progress_id)
  and (select public.current_app_user()).status='active');
create policy training_resume_read on public.course_lesson_resume for select to authenticated using (
  exists(select 1 from public.course_progress p where p.id=course_progress_id and p.bhw_user_id=(select public.current_app_user()).id)
  and (select public.current_app_user()).status='active');

-- Pin identities and requiredness; corrections are new immutable revisions.
create function public.training_identity_guard() returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if tg_table_name='training_programs' then
    if (new.id,new.org_unit_id,new.content_key,new.author_user_id) is distinct from (old.id,old.org_unit_id,old.content_key,old.author_user_id) then
      raise exception 'training identity is immutable'; end if;
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
create trigger training_program_identity before update on public.training_programs for each row execute function public.training_identity_guard();
create trigger training_chapter_identity before insert or update on public.training_program_chapters for each row execute function public.training_identity_guard();
create trigger training_lesson_identity before insert or update on public.course_lessons for each row execute function public.training_identity_guard();
create function public.training_revision_immutable() returns trigger language plpgsql as $$
begin raise exception 'lesson revisions and their facilitator notes are immutable'; end;
$$;
create trigger training_revision_immutable before update or delete on public.course_lesson_revisions for each row execute function public.training_revision_immutable();
create trigger training_notes_immutable before update or delete on public.course_lesson_facilitator_notes for each row execute function public.training_revision_immutable();

-- Serializes authoring/publication and legacy completion on the same module.
create function public.training_module_completion_guard() returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  perform 1 from public.course_modules where id=new.module_id for update;
  if new.completed_at is not null and exists(select 1 from public.course_lessons where module_id=new.module_id and published_revision_id is not null) then
    if exists(select 1 from public.course_lessons l where l.module_id=new.module_id and l.required and l.published_revision_id is not null
      and not exists(select 1 from public.course_lesson_progress lp where lp.lesson_id=l.id and lp.course_progress_id=new.course_progress_id)) then
      raise exception 'complete the required lessons before completing this module';
    end if;
    if tg_op='UPDATE' and old.completed_at is not null then new.completed_at:=old.completed_at; end if;
  end if;
  return new;
end;
$$;
create trigger training_module_completion_guard before insert or update on public.course_module_progress for each row execute function public.training_module_completion_guard();

create function public.rpc_course_lessons_publish(p_module_id uuid,p_revision_ids uuid[]) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_course uuid;
begin
  if not public.training_module_admin(p_module_id) then raise exception 'not authorized'; end if;
  select course_id into v_course from public.course_modules where id=p_module_id for update;
  if coalesce(cardinality(p_revision_ids),0)=0
    or cardinality(p_revision_ids) <> (select count(*) from public.course_lessons where module_id=p_module_id)
    or cardinality(p_revision_ids) <> (select count(distinct r.lesson_id) from public.course_lesson_revisions r
      join public.course_lessons l on l.id=r.lesson_id where r.id=any(p_revision_ids) and l.module_id=p_module_id)
    then raise exception 'publication must include exactly one revision for every lesson in the module'; end if;
  if exists(select 1 from public.course_lesson_revisions r where r.id=any(p_revision_ids)
    and not exists(select 1 from public.course_lesson_facilitator_notes n where n.revision_id=r.id)) then
    raise exception 'every revision requires separate facilitator notes'; end if;
  if not exists(select 1 from public.course_lessons where module_id=p_module_id and required) then raise exception 'at least one required lesson is needed'; end if;
  if not exists(select 1 from public.course_lesson_revisions r join public.course_lessons l on l.id=r.lesson_id
    where r.id=any(p_revision_ids) and l.published_revision_id is distinct from r.id) then return; end if;
  update public.course_lessons l set published_revision_id=r.id from public.course_lesson_revisions r
    where r.id=any(p_revision_ids) and r.lesson_id=l.id;
  insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
    values ((select public.current_app_user()).id,'course.lessons_published','course',v_course,jsonb_build_object('module_id',p_module_id,'revision_ids',p_revision_ids),
      'Inilathala ang kumpletong pangkat ng mga aralin.','Published the complete set of lesson revisions.');
end;
$$;

create function public.rpc_course_lesson_approve_equivalence(p_lesson_id uuid,p_revision_id uuid,p_legacy_content_hash text,p_review_reference text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_module uuid; v_old public.course_lesson_equivalences;
begin
  if not public.training_lesson_admin(p_lesson_id) then raise exception 'not authorized'; end if;
  select module_id into v_module from public.course_lessons where id=p_lesson_id;
  perform 1 from public.course_modules where id=v_module for update;
  if p_legacy_content_hash is distinct from public.training_legacy_content_hash(v_module) then raise exception 'legacy content changed; reconcile equivalence'; end if;
  select * into v_old from public.course_lesson_equivalences where lesson_id=p_lesson_id;
  if v_old.lesson_id is not null then
    if (v_old.revision_id,v_old.legacy_content_hash,v_old.review_reference) is distinct from (p_revision_id,p_legacy_content_hash,p_review_reference) then
      raise exception 'equivalence already approved; cannot rewrite its evidence'; end if;
    return;
  end if;
  insert into public.course_lesson_equivalences(lesson_id,revision_id,legacy_module_id,legacy_content_hash,review_reference,approved_by)
    values(p_lesson_id,p_revision_id,v_module,p_legacy_content_hash,p_review_reference,(select public.current_app_user()).id);
end;
$$;

create function public.rpc_course_lesson_backfill(p_module_id uuid,p_migration_batch text,p_dry_run boolean default true)
returns table(eligible bigint,inserted bigint) language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count bigint; v_inserted bigint:=0;
begin
  if not public.training_module_admin(p_module_id) then raise exception 'not authorized'; end if;
  perform 1 from public.course_modules where id=p_module_id for update;
  if p_dry_run is null or btrim(coalesce(p_migration_batch,''))='' then raise exception 'batch and dry-run choice are required'; end if;
  if exists(select 1 from public.course_lesson_equivalences e join public.course_lessons l on l.id=e.lesson_id
    where l.module_id=p_module_id and (e.revision_id is distinct from l.published_revision_id
      or e.legacy_content_hash is distinct from public.training_legacy_content_hash(p_module_id))) then
    raise exception 'equivalence does not match current legacy content and published revision'; end if;
  select count(*) into v_count from public.course_module_progress mp join public.course_progress cp on cp.id=mp.course_progress_id
    join public.course_modules m on m.id=mp.module_id and m.course_id=cp.course_id
    join public.course_lessons l on l.module_id=mp.module_id
    join public.course_lesson_equivalences e on e.lesson_id=l.id and e.revision_id=l.published_revision_id
    where mp.module_id=p_module_id and mp.completed_at is not null and not exists(
      select 1 from public.course_lesson_progress lp where lp.course_progress_id=mp.course_progress_id and lp.lesson_id=l.id);
  if not p_dry_run then
    insert into public.course_lesson_progress(course_progress_id,lesson_id,revision_id,completed_at,completion_basis,legacy_module_id,migration_batch)
      select mp.course_progress_id,l.id,e.revision_id,mp.completed_at,'legacy_equivalence',p_module_id,p_migration_batch
      from public.course_module_progress mp join public.course_progress cp on cp.id=mp.course_progress_id
      join public.course_modules m on m.id=mp.module_id and m.course_id=cp.course_id
      join public.course_lessons l on l.module_id=mp.module_id
      join public.course_lesson_equivalences e on e.lesson_id=l.id and e.revision_id=l.published_revision_id
      where mp.module_id=p_module_id and mp.completed_at is not null
      on conflict(course_progress_id,lesson_id) do nothing;
    get diagnostics v_inserted=row_count;
    if v_inserted>0 then
      insert into public.audit_events(actor_user_id,event_type,subject_type,subject_id,metadata,plain_summary_fil,plain_summary_en)
        select (select public.current_app_user()).id,'course.lessons_backfilled','course',course_id,
          jsonb_build_object('module_id',p_module_id,'batch',p_migration_batch,'inserted',v_inserted),
          'Kinilala ang dating pagkumpleto ayon sa aprubadong pagtutumbas.','Recognized prior completion using approved equivalence.'
        from public.course_modules where id=p_module_id;
    end if;
  end if;
  return query select v_count,v_inserted;
end;
$$;

-- Shared validation, executable only by the RPC owner. Does not mark completion.
create function public.training_lesson_progress_context(p_lesson_id uuid,p_revision_id uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_actor public.users; v_lesson public.course_lessons; v_course uuid; v_progress uuid;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role <> 'bhw' or v_actor.status <> 'active' or not public.training_lesson_visible(p_lesson_id) then raise exception 'not authorized'; end if;
  select * into v_lesson from public.course_lessons where id=p_lesson_id;
  select course_id into v_course from public.course_modules where id=v_lesson.module_id for update;
  -- Re-read after module lock: publishing and completing share this lock order.
  select * into v_lesson from public.course_lessons where id=p_lesson_id;
  if p_revision_id is null or p_revision_id is distinct from v_lesson.published_revision_id then raise exception 'lesson revision changed; reload the lesson'; end if;
  insert into public.course_progress(course_id,bhw_user_id) values(v_course,v_actor.id) on conflict(course_id,bhw_user_id) do nothing;
  select id into v_progress from public.course_progress where course_id=v_course and bhw_user_id=v_actor.id for update;
  return v_progress;
end;
$$;
create function public.rpc_course_lesson_complete(p_lesson_id uuid,p_revision_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_progress uuid; v_module uuid;
begin
  v_progress:=public.training_lesson_progress_context(p_lesson_id,p_revision_id);
  select module_id into v_module from public.course_lessons where id=p_lesson_id;
  insert into public.course_lesson_progress(course_progress_id,lesson_id,revision_id,completed_at,completion_basis)
    values(v_progress,p_lesson_id,p_revision_id,now(),'learner') on conflict(course_progress_id,lesson_id) do nothing;
  if not exists(select 1 from public.course_lessons l where l.module_id=v_module and l.required and l.published_revision_id is not null
    and not exists(select 1 from public.course_lesson_progress lp where lp.lesson_id=l.id and lp.course_progress_id=v_progress)) then
    insert into public.course_module_progress(course_progress_id,module_id,completed_at) values(v_progress,v_module,now())
      on conflict(course_progress_id,module_id) do update set completed_at=coalesce(public.course_module_progress.completed_at,excluded.completed_at);
    -- Existing Chapter I transition and assessment identity, never a full-manual certificate.
    perform public.course_progress_maybe_finish(v_progress);
  end if;
end;
$$;
create function public.rpc_course_lesson_resume(p_lesson_id uuid,p_revision_id uuid,p_modality text,p_language text,p_position_key text,p_concept_id text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_progress uuid; v_content jsonb;
begin
  if p_modality is null or p_modality not in ('read','slides') or p_language is null or p_language not in ('fil','en') then raise exception 'invalid lesson mode or language'; end if;
  v_progress:=public.training_lesson_progress_context(p_lesson_id,p_revision_id);
  select case when p_modality='read' then read_sections else slides end into v_content from public.course_lesson_revisions where id=p_revision_id;
  if not exists(select 1 from jsonb_array_elements(v_content) item where item->>'id'=p_position_key and (item->'concept_ids') ? p_concept_id) then
    raise exception 'position and concept must belong to the current lesson revision'; end if;
  insert into public.course_lesson_resume(course_progress_id,lesson_id,modality,language,revision_id,position_key,concept_id)
    values(v_progress,p_lesson_id,p_modality,p_language,p_revision_id,p_position_key,p_concept_id)
    on conflict(course_progress_id,lesson_id,modality) do update set language=excluded.language,revision_id=excluded.revision_id,
      position_key=excluded.position_key,concept_id=excluded.concept_id,updated_at=now();
end;
$$;

-- Explicit grants override the hosted project's permissive schema defaults.
revoke all on public.training_programs,public.training_program_chapters,public.course_lessons,public.course_lesson_revisions,
  public.course_lesson_facilitator_notes,public.course_lesson_equivalences,public.course_lesson_progress,public.course_lesson_resume from public,anon,authenticated;
grant select on public.training_programs,public.training_program_chapters,public.course_lessons,public.course_lesson_revisions,
  public.course_lesson_facilitator_notes,public.course_lesson_equivalences,public.course_lesson_progress,public.course_lesson_resume to authenticated;
grant insert on public.training_programs,public.training_program_chapters,public.course_lesson_revisions,public.course_lesson_facilitator_notes to authenticated;
grant insert(module_id,lesson_key,position,title_fil,title_en,objectives_fil,objectives_en,required) on public.course_lessons to authenticated;
grant update(title_fil,title_en,description_fil,description_en,status) on public.training_programs to authenticated;
grant update(position,title_fil,title_en,course_id,availability) on public.training_program_chapters to authenticated;
grant update(position,title_fil,title_en,objectives_fil,objectives_en) on public.course_lessons to authenticated;

revoke execute on function public.training_identity_guard(),public.training_revision_immutable(),public.training_module_completion_guard(),
  public.training_lesson_progress_context(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.training_admin_scope(uuid),public.training_module_admin(uuid),public.training_lesson_admin(uuid),
  public.training_lesson_visible(uuid),public.training_revision_visible(uuid),public.training_legacy_content_hash(uuid),
  public.rpc_course_lessons_publish(uuid,uuid[]),public.rpc_course_lesson_approve_equivalence(uuid,uuid,text,text),
  public.rpc_course_lesson_backfill(uuid,text,boolean),public.rpc_course_lesson_complete(uuid,uuid),
  public.rpc_course_lesson_resume(uuid,uuid,text,text,text,text) from public,anon;
grant execute on function public.training_admin_scope(uuid),public.training_module_admin(uuid),public.training_lesson_admin(uuid),
  public.training_lesson_visible(uuid),public.training_revision_visible(uuid),public.training_legacy_content_hash(uuid),
  public.rpc_course_lessons_publish(uuid,uuid[]),public.rpc_course_lesson_approve_equivalence(uuid,uuid,text,text),
  public.rpc_course_lesson_backfill(uuid,text,boolean),public.rpc_course_lesson_complete(uuid,uuid),
  public.rpc_course_lesson_resume(uuid,uuid,text,text,text,text) to authenticated;
commit;
