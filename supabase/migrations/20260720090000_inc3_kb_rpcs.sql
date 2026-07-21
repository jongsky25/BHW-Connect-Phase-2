-- ---------------------------------------------------------------------
-- INC-3: KB authoring RPCs for kb_entries / kb_articles.
--
-- kb_categories and synonyms are plain admin-only CRUD already covered by
-- the kb_categories_admin_write / synonyms_admin_all RLS policies (no
-- audit taxonomy entry exists for them). kb_entries and kb_articles need
-- SECURITY DEFINER RPCs instead of direct table writes because every
-- create/publish/unpublish/edit must also append a laymanized audit_events
-- row (§5.6: kb.entry_created, kb.entry_published, kb.entry_updated,
-- kb.entry_archived), and audit_events has no client-facing insert policy.
-- ---------------------------------------------------------------------

create or replace function public.rpc_kb_entry_create(
  p_category_id uuid,
  p_question_fil text,
  p_question_en text,
  p_answer_fil text,
  p_answer_en text,
  p_keywords text[] default '{}'::text[],
  p_image_url text default null,
  p_owner_user_id uuid default null,
  p_review_due_on date default null,
  p_status text default 'draft'
)
returns table (entry_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_entry_id uuid;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'invalid status';
  end if;

  if p_status = 'published' and p_owner_user_id is null then
    raise exception 'an owner is required to publish';
  end if;

  insert into public.kb_entries (
    category_id, question_fil, question_en, answer_fil, answer_en,
    keywords, image_url, owner_user_id, review_due_on, status
  ) values (
    p_category_id, p_question_fil, p_question_en, p_answer_fil, p_answer_en,
    coalesce(p_keywords, '{}'::text[]), p_image_url, p_owner_user_id, p_review_due_on, p_status
  ) returning id into v_entry_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'kb.entry_created', 'kb_entry', v_entry_id,
    format('Gumawa si %s ng bagong tanong-sagot: "%s".', v_actor.username, p_question_fil),
    format('%s created a new Q&A entry: "%s".', v_actor.username, p_question_en));

  if p_status = 'published' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_published', 'kb_entry', v_entry_id,
      format('Inilathala ni %s ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s published the Q&A entry "%s".', v_actor.username, p_question_en));
  end if;

  return query select v_entry_id;
end;
$$;

create or replace function public.rpc_kb_entry_update(
  p_id uuid,
  p_category_id uuid,
  p_question_fil text,
  p_question_en text,
  p_answer_fil text,
  p_answer_en text,
  p_keywords text[],
  p_image_url text,
  p_owner_user_id uuid,
  p_review_due_on date,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_before public.kb_entries;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_before from public.kb_entries where id = p_id for update;
  if v_before is null then
    raise exception 'entry not found';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'invalid status';
  end if;

  if p_status = 'published' and p_owner_user_id is null then
    raise exception 'an owner is required to publish';
  end if;

  update public.kb_entries set
    category_id = p_category_id,
    question_fil = p_question_fil,
    question_en = p_question_en,
    answer_fil = p_answer_fil,
    answer_en = p_answer_en,
    keywords = coalesce(p_keywords, '{}'::text[]),
    image_url = p_image_url,
    owner_user_id = p_owner_user_id,
    review_due_on = p_review_due_on,
    status = p_status
  where id = p_id;

  if v_before.status != 'published' and p_status = 'published' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_published', 'kb_entry', p_id,
      format('Inilathala ni %s ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s published the Q&A entry "%s".', v_actor.username, p_question_en));
  elsif v_before.status = 'published' and p_status = 'draft' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_archived', 'kb_entry', p_id,
      format('Inalis ni %s sa publikasyon ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s unpublished the Q&A entry "%s".', v_actor.username, p_question_en));
  else
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_updated', 'kb_entry', p_id,
      format('Na-update ni %s ang tanong-sagot na "%s".', v_actor.username, p_question_fil),
      format('%s updated the Q&A entry "%s".', v_actor.username, p_question_en));
  end if;
end;
$$;

create or replace function public.rpc_kb_article_create(
  p_category_id uuid,
  p_title_fil text,
  p_title_en text,
  p_body_fil jsonb,
  p_body_en jsonb,
  p_owner_user_id uuid default null,
  p_review_due_on date default null,
  p_status text default 'draft'
)
returns table (article_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_article_id uuid;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'invalid status';
  end if;

  if p_status = 'published' and p_owner_user_id is null then
    raise exception 'an owner is required to publish';
  end if;

  insert into public.kb_articles (
    category_id, title_fil, title_en, body_fil, body_en, owner_user_id, review_due_on, status
  ) values (
    p_category_id, p_title_fil, p_title_en,
    coalesce(p_body_fil, '{}'::jsonb), coalesce(p_body_en, '{}'::jsonb),
    p_owner_user_id, p_review_due_on, p_status
  ) returning id into v_article_id;

  insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
  values (v_actor.id, 'kb.entry_created', 'kb_article', v_article_id,
    format('Gumawa si %s ng bagong artikulo: "%s".', v_actor.username, p_title_fil),
    format('%s created a new article: "%s".', v_actor.username, p_title_en));

  if p_status = 'published' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_published', 'kb_article', v_article_id,
      format('Inilathala ni %s ang artikulong "%s".', v_actor.username, p_title_fil),
      format('%s published the article "%s".', v_actor.username, p_title_en));
  end if;

  return query select v_article_id;
end;
$$;

create or replace function public.rpc_kb_article_update(
  p_id uuid,
  p_category_id uuid,
  p_title_fil text,
  p_title_en text,
  p_body_fil jsonb,
  p_body_en jsonb,
  p_owner_user_id uuid,
  p_review_due_on date,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.users;
  v_before public.kb_articles;
begin
  select * into v_actor from public.current_app_user();
  if v_actor is null or v_actor.role != 'admin' then
    raise exception 'not authorized';
  end if;

  select * into v_before from public.kb_articles where id = p_id for update;
  if v_before is null then
    raise exception 'article not found';
  end if;

  if p_status not in ('draft', 'published') then
    raise exception 'invalid status';
  end if;

  if p_status = 'published' and p_owner_user_id is null then
    raise exception 'an owner is required to publish';
  end if;

  update public.kb_articles set
    category_id = p_category_id,
    title_fil = p_title_fil,
    title_en = p_title_en,
    body_fil = coalesce(p_body_fil, '{}'::jsonb),
    body_en = coalesce(p_body_en, '{}'::jsonb),
    owner_user_id = p_owner_user_id,
    review_due_on = p_review_due_on,
    status = p_status
  where id = p_id;

  if v_before.status != 'published' and p_status = 'published' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_published', 'kb_article', p_id,
      format('Inilathala ni %s ang artikulong "%s".', v_actor.username, p_title_fil),
      format('%s published the article "%s".', v_actor.username, p_title_en));
  elsif v_before.status = 'published' and p_status = 'draft' then
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_archived', 'kb_article', p_id,
      format('Inalis ni %s sa publikasyon ang artikulong "%s".', v_actor.username, p_title_fil),
      format('%s unpublished the article "%s".', v_actor.username, p_title_en));
  else
    insert into public.audit_events (actor_user_id, event_type, subject_type, subject_id, plain_summary_fil, plain_summary_en)
    values (v_actor.id, 'kb.entry_updated', 'kb_article', p_id,
      format('Na-update ni %s ang artikulong "%s".', v_actor.username, p_title_fil),
      format('%s updated the article "%s".', v_actor.username, p_title_en));
  end if;
end;
$$;

grant execute on function public.rpc_kb_entry_create(uuid, text, text, text, text, text[], text, uuid, date, text) to anon, authenticated;
grant execute on function public.rpc_kb_entry_update(uuid, uuid, text, text, text, text, text[], text, uuid, date, text) to anon, authenticated;
grant execute on function public.rpc_kb_article_create(uuid, text, text, jsonb, jsonb, uuid, date, text) to anon, authenticated;
grant execute on function public.rpc_kb_article_update(uuid, uuid, text, text, jsonb, jsonb, uuid, date, text) to anon, authenticated;
