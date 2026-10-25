// Real HTTP interruptions against a disposable in-memory endpoint, never Supabase.
import fs from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(root, 'scripts/tests/fixtures/training-connection-browser');
const release = JSON.parse(fs.readFileSync(join(root, 'content/training/day1-basic-competencies/learner-assessment-v2/releases/chapter1-feedback-gifts-lactation-v4/release.json')));
const items = release.forms.pretest.items.map(({item_id, slot, stem, options, lesson_keys}) => ({item_id, slot, stem, options, lesson_keys}));
const states = new Map();
function stateFor(key, complete = false) {
  const state = {attempt: {attempt_id: 'draft', phase: 'pretest', state: 'draft', revision: 0,
    position: complete ? 29 : 0, language: 'en', score_percent: null, legacy_attempt_id: null, items,
    responses: complete ? items.map(i => ({item_id: i.item_id, kind: 'choice', option_id: i.options[0].id, marked: false})) : []},
    receipts: new Map(), saveCommits: 0, submitCommits: 0, completionCommits: 0, calls: [], resumes: [], completed: [],
    delaySave: 0, delayLoad: 0};
  states.set(key, state); return state;
}
const server = await createServer({configFile: false, root: fixture,
  plugins: [{name: 'local-training-rpc', configureServer(server) {server.middlewares.use('/fixture/rpc', handleRpc);}}],
  resolve: {alias: [
    {find: '@/lib/supabase/client', replacement: join(fixture, 'client.ts')},
    {find: 'next/image', replacement: join(fixture, 'image.tsx')},
    {find: 'next/link', replacement: join(root, 'scripts/tests/fixtures/assessment-readability-browser/link.tsx')},
    {find: 'next/navigation', replacement: join(fixture, 'navigation.ts')},
    {find: /^@\//, replacement: `${join(root, 'src')}/`},
  ]}, esbuild: {jsx: 'automatic'}, server: {host: '127.0.0.1', port: 0}, logLevel: 'error'});
async function handleRpc(req, res) {
  try {
    const state = states.get(new URL(req.url, 'http://localhost').searchParams.get('case'));
    if (!state || req.method !== 'POST') {res.statusCode = 404; res.end(); return;}
    let body = ''; for await (const chunk of req) body += chunk;
    const {name, args} = JSON.parse(body); state.calls.push({name, args});
    let data;
    if (name === 'fixture_state') {
      if (state.delayLoad) await new Promise(resolve => setTimeout(resolve, state.delayLoad));
      data = {resumes: state.resumes, completed: state.completed};
    } else if (name === 'rpc_learner_assessment_get') data = state.attempt;
    else if (name === 'rpc_learner_assessment_state') data = {attempts: [], final_attempts: []};
    else if (name === 'rpc_learner_assessment_save') {
      if (state.delaySave) await new Promise(resolve => setTimeout(resolve, state.delaySave));
      if (state.receipts.has(args.p_mutation_id)) data = state.receipts.get(args.p_mutation_id);
      else {
        if (args.p_expected_revision !== state.attempt.revision) throw Error('stale revision');
        state.attempt = {...state.attempt, position: args.p_position, revision: state.attempt.revision + 1,
          responses: [...state.attempt.responses.filter(r => !args.p_changes.some(c => c.item_id === r.item_id)), ...args.p_changes]};
        state.saveCommits++; data = state.attempt; state.receipts.set(args.p_mutation_id, data);
      }
    } else if (name === 'rpc_learner_assessment_submit') {
      if (state.attempt.state !== 'submitted') {
        state.submitCommits++; state.attempt = {...state.attempt, state: 'submitted', score_percent: 80, legacy_attempt_id: 'final'};
      }
      data = state.attempt;
    } else if (name === 'rpc_course_lesson_resume') {
      state.resumes = [{lesson_id: args.p_lesson_id, revision_id: args.p_revision_id, course_progress_id: 'fixture',
        modality: args.p_modality, language: args.p_language, position_key: args.p_position_key,
        concept_id: args.p_concept_id, updated_at: new Date().toISOString()}]; data = null;
    } else if (name === 'rpc_course_lesson_complete') {
      state.completionCommits++; state.completed = [{course_progress_id: 'fixture', lesson_id: 'lesson',
        revision_id: 'revision', completed_at: new Date().toISOString(), completion_basis: 'learner'}]; data = null;
    } else throw Error(`Unexpected fixture RPC: ${name}`);
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({data, error: null}));
  } catch (error) {res.statusCode = 500; res.end(String(error));}
}
let browser;
let cases = 0;
async function screenshot(locator, file) {
  const directory = process.env.TRAINING_CONNECTION_SCREENSHOTS;
  if (directory) {fs.mkdirSync(directory, {recursive: true}); await locator.screenshot({path: join(directory, file)});}
}
try {
  await server.listen();
  browser = await chromium.launch({headless: true, args: ['--no-sandbox'], executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
  for (const lang of ['en', 'fil']) {
    const context = await browser.newContext({viewport: {width: 320, height: 844}});
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const name = (en, fil) => lang === 'en' ? en : fil;
    const url = (key, mode = 'assessment') => `${server.resolvedUrls.local[0]}?case=${key}&lang=${lang}&mode=${mode}`;
    const open = async key => {
      await page.goto(url(key));
      await page.getByRole('button', {name: name('Resume pretest', 'Ipagpatuloy ang pretest')}).click();
      await expect(page.locator('[aria-label="'+name('Assessment questions', 'Mga tanong sa pagtatasa')+'"]')).toBeVisible();
    };
    // Slow response: current answer stays visible and navigation waits for confirmation.
    const slow = stateFor(`slow-${lang}`); slow.delaySave = 1800; await open(`slow-${lang}`);
    await page.getByRole('radio').first().check();
    await expect(page.getByRole('status')).toContainText(name('Saving…', 'Nagse-save…'));
    await expect(page.getByRole('button', {name: name('Next', 'Susunod'), exact: true})).toBeDisabled();
    await expect(page.getByRole('radio').first()).toBeChecked();
    await expect.poll(() => slow.saveCommits).toBe(1);
    await expect(page.getByRole('status')).toContainText(name('Saved', 'Naka-save')); cases++;
    // Actual browser offline mode rejects HTTP; retry sends the original selected answer.
    await context.setOffline(true); await page.getByRole('radio').nth(1).check();
    const notice = page.getByRole('status', {name: name('Connection status', 'Kalagayan ng koneksyon')});
    await expect(notice).toBeVisible(); await expect(page.getByRole('alert')).toBeVisible();
    await screenshot(notice, `assessment-offline-${lang}.png`);
    await expect(page.getByRole('button', {name: name('Retry save', 'Subukang i-save muli')})).toBeVisible();
    await expect(page.getByRole('radio').nth(1)).toBeChecked();
    expect(slow.saveCommits).toBe(1);
    await expect(page.getByRole('link', {name: name('Save and leave', 'I-save at umalis')})).toHaveAttribute('aria-disabled', 'true');
    await context.setOffline(false); slow.delaySave = 0;
    await expect(notice).toContainText(name('Your connection may be back.', 'Maaaring bumalik na ang koneksyon.'));
    await screenshot(notice, `assessment-restored-${lang}.png`);
    await page.getByRole('button', {name: name('Dismiss connection message', 'Isara ang mensahe ng koneksyon')}).click();
    await expect(notice).toHaveCount(0);
    await expect(page.getByRole('radio').nth(1)).toBeChecked();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button', {name: name('Retry save', 'Subukang i-save muli')}).click();
    await expect.poll(() => slow.saveCommits).toBe(2);
    await expect(page.getByRole('alert')).toHaveCount(0);
    const selected = slow.attempt.responses[0].option_id;
    await page.reload(); await page.getByRole('button', {name: name('Resume pretest', 'Ipagpatuloy ang pretest')}).click();
    await expect(page.getByRole('radio').nth(1)).toBeChecked(); expect(slow.attempt.responses[0].option_id).toBe(selected); cases++;
    // A save commits, but its HTTP response is lost; retry must reuse its mutation receipt.
    const lost = stateFor(`lost-${lang}`); await open(`lost-${lang}`); let dropSave = true;
    await page.route('**/fixture/rpc?*', async route => {
      if (dropSave && route.request().postDataJSON().name === 'rpc_learner_assessment_save') {
        dropSave = false; await route.fetch(); await route.abort('failed');
      } else await route.continue();
    });
    await page.getByRole('radio').first().check(); await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button', {name: name('Retry save', 'Subukang i-save muli')}).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(lost.saveCommits).toBe(1);
    const saves = lost.calls.filter(c => c.name === 'rpc_learner_assessment_save');
    expect(saves).toHaveLength(2); expect(saves[0].args.p_mutation_id).toBe(saves[1].args.p_mutation_id);
    await page.unroute('**/fixture/rpc?*'); cases++;
    // Submission commits, then BOTH response and confirmation are lost. Retry reconciles once.
    const submitted = stateFor(`submitted-${lang}`, true); await open(`submitted-${lang}`);
    await page.getByRole('button', {name: name('Review all', 'Balikan ang lahat'), exact: true}).click();
    let blockConfirmation = false;
    await page.route('**/fixture/rpc?*', async route => {
      const rpc = route.request().postDataJSON().name;
      if (rpc === 'rpc_learner_assessment_submit' && !blockConfirmation) {
        await route.fetch(); blockConfirmation = true; await route.abort('failed');
      } else if (blockConfirmation && rpc === 'rpc_learner_assessment_get') await route.abort('failed');
      else await route.continue();
    });
    page.once('dialog', d => d.accept());
    await page.getByRole('button', {name: name('Submit assessment', 'Isumite ang pagtatasa'), exact: true}).click();
    await expect(page.getByRole('alert')).toContainText(name('Submission is not confirmed.', 'Hindi pa kumpirmado ang pagsusumite.'));
    await expect(page.getByRole('button', {name: name('Submit assessment', 'Isumite ang pagtatasa'), exact: true})).toBeEnabled();
    expect(submitted.submitCommits).toBe(1); expect(submitted.attempt.responses).toHaveLength(30);
    await page.unroute('**/fixture/rpc?*'); page.once('dialog', d => d.accept());
    await page.getByRole('button', {name: name('Submit assessment', 'Isumite ang pagtatasa'), exact: true}).click();
    await expect(page.getByRole('heading', {name: name('Assessment submitted', 'Naisumite ang pagtatasa')})).toBeVisible();
    expect(submitted.submitCommits).toBe(1); cases++;
    // Loaded lesson text survives an outage; explicit retries persist position and completion.
    const lesson = stateFor(`lesson-${lang}`); lesson.delayLoad = 1800;
    await page.goto(url(`lesson-${lang}`, 'lesson'));
    await expect(page.getByRole('status')).toContainText(name('Loading training…', 'Binubuksan ang pagsasanay…'));
    await screenshot(page.getByRole('status'), `loading-${lang}.png`);
    await expect(page.getByRole('heading', {name: name('first section', 'Bahagi: first')})).toBeVisible();
    await context.setOffline(true);
    await page.getByRole('button', {name: name('Next', 'Susunod'), exact: true}).click();
    await expect(page.getByRole('heading', {name: name('second section', 'Bahagi: second')})).toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible({timeout: 10000});
    await expect(page.getByText(name('Previously loaded second lesson text.', 'Nakabukas nang teksto ng aralin: second.'))).toBeVisible();
    await context.setOffline(false);
    await page.getByRole('button', {name: name('Retry saving position', 'Subukang i-save muli')}).click();
    await expect(page.getByRole('alert')).toHaveCount(0); expect(lesson.resumes[0].position_key).toBe('second');
    lesson.delayLoad = 0; await page.reload();
    await expect(page.getByRole('heading', {name: name('second section', 'Bahagi: second')})).toBeVisible();
    await page.getByRole('button', {name: name('Next', 'Susunod'), exact: true}).click();
    await context.setOffline(true);
    await page.getByRole('button', {name: name('Mark lesson complete', 'Markahang tapos ang aralin'), exact: true}).click();
    await expect(page.getByRole('alert')).toContainText(name('Completion could not be saved.', 'Hindi nai-save ang pagkumpleto.'));
    await expect(page.getByRole('button', {name: name('Completed', 'Natapos'), exact: true})).toHaveCount(0);
    expect(lesson.completionCommits).toBe(0);
    await context.setOffline(false);
    await page.getByRole('button', {name: name('Mark lesson complete', 'Markahang tapos ang aralin'), exact: true}).click();
    await expect(page.getByRole('button', {name: name('Completed', 'Natapos'), exact: true})).toBeDisabled();
    expect(lesson.completionCommits).toBe(1);
    const scan = await new AxeBuilder({page}).include('main').withTags(['wcag2a', 'wcag2aa']).analyze(); expect(scan.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]); cases++;
    await context.close();
  }
  console.log(`Training connection recovery passed: ${cases} interrupted/slow HTTP cases, no lost saved answer or position and no duplicate submission.`);
} finally {await browser?.close(); await server.close();}
