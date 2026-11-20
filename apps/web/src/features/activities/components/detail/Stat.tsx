import type { ReactNode } from 'react';

type StatProps = {
  label: string;
  value: ReactNode;
};

/** One label/value pair in a stats grid (inside a `<dl>`). */
export const Stat = ({ label, value }: StatProps) => (
  <div>
    <dt className="text-xs text-ink-2">{label}</dt>
    <dd className="mt-0.5 text-lg font-semibold text-ink">{value}</dd>
  </div>
);
