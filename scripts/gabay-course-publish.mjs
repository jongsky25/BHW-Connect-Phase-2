#!/usr/bin/env node
// Publish only the staged Gabay course through the audited admin RPC.
// The default is a read-only plan. Pilot use requires --release-pilot and
// ALLOW_PILOT=1, in addition to an authenticated national admin account.
import { loadGabayContent } from './lib/gabay-content.mjs';
import { PILOT_PROJECT_REF } from './lib/pilot-guard.mjs';
import { assertGabayReleaseApproved } from './lib/gabay-release-approval.mjs';
import { createClient, projectUrl, requireEnv, signIn } from './lib/supabase-rest.mjs';

const args = process.argv.slice(2);
const allowed = new Set(['--project', '--org-unit', '--owner', '--apply', '--release-pilot']);
if (args.some((arg) => arg.startsWith('--') && !allowed.has(arg))) throw new Error('unknown argument');
const value = (flag) => { const i = args.indexOf(flag); return i < 0 ? null : args[i + 1]; };
const project = value('--project');
const orgName = value('--org-unit');
const owner = value('--owner');
const apply = args.includes('--apply');
const pilotRelease = project === PILOT_PROJECT_REF && args.includes('--release-pilot');
if (project !== 'local' && !pilotRelease) throw new Error('publish is limited to local or the explicitly reviewed pilot');
if (args.includes('--release-pilot') && !pilotRelease) throw new Error('--release-pilot requires the exact pilot project');
if (!orgName || !owner) throw new Error('--org-unit and --owner are required');
if (pilotRelease && orgName !== 'Department of Health') throw new Error('pilot Gabay course must be nationally scoped');
if (pilotRelease) assertGabayReleaseApproved();
if (owner !== process.env.KB_LOADER_USERNAME) throw new Error('--owner must match the signed-in admin');

const content = loadGabayContent();
const url = projectUrl(project);
const anonKey = process.env.KB_LOADER_ANON_KEY ?? requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const token = await signIn(url, anonKey, requireEnv('KB_LOADER_USERNAME'), requireEnv('KB_LOADER_PASSWORD'));
const client = createClient(url, anonKey, token);
const orgs = await client.get(`org_units?select=id,level&name=eq.${encodeURIComponent(orgName)}`);
if (orgs.length !== 1) throw new Error('org unit name must resolve uniquely');
if (pilotRelease && orgs[0].level !== 'national') throw new Error('pilot Gabay course must be in the national org');
const admins = await client.get(`users?select=id,role,status,org_unit_id&username=eq.${encodeURIComponent(owner)}`);
if (admins.length !== 1 || admins[0].role !== 'admin' || admins[0].status !== 'active') throw new Error('active admin required');
if (pilotRelease && admins[0].org_unit_id !== orgs[0].id) throw new Error('pilot publisher must be a national admin');
const courses = await client.get(`courses?select=id,status,org_unit_id,assessment_kind,title_en&title_en=eq.${encodeURIComponent(content.title_en)}`);
if (courses.length !== 1) throw new Error('expected exactly one staged Gabay course');
const course = courses[0];
if (course.org_unit_id !== orgs[0].id || course.assessment_kind !== 'gabay_roleplay') throw new Error('Gabay course scope or assessment mismatch');
if (course.status !== 'draft' && course.status !== 'published') throw new Error(`unexpected course status: ${course.status}`);
const modules = await client.get(`course_modules?select=id,type&course_id=eq.${course.id}`);
if (modules.length !== 6 || modules.filter((m) => m.type === 'quiz').length !== 1) throw new Error('expected five lessons and one quiz');
const quiz = modules.find((m) => m.type === 'quiz');
const questions = await client.get(`course_quiz_questions?select=id&module_id=eq.${quiz.id}`);
if (questions.length !== 10) throw new Error('expected ten quiz questions');
const progress = await client.get(`course_progress?select=id&course_id=eq.${course.id}&limit=1`);
if (course.status === 'draft' && progress.length) throw new Error('draft Gabay course already has learner progress');
console.log(JSON.stringify({ mode: apply ? 'publish' : 'read-only plan', project,
  org: orgName, courseId: course.id, status: course.status, modules: modules.length,
  quizQuestions: questions.length }, null, 2));
if (!apply || course.status === 'published') process.exit(0);
await client.rpc('rpc_course_set_status', { p_course_id: course.id, p_status: 'published' });
const [after] = await client.get(`courses?select=id,status&id=eq.${course.id}`);
if (after?.status !== 'published') throw new Error('course publish did not persist');
console.log('Gabay course published through rpc_course_set_status.');
