import { createHash } from 'node:crypto';

/** Generate the existing immutable draft import; callers validate approval first. */
export function draftImportSql(release) {
  const contentHash = createHash('sha256').update(JSON.stringify(release)).digest('hex');
  const literal = value => `'${String(value).replaceAll("'", "''")}'`;
  const json = value => `convert_from(decode('${Buffer.from(JSON.stringify(value)).toString('hex')}','hex'),'UTF8')::jsonb`;
  const releaseId = literal(release.release_id);
  return `
begin;
do $import$
begin
  if not exists (
    select 1 from public.training_program_chapters ch
    join public.training_programs p on p.id = ch.program_id
    where p.content_key = 'bhw-reference-manual' and p.status = 'published'
      and ch.chapter_key = 'chapter-1' and ch.availability = 'available'
      and (select count(*) from jsonb_array_elements(${json(release.curriculum_revisions)}) rev
        where exists (select 1 from public.course_modules m
          join public.course_lessons l on l.module_id = m.id
          join public.course_lesson_revisions r on r.id = l.published_revision_id
          where m.course_id = ch.course_id and l.lesson_key = rev->>'lesson_key'
            and r.id = (rev->>'revision_id')::uuid and r.content_hash = rev->>'sha256')) = 42
  ) then raise exception 'approved published curriculum does not match pinned revisions'; end if;
  if exists (select 1 from learner_assessment_private.releases
    where id = ${releaseId} and content_hash <> '${contentHash}') then
    raise exception 'release ID already has different content'; end if;
  insert into learner_assessment_private.releases
    (id, blueprint_id, source_commit, program_key, chapter_key, curriculum_revisions, content_hash)
    values (${releaseId}, ${literal(release.blueprint_id)}, ${literal(release.source_commit)},
      'bhw-reference-manual', 'chapter-1', ${json(release.curriculum_revisions)}, '${contentHash}')
    on conflict (id) do nothing;
${['pretest', 'posttest'].map(phase => {
  const form = release.forms[phase];
  return `  if exists (select 1 from learner_assessment_private.forms where id = ${literal(form.form_id)}
    and (release_id <> ${releaseId} or form_hash <> ${literal(form.hash)})) then
    raise exception 'form ID already has different content'; end if;
  insert into learner_assessment_private.forms(id, release_id, phase, items, form_hash)
    values(${literal(form.form_id)}, ${releaseId}, '${phase}', ${json(form.items)}, ${literal(form.hash)})
    on conflict (id) do nothing;`;
}).join('\n')}
${release.checkpoints.map(group => `  if exists (select 1 from learner_assessment_private.checkpoints
    where release_id = ${releaseId} and group_key = ${literal(group.key)}
      and (after_lesson_key <> ${literal(group.after_lesson_key)}
        or first_items <> ${json(group.first)} or alternate_items <> ${json(group.alternates)})) then
    raise exception 'checkpoint ID already has different content'; end if;
  insert into learner_assessment_private.checkpoints(release_id, group_key, after_lesson_key, first_items, alternate_items)
    values(${releaseId}, ${literal(group.key)}, ${literal(group.after_lesson_key)},
      ${json(group.first)}, ${json(group.alternates)})
    on conflict (release_id, group_key) do nothing;`).join('\n')}
end;
$import$;
commit;
`;
}
