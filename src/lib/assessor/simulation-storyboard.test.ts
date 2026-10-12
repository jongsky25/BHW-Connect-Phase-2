import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {simulationStory, storyScenes} from './simulation-storyboard';

describe('C1AF-06a authored contract', () => {
  it('pins the rehearsal source without approving the component mapping or issuing a receipt', () => {
    const source = readFileSync(simulationStory.rubricSource, 'utf8').replace(/\r\n/g, '\n');
    expect(createHash('sha256').update(source).digest('hex')).toBe(simulationStory.rubricSha256Lf);
    expect(simulationStory.reviewStatus).toBe('unreviewed');
    expect(simulationStory.mappingStatus).toBe('unreviewed');
    expect(simulationStory.approvalDecision).toBeNull();
    expect(simulationStory.receipt).toBeNull();
  });
  it('provides unique versioned essential checkpoints with bilingual decisions, explanations and hints', () => {
    expect(new Set(storyScenes.map(s => s.id)).size).toBe(11);
    for (const scene of storyScenes) {
      expect(scene.checkpointVersion).toBe(1);
      expect(scene.essential).toBe(true);
      expect(scene.choices.filter(c => c.correct)).toHaveLength(1);
      expect(scene.choices.some(c => !c.correct)).toBe(true);
      expect(new Set(scene.choices.map(c => c.id)).size).toBe(scene.choices.length);
      for (const pair of [scene.title, scene.evidence, scene.question, scene.hint, ...scene.choices.flatMap(c => [c.text, c.explanation])]) {
        expect(pair.en.trim().length).toBeGreaterThan(0);
        expect(pair.fil.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
