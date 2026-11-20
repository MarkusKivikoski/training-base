import { describe, expect, it } from 'vitest';
import type { Gear, RideRoute, RouteEffort } from '@/shared/api/client';
import {
  hasPowerEfforts,
  hasTaggedTyres,
  rankText,
  routeChart,
  routeEffortRows,
  routeTitle,
  routeVerdict,
} from './routeEfforts';

const effort = (activityId: string, date: string, overrides: Partial<RouteEffort> = {}): RouteEffort => ({
  activityId,
  date,
  distanceM: 37100,
  movingS: 5300,
  speedMps: 7,
  avgHr: 140,
  avgPower: null,
  np: null,
  rank: 1,
  change: null,
  powerChange: null,
  ...overrides,
});

const route = (overrides: Partial<RideRoute> = {}): RideRoute => ({
  id: 'route-1',
  referenceId: '1',
  distanceM: 37100,
  efforts: [
    effort('1', '2026-05-01', { rank: 2, speedMps: 6.5 }),
    effort('2', '2026-06-01', { avgHr: null, change: { againstCount: 1, speedPct: 7.7, hrBpm: null } }),
  ],
  name: null,
  ratings: { '2': 5 },
  ...overrides,
});

const gear = (rideTyres: Record<string, string> = {}): Gear => ({
  schemaVersion: 1,
  bikes: [],
  components: [],
  overrides: {},
  tyres: [
    { id: 'road', name: 'Road' },
    { id: 'gravel', name: 'Gravel' },
  ],
  rideTyres,
});

/** The same route once a power meter is fitted: the first ride without power, then two with. */
const routeWithPower = () =>
  route({
    efforts: [
      effort('1', '2026-05-01', { rank: 3, speedMps: 6.5 }),
      effort('2', '2026-06-01', { rank: 2, avgPower: 180, np: 196, avgHr: 140 }),
      effort('3', '2026-07-01', {
        avgPower: 190,
        np: 210,
        avgHr: 140,
        change: { againstCount: 2, speedPct: 3.7, hrBpm: 0 },
        powerChange: { againstCount: 1, powerPct: 7.1, hrBpm: 0, efficiencyPct: 7.1 },
      }),
    ],
  });

describe('route efforts', () => {
  it('titles a route by its name, else by its length', () => {
    expect(routeTitle({ name: 'Evening loop', distanceM: 37100 })).toBe('Evening loop');
    expect(routeTitle({ name: null, distanceM: 37100 })).toBe('37.1 km route');
  });

  it('lists the efforts newest first, with ratings and the ride being viewed', () => {
    const rows = routeEffortRows(route(), '1', gear());
    expect(rows.map((row) => [row.effort.activityId, row.rating, row.isCurrent, row.wattsPerBeat])).toEqual([
      ['2', 5, false, null],
      ['1', null, true, null],
    ]);
  });

  it('shows the tyres a ride was tagged with, and none while gear is loading', () => {
    const untagged = routeEffortRows(route(), '1', gear());
    expect(untagged.map((row) => row.tyres)).toEqual([null, null]);
    expect(hasTaggedTyres(untagged)).toBe(false);

    const tagged = routeEffortRows(route(), '1', gear({ '2': 'gravel' }));
    expect(tagged.map((row) => [row.effort.activityId, row.tyres])).toEqual([
      ['2', 'Gravel'],
      ['1', null],
    ]);
    expect(hasTaggedTyres(tagged)).toBe(true);
    expect(routeEffortRows(route(), '1', undefined).map((row) => row.tyres)).toEqual([null, null]);
  });

  it('charts speed and heart rate, oldest first, when no effort has power', () => {
    const rows = routeEffortRows(route(), '2', gear());
    expect(hasPowerEfforts(rows)).toBe(false);
    const chart = routeChart(rows);
    expect(chart.panels.map((panel) => panel.title)).toEqual(['Speed', 'Heart rate']);
    expect(chart.points).toEqual([
      {
        date: '2026-05-01',
        isCurrent: false,
        values: [23.4, 140],
        tooltip: '1.5.2026: <b>23.4 km/h</b> at <b>140 bpm</b>',
      },
      { date: '2026-06-01', isCurrent: true, values: [25.2, null], tooltip: '1.6.2026: <b>25.2 km/h</b>' },
    ]);
  });

  it('adds a power panel and power per heartbeat once any effort has power', () => {
    const rows = routeEffortRows(routeWithPower(), '3', gear());
    expect(hasPowerEfforts(rows)).toBe(true);
    expect(rows.map((row) => row.wattsPerBeat)).toEqual([1.5, 1.4, null]);

    const chart = routeChart(rows);
    expect(chart.panels.map((panel) => panel.title)).toEqual(['Speed', 'Power', 'Heart rate']);
    // The ride without a power meter stays on the speed and heart-rate panels only.
    expect(chart.points.map((point) => point.values)).toEqual([
      [23.4, null, 140],
      [25.2, 196, 140],
      [25.2, 210, 140],
    ]);
    expect(chart.points[2]!.tooltip).toBe('1.7.2026: <b>25.2 km/h</b>, <b>210 W</b> at <b>140 bpm</b>');
  });

  it('words the rank', () => {
    expect(rankText(1, 9)).toBe('Fastest of 9');
    expect(rankText(2, 9)).toBe('2nd fastest of 9');
    expect(rankText(11, 14)).toBe('11th fastest of 14');
  });

  it('reads the change in speed, with heart rate where there is one', () => {
    const faster = effort('3', '2026-07-01', { rank: 1, change: { againstCount: 3, speedPct: 4.2, hrBpm: -3 } });
    expect(routeVerdict(faster, 4)).toEqual({
      headline: 'Faster than before',
      detail: '+4.2% against the median of your previous 3 efforts, heart rate -3 bpm. Fastest of 4.',
      powerDetail: null,
    });

    const same = effort('3', '2026-07-01', { rank: 2, change: { againstCount: 1, speedPct: -0.6, hrBpm: null } });
    expect(routeVerdict(same, 2)).toEqual({
      headline: 'About the same speed as before',
      detail: '-0.6% against your previous effort. 2nd fastest of 2.',
      powerDetail: null,
    });

    const slower = effort('3', '2026-07-01', { rank: 3, change: { againstCount: 2, speedPct: -8, hrBpm: 4 } });
    expect(routeVerdict(slower, 3).headline).toBe('Slower than before');
  });

  it('adds how power per heartbeat changed among the efforts with power', () => {
    const latest = routeWithPower().efforts[2]!;
    expect(routeVerdict(latest, 3).powerDetail).toBe(
      'Power per heartbeat +7.1% against your previous effort with power: power +7.1%, heart rate 0 bpm.',
    );
    const several = { ...latest, powerChange: { againstCount: 4, powerPct: -2, hrBpm: 3, efficiencyPct: -4.1 } };
    expect(routeVerdict(several, 6).powerDetail).toBe(
      'Power per heartbeat -4.1% against the median of your previous 4 efforts with power: power -2.0%, heart rate +3 bpm.',
    );
  });

  it('has no comparison for the first ride on a route', () => {
    expect(routeVerdict(effort('1', '2026-05-01', { rank: 2 }), 2)).toEqual({
      headline: 'The first ride on this route',
      detail: '2nd fastest of 2.',
      powerDetail: null,
    });
  });
});
