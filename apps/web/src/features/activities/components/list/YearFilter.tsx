import { Toggle } from '@/shared/ui/Toggle';
import type { ActivitySearchPatch } from '../../search';
import { selectedYearValue, yearOptions, yearRangePatch } from '../../lib/yearFilter';

type YearFilterProps = {
  years: ReadonlyArray<number>;
  from: string | undefined;
  to: string | undefined;
  onChange: (patch: ActivitySearchPatch) => void;
};

/** Quick year choice that sets the From/To dates to that calendar year. */
export const YearFilter = ({ years, from, to, onChange }: YearFilterProps) => {
  if (years.length === 0) return null;

  return (
    <Toggle
      label="Year"
      value={selectedYearValue(from, to)}
      onChange={(value) => onChange(yearRangePatch(value))}
      options={yearOptions(years)}
    />
  );
};
