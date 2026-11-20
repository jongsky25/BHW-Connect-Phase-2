'use client';

import {useState} from 'react';
import Image from 'next/image';
import {chapter1ManualReference, type ManualBlock} from '@/lib/elearning/chapter1-manual-reference';

function SourceBlock({block, en}: {block: ManualBlock; en: boolean}) {
  if (block.kind === 'heading') return <h4 className="mt-6 font-semibold">{block.text}</h4>;
  if (block.kind === 'paragraph') return <p className="whitespace-pre-line leading-relaxed">{block.text}</p>;
  if (block.kind === 'list') {
    const List = block.ordered ? 'ol' : 'ul';
    return <List className={`space-y-3 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
      {block.items.map((item, i) => <li key={i}>{item}</li>)}
    </List>;
  }
  if (block.kind !== 'table') return null;
  // Each table row becomes a labelled card, preserving every cell without
  // squeezing long safety guidance into three narrow columns on a phone.
  return <figure className="space-y-4">
    <figcaption className="font-semibold">{block.caption}</figcaption>
    <ol className="space-y-4">
      {block.rows.map((row, index) => <li key={index} className="rounded-lg border border-ink/20 p-4">
        <dl className="space-y-3">{block.headers.map((header, column) => <div key={column}>
          <dt className="text-sm font-semibold">{header}</dt>
          <dd className="whitespace-pre-line leading-relaxed">{row[column]}</dd>
        </div>)}</dl>
      </li>)}
    </ol>
    <details lang={en ? 'en' : 'fil'}>
      <summary className="min-h-11 cursor-pointer py-3 underline">{en ? 'See the original table' : 'Tingnan ang orihinal na talahanayan'}</summary>
      <a href={block.figure.src} target="_blank" rel="noreferrer" className="block space-y-2">
        <Image src={block.figure.src} width={block.figure.width} height={block.figure.height}
          alt={`${block.caption} — ${en ? 'original, PDF page' : 'orihinal, pahina sa PDF'} ${block.figure.pdfPage}`}
          unoptimized className="h-auto w-full" />
        <span className="inline-block min-h-11 py-3 underline">{en ? 'Open full-size image in a new tab' : 'Buksan ang malaking larawan sa bagong tab'}</span>
      </a>
    </details>
  </figure>;
}

export function Chapter1ManualReference({lessonKey, locale}: {lessonKey: string; locale: string}) {
  const [open, setOpen] = useState(false);
  const reference = chapter1ManualReference(lessonKey);
  if (!reference) return null;
  const en = locale === 'en';
  const copy = (fil: string, english: string) => en ? english : fil;
  return <details className="my-4 rounded-xl border border-primary/30 bg-surface p-4 sm:p-6"
    onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="min-h-11 cursor-pointer py-2 text-lg font-semibold text-primary">
      {copy('Basahin ang Reference Manual', 'Read the Reference Manual')}
    </summary>
    {open && <div className="mt-4 space-y-5 break-words">
      <p>{copy('Maaari mong balikan ito anumang oras. Hindi kailangang tapusin ang pagbasa rito upang makumpleto ang aralin.',
        'You can return here at any time. Reading this reference is optional and does not change lesson completion.')}</p>
      <p className="text-sm">{reference.source.title}, {reference.source.edition}. {reference.source.publisher}.</p>
      <p>{copy('Orihinal na Filipino mula sa manual ang sipi sa ibaba, kahit English ang piniling wika. Inayos lamang ang pagitan ng mga linya at ang layout ng mga talahanayan para madaling basahin sa telepono.',
        'The quotation below keeps the manual’s original Filipino, including when English is selected. Line wrapping and table layout are adjusted for reading on a phone.')}</p>
      {reference.partialSupport && <aside className="rounded-lg border border-ink/20 p-4">
        <strong>{copy('Paliwanag sa sanggunian', 'About this reference')}</strong>
        <p>{copy('Ang bahaging ito ng manual ay tungkol sa pagbabawas ng single-use plastics. Ang pagbilang ng gamit at pagsubaybay sa pagbabago sa aralin ay mga halimbawang ginawa para sa pagsasanay; hindi sila direktang sipi ng manual.',
          'This manual passage covers reducing single-use plastics. The lesson’s resource counts and monitoring exercises are authored practice examples, not procedures quoted from the manual.')}</p>
      </aside>}
      <div className="space-y-8" lang="fil">{reference.sections.map(section => <section key={section.id} className="space-y-4">
        <h3 className="text-lg font-semibold">{section.title}</h3>
        <p className="text-sm" lang={en ? 'en' : 'fil'}>{copy('Pahina sa aklat', 'Printed pages')}: {section.printedPages.join(', ')} · {copy('Pahina sa PDF', 'PDF pages')}: {section.pdfPages.join(', ')}</p>
        <blockquote className="space-y-4 border-l-2 border-primary/30 pl-4">
          {section.blocks.map((block, i) => <SourceBlock key={i} block={block} en={en} />)}
        </blockquote>
      </section>)}</div>
      <p className="text-sm">{copy('Ang sipi ay mula sa edisyong 2022. Ang mga paliwanag at kathang-isip na sitwasyon sa aralin ay hiwalay sa sipi.',
        'This quotation is from the 2022 edition. The lesson’s explanations and fictional scenarios are separate from the quotation.')}</p>
      <a href={reference.source.url} target="_blank" rel="noreferrer" className="inline-block min-h-11 py-3 underline">
        {copy('Orihinal na manual sa Google Drive (PDF, bagong tab)', 'Original manual on Google Drive (PDF, new tab)')}
      </a>
    </div>}
  </details>;
}
