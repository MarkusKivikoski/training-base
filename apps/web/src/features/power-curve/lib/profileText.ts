import { PROFILE_DURATIONS, type CurvePoint } from '@app/metrics';

/** Bar width (0–100) for a profile score; scores outside 0–1 are clamped. */
export const scoreBarPercent = (score: number): number => Math.max(0, Math.min(1, score)) * 100;

/** The score in words, for screen readers. */
export const scoreText = (score: number): string => {
  if (score < 0) return 'below the untrained end of the range';
  if (score > 1) return 'above the world-class end of the range';
  return `${Math.round(score * 100)}% of the way from untrained to world class`;
};

/** Labels of the profile durations the curve has no effort for. */
export const missingProfileDurations = (curve: readonly CurvePoint[]): string[] =>
  PROFILE_DURATIONS.filter((duration) => !curve.some((point) => point.durationS === duration.durationS)).map(
    (duration) => duration.label,
  );
