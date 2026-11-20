import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {Chapter1ManualReference} from './chapter1-manual-reference';

function open() {
  const summary = screen.getByText(/Read the Reference Manual|Basahin ang Reference Manual/);
  const details = summary.closest('details')!;
  details.open = true;
  fireEvent(details, new Event('toggle'));
}
describe('Chapter 1 manual references', () => {
  it('opens complete source text with citations in English without translating the quotation', () => {
    render(<Chapter1ManualReference lessonKey="bhw-roles-hepo" locale="en" />);
    expect(screen.queryByText('Health Educator')).not.toBeInTheDocument();
    open();
    expect(screen.getByText('Health Educator')).toBeVisible();
    expect(screen.getByText(/Printed pages.*3, 4.*PDF pages.*11, 12/)).toBeVisible();
    expect(screen.getByText(/Tumutulong ang mga BHW sa pagkolekta/)).toBeVisible();
    expect(screen.getByText(/Reading this reference is optional/)).toBeVisible();
    expect(screen.getByText(/Ang mga barangay health workers o BHW/).closest('[lang]')).toHaveAttribute('lang', 'fil');
  });
  it('shows every safety row and accessible labels without requiring a PDF', () => {
    render(<Chapter1ManualReference lessonKey="safety-identify" locale="fil" />);
    open();
    expect(screen.getByText('Mga disgrasya at aksidente habang nagtatrabaho')).toBeVisible();
    expect(screen.getByText('Stress sa mahaba at boluntaryong pagtatrabaho')).toBeVisible();
    expect(screen.getByText(/Pahina sa aklat.*13, 14, 15.*Pahina sa PDF.*21, 22, 23/)).toBeVisible();
    expect(screen.getAllByText('Tingnan ang orihinal na talahanayan')).toHaveLength(2);
  });
  it('distinguishes partial manual support from authored monitoring examples', () => {
    render(<Chapter1ManualReference lessonKey="resources-monitor" locale="en" />);
    open();
    expect(screen.getByText(/authored practice examples, not procedures quoted/)).toBeVisible();
  });
  it('does not invent a reference for unknown or other-chapter lessons', () => {
    const {container} = render(<Chapter1ManualReference lessonKey="chapter-2-first-aid" locale="en" />);
    expect(container).toBeEmptyDOMElement();
  });
});
