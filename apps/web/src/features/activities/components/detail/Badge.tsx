import type { ReactNode } from 'react';

type BadgeProps = {
  children: ReactNode;
};

/** A small outlined label, e.g. the activity type or "Power meter". */
export const Badge = ({ children }: BadgeProps) => (
  <span className="inline-flex items-center rounded-full border border-line px-2 py-0.5 text-xs text-ink-2">
    {children}
  </span>
);
