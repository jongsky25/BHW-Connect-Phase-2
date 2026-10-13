import {describe,expect,it} from 'vitest';
import {parseSessionReturn} from './session-return';

const program='11111111-1111-4111-8111-111111111111';
const moduleId='22222222-2222-4222-8222-222222222222';
const lesson='33333333-3333-4333-8333-333333333333';
const guide=`/training/${program}/chapter-1/${moduleId}/${lesson}?view=run`;

describe('session return handoff',()=>{
  it('keeps guide view and the same-program workspace context',()=>{
    const workspace=`/training/${program}/assessor/workspace?search=Maria&area=barangay&page=2&learner=${lesson}`;
    const value=`${guide}&returnTo=${encodeURIComponent(workspace)}`;
    expect(parseSessionReturn(value)).toMatchObject({href:value,programId:program,moduleId,lessonId:lesson});
    expect(parseSessionReturn(guide.replace('view=run','view=prepare'))?.href).toContain('view=prepare');
  });
  it.each([
    'https://evil.example/training/x',
    '//evil.example/training/x',
    `${guide}&returnTo=${encodeURIComponent('https://evil.example/')}`,
    `${guide}&returnTo=${encodeURIComponent('/training/99999999-9999-4999-8999-999999999999/assessor/workspace')}`,
    guide.replace('view=run','view=unknown'),
    `${guide}&next=/home`,
    `${guide}#fragment`,
    [guide,guide],
  ])('rejects invalid return destination %s',value=>expect(parseSessionReturn(value)).toBeNull());
});
