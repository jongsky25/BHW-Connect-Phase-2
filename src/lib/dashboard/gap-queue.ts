// Builds the `ilike` pattern for a gap-queue text search. Postgres LIKE/ILIKE
// treats `%` and `_` as wildcards and `\` as its escape character, so a
// user's literal search text (e.g. "50% off_er") must have those three
// characters escaped before it is wrapped in `%...%`, or it would silently
// match more (or less) than the admin typed, or throw on a trailing
// backslash.
export function buildGapQueueSearchPattern(query: string): string {
  const escaped = query.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}
