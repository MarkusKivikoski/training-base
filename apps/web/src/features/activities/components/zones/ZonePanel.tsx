import type { Zone } from '@app/metrics';
import { formatDate, formatDuration } from '@/shared/lib/formatters';
import { totalZoneSeconds, zoneRows, type ZoneSet } from '@/shared/lib/zoneRows';

type ZonePanelProps = {
  title: string;
  set: ZoneSet;
  zones: readonly Zone[];
  unit: string;
  thresholdName: string;
  /** Picks the colour ramp from styles.css (`--zone-power-*` or `--zone-hr-*`). */
  channel: 'power' | 'hr';
};

/** One channel's zones as a table: range, a bar for the share of time, the time and the percentage. */
export const ZonePanel = ({ title, set, zones, unit, thresholdName, channel }: ZonePanelProps) => {
  const rows = zoneRows(set, zones);
  const backAppliedNote = `: your first ${thresholdName} entry, applied to this earlier ride for zones only (TSS and fitness don't use it).`;

  return (
    <section aria-label={`Time in ${title.toLowerCase()} zones`}>
      <h3 className="mb-2 text-xs font-medium text-ink-2">{title}</h3>
      <table className="w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>Zone</th>
            <th>Range</th>
            <th>Share</th>
            <th>Time</th>
            <th>Percent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td className="whitespace-nowrap py-1 pr-2">
                <span className="font-semibold">Z{row.number}</span> <span className="text-ink-2">{row.name}</span>
              </td>
              <td className="whitespace-nowrap py-1 pr-3 text-xs text-ink-3">
                {row.range} {unit}
              </td>
              <td className="w-full py-1 pr-3" aria-hidden>
                <div className="h-3 rounded-sm bg-surface-0">
                  <div
                    className="h-3 rounded-sm"
                    style={{ width: `${row.barPercent}%`, background: `var(--zone-${channel}-${row.number})` }}
                  />
                </div>
              </td>
              <td className="whitespace-nowrap py-1 pr-2 text-right tabular-nums">
                {row.seconds > 0 ? formatDuration(row.seconds) : '—'}
              </td>
              <td className="whitespace-nowrap py-1 text-right text-xs tabular-nums text-ink-3">
                {Math.round(row.percent)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-ink-3">
        {thresholdName} {set.threshold} {unit}, set {formatDate(set.thresholdFrom)}
        {set.backApplied ? backAppliedNote : '.'} {formatDuration(totalZoneSeconds(set))} of riding counted.
      </p>
    </section>
  );
};
