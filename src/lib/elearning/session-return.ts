// A session return points only to a Chapter 1 lesson in the same course.
// The caller verifies the IDs against the database before using the href.
export function parseSessionReturn(value:string|undefined) {
  if(!value || !value.startsWith('/training/'))return null;
  try {
    const url=new URL(value,'https://training.local');
    if(url.origin!=='https://training.local'||url.hash)return null;
    const parts=url.pathname.split('/');
    if(parts.length!==6||parts[1]!=='training'||parts[3]!=='chapter-1')return null;
    if(!/^[0-9a-f-]{36}$/i.test(parts[2])||!/^[0-9a-f-]{36}$/i.test(parts[4])||!/^[0-9a-f-]{36}$/i.test(parts[5]))return null;
    const view=url.searchParams.get('view');
    if(view!=='prepare'&&view!=='run')return null;
    for(const key of url.searchParams.keys())if(key!=='view'&&key!=='returnTo')return null;
    const workspace=url.searchParams.get('returnTo');
    if(workspace){
      const nested=new URL(workspace,'https://training.local');
      if(!workspace.startsWith('/')||nested.origin!=='https://training.local'||nested.pathname!==`/training/${parts[2]}/assessor/workspace`||nested.hash)return null;
    }
    return {href:`${url.pathname}${url.search}`,programId:parts[2],moduleId:parts[4],lessonId:parts[5]};
  } catch{return null;}
}
