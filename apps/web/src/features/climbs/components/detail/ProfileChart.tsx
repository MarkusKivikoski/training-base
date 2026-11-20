import { useMemo } from 'react';
import type { ClimbDetail } from '@/shared/api/client';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { EChart } from '@/shared/charts/EChart';
import { profileChartOption } from './profileChartOption';

type ProfileChartProps = {
  profile: ClimbDetail['profile'];
};

/** The climb's elevation profile. */
export const ProfileChart = ({ profile }: ProfileChartProps) => {
  const colorScheme = useColorScheme();
  // Colours are read from CSS variables, so the option is rebuilt when the colour scheme changes.
  const option = useMemo(() => profileChartOption(profile), [profile, colorScheme]);
  const bottomM = profile[0]?.[1] ?? 0;
  const topM = profile.at(-1)?.[1] ?? 0;

  return (
    <EChart
      option={option}
      className="h-64 sm:h-80"
      ariaLabel={`Elevation profile: ${profile.length} points from ${bottomM} m to ${topM} m altitude.`}
    />
  );
};
