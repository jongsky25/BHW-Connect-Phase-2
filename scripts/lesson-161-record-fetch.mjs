// Opt-in evidence for this draft's fictional TTS/model-review requests only.
// Never save transport headers, credentials, learner data or other endpoints.
import {mkdirSync,writeFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
if(process.env.LESSON161_RAW_EVIDENCE==='1'){
  const nativeFetch=globalThis.fetch;
  globalThis.fetch=async (input,options)=>{
    const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
    // Evidence recorder for the existing build-time fictional-media exception.
    // eslint-disable-next-line no-restricted-syntax
    if(url.hostname!=='generativelanguage.googleapis.com'||!url.pathname.endsWith('/interactions'))return nativeFetch(input,options);
    const directory='.preview/lesson161-raw';mkdirSync(directory,{recursive:true});
    const body=typeof options?.body==='string'?JSON.parse(options.body):null;
    const record={date:new Date().toISOString(),endpoint:url.origin+url.pathname,request:body,request_sha256:createHash('sha256').update(JSON.stringify(body)).digest('hex'),transport_headers:'omitted; no credentials recorded'};
    const save=()=>writeFileSync(`${directory}/${Date.now()}-${randomUUID()}.json`,JSON.stringify(record,null,2)+'\n');
    let response;
    try{response=await nativeFetch(input,options);}catch(error){record.response_status=null;record.response_body=null;record.transport_error=error.name+': '+error.message;save();throw error;}
    const raw=await response.clone().text();record.response_status=response.status;record.response_body=raw;record.response_sha256=createHash('sha256').update(raw).digest('hex');save();
    return response;
  };
}
