import type { RidePlace } from '@/shared/api/client';
import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import {
  formatClock,
  formatDistance,
  formatDuration,
  formatDurationLabel,
  formatElevation,
  formatHeartRate,
  formatPower,
  formatRecordDistance,
  formatSpeed,
  formatTimeOfDay,
} from '@/shared/lib/formatters';
import { RECORD_RULES } from '@/shared/lib/recordRules';

type RecordKind = {
  kind: RidePlace['kind'];
  /** The record's name; `key` is the distance (m) for efforts, the duration (s) for power. */
  label: (key: number | undefined) => string;
  value: (place: RidePlace) => string;
};

/** Display order and wording of each record kind for rides or runs, matching the Records page. */
const recordKinds = (discipline: Discipline): readonly RecordKind[] => {
  const { formatAverage, averageMinKm, hilliestMinKm } = RECORD_RULES[discipline];
  const { one } = DISCIPLINE_WORDS[discipline];

  return [
    {
      kind: 'effort',
      label: (distanceM) => `Fastest ${formatRecordDistance(distanceM ?? 0).toLowerCase()}`,
      value: (place) => {
        const time = formatClock(place.value);
        return place.extra ? `${time} · ${formatAverage(place.extra)}` : time;
      },
    },
    { kind: 'maxSpeed', label: () => 'Max speed', value: (place) => formatSpeed(place.value) },
    {
      kind: 'avgSpeed',
      label: () => `Fastest average (${averageMinKm} km+)`,
      value: (place) => formatAverage(place.value),
    },
    { kind: 'longestDistance', label: () => 'Longest distance', value: (place) => formatDistance(place.value, 1) },
    { kind: 'longestTime', label: () => 'Longest moving time', value: (place) => formatDuration(place.value) },
    { kind: 'elevation', label: () => 'Most climbing', value: (place) => formatElevation(place.value) },
    {
      kind: 'power',
      label: (durationS) => `Best ${formatDurationLabel(durationS ?? 0)} power`,
      value: (place) => formatPower(place.value),
    },
    { kind: 'maxHr', label: () => 'Highest heart rate', value: (place) => formatHeartRate(place.value) },
    {
      kind: 'hilliest',
      label: () => `Hilliest ${one} (${hilliestMinKm} km+)`,
      value: (place) => `${place.value.toFixed(1)} m/km`,
    },
    { kind: 'earliestStart', label: () => 'Earliest start', value: (place) => formatTimeOfDay(place.value) },
    {
      kind: 'longestBreak',
      label: () => `Longest break, back with this ${one}`,
      value: (place) => `${place.value} days off`,
    },
  ];
};

const RANK_LABELS = ['1st', '2nd', '3rd'] as const;

export type RecordRow = {
  id: string;
  label: string;
  value: string;
  /** This ride's placings for the record, all time first, then its year. */
  places: RidePlace[];
};

/** One row per record (kind plus distance or duration) this ride or run places in, in display order. */
export const recordRows = (places: readonly RidePlace[], discipline: Discipline = 'cycling'): RecordRow[] => {
  const rows: RecordRow[] = [];
  for (const { kind, label, value } of recordKinds(discipline)) {
    const ofKind = places.filter((place) => place.kind === kind);
    const keys = [...new Set(ofKind.map((place) => place.key))].sort((a, b) => (a ?? 0) - (b ?? 0));
    for (const key of keys) {
      const placesForKey = ofKind.filter((place) => place.key === key);
      rows.push({
        id: `${kind}-${key ?? ''}`,
        label: label(key),
        value: value(placesForKey[0]!),
        places: placesForKey,
      });
    }
  }
  return rows;
};

/** Whether any of the rows is a first place of all time. */
export const holdsAllTimeBest = (rows: readonly RecordRow[]): boolean =>
  rows.some((row) => row.places.some((place) => place.scope === 'all' && place.rank === 1));

/** "1st all time", "2nd in 2026". */
export const placeLabel = (place: RidePlace): string => {
  const scope = place.scope === 'all' ? 'all time' : `in ${place.scope}`;
  return `${RANK_LABELS[place.rank - 1]} ${scope}`;
};
