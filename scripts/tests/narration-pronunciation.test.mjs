// @vitest-environment node
import {describe, it, expect} from 'vitest';
import {createHash} from 'node:crypto';
import {spokenText} from '../lib/reference-narration.mjs';
import {computeContentHash} from '../lib/tts-render-core.mjs';
import {WORD_PRONUNCIATIONS} from '../lib/narration-pronunciation.mjs';
import {buildSsml, timingsFromBookmarks} from '../lib/tts-providers/ssml.mjs';

describe('shared YAKAP pronunciation', () => {
  it('speaks YAKAP as a word in every supported language while spelling other initials', () => {
    for (const lang of ['fil','en','ceb','hil']) {
      expect(spokenText('**YAKAP**, Yakap, yakap; BHW.',lang)).toBe(lang==='en' ? 'yakap, yakap, yakap; B H W.' : 'yakap, yakap, yakap; bi-eych-dobolyu.');
    }
  });
  it('invalidates affected audio and preserves unrelated legacy hashes', () => {
    const affected=[{zone:'body',index:0,text:'PhilHealth YAKAP.'}];
    const unaffected=[{zone:'body',index:0,text:'Ask the BHW.'}];
    const legacy=zones=>createHash('sha256').update(JSON.stringify(zones)).update('\0').update('voice').digest('hex');
    expect(computeContentHash(unaffected,'voice')).toBe(legacy(unaffected));
    expect(computeContentHash(affected,'voice')).not.toBe(legacy(affected));
    const original=WORD_PRONUNCIATIONS.YAKAP.direction;
    const current=computeContentHash(affected,'voice');
    try {
      WORD_PRONUNCIATIONS.YAKAP.direction+=' Speak clearly.';
      expect(computeContentHash(affected,'voice')).not.toBe(current);
      expect(computeContentHash(unaffected,'voice')).toBe(legacy(unaffected));
    } finally {WORD_PRONUNCIATIONS.YAKAP.direction=original;}
  });
  it('normalizes Microsoft speech input without changing authored timing text', () => {
    const zones=[{zone:'body',index:0,text:'YAKAP & clinic'}];
    expect(buildSsml(zones,{voice:'en-US-JennyNeural',language:'en'})).toContain('yakap &amp; clinic<bookmark');
    expect(timingsFromBookmarks(zones,[1000],1000)[0].text).toBe('YAKAP & clinic');
  });
});
