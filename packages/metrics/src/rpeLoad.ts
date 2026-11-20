/** On the 1–10 effort scale, a rating of 7 is taken as threshold effort (like riding at FTP). */
export const RPE_AT_THRESHOLD = 7;

/**
 * A rough TSS-like load from an effort rating: hours × (rating ÷ 7)² × 100, mirroring how TSS
 * grows with the square of intensity. An hour at 7 is 100, as an hour at FTP is. Only an
 * estimate for activities with neither heart rate nor power.
 */
export function rpeLoad(rpe: number, durationS: number): number {
  const intensity = rpe / RPE_AT_THRESHOLD;
  return (durationS / 3600) * intensity ** 2 * 100;
}
