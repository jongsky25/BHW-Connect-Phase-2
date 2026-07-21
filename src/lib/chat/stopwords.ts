// Common English/Filipino function words. These appear in nearly every
// question regardless of topic, so they're excluded from the text-overlap
// and keyword-overlap scores (§6.1 step 3) to keep those scores driven by
// content words instead of grammar. Trigram similarity still runs over the
// full normalized text — stopwords don't hurt character-level typo
// tolerance the way they dilute token-overlap ratios.
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "do", "does", "did", "should", "would",
  "could", "my", "your", "his", "her", "its", "our", "their", "i", "you", "he", "she",
  "it", "we", "they", "what", "when", "where", "why", "how", "which", "who", "for",
  "of", "to", "in", "on", "at", "and", "or", "but", "if", "with", "that", "this",
  "these", "those", "can", "will", "need", "needs", "right", "away", "get", "have",
  "has", "me", "am",
  "ang", "ng", "mga", "sa", "ko", "mo", "niya", "namin", "natin", "nila", "ako",
  "ikaw", "siya", "kami", "tayo", "sila", "ano", "kailan", "paano", "bakit", "saan",
  "alin", "sino", "dapat", "gagawin", "ginawa", "kung", "at", "o", "pero", "kapag",
  "para", "na", "pa", "din", "rin", "po", "ba", "yung", "yun", "ito", "iyan", "doon",
  "dito", "may", "meron", "pwede", "puwede", "gawin",
]);

export function filterStopwords(tokens: string[]): string[] {
  const filtered = tokens.filter((token) => !STOPWORDS.has(token));
  return filtered.length > 0 ? filtered : tokens;
}
