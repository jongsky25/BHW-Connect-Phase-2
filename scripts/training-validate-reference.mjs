// Offline validation: no credentials, client construction or database access.
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadReferenceModule, contentHash} from "./lib/reference-content.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const modules=process.argv.slice(2);
if(!modules.length || modules.some(m=>!/^[a-z0-9-]+$/.test(m)))throw new Error("Pass one or more existing module folder keys");
const result=modules.map(key=>{
 const content=loadReferenceModule(path.join(root,"content/training/day1-basic-competencies/modules",key),path.join(root,"public"));
 return {module:key,lessons:content.lessons.map(l=>({key:l.manifest.lesson_key,hash:contentHash(l),read:l.revision.read_sections.length,slides:l.revision.slides.length,assetsReady:l.revision.assets.every(a=>a.review_status==="approved")})),writes:0};
});
console.log(JSON.stringify(result,null,2));
