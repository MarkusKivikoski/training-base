import { shiftMonth } from '@app/metrics';
import type { ReactNode } from 'react';

type MonthNavProps = {
  month: string;
  currentMonth: string;
  onChange: (month: string) => void;
};

type NavButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
};

const NavButton = ({ label, onClick, disabled = false, children }: NavButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className="rounded-lg border border-line px-3 py-1 text-sm text-ink hover:bg-surface-0 disabled:opacity-50"
  >
    {children}
  </button>
);

/** Previous month, back to this month, next month. */
export const MonthNav = ({ month, currentMonth, onChange }: MonthNavProps) => (
  <div className="flex items-center gap-1" role="group" aria-label="Change month">
    <NavButton label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}>
      ←
    </NavButton>
    <NavButton label="This month" onClick={() => onChange(currentMonth)} disabled={month === currentMonth}>
      Today
    </NavButton>
    <NavButton label="Next month" onClick={() => onChange(shiftMonth(month, 1))}>
      →
    </NavButton>
  </div>
);
