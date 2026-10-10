// Re-enumerate the frozen draft; bind every actual render receipt to current metadata.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(root+'/remotion/package.json');
const {bundle}=require('@remotion/bundler');
const {getCompositions,ensureBrowser}=require('@remotion/renderer');
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=fs.readFileSync(root+'/docs/lesson-193-registry.json'),rendered=JSON.parse(bytes);
assert.equal(rendered.status,'every composition rendered');assert.deepEqual(rendered.failures,[]);
assert.equal(rendered.registry_source_sha256,sha(fs.readFileSync(root+'/remotion/src/Root.tsx')));
const browserExecutable=process.env.PLAYWRIGHT_EXECUTABLE_PATH??(await ensureBrowser()).path;
const serveUrl=await bundle({entryPoint:root+'/remotion/src/index.ts',publicDir:root+'/remotion/public'});
const compositions=await getCompositions(serveUrl,{browserExecutable});
assert.deepEqual(compositions.map(c=>c.id),rendered.ids_in_order);
assert.equal(compositions.length,rendered.registry_count);assert.equal(compositions.length,rendered.rendered.length);
for(const [i,c] of compositions.entries()){
 const r=rendered.rendered[i];assert.equal(r.id,c.id);
 for(const [field,key] of [['durationInFrames','frames'],['fps','fps'],['width','width'],['height','height']])assert.equal(c[field],r[key],c.id+' '+field);
 assert(r.bytes>0&&/^[a-f0-9]{64}$/.test(r.sha256));
}
const report={status:'current frozen-head runtime matches every actual registry render receipt',source_commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),registry_report_sha256:sha(bytes),registry_source_sha256:rendered.registry_source_sha256,actual_compositions:compositions.length,ids_in_order:compositions.map(c=>c.id),all_metadata_match:true,scope:'Runtime enumeration/order/frames/fps/dimensions and render receipts; exact source/media preservation is verified separately. No owner approval.'};
fs.writeFileSync(root+'/docs/lesson-193-registry-verification.json',JSON.stringify(report,null,2)+'\n');
console.log('Verified current runtime metadata for every '+compositions.length+' rendered composition.');
