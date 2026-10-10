// Enumerate and render the complete actual registry without modifying old public media.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(root+'/remotion/package.json');
const {bundle}=require('@remotion/bundler');
const {getCompositions,renderMedia,ensureBrowser}=require('@remotion/renderer');
const browser=await ensureBrowser();
const serveUrl=await bundle({entryPoint:root+'/remotion/src/index.ts',publicDir:root+'/remotion/public'});
const compositions=await getCompositions(serveUrl,{browserExecutable:browser.path});
const ids=compositions.map(c=>c.id);if(new Set(ids).size!==ids.length)throw Error('Duplicate composition IDs');
if(ids.at(-2)!=='ResourcesMonitorStoryFil'||ids.at(-1)!=='ResourcesMonitorStoryEn')throw Error('Target stories are not appended');
const report={date:new Date().toISOString(),registry_source_sha256:createHash('sha256').update(fs.readFileSync(root+'/remotion/src/Root.tsx')).digest('hex'),registry_count:ids.length,ids_in_order:ids,rendered:[],failures:[]};
const save=()=>fs.writeFileSync(root+'/docs/lesson-193-registry.json',JSON.stringify(report,null,2)+'\n');
const dir=root+'/.preview/lesson193-registry';fs.mkdirSync(dir,{recursive:true});save();
for(const composition of compositions){
 const file=dir+'/'+composition.id+'.mp4';
 try{
  await renderMedia({composition,serveUrl,codec:'h264',audioCodec:'aac',outputLocation:file,browserExecutable:browser.path,concurrency:2,crf:28});
  const bytes=fs.readFileSync(file);report.rendered.push({id:composition.id,frames:composition.durationInFrames,fps:composition.fps,width:composition.width,height:composition.height,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  fs.unlinkSync(file);console.log('Rendered '+composition.id+' '+report.rendered.length+'/'+ids.length);
 }catch(e){report.failures.push({id:composition.id,error:String(e)});}
 save();
}
report.status=report.failures.length?'completed with recorded failures':'every composition rendered';save();if(report.failures.length)process.exitCode=1;
