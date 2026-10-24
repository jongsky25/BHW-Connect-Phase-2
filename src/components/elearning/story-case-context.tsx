export function StoryCaseContext({cases, en}: {cases: {name: string; text: string}[]; en: boolean}) {
  return <section aria-label={en ? 'Before you watch' : 'Bago manood'} className="my-3 min-w-0 rounded-lg border border-ink/20 bg-canvas p-3 text-ink">
    <h2 className="font-semibold">{en ? 'Before you watch' : 'Bago manood'}</h2>
    <p className="mt-1 text-sm">{en
      ? 'Gibs is the BHW in these fictional situations. These excerpts from Read introduce the people in the short story. Read has the full explanations.'
      : 'Si Gibs ang BHW sa mga kathang-isip na sitwasyon. Ipinapakilala sa mga siping ito mula sa Basahin ang mga tao sa maikling kuwento. Nasa Basahin ang buong paliwanag.'}</p>
    <ul className="mt-3 space-y-2 text-sm leading-relaxed">
      {cases.map(person => <li key={person.name}><strong>{person.name}: </strong>{person.text}</li>)}
    </ul>
  </section>;
}
