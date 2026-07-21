// Pure-JS approximation of pg_trgm's similarity(): pad with boundary
// spaces, extract the set of overlapping 3-grams, and score as the
// Jaccard index of the two trigram sets. Used both for the DB-side
// scoring this mirrors (extensions.pg_trgm) and so the matcher and its
// fixture corpus run without a live Postgres connection.
function trigramsOf(input: string): Set<string> {
  const padded = `  ${input} `;
  const grams = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i++) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

export function trigramSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const gramsA = trigramsOf(a);
  const gramsB = trigramsOf(b);

  let common = 0;
  for (const gram of gramsA) {
    if (gramsB.has(gram)) common++;
  }

  const unionSize = gramsA.size + gramsB.size - common;
  return unionSize === 0 ? 0 : common / unionSize;
}
