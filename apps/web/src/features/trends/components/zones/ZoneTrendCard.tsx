import { HR_ZONES, POWER_ZONES } from '@app/metrics';
import { useMemo, useState } from 'react';
import type { Trends } from '@/shared/api/client';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { EChart } from '@/shared/charts/EChart';
import { Card } from '@/shared/ui/Card';
import { Toggle } from '@/shared/ui/Toggle';
import { intensitySplit, type ZoneUnit } from '../../lib/zoneTime';
import { IntensitySummary } from './IntensitySummary';
import { zoneTrendChartOption } from './zoneTrendChartOption';
import { ZoneTrendTable } from './ZoneTrendTable';
import { channelName, WEEKS_SHOWN, type ZoneChannel, type ZonePeriod } from './zoneTrendTypes';

type View = 'chart' | 'table';

const VIEW_OPTIONS: ReadonlyArray<{ value: View; label: string }> = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
];
const CHANNEL_OPTIONS: ReadonlyArray<{ value: ZoneChannel; label: string }> = [
  { value: 'hr', label: 'Heart rate' },
  { value: 'power', label: 'Power' },
];
const PERIOD_OPTIONS: ReadonlyArray<{ value: ZonePeriod; label: string }> = [
  { value: 'week', label: 'Weeks' },
  { value: 'month', label: 'Months' },
];
const UNIT_OPTIONS: ReadonlyArray<{ value: ZoneUnit; label: string }> = [
  { value: 'hours', label: 'Hours' },
  { value: 'share', label: '% of time' },
];

/** Weeks behind the easy/moderate/hard summary. */
const SUMMARY_WEEKS = 4;

type ZoneTrendCardProps = {
  zones: Trends['zones'];
};

/**
 * Time in power or heart-rate zones per week or month, as stacked bars in the zone ramps from
 * styles.css (one hue per channel, Z1 lightest; the same colours as a ride's zones card),
 * in hours or as a share of the period. Plus the easy/moderate/hard split of the last 4 weeks.
 */
export const ZoneTrendCard = ({ zones }: ZoneTrendCardProps) => {
  const colorScheme = useColorScheme();
  const [channel, setChannel] = useState<ZoneChannel>('hr');
  const [period, setPeriod] = useState<ZonePeriod>('week');
  const [unit, setUnit] = useState<ZoneUnit>('hours');
  const [view, setView] = useState<View>('chart');

  const zoneDefinitions = channel === 'power' ? POWER_ZONES : HR_ZONES;
  const rows = useMemo(() => (period === 'week' ? zones.weeks.slice(-WEEKS_SHOWN) : zones.months), [zones, period]);
  const recentSplit = intensitySplit(zones.weeks.slice(-SUMMARY_WEEKS).map((week) => week[channel]));

  // Colours are read from CSS variables, so the option is rebuilt when the colour scheme changes.
  const option = useMemo(
    () => zoneTrendChartOption({ rows, zones: zoneDefinitions, channel, period, unit }),
    [rows, zoneDefinitions, channel, period, unit, colorScheme],
  );

  const channelText =
    channel === 'power' ? 'Power zones are % of FTP (rides with a power meter).' : 'Heart-rate zones are % of LTHR.';
  const periodText = period === 'week' ? `Last ${WEEKS_SHOWN} weeks.` : 'All months.';

  return (
    <Card
      title="Time in zones"
      className="lg:col-span-3"
      action={<Toggle label="Time in zones view" value={view} onChange={setView} options={VIEW_OPTIONS} />}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Toggle label="Zones by" value={channel} onChange={setChannel} options={CHANNEL_OPTIONS} />
        <Toggle label="Group by" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
        <Toggle label="Unit" value={unit} onChange={setUnit} options={UNIT_OPTIONS} />
      </div>
      <IntensitySummary split={recentSplit} channel={channel} />
      {view === 'chart' ? (
        <EChart
          option={option}
          className="h-80"
          ariaLabel={`Time in ${channelName(channel)} zones per ${period}, stacked from Z1 at the bottom to Z${zoneDefinitions.length} at the top. Switch to the table view for values.`}
        />
      ) : (
        <ZoneTrendTable rows={rows} zones={zoneDefinitions} channel={channel} period={period} />
      )}
      <p className="mt-3 text-xs text-ink-3">
        Rides only. {channelText} Rides before your first FTP/LTHR entry use that first value, as on each ride&apos;s
        zones card. {periodText}
      </p>
    </Card>
  );
};
