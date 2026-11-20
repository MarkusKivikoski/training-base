/*
 * All unit and date formatting lives here. Metric units throughout.
 * Missing values render as an em dash.
 */

export const LOCALE = 'en-GB';
export const EMPTY = '—';

type Maybe = number | null | undefined;
const isNum = (v: Maybe): v is number => typeof v === 'number' && Number.isFinite(v);

const fmtNumber = (v: number, digits: number) =>
  v.toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** 5400 -> "1 h 30 min", 2700 -> "45 min". */
export function formatDuration(seconds: Maybe): string {
  if (!isNum(seconds)) return EMPTY;
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** 5400 -> "1:30:00". */
export function formatClock(seconds: Maybe): string {
  if (!isNum(seconds)) return EMPTY;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Power-curve durations: 5 -> "5 s", 60 -> "1 min", 5400 -> "1 h 30 min". */
export function formatDurationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Intensity factor: 0.857 -> "0.86". */
export function formatIntensityFactor(v: Maybe): string {
  return isNum(v) ? fmtNumber(v, 2) : EMPTY;
}

/** TSS, whole number. */
export function formatTss(v: Maybe): string {
  return isNum(v) ? fmtNumber(v, 0) : EMPTY;
}

/** CTL/ATL/TSB with one decimal; `signed` adds a + to positive values (form, changes). */
export function formatLoad(v: Maybe, signed = false): string {
  if (!isNum(v)) return EMPTY;
  const s = fmtNumber(v, 1);
  return signed && v > 0 ? `+${s}` : s;
}

/** Hours with one decimal: 5400 -> "1.5 h". */
export function formatHours(seconds: Maybe): string {
  return isNum(seconds) ? `${fmtNumber(seconds / 3600, 1)} h` : EMPTY;
}

/** Metres to km: 42195 -> "42.2 km". Zero distance (indoor) renders as a dash. */
export function formatDistance(metres: Maybe, digits = 1): string {
  return isNum(metres) && metres > 0 ? `${fmtNumber(metres / 1000, digits)} km` : EMPTY;
}

/** m/s to km/h. */
export function formatSpeed(mps: Maybe): string {
  return isNum(mps) && mps > 0 ? `${fmtNumber(mps * 3.6, 1)} km/h` : EMPTY;
}

/** m/s to running pace per km: 3.2 -> "5:13 /km". */
export function formatPace(mps: Maybe): string {
  if (!isNum(mps) || mps <= 0) return EMPTY;
  const secondsPerKm = Math.round(1000 / mps);
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = String(secondsPerKm % 60).padStart(2, '0');
  return `${minutes}:${seconds} /km`;
}

const HALF_MARATHON_M = 21_098;
const MARATHON_M = 42_195;

/** A record distance: "400 m", "10 km", "Half marathon" or "Marathon". */
export function formatRecordDistance(metres: number): string {
  if (metres === HALF_MARATHON_M) return 'Half marathon';
  if (metres === MARATHON_M) return 'Marathon';
  return metres >= 1000 ? `${metres / 1000} km` : `${metres} m`;
}

export function formatElevation(metres: Maybe): string {
  return isNum(metres) ? `${fmtNumber(metres, 0)} m` : EMPTY;
}

/** Seconds after midnight as a clock time: 20700 -> "05:45". */
export function formatTimeOfDay(seconds: Maybe): string {
  if (!isNum(seconds)) return EMPTY;
  const m = Math.floor(seconds / 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Fraction to percent: 0.0625 -> "6.3%". */
export function formatGrade(fraction: Maybe): string {
  return isNum(fraction) ? `${fmtNumber(fraction * 100, 1)}%` : EMPTY;
}

/** Climbing rate, metres per hour (VAM). */
export function formatVam(metresPerHour: Maybe): string {
  return isNum(metresPerHour) && metresPerHour > 0 ? `${fmtNumber(metresPerHour, 0)} m/h` : EMPTY;
}

export function formatPower(watts: Maybe): string {
  return isNum(watts) ? `${fmtNumber(watts, 0)} W` : EMPTY;
}

export function formatWattsPerKg(wkg: Maybe): string {
  return isNum(wkg) ? `${fmtNumber(wkg, 2)} W/kg` : EMPTY;
}

export function formatHeartRate(bpm: Maybe): string {
  return isNum(bpm) ? `${fmtNumber(bpm, 0)} bpm` : EMPTY;
}

export function formatCadence(rpm: Maybe): string {
  return isNum(rpm) ? `${fmtNumber(rpm, 0)} rpm` : EMPTY;
}

export function formatCalories(kcal: Maybe): string {
  return isNum(kcal) ? `${fmtNumber(kcal, 0)} kcal` : EMPTY;
}

/** VO2 max estimate: 48.27 -> "48.3 ml/kg/min". */
export function formatVo2(v: Maybe): string {
  return isNum(v) ? `${fmtNumber(v, 1)} ml/kg/min` : EMPTY;
}

/** Efficiency factor (NP / avg HR): 1.234 -> "1.23". */
export function formatEf(v: Maybe): string {
  return isNum(v) ? fmtNumber(v, 2) : EMPTY;
}

/** A change in percent, with its sign: 5.04 -> "+5.0%", -2 -> "-2.0%". */
export function formatPercentChange(percent: Maybe): string {
  if (!isNum(percent)) return EMPTY;
  const text = fmtNumber(percent, 1);
  return percent > 0 ? `+${text}%` : `${text}%`;
}

/** A change in heart rate, with its sign: 4.6 -> "+5 bpm", -5 -> "-5 bpm". */
export function formatHeartRateChange(bpm: Maybe): string {
  if (!isNum(bpm)) return EMPTY;
  const rounded = Math.round(bpm);
  return rounded > 0 ? `+${rounded} bpm` : `${rounded} bpm`;
}

export function formatWeight(kg: Maybe): string {
  return isNum(kg) ? `${fmtNumber(kg, 1)} kg` : EMPTY;
}

// Dates are local wall-clock values. Parse them as UTC and format in UTC so the
// browser's time zone can't shift them.
const asUtc = (local: string) => new Date(local.length === 10 ? `${local}T00:00:00Z` : `${local}Z`);

/*
 * Dates are shown as d.m.yyyy everywhere (no leading zeros), the Finnish convention.
 * They're built from the ISO string itself, so no time zone or locale can shift them.
 */
const dayMonth = (isoDate: string) => `${Number(isoDate.slice(8, 10))}.${Number(isoDate.slice(5, 7))}.`;

/** "2026-11-04" -> "4.11.2026". */
export function formatDate(isoDate: string): string {
  return `${dayMonth(isoDate)}${isoDate.slice(0, 4)}`;
}

/** "2026-11-04" -> "4.11." (day and month, for chart axes and where the year is clear). */
export function formatShortDate(isoDate: string): string {
  return dayMonth(isoDate);
}

/** A UTC timestamp in the viewer's local time: "2026-11-08T12:05:00Z" -> "8.11.2026 14:05" (in Finland). */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** How long ago an ISO timestamp was: "just now", "12 min ago", "3 h ago", "2 days ago". */
export function formatTimeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'never';
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86_400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

/** "2026-11" -> "November 2026". */
export function formatMonthLong(yearMonth: string): string {
  return asUtc(`${yearMonth}-01`).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** "2026-11" -> "Nov 2026". */
export function formatMonth(yearMonth: string): string {
  return asUtc(`${yearMonth}-01`).toLocaleDateString(LOCALE, { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Local wall-clock time "2026-11-04T08:05:00" -> "4.11.2026 08:05". */
export function formatDateTime(localDateTime: string): string {
  return `${formatDate(localDateTime.slice(0, 10))} ${localDateTime.slice(11, 16)}`;
}

/** Garmin typeKey -> label: "gravel_cycling" -> "Gravel cycling". */
export function formatSport(typeKey: string): string {
  const special: Record<string, string> = {
    cycling: 'Road / outdoor cycling',
    indoor_cycling: 'Indoor cycling',
    virtual_ride: 'Virtual ride',
  };
  const s = special[typeKey] ?? typeKey.replaceAll('_', ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
