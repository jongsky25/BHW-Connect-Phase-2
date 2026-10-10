// Target-only 1.9.2 delivery after full/focused reviews identified timbre disagreements.
// Other languages, lessons and historical audio retain exact style/hash inputs.
export function resourcesSafeChangeStyle(language, sectionId) {
  if(!['fil','en'].includes(language)||!['utilities','materials','workflow','worked-example','practice','check'].includes(sectionId))return undefined;
  return `Delivery revision 2. Speak ${language==='fil'?'natural everyday Filipino':'natural Philippine English'} as one settled adult FEMALE Kore community trainer in a warm feminine mid register. Every separately supplied sentence continues the same woman narrator, including heading, quotations, questions and takeaway. Never switch to a male, baritone or second quizmaster voice. Preserve exact words and all consonants; do not drop syllables in kumpirmahin or change dummy to dami. Keep the proper name Charlaine as written throughout, never replace it with Charlene. Preserve all negations, conditions, unknown approval and no-savings qualifications. Complete the ending, add nothing and do not translate.`;
}
