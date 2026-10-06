// Opt-in evidence for this draft's fictional TTS/model-review requests only.
// Never save transport headers, credentials, learner data or other endpoints.
import {mkdirSync,writeFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
if(process.env.LESSON151_RAW_EVIDENCE==='1'){
  const nativeFetch=globalThis.fetch;
  globalThis.fetch=async (input,options)=>{
    const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
    const response=await nativeFetch(input,options);
    // Evidence recorder for the existing build-time fictional-media exception.
    // eslint-disable-next-line no-restricted-syntax
    if(url.hostname==='generativelanguage.googleapis.com'&&url.pathname.endsWith('/interactions')){
      const directory='.preview/lesson151-raw';mkdirSync(directory,{recursive:true});
      const body=typeof options?.body==='string'?JSON.parse(options.body):null;
      const raw=await response.clone().text();
      writeFileSync(`${directory}/${Date.now()}-${randomUUID()}.json`,JSON.stringify({date:new Date().toISOString(),endpoint:url.origin+url.pathname,request:body,response_status:response.status,response_body:raw,response_sha256:createHash('sha256').update(raw).digest('hex'),transport_headers:'omitted; no credentials recorded'},null,2)+'\n');
    }
    return response;
  };
}
