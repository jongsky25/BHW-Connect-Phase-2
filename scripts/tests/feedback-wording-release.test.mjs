// @vitest-environment node
import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {loadReferenceModule,contentHash} from '../lib/reference-content.mjs';
import {wordingReleases,applyFeedbackWordingRelease} from '../lib/feedback-wording-release.mjs';
import {wordingPublicationSql} from '../lib/feedback-wording-publication.mjs';

for(const r of wordingReleases){
  const old=loadReferenceModule('content/training/day1-basic-competencies/modules/'+r.module_key,'public').lessons.find(l=>l.manifest.lesson_key===r.lesson_key);
  test('item '+r.queue_number+' changes only the exact reviewed wording and rejects source drift',()=>{
    const next=applyFeedbackWordingRelease(old);
    expect(contentHash(old)).toBe(r.base_content_hash);
    expect(contentHash(next)).toBe(r.new_content_hash);
    const restored=structuredClone(next);
    for(const e of r.edits){const s=restored.revision[e.collection].find(s=>s.id===e.id);expect(s[e.field]).toContain(e.new);s[e.field]=s[e.field].replace(e.new,e.old);}
    expect(restored).toEqual(old);
    const drift=structuredClone(old);drift.revision.read_sections[0].heading_fil+='!';
    expect(()=>applyFeedbackWordingRelease(drift)).toThrow(/baseline drift/);
  });
  test('item '+r.queue_number+' guarded SQL publishes exact successor and leaves history intact',async()=>{
    const sql=wordingPublicationSql(r.queue_number);
    expect(readFileSync('docs/feedback-remediation/first-nine-publish-item-'+r.queue_number+'.sql','utf8')).toBe(sql+'\n');
    const db=new PGlite();
    try{
      await db.exec(`create schema assessor_rollout_private;
        create table public.course_modules(id uuid primary key,course_id uuid);
        create table public.users(id uuid,username text,role text,status text);
        create table public.course_lessons(id uuid primary key,module_id uuid,published_revision_id uuid);
        create table public.course_lesson_revisions(id uuid primary key default gen_random_uuid(),lesson_id uuid,revision_key text,content_hash text,read_sections jsonb,slides jsonb,coverage jsonb,sources jsonb,assets jsonb,featured_asset_id text,created_by uuid);
        create table public.course_lesson_facilitator_notes(revision_id uuid,notes_fil jsonb,notes_en jsonb,observation_indicators jsonb);
        create table assessor_rollout_private.practice_criteria(chapter_id uuid,criterion_id text,criterion_version text,lesson_id uuid,lesson_revision_id uuid,enabled boolean,review_reference text);
        create table assessor_rollout_private.practice_attempts(chapter_id uuid,criterion_id text,criterion_version text);
        create table public.audit_events(actor_user_id uuid,event_type text,subject_type text,subject_id uuid,metadata jsonb,plain_summary_fil text,plain_summary_en text);
        create table public.protected_history(id integer,revision_id uuid,score numeric);
      `);
      const actor='11111111-1111-4111-8111-111111111111';
      await db.query('insert into public.users values($1,$2,$3,$4)',[actor,'training.loader','admin','active']);
      await db.query('insert into public.course_modules values($1,$1)',[actor]);
      await db.query('insert into public.course_lessons values($1,$2,$3)',[r.lesson_id,actor,r.base_revision_id]);
      const rev=old.revision;
      await db.query('insert into public.course_lesson_revisions values($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,$10)',[r.base_revision_id,r.lesson_id,r.base_content_hash,JSON.stringify(rev.read_sections),JSON.stringify(rev.slides),JSON.stringify(rev.coverage),JSON.stringify(rev.sources),JSON.stringify(rev.assets),rev.featured_asset_id,actor]);
      await db.query('insert into public.course_lesson_facilitator_notes values($1,$2,$3,$4)',[r.base_revision_id,'{}','{}','[]']);
      await db.query("insert into assessor_rollout_private.practice_criteria values($1,'criterion','1',$2,$3,true,null)",[actor,r.lesson_id,r.base_revision_id]);
      await db.query('insert into public.protected_history values(1,$1,87.5)',[r.base_revision_id]);
      // A historical practice attempt must stop publication, not rewrite its pin.
      await db.query("insert into assessor_rollout_private.practice_attempts values($1,'criterion','1')",[actor]);
      await expect(db.exec(sql)).rejects.toThrow(/Practice criterion/);
      await db.exec('rollback; delete from assessor_rollout_private.practice_attempts;');
      await db.exec(sql);
      const rows=await db.query('select r.* from public.course_lessons l join public.course_lesson_revisions r on r.id=l.published_revision_id');
      expect(rows.rows[0].read_sections).toEqual(applyFeedbackWordingRelease(old).revision.read_sections);
      expect(rows.rows[0].slides).toEqual(applyFeedbackWordingRelease(old).revision.slides);
      expect(rows.rows[0].content_hash).toBe(r.new_content_hash);
      expect((await db.query('select * from public.protected_history')).rows).toEqual([{id:1,revision_id:r.base_revision_id,score:'87.5'}]);
      expect((await db.query('select read_sections from public.course_lesson_revisions where id=$1',[r.base_revision_id])).rows[0].read_sections).toEqual(old.revision.read_sections);
      await expect(db.exec(sql)).rejects.toThrow(/pointer drift/);
    }finally{await db.close();}
  });
}
