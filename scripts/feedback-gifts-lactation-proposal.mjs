import { readFileSync,writeFileSync } from 'node:fs';
import { resolve,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLessonMap } from './lib/chapter1-assessment-content.mjs';
import { buildGiftsLactationProposal,renderGiftsLactationReview } from './lib/feedback-gifts-lactation-proposal.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=resolve(root,'content/training/day1-basic-competencies/learner-assessment-v2');
const read=p=>JSON.parse(readFileSync(resolve(dir,p),'utf8'));
const args=process.argv.slice(2),review=args.length===1&&args[0]==='--review';
if(!review&&args.length&&(args.length!==2||args[0]!=='--output'))throw Error('Use no arguments, --review, or --output <new file outside repository>. No import operation.');
const base=read('releases/chapter1-feedback-accreditation-csc-v3/release.json'),proposal=read('proposals/fb-2.4-gifts-lactation/proposal.json');
const candidate=buildGiftsLactationProposal(base,proposal,{...loadLessonMap(root),orientation:read('orientation.json')});
if(!review&&args.length){const output=resolve(args[1]),repository=resolve(root);if(output===repository||output.startsWith(repository+sep))throw Error('Export outside repository.');writeFileSync(output,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});}
if(review)process.stdout.write(renderGiftsLactationReview(base,proposal));
else console.log(JSON.stringify({release_id:candidate.release_id,publication_status:candidate.publication_status,replaced_items:4,unchanged_form_items:56,unchanged_checkpoint_items:48,imported:false,activated:false},null,2));
