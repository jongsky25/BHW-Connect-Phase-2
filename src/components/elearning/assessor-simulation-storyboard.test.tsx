import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {AssessorSimulationStoryboard} from './assessor-simulation-storyboard';
import {storyScenes} from '../../lib/assessor/simulation-storyboard';

afterEach(() => {cleanup(); vi.unstubAllGlobals();});
const nav = () => within(screen.getByRole('navigation'));
const go = (index: number, locale: 'en' | 'fil' = 'en') => fireEvent.click(nav().getByRole('button', {name: new RegExp(storyScenes[index].title[locale])}));

describe('local Maria storyboard', () => {
  it('requires guide round-trip and structured evidence, retains mistakes and never treats navigation as completion', () => {
    render(<AssessorSimulationStoryboard />);
    go(1);
    fireEvent.click(screen.getByRole('button', {name: storyScenes[1].choices[0].text.en}));
    expect(screen.getByRole('status')).toHaveTextContent('First inspect');
    fireEvent.click(screen.getByRole('button', {name: 'Open / return to Prepare'}));
    fireEvent.click(screen.getByRole('button', {name: 'Show BHW presentation'}));
    fireEvent.click(screen.getByRole('button', {name: 'Open / return to Prepare'}));
    fireEvent.click(screen.getByRole('button', {name: storyScenes[1].choices[0].text.en}));
    expect(screen.getByRole('status')).toHaveTextContent('Checkpoint reviewed');
    go(3);
    fireEvent.click(screen.getByRole('button', {name: storyScenes[3].choices[1].text.en}));
    expect(screen.getByRole('status')).toHaveTextContent('First inspect');
    screen.getAllByRole('checkbox').forEach(box => fireEvent.click(box));
    fireEvent.change(screen.getByRole('textbox'), {target: {value: 'Fictional Maria clarified after Alex prompted her.'}});
    fireEvent.click(screen.getByRole('button', {name: storyScenes[3].choices[0].text.en}));
    expect(screen.getByRole('status')).toHaveTextContent('Alex supplied a prompt');
    expect(screen.getByRole('button', {name: 'Next scene'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button', {name: storyScenes[3].choices[1].text.en}));
    expect(screen.getByRole('button', {name: 'Next scene'})).toBeEnabled();
    expect(screen.getByText('Review earlier choices and corrections')).toBeVisible();
    go(10);
    expect(screen.getByText(/Local review checklist/)).toHaveTextContent('2/11');
    go(3);
    expect(screen.getByRole('textbox')).toHaveValue('Fictional Maria clarified after Alex prompted her.');
  });

  it.each(['en', 'fil'] as const)('walks all essential checkpoints in %s without network, storage, receipt or real certificate', locale => {
    const fetch = vi.fn(() => {throw new Error('Network forbidden');});
    vi.stubGlobal('fetch', fetch);
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const {unmount} = render(<AssessorSimulationStoryboard />);
    if (locale === 'fil') fireEvent.click(screen.getByRole('button', {name: 'Filipino'}));
    for (let i = 0; i < storyScenes.length; i++) {
      go(i, locale);
      if (i === 1) {
        const guide = locale === 'en' ? 'Open / return to Prepare' : 'Buksan / bumalik sa Ihanda';
        fireEvent.click(screen.getByRole('button', {name: guide}));
        fireEvent.click(screen.getByRole('button', {name: locale === 'en' ? 'Show BHW presentation' : 'Ipakita sa BHW'}));
        fireEvent.click(screen.getByRole('button', {name: guide}));
      }
      if (i === 3) {
        screen.getAllByRole('checkbox').forEach(box => fireEvent.click(box));
        fireEvent.change(screen.getByRole('textbox'), {target: {value: 'P1 — Alex prompt; Maria correction.'}});
      }
      fireEvent.click(screen.getByRole('button', {name: storyScenes[i].choices.find(c => c.correct)!.text[locale]}));
    }
    expect(screen.getByText(locale === 'en' ? /Local review checklist/ : /Lokal na checklist ng review/)).toHaveTextContent('11/11');
    expect(screen.getByRole('complementary')).toHaveTextContent('SAMPLE');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled(); expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
    unmount(); render(<AssessorSimulationStoryboard />);
    expect(screen.getByText(/Local review checklist/)).toHaveTextContent('0/11');
  });

  it('keeps the no-grade and readiness-blocker branches correctable across language changes', () => {
    render(<AssessorSimulationStoryboard />);
    go(5);
    fireEvent.click(screen.getByRole('button', {name: storyScenes[5].choices[0].text.en}));
    expect(screen.getByRole('status')).toHaveTextContent('Do not grade the unseen part');
    fireEvent.click(screen.getByRole('button', {name: storyScenes[5].choices[1].text.en}));
    expect(screen.getByRole('status')).toHaveTextContent('rating null');
    go(6);
    fireEvent.click(screen.getByRole('button', {name: storyScenes[6].choices[0].text.en}));
    expect(screen.getByRole('status')).toHaveTextContent('cannot override');
    fireEvent.click(screen.getByRole('button', {name: 'Filipino'}));
    expect(screen.getByRole('status')).toHaveTextContent('Hindi maaaring lampasan');
    fireEvent.click(screen.getByRole('button', {name: storyScenes[6].choices[1].text.fil}));
    expect(screen.getByText(/Lokal na checklist ng review/)).toHaveTextContent('2/11');
  });
});
