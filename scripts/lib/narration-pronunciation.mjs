// Shared across Read, Remotion and provider entry points. Authored text stays unchanged.
export const WORD_PRONUNCIATIONS = {
  YAKAP: {
    spoken: "yakap",
    direction: "Pronounce yakap as the Tagalog word meaning hug: two syllables, YAH-kap (/ˈjakap/), with stress on the first syllable. Say the word naturally in every narration language. Never spell its letters, and do not add its translation to the spoken script.",
  },
};
const terms = text => Object.keys(WORD_PRONUNCIATIONS).filter(word => new RegExp(`\\b${word}\\b`, "i").test(text));
export const applyWordPronunciations = text => terms(text).reduce((spoken, word) => spoken.replace(new RegExp(`\\b${word}\\b`, "gi"), WORD_PRONUNCIATIONS[word].spoken), text);
export const pronunciationDirections = text => terms(text).map(word => WORD_PRONUNCIATIONS[word].direction).join(" ");
// Only affected audio is invalidated; rule changes also invalidate that audio.
export const pronunciationCacheKey = zones => terms(zones.map(zone => zone.text).join(" ")).map(word => JSON.stringify([word, WORD_PRONUNCIATIONS[word]])).join("|");
