import { useMemo, useState } from 'react';
import { useColorScheme } from '@/shared/charts/chartTheme';
import { EChart } from '@/shared/charts/EChart';
import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import { Card } from '@/shared/ui/Card';
import { Toggle } from '@/shared/ui/Toggle';
import { MONTH_LABELS } from '../../constants';
import { monthChartOption } from './monthChartOption';
import { MonthTable } from './MonthTable';

type View = 'chart' | 'table';

const VIEW_OPTIONS: ReadonlyArray<{ value: View; label: string }> = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
];

type MonthsCardProps = {
  year: number;
  months: number[];
  previousMonths: number[];
  discipline: Discipline;
};

/** Riding (or running) hours month by month against the year before, as a chart or a table. */
export const MonthsCard = ({ year, months, previousMonths, discipline }: MonthsCardProps) => {
  const { doing } = DISCIPLINE_WORDS[discipline];
  const title = `${doing.charAt(0).toUpperCase()}${doing.slice(1)} month by month`;
  const colorScheme = useColorScheme();
  const [view, setView] = useState<View>('chart');
  const bestIndex = months.indexOf(Math.max(...months));

  // Colours are read from CSS variables, so the option is rebuilt when the colour scheme changes.
  const option = useMemo(
    () => monthChartOption({ year, months, previousMonths, bestIndex }),
    [year, months, previousMonths, bestIndex, colorScheme],
  );

  return (
    <Card title={title}>
      <div className="mb-2 flex justify-end">
        <Toggle label="Month view" value={view} onChange={setView} options={VIEW_OPTIONS} />
      </div>
      {view === 'chart' ? (
        <EChart
          option={option}
          className="h-64"
          ariaLabel={`Hours of ${doing} per month in ${year}, with ${year - 1} as a dashed line. Best month: ${MONTH_LABELS[bestIndex]}. The table view lists the values.`}
        />
      ) : (
        <MonthTable year={year} months={months} previousMonths={previousMonths} bestIndex={bestIndex} />
      )}
    </Card>
  );
};
