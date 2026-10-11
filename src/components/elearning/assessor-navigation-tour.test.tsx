import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {AssessorNavigationTour} from './assessor-navigation-tour';

afterEach(() => {cleanup(); vi.restoreAllMocks();});
describe('fictional Chapter 1 navigation walkthrough', () => {
  it.each(['en', 'fil'])('supports every step, local examples, revisit and replay (%s)', async locale => {
    const user = userEvent.setup();
    const network = vi.spyOn(globalThis, 'fetch');
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    render(<AssessorNavigationTour locale={locale}/>);
    const en = locale === 'en';
    const nav = screen.getByRole('navigation', {name: en ? 'Walkthrough steps' : 'Mga hakbang sa paglilibot'});
    const stepButtons = within(nav).getAllByRole('button');
    expect(stepButtons).toHaveLength(8);
    expect(screen.getByRole('button', {name: en ? 'Previous step' : 'Nakaraang hakbang'})).toBeDisabled();
    const actions = en
      ? ['Show personal study example', 'Open example plan', 'Show Rosa’s example view', 'Show example exchange', 'Record demo observation', 'Check demo evidence', 'Show later observation example', 'Show follow-up plan']
      : ['Ipakita ang halimbawa ng sariling pag-aaral', 'Buksan ang halimbawang plano', 'Ipakita ang nakikita ni Rosa', 'Ipakita ang halimbawang usapan', 'Itala ang demo observation', 'Suriin ang demo evidence', 'Ipakita ang susunod na obserbasyon', 'Ipakita ang follow-up plan'];
    for (let index = 0; index < 8; index++) {
      expect(stepButtons[index]).toHaveAttribute('aria-current', 'step');
      const action = screen.getByRole('button', {name: actions[index]});
      expect(action).toHaveAttribute('aria-expanded', 'false');
      await user.click(action);
      expect(action).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('status')).not.toBeEmptyDOMElement();
      if (index < 7) await user.click(screen.getByRole('button', {name: en ? 'Next step' : 'Susunod na hakbang'}));
    }
    expect(screen.getByRole('button', {name: en ? 'Next step' : 'Susunod na hakbang'})).toBeDisabled();
    await user.click(stepButtons[4]);
    expect(screen.getByText(en ? /no real record is saved/ : /walang totoong rekord na na-save/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: en ? 'Replay walkthrough' : 'Ulitin ang paglilibot'}));
    expect(stepButtons[0]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await user.click(stepButtons[4]);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(network).not.toHaveBeenCalled(); expect(storage).not.toHaveBeenCalled();
    expect(screen.queryByRole('link')).toBeNull();
  });
  it('keeps missing evidence separate from failure and never converts coached practice into a formal result', async () => {
    const user = userEvent.setup(); render(<AssessorNavigationTour locale="en"/>);
    await user.click(screen.getByRole('button', {name: 'Check assessment readiness'}));
    await user.click(screen.getByRole('button', {name: 'Check demo evidence'}));
    expect(screen.getByRole('status')).toHaveTextContent('Not ready for a formal decision');
    expect(screen.getByRole('status')).toHaveTextContent('do not assign pass or fail just because evidence is missing');
    await user.click(screen.getByRole('button', {name: 'Next step'}));
    await user.click(screen.getByRole('button', {name: 'Show later observation example'}));
    expect(screen.getByRole('status')).toHaveTextContent('one criterion only');
    expect(screen.getByRole('status')).toHaveTextContent('no automatic pass, formal decision, or certificate');
    await user.click(screen.getByRole('button', {name: 'Previous step'}));
    expect(screen.getByRole('status')).toHaveTextContent('Not ready for a formal decision');
  });
  it('allows keyboard selection and button activation', async () => {
    const user = userEvent.setup(); render(<AssessorNavigationTour locale="en"/>);
    await user.tab();
    expect(screen.getByRole('button', {name: 'Personal study'})).toHaveFocus();
    await user.tab(); await user.keyboard('{Enter}');
    expect(screen.getByRole('button', {name: 'Prepare the lesson'})).toHaveAttribute('aria-current', 'step');
    for (let index = 0; index < 7; index++) await user.tab();
    expect(screen.getByRole('button', {name: 'Open example plan'})).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByRole('status')).toHaveTextContent('A private plan is not yet a delivered-session record');
  });
  it('restarts after leaving the page without creating a completion receipt', async () => {
    const user = userEvent.setup(); const first = render(<AssessorNavigationTour locale="en"/>);
    await user.click(screen.getByRole('button', {name: 'Feedback and follow-up'}));
    await user.click(screen.getByRole('button', {name: 'Show follow-up plan'}));
    first.unmount(); render(<AssessorNavigationTour locale="en"/>);
    expect(screen.getByRole('button', {name: 'Personal study'})).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByText(/nothing is recorded as briefing acknowledgement or competency evidence/)).toBeInTheDocument();
  });
});
