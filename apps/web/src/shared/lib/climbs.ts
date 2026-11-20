import { formatDistance, formatGrade } from './formatters';

type ClimbNaming = { name: string | null; lengthM: number; avgGrade: number };

/** The climb's name, or "650 m at 4.2%" until the user names it. */
export const climbTitle = (climb: ClimbNaming): string => {
  if (climb.name) return climb.name;
  const length = climb.lengthM < 1000 ? `${Math.round(climb.lengthM / 10) * 10} m` : formatDistance(climb.lengthM, 1);
  return `${length} at ${formatGrade(climb.avgGrade)}`;
};

const ORDINALS = ['1st', '2nd', '3rd'] as const;

/** "1st", "2nd", "3rd", then "4th", "5th"… (ranks stay small, so no "21st"). */
export const ordinal = (rank: number) => ORDINALS[rank - 1] ?? `${rank}th`;

/** Climbing rate (VAM), metres per hour. */
export const vam = (gainM: number, timeS: number) => (timeS > 0 ? (gainM / timeS) * 3600 : null);
