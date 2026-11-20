import type { ActivityStreams } from '@/shared/api/client';

type ChannelKey = 'power' | 'hr' | 'speed' | 'altitude';

/** Whether both rides have a distance channel, so they can be lined up by distance. */
export const canAlignByDistance = (a: ActivityStreams, b: ActivityStreams): boolean => {
  const hasDistance = (stream: ActivityStreams) => Boolean(stream.distance?.some((metres) => metres));
  return hasDistance(a) && hasDistance(b);
};

/** Whether the channel has any real reading. */
export const hasChannelData = (stream: ActivityStreams, key: ChannelKey): boolean =>
  Boolean(stream[key]?.some((value) => value !== null && value > 0));

/**
 * [x, value] pairs for one channel, x being km when aligning by distance, else seconds.
 * Records missing the value or the x are skipped.
 */
export const alignedPoints = (
  stream: ActivityStreams,
  key: ChannelKey,
  byDistance: boolean,
  scale = 1,
): Array<[number, number]> => {
  const values = stream[key];
  if (!values) return [];

  const points: Array<[number, number]> = [];
  for (let i = 0; i < stream.time.length; i++) {
    const value = values[i];
    const x = byDistance ? stream.distance?.[i] : stream.time[i];
    if (value === null || value === undefined || x === null || x === undefined) continue;
    const position = byDistance ? x / 1000 : x;
    points.push([position, value * scale]);
  }
  return points;
};
