import type { BandSlice } from '@app/metrics';
import { BAND_PEAK_HEIGHT } from '../../constants';

type CalendarLoadBandProps = {
  /** One per day, scaled 0–1 (1 = the month's peak); null where there's no value. */
  slices: (BandSlice | null)[];
  /** CSS colour per day. */
  colors: string[];
};

/** SVG y for a scaled value: the row's bottom is 1, the peak reaches BAND_PEAK_HEIGHT above it. */
const yOf = (value: number) => 1 - value * BAND_PEAK_HEIGHT;

/**
 * A filled curve behind one calendar week row (fatigue or fitness). Each day is its own slice so
 * it can carry that day's zone colour; slice edges meet their neighbours, so the curve reads as
 * one continuous shape across the row and on into the next week. Decorative: values are in the
 * day cells' text.
 */
export const CalendarLoadBand = ({ slices, colors }: CalendarLoadBandProps) => (
  <svg
    aria-hidden
    viewBox="0 0 7 1"
    preserveAspectRatio="none"
    className="pointer-events-none absolute inset-0 h-full w-full"
  >
    {slices.map((slice, i) => {
      if (!slice) return null;
      const top = `${i},${yOf(slice.left)} ${i + 0.5},${yOf(slice.center)} ${i + 1},${yOf(slice.right)}`;
      return (
        <g key={i} style={{ color: colors[i] }}>
          <polygon points={`${i},1 ${top} ${i + 1},1`} fill="currentColor" fillOpacity={0.18} />
          <polyline
            points={top}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.6}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
    })}
  </svg>
);
