// Shared by the full Settings → Display form and the header's quick-display
// popover + mobile drawer "Display" section (increment 3.5). bg-ink/
// text-canvas is used instead of the usual bg-primary/text-on-primary or
// text-success accents because ink and canvas are always each other's
// inverse in every theme + contrast state, guaranteeing AA contrast; primary
// and success are fixed brand colors tuned against the default palette and
// don't hold up once canvas swings to the dark or high-contrast extremes.
export function SegmentedRadioGroup<T>({
  legend,
  name,
  options,
  value,
  onChange,
  labelFor,
  ariaLabelFor,
}: {
  legend: string;
  name: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  labelFor: (option: T) => string;
  /** Accessible name, when it needs to say more than the visible label (e.g.
      a compact "A+" glyph whose accessible name should be "Large text"). */
  ariaLabelFor?: (option: T) => string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <div className="inline-flex w-fit overflow-hidden rounded-full border border-ink/15">
        {options.map((option, index) => {
          const checked = value === option;
          return (
            <label
              key={index}
              aria-label={ariaLabelFor?.(option)}
              className={`relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center px-4 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${
                checked ? "bg-ink text-canvas" : "bg-transparent text-ink hover:bg-ink/5"
              }`}
            >
              {/* An `sr-only` input clips to 1x1px at a fixed offset, away
                  from the label's own rendered box — real browsers then
                  can't hit-test a click there (Playwright: "element is
                  outside of the viewport" / a sibling "intercepts pointer
                  events"), even though jsdom-based component tests never
                  notice since they don't do real hit-testing. An invisible
                  input stretched to cover the whole label keeps every click
                  on the label landing on the input itself. */}
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange(option)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {labelFor(option)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
