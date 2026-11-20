import { useEffect, useState } from 'react';
import { FILTER_FIELD_CLASS } from '../../constants';
import { parseKm } from '../../lib/listText';

type KmInputProps = {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
};

const toText = (value: number | undefined) => (value === undefined ? '' : String(value));

/** A distance bound in km, applied when the field loses focus or Enter is pressed. */
export const KmInput = ({ label, value, onChange }: KmInputProps) => {
  const [text, setText] = useState(toText(value));
  useEffect(() => setText(toText(value)), [value]);

  const commit = () => onChange(parseKm(text));

  return (
    <label className="flex flex-col gap-1 text-xs text-ink-2">
      {label}
      <input
        inputMode="decimal"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
        }}
        className={`${FILTER_FIELD_CLASS} w-20 tabular-nums`}
      />
    </label>
  );
};
