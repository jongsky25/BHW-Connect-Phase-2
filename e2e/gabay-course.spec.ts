import { expect, test } from '@playwright/test';
import { BARANGAY_BATONG_MALAKE_ID, OTHER_BARANGAY_BHW, STABLE_ADMIN, STABLE_CITY_ADMIN,
  createThrowawayAssessor, createThrowawayBhw, getAccessToken, onboardThroughLogin, restGet } from './fixtures/auth';

const title = 'BHW Connect: Guide to PhilHealth — YAKAP, GAMOT, and the Right Registration Path';
const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const headers = (token: string) => ({ apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

test('Gabay: ten-item quiz, observed fail, feedback, different-card retry, pass, certificate', async ({ page, request }) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const [course] = await restGet(request, adminToken,
    `courses?select=id,status,assessment_kind,quiz_passing_percent,quiz_max_attempts&title_en=eq.${encodeURIComponent(title)}`) as
    Array<{ id: string; status: string; assessment_kind: string; quiz_passing_percent: number; quiz_max_attempts: number }>;
  expect(course).toMatchObject({ assessment_kind: 'gabay_roleplay', quiz_passing_percent: 80, quiz_max_attempts: 3 });
  if (course.status === 'draft') {
    const publish = await request.post(`${base}/rpc/rpc_course_set_status`, { headers: headers(adminToken),
      data: { p_course_id: course.id, p_status: 'published' } });
    expect(publish.ok()).toBe(true);
  } else expect(course.status).toBe('published');

  const bhw = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);
  await onboardThroughLogin(page, bhw.username, bhw.tempPassword, 'GabayBhwPw2026!');
  const bhwToken = await getAccessToken(request, bhw.username, 'GabayBhwPw2026!');
  const [bhwUser] = await restGet(request, adminToken, `users?select=id&username=eq.${bhw.username}`) as Array<{ id: string }>;
  const modules = await restGet(request, bhwToken,
    `course_modules?select=id,type,position&course_id=eq.${course.id}&order=position`) as Array<{ id: string; type: string; position: number }>;
  expect(modules).toHaveLength(6);
  for (const mod of modules.filter((m) => m.type === 'text')) {
    const done = await request.post(`${base}/rpc/rpc_course_module_complete`, { headers: headers(bhwToken),
      data: { p_course_id: course.id, p_module_id: mod.id } });
    expect(done.ok()).toBe(true);
  }
  const quiz = modules.find((m) => m.type === 'quiz');
  expect(quiz).toBeTruthy();
  const learnerQuestions = await restGet(request, bhwToken,
    `course_quiz_questions_public?select=*&module_id=eq.${quiz!.id}&order=position`) as Array<Record<string, unknown>>;
  expect(learnerQuestions).toHaveLength(10);
  expect(learnerQuestions[0]).not.toHaveProperty('correct_option_index');
  expect(await restGet(request, bhwToken, `course_quiz_questions?select=id,correct_option_index&module_id=eq.${quiz!.id}`)).toHaveLength(0);
  const duplicate = await request.post(`${base}/rpc/rpc_course_quiz_submit`, { headers: headers(bhwToken),
    data: { p_course_id: course.id, p_module_id: quiz!.id,
      p_answers: Array.from({ length: 10 }, () => ({ question_id: learnerQuestions[0].id, selected_option_index: 0 })) } });
  expect(duplicate.ok()).toBe(false);

  const keyed = await restGet(request, adminToken,
    `course_quiz_questions?select=id,correct_option_index&module_id=eq.${quiz!.id}&order=position`) as
    Array<{ id: string; correct_option_index: number }>;
  const passed = await request.post(`${base}/rpc/rpc_course_quiz_submit`, { headers: headers(bhwToken),
    data: { p_course_id: course.id, p_module_id: quiz!.id,
      p_answers: keyed.map((q) => ({ question_id: q.id, selected_option_index: q.correct_option_index })) } });
  expect(passed.ok()).toBe(true);
  expect((await passed.json())[0]).toMatchObject({ passed: true, score_percent: 100, attempts_used: 1 });
  expect(await restGet(request, bhwToken, `certificates?select=id&course_id=eq.${course.id}`)).toHaveLength(0);

  const cityAdminToken = await getAccessToken(request, STABLE_CITY_ADMIN.username, STABLE_CITY_ADMIN.password);
  const assessor = await createThrowawayAssessor(request, cityAdminToken, '00000000-0000-0000-0000-000000000004');
  await page.goto('/home');
  await page.getByRole('button', { name: 'Mag-sign out' }).click();
  await expect(page).toHaveURL('/login');
  await onboardThroughLogin(page, assessor.username, assessor.tempPassword, 'AssessorPw2026!');
  const assessorToken = await getAccessToken(request, assessor.username, 'AssessorPw2026!');
  await page.goto('/assessments');
  const item = page.getByRole('listitem').filter({ hasText: bhw.fullName });
  await item.getByRole('button', { name: 'Kunin' }).click();
  const [assigned] = await restGet(request, assessorToken,
    `assessments?select=id,status&course_id=eq.${course.id}&bhw_user_id=eq.${bhwUser.id}&status=eq.assigned`) as Array<{ id: string; status: string }>;
  const legacyBypass = await request.post(`${base}/rpc/rpc_assessment_decide`, { headers: headers(assessorToken),
    data: { p_assessment_id: assigned.id, p_passed: true, p_notes: 'Unobserved pass' } });
  expect(legacyBypass.ok()).toBe(false);
  const claimed = page.getByRole('listitem').filter({ hasText: bhw.fullName });
  await claimed.getByLabel('Sitwasyon sa role-play').selectOption('R1');
  const labels = ['Magtanong at uriin','Ipaliwanag ang daloy','Manatili sa tungkulin ng BHW',
    'Magbigay ng maaaring gawin','Gamitin ang flipchart para sa pasyente','Tiyakin ang pagkaunawa'];
  for (const label of labels.slice(0, 5)) await claimed.getByLabel(label).selectOption('observed');
  await claimed.getByLabel(labels[5]).selectOption('needs_practice');
  await claimed.getByLabel('Naobserbahang salita at kilos').fill('Named the official PIN route, but did not ask the resident to repeat the next step.');
  await claimed.getByLabel('Payo bago muling sumubok').fill('Rehearse teach-back with the YAKAP chart.');
  await claimed.getByRole('button', { name: 'Hindi pasado' }).click();
  await expect(claimed).toHaveCount(0);

  const failed = await restGet(request, bhwToken,
    `assessments?select=id,status,scenario_id,observation,practice_advice&course_id=eq.${course.id}&bhw_user_id=eq.${bhwUser.id}&order=created_at.desc`) as
    Array<{ id: string; status: string; scenario_id: string; observation: Record<string, string>; practice_advice: string }>;
  expect(failed[0]).toMatchObject({ status: 'failed', scenario_id: 'R1', practice_advice: 'Rehearse teach-back with the YAKAP chart.' });
  expect(failed[0].observation.teach_back).toBe('needs_practice');
  const otherToken = await getAccessToken(request, OTHER_BARANGAY_BHW.username, OTHER_BARANGAY_BHW.password);
  const otherRetry = await request.post(`${base}/rpc/rpc_gabay_assessment_retry`, { headers: headers(otherToken),
    data: { p_course_id: course.id } });
  expect(otherRetry.ok()).toBe(false);

  await page.goto('/home');
  await page.getByRole('button', { name: 'Mag-sign out' }).click();
  await expect(page).toHaveURL('/login');
  await page.getByLabel('Username').fill(bhw.username);
  await page.getByLabel('Password').fill('GabayBhwPw2026!');
  await page.getByRole('button', { name: 'Mag-login' }).click();
  await expect(page).toHaveURL('/home');
  await page.goto(`/courses/${course.id}`);
  await expect(page.getByText('Rehearse teach-back with the YAKAP chart.')).toBeVisible();
  await page.getByRole('button', { name: 'Humiling ng muling role-play' }).click();
  await expect(page.getByText('Naghihintay ng pagtatasa')).toBeVisible();

  const attempts = await restGet(request, bhwToken,
    `assessments?select=id,status,scenario_id,attempt_number&course_id=eq.${course.id}&bhw_user_id=eq.${bhwUser.id}&order=created_at.desc`) as Array<{ id: string; status: string; scenario_id: string | null; attempt_number: number }>;
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toMatchObject({ status: 'pending', attempt_number: 2 });
  expect(attempts[1]).toMatchObject({ status: 'failed', attempt_number: 1 });
  const claim = await request.post(`${base}/rpc/rpc_assessment_claim`, { headers: headers(assessorToken),
    data: { p_assessment_id: attempts[0].id } });
  expect(claim.ok()).toBe(true);
  const repeat = await request.post(`${base}/rpc/rpc_gabay_assessment_decide`, { headers: headers(assessorToken),
    data: { p_assessment_id: attempts[0].id, p_scenario_id: 'R1',
      p_observation: Object.fromEntries(['ask_sort','explain','stay_in_role','direct','flipchart','teach_back'].map((k) => [k,'observed'])),
      p_prompt_used: false, p_evidence: 'All six observed.', p_practice_advice: '' } });
  expect(repeat.ok()).toBe(false);
  const pass = await request.post(`${base}/rpc/rpc_gabay_assessment_decide`, { headers: headers(assessorToken),
    data: { p_assessment_id: attempts[0].id, p_scenario_id: 'R2',
      p_observation: Object.fromEntries(['ask_sort','explain','stay_in_role','direct','flipchart','teach_back'].map((k) => [k,'observed'])),
      p_prompt_used: false, p_evidence: 'Asked, explained, stayed in role, directed, used chart, and checked understanding.', p_practice_advice: '' } });
  expect(pass.ok()).toBe(true);
  const certificate = (await pass.json())[0] as { verification_code: string };
  expect(certificate.verification_code).toBeTruthy();
  await page.goto(`/certificates/${certificate.verification_code}`);
  await expect(page.getByText('Wastong sertipiko')).toBeVisible();
});
