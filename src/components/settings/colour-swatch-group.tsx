// A round colour swatch group (increment 3.5, Settings → Colours): unlike
// SegmentedRadioGroup's pill of text labels, each option here is a filled
// circle with its name underneath (colour is never the only cue) and a
// checkmark on the selected one. `colourFor` returns a literal hex rather
// than a Tailwind/CSS-variable class because these need to preview *every*
// option's own colour side by side, not just whichever one happens to be
// active on <html> right now — see the comment on palette.ts's colour-hex
// maps for why that's the one other place besides tokens.css allowed to
// hold one.
export function ColourSwatchGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  colourFor,
  labelFor,
  disabled,
}: {
  legend: string;
  name: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  colourFor: (option: T) => string;
  labelFor: (option: T) => string;
  /** RFT B2 (docs/role-feature-toggles-plan.md §6 B2): while previewing,
      nothing is saved — a fieldset disables every swatch in one place. */
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-4">
        {options.map((option) => {
          const checked = value === option;
          return (
            <label key={option} className="flex w-16 cursor-pointer flex-col items-center gap-1.5 text-center">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                <input
                  type="radio"
                  name={name}
                  checked={checked}
                  onChange={() => onChange(option)}
                  className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
                />
                <span
                  aria-hidden="true"
                  className={`h-11 w-11 rounded-full border-2 ${checked ? "border-ink" : "border-transparent"}`}
                  style={{ backgroundColor: colourFor(option) }}
                />
                {checked ? (
                  // text-on-primary (fixed cream), not text-canvas: every
                  // swatch fill was tuned in 3.2/3.3 to clear 4.5:1 against
                  // that same fixed cream (the on-primary-fill contrast
                  // check), which text-canvas can't promise once canvas
                  // itself goes dark and sits close to these fills in
                  // luminance.
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="pointer-events-none absolute h-5 w-5 text-on-primary"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </span>
              <span className="text-xs font-medium text-ink">{labelFor(option)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
