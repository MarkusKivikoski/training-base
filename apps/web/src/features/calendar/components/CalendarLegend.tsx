import { formatDate, formatLoad } from '@/shared/lib/formatters';
import type { MonthView } from '../hooks/useCalendarMonth';
import { measureAbbreviation, measureName } from '../lib/dayLoad';

type CalendarLegendProps = {
  view: MonthView;
};

/** What the markers, totals and background mean. */
export const CalendarLegend = ({ view }: CalendarLegendProps) => {
  const { background, peak, zonesFrom, today } = view;
  const showsBackgroundNote = background !== 'off' && peak > 0;
  const isFitness = background === 'fitness';
  const isBeforeZones = zonesFrom !== null && today < zonesFrom;

  return (
    <>
      <p className="mt-3 text-xs text-ink-3">
        Blue: indoor ride · orange: outdoor ride · ring: other activities. Times are moving time; distance shows for
        outdoor rides. Week and month totals count rides, with outdoor distance and climbing; month totals cover only
        days in the month. ← and → change the month.
      </p>
      {showsBackgroundNote && (
        <p className="mt-1 text-xs text-ink-3">
          Background: {measureName(background).toLowerCase()} ({measureAbbreviation(background)}), scaled to this
          month’s peak {formatLoad(peak)}, coloured by {isFitness ? 'fitness ramp' : 'fatigue'} zone as on the Overview
          (✓ optimal · ! high · ✕ too high · ▲ low).
          {isBeforeZones &&
            ` Zones start ${formatDate(zonesFrom)}; until then it’s plain ${isFitness ? 'blue' : 'orange'}.`}
        </p>
      )}
    </>
  );
};
