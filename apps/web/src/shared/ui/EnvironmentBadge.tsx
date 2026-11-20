import { formatSport } from '@/shared/lib/formatters';

type EnvironmentBadgeProps = {
  isIndoor: boolean;
  isCycling: boolean;
  /** Garmin activity type, shown for activities that aren't rides. */
  sport: string;
};

/**
 * Indoor/outdoor badge for rides, in the same colour as the chart series, plus a text label.
 * Blue and orange mean indoor and outdoor riding everywhere in the app, so other activities
 * (strength, running, …) get a neutral hollow marker labelled with their type.
 */
export const EnvironmentBadge = ({ isIndoor, isCycling, sport }: EnvironmentBadgeProps) => {
  if (!isCycling) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
        <span aria-hidden className="inline-block size-2 rounded-full border border-ink-3" />
        {formatSport(sport)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
      <span aria-hidden className={`inline-block size-2 rounded-full ${isIndoor ? 'bg-series-1' : 'bg-series-2'}`} />
      {isIndoor ? 'Indoor' : 'Outdoor'}
    </span>
  );
};
