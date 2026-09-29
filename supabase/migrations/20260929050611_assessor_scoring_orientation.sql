-- AF-04: assessor scoring orientation. This records training evidence only;
-- AF-05 is responsible for issuing chapter qualification.
begin;

create table assessor_private.orientation_units (
  chapter_key text primary key,
  curriculum_version text not null,
  orientation_version text not null,
  title jsonb not null,
  guide jsonb not null,
  lessons jsonb not null check (jsonb_typeof(lessons)='array' and jsonb_array_length(lessons)>0),
  cases jsonb not null check (jsonb_typeof(cases)='array' and jsonb_array_length(cases)>=5),
  passing_count integer not null check (passing_count>=1)
);
revoke all on assessor_private.orientation_units from public,anon,authenticated;

insert into assessor_private.orientation_units(chapter_key,curriculum_version,orientation_version,title,guide,lessons,cases,passing_count)
values (
  'chapter-1','2026-09-28.1','2026-09-29.1',
  '{"fil":"Oryentasyon sa pagmamarka ng BHW","en":"BHW scoring orientation"}'::jsonb,
  '[
    {"fil":"Obserbahan muna ang mismong ginawa at sinabi ng BHW. Itala ang ebidensya bago pumili ng antas; huwag hulaan ang kakayahan mula sa attendance o test score.","en":"Observe what the BHW actually does and says. Record evidence before choosing a level; do not infer competence from attendance or a test score."},
    {"fil":"Ihambing ang ebidensya sa tiyak na indicator ng subchapter. Kaya na: nagagawa nang tama at kusa. Kailangan pa ng practice: may bahagi na nagagawa ngunit kailangan ng gabay o pag-uulit. Hindi pa: hindi pa naipapakita ang mahalagang hakbang kahit may angkop na prompt.","en":"Compare the evidence with the specific subchapter indicator. Kaya na: does the task correctly and independently. Kailangan pa ng practice: performs part of it but needs prompting or repetition. Hindi pa: has not shown the essential step even with an appropriate prompt."},
    {"fil":"Magbigay ng tiyak at mahinahong feedback: ano ang nakita, aling indicator ito, at ano ang susunod na practice. Kung may panganib, ihinto ang gawain at sundin ang lokal na escalation pathway.","en":"Give specific, respectful feedback: what you observed, which indicator it relates to, and the next practice step. If safety is at risk, stop the task and follow the local escalation pathway."}
  ]'::jsonb,
  '[{"id":"eligibility","title":{"fil":"1. Suriin kung handa ang BHW at assessor","en":"1. Check BHW and assessor readiness"},"body":[{"fil":"Bago ang isang component assessment, tingnan ang subchapter na kaugnay nito. Dapat natapos ng BHW ang mga kinakailangang aralin at pagsusulit para sa component. Ang progress bar o pagdalo sa sesyon ay hindi sapat na patunay.","en":"Before a component assessment, check its related subchapter. The BHW must have completed that component’s required lessons and tests. A progress bar or session attendance alone is not proof."},{"fil":"Suriin din ang iyong sariling chapter qualification, aktibong account, assigned area, at kung may ibang assessor nang may hawak ng assessment. Kung may kulang, ipakita ang susunod na hakbang sa halip na piliting magmarka.","en":"Also check your own chapter qualification, active account, assigned area, and whether another assessor already holds the assessment. If anything is missing, explain the next step instead of forcing a rating."}]},{"id":"evidence","title":{"fil":"2. Obserbahan at itala ang ebidensya","en":"2. Observe and record evidence"},"body":[{"fil":"Sabihin muna sa BHW ang gawain at indicator na obserbahan. Itala ang tiyak na sinabi o ginawa, kung nagbigay ng prompt, at ang petsa at konteksto ng obserbasyon. Ihiwalay ang nakita sa interpretasyon.","en":"Tell the BHW which task and indicator you will observe. Record exactly what was said or done, whether a prompt was given, and the date and context. Keep observation separate from interpretation."},{"fil":"Gamitin ang stable indicator ID at ang kasalukuyang rubric. Ihiwalay ang formative practice mula sa summative assessment. Huwag ilipat ang lumang marka sa binagong rubric nang walang bagong pagsusuri.","en":"Use the stable indicator ID and current rubric. Distinguish formative practice from summative assessment. Do not carry an old rating into a revised rubric without a fresh review."}]},{"id":"anchors","title":{"fil":"3. Ihambing sa eksaktong rating anchor","en":"3. Compare with the exact rating anchor"},"body":[{"fil":"Basahin ang observable at ang tatlong anchor ng indicator bago magmarka. Kaya na kung nagawa nang tama at kusa; Kailangan pa ng practice kung may bahagi ngunit kailangan ng prompt o pag-uulit; Hindi pa kung hindi pa naipakita ang mahalagang gawain kahit may angkop na gabay.","en":"Read the indicator’s observable behavior and three anchors before rating. Kaya na means correct and independent performance; Kailangan pa ng practice means partial performance needing a prompt or repeat; Hindi pa means the essential action has not been shown even with appropriate support."},{"fil":"Ihambing ang dalawang magkalapit na kaso: dalawang tungkuling malinaw at pangatlo matapos ang prompt ay Kailangan pa ng practice; tatlong magkakaibang tungkulin nang kusa ay Kaya na. Gamitin ang anchor, hindi pangkalahatang impresyon.","en":"Compare close cases: two roles clearly described and a third after prompting is Kailangan pa ng practice; three distinct roles independently is Kaya na. Use the anchor, not a general impression."}]},{"id":"insufficient-evidence","title":{"fil":"4. Kapag kulang ang ebidensya","en":"4. When evidence is insufficient"},"body":[{"fil":"Kung hindi naobserbahan ang gawain o kulang ang detalye, huwag pumili ng antas batay sa hula. Itala na hindi pa naobserbahan at magtakda ng tiyak na pagkakataon para makita ang gawain.","en":"If the task was not observed or the details are missing, do not guess a rating. Record it as not yet observed and arrange a specific chance to see the task."},{"fil":"Ang Hindi pa ay para sa naobserbahang pagganap na hindi tumugon sa anchor. Iba ito sa walang ebidensya. Kung may panganib, ihinto ang gawain at sundin ang lokal na safety at escalation protocol.","en":"Hindi pa describes observed performance that does not meet the anchor. It differs from no evidence. If there is a safety risk, stop the task and follow the local safety and escalation protocol."}]},{"id":"feedback-reassessment","title":{"fil":"5. Feedback at muling pagtatasa","en":"5. Feedback and reassessment"},"body":[{"fil":"Ibahagi nang pribado at may paggalang ang tiyak na nakita, ang anchor na ginamit, at isang practice step. Pakinggan ang paliwanag ng BHW at itama ang factual record kung kinakailangan.","en":"Privately and respectfully share what you observed, which anchor you used, and one practice step. Hear the BHW’s explanation and correct the factual record if needed."},{"fil":"Sa muling pagtatasa, gumawa ng bagong observation record at ikumpara sa parehong indicator at rubric version. Panatilihin ang naunang history; huwag burahin ang unang pagtatangka para magmukhang laging pasado.","en":"On reassessment, create a new observation record and compare it with the same indicator and rubric version. Keep the earlier history; do not erase the first attempt to make the result appear always passed."}]},{"id":"final-review","title":{"fil":"6. Suriin bago ang huling desisyon","en":"6. Review before a final decision"},"body":[{"fil":"Bago magpasya sa chapter, suriin ang bawat kinakailangang indicator, ang current evidence at follow-up, ang chapter learning, at ang mga kinakailangang pagsusulit ng BHW. Hindi napapalitan ng mataas na average ang kulang na ebidensya sa isang kailangang indicator.","en":"Before a chapter decision, review each required indicator, current evidence and follow-up, the BHW’s chapter learning, and required BHW tests. A high average cannot replace missing evidence for a required indicator."},{"fil":"Ibigay ang malinaw na dahilan at susunod na hakbang sa BHW. Sundin ang aktuwal na assessment review at certification workflow; ang orientation exercise na ito ay hindi mismo nagdedesisyon o nag-iisyu ng certificate.","en":"Give the BHW a clear reason and next step. Follow the actual assessment review and certification workflow; this orientation exercise does not itself decide or issue a certificate."}]}]'::jsonb,
  '[
    {"id":"roles-independent","indicator":"chapter-1:01-tungkulin-ng-bhw:indicator-2","case":{"fil":"Hindi tumingin sa materyal ang BHW. Pinangalanan niya ang Health Educator, Community Organizer, at Health Service Provider at inilarawan nang magkakaiba ang bawat isa sa sariling salita.","en":"Without looking at materials, the BHW names Health Educator, Community Organizer, and Health Service Provider and distinctly describes each in their own words."},"correct":"kaya_na","reason":{"fil":"Tugma ito sa Kaya na anchor: tama ang tatlong tungkulin at magkakaiba ang sariling paglalarawan.","en":"This meets the Kaya na anchor: all three roles are correct and distinctly described in the BHW’s own words."}},
    {"id":"roles-prompted","indicator":"chapter-1:01-tungkulin-ng-bhw:indicator-2","case":{"fil":"Malinaw na nailarawan ng BHW ang dalawang tungkulin. Naipaliwanag lamang niya ang ikatlo matapos siyang bigyan ng prompt.","en":"The BHW clearly describes two roles and explains the third only after a prompt."},"correct":"kailangan_practice","reason":{"fil":"Ang indicator ay nangangailangan ng tatlong malinaw na paglalarawan nang walang prompt. Ipractice ang ikatlong tungkulin at obserbahan muli.","en":"The indicator requires three clear descriptions without prompting. Practise the third role and observe again."}},
    {"id":"roles-one","indicator":"chapter-1:01-tungkulin-ng-bhw:indicator-2","case":{"fil":"Health Service Provider lamang ang naiuugnay ng BHW sa sariling trabaho. Hindi niya maipaliwanag ang dalawa pa kahit may prompt.","en":"The BHW connects only Health Service Provider to their work and cannot explain the other two even when prompted."},"correct":"hindi_pa","reason":{"fil":"Isang tungkulin pa lamang ang naipapakita, na tumutugma sa Hindi pa anchor. Balikan muna ang tatlong tungkulin.","en":"Only one role is demonstrated, matching the Hindi pa anchor. Review all three roles first."}},
    {"id":"records-purpose","indicator":"chapter-1:01-tungkulin-ng-bhw:indicator-4","case":{"fil":"Nailista ng BHW ang household profile, master list, at registry. Alam niya kung kanino ito ipapasa ngunit hindi pa maipaliwanag kung paano ginagamit ang datos sa pagpili ng prayoridad.","en":"The BHW lists the household profile, master list, and registry and knows who receives them, but cannot yet explain how the data guide priorities."},"correct":"kailangan_practice","reason":{"fil":"Nagawa ang talaan at handoff, ngunit kulang ang ugnay sa paggamit ng datos. Ito ang Kailangan pa ng practice anchor.","en":"The records and handoff are covered, but the link to using data is missing. This is the Kailangan pa ng practice anchor."}},
    {"id":"records-priority","indicator":"chapter-1:01-tungkulin-ng-bhw:indicator-4","case":{"fil":"Nailista ng BHW ang mga talaan, sinabi kung kanino ito napupunta, at ipinaliwanag kung paano ipinapakita ng datos kung aling pamilya ang uunahin sa follow-up.","en":"The BHW lists the records, says who receives them, and explains how the data show which families need follow-up first."},"correct":"kaya_na","reason":{"fil":"Naipaliwanag ang gamit ng datos sa prayoridad, ayon sa Kaya na anchor ng indicator.","en":"The BHW explains how data guide priorities, matching this indicator’s Kaya na anchor."}},
    {"id":"listening-prompted","indicator":"chapter-1:06-komunikasyon:indicator-1","case":{"fil":"Sa unang tanong, sinabat ng BHW ang residente. Matapos paalalahanang tumigil at makinig, nagtanong siya nang bukas at hinayaang maipahayag ang concern.","en":"The BHW interrupts the resident at first. After a reminder to stop and listen, they ask an open question and let the resident express the concern."},"correct":"kailangan_practice","reason":{"fil":"Nagawa ang bukas na tanong matapos ang paalala, na tumutugma sa Kailangan pa ng practice anchor.","en":"An open question follows a reminder, matching the Kailangan pa ng practice anchor."}},
    {"id":"problem-guess","indicator":"chapter-1:07-problema:indicator-1","case":{"fil":"Sa ulat, tinawag ng BHW na tamad ang mga pamilyang hindi nakadalo. Kahit tinanong kung anong datos ang natiyak, patuloy niyang inilahad ang hula bilang katotohanan.","en":"In a report, the BHW calls families who missed a visit lazy. Even when asked what evidence was verified, they continue presenting the guess as fact."},"correct":"hindi_pa","reason":{"fil":"Patuloy na tinatratong datos ang hula kahit may prompt. Ito ang Hindi pa anchor; balikan ang nakitang pangyayari at kulang na impormasyon.","en":"The guess is still treated as data after a prompt. This is the Hindi pa anchor; return to observed facts and missing information."}},
    {"id":"safety-stop","indicator":"chapter-1:08-osh:indicator-2","critical":true,"case":{"fil":"Walang aprubadong sharps container sa lugar. Iminungkahi ng BHW na gumamit muna ng ordinaryong bote at ipagpatuloy ang gawain sa halip na ihinto at i-escalate ito.","en":"There is no approved sharps container at the site. The BHW suggests using an ordinary bottle and continuing, instead of stopping and escalating the task."},"correct":"hindi_pa","reason":{"fil":"Hindi aprubadong improvised na proteksyon at pagpapatuloy ng unsafe task ang Hindi pa anchor. Ihinto ang gawain at sundin ang lokal na escalation pathway.","en":"Unapproved improvised protection and continuing an unsafe task meet the Hindi pa anchor. Stop the task and follow the local escalation pathway."}}
  ]'::jsonb,
  7
);

create table public.assessor_orientation_attempts (
  id uuid primary key default gen_random_uuid(),
  assessor_user_id uuid not null references public.users(id),
  chapter_id uuid not null references public.training_program_chapters(id),
  curriculum_version text not null,
  orientation_version text not null,
  answers jsonb not null,
  correct_count integer not null,
  question_count integer not null,
  passed boolean not null,
  submitted_at timestamptz not null default now(),
  check (correct_count>=0 and correct_count<=question_count and question_count>=5)
);
create index assessor_orientation_attempts_owner_idx on public.assessor_orientation_attempts
  (assessor_user_id,chapter_id,curriculum_version,orientation_version,submitted_at desc);
alter table public.assessor_orientation_attempts enable row level security;
revoke all on public.assessor_orientation_attempts from anon,authenticated;
grant select on public.assessor_orientation_attempts to authenticated;
create policy assessor_orientation_own_read on public.assessor_orientation_attempts
  for select to authenticated using (
    assessor_user_id=(select current_app_user()).id
    and (select current_app_user()).role='assessor'
    and (select current_app_user()).status='active'
  );

create table public.assessor_orientation_lesson_progress (
  assessor_user_id uuid not null references public.users(id),
  chapter_id uuid not null references public.training_program_chapters(id),
  curriculum_version text not null,
  orientation_version text not null,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  primary key (assessor_user_id,chapter_id,curriculum_version,orientation_version,lesson_id)
);
create index assessor_orientation_lesson_progress_chapter_idx on public.assessor_orientation_lesson_progress
  (chapter_id,assessor_user_id);
alter table public.assessor_orientation_lesson_progress enable row level security;
revoke all on public.assessor_orientation_lesson_progress from anon,authenticated;
grant select on public.assessor_orientation_lesson_progress to authenticated;
create policy assessor_orientation_lesson_own_read on public.assessor_orientation_lesson_progress
  for select to authenticated using (
    assessor_user_id=(select current_app_user()).id
    and (select current_app_user()).role='assessor'
    and (select current_app_user()).status='active'
  );

create function public.rpc_assessor_orientation_state(p_chapter_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.users; v_gate jsonb; v_unit assessor_private.orientation_units;
  v_cases jsonb; v_completed jsonb; v_passed boolean; v_attempts integer;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role<>'assessor' or v_actor.status<>'active' then raise exception 'not authorized'; end if;
  v_gate:=public.rpc_assessor_candidate_exam_state(p_chapter_id);
  select * into v_unit from assessor_private.orientation_units
    where chapter_key=(select chapter_key from public.training_program_chapters where id=p_chapter_id)
      and curriculum_version=v_gate->>'curriculum_version';
  if v_unit.chapter_key is null then raise exception 'orientation unavailable for this chapter'; end if;
  if not (v_gate->>'orientation_ready')::boolean then
    return jsonb_build_object('ready',false,'passed',false);
  end if;
  select exists(select 1 from public.assessor_orientation_attempts a where a.assessor_user_id=v_actor.id
    and a.chapter_id=p_chapter_id and a.curriculum_version=v_unit.curriculum_version
    and a.orientation_version=v_unit.orientation_version and a.passed),
    count(*) into v_passed,v_attempts from public.assessor_orientation_attempts a
    where a.assessor_user_id=v_actor.id and a.chapter_id=p_chapter_id
      and a.curriculum_version=v_unit.curriculum_version and a.orientation_version=v_unit.orientation_version;
  select jsonb_agg(c.value - 'correct' - 'reason' order by c.ordinality) into v_cases
    from jsonb_array_elements(v_unit.cases) with ordinality c(value,ordinality);
  select coalesce(jsonb_agg(p.lesson_id order by p.completed_at),'[]'::jsonb) into v_completed
    from public.assessor_orientation_lesson_progress p where p.assessor_user_id=v_actor.id
      and p.chapter_id=p_chapter_id and p.curriculum_version=v_unit.curriculum_version
      and p.orientation_version=v_unit.orientation_version;
  return jsonb_build_object('ready',(v_gate->>'orientation_ready')::boolean,
    'title',v_unit.title,'guide',v_unit.guide,'lessons',v_unit.lessons,
    'completed_lessons',v_completed,'cases',v_cases,
    'passing_count',v_unit.passing_count,'orientation_version',v_unit.orientation_version,
    'passed',coalesce(v_passed,false),'attempts',v_attempts);
end;
$$;

create function public.rpc_assessor_orientation_lesson_complete(p_chapter_id uuid,p_lesson_id text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.users; v_gate jsonb; v_unit assessor_private.orientation_units;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role<>'assessor' or v_actor.status<>'active' then raise exception 'not authorized'; end if;
  v_gate:=public.rpc_assessor_candidate_exam_state(p_chapter_id);
  if not (v_gate->>'orientation_ready')::boolean then raise exception 'finish chapter study and qualifying exam first'; end if;
  select * into v_unit from assessor_private.orientation_units
    where chapter_key=(select chapter_key from public.training_program_chapters where id=p_chapter_id)
      and curriculum_version=v_gate->>'curriculum_version';
  if v_unit.chapter_key is null then raise exception 'orientation unavailable for this chapter'; end if;
  if p_lesson_id is null or not exists(select 1 from jsonb_array_elements(v_unit.lessons) l where l->>'id'=p_lesson_id) then
    raise exception 'unknown orientation lesson'; end if;
  insert into public.assessor_orientation_lesson_progress
    (assessor_user_id,chapter_id,curriculum_version,orientation_version,lesson_id)
    values(v_actor.id,p_chapter_id,v_unit.curriculum_version,v_unit.orientation_version,p_lesson_id)
    on conflict do nothing;
end;
$$;

create function public.rpc_assessor_orientation_submit(p_chapter_id uuid,p_answers jsonb,p_acknowledged boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.users; v_gate jsonb; v_unit assessor_private.orientation_units;
  v_case jsonb; v_answer jsonb; v_rating text; v_seen text[]:='{}'; v_correct integer:=0;
  v_critical_correct boolean:=true;
  v_feedback jsonb:='[]'::jsonb; v_passed boolean;
begin
  select * into v_actor from public.current_app_user();
  if v_actor.id is null or v_actor.role<>'assessor' or v_actor.status<>'active' then raise exception 'not authorized'; end if;
  -- Serialize concurrent submissions for the same candidate.
  perform 1 from public.users where id=v_actor.id for update;
  v_gate:=public.rpc_assessor_candidate_exam_state(p_chapter_id);
  if not (v_gate->>'orientation_ready')::boolean then raise exception 'finish chapter study and qualifying exam first'; end if;
  select * into v_unit from assessor_private.orientation_units
    where chapter_key=(select chapter_key from public.training_program_chapters where id=p_chapter_id)
      and curriculum_version=v_gate->>'curriculum_version';
  if v_unit.chapter_key is null then raise exception 'orientation unavailable for this chapter'; end if;
  if exists(select 1 from jsonb_array_elements(v_unit.lessons) l where not exists(
    select 1 from public.assessor_orientation_lesson_progress p where p.assessor_user_id=v_actor.id
      and p.chapter_id=p_chapter_id and p.curriculum_version=v_unit.curriculum_version
      and p.orientation_version=v_unit.orientation_version and p.lesson_id=l->>'id')) then
    raise exception 'complete every orientation lesson first'; end if;
  if p_acknowledged is distinct from true then raise exception 'review the scoring guide first'; end if;
  if p_answers is null or jsonb_typeof(p_answers)<>'array'
    or jsonb_array_length(p_answers)<>jsonb_array_length(v_unit.cases) then raise exception 'score every case once'; end if;
  if exists(select 1 from public.assessor_orientation_attempts a where a.assessor_user_id=v_actor.id
    and a.chapter_id=p_chapter_id and a.curriculum_version=v_unit.curriculum_version
    and a.orientation_version=v_unit.orientation_version and a.passed) then raise exception 'orientation already passed'; end if;
  for v_answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(v_answer)<>'object' or jsonb_typeof(v_answer->'id')<>'string'
      or jsonb_typeof(v_answer->'rating')<>'string' then raise exception 'invalid answer'; end if;
    if (v_answer->>'id')=any(v_seen) then raise exception 'duplicate case'; end if;
    v_seen:=v_seen||(v_answer->>'id');
    v_rating:=v_answer->>'rating';
    if v_rating not in ('kaya_na','kailangan_practice','hindi_pa') then raise exception 'invalid rating'; end if;
    select value into v_case from jsonb_array_elements(v_unit.cases) where value->>'id'=v_answer->>'id';
    if v_case is null then raise exception 'case not in this orientation'; end if;
    if v_rating=v_case->>'correct' then v_correct:=v_correct+1; end if;
    if coalesce((v_case->>'critical')::boolean,false) and v_rating<>v_case->>'correct' then v_critical_correct:=false; end if;
    v_feedback:=v_feedback||jsonb_build_array(jsonb_build_object('id',v_case->>'id','correct',v_case->>'correct','reason',v_case->'reason'));
  end loop;
  v_passed:=v_correct>=v_unit.passing_count and v_critical_correct;
  insert into public.assessor_orientation_attempts(assessor_user_id,chapter_id,curriculum_version,
    orientation_version,answers,correct_count,question_count,passed)
    values(v_actor.id,p_chapter_id,v_unit.curriculum_version,v_unit.orientation_version,p_answers,
      v_correct,jsonb_array_length(v_unit.cases),v_passed);
  return jsonb_build_object('correct_count',v_correct,'question_count',jsonb_array_length(v_unit.cases),
    'passed',v_passed,'critical_correct',v_critical_correct,'feedback',v_feedback);
end;
$$;
revoke execute on function public.rpc_assessor_orientation_state(uuid),public.rpc_assessor_orientation_lesson_complete(uuid,text),public.rpc_assessor_orientation_submit(uuid,jsonb,boolean) from public,anon;
grant execute on function public.rpc_assessor_orientation_state(uuid),public.rpc_assessor_orientation_lesson_complete(uuid,text),public.rpc_assessor_orientation_submit(uuid,jsonb,boolean) to authenticated;
commit;
