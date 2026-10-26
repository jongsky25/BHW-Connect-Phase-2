-- Chapter II assessor pre/posttest: context and repeated-question remediation.
-- The replacements reuse the approved Chapter II lesson transfer checks, with
-- explicit situations that can be answered before reading the lessons.
-- Feedback: 97a145f3, be0a2aa1, e5574d56, d710b262, 04404b65.
-- Old rows remain for submitted answers and open assessor exam snapshots.
-- New exams receive new question IDs at the same four positions (14 total).
-- No generated course/question IDs are hardcoded; the expected old content is
-- checked before replacement so another bank revision cannot be overwritten.
do $$
declare
  v_course_id uuid;
  v_matches integer;
  v_count integer;
  v_item jsonb;
  v_old public.course_test_questions%rowtype;
  v_items jsonb := $items$[{"position":6,"module_position":3,"old_prompt_en":"What should the practice show?","old_correct_en":"Give the location and observations.","prompt_en":"The bystander is on the phone with the confirmed contact. What should Lea tell them?","prompt_fil":"Kausap na ng saksi ang kumpirmadong contact. Ano ang dapat sabihin ni Lea?","options":[{"fil":"Ang lokasyon at kung tumutugon at humihinga ang sakay.","en":"The location and whether the rider responds and breathes."},{"fil":"Ang hula niya sa pinsala ng sakay para alam nila ang dadalhin.","en":"Her guess about the rider's injury, so they know what to bring."},{"fil":"Na lumipat sa national number dahil puwede ang kahit anong numero.","en":"To hang up and try the national number, since any number works."}],"correct_option_index":0},{"position":7,"module_position":3,"old_prompt_en":"What should the practice show?","old_correct_en":"Maintain pressure and call.","prompt_en":"The cloth is soaked and the bystander wants to wipe it away. What do you do?","prompt_fil":"Basa na ang tela at gusto itong tanggalin ng saksi. Ano ang gagawin mo?","options":[{"fil":"Tanggalin ang basang tela at magsimula muli sa bagong tela.","en":"Remove the soaked cloth and start again with a fresh one."},{"fil":"Diinan nang mas mahina para hindi magalaw ang sugat.","en":"Press more gently now so the cut is not disturbed."},{"fil":"Magpatong ng tela, idiin pa rin, magpatawag ng tulong.","en":"Add cloth on top, keep pressing, send for help."}],"correct_option_index":2},{"position":12,"module_position":6,"old_prompt_en":"What is the safe next step?","old_correct_en":"Inform the lead, record handover, and follow up.","prompt_en":"The practice map is done. What is the safe next step?","prompt_fil":"Tapos na ang mapa ng pagsasanay. Ano ang ligtas na susunod na hakbang?","options":[{"fil":"Sabihing bukas ang paaralan kahit hindi pa nasuri ng sinuman.","en":"Say the school is open without checking with anyone."},{"fil":"Ipasuri sa DRRM office at health team ang mapa bago gamitin.","en":"Ask the DRRM office and health team to verify the map before use."},{"fil":"Ipaskil ang mapa ng pagsasanay bilang opisyal na evacuation order ng barangay.","en":"Post the practice map as the barangay's official evacuation order."}],"correct_option_index":1},{"position":13,"module_position":6,"old_prompt_en":"What is the safe next step?","old_correct_en":"Inform the lead, record handover, and follow up.","prompt_en":"You have confirmed the current lead. What is the safe next step?","prompt_fil":"Kumpirmado na ang kasalukuyang lead. Ano ang ligtas na susunod na hakbang?","options":[{"fil":"Gamitin ang lumang roster at ipalagay ang dating mandato.","en":"Use an old roster and assume its former mandate."},{"fil":"Iulat ang lugar, pangangailangan at ginawa; itala ang oras.","en":"Report location, need and action taken; record the time."},{"fil":"Mag-handover nang hindi inaalam kung natanggap ito ng team.","en":"Hand over without checking that the lead or team received it."}],"correct_option_index":1}]$items$::jsonb;
begin
  select count(*), (array_agg(id))[1] into v_matches, v_course_id
  from public.courses
  where title_en = 'The BHW as First Responder'
    and title_fil = 'Ang BHW Bilang First Responder'
    and status = 'published';
  if v_matches = 0 then
    -- A fresh CI database has no published Chapter II course.
    return;
  end if;
  if v_matches <> 1 then
    raise exception 'expected one published Chapter II course, found %', v_matches;
  end if;

  select count(*) into v_count from public.course_test_questions_current
  where course_id = v_course_id;
  if v_count <> 14 then
    raise exception 'expected 14 active Chapter II questions, found %', v_count;
  end if;

  for v_item in select value from jsonb_array_elements(v_items) as t(value) loop
    select * into v_old from public.course_test_questions
    where course_id = v_course_id
      and position = (v_item->>'position')::integer
      and retired_at is null
    for update;
    if v_old.id is null
       or v_old.module_position is distinct from (v_item->>'module_position')::integer
       or v_old.prompt_en is distinct from v_item->>'old_prompt_en'
       or v_old.options->v_old.correct_option_index->>'en' is distinct from v_item->>'old_correct_en' then
      raise exception 'Chapter II question at position % changed; review before replacing', v_item->>'position';
    end if;

    update public.course_test_questions set retired_at = now() where id = v_old.id;
    insert into public.course_test_questions
      (course_id, position, module_position, prompt_en, prompt_fil, options, correct_option_index)
    values
      (v_course_id, (v_item->>'position')::integer, (v_item->>'module_position')::integer,
       v_item->>'prompt_en', v_item->>'prompt_fil', v_item->'options',
       (v_item->>'correct_option_index')::integer);
  end loop;
end
$$;
