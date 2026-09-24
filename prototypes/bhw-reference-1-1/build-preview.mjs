// Produces a portable, self-contained review file, not a deployable app build.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const root=new URL('.',import.meta.url);
const output=process.argv[2];if(!output)throw new Error('Pass an output HTML path');
const [html,css,content,app]=await Promise.all(['index.html','styles.css','content.mjs','app.mjs'].map(f=>readFile(new URL(f,root),'utf8')));
const script=content.replaceAll('export const ','const ')+'\n'+app.replace("import {course, lessons} from './content.mjs';",'');
const result=html.replace('<link rel="stylesheet" href="styles.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="app.mjs"></script>',()=>`<script type="module">${script.replaceAll('</script','<\\/script')}</script>`);
await mkdir(path.dirname(path.resolve(output)),{recursive:true});await writeFile(output,result);console.log(output);
