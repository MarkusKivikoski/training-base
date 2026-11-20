import { describe, expect, it } from 'vitest';
import type { ComponentUsage } from '@/shared/lib/gear';
import { bikeFromDraft, componentFromDraft, emptyBikeDraft, emptyComponentDraft } from './gearForm';
import { barPercent, rideCountText, tyreUsageText, usageText } from './gearText';

const TODAY = '2026-11-10';

describe('gear forms', () => {
  it('needs a bike name', () => {
    expect(bikeFromDraft(emptyBikeDraft(), 'b')).toBeNull();
    expect(bikeFromDraft({ ...emptyBikeDraft(), name: ' Canyon ', types: ['road_biking'] }, 'b')).toEqual({
      id: 'b',
      name: 'Canyon',
      types: ['road_biking'],
      retired: false,
    });
  });

  it('builds a component with optional intervals', () => {
    const draft = { ...emptyComponentDraft('road', TODAY), name: 'Chain', intervalKmText: '3000' };
    expect(componentFromDraft(draft, 'c', TODAY)).toEqual({
      id: 'c',
      bikeId: 'road',
      name: 'Chain',
      installedOn: TODAY,
      intervalKm: 3000,
    });
    expect(componentFromDraft({ ...draft, intervalKmText: '2.5' }, 'c', TODAY)).toBeNull();
    expect(componentFromDraft({ ...draft, installedOn: '2026-12-01' }, 'c', TODAY)).toBeNull();
    expect(componentFromDraft({ ...draft, name: ' ' }, 'c', TODAY)).toBeNull();
  });
});

describe('gear text', () => {
  const usage = (o: Partial<ComponentUsage>): ComponentUsage => ({
    component: { id: 'c', bikeId: 'road', name: 'Chain', installedOn: TODAY, intervalKm: 3000 },
    distanceM: 2_950_000,
    movingS: 360_000,
    fraction: 0.98,
    status: 'soon',
    ...o,
  });

  it('describes usage against the intervals', () => {
    expect(usageText(usage({}))).toBe('2,950 km of 3,000 km');
    const both = usage({
      component: { id: 'c', bikeId: 'r', name: 'Tyre', installedOn: TODAY, intervalKm: 4000, intervalHours: 150 },
    });
    expect(usageText(both)).toBe('2,950 km of 4,000 km · 100.0 h of 150 h');
    const none = usage({ component: { id: 'c', bikeId: 'r', name: 'Bell', installedOn: TODAY } });
    expect(usageText(none)).toBe('2,950 km · 100.0 h');
    expect(usageText(usage({ distanceM: 0, movingS: 0 }))).toBe('0 km of 3,000 km');
    expect(barPercent(1.4)).toBe(100);
    expect(barPercent(null)).toBe(0);
  });

  it('counts rides in words', () => {
    expect(rideCountText(0)).toBe('No rides');
    expect(rideCountText(1)).toBe('1 ride');
    expect(rideCountText(12)).toBe('12 rides');
  });

  it('describes how much a set of tyres has been used', () => {
    expect(tyreUsageText({ distanceM: 72_600, movingS: 9000, rides: 2 })).toBe('73 km · 2.5 h · 2 rides');
    expect(tyreUsageText({ distanceM: 0, movingS: 3600, rides: 1 })).toBe('0 km · 1.0 h · 1 ride');
    expect(tyreUsageText(undefined)).toBe('No rides');
  });
});
