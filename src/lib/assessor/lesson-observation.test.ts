import {describe,expect,it} from 'vitest';
import {lessonObservationReturn,observationHref,parseLessonPracticeContext,selectedWorkspaceLearner} from './lesson-observation';

const program='11111111-1111-4111-8111-111111111111';
const chapter='22222222-2222-4222-8222-222222222222';
const moduleId='33333333-3333-4333-8333-333333333333';
const lesson='44444444-4444-4444-8444-444444444444';
const learner='55555555-5555-4555-8555-555555555555';
const workspace=`/training/${program}/assessor/workspace?search=Ada&learner=${learner}`;
const guide=`/training/${program}/chapter-1/${moduleId}/${lesson}?view=run&returnTo=${encodeURIComponent(workspace)}`;
const context={programId:program,chapterId:chapter,moduleId,lessonId:lesson,
  learner:{id:learner,name:'Ada',barangay:'North'},canRecord:false,criteria:[{
    id:'clarify',version:'v1',requirementsVersion:'req1',rubricVersion:'rubric1',recordable:false,
    rubric:{observable:{fil:'Linawin',en:'Clarify'},levels:{
      kaya_na:{fil:'Kaya',en:'Can do'},kailangan_practice:{fil:'Sanay',en:'Needs practice'},hindi_pa:{fil:'Hindi',en:'Not yet'},
    }},
  }]};

describe('C1AF-14 lesson observation context',()=>{
  it('binds learner, lesson, and return URL to the same program',()=>{
    expect(selectedWorkspaceLearner(workspace,program)).toBe(learner);
    expect(lessonObservationReturn(guide,program,lesson,learner,moduleId)).toBe(guide);
    expect(observationHref(program,lesson,learner,guide)).toContain(`learner=${learner}`);
    expect(selectedWorkspaceLearner(workspace.replace(program,chapter),program)).toBeNull();
    expect(lessonObservationReturn(guide,program,lesson,chapter,moduleId)).toBeNull();
  });
  it('rejects malformed reviewed anchors and mismatched subjects',()=>{
    expect(parseLessonPracticeContext(context,program,lesson,learner)).toEqual(context);
    expect(parseLessonPracticeContext(context,program,lesson,chapter)).toBeNull();
    expect(parseLessonPracticeContext({...context,criteria:[{...context.criteria[0],recordable:null}]},program,lesson,learner)).toBeNull();
    expect(parseLessonPracticeContext({...context,criteria:[{...context.criteria[0],rubric:{}}]},program,lesson,learner)).toBeNull();
  });
});
