import { ftpSuggestion, lthrSuggestion } from '@app/metrics';
import { useMemo } from 'react';
import { useMeanMax } from '@/shared/api/activities';
import { useSettings } from '@/shared/api/settings';
import { ftpPrompt, lthrPrompt, type ThresholdPrompt } from '../lib/thresholdPrompt';

const earlierDate = (first: string, second: string) => (first < second ? first : second);

/**
 * The next threshold update to ask about: a new FTP first, then a new LTHR. Both come from rides
 * with power. Sync refetches every query when it finishes, so a new best shows up right after.
 */
export const useThresholdPrompt = (): ThresholdPrompt | null => {
  const settings = useSettings();
  const today = settings.data?.today;
  // Only rides from the older of the two current entries on can count; without both, every ride can.
  const ftpFrom = settings.data?.ftp?.from;
  const lthrFrom = settings.data?.lthr?.from;
  const ridesFrom = ftpFrom && lthrFrom ? earlierDate(ftpFrom, lthrFrom) : undefined;
  const rides = useMeanMax(today ? { ...(ridesFrom ? { from: ridesFrom } : {}), to: today } : null);

  return useMemo(() => {
    if (!settings.data || !rides.data) return null;
    const { ftpHistory, lthrHistory, dismissedFtpRides, dismissedLthrRides } = settings.data;

    const ftp = ftpSuggestion(rides.data, ftpHistory, {
      today: settings.data.today,
      dismissedRideIds: dismissedFtpRides,
    });
    if (ftp) return ftpPrompt(ftp);

    const lthr = lthrSuggestion(rides.data, lthrHistory, {
      today: settings.data.today,
      dismissedRideIds: dismissedLthrRides,
    });
    return lthr ? lthrPrompt(lthr) : null;
  }, [settings.data, rides.data]);
};
