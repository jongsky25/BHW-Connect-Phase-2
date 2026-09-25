import { describe, it, expect, vi } from 'vitest';
import { loadTrainingCourse } from '../lib/training-content.mjs';
import { validateActivities, syncActivities } from '../lib/training-activities.mjs';

describe('facilitator activity content', () => {
  const course = loadTrainingCourse('day1-basic-competencies');
  it('validates all 27 bilingual cards and their lesson/indicator mappings', () => {
    const cards=course.modules.flatMap(m=>m.facilitatorNotes.activities);
    expect(cards).toHaveLength(27);
    expect(new Set(cards.map(c=>c.id)).size).toBe(27);
    expect(cards.filter(c=>c.kind==='game').every(c=>!c.objective_indices.length)).toBe(true);
  });
  it('rejects missing translations, unknown indicators and unknown lessons', () => {
    const card=course.modules[0].facilitatorNotes.activities[0];
    const indicators=card.objective_indices.map(objective_index=>({objective_index}));
    expect(()=>validateActivities([{...card,title:{en:'Only English'}}],indicators,card.lesson_keys)).toThrow(/bilingual/);
    expect(()=>validateActivities([card],[],card.lesson_keys)).toThrow(/indicator/);
    expect(()=>validateActivities([card],indicators,[])).toThrow(/lesson/);
    expect(()=>validateActivities([card,card],indicators,card.lesson_keys)).toThrow(/unique/);
  });
  it('preflights the entire selected set before writing and patches only activities', async()=>{
    const mods=course.modules.slice(0,2);
    const lock={course:'course',modules:Object.fromEntries(mods.map((m,i)=>[m.id,`m${i}`]))};
    const get=vi.fn(async url=> url.startsWith('course_modules?') ? [{course_id:'course'}] : [{id:'notes',activities:[],observation_indicators:[0,1,2,3].map(objective_index=>({objective_index}))}]);
    const patch=vi.fn();const client={get,patch};
    await syncActivities(client,mods,lock,false);expect(patch).not.toHaveBeenCalled();
    await syncActivities(client,mods,lock,true);expect(patch).toHaveBeenCalledTimes(2);
    expect(Object.keys(patch.mock.calls[0][1])).toEqual(['activities']);
    patch.mockClear();
    get.mockImplementation(async url=>url.includes('id=eq.m1')?[]:url.startsWith('course_modules?')?[{course_id:'course'}]:[{id:'notes',activities:[],observation_indicators:[0,1,2,3].map(objective_index=>({objective_index}))}]);
    await expect(syncActivities(client,mods,lock,true)).rejects.toThrow(/identity/);
    expect(patch).not.toHaveBeenCalled();
  });
  it('is idempotent after JSONB key reordering and requires a version bump for edits',async()=>{
    const mod=course.modules[0];
    const original=mod.facilitatorNotes.activities;
    const stored=original.map(c=>Object.fromEntries(Object.entries(c).reverse()));
    const client={get:vi.fn(async url=>url.startsWith('course_modules?')?[{course_id:'course'}]:[{id:'n',activities:stored,observation_indicators:[0,1,2,3].map(objective_index=>({objective_index}))}]),patch:vi.fn()};
    const lock={course:'course',modules:{[mod.id]:'m'}};
    expect((await syncActivities(client,[mod],lock,true))[0].action).toBe('unchanged');
    expect(client.patch).not.toHaveBeenCalled();
    const changed={...mod,facilitatorNotes:{...mod.facilitatorNotes,activities:original.map(c=>({...c,minutes:c.minutes+1}))}};
    await expect(syncActivities(client,[changed],lock,true)).rejects.toThrow(/version/);
  });
});
