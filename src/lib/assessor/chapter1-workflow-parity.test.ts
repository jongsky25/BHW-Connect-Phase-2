import {describe,expect,it} from 'vitest';
import {storyScenes} from './simulation-storyboard';
import {chapter1Terms,checkpointParity} from './chapter1-workflow-parity';

describe('C1AF-20b checkpoint parity',()=>{
 it('covers every server checkpoint with current bilingual surfaces and shared live labels',()=>{
  expect(Object.keys(checkpointParity)).toEqual(storyScenes.map(scene=>scene.id));
  const terms=Object.values(chapter1Terms);
  for(const scene of storyScenes){
   const adapter=checkpointParity[scene.id as keyof typeof checkpointParity];
   expect(terms).toContain(adapter.surface);
   expect(adapter.actions.length).toBeGreaterThan(0);
   for(const action of adapter.actions)expect(terms).toContain(action);
   for(const pair of [adapter.surface,adapter.state,...adapter.actions]){
    expect(pair.en.trim()).not.toBe('');expect(pair.fil.trim()).not.toBe('');
   }
  }
 });
 it('keeps the real decision and certificate boundary explicit in the fictional review',()=>{
  expect(checkpointParity['final-review'].state.en).toContain('server');
  expect(checkpointParity['final-review'].state.en).toContain('no verification code');
  expect(checkpointParity.observe.state.en).toContain('fictional checkboxes');
  expect(checkpointParity.missing.state.en).toContain('unrated');
 });
});
