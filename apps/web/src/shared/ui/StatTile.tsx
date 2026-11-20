import type { ReactNode } from 'react';
import { Card } from './Card';

type StatTileProps = {
  label: string;
  value: ReactNode;
  /** Secondary context below the value. */
  hint?: ReactNode;
};

/** A headline number in its own card. */
export const StatTile = ({ label, value, hint }: StatTileProps) => (
  <Card>
    <p className="text-xs font-medium text-ink-2">{label}</p>
    <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
    {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
  </Card>
);
