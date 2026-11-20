export type MinuteChannel<Key extends string> = { key: Key; scale?: number };

export type MinuteRow = {
  minute: number;
  /** Average per channel, in the order given; null when the channel has no values that minute. */
  averages: Array<number | null>;
};

/** One-minute averages of each channel, oldest first. */
export const minuteAverages = <Key extends string>(
  time: readonly number[],
  channels: ReadonlyArray<MinuteChannel<Key>>,
  valuesOf: (key: Key) => readonly (number | null)[] | null | undefined,
): MinuteRow[] => {
  const sumsByMinute = new Map<number, { sums: number[]; counts: number[] }>();
  const channelValues = channels.map((channel) => valuesOf(channel.key));

  for (let i = 0; i < time.length; i++) {
    const minute = Math.floor(time[i]! / 60);
    let bucket = sumsByMinute.get(minute);
    if (!bucket) {
      bucket = { sums: channels.map(() => 0), counts: channels.map(() => 0) };
      sumsByMinute.set(minute, bucket);
    }
    channels.forEach((channel, k) => {
      const value = channelValues[k]?.[i];
      if (typeof value !== 'number') return;
      bucket.sums[k]! += value * (channel.scale ?? 1);
      bucket.counts[k]! += 1;
    });
  }

  const minutes = [...sumsByMinute.keys()].sort((a, b) => a - b);
  return minutes.map((minute) => {
    const { sums, counts } = sumsByMinute.get(minute)!;
    const averages = sums.map((sum, k) => (counts[k] ? sum / counts[k]! : null));
    return { minute, averages };
  });
};
