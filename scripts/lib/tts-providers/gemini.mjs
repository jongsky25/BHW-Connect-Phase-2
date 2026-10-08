// Gemini TTS provider (opt-in via `training:tts -- --provider gemini`).
//
// Gemini returns audio but no sentence timings, and the read-along and
// INC-28 scene build-up both need exact per-zone start/end times. So each
// zone (heading, body sentence, takeaway) is synthesized as its own
// request and the clips are joined with a short pause: the timings then
// come from the measured length of each clip, not from an estimate.
//
// Output is 24 kHz 16-bit mono PCM, re-encoded here to MP3 (48 kbps by
// default; training:narrate asks for 32 kbps, the content standard's cap)
// so a section costs a few KB/s on a BHW's mobile data.
//
// fetch and sleep are injected so the request/retry/assembly logic is
// testable without a network call (gemini.test.mjs).

import { applyWordPronunciations, pronunciationDirections } from "../narration-pronunciation.mjs";
import { Mp3Encoder } from "@breezystack/lamejs";

export const GEMINI_TTS_MODEL = "gemini-3.8-flash-tts";
export const GEMINI_VOICE = "Kore";
// Direct call, outside callProvider(): this build-time script only ever
// sends published lesson text from content/training/ (admin_authored, Tier B
// permitted per docs/free-ai-leverage-plan.md), never user or personal data.
// eslint-disable-next-line no-restricted-syntax
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_SAMPLE_RATE = 24000;
const GAP_MS = 300;
const DEFAULT_MP3_KBPS = 48;
const MAX_ATTEMPTS = 6;

const STYLES = {
  hil: "Speak in natural Hiligaynon (Ilonggo), as spoken in Iloilo and Western Visayas in the Philippines. Use Hiligaynon pronunciation, word stress, and gently melodic sentence intonation, in a warm, clear voice at a steady teaching pace. Keep the exact words and English technical role names. Do not switch to Cebuano or Tagalog, translate, or add words.",
  ceb: "Speak in natural Cebuano (Bisaya), as spoken in the Philippines, in a warm, clear voice at a steady teaching pace. Keep the exact words and English technical role names. Do not switch to Tagalog or add words.",
  fil: "Speak in Filipino (Tagalog) in a warm, clear voice at a steady teaching pace, like a community health trainer.",
  en: "Speak in clear, warm English at a steady teaching pace, like a community health trainer.",
};

// Story delivery for 1.1.3. Keep directions in speech metadata: Gemini 3.8
// treats the text itself as the exact words to say.
export const ORGANIZER_STORY_STYLES = {
  fil: "Speak in natural Filipino (Tagalog) as an engaging community health storyteller. Sound lively, warm, and expressive, with gentle changes in pitch and pace. Give the residents' responses and Marites's decisions human interest while keeping health guidance clear and respectful. Do not add or change words.",
  en: "Speak in natural Philippine English as an engaging community health storyteller. Sound lively, warm, and expressive, with gentle changes in pitch and pace. Give the residents' responses and Marites's decisions human interest while keeping health guidance clear and respectful. Do not add or change words.",
};

export const COMMUNITY_ORGANIZER_STORY_STYLES = {
  ceb: "Speak in natural Cebuano (Bisaya), as spoken in the Philippines, as a warm community health storyteller. Use Cebuano pronunciation, word stress, and sentence intonation. Sound curious as Riza listens and invites residents, then calm and clear as she distinguishes observations from assumptions and explains the local planning process. Use gentle changes in pitch and pace. Preserve English official role and planning names; pronounce LIPH letter by letter. Read the exact text. Do not switch to Tagalog, translate, or add words.",
  hil: "Speak in natural Hiligaynon (Ilonggo), as spoken in Iloilo and Western Visayas in the Philippines, as a warm community health storyteller. Use Hiligaynon pronunciation, word stress, and gently melodic sentence intonation. Sound curious as Riza listens and invites residents, then calm and clear as she distinguishes observations from assumptions and explains the local planning process. Use gentle changes in pitch and pace. Preserve English official role and planning names; pronounce LIPH letter by letter. Read the exact text. Do not switch to Cebuano or Tagalog, translate, or add words.",
};

export const HEALTH_EDUCATOR_STORY_STYLES = {
  ceb: "Speak in natural Cebuano (Bisaya), as spoken in the Philippines, as a warm, expressive community health educator. Use Cebuano pronunciation and sentence intonation. Sound curious as Riza listens to residents, then encouraging as she includes different ages and groups. Use gentle changes in pitch and pace. Preserve English technical role names and read the exact text. Do not switch to Tagalog or add words.",
  hil: "Speak in natural Hiligaynon (Ilonggo), as spoken in Iloilo and Western Visayas in the Philippines, as a warm, expressive community health educator. Use Hiligaynon pronunciation, word stress, and gently melodic sentence intonation. Sound curious as Riza listens to residents, then encouraging as she includes different ages and groups. Use gentle changes in pitch and pace. Preserve English technical role names and read the exact text. Do not switch to Cebuano or Tagalog, translate, or add words.",
  fil: "Speak in natural Filipino (Tagalog) as a warm, expressive community health educator. Sound curious as Marites listens to residents, then encouraging as she includes different ages and groups. Use gentle changes in pitch and pace. Keep the guidance clear and respectful. Do not add or change words.",
  en: "Speak in natural Philippine English as a warm, expressive community health educator. Sound curious as Marites listens to residents, then encouraging as she includes different ages and groups. Use gentle changes in pitch and pace. Keep the guidance clear and respectful. Do not add or change words.",
};

export const ROLES_HEPO_STORY_STYLES = {
  hil: "Speak in natural Hiligaynon (Ilonggo), as spoken in Iloilo and Western Visayas in the Philippines, as a warm, expressive community health storyteller. Use Hiligaynon pronunciation, word stress, and gently melodic sentence intonation. Give Riza's busy morning a lively rhythm, with gentle changes in pitch and pace, and slow slightly for the HEPO explanation. Preserve English technical role names. Read the exact text; do not switch to Cebuano or Tagalog, translate, or add words.",
  ceb: "Speak in natural Cebuano (Bisaya), as spoken in the Philippines, as a warm, expressive community health storyteller. Give Riza's busy morning a lively rhythm. Use gentle changes in pitch and pace, and slow slightly for the HEPO explanation. Preserve English technical role names. Read the exact text; do not switch to Tagalog, translate, or add words.",
  fil: "Speak in natural Filipino (Tagalog) as a warm, animated community health storyteller. Give Marites's busy morning a lively rhythm, then distinguish education, organizing, and service support with gentle changes in pitch and pace. Slow slightly for the HEPO explanation and end with an encouraging summary. Keep the guidance clear and respectful. Do not add or change words.",
  en: "Speak in natural Philippine English as a warm, animated community health storyteller. Give Marites's busy morning a lively rhythm, then distinguish education, organizing, and service support with gentle changes in pitch and pace. Slow slightly for the HEPO explanation and end with an encouraging summary. Keep the guidance clear and respectful. Do not add or change words.",
};

export const SERVICE_PROVIDER_STORY_STYLES = {
  ceb: "Speak in natural Cebuano (Bisaya), as spoken in the Philippines, as a warm community health storyteller. Use Cebuano pronunciation, word stress, and sentence intonation. Make Riza's listening and Aling Nena's concern feel human with gentle changes in pitch and pace. Sound calm and clear when explaining training limits, seeking the midwife's guidance, and following the health team's instructions. Preserve English role and health-service terms. Read the exact text. Do not switch to Tagalog, translate, or add words.",
  hil: "Speak in natural Hiligaynon (Ilonggo), as spoken in Iloilo and Western Visayas in the Philippines, as a warm community health storyteller. Use Hiligaynon pronunciation, word stress, and gently melodic sentence intonation. Make Riza's listening and Aling Nena's concern feel human with gentle changes in pitch and pace. Sound calm and clear when explaining training limits, seeking the midwife's guidance, and following the health team's instructions. Preserve English role and health-service terms. Read the exact text. Do not switch to Cebuano or Tagalog, translate, or add words.",
  fil: "Speak in natural Filipino (Tagalog) as a warm, expressive community health storyteller. Make Marites's listening and Aling Nena's concern feel human, with gentle changes in pitch and pace. Keep the guidance calm, clear, and respectful. Do not add or change words.",
  en: "Speak in natural Philippine English as a warm, expressive community health storyteller. Make Marites's listening and Aling Nena's concern feel human, with gentle changes in pitch and pace. Keep the guidance calm, clear, and respectful. Do not add or change words.",
};

export const RECORDS_STORY_STYLES = {
  ceb: "Speak in natural Cebuano (Bisaya), as spoken in the Philippines, as a warm community health storyteller. Use Cebuano pronunciation, word stress, and sentence intonation. Give Riza's question lively curiosity, then distinguish each record's purpose with gentle changes in pitch and pace. Slow slightly when clarifying uncertain entries and the approved handoff. Preserve the English record names and read the exact text. Do not switch to Tagalog, translate, or add words.",
  hil: "Speak in natural Hiligaynon (Ilonggo), as spoken in Iloilo and Western Visayas in the Philippines, as a warm community health storyteller. Use Hiligaynon pronunciation, word stress, and gently melodic sentence intonation. Give Riza's question lively curiosity, then distinguish each record's purpose with gentle changes in pitch and pace. Slow slightly when clarifying uncertain entries and the approved handoff. Preserve the English record names and read the exact text. Do not switch to Cebuano or Tagalog, translate, or add words.",
  fil: "Speak in natural Filipino (Tagalog) as an animated, warm community health storyteller. Give Marites's question lively curiosity, then emphasize each record's distinct purpose with clear, varied pitch and pace. Slow slightly for checking uncertain details and the safe handoff. Keep the delivery respectful and easy to follow. Do not add or change words.",
  en: "Speak in natural Philippine English as an animated, warm community health storyteller. Give Marites's question lively curiosity, then emphasize each record's distinct purpose with clear, varied pitch and pace. Slow slightly for checking uncertain details and the safe handoff. Keep the delivery respectful and easy to follow. Do not add or change words.",
};

export const ROLES_APPLICATION_STORY_STYLES = {
  ceb: "Speak in natural Cebuano (Bisaya), as spoken in the Philippines, as a warm community health storyteller. Use Cebuano pronunciation, word stress, and sentence intonation. Make Riza's listening and decisions expressive with gentle changes in pitch and pace. Slow slightly for the midwife's instruction and the three-part handover: observed, done, needed. Distinguish an observation from a diagnosis and practical assessment from lesson completion. End with an encouraging invitation to practice. Preserve English role names and read the exact text. Do not switch to Tagalog, translate, or add words.",
  hil: "Speak in natural Hiligaynon (Ilonggo), as spoken in Iloilo and Western Visayas in the Philippines, as a warm community health storyteller. Use Hiligaynon pronunciation, word stress, and gently melodic sentence intonation. Make Riza's listening and decisions expressive with gentle changes in pitch and pace. Slow slightly for the midwife's instruction and the three-part handover: observed, done, needed. Distinguish an observation from a diagnosis and practical assessment from lesson completion. End with an encouraging invitation to practice. Preserve English role names and read the exact text. Do not switch to Cebuano or Tagalog, translate, or add words.",
  fil: "Speak in natural Filipino (Tagalog) as a warm, animated community health storyteller. Make Riza's listening and decisions lively and expressive, using gentle changes in pitch and pace. Slow slightly for the midwife's instruction and the three-part handover. End with an encouraging invitation to practice. Keep every word clear and respectful. Do not add or change words.",
  en: "Speak in natural Philippine English as a warm, animated community health storyteller. Make Riza's listening and decisions lively and expressive, using gentle changes in pitch and pace. Slow slightly for the midwife's instruction and the three-part handover. End with an encouraging invitation to practice. Keep every word clear and respectful. Do not add or change words.",
};

export const UHC_COVERAGE_STORY_STYLES = {
  ceb: "Speak in natural Philippine Cebuano (Bisaya) as a warm, expressive community health teacher and storyteller. Use natural pronunciation, word stress and sentence intonation. Give Mang Ernesto’s question curious upward intonation and Vlanche’s answer calm reassurance. Use purposeful pitch and pace changes; slow for the distinction between automatic NHIP inclusion and checking the particular benefit, provider and process. Never imply everything is free. Keep one consistent female Kore narrator voice. Preserve official and technical terms and the exact authored words. Do not translate, add words, make promises or switch languages. Use this same female Kore voice for every sentence, heading, quotation and character, including Mang Ernesto; convey characters only through subtle intonation, never male voice acting. Say Vlanche as the single syllable vlanch. Read only the supplied utterance, with no filler, false start, repeated syllable, inserted connector or introductory sound. Articulate every authored consonant and syllable without replacing a word with a similar word. Keep nga as nga, kon as kon, Nadungog as Nadungog, dinhi as dinhi and gikinahanglang with its full gi-ki-na-hang-lang syllables. Clearly articulate pagpanalipod and its final pod; preserve its meaning of protection.",
  hil: "Speak in natural Iloilo and Western Visayas Hiligaynon (Ilonggo) as a warm, expressive community health teacher and storyteller. Use natural pronunciation, word stress and gently melodic sentence intonation. Give Mang Ernesto’s question curious upward intonation and Vlanche’s answer calm reassurance. Use purposeful pitch and pace changes; slow for the distinction between automatic NHIP inclusion and checking the particular benefit, provider and process. Never imply everything is free. Keep one consistent female Kore narrator voice. Preserve official and technical terms and the exact authored words. Do not translate, add words, make promises or switch languages. Use this same female Kore voice for every sentence, heading, quotation and character, including Mang Ernesto; convey characters only through subtle intonation, never male voice acting. Say Vlanche as the single syllable vlanch. Read only the supplied utterance, with no filler, false start, repeated syllable, inserted connector or introductory sound. Articulate every authored consonant and syllable without replacing a word with a similar word. Keep kag as kag, kon as kon, idalom as idalom, ginapaathag with its thag ending and pagkalakip with its kip ending. Read Sabata ang residente exactly, not Sabat sa residente. Keep Mahimo to its authored three syllables. Never insert sa, Ah, or a false start after PhilHealth.",

  fil: "Speak in natural Filipino (Tagalog) as a warm, expressive community health storyteller. Give Mang Ernesto's question genuine curiosity and Vlanche's response a calm, reassuring tone. Use gentle changes in pitch and pace to distinguish the promise of UHC from the practical details she must check. Keep every benefit statement careful and clear. Do not add or change words.",
  en: "Speak in natural Philippine English as a warm, expressive community health storyteller. Give Mang Ernesto's question genuine curiosity and Vlanche's response a calm, reassuring tone. Use gentle changes in pitch and pace to distinguish the promise of UHC from the practical details she must check. Keep every benefit statement careful and clear. Do not add or change words.",
};

export const PRIMARY_CARE_STORY_STYLES = {
  ceb: "Speak in natural Philippine Cebuano (Bisaya) as a warm, expressive community health teacher and storyteller. Use natural pronunciation, word stress and sentence intonation. Give Mang Ernesto’s question curiosity and Vlanche’s support warmth. Use purposeful pitch and pace changes, slowing for benefit, the resident’s chosen or available clinic and locally confirmed instructions. Emphasize that the clinician decides the clinical referral. Say YAKAP as YAH-kap, the Tagalog word for hug, never individual letters. Keep one consistent female Kore narrator voice. Preserve official and technical terms and the exact authored words. Do not translate, add words, make promises or switch languages.",
  hil: "Speak in natural Iloilo and Western Visayas Hiligaynon (Ilonggo) as a warm, expressive community health teacher and storyteller. Use natural pronunciation, word stress and gently melodic sentence intonation. Give Mang Ernesto’s question curiosity and Vlanche’s support warmth. Use purposeful pitch and pace changes, slowing for benefit, the resident’s chosen or available clinic and locally confirmed instructions. Emphasize that the clinician decides the clinical referral. Say YAKAP as YAH-kap, the Tagalog word for hug, never individual letters. Keep one consistent female Kore narrator voice. Preserve official and technical terms and the exact authored words. Do not translate, add words, make promises or switch languages.",

  fil: "Speak in conversational Filipino (Tagalog) as a warm, expressive community health storyteller. Give Mang Ernesto's question sincere curiosity. Let Vlanche's calm care come through clearly. Use a lively, hopeful rhythm for the four changes; slow slightly and emphasize the practical checks for benefit, chosen clinic, and local referral instructions. Stress that the clinician makes the referral decision. Vary pitch, emphasis, and pace naturally between scenes. Do not add or change words.",
  en: "Speak in conversational Philippine English as a warm, expressive community health storyteller. Give Mang Ernesto's question sincere curiosity. Let Vlanche's calm care come through clearly. Use a lively, hopeful rhythm for the four changes; slow slightly and emphasize the practical checks for benefit, chosen clinic, and local referral instructions. Stress that the clinician makes the referral decision. Vary pitch, emphasis, and pace naturally between scenes. Do not add or change words.",
};

export const BHS_IMPROVEMENT_STORY_STYLES = {
  fil: "Speak in conversational Filipino as a warm, expressive Philippine community health storyteller. Pronounce Mimi MEE-mee. Let her proposal sound curious and practical; emphasize one small review step, service needs and agreed follow-up with deliberate gentle pauses. Vary pitch and pace naturally while keeping one consistent narrator timbre. Read exactly the authored words, without fillers, invented approval or promises. End clearly and encouragingly.",
  en: "Speak in conversational Philippine English as a warm, expressive community health storyteller. Pronounce Mimi MEE-mee. Let her proposal sound curious and practical; emphasize one small review step, service needs and agreed follow-up with deliberate gentle pauses. Vary pitch and pace naturally while keeping one consistent narrator timbre. Read exactly the authored words, without fillers, invented approval or promises. End clearly and encouragingly."
};

export const BHS_RESOURCES_STORY_STYLES = {
  "fil": "Speak in clear conversational Filipino as a warm, expressive Philippine community health storyteller. Pronounce Mimi MEE-mee. Use a reflective question as Mimi notices the concern, a calm practical explanation of responsibility, and deliberate emphasis on service needs and checking before action. Vary pitch and pace naturally, with brief pauses between observation and questions. Preserve every authored word; no fillers or invented permission.",
  "en": "Speak in clear conversational Philippine English as a warm, expressive community health storyteller. Pronounce Mimi MEE-mee. Use a reflective question as Mimi notices the concern, a calm practical explanation of responsibility, and deliberate emphasis on service needs and checking before action. Vary pitch and pace naturally, with brief pauses between observation and questions. Preserve every authored word; no fillers or invented permission."
};

export const BHS_DECLINE_STORY_STYLES = {
  "fil": "Speak in conversational Filipino (Tagalog) as a warm, expressive Philippine community health storyteller. Let Mimi’s refusal be calm, clear and firm without sounding angry. Give the visitor’s pressure a questioning tone, then slow slightly for Mimi’s boundary, accurate policy explanation and factual handover. Vary pitch, emphasis and pace naturally; leave brief natural pauses between dialogue and narration. Preserve every authored word. Never imply a promised approval. Maintain one consistent narrator timbre and accent across all sentences. Pronounce Mimi as MEE-mee, with a clear initial M. Do not vocalize fillers, hesitations, groans, or extra sounds. Expressiveness comes from gentle pitch and pace changes, not switching voices. Do not add or change words.",
  "en": "Speak in conversational Philippine English as a warm, expressive community health storyteller. Let Mimi’s refusal be calm, clear and firm without sounding angry. Give the visitor’s pressure a questioning tone, then slow slightly for Mimi’s boundary, accurate policy explanation and factual handover. Vary pitch, emphasis and pace naturally; leave brief natural pauses between dialogue and narration. Preserve every authored word. Never imply a promised approval. Maintain one consistent narrator timbre and accent across all sentences. Pronounce Mimi as MEE-mee, with a clear initial M. Do not vocalize fillers, hesitations, groans, or extra sounds. Expressiveness comes from gentle pitch and pace changes, not switching voices. Do not add or change words."
};

export const BHS_PROMOTIONS_STORY_STYLES = {
  "fil": "Speak in conversational Filipino (Tagalog) as a warm, expressive community health storyteller. Give the visitor’s offer natural curiosity; let Mimi sound calm, attentive, and respectful as she pauses. Vary pitch, pace, and emphasis purposefully. Slow slightly for product, promotion, audience, and inducement, and stress that the BHW checks with the facility supervisor rather than approving an offer independently. Keep legal scope clear without a threatening tone. End with encouragement to recognize and coordinate. Do not add or change words.",
  "en": "Speak in conversational Philippine English as a warm, expressive community health storyteller. Give the visitor’s offer natural curiosity; let Mimi sound calm, attentive, and respectful as she pauses. Vary pitch, pace, and emphasis purposefully. Slow slightly for product, promotion, audience, and inducement, and stress that the BHW checks with the facility supervisor rather than approving an offer independently. Keep legal scope clear without a threatening tone. End with encouragement to recognize and coordinate. Do not add or change words."
};

export const LOCAL_SYSTEM_STORY_STYLES = {
  ceb: "Speak in natural Philippine Cebuano (Bisaya) as a warm, expressive community health teacher and storyteller. Use natural pronunciation, word stress and sentence intonation. Give Mang Ernesto’s recurring question curiosity, Vlanche’s factual observations an attentive tone and the midwife’s feedback supportive warmth. Vary pitch and pace, slowing for confidentiality, locally verified contacts, distinct board and health-team roles, checked health-promotion messages and agreed follow-up. Keep one consistent female Kore narrator voice, with no character voice switching. Articulate Cebuano and Hiligaynon consonants clearly, especially ng, nga, kag and ug. Say Vlanche in one syllable, vlanch. Read HEPO as its individual letters. Finish every phrase cleanly, preserving the exact wording. Keep exactly one warm female voice from the first word to the last, including quotations: no male voices, character acting or speaker changes. Articulate the complete word nagdumala as nag-du-ma-la and nagadumala as na-ga-du-ma-la; never shorten these governance verbs to nagdula or nagadula. Pronounce the full nasal ng in nga and panglawas, the final consonants in mabakod and ginpabakod, and every syllable of gihulagway. Do not paraphrase or replace small words such as kon, Tino, Ilain, protektahi or gikasabotang. Preserve official and technical terms and the exact authored words. Do not translate, add words, make promises or switch languages.",
  hil: "Speak in natural Iloilo and Western Visayas Hiligaynon (Ilonggo) as a warm, expressive community health teacher and storyteller. Use natural pronunciation, word stress and gently melodic sentence intonation. Give Mang Ernesto’s recurring question curiosity, Vlanche’s factual observations an attentive tone and the midwife’s feedback supportive warmth. Vary pitch and pace, slowing for confidentiality, locally verified contacts, distinct board and health-team roles, checked health-promotion messages and agreed follow-up. Keep one consistent female Kore narrator voice, with no character voice switching. Articulate Cebuano and Hiligaynon consonants clearly, especially ng, nga, kag and ug. Say Vlanche in one syllable, vlanch. Read HEPO as its individual letters. Finish every phrase cleanly, preserving the exact wording. Keep exactly one warm female voice from the first word to the last, including quotations: no male voices, character acting or speaker changes. Articulate the complete word nagdumala as nag-du-ma-la and nagadumala as na-ga-du-ma-la; never shorten these governance verbs to nagdula or nagadula. Pronounce the full nasal ng in nga and panglawas, the final consonants in mabakod and ginpabakod, and every syllable of gihulagway. Do not paraphrase or replace small words such as kon, Tino, Ilain, protektahi or gikasabotang. Preserve official and technical terms and the exact authored words. Do not translate, add words, make promises or switch languages.",

  "fil": "Speak in conversational Filipino (Tagalog) as a warm, expressive community health storyteller. Give Mang Ernesto’s recurring question sincere curiosity, Vlanche’s observation an attentive and calm tone, and the midwife’s feedback a supportive tone. Vary pitch, emphasis and pace naturally. Slow slightly for factual observation, confidentiality and locally confirmed coordination. Emphasize accurate health promotion, the BHW role boundary and agreed follow-up. Use natural pauses and an encouraging ending. Do not add or change words.",
  "en": "Speak in conversational Philippine English as a warm, expressive community health storyteller. Give Mang Ernesto’s recurring question sincere curiosity, Vlanche’s observation an attentive and calm tone, and the midwife’s feedback a supportive tone. Vary pitch, emphasis and pace naturally. Slow slightly for factual observation, confidentiality and locally confirmed coordination. Emphasize accurate health promotion, the BHW role boundary and agreed follow-up. Use natural pauses and an encouraging ending. Do not add or change words."
};

export const BHS_SUPPORT_ENVIRONMENT_STORY_STYLES = {
  "fil": "Speak in conversational Filipino (Tagalog) as a warm, expressive community health storyteller. Give the parent's question gentle curiosity and Mimi's response calm, attentive care. Vary pitch and pace naturally. Pause and emphasize privacy, confirmed local support, institution and BHW responsibilities, and supervisor confirmation. Slow slightly for the boundary protecting sterile and necessary clinical supplies. End with an encouraging two-topic summary. Keep one consistent female Kore narrator voice for every sentence and quoted line; never switch speaker gender. Say RA 10028 as R A ten thousand twenty-eight; never one thousand twenty-eight. Avoid filler sounds, extra words, mid-word pauses or clipped word endings. Read the exact words; do not add, translate or change words.",
  "en": "Speak in conversational Philippine English as a warm, expressive community health storyteller. Give the parent's question gentle curiosity and Mimi's response calm, attentive care. Vary pitch and pace naturally. Pause and emphasize privacy, confirmed local support, institution and BHW responsibilities, and supervisor confirmation. Slow slightly for the boundary protecting sterile and necessary clinical supplies. End with an encouraging two-topic summary. Keep one consistent female Kore narrator voice for every sentence and quoted line; never switch speaker gender. Say RA 10028 as R A ten thousand twenty-eight; never one thousand twenty-eight. Avoid filler sounds, extra words, mid-word pauses or clipped word endings. Read the exact words; do not add, translate or change words."
};

// The voice string recorded in content_hash for Gemini renders, so switching
// provider re-renders a section instead of skipping it as unchanged.
// Shared expressive delivery for lesson 1.2.4 Read and animated story.
export const UHC_IMPROVEMENT_STORY_STYLES = {
  ceb: "Speak in natural Philippine Cebuano (Bisaya) as a warm, expressive community health teacher and storyteller. Use natural pronunciation, word stress and sentence intonation. Give Mang Ernesto’s question curiosity and Vlanche’s proposal a hopeful lilt. Vary pitch and pace; pause at proposal, confirmed facts and permission, feasible plan, trial and feedback. Keep the fictional local plan and role boundaries clear. Counts and answers are indicators, not proof of system-wide improvement. Keep one consistent female Kore narrator voice with no character acting or voice changes. Articulate ng, nga, ug and kag clearly, finishing every phrase. Say Vlanche as one syllable, vlanch. Keep every authored negation and permission boundary audible. Speak Cebuano sugyot and mosugyot with the complete gy consonant cluster: proposal, never sugot or musugot meaning consent. Clearly say ipakaylap, Himoang tino, Kumpirmaha and ug exactly. In Hiligaynon retain the initial s in sang, the final s in Antes, and the h in ipaathag. No paraphrase or grammatical substitutions. Use exactly one warm adult female narrator for every heading, paragraph, quote and takeaway; never switch gender or voice. Preserve official and technical terms and the exact authored words. Do not translate, add words, make promises or switch languages.",
  hil: "Speak in natural Iloilo and Western Visayas Hiligaynon (Ilonggo) as a warm, expressive community health teacher and storyteller. Use natural pronunciation, word stress and gently melodic sentence intonation. Give Mang Ernesto’s question curiosity and Vlanche’s proposal a hopeful lilt. Vary pitch and pace; pause at proposal, confirmed facts and permission, feasible plan, trial and feedback. Keep the fictional local plan and role boundaries clear. Counts and answers are indicators, not proof of system-wide improvement. Keep one consistent female Kore narrator voice with no character acting or voice changes. Articulate ng, nga, ug and kag clearly, finishing every phrase. Say Vlanche as one syllable, vlanch. Keep every authored negation and permission boundary audible. Speak Cebuano sugyot and mosugyot with the complete gy consonant cluster: proposal, never sugot or musugot meaning consent. Clearly say ipakaylap, Himoang tino, Kumpirmaha and ug exactly. In Hiligaynon retain the initial s in sang, the final s in Antes, and the h in ipaathag. No paraphrase or grammatical substitutions. Use exactly one warm adult female narrator for every heading, paragraph, quote and takeaway; never switch gender or voice. Preserve official and technical terms and the exact authored words. Do not translate, add words, make promises or switch languages.",

  "fil": "Speak in natural conversational Filipino (Tagalog) as a warm community health storyteller. Sound curious as Mang Ernesto asks and Vlanche notices a gap, then calm and supportive during the midwife's discussion. Use purposeful changes in pitch, pace and emphasis; pause naturally at the proposal, agreement, plan and feedback. Make role boundaries clear, without sounding scolding. Keep the exact authored words; do not translate, add words or promises.",
  "en": "Pronounce the fictional name Vlanche consistently as one syllable, vlanch, with an initial v followed by l and a final nch; never fee-lanche. Give the opening question an interested upward pitch, the proposal a hopeful lilt, the agreement clear firm emphasis, and the final reflection a thoughtful inviting cadence. Speak in natural conversational Philippine English as a warm community health storyteller. Sound curious as Mang Ernesto asks and Vlanche notices a gap, then calm and supportive during the midwife's discussion. Use purposeful changes in pitch, pace and emphasis; pause naturally at the proposal, agreement, plan and feedback. Make role boundaries clear, without sounding scolding. Keep the exact authored words; do not translate, add words or promises."
};

export function geminiVoiceId(model = GEMINI_TTS_MODEL, voice = GEMINI_VOICE) {
  return `gemini:${model}:${voice}`;
}

function findAudioData(node) {
  if (!node || typeof node !== "object") return null;
  if (typeof node.data === "string" && node.data.length > 0) return node.data;
  for (const value of Object.values(node)) {
    const found = findAudioData(value);
    if (found) return found;
  }
  return null;
}

// Accepts either a WAV file or headerless PCM (the API's unary default is
// WAV; streaming returns raw L16), returning 16-bit samples + sample rate.
export function decodePcm(bytes) {
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WAVE") {
    let offset = 12;
    let sampleRate = DEFAULT_SAMPLE_RATE;
    while (offset + 8 <= bytes.length) {
      const id = bytes.toString("ascii", offset, offset + 4);
      const size = bytes.readUInt32LE(offset + 4);
      const body = offset + 8;
      if (id === "fmt ") {
        const channels = bytes.readUInt16LE(body + 2);
        const bits = bytes.readUInt16LE(body + 14);
        if (channels !== 1 || bits !== 16) throw new Error(`gemini: expected 16-bit mono WAV, got ${bits}-bit ${channels}ch`);
        sampleRate = bytes.readUInt32LE(body + 4);
      } else if (id === "data") {
        const end = Math.min(body + size, bytes.length);
        return { samples: toInt16(bytes.subarray(body, end)), sampleRate };
      }
      offset = body + size + (size % 2);
    }
    throw new Error("gemini: WAV response has no data chunk");
  }
  return { samples: toInt16(bytes), sampleRate: DEFAULT_SAMPLE_RATE };
}

function toInt16(buf) {
  const even = buf.subarray(0, buf.length - (buf.length % 2));
  const copy = Buffer.from(even);
  return new Int16Array(copy.buffer, copy.byteOffset, copy.length / 2);
}

// LAME only allows some sample rates at each bitrate (at 32 kbps mono, 24 kHz
// becomes 22.05 kHz). lamejs's own conversion is broken: it wrote silent
// files from real speech. So we pick the rate LAME would pick, convert
// ourselves (windowed-sinc low-pass), and give the encoder matching rates.
const LAME_RATE_FOR_KBPS = (kbps, rate) => (kbps <= 32 && rate === 24000 ? 22050 : rate);

export function resample(samples, from, to) {
  if (from === to) return samples;
  const ratio = from / to;
  const cutoff = Math.min(1, to / from) * 0.95; // below the new Nyquist
  const half = 16; // taps each side
  const out = new Int16Array(Math.floor((samples.length * to) / from));
  for (let n = 0; n < out.length; n += 1) {
    const t = n * ratio;
    const base = Math.floor(t);
    let acc = 0;
    let norm = 0;
    for (let k = base - half + 1; k <= base + half; k += 1) {
      const x = t - k;
      const w = 0.5 + 0.5 * Math.cos((Math.PI * x) / half); // Hann
      const h = x === 0 ? cutoff : Math.sin(Math.PI * cutoff * x) / (Math.PI * x);
      const tap = h * w;
      norm += tap;
      if (k >= 0 && k < samples.length) acc += samples[k] * tap;
    }
    out[n] = Math.max(-32768, Math.min(32767, Math.round(acc / norm)));
  }
  return out;
}

export function encodeMp3(samples, sampleRate, kbps) {
  const rate = LAME_RATE_FOR_KBPS(kbps, sampleRate);
  const pcm = resample(samples, sampleRate, rate);
  const encoder = new Mp3Encoder(1, rate, kbps);
  const chunks = [];
  const block = 1152;
  for (let i = 0; i < pcm.length; i += block) {
    const out = encoder.encodeBuffer(pcm.subarray(i, i + block));
    if (out.length) chunks.push(Buffer.from(out));
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  const bytes = Buffer.concat(chunks);
  // Guard: if LAME still changed the rate, it converted internally (the
  // silent-output path). Fail instead of writing a silent file.
  const version = (bytes[1] >> 3) & 3;
  const table = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] }[version];
  const headerRate = table?.[(bytes[2] >> 2) & 3];
  if (bytes.length && headerRate !== rate) throw new Error(`gemini: encoder wrote ${headerRate} Hz for ${rate} Hz input`);
  return bytes;
}

async function synthesizeZoneText(text, language, { apiKey, model, voice, style, fetchImpl, sleep }) {
  const directions = pronunciationDirections(text);
  const deliveryStyle = [style ?? STYLES[language] ?? STYLES.en, directions].filter(Boolean).join(" ");
  const body = {
    model,
    input: [
      {
        type: "user_input",
        content: [
          {
            type: "text",
            text: applyWordPronunciations(text),
            annotations: [{ type: "speech_metadata", style: deliveryStyle }],
          },
        ],
      },
    ],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice }] },
  };

  for (let attempt = 1; ; attempt += 1) {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = findAudioData(await response.json());
      if (!data) throw new Error("gemini: response contained no audio data");
      return decodePcm(Buffer.from(data, "base64"));
    }

    const retryable = response.status === 429 || response.status >= 500;
    const detail = await response.text().catch(() => "");
    if (!retryable || attempt >= MAX_ATTEMPTS) {
      throw new Error(`gemini: HTTP ${response.status} after ${attempt} attempt(s): ${detail.slice(0, 300)}`);
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(60_000, 2000 * 2 ** (attempt - 1));
    await sleep(waitMs);
  }
}

export async function synthesizeWithGemini(zones, language, options) {
  const {
    apiKey,
    model = GEMINI_TTS_MODEL,
    voice = GEMINI_VOICE,
    style,
    kbps = DEFAULT_MP3_KBPS,
    // What is sent for a zone. Timings always keep zone.text (the displayed
    // words), which is what the renderer matches against the revision.
    speak = (zone) => zone.text,
    fetchImpl = fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;
  if (!apiKey) throw new Error("gemini: GEMINI_API_KEY is not set");

  const clips = [];
  for (const zone of zones) {
    clips.push(await synthesizeZoneText(speak(zone), language, { apiKey, model, voice, style, fetchImpl, sleep }));
  }

  const sampleRate = clips[0]?.sampleRate ?? DEFAULT_SAMPLE_RATE;
  if (clips.some((clip) => clip.sampleRate !== sampleRate)) {
    throw new Error("gemini: clips came back at different sample rates");
  }
  const gapSamples = Math.round((sampleRate * GAP_MS) / 1000);
  const total = clips.reduce((sum, clip) => sum + clip.samples.length, 0) + gapSamples * Math.max(0, clips.length - 1);
  const joined = new Int16Array(total);

  const timings = [];
  let cursor = 0;
  clips.forEach((clip, i) => {
    joined.set(clip.samples, cursor);
    const start = cursor;
    cursor += clip.samples.length;
    timings.push({
      zone: zones[i].zone,
      index: zones[i].index,
      text: zones[i].text,
      start_ms: Math.round((start / sampleRate) * 1000),
      end_ms: Math.round((cursor / sampleRate) * 1000),
    });
    if (i < clips.length - 1) cursor += gapSamples;
  });

  return {
    provider: "gemini",
    audioBytes: encodeMp3(joined, sampleRate, kbps),
    format: "mp3",
    durationSeconds: total / sampleRate,
    timings,
    charCount: zones.reduce((sum, zone) => sum + zone.text.length, 0),
  };
}

// Target-only delivery for the new Demi legal-basis lesson.
export const BHW_LEGAL_ROLE_STORY_STYLES = {
  "fil": "Speak in natural conversational Filipino (Tagalog) as a warm, expressive Philippine community health trainer. Give Demi’s opening question curious rising intonation; slow slightly at training, voluntary service and local health board accreditation, and emphasize their distinct roles. Vary pitch, emphasis and pace naturally with brief clause pauses. Maintain exactly one consistent adult female Kore narrator timbre for headings, body, quotations and takeaway, without character voices. Pronounce Demi as DEH-mee. Say RA as separate letters and 7883 as seven thousand eight hundred eighty-three. Keep every negation and condition clear, finish word endings, never add fillers, translate or change the exact words.",
  "en": "Speak in natural Philippine English as a warm, expressive community health trainer. Give Demi’s opening question curious rising intonation; slow slightly at training, voluntary service and local health board accreditation, and emphasize their distinct roles. Vary pitch, emphasis and pace naturally with brief clause pauses. Maintain exactly one consistent adult female Kore narrator timbre for headings, body, quotations and takeaway, without character voices. Pronounce Demi as DEH-mee. Say RA as separate letters and 7883 as seven thousand eight hundred eighty-three. Keep every negation and condition clear, finish word endings, never add fillers, translate or change the exact words."
};

// Target-only delivery for the new Demi benefits lesson.
export const BHW_BENEFITS_STORY_STYLES = {
  "fil": "Speak in natural conversational Filipino (Tagalog) as a warm, expressive Philippine community health trainer. Give Demi’s opening question curious intonation; emphasize the different benefits, registration, active regular duties, validation and local review. Contrast hazard exposure with isolated-station service clearly. Vary pitch and pace naturally with brief clause pauses. Maintain one consistent adult female Kore narrator timbre throughout headings, body, quotations and takeaway; no character voices. Pronounce Demi as DEH-mee. Say RA as separate letters; say 7883 as seven thousand eight hundred eighty-three. Keep every negation and condition intelligible and finish word endings. Read exact words; do not translate, add fillers or guarantee any benefit.",
  "en": "Speak in natural Philippine English as a warm, expressive community health trainer. Give Demi’s opening question curious intonation; emphasize the different benefits, registration, active regular duties, validation and local review. Contrast hazard exposure with isolated-station service clearly. Vary pitch and pace naturally with brief clause pauses. Maintain one consistent adult female Kore narrator timbre throughout headings, body, quotations and takeaway; no character voices. Pronounce Demi as DEH-mee. Say RA as separate letters; say 7883 as seven thousand eight hundred eighty-three. Keep every negation and condition intelligible and finish word endings. Read exact words; do not translate, add fillers or guarantee any benefit."
};

// Target-only expressive BHWE delivery; new1.4.3 media remain draft.
export const BHW_ELIGIBILITY_STORY_STYLES = {
  "fil": "Speak in natural conversational Filipino (Tagalog) as a warm, expressive Philippine community health trainer. Give Demi’s question curious rising intonation; slow at accreditation, degree-related education, qualifying continuous full-time voluntary service and satisfactory record. Make total versus accredited service, the conditional JO/COS rule and CSC verification clear through gentle pitch, emphasis and pace changes. Keep every negation and condition audible. Maintain exactly one consistent adult female Kore narrator timbre from first word to last, including headings, quotations and takeaway; no male voice acting or character voices. Pronounce Demi as DEH-mee and initialisms as individual letters. Say RA as letters and 7883 as seven thousand eight hundred eighty-three. Finish every syllable and word ending, with natural clause pauses; no fillers, clipped words, added connectors or repeated starts. Read the exact authored words, without translation or a promise of eligibility, license or appointment.",
  "en": "Speak in natural Philippine English as a warm, expressive community health trainer. Give Demi’s question curious rising intonation; slow at accreditation, degree-related education, qualifying continuous full-time voluntary service and satisfactory record. Make total versus accredited service, the conditional JO/COS rule and CSC verification clear through gentle pitch, emphasis and pace changes. Keep every negation and condition audible. Maintain exactly one consistent adult female Kore narrator timbre from first word to last, including headings, quotations and takeaway; no male voice acting or character voices. Pronounce Demi as DEH-mee and initialisms as individual letters. Say RA as letters and 7883 as seven thousand eight hundred eighty-three. Finish every syllable and word ending, with natural clause pauses; no fillers, clipped words, added connectors or repeated starts. Read the exact authored words, without translation or a promise of eligibility, license or appointment."
};

// Target-only accreditation delivery; sibling styles stay unchanged.
export const BHW_ACCREDITATION_STORY_STYLES = {
  "fil": "Speak in natural conversational Filipino (Tagalog) as a warm, expressive Philippine community health trainer. Give Demi’s opening question curious rising intonation. Contrast board decision with committee screening and recommendation, and known facts with missing local information, through gentle pitch, emphasis and pace changes. Keep every negation and conditional rule audible. Maintain exactly one consistent adult female Kore narrator timbre from first word to last, including headings, quotations and takeaway; no character voices. Pronounce Demi as DEH-mee and initialisms as individual letters. Say RA as letters and 7883 as seven thousand eight hundred eighty-three. Read the circular number 2023-001 as twenty twenty-three, zero zero one. Finish every syllable and word ending with natural clause pauses; no fillers, clipped words, added connectors or repeated starts. Read the exact authored words, without translation or a promise of accreditation, benefits, eligibility or a job.",
  "en": "Speak in natural Philippine English as a warm, expressive Philippine community health trainer. Give Demi’s opening question curious rising intonation. Contrast board decision with committee screening and recommendation, and known facts with missing local information, through gentle pitch, emphasis and pace changes. Keep every negation and conditional rule audible. Maintain exactly one consistent adult female Kore narrator timbre from first word to last, including headings, quotations and takeaway; no character voices. Pronounce Demi as DEH-mee and initialisms as individual letters. Say RA as letters and 7883 as seven thousand eight hundred eighty-three. Read the circular number 2023-001 as twenty twenty-three, zero zero one. Finish every syllable and word ending with natural clause pauses; no fillers, clipped words, added connectors or repeated starts. Read the exact authored words, without translation or a promise of accreditation, benefits, eligibility or a job."
};

// Only two Filipino Read tracks need a stricter delivery after actual audio review.
export const BHW_ACCREDITATION_FIL_STEADY_STYLE = " Keep a steady medium-high adult female Kore vocal register and the same light, warm resonance across this entire clip. This is one continuous trainer narration, including short headings, standalone sentences and summary. Do not drop into a deep announcer register, imitate another speaker, or perform quoted characters. Use gentle emphasis and pauses without a sudden change of resonance. The first syllable and final syllable must use the same narrator identity.";

export const BHW_FOLLOW_UP_STORY_STYLES = {
  "fil": "Speak in natural Filipino (Tagalog), as one calm, confident community health narrator. Read exact words with respectful firmness, curious rising intonation for questions, measured clarity for unknown facts and negation, and a complete encouraging ending. Maintain one consistent vocal timbre throughout. Pronounce Demi naturally. Do not add, omit, translate or change words.",
  "en": "Speak in natural Philippine English, as one calm, confident community health narrator. Read exact words with respectful firmness, curious question intonation, measured clarity for unknown facts and negation, and a complete encouraging ending. Maintain one consistent vocal timbre throughout. Pronounce Demi naturally. Do not add, omit, translate or change words."
};

// Lesson1.5.1 only. Historical lesson styles and recordings stay unchanged.
export const BHW_RELATIONSHIPS_STORY_STYLES = {
  fil: 'Speak in natural conversational Filipino (Tagalog) as one warm, attentive community health trainer. Pronounce Malou as mah-LOO consistently. Give questions curious rising intonation; emphasize distinct roles and limits, resident preferences and locally confirmed information. Keep negation clear and finish the ending completely. Maintain one consistent adult female Kore timbre throughout headings, body and takeaway; no character voices. Vary pitch and pace gently with natural clause pauses. Read exact words without fillers, added advice, translation or omission.',
  en: 'Speak in natural Philippine English as one warm, attentive community health trainer. Pronounce Malou as mah-LOO consistently. Give questions curious rising intonation; emphasize distinct roles and limits, resident preferences and locally confirmed information. Keep negation clear and finish the ending completely. Maintain one consistent adult female Kore timbre throughout headings, body and takeaway; no character voices. Vary pitch and pace gently with natural clause pauses. Read exact words without fillers, added advice, translation or omission.',
};

// Lesson1.5.2 only; prior voices/styles are unchanged.
export const BHW_BARANGAY_PARTNERS_STORY_STYLES = {
 fil: 'Speak natural conversational Filipino as one settled adult female Kore community trainer. Pronounce Malou mah-LOO. Keep the same warm mid-pitched female register for heading, body and takeaway. Clearly distinguish roles, requests, unknowns, local approval and availability. Natural curious question intonation, complete negation and encouraging endings. Read exact text, no omissions, additions or character voices.',
 en: 'Speak natural Philippine English as one settled adult female Kore community trainer. Pronounce Malou mah-LOO. Keep the same warm female register for heading, body and takeaway. Clearly distinguish roles, requests, unknowns, local approval and availability. Natural curious question intonation, complete negation and encouraging endings. Read exact text, no omissions, additions or character voices.',
};

// Lesson 1.5.3 only; do not mutate previous voice/style inputs.
export const BHW_LOCAL_PARTNERS_STORY_STYLES = {
  fil: "Speak in natural Filipino as one warm mature Filipina community health educator. Explain Malou's locally verified RHU contact, consent and the difference between budget advice and an individual decision with clear phrasing. Read every supplied word exactly; retain the same voice on the application screen, with no announcer switch or added words.",
  en: "Speak in natural Philippine English as one warm mature Filipina community health educator. Explain Malou's locally verified RHU contact, consent and the difference between budget advice and an individual decision with clear phrasing. Read every supplied word exactly; retain the same voice on the application screen, with no announcer switch or added words.",
};

export const BHW_TEAMWORK_STORY_STYLES = {
  "fil": "Speak in natural Filipino (Tagalog) as one mature, warm adult Filipina community health trainer. Keep the same female mid-pitched voice for headings, questions, story and endings. Use gentle pitch and pace variation for Malou\u2019s respectful teamwork, clear roles, early issues, privacy, permission and completion. Read exactly the supplied words; do not add, translate or change speakers. Make negation, the five practices and handoff limits clear.",
  "en": "Speak in natural Philippine English as one mature, warm adult Filipina community health trainer. Keep the same female mid-pitched voice for headings, questions, story and endings. Use gentle pitch and pace variation for Malou\u2019s respectful teamwork, clear roles, early issues, privacy, permission and completion. Read exactly the supplied words; do not add, translate or change speakers. Make negation, the five practices and handoff limits clear."
};

export const BHW_RIGHT_CONTACT_STORY_STYLES = {
  fil: "Speak in natural Filipino (Tagalog), as one mature adult Filipina community health trainer with a warm steady female mid-pitched voice. Use gentle pitch and pace changes for Malou’s contact choices. Slow slightly for official procedure confirmation and do not delay immediate help. All headings, questions, instructions and endings use the same woman narrator. Read the exact words completely, without translation, additions or speaker changes.",
  en: "Speak in natural Philippine English, as one mature Filipina community health trainer with a warm steady female mid-pitched voice. Use gentle pitch and pace changes for Malou’s contact choices. Slow slightly for official procedure confirmation and do not delay immediate help. All headings, questions, instructions and endings use the same woman narrator. Read the exact words completely, without translation, additions or speaker changes.",
};

// Lesson 1.5.5 only; earlier voice/style inputs remain unchanged.
export const BHW_SELF_MANAGEMENT_STORY_STYLES = {
  fil: "Speak in natural Filipino as one warm mature adult Filipina community health trainer in the same settled female mid-register throughout. Use gentle expressive pacing for Malou’s realistic commitments, stress and time management, trustworthiness, careful honest updates and adaptability. Keep headings, lists, quoted updates and checks in this identical voice. Read every supplied word exactly, including negations and complete endings. Pronounce Malou as mah-LOO and gawain as ga-wa-in. No speaker switch or added words.",
  en: "Speak in natural Philippine English as one warm mature adult Filipina community health trainer in the same settled female mid-register throughout. Use gentle expressive pacing for Malou’s realistic commitments, stress and time management, trustworthiness, careful honest updates and adaptability. Keep headings, lists, quoted updates and checks in this identical voice. Read every supplied word exactly, including negations and complete endings. Pronounce Malou as mah-LOO. No speaker switch or added words."
};

export const COMMUNICATION_LISTEN_STORY_STYLES = {
 fil: "Speak natural Filipino (Tagalog) in one steady adult Filipina woman Kore narrator voice throughout every heading, sentence and takeaway. Warm, calm, respectful listening demonstration. Gibs is the male BHW character, not a male narrator; never switch speakers to act out dialogue. Say Gibs as gibz and Liza as LEE-sa. Preserve every word, negation, permission and accuracy-check question. Allow natural pauses; finish all instructions. Do not translate or add words.",
 en: "Speak natural Philippine English in one steady adult Filipina woman Kore narrator voice throughout every heading, sentence and takeaway. Warm, calm, respectful listening demonstration. Gibs is the male BHW character, not a male narrator; never switch speakers to act out dialogue. Say Gibs as gibz and Liza as LEE-sa. Preserve every word, negation, permission and accuracy-check question. Allow natural pauses; finish all instructions. Do not translate or add words.",
};
