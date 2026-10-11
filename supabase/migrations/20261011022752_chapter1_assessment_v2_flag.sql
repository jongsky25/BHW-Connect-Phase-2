-- Keep new Chapter 1 starts closed until the complete reviewed release exists.
insert into public.feature_flags (key, enabled, description)
values (
  'chapter1_assessment_v2', false,
  'Guided Chapter 1 learner assessments and reinforcement; new starts require an approved release.'
)
on conflict (key) do nothing;

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
    when 'chapter1_assessment_v2' then array['bhw', 'assessor']
    when 'flipcharts' then array['bhw', 'designer']
    else '{}'::text[]
  end;
$$;
revoke execute on function public.flag_role_scope(text) from public, anon;
