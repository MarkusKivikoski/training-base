import { formatDurationLabel } from '@/shared/lib/formatters';

/** W′ in kilojoules with one decimal: "18.5 kJ". */
export const formatWPrime = (joules: number): string => `${(joules / 1000).toFixed(1)} kJ`;

/** How well the model fits the best efforts, in words. */
export const fitText = (rSquared: number): string => {
  if (rSquared >= 0.995) return 'Good fit';
  if (rSquared >= 0.98) return 'Fair fit';
  return 'Loose fit: some of these best efforts probably weren’t all-out';
};

/** "CP is 21 W above your FTP (199 W)", or null without an FTP. */
export const versusFtpText = (cp: number, ftp: number | null): string | null => {
  if (ftp === null) return null;
  const difference = Math.round(cp - ftp);
  if (difference === 0) return `CP matches your FTP (${ftp} W)`;
  const direction = difference > 0 ? 'above' : 'below';
  return `CP is ${Math.abs(difference)} W ${direction} your FTP (${ftp} W)`;
};

/** "2 min, 5 min and 20 min". */
export const durationsText = (durationsS: readonly number[]): string => {
  const labels = durationsS.map((durationS) => formatDurationLabel(durationS));
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
};
