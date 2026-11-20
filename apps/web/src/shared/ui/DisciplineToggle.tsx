import { DISCIPLINE_WORDS, type Discipline } from '@/shared/lib/discipline';
import { Toggle } from './Toggle';

const OPTIONS: ReadonlyArray<{ value: Discipline; label: string }> = [
  { value: 'cycling', label: DISCIPLINE_WORDS.cycling.titleMany },
  { value: 'running', label: DISCIPLINE_WORDS.running.titleMany },
];

type DisciplineToggleProps = {
  value: Discipline;
  onChange: (discipline: Discipline) => void;
};

/** The Rides / Runs choice of pages that show one sport at a time. */
export const DisciplineToggle = ({ value, onChange }: DisciplineToggleProps) => (
  <Toggle label="Sport" value={value} onChange={onChange} options={OPTIONS} />
);
