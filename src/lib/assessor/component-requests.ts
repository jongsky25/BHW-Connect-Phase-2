const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const string=(v:unknown):v is string=>typeof v==='string';
const nullableString=(v:unknown):v is string|null=>v===null||string(v);

export type ComponentRequestQueueItem={id:string;moduleId:string;moduleTitleFil:string;
  moduleTitleEn:string;learnerName:string;status:'pending'|'assigned'|'arranged';
  agreedAt:string|null;location:string|null;assignedToMe:boolean;
  requestedByMe:boolean;assignedUnavailable:boolean};
export function parseComponentRequestQueue(value:unknown):ComponentRequestQueueItem[]|null{
  if(!Array.isArray(value)||value.length>50||!value.every(v=>object(v)&&string(v.id)
    &&string(v.moduleId)&&string(v.moduleTitleFil)&&string(v.moduleTitleEn)
    &&string(v.learnerName)&&['pending','assigned','arranged'].includes(String(v.status))
    &&nullableString(v.agreedAt)&&nullableString(v.location)
    &&typeof v.assignedToMe==='boolean'&&typeof v.requestedByMe==='boolean'
    &&typeof v.assignedUnavailable==='boolean'))return null;
  return value as ComponentRequestQueueItem[];
}

export type BhwComponentRequest={id:string;moduleTitleFil:string;moduleTitleEn:string;
  status:'pending'|'assigned'|'arranged'|'assessed'|'cancelled'|'released';
  purposeFil:string;purposeEn:string;criteria:{fil:string;en:string}[];
  assessorName:string|null;agreedAt:string|null;location:string|null;note:string|null};
export function parseBhwComponentRequests(value:unknown):BhwComponentRequest[]|null{
  if(!Array.isArray(value)||value.length>20||!value.every(v=>object(v)&&string(v.id)
    &&string(v.moduleTitleFil)&&string(v.moduleTitleEn)
    &&['pending','assigned','arranged','assessed','cancelled','released'].includes(String(v.status))
    &&string(v.purposeFil)&&string(v.purposeEn)&&Array.isArray(v.criteria)
    &&v.criteria.every((c:unknown)=>object(c)&&string(c.fil)&&string(c.en))
    &&nullableString(v.assessorName)&&nullableString(v.agreedAt)
    &&nullableString(v.location)&&nullableString(v.note)))return null;
  return value as BhwComponentRequest[];
}
