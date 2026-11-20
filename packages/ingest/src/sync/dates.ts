/** Calendar dates as YYYY-MM-DD strings. String comparison orders them correctly. */
export type IsoDate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(value: string): IsoDate {
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`Invalid date "${value}", expected YYYY-MM-DD`);
  }
  return value;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date in the local time zone, which is how Garmin dates activities. */
export function localToday(now = new Date()): IsoDate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const minDate = (a: IsoDate, b: IsoDate): IsoDate => (a < b ? a : b);
export const maxDate = (a: IsoDate, b: IsoDate): IsoDate => (a > b ? a : b);
