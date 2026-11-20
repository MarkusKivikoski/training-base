import type { Discipline } from '@app/metrics';

export type { Discipline };

type DisciplineWords = {
  /** "ride" / "run". */
  one: string;
  /** "rides" / "runs". */
  many: string;
  /** "Ride" / "Run", for titles. */
  titleOne: string;
  /** "Rides" / "Runs", for titles and toggles. */
  titleMany: string;
  /** "riding" / "running". */
  doing: string;
  /** "rode" / "ran". */
  did: string;
};

/** How each discipline's activities are worded in the UI. */
export const DISCIPLINE_WORDS: Record<Discipline, DisciplineWords> = {
  cycling: { one: 'ride', many: 'rides', titleOne: 'Ride', titleMany: 'Rides', doing: 'riding', did: 'rode' },
  running: { one: 'run', many: 'runs', titleOne: 'Run', titleMany: 'Runs', doing: 'running', did: 'ran' },
};

/** The `sport` URL param of pages with a Rides / Runs choice: runs are named, rides are the default and stay out. */
export type SportParam = 'running' | undefined;

export const sportParam = (value: unknown): SportParam => (value === 'running' ? 'running' : undefined);

export const disciplineOfParam = (sport: SportParam): Discipline => sport ?? 'cycling';

/** The URL search for a discipline: `{ sport: 'running' }` for runs, nothing for rides. */
export const sportSearch = (discipline: Discipline): { sport?: 'running' } =>
  discipline === 'running' ? { sport: 'running' } : {};
