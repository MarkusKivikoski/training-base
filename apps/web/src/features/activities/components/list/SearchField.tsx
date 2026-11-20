import { useEffect, useState } from 'react';
import { FILTER_FIELD_CLASS } from '../../constants';

/** How long typing must pause before the search reaches the URL. */
const DEBOUNCE_MS = 250;

type SearchFieldProps = {
  /** The search in the URL. */
  value: string | undefined;
  /** Called with the trimmed text, or undefined when it's empty. */
  onChange: (value: string | undefined) => void;
};

/** The name search box. It updates the URL shortly after typing stops. */
export const SearchField = ({ value, onChange }: SearchFieldProps) => {
  const [text, setText] = useState(value ?? '');

  // The URL changed from elsewhere (e.g. Clear filters): show it.
  useEffect(() => setText(value ?? ''), [value]);

  useEffect(() => {
    if (text === (value ?? '')) return;
    const timer = setTimeout(() => onChange(text.trim() || undefined), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // Only typing should start the timer; URL changes reset the text above instead.
  }, [text]);

  return (
    <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-ink-2">
      Search
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Name contains…"
        className={FILTER_FIELD_CLASS}
      />
    </label>
  );
};
