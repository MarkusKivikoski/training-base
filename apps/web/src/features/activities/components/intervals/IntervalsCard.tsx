import { useState } from 'react';
import type { ActivityStreams } from '@/shared/api/client';
import {
  formatCadence,
  formatClock,
  formatDistance,
  formatDuration,
  formatHeartRate,
  formatPower,
  formatSpeed,
} from '@/shared/lib/formatters';
import { lapRows, withRangeStats, type RangeRow } from '@/shared/lib/rangeRows';
import { Card } from '@/shared/ui/Card';
import { DataTable } from '@/shared/ui/DataTable';
import { Toggle } from '@/shared/ui/Toggle';
import type { IntervalEditor } from '../../hooks/useIntervalEditor';
import { hasPowerData, percentOfFtp } from '../../lib/rideIntervals';
import { IntervalEditPanel } from './IntervalEditPanel';
import { IntervalRowActions } from './IntervalRowActions';

type Tab = 'intervals' | 'laps';

type IntervalsCardProps = {
  stream: ActivityStreams;
  editor: IntervalEditor;
  ftp: number | null;
  isIndoor: boolean;
};

const intervalCount = (count: number) => (count === 1 ? '1 interval' : `${count} intervals`);

const intervalsNote = (rows: readonly RangeRow[], ftp: number | null, editor: IntervalEditor) => {
  const ftpText = ftp ? ` (${ftp} W)` : '';
  const detectedText = `Detected from power: efforts at 88% of FTP${ftpText} or more for 30 s+, short dips under 20 s don't split them.`;
  const handSetText = `Set by hand (detection found ${intervalCount(editor.detectedCount)}).`;
  const base = editor.isHandSet ? handSetText : detectedText;
  if (rows.length === 0) return base;

  let workSeconds = 0;
  for (const row of rows) workSeconds += row.durationS;
  return `${base} ${intervalCount(rows.length)}, ${formatDuration(workSeconds)} of work. Shaded on the power chart.`;
};

const noIntervalsText = (editor: IntervalEditor) => {
  if (editor.isHandSet) return 'No work intervals: all removed by hand.';
  return 'No work intervals detected: no efforts at 88% of FTP or more for 30 s or longer. Add one if detection missed it.';
};

/**
 * Work intervals (detected from power, or set by hand) and the laps the device recorded (only when
 * there is more than one), each with its own stats. Intervals are numbered like the shading on the
 * power chart, and can be removed, trimmed or added by hand.
 */
export const IntervalsCard = ({ stream, editor, ftp, isIndoor }: IntervalsCardProps) => {
  const laps = lapRows(stream);
  const intervalRows = withRangeStats(stream, editor.intervals);
  const hasPower = hasPowerData(stream);
  const opensOnLaps = intervalRows.length === 0 && laps.length > 0;
  const [tab, setTab] = useState<Tab>(opensOnLaps ? 'laps' : 'intervals');

  if (!hasPower && laps.length === 0) return null;

  const isIntervalsTab = tab === 'intervals';
  const rows = isIntervalsTab ? intervalRows : laps;
  const showDistance = !isIndoor;
  const canSwitch = laps.length > 0 && hasPower;
  const canEdit = isIntervalsTab && hasPower;
  const hasNoIntervals = isIntervalsTab && intervalRows.length === 0;
  const isEditingLocked = editor.draft !== null || editor.isSaving;
  const editingIndex = editor.draft?.editingIndex ?? null;
  const trimmedInterval = editingIndex === null ? null : editor.intervals[editingIndex];

  const switchTab = (next: Tab) => {
    setTab(next);
    editor.cancelDraft();
  };

  return (
    <Card
      title="Intervals & laps"
      className="lg:col-span-3"
      action={
        canSwitch ? (
          <Toggle
            label="Intervals or laps"
            value={tab}
            onChange={switchTab}
            options={[
              { value: 'intervals', label: `Intervals (${intervalRows.length})` },
              { value: 'laps', label: `Laps (${laps.length})` },
            ]}
          />
        ) : undefined
      }
    >
      {hasNoIntervals ? (
        <p className="text-sm text-ink-3">{noIntervalsText(editor)}</p>
      ) : (
        <DataTable
          rows={rows}
          rowKey={(row, i) => `${row.startS}-${i}`}
          rowClassName={(row) => (isIntervalsTab && row.startS === trimmedInterval?.startS ? 'font-semibold' : '')}
          columns={[
            { key: 'n', header: '#', className: 'font-semibold', cell: (_, i) => i + 1 },
            {
              key: 'start',
              header: 'Start',
              className: 'tabular-nums text-ink-2',
              cell: (row) => formatClock(row.startS),
            },
            { key: 'duration', header: 'Duration', align: 'right', cell: (row) => formatClock(row.durationS) },
            {
              key: 'distance',
              header: 'Distance',
              align: 'right',
              hidden: !showDistance,
              cell: (row) => formatDistance(row.distanceM, 2),
            },
            {
              key: 'speed',
              header: 'Speed',
              align: 'right',
              hidden: !showDistance,
              cell: (row) => formatSpeed(row.avgSpeed),
            },
            {
              key: 'avgPower',
              header: 'Avg power',
              align: 'right',
              hidden: !hasPower,
              className: 'font-medium',
              cell: (row) => formatPower(row.avgPower),
            },
            {
              key: 'pctFtp',
              header: '% FTP',
              align: 'right',
              hidden: !hasPower || !ftp,
              cell: (row) => percentOfFtp(row.avgPower, ftp),
            },
            { key: 'np', header: 'NP', align: 'right', hidden: !hasPower, cell: (row) => formatPower(row.np) },
            { key: 'max', header: 'Max', align: 'right', hidden: !hasPower, cell: (row) => formatPower(row.maxPower) },
            { key: 'avgHr', header: 'Avg HR', align: 'right', cell: (row) => formatHeartRate(row.avgHr) },
            { key: 'maxHr', header: 'Max HR', align: 'right', cell: (row) => formatHeartRate(row.maxHr) },
            { key: 'cadence', header: 'Cadence', align: 'right', cell: (row) => formatCadence(row.avgCadence) },
            {
              key: 'actions',
              header: <span className="sr-only">Edit</span>,
              align: 'right',
              hidden: !canEdit,
              cell: (_, i) => (
                <IntervalRowActions
                  number={i + 1}
                  isDisabled={isEditingLocked}
                  onTrim={() => editor.startTrimming(i)}
                  onRemove={() => editor.remove(i)}
                />
              ),
            },
          ]}
        />
      )}
      {canEdit && <IntervalEditPanel editor={editor} stream={stream} ftp={ftp} />}
      <p className="mt-2 text-xs text-ink-3">
        {isIntervalsTab
          ? intervalsNote(intervalRows, ftp, editor)
          : 'Laps as recorded by your device (manual or automatic).'}
      </p>
    </Card>
  );
};
