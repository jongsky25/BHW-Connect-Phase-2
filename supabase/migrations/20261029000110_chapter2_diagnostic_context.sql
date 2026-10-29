-- FB-2.2: make the remaining Chapter II diagnostic prompts understandable
-- before the lessons. New attempts get new item IDs; existing assessor exam
-- snapshots and submitted scores retain the retired question IDs and wording.
-- Options, correct indices, module positions, count and pass rules do not move.
do $$
declare
  v_course_id uuid;
  v_matches integer;
  v_count integer;
  v_item jsonb;
  v_old public.course_test_questions%rowtype;
  v_items jsonb := $items$[
    {
      "position": 10,
      "module_position": 5,
      "old_prompt_en": "What should happen before choosing an update channel?",
      "old_prompt_fil": "Ano ang dapat gawin bago pumili ng paraan ng pagpapabalita?",
      "old_correct_en": "Ask people who miss updates.",
      "prompt_en": "Some residents learned about a BHS schedule change too late. A leader wants to use group chat for future updates. What should the group do before choosing an update channel?",
      "prompt_fil": "Huli nang nalaman ng ilang residente ang pagbabago sa iskedyul ng BHS. Nais ng isang lider na gumamit ng group chat para sa susunod na balita. Ano ang dapat gawin ng grupo bago pumili ng paraan ng pagpapabalita?"
    },
    {
      "position": 12,
      "module_position": 6,
      "old_prompt_en": "The practice map is done. What is the safe next step?",
      "old_prompt_fil": "Tapos na ang mapa ng pagsasanay. Ano ang ligtas na susunod na hakbang?",
      "old_correct_en": "Ask the DRRM office and health team to verify the map before use.",
      "prompt_en": "After a flood exercise in Barangay Maligaya, the BHW finishes a practice map showing riverside homes and a possible school shelter. What is the safe next step before the map is used?",
      "prompt_fil": "Pagkatapos ng pagsasanay tungkol sa baha sa Barangay Maligaya, natapos ng BHW ang mapa ng pagsasanay na may mga bahay sa tabing-ilog at posibleng silungan sa paaralan. Ano ang ligtas na susunod na hakbang bago gamitin ang mapa?"
    },
    {
      "position": 13,
      "module_position": 6,
      "old_prompt_en": "You have confirmed the current lead. What is the safe next step?",
      "old_prompt_fil": "Kumpirmado na ang kasalukuyang lead. Ano ang ligtas na susunod na hakbang?",
      "old_correct_en": "Report location, need and action taken; record the time.",
      "prompt_en": "After flooding, a BHW confirms who currently leads the local response team. A household needs help. What should the BHW do next to hand over the concern?",
      "prompt_fil": "Pagkatapos ng baha, kinumpirma ng BHW kung sino ang kasalukuyang namumuno sa lokal na response team. May pamilyang nangangailangan ng tulong. Ano ang susunod na gagawin ng BHW upang maipasa ang alalahanin?"
    }
  ]$items$::jsonb;
begin
  select count(*), (array_agg(id))[1] into v_matches, v_course_id
  from public.courses
  where title_en = 'The BHW as First Responder'
    and title_fil = 'Ang BHW Bilang First Responder'
    and status = 'published';
  if v_matches = 0 then return; end if;
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
       or v_old.prompt_fil is distinct from v_item->>'old_prompt_fil'
       or v_old.options->v_old.correct_option_index->>'en' is distinct from v_item->>'old_correct_en' then
      raise exception 'Chapter II question at position % changed; review before replacing', v_item->>'position';
    end if;
    update public.course_test_questions set retired_at = now() where id = v_old.id;
    insert into public.course_test_questions
      (course_id, position, module_position, prompt_en, prompt_fil, options, correct_option_index)
    values
      (v_course_id, v_old.position, v_old.module_position,
       v_item->>'prompt_en', v_item->>'prompt_fil', v_old.options,
       v_old.correct_option_index);
  end loop;
end
$$;
