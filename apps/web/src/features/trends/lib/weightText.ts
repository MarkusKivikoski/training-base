import { formatDate } from '@/shared/lib/formatters';

type WeightEntry = { from: string; kg: number };

/** Entries oldest first. */
export const sortedWeights = <Entry extends WeightEntry>(history: readonly Entry[]): Entry[] =>
  [...history].sort((first, second) => first.from.localeCompare(second.from));

const signOf = (value: number) => {
  if (value > 0) return '+';
  if (value < 0) return '−';
  return '±';
};

/** "−5.5 kg since 1.5.2026", or null with fewer than two entries. */
export const weightChangeText = (history: readonly WeightEntry[]): string | null => {
  const sorted = sortedWeights(history);
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last || sorted.length < 2) return null;
  const change = Math.round((last.kg - first.kg) * 10) / 10;
  const sign = signOf(change);
  return `${sign}${Math.abs(change).toFixed(1)} kg since ${formatDate(first.from)}`;
};
