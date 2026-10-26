-- FB-2.2f: give two Chapter II medicinal-plant exam items their published
-- lesson situations and distinct response actions. This changes only new
-- attempts. Retained rows and open assessor snapshots keep their original IDs.
-- The owner-deferred plant-identification-aid request is outside this scope.
-- No generated course or prior question IDs are hardcoded.
do $$
declare
  v_course_id uuid;
  v_matches integer;
  v_count integer;
  v_item jsonb;
  v_old public.course_test_questions%rowtype;
  v_items jsonb := $items$[{"position":8,"module_position":4,"old_prompt_en":"What follows the card check?","old_correct_en":"Consult a clinician.","prompt_en":"Two yard plants share the local name “tsaang gubat.” A resident asks which one to use. After checking the current card, what should the BHW do next?","prompt_fil":"Dalawang halaman sa isang bakuran ang parehong tinatawag na “tsaang gubat.” Nagtanong ang residente kung alin ang gagamitin. Pagkatapos suriin ang kasalukuyang card, ano ang susunod na gagawin ng BHW?","options":[{"fil":"Sabihing gamitin ang halamang tugma ang pangalan.","en":"Tell the resident to use the plant whose name matches."},{"fil":"Ibigay ang dose ng lumang manual para sa tsaang gubat.","en":"Give the old manual’s dose for tsaang gubat."},{"fil":"Itanong ang sintomas at gamot; iugnay sa clinician.","en":"Ask about symptoms and medicines; consult a clinician."}],"correct_option_index":2},{"position":9,"module_position":4,"old_prompt_en":"What is the safe response in the Niyog-niyogan case?","old_correct_en":"Consult a clinician first.","prompt_en":"A child is suspected of having worms. A neighbor wants to pick Niyog-niyogan seeds from a yard plant. What is the safe response?","prompt_fil":"May batang pinaghihinalaang may bulate. Gustong pumitas ng buto ng Niyog-niyogan sa bakuran ang kapitbahay. Ano ang ligtas na tugon?","options":[{"fil":"Hayaang pumitas ang kapitbahay at bigyan ang bata ng kaunting buto.","en":"Let the neighbor pick seeds and give the child a few."},{"fil":"Bigyan ng buto ang bata batay sa table sa lumang manual.","en":"Give the child seeds using the old manual's table."},{"fil":"Ipasuri ang bata sa health center para sa diagnosis.","en":"Refer the child to the health center for diagnosis."}],"correct_option_index":2}]$items$::jsonb;
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
