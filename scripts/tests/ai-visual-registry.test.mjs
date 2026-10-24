// @vitest-environment node
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {beforeFeedbackVisualLabel} from '../lib/feedback-visual-preservation.mjs';

it('binds every classified illustration and video to existing exact bytes and a provenance source',()=>{
  const registry=JSON.parse(fs.readFileSync('src/lib/elearning/ai-visual-registry.json'));
  const evidence=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-4.1b-visual-provenance.json'));
  const sha=b=>createHash('sha256').update(b).digest('hex');
  for(const [path,record] of Object.entries(registry)){
    expect(sha(fs.readFileSync('public'+path)),path).toBe(record.sha256);
    const sources=evidence.assets.filter(a=>a.path===path);
    expect(sources.length,path).toBeGreaterThan(0);
    for(const source of sources){
      expect(source.provenance).toMatch(/image[ _-]?gen|AI[ -]generated (?:illustration|art|image)|built-in image tool/i);
      if(source.asset_id){
        const original=JSON.parse(fs.readFileSync(source.source)).assets.find(a=>a.id===source.asset_id);
        expect(original.path).toBe(path);expect(original.provenance).toBe(source.provenance);
      }
    }
    for(const [video,hash] of Object.entries(record.videos??{})) expect(sha(fs.readFileSync('public'+video)),video).toBe(hash);
  }
  expect(Object.keys(registry).some(path=>path.endsWith('.svg'))).toBe(false);
});
it('preserves the complete previously released reader for historical audits',()=>{
  const r=JSON.parse(fs.readFileSync('docs/feedback-remediation/fb-4.1b-reader-preservation.json'));
  expect(beforeFeedbackVisualLabel(r.path)).toEqual(execFileSync('git',['show',r.base_commit+':'+r.path]));
});
