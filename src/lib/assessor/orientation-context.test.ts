// @vitest-environment node
import {describe,expect,it,vi} from 'vitest';
import {chapter1OrientationContext} from './orientation-context';
import orientation from '../../../content/assessor/chapter-1-orientation.v1.json';
import manifest from '../../../content/assessor/bhw-reference-manual.v1.json';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

vi.mock('server-only',()=>({}));
const state={...orientation,ready:true,passed:false,cases:orientation.cases.map(({id,indicator,case:observation,...rest})=>({id,indicator,case:observation,critical:'critical' in rest && rest.critical}))};
describe('current Chapter 1 calibration context',()=>{
  it('uses every exact existing observable and anchor with no answer keys or draft mappings',()=>{
    const context=chapter1OrientationContext(state)!;
    expect(Object.keys(context)).toHaveLength(8);
    for(const item of state.cases){
      const subchapter=manifest.chapters[0].modules.find(m=>m.indicators.some(i=>i.id===item.indicator))!;
      const raw=readFileSync(subchapter.rubric_source);
      expect(createHash('sha256').update(raw).digest('hex')).toBe(subchapter.rubric_sha256);
      const rubric=JSON.parse(raw.toString()).observation_indicators.find((r:{objective_index:number})=>r.objective_index===subchapter.indicators.find(i=>i.id===item.indicator)!.source_objective_index);
      expect(context[item.id].title).toEqual(subchapter.title);
      for(const language of ['fil','en'] as const){
        expect(context[item.id].observable[language]).toBe(rubric[`observable_${language}`]);
        for(const rating of ['kaya_na','kailangan_practice','hindi_pa'] as const)expect(context[item.id].anchors[rating][language]).toBe(rubric.levels[`${rating}_${language}`]);
      }
      expect(Object.keys(context[item.id])).toEqual(['title','observable','anchors']);
    }
    expect(manifest.chapters[0].curriculum_status).toBe('draft');
  });
  it('withholds context for a different version, threshold, missing or mismatched case',()=>{
    expect(chapter1OrientationContext({...state,orientation_version:'unreviewed'})).toBeNull();
    expect(chapter1OrientationContext({...state,passing_count:6})).toBeNull();
    expect(chapter1OrientationContext({...state,cases:state.cases.slice(1)})).toBeNull();
    for(const change of [{indicator:'draft-criterion'},{critical:true},{case:{en:'changed',fil:'changed'}}])
      expect(chapter1OrientationContext({...state,cases:state.cases.map((c,i)=>i?c:{...c,...change})})).toBeNull();
  });
});
