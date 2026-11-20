import content from '../../../content/training/day1-basic-competencies/manual-references/chapter1.json';

export type ManualBlock =
  | {kind: 'paragraph' | 'heading'; text: string}
  | {kind: 'list'; ordered: boolean; items: string[]}
  | {kind: 'table'; caption: string; headers: string[]; rows: string[][];
      figure: {src: string; sha256: string; width: number; height: number; pdfPage: number}};
export type ManualSection = {
  id: string; title: string; pdfPages: number[]; printedPages: number[]; blocks: ManualBlock[];
};
type ManualContent = {
  version: string;
  source: {title: string; edition: string; publisher: string; url: string; sha256: string; reviewedOn: string};
  lessons: Record<string, {sections: string[]; partialSupport: boolean}>;
  sections: ManualSection[];
};
const manual = content as ManualContent;

// Only explicit Chapter 1 callers enable this. No query, publication or progress write.
export function chapter1ManualReference(lessonKey: string) {
  const mapping = Object.hasOwn(manual.lessons, lessonKey) ? manual.lessons[lessonKey] : undefined;
  if (!mapping) return null;
  return {source: manual.source, partialSupport: mapping.partialSupport,
    sections: mapping.sections.map(id => manual.sections.find(section => section.id === id)!)};
}
