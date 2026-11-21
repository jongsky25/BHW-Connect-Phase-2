export const getLocale = async () => new URLSearchParams(location.search).get('locale') ?? 'en';
export const getViewer = async () => ({appUser:{id:'fictional',status:'active'},role:'bhw'});
export function notFound() { throw new Error('Not found'); }
export function redirect() { throw new Error('Unexpected redirect'); }
export const createClient = async () => ({
  from: () => {
    const q = {select:()=>q,eq:()=>q,in:()=>q,limit:async()=>({data:[]}),
      maybeSingle:async()=>({data:{program_id:'fixture',chapter_key:'chapter-1'}})};
    return q;
  },
  rpc: async () => ({error:null,data:{score_percent:0,form_id:'chapter1-saved-posttest-form',release_id:'saved',
    items:[{item_id:'q1',slot:'T1',stem:{en:'Which action protects the household?',fil:'Aling kilos ang nagpoprotekta sa sambahayan?'},
      rationale:{en:'Follow the safe procedure.',fil:'Sundin ang ligtas na pamamaraan.'},correct_option_id:'a',lesson_keys:['bhw-roles-hepo'],
      options:[{id:'a',label:{en:'Safe action',fil:'Ligtas na kilos'}},{id:'b',label:{en:'Unsafe action',fil:'Di ligtas na kilos'},
        distractor_rationale:{en:'This choice misses the safety step.',fil:'Nilalaktawan nito ang hakbang para sa kaligtasan.'}}]}],
    responses:[{item_id:'q1',kind:'choice',option_id:'b'}]}}),
});
